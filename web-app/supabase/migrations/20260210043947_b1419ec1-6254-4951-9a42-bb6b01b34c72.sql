
-- Create event_rankings table
CREATE TABLE public.event_rankings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  ranked_athlete_ids text[] NOT NULL DEFAULT '{}',
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, event_id)
);

-- Enable RLS
ALTER TABLE public.event_rankings ENABLE ROW LEVEL SECURITY;

-- RLS policies: users can only access their own rankings
CREATE POLICY "Users can view own rankings"
  ON public.event_rankings FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own rankings"
  ON public.event_rankings FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own rankings"
  ON public.event_rankings FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own rankings"
  ON public.event_rankings FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Auto-update updated_at
CREATE TRIGGER update_event_rankings_updated_at
  BEFORE UPDATE ON public.event_rankings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
