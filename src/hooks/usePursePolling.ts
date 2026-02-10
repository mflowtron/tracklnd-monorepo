import { useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';

const POLL_INTERVAL = 3000;

export function usePursePolling(configId: string | null) {
  const [snapshots, setSnapshots] = useState<Tables<'purse_snapshots'>[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const jitterRef = useRef(Math.random() * 1000);

  const fetchSnapshots = useCallback(async () => {
    if (!configId) return;
    const { data } = await supabase
      .from('purse_snapshots')
      .select('*')
      .eq('config_id', configId);
    if (data) {
      setSnapshots(data);
    }
    setIsLoading(false);
  }, [configId]);

  useEffect(() => {
    if (!configId) {
      setSnapshots([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    // Initial fetch with jitter delay
    const jitterTimeout = setTimeout(() => {
      fetchSnapshots();
    }, jitterRef.current);

    // Polling interval
    const interval = setInterval(fetchSnapshots, POLL_INTERVAL);

    return () => {
      clearTimeout(jitterTimeout);
      clearInterval(interval);
    };
  }, [configId, fetchSnapshots]);

  const meetSnapshot = snapshots.find(s => s.scope_type === 'meet');
  const meetTotal = meetSnapshot?.cached_total ?? 0;
  const contributionCount = meetSnapshot?.contribution_count ?? 0;

  const getEventTotal = useCallback(
    (eventAllocId: string) => {
      const snap = snapshots.find(
        s => s.scope_type === 'event' && s.event_allocation_id === eventAllocId
      );
      return snap?.cached_total ?? 0;
    },
    [snapshots]
  );

  const getPlaceTotal = useCallback(
    (placeAllocId: string) => {
      const snap = snapshots.find(
        s => s.scope_type === 'place' && s.place_allocation_id === placeAllocId
      );
      return snap?.cached_total ?? 0;
    },
    [snapshots]
  );

  return {
    snapshots,
    meetTotal,
    contributionCount,
    getEventTotal,
    getPlaceTotal,
    isLoading,
  };
}
