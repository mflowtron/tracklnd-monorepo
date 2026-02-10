
CREATE OR REPLACE FUNCTION public.get_event_pick_counts(meet_id_param uuid)
RETURNS TABLE(event_id uuid, pick_count bigint)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT er.event_id, COUNT(DISTINCT er.user_id) as pick_count
  FROM event_rankings er
  INNER JOIN events e ON e.id = er.event_id
  WHERE e.meet_id = meet_id_param
  AND array_length(er.ranked_athlete_ids, 1) > 0
  GROUP BY er.event_id;
$$;
