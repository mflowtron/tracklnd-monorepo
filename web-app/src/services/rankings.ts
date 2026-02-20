import { supabase } from '@/integrations/supabase/client';

export async function getUserRanking(eventId: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from('event_rankings' as any)
    .select('*')
    .eq('user_id', user.id)
    .eq('event_id', eventId)
    .maybeSingle();

  return data as unknown as { id: string; user_id: string; event_id: string; ranked_athlete_ids: string[]; updated_at: string } | null;
}

export async function getUserRankingsForMeet(meetId: string, eventIds?: string[]) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return {};

  // Use provided eventIds to skip the extra events query
  let ids = eventIds;
  if (!ids) {
    const { data: events } = await supabase
      .from('events')
      .select('id')
      .eq('meet_id', meetId);

    if (!events?.length) return {};
    ids = events.map(e => e.id);
  }

  if (!ids.length) return {};

  const { data: rankings } = await supabase
    .from('event_rankings' as any)
    .select('*')
    .eq('user_id', user.id)
    .in('event_id', ids);

  const map: Record<string, string[]> = {};
  (rankings || []).forEach((r: any) => {
    map[r.event_id] = r.ranked_athlete_ids;
  });
  return map;
}

export async function saveRanking(eventId: string, rankedAthleteIds: string[]) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('event_rankings' as any)
    .upsert(
      { user_id: user.id, event_id: eventId, ranked_athlete_ids: rankedAthleteIds },
      { onConflict: 'user_id,event_id' }
    );

  if (error) throw error;
}

export async function deleteRanking(eventId: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('event_rankings' as any)
    .delete()
    .eq('user_id', user.id)
    .eq('event_id', eventId);

  if (error) throw error;
}
