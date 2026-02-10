import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Calendar, MapPin, PanelRight, ListOrdered, DollarSign } from 'lucide-react';
import { format } from 'date-fns';
import MuxPlayer from '@mux/mux-player-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import BroadcastSidebar from '@/components/broadcast/BroadcastSidebar';
import PPVPurchaseGate from '@/components/prize-purse/PPVPurchaseGate';
import DirectContributionModal from '@/components/prize-purse/DirectContributionModal';
import AnimatedPurseAmount from '@/components/prize-purse/AnimatedPurseAmount';
import { usePursePolling } from '@/hooks/usePursePolling';
import { useAuth } from '@/contexts/AuthContext';
import type { Tables } from '@/integrations/supabase/types';

const POLL_INTERVAL = 30_000;

export default function BroadcastPage() {
  const { slug } = useParams();
  const isMobile = useIsMobile();
  const { user } = useAuth();

  const [meet, setMeet] = useState<any>(null);
  const [broadcast, setBroadcast] = useState<any>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [entriesByEvent, setEntriesByEvent] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [paused, setPaused] = useState(false);
  const pausedRef = useRef(false);

  // Prize purse state
  const [purseConfig, setPurseConfig] = useState<Tables<'prize_purse_configs'> | null>(null);
  const [hasAccess, setHasAccess] = useState(true); // default true so non-PPV meets just work
  const [contributionOpen, setContributionOpen] = useState(false);

  const { meetTotal } = usePursePolling(purseConfig?.id ?? null);

  const checkAccess = useCallback(async (meetId: string, configData: Tables<'prize_purse_configs'> | null) => {
    // If no config or free (ppv_ticket_price = 0), grant access
    if (!configData || configData.ppv_ticket_price <= 0) {
      setHasAccess(true);
      return;
    }
    // If not logged in, no access
    if (!user) {
      setHasAccess(false);
      return;
    }
    const { data } = await supabase
      .from('user_meet_access')
      .select('id')
      .eq('user_id', user.id)
      .eq('meet_id', meetId)
      .is('revoked_at', null)
      .maybeSingle();
    setHasAccess(!!data);
  }, [user]);

  const loadData = useCallback(async () => {
    if (!slug) return;

    const { data: meetData } = await supabase.from('meets').select('*').eq('slug', slug).maybeSingle();
    setMeet(meetData);
    if (!meetData) { setLoading(false); return; }

    // Fetch broadcast, events, and purse config in parallel
    const [broadcastResult, eventsResult, configResult] = await Promise.all([
      supabase
        .from('broadcasts')
        .select('*')
        .eq('meet_id', meetData.id)
        .eq('is_active', true)
        .limit(1),
      supabase
        .from('events')
        .select('*, event_entries(*, athletes(*))')
        .eq('meet_id', meetData.id)
        .order('sort_order')
        .order('place', { referencedTable: 'event_entries', ascending: true, nullsFirst: false }),
      supabase
        .from('prize_purse_configs')
        .select('*')
        .eq('meet_id', meetData.id)
        .maybeSingle(),
    ]);

    setBroadcast(broadcastResult.data?.[0] || null);
    setPurseConfig(configResult.data);

    const evts = eventsResult.data || [];
    setEvents(evts);

    const newEntries: Record<string, any[]> = {};
    evts.forEach((evt: any) => {
      newEntries[evt.id] = evt.event_entries || [];
    });
    setEntriesByEvent(newEntries);

    // Check PPV access
    await checkAccess(meetData.id, configResult.data);

    setLoading(false);
  }, [slug, checkAccess]);

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
      <div className="h-screen bg-[hsl(220,20%,5%)] flex flex-col overflow-hidden">
        {/* Header skeleton */}
        <header className="flex items-center justify-between px-4 sm:px-6 py-3 bg-black/40 border-b border-white/5 shrink-0">
          <div className="flex items-center gap-3">
            <Skeleton className="h-8 w-16 bg-white/10 rounded" />
            <Skeleton className="h-5 w-40 bg-white/10 rounded" />
            <Skeleton className="h-5 w-14 bg-white/10 rounded-full" />
          </div>
          <Skeleton className="h-8 w-8 bg-white/10 rounded" />
        </header>
        {/* Player skeleton */}
        <div className="flex-1 flex items-center justify-center p-4 sm:p-6">
          <div className="w-full max-w-full">
            <Skeleton className="w-full bg-white/5 rounded-xl" style={{ aspectRatio: '16/9' }} />
            <Skeleton className="h-3 w-48 bg-white/10 mt-2 rounded" />
          </div>
        </div>
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
          {purseConfig && (
            <>
              <div className="hidden sm:flex items-center gap-1.5 text-xs mr-1">
                <span className="text-amber-400/60">Purse:</span>
                <AnimatedPurseAmount value={meetTotal} className="text-amber-400 text-xs font-semibold" />
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-amber-400/80 hover:text-amber-400 hover:bg-amber-400/10"
                onClick={() => setContributionOpen(true)}
              >
                <DollarSign className="h-4 w-4" />
                <span className="hidden sm:inline ml-1">Contribute</span>
              </Button>
            </>
          )}
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
        {/* Player area or PPV gate */}
        <div className="flex-1 flex items-center justify-center p-4 sm:p-6 min-w-0">
          {!hasAccess && purseConfig ? (
            <PPVPurchaseGate
              meet={{ name: meet.name, venue: meet.venue }}
              config={purseConfig}
              onAccessGranted={() => { setHasAccess(true); loadData(); }}
            />
          ) : (
            <div className="w-full max-w-full">
              <MuxPlayer
                playbackId={broadcast.mux_playback_id}
                streamType={broadcast.status === 'live' ? 'live' : 'on-demand'}
                accentColor="hsl(221, 83%, 53%)"
                style={{ aspectRatio: '16/9', width: '100%', borderRadius: '0.75rem', overflow: 'hidden' }}
                metadata={{
                  video_title: broadcast.title,
                  viewer_user_id: 'anonymous',
                }}
              />
              <p className="text-white/40 text-xs mt-2">{broadcast.title}</p>
            </div>
          )}
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
      {/* Direct Contribution Modal */}
      {purseConfig && (
        <DirectContributionModal
          open={contributionOpen}
          onOpenChange={setContributionOpen}
          configId={purseConfig.id}
        />
      )}
    </div>
  );
}
