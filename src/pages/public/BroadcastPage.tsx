import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Calendar, MapPin, PanelRight, ListOrdered } from 'lucide-react';
import { format } from 'date-fns';
import MuxPlayer from '@mux/mux-player-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import BroadcastSidebar from '@/components/broadcast/BroadcastSidebar';

const POLL_INTERVAL = 30_000;

export default function BroadcastPage() {
  const { slug } = useParams();
  const isMobile = useIsMobile();

  const [meet, setMeet] = useState<any>(null);
  const [broadcast, setBroadcast] = useState<any>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [entriesByEvent, setEntriesByEvent] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [paused, setPaused] = useState(false);
  const pausedRef = useRef(false);

  const loadData = useCallback(async () => {
    if (!slug) return;

    const { data: meetData } = await supabase.from('meets').select('*').eq('slug', slug).maybeSingle();
    setMeet(meetData);
    if (!meetData) { setLoading(false); return; }

    const { data: broadcasts } = await supabase
      .from('broadcasts')
      .select('*')
      .eq('meet_id', meetData.id)
      .eq('is_active', true)
      .limit(1);
    setBroadcast(broadcasts?.[0] || null);

    // Load events & entries
    const { data: evts } = await supabase.from('events').select('*').eq('meet_id', meetData.id).order('sort_order');
    setEvents(evts || []);

    const newEntries: Record<string, any[]> = {};
    await Promise.all(
      (evts || []).map(async (evt) => {
        const { data: entries } = await supabase
          .from('event_entries')
          .select('*, athletes(*)')
          .eq('event_id', evt.id)
          .order('place', { ascending: true, nullsFirst: false });
        newEntries[evt.id] = entries || [];
      })
    );
    setEntriesByEvent(newEntries);
    setLoading(false);
  }, [slug]);

  // Initial load
  useEffect(() => { loadData(); }, [loadData]);

  // Polling
  useEffect(() => {
    const interval = setInterval(() => {
      if (!pausedRef.current) loadData();
    }, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [loadData]);

  const handleTogglePause = useCallback(() => {
    setPaused(prev => {
      const next = !prev;
      pausedRef.current = next;
      return next;
    });
  }, []);

  if (loading) {
    return (
      <div className="h-screen bg-[hsl(220,20%,5%)] flex items-center justify-center">
        <div className="text-white/60 text-lg">Loading broadcast…</div>
      </div>
    );
  }

  if (!meet || !broadcast) {
    return (
      <div className="h-screen bg-[hsl(220,20%,5%)] flex flex-col items-center justify-center gap-4">
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

  const sidebarContent = (
    <BroadcastSidebar
      events={events}
      entriesByEvent={entriesByEvent}
      paused={paused}
      onTogglePause={handleTogglePause}
    />
  );

  return (
    <div className="h-screen bg-[hsl(220,20%,5%)] flex flex-col overflow-hidden">
      {/* Top bar */}
      <header className="flex items-center justify-between px-4 sm:px-6 py-3 bg-black/40 backdrop-blur-sm border-b border-white/5 shrink-0 z-10">
        <div className="flex items-center gap-3 min-w-0">
          <Button asChild variant="ghost" size="sm" className="text-white/70 hover:text-white hover:bg-white/10 shrink-0">
            <Link to={`/meets/${slug}`}>
              <ArrowLeft className="h-4 w-4 mr-1" /> <span className="hidden sm:inline">Back</span>
            </Link>
          </Button>
          <h1 className="text-white font-semibold text-sm sm:text-base truncate">{meet.name}</h1>
          <Badge className={`shrink-0 ${statusColor(meet.status)}`}>
            {meet.status === 'live' && (
              <span className="relative flex h-2 w-2 mr-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-white" />
              </span>
            )}
            {meet.status}
          </Badge>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div className="hidden sm:flex items-center gap-3 text-xs text-white/40 mr-3">
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {format(new Date(meet.start_date), 'MMM d, yyyy')}
            </span>
            <span className="flex items-center gap-1">
              <MapPin className="h-3 w-3" /> {meet.venue}
            </span>
          </div>
          {!isMobile && (
            <Button
              variant="ghost"
              size="sm"
              className="text-white/70 hover:text-white hover:bg-white/10"
              onClick={() => setSidebarOpen(prev => !prev)}
            >
              <PanelRight className="h-4 w-4" />
            </Button>
          )}
        </div>
      </header>

      {/* Main content area */}
      <div className="flex-1 flex min-h-0">
        {/* Player area */}
        <div className="flex-1 flex items-center justify-center p-4 sm:p-6 min-w-0">
          <div className="w-full max-w-full">
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
            <p className="text-white/40 text-xs mt-2">{broadcast.title}</p>
          </div>
        </div>

        {/* Desktop sidebar */}
        {!isMobile && (
          <div
            className={`shrink-0 border-l border-white/10 bg-white/[0.02] transition-all duration-300 ease-in-out overflow-hidden ${
              sidebarOpen ? 'w-[380px]' : 'w-0'
            }`}
          >
            <div className="w-[380px] h-full">{sidebarContent}</div>
          </div>
        )}
      </div>

      {/* Mobile: floating schedule button + drawer */}
      {isMobile && (
        <>
          <Button
            onClick={() => setDrawerOpen(true)}
            className="fixed bottom-6 right-4 z-20 rounded-full shadow-lg bg-white/10 backdrop-blur-md border border-white/20 text-white hover:bg-white/20"
            size="lg"
          >
            <ListOrdered className="h-4 w-4 mr-2" /> Schedule
          </Button>
          <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
            <DrawerContent className="bg-[hsl(220,20%,8%)] border-white/10 max-h-[85vh]">
              <DrawerHeader className="border-b border-white/10">
                <DrawerTitle className="text-white">Schedule & Lineups</DrawerTitle>
              </DrawerHeader>
              <div className="overflow-y-auto flex-1">{sidebarContent}</div>
            </DrawerContent>
          </Drawer>
        </>
      )}
    </div>
  );
}
