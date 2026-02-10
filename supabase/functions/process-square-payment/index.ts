import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const SQUARE_ACCESS_TOKEN = Deno.env.get('SQUARE_ACCESS_TOKEN');

  if (!SQUARE_ACCESS_TOKEN) {
    return new Response(JSON.stringify({ error: 'Square credentials not configured' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Authenticate user from Authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { nonce, config_id, payment_type, event_allocation_id, amount } = await req.json();

    if (!nonce || !config_id || !payment_type) {
      return new Response(JSON.stringify({ error: 'Missing required fields: nonce, config_id, payment_type' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (payment_type !== 'ppv' && payment_type !== 'direct') {
      return new Response(JSON.stringify({ error: 'payment_type must be "ppv" or "direct"' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch config
    const { data: config, error: configError } = await supabase
      .from('prize_purse_configs')
      .select('*')
      .eq('id', config_id)
      .maybeSingle();

    if (configError || !config) {
      return new Response(JSON.stringify({ error: 'Prize purse config not found' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!config.is_active) {
      return new Response(JSON.stringify({ error: 'Prize purse is not active' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (config.is_finalized) {
      return new Response(JSON.stringify({ error: 'Prize purse has been finalized' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Enforce contribution window
    const now = new Date();
    if (config.contributions_open_at && now < new Date(config.contributions_open_at)) {
      return new Response(JSON.stringify({ error: 'Contributions not yet open' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (config.contributions_close_at && now > new Date(config.contributions_close_at)) {
      return new Response(JSON.stringify({ error: 'Contribution window has closed' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Determine charge amount and purse amount
    let chargeAmount: number;
    let purseAmount: number;

    if (payment_type === 'ppv') {
      chargeAmount = config.ppv_ticket_price;
      if (config.ppv_purse_mode === 'static') {
        purseAmount = config.ppv_purse_static_amount ?? 0;
      } else {
        purseAmount = chargeAmount * (config.ppv_purse_percentage ?? 0) / 100;
      }
    } else {
      // Direct contribution
      if (!amount || typeof amount !== 'number' || amount <= 0) {
        return new Response(JSON.stringify({ error: 'Amount is required for direct contributions' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      chargeAmount = amount;
      purseAmount = amount; // 100% goes to purse
    }

    if (purseAmount < 2.00) {
      return new Response(JSON.stringify({ error: 'Minimum purse contribution is $2.00' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Call Square Payments API
    const idempotencyKey = crypto.randomUUID();
    const squareRes = await fetch('https://connect.squareup.com/v2/payments', {
      method: 'POST',
      headers: {
        'Square-Version': '2024-01-18',
        'Authorization': `Bearer ${SQUARE_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        source_id: nonce,
        idempotency_key: idempotencyKey,
        amount_money: {
          amount: Math.round(chargeAmount * 100), // cents
          currency: 'USD',
        },
      }),
    });

    const squareData = await squareRes.json();
    if (!squareRes.ok) {
      const errMsg = squareData.errors?.[0]?.detail || 'Square payment failed';
      return new Response(JSON.stringify({ error: errMsg }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const paymentId = squareData.payment.id;

    // Determine source_type
    let sourceType: string;
    if (payment_type === 'ppv') {
      sourceType = 'ppv_ticket';
    } else if (event_allocation_id) {
      sourceType = 'direct_event';
    } else {
      sourceType = 'direct_meet';
    }

    // Insert contribution (DB trigger handles snapshot recalculation)
    const { error: insertError } = await supabase.from('purse_contributions').insert({
      config_id,
      source_type: sourceType,
      event_allocation_id: event_allocation_id || null,
      user_id: user.id,
      gross_amount: chargeAmount,
      purse_amount: purseAmount,
      square_payment_id: paymentId,
    });

    if (insertError) {
      console.error('Failed to insert contribution:', insertError);
      return new Response(JSON.stringify({ error: 'Failed to record contribution' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // For PPV: grant meet access
    if (payment_type === 'ppv') {
      const { error: accessError } = await supabase.from('user_meet_access').upsert({
        user_id: user.id,
        meet_id: config.meet_id,
        access_type: 'ppv',
        square_payment_id: paymentId,
      }, { onConflict: 'user_id,meet_id' });

      if (accessError) {
        console.error('Failed to grant meet access:', accessError);
      }
    }

    return new Response(JSON.stringify({ success: true, payment_id: paymentId }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('process-square-payment error:', message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
