import { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { ExternalLink, Play, Tv, Users, Trophy } from 'lucide-react';
import { format } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import { getUserRankingsForMeet, saveRanking } from '@/services/rankings';
import RankingList from '@/components/rankings/RankingList';

export default function MeetDetailPage() {
  const { slug } = useParams();
  const { isAuthenticated } = useAuth();
  const [meet, setMeet] = useState<any>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [entriesByEvent, setEntriesByEvent] = useState<Record<string, any[]>>({});
  const [hasBroadcast, setHasBroadcast] = useState(false);
  const [pickCounts, setPickCounts] = useState<Record<string, number>>({});
  
  const [savedRankings, setSavedRankings] = useState<Record<string, string[]>>({});

  const [error, setError] = useState<string | null>(null);

  const loadMeetData = useCallback(async () => {
    if (!slug) return;
    try {
      const { data: meetData, error: meetError } = await supabase.from('meets').select('*').eq('slug', slug).maybeSingle();
      if (meetError) throw meetError;
      setMeet(meetData);
      if (!meetData) return;

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

      // Load saved rankings
      const rankings = await getUserRankingsForMeet(meetData.id);
      setSavedRankings(rankings);

      // Load pick counts
      const { data: counts } = await supabase.rpc('get_event_pick_counts', { meet_id_param: meetData.id });
      const countsMap: Record<string, number> = {};
      (counts || []).forEach((r: any) => { countsMap[r.event_id] = Number(r.pick_count); });
      setPickCounts(countsMap);

      // Check for active broadcast
      const { data: bc } = await supabase
        .from('broadcasts' as any)
        .select('id')
        .eq('meet_id', meetData.id)
        .eq('is_active', true)
        .limit(1);
      setHasBroadcast((bc?.length || 0) > 0);
    } catch (err) {
      console.error('Failed to load meet data:', err);
      setError('Failed to load meet data. Please try refreshing.');
    }
  }, [slug]);

  useEffect(() => { loadMeetData(); }, [loadMeetData]);

  if (error) return <div className="flex items-center justify-center min-h-[50vh] text-destructive">{error}</div>;
  if (!meet) return <div className="flex items-center justify-center min-h-[50vh] text-muted-foreground">Loading...</div>;

  const statusColor = (s: string) => {
    if (s === 'live') return 'bg-red-500 text-white';
    if (s === 'upcoming') return 'bg-primary text-primary-foreground';
    if (s === 'in_progress') return 'bg-amber-500 text-white';
    if (s === 'complete') return 'bg-emerald-600 text-white';
    if (s === 'scheduled') return 'bg-secondary text-secondary-foreground';
    return 'bg-muted text-muted-foreground';
  };

  const genderLabel = (g: string) => g === 'men' ? 'M' : g === 'women' ? 'W' : 'X';

  const medalEmoji = (place: number | null) => {
    if (place === 1) return '🥇';
    if (place === 2) return '🥈';
    if (place === 3) return '🥉';
    return '';
  };

  

  const handleSaveRanking = async (eventId: string, rankedAthleteIds: string[]) => {
    await saveRanking(eventId, rankedAthleteIds);
    setSavedRankings(prev => ({ ...prev, [eventId]: rankedAthleteIds }));
  };

  return (
    <div>
      {/* Hero */}
      <section className="relative h-[50vh] min-h-[400px] flex items-end overflow-hidden">
        {meet.hero_image_url && (
          <img src={meet.hero_image_url} alt="" className="absolute inset-0 w-full h-full object-cover" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/10" />
        <div className="relative z-10 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pb-10">
          <div className="flex items-center gap-3 mb-3">
            <Badge className={statusColor(meet.status)}>
              {meet.status === 'live' && (
                <span className="relative flex h-2 w-2 mr-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-white" />
                </span>
              )}
              {meet.status}
            </Badge>
          </div>
          <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl text-white mb-3">{meet.name}</h1>
          <p className="text-white/80 text-lg">
            {format(new Date(meet.start_date), 'MMMM d, yyyy')}
            {meet.end_date && ` – ${format(new Date(meet.end_date), 'MMMM d, yyyy')}`}
          </p>
          <p className="text-white/60">{meet.venue}, {meet.location}</p>
          <div className="flex flex-wrap gap-3 mt-4">
            {hasBroadcast && (
              <Button asChild size="lg" className="bg-red-600 hover:bg-red-700 text-white">
                <Link to={`/meets/${slug}/watch`}>
                  <Play className="h-4 w-4 mr-1" /> Watch Broadcast
                </Link>
              </Button>
            )}
            {meet.cta_label && meet.cta_url && (
              <Button asChild size="lg" variant={hasBroadcast ? 'outline' : 'default'} className={hasBroadcast ? 'border-white/30 text-white hover:bg-white/10' : ''}>
                <a href={meet.cta_url} target="_blank" rel="noopener noreferrer">
                  {meet.cta_label} <ExternalLink className="h-4 w-4 ml-1" />
                </a>
              </Button>
            )}
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {meet.description && (
          <div className="max-w-3xl mb-10">
            <p className="text-lg leading-relaxed text-foreground/80">{meet.description}</p>
          </div>
        )}

        {meet.broadcast_partner && (
          <div className="mb-10 p-6 rounded-lg bg-primary/5 border border-primary/20 flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Tv className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-semibold">Broadcast by {meet.broadcast_partner}</p>
                <p className="text-sm text-muted-foreground">Watch the action live</p>
              </div>
            </div>
            {meet.broadcast_url && (
              <Button asChild variant="outline" className="sm:ml-auto">
                <a href={meet.broadcast_url} target="_blank" rel="noopener noreferrer">
                  Watch Live <ExternalLink className="h-4 w-4 ml-1" />
                </a>
              </Button>
            )}
          </div>
        )}

        {/* Events */}
        <h2 className="font-display text-2xl sm:text-3xl mb-6">Events</h2>
        <Accordion type="multiple" className="space-y-2">
          {events.map(evt => {
            const entries = entriesByEvent[evt.id] || [];
            const hasSavedPicks = !!savedRankings[evt.id]?.length;

            return (
              <AccordionItem key={evt.id} value={evt.id} className="border rounded-lg px-4">
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-3 text-left flex-1">
                    <Badge variant="outline" className="text-xs font-mono">{genderLabel(evt.gender)}</Badge>
                    <span className="font-semibold">{evt.name}</span>
                    {evt.round && <span className="text-sm text-muted-foreground">— {evt.round}</span>}
                    {hasSavedPicks && (
                      <Badge className="bg-amber-100 text-amber-700 text-[10px] border-0">
                        <Trophy className="h-3 w-3 mr-0.5" /> Picks
                      </Badge>
                    )}
                    <Badge className={`ml-auto mr-4 ${statusColor(evt.status)}`}>{evt.status.replace('_', ' ')}</Badge>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Users className="h-3 w-3" /> {entries.length}
                    </span>
                    {(pickCounts[evt.id] || 0) > 0 && (
                      <span className="text-xs text-amber-600 flex items-center gap-1">
                        <Trophy className="h-3 w-3" /> {pickCounts[evt.id]} pick{pickCounts[evt.id] !== 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  {entries.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-2">No entries yet.</p>
                  ) : (
                    <RankingList
                      entries={entries}
                      savedRanking={savedRankings[evt.id] || null}
                      isAuthenticated={isAuthenticated}
                      onSave={(ids) => handleSaveRanking(evt.id, ids)}
                      variant="light"
                    />
                  )}
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      </div>
    </div>
  );
}
