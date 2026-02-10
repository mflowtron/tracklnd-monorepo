
-- Create broadcasts table
CREATE TABLE public.broadcasts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  meet_id uuid REFERENCES public.meets(id) ON DELETE SET NULL,
  title text NOT NULL,
  mux_playback_id text NOT NULL,
  mux_asset_id text,
  status text NOT NULL DEFAULT 'ready',
  is_active boolean NOT NULL DEFAULT false,
  thumbnail_url text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.broadcasts ENABLE ROW LEVEL SECURITY;

-- Public can read active broadcasts
CREATE POLICY "Anyone can read active broadcasts"
ON public.broadcasts FOR SELECT
USING (is_active = true);

-- Admins can read all broadcasts
CREATE POLICY "Admins can read all broadcasts"
ON public.broadcasts FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can insert broadcasts
CREATE POLICY "Admins can insert broadcasts"
ON public.broadcasts FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Admins can update broadcasts
CREATE POLICY "Admins can update broadcasts"
ON public.broadcasts FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can delete broadcasts
CREATE POLICY "Admins can delete broadcasts"
ON public.broadcasts FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Auto-update updated_at
CREATE TRIGGER update_broadcasts_updated_at
BEFORE UPDATE ON public.broadcasts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
