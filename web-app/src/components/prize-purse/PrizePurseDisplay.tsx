import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { usePursePolling } from '@/hooks/usePursePolling';
import AnimatedPurseAmount from './AnimatedPurseAmount';
import type { Tables } from '@/integrations/supabase/types';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface EventWithAllocation {
  allocation: Tables<'event_purse_allocations'>;
  event: { id: string; name: string; gender: string };
  places: Tables<'place_purse_allocations'>[];
}

interface PrizePurseDisplayProps {
  configId: string;
  meetId: string;
}

export default function PrizePurseDisplay({ configId, meetId }: PrizePurseDisplayProps) {
  const { meetTotal, contributionCount, getEventTotal, getPlaceTotal, isLoading } = usePursePolling(configId);
  const [eventData, setEventData] = useState<EventWithAllocation[]>([]);
  const [expandedEvent, setExpandedEvent] = useState<string | null>(null);
  const [dataLoading, setDataLoading] = useState(true);

  const loadEventData = useCallback(async () => {
    // Fetch event allocations with event info
    const { data: allocations } = await supabase
      .from('event_purse_allocations')
      .select('*, events(id, name, gender)')
      .eq('config_id', configId)
      .order('created_at');

    if (!allocations) {
      setDataLoading(false);
      return;
    }

    // Fetch all place allocations for these event allocations
    const allocIds = allocations.map(a => a.id);
    const { data: places } = await supabase
      .from('place_purse_allocations')
      .select('*')
      .in('event_allocation_id', allocIds.length > 0 ? allocIds : ['__none__'])
      .order('place');

    const result: EventWithAllocation[] = allocations.map((alloc: any) => ({
      allocation: alloc,
      event: alloc.events,
      places: (places || []).filter(p => p.event_allocation_id === alloc.id),
    }));

    setEventData(result);
    setDataLoading(false);
  }, [configId]);

  useEffect(() => { loadEventData(); }, [loadEventData]);

  const toggleEvent = (allocId: string) => {
    setExpandedEvent(prev => prev === allocId ? null : allocId);
  };

  const placeLabel = (place: number) => {
    if (place === 1) return '1st Place';
    if (place === 2) return '2nd Place';
    if (place === 3) return '3rd Place';
    return `${place}th Place`;
  };

  if (isLoading && dataLoading) {
    return (
      <div className="min-h-screen bg-[hsl(220,20%,5%)] flex items-center justify-center">
        <div className="h-8 w-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[hsl(220,20%,5%)] text-white">
      {/* Hero Section */}
      <div className="flex flex-col items-center justify-center pt-16 pb-12 px-4">
        <div className="flex items-center gap-2 mb-4">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-400" />
          </span>
          <span className="font-display text-sm tracking-widest text-amber-400/80">PRIZE PURSE</span>
        </div>
        <AnimatedPurseAmount
          value={meetTotal}
          className="text-5xl sm:text-7xl font-bold text-amber-400"
        />
        <p className="mt-3 text-white/40 text-sm">
          {contributionCount} contribution{contributionCount !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Event Breakdown */}
      <div className="max-w-4xl mx-auto px-4 pb-16">
        <h2 className="font-display text-xs tracking-widest text-white/30 mb-6">EVENT BREAKDOWN</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {eventData.map(({ allocation, event, places }) => {
            const isExpanded = expandedEvent === allocation.id;
            return (
              <div
                key={allocation.id}
                className="bg-white/[0.04] border border-white/[0.08] rounded-xl overflow-hidden transition-all duration-200 hover:border-white/[0.15]"
              >
                <button
                  onClick={() => toggleEvent(allocation.id)}
                  className="w-full px-5 py-4 flex items-center justify-between text-left"
                >
                  <div>
                    <p className="text-sm text-white/50 mb-1">{event.name}</p>
                    <AnimatedPurseAmount
                      value={getEventTotal(allocation.id)}
                      className="text-xl font-semibold text-white"
                    />
                  </div>
                  {places.length > 0 && (
                    isExpanded
                      ? <ChevronUp className="h-4 w-4 text-white/30" />
                      : <ChevronDown className="h-4 w-4 text-white/30" />
                  )}
                </button>
                {isExpanded && places.length > 0 && (
                  <div className="border-t border-white/[0.06] px-5 py-3 space-y-2">
                    {places.map(place => (
                      <div key={place.id} className="flex items-center justify-between">
                        <span className="text-xs text-white/40">{placeLabel(place.place)}</span>
                        <AnimatedPurseAmount
                          value={getPlaceTotal(place.id)}
                          className="text-sm text-white/70"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
