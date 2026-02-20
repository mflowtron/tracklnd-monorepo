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

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { config_id } = await req.json();

    if (!config_id) {
      return new Response(JSON.stringify({ error: 'Missing required field: config_id' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch config
    const { data: config, error: fetchError } = await supabase
      .from('prize_purse_configs')
      .select('*')
      .eq('id', config_id)
      .maybeSingle();

    if (fetchError || !config) {
      return new Response(JSON.stringify({ error: 'Prize purse config not found' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (config.is_finalized) {
      return new Response(JSON.stringify({ error: 'Prize purse is already finalized' }), {
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

    // Final snapshot recalculation
    const { error: rpcError } = await supabase.rpc('recalculate_all_snapshots', {
      p_config_id: config_id,
    });

    if (rpcError) {
      console.error('Failed to recalculate snapshots:', rpcError);
      return new Response(JSON.stringify({ error: 'Failed to finalize snapshot calculations' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Lock the purse
    const { error: updateError } = await supabase
      .from('prize_purse_configs')
      .update({
        is_active: false,
        is_finalized: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', config_id);

    if (updateError) {
      console.error('Failed to finalize config:', updateError);
      return new Response(JSON.stringify({ error: 'Failed to finalize prize purse' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('finalize-purse error:', message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
