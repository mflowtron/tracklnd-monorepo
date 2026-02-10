import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const MUX_TOKEN_ID = Deno.env.get('MUX_TOKEN_ID');
  const MUX_TOKEN_SECRET = Deno.env.get('MUX_TOKEN_SECRET');

  if (!MUX_TOKEN_ID || !MUX_TOKEN_SECRET) {
    return new Response(JSON.stringify({ error: 'Mux credentials not configured' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const url = new URL(req.url);
    const limit = url.searchParams.get('limit') || '20';
    const page = url.searchParams.get('page') || '1';

    const muxRes = await fetch(`https://api.mux.com/video/v1/assets?limit=${limit}&page=${page}`, {
      headers: {
        'Authorization': `Basic ${btoa(`${MUX_TOKEN_ID}:${MUX_TOKEN_SECRET}`)}`,
        'Content-Type': 'application/json',
      },
    });

    if (!muxRes.ok) {
      const errBody = await muxRes.text();
      throw new Error(`Mux API error [${muxRes.status}]: ${errBody}`);
    }

    const muxData = await muxRes.json();

    // Map to a simpler shape for the frontend
    const assets = (muxData.data || []).map((asset: any) => ({
      id: asset.id,
      status: asset.status,
      duration: asset.duration,
      created_at: asset.created_at,
      playback_ids: (asset.playback_ids || []).map((p: any) => ({
        id: p.id,
        policy: p.policy,
      })),
      thumbnail_url: asset.playback_ids?.[0]
        ? `https://image.mux.com/${asset.playback_ids[0].id}/thumbnail.jpg?width=640&height=360&fit_mode=smartcrop`
        : null,
    }));

    return new Response(JSON.stringify({ data: assets }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('mux-assets error:', message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
