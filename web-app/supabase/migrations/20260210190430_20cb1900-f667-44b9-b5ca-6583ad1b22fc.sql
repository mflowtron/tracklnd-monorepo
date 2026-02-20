
-- Enum
CREATE TYPE public.purse_source_type AS ENUM ('ppv_ticket', 'direct_meet', 'direct_event');

-- 1. prize_purse_configs
CREATE TABLE public.prize_purse_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meet_id UUID NOT NULL REFERENCES public.meets(id) UNIQUE,
  ppv_ticket_price NUMERIC(10,2) NOT NULL DEFAULT 5.99,
  ppv_purse_mode TEXT NOT NULL CHECK (ppv_purse_mode IN ('static', 'percentage')),
  ppv_purse_static_amount NUMERIC(10,2),
  ppv_purse_percentage NUMERIC(5,2),
  places_paid INT NOT NULL DEFAULT 3 CHECK (places_paid BETWEEN 1 AND 6),
  contributions_open_at TIMESTAMPTZ,
  contributions_close_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT false,
  is_finalized BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.prize_purse_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read prize_purse_configs" ON public.prize_purse_configs FOR SELECT USING (true);
CREATE POLICY "Admins can insert prize_purse_configs" ON public.prize_purse_configs FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update prize_purse_configs" ON public.prize_purse_configs FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete prize_purse_configs" ON public.prize_purse_configs FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_prize_purse_configs_updated_at BEFORE UPDATE ON public.prize_purse_configs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. event_purse_allocations
CREATE TABLE public.event_purse_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_id UUID NOT NULL REFERENCES public.prize_purse_configs(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES public.events(id),
  meet_pct NUMERIC(5,2) NOT NULL CHECK (meet_pct >= 0 AND meet_pct <= 100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(config_id, event_id)
);

ALTER TABLE public.event_purse_allocations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read event_purse_allocations" ON public.event_purse_allocations FOR SELECT USING (true);
CREATE POLICY "Admins can insert event_purse_allocations" ON public.event_purse_allocations FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update event_purse_allocations" ON public.event_purse_allocations FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete event_purse_allocations" ON public.event_purse_allocations FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- 3. place_purse_allocations
CREATE TABLE public.place_purse_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_allocation_id UUID NOT NULL REFERENCES public.event_purse_allocations(id) ON DELETE CASCADE,
  place INT NOT NULL CHECK (place BETWEEN 1 AND 6),
  event_pct NUMERIC(5,2) NOT NULL CHECK (event_pct >= 0 AND event_pct <= 100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(event_allocation_id, place)
);

ALTER TABLE public.place_purse_allocations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read place_purse_allocations" ON public.place_purse_allocations FOR SELECT USING (true);
CREATE POLICY "Admins can insert place_purse_allocations" ON public.place_purse_allocations FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update place_purse_allocations" ON public.place_purse_allocations FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete place_purse_allocations" ON public.place_purse_allocations FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- 4. purse_seed_money
CREATE TABLE public.purse_seed_money (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_id UUID NOT NULL REFERENCES public.prize_purse_configs(id) ON DELETE CASCADE,
  event_allocation_id UUID REFERENCES public.event_purse_allocations(id),
  place_allocation_id UUID REFERENCES public.place_purse_allocations(id),
  amount NUMERIC(10,2) NOT NULL CHECK (amount > 0),
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (
    (event_allocation_id IS NULL AND place_allocation_id IS NULL) OR
    (event_allocation_id IS NOT NULL AND place_allocation_id IS NULL) OR
    (event_allocation_id IS NOT NULL AND place_allocation_id IS NOT NULL)
  )
);

ALTER TABLE public.purse_seed_money ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can select purse_seed_money" ON public.purse_seed_money FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can insert purse_seed_money" ON public.purse_seed_money FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update purse_seed_money" ON public.purse_seed_money FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete purse_seed_money" ON public.purse_seed_money FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- 5. purse_contributions
CREATE TABLE public.purse_contributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_id UUID NOT NULL REFERENCES public.prize_purse_configs(id),
  source_type purse_source_type NOT NULL,
  event_allocation_id UUID REFERENCES public.event_purse_allocations(id),
  user_id UUID REFERENCES auth.users(id),
  gross_amount NUMERIC(10,2) NOT NULL,
  purse_amount NUMERIC(10,2) NOT NULL CHECK (purse_amount >= 2.00),
  square_payment_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (
    (source_type = 'direct_event' AND event_allocation_id IS NOT NULL) OR
    (source_type IN ('ppv_ticket', 'direct_meet') AND event_allocation_id IS NULL)
  )
);

ALTER TABLE public.purse_contributions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select own contributions" ON public.purse_contributions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can select all contributions" ON public.purse_contributions FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can insert contributions" ON public.purse_contributions FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update contributions" ON public.purse_contributions FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete contributions" ON public.purse_contributions FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_contributions_config ON public.purse_contributions(config_id);
CREATE INDEX idx_contributions_event ON public.purse_contributions(event_allocation_id) WHERE event_allocation_id IS NOT NULL;

-- 6. purse_refunds
CREATE TABLE public.purse_refunds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contribution_id UUID NOT NULL REFERENCES public.purse_contributions(id) UNIQUE,
  config_id UUID NOT NULL REFERENCES public.prize_purse_configs(id),
  refund_amount NUMERIC(10,2) NOT NULL,
  square_refund_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.purse_refunds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can select purse_refunds" ON public.purse_refunds FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can insert purse_refunds" ON public.purse_refunds FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update purse_refunds" ON public.purse_refunds FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete purse_refunds" ON public.purse_refunds FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- 7. purse_snapshots
CREATE TABLE public.purse_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_id UUID NOT NULL REFERENCES public.prize_purse_configs(id),
  scope_type TEXT NOT NULL CHECK (scope_type IN ('meet', 'event', 'place')),
  event_allocation_id UUID REFERENCES public.event_purse_allocations(id),
  place_allocation_id UUID REFERENCES public.place_purse_allocations(id),
  cached_total NUMERIC(12,2) NOT NULL DEFAULT 0,
  contribution_count INT NOT NULL DEFAULT 0,
  last_updated TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(config_id, scope_type, event_allocation_id, place_allocation_id)
);

ALTER TABLE public.purse_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read purse_snapshots" ON public.purse_snapshots FOR SELECT USING (true);
CREATE POLICY "Admins can insert purse_snapshots" ON public.purse_snapshots FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update purse_snapshots" ON public.purse_snapshots FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete purse_snapshots" ON public.purse_snapshots FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_snapshots_config ON public.purse_snapshots(config_id);

-- 8. user_meet_access
CREATE TABLE public.user_meet_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  meet_id UUID NOT NULL REFERENCES public.meets(id),
  access_type TEXT NOT NULL DEFAULT 'ppv',
  square_payment_id TEXT,
  granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at TIMESTAMPTZ,
  UNIQUE(user_id, meet_id)
);

ALTER TABLE public.user_meet_access ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select own meet access" ON public.user_meet_access FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can select all meet access" ON public.user_meet_access FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can insert meet access" ON public.user_meet_access FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update meet access" ON public.user_meet_access FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete meet access" ON public.user_meet_access FOR DELETE USING (public.has_role(auth.uid(), 'admin'));
