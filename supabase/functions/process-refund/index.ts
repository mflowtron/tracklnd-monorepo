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

    const { contribution_id } = await req.json();

    if (!contribution_id) {
      return new Response(JSON.stringify({ error: 'Missing required field: contribution_id' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch contribution with config join
    const { data: contribution, error: fetchError } = await supabase
      .from('purse_contributions')
      .select('*, prize_purse_configs(*)')
      .eq('id', contribution_id)
      .maybeSingle();

    if (fetchError || !contribution) {
      return new Response(JSON.stringify({ error: 'Contribution not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const config = contribution.prize_purse_configs;

    // Check refund window
    if (config.contributions_close_at && new Date() > new Date(config.contributions_close_at)) {
      return new Response(JSON.stringify({ error: 'Refund window has closed. Contributions are locked.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check for existing refund
    const { data: existingRefund } = await supabase
      .from('purse_refunds')
      .select('id')
      .eq('contribution_id', contribution_id)
      .maybeSingle();

    if (existingRefund) {
      return new Response(JSON.stringify({ error: 'Already refunded' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Call Square Refunds API
    const idempotencyKey = crypto.randomUUID();
    const squareRes = await fetch('https://connect.squareup.com/v2/refunds', {
      method: 'POST',
      headers: {
        'Square-Version': '2024-01-18',
        'Authorization': `Bearer ${SQUARE_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        idempotency_key: idempotencyKey,
        payment_id: contribution.square_payment_id,
        amount_money: {
          amount: Math.round(contribution.gross_amount * 100), // cents
          currency: 'USD',
        },
      }),
    });

    const squareData = await squareRes.json();
    if (!squareRes.ok) {
      const errMsg = squareData.errors?.[0]?.detail || 'Square refund failed';
      return new Response(JSON.stringify({ error: errMsg }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const refundId = squareData.refund.id;

    // Insert refund record (DB trigger handles snapshot recalculation)
    const { error: insertError } = await supabase.from('purse_refunds').insert({
      config_id: contribution.config_id,
      contribution_id,
      refund_amount: contribution.gross_amount,
      square_refund_id: refundId,
    });

    if (insertError) {
      console.error('Failed to insert refund:', insertError);
      return new Response(JSON.stringify({ error: 'Failed to record refund' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // For PPV tickets: revoke meet access
    if (contribution.source_type === 'ppv_ticket') {
      const { error: revokeError } = await supabase
        .from('user_meet_access')
        .update({ revoked_at: new Date().toISOString() })
        .eq('user_id', contribution.user_id)
        .eq('meet_id', config.meet_id);

      if (revokeError) {
        console.error('Failed to revoke meet access:', revokeError);
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('process-refund error:', message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
