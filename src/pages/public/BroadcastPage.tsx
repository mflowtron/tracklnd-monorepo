import { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Calendar, MapPin } from 'lucide-react';
import { format } from 'date-fns';
import MuxPlayer from '@mux/mux-player-react';

export default function BroadcastPage() {
  const { slug } = useParams();
  const [meet, setMeet] = useState<any>(null);
  const [broadcast, setBroadcast] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    if (!slug) return;
    const { data: meetData } = await supabase.from('meets').select('*').eq('slug', slug).maybeSingle();
    setMeet(meetData);
    if (!meetData) { setLoading(false); return; }

    const { data: broadcasts } = await supabase
      .from('broadcasts' as any)
      .select('*')
      .eq('meet_id', meetData.id)
      .eq('is_active', true)
      .limit(1);

    setBroadcast(broadcasts?.[0] || null);
    setLoading(false);
  }, [slug]);

  useEffect(() => { loadData(); }, [loadData]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[hsl(220,20%,5%)] flex items-center justify-center">
        <div className="text-white/60 text-lg">Loading broadcast…</div>
      </div>
    );
  }

  if (!meet || !broadcast) {
    return (
      <div className="min-h-screen bg-[hsl(220,20%,5%)] flex flex-col items-center justify-center gap-4">
        <p className="text-white/60 text-lg">No broadcast available.</p>
        <Button asChild variant="outline" className="border-white/20 text-white hover:bg-white/10">
          <Link to={slug ? `/meets/${slug}` : '/meets'}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Back to Meet
          </Link>
        </Button>
      </div>
    );
  }

  const statusColor = (s: string) => {
    if (s === 'live') return 'bg-red-500 text-white';
    if (s === 'upcoming') return 'bg-primary text-primary-foreground';
    return 'bg-white/20 text-white';
  };

  return (
    <div className="min-h-screen bg-[hsl(220,20%,5%)] flex flex-col">
      {/* Top bar */}
      <header className="flex items-center justify-between px-4 sm:px-6 lg:px-8 py-4">
        <Button asChild variant="ghost" size="sm" className="text-white/70 hover:text-white hover:bg-white/10">
          <Link to={`/meets/${slug}`}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Back to Results
          </Link>
        </Button>
        <Badge className={statusColor(meet.status)}>
          {meet.status === 'live' && (
            <span className="relative flex h-2 w-2 mr-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-white" />
            </span>
          )}
          {meet.status}
        </Badge>
      </header>

      {/* Player */}
      <div className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8 pb-4">
        <div className="w-full max-w-6xl">
          <MuxPlayer
            playbackId={broadcast.mux_playback_id}
            streamType={meet.status === 'live' ? 'live' : 'on-demand'}
            accentColor="hsl(221, 83%, 53%)"
            style={{ aspectRatio: '16/9', width: '100%', borderRadius: '0.75rem', overflow: 'hidden' }}
            metadata={{
              video_title: broadcast.title,
              viewer_user_id: 'anonymous',
            }}
          />
        </div>
      </div>

      {/* Meet info */}
      <footer className="px-4 sm:px-6 lg:px-8 pb-8">
        <div className="max-w-6xl mx-auto">
          <h1 className="font-display text-2xl sm:text-3xl text-white mb-2">{meet.name}</h1>
          <p className="text-white/50 text-sm mb-1">{broadcast.title}</p>
          <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-white/40">
            <span className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              {format(new Date(meet.start_date), 'MMMM d, yyyy')}
            </span>
            <span className="flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" /> {meet.venue}, {meet.location}
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
