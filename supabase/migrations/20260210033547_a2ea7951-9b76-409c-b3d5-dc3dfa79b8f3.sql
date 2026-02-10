
-- Enums
CREATE TYPE public.work_type AS ENUM ('short', 'work', 'feature');
CREATE TYPE public.work_status AS ENUM ('draft', 'published', 'archived');
CREATE TYPE public.meet_status AS ENUM ('draft', 'upcoming', 'live', 'archived');
CREATE TYPE public.event_gender AS ENUM ('men', 'women', 'mixed');
CREATE TYPE public.event_status AS ENUM ('scheduled', 'in_progress', 'complete');
CREATE TYPE public.banner_placement AS ENUM ('homepage', 'meet');
CREATE TYPE public.app_role AS ENUM ('admin', 'viewer');

-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  display_name TEXT NOT NULL DEFAULT '',
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- User roles (separate table per security requirements)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE(user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function for role checks
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Works
CREATE TABLE public.works (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  summary TEXT NOT NULL DEFAULT '',
  body TEXT NOT NULL DEFAULT '',
  cover_image_url TEXT NOT NULL DEFAULT '',
  work_type work_type NOT NULL DEFAULT 'work',
  status work_status NOT NULL DEFAULT 'draft',
  author_id UUID REFERENCES public.profiles(id),
  tags TEXT[] DEFAULT '{}',
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.works ENABLE ROW LEVEL SECURITY;

-- Meets
CREATE TABLE public.meets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL DEFAULT '',
  hero_image_url TEXT,
  start_date DATE NOT NULL,
  end_date DATE,
  venue TEXT NOT NULL DEFAULT '',
  location TEXT NOT NULL DEFAULT '',
  status meet_status NOT NULL DEFAULT 'draft',
  broadcast_url TEXT,
  broadcast_partner TEXT,
  cta_label TEXT,
  cta_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.meets ENABLE ROW LEVEL SECURITY;

-- Events
CREATE TABLE public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meet_id UUID REFERENCES public.meets(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  gender event_gender NOT NULL DEFAULT 'men',
  round TEXT,
  scheduled_time TIMESTAMPTZ,
  status event_status NOT NULL DEFAULT 'scheduled',
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- Athletes
CREATE TABLE public.athletes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  country_code TEXT NOT NULL DEFAULT 'US',
  country_flag TEXT NOT NULL DEFAULT '🇺🇸',
  team TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.athletes ENABLE ROW LEVEL SECURITY;

-- Event entries (results)
CREATE TABLE public.event_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE NOT NULL,
  athlete_id UUID REFERENCES public.athletes(id) ON DELETE CASCADE NOT NULL,
  place INT,
  result TEXT,
  is_pb BOOLEAN NOT NULL DEFAULT false
);
ALTER TABLE public.event_entries ENABLE ROW LEVEL SECURITY;

-- Banners
CREATE TABLE public.banners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  subtitle TEXT,
  image_url TEXT,
  cta_label TEXT,
  cta_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT false,
  placement banner_placement NOT NULL DEFAULT 'homepage',
  meet_id UUID REFERENCES public.meets(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.banners ENABLE ROW LEVEL SECURITY;

-- Newsletter subscribers
CREATE TABLE public.newsletter_subscribers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  subscribed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.newsletter_subscribers ENABLE ROW LEVEL SECURITY;

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', ''));
  -- Default role: viewer
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'viewer');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_works_updated_at BEFORE UPDATE ON public.works FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_meets_updated_at BEFORE UPDATE ON public.meets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS Policies

-- Profiles: public read, owner update
CREATE POLICY "Anyone can read profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "System can insert profiles" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- User roles: authenticated read own, admin manage
CREATE POLICY "Users can read own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can read all roles" ON public.user_roles FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Works: public read published, admin write
CREATE POLICY "Anyone can read published works" ON public.works FOR SELECT USING (status = 'published');
CREATE POLICY "Admins can read all works" ON public.works FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can insert works" ON public.works FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update works" ON public.works FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete works" ON public.works FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- Meets: public read, admin write
CREATE POLICY "Anyone can read meets" ON public.meets FOR SELECT USING (true);
CREATE POLICY "Admins can insert meets" ON public.meets FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update meets" ON public.meets FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete meets" ON public.meets FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- Events: public read, admin write
CREATE POLICY "Anyone can read events" ON public.events FOR SELECT USING (true);
CREATE POLICY "Admins can insert events" ON public.events FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update events" ON public.events FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete events" ON public.events FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- Athletes: public read, admin write
CREATE POLICY "Anyone can read athletes" ON public.athletes FOR SELECT USING (true);
CREATE POLICY "Admins can insert athletes" ON public.athletes FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update athletes" ON public.athletes FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete athletes" ON public.athletes FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- Event entries: public read, admin write
CREATE POLICY "Anyone can read event entries" ON public.event_entries FOR SELECT USING (true);
CREATE POLICY "Admins can insert event entries" ON public.event_entries FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update event entries" ON public.event_entries FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete event entries" ON public.event_entries FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- Banners: public read active, admin write
CREATE POLICY "Anyone can read active banners" ON public.banners FOR SELECT USING (is_active = true);
CREATE POLICY "Admins can read all banners" ON public.banners FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can insert banners" ON public.banners FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update banners" ON public.banners FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete banners" ON public.banners FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- Newsletter: public insert, admin read
CREATE POLICY "Anyone can subscribe" ON public.newsletter_subscribers FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can read subscribers" ON public.newsletter_subscribers FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete subscribers" ON public.newsletter_subscribers FOR DELETE USING (public.has_role(auth.uid(), 'admin'));
