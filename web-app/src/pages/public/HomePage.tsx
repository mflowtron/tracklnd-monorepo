import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { ArrowRight, Mail, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import useEmblaCarousel from 'embla-carousel-react';
import Autoplay from 'embla-carousel-autoplay';
import { toast } from 'sonner';
import { fetchWithRetry } from '@/lib/supabase-fetch';

export default function HomePage() {
  const [banner, setBanner] = useState<any>(null);
  const [bannerLoaded, setBannerLoaded] = useState(false);
  const [shorts, setShorts] = useState<any[]>([]);
  const [shortsLoaded, setShortsLoaded] = useState(false);
  const [upcomingMeets, setUpcomingMeets] = useState<any[]>([]);
  const [meetsLoaded, setMeetsLoaded] = useState(false);
  const [recentWorks, setRecentWorks] = useState<any[]>([]);
  const [worksLoaded, setWorksLoaded] = useState(false);
  const [email, setEmail] = useState('');
  const [error, setError] = useState(false);

  const loading = !bannerLoaded || !shortsLoaded || !meetsLoaded || !worksLoaded;

  const [shortsRef] = useEmblaCarousel({ loop: true, align: 'start' }, [Autoplay({ delay: 4000 })]);
  const [worksRef] = useEmblaCarousel({ loop: false, align: 'start', slidesToScroll: 1 });

  const loadData = useCallback(() => {
    console.log('HomePage: fetching data...');
    setBannerLoaded(false);
    setShortsLoaded(false);
    setMeetsLoaded(false);
    setWorksLoaded(false);
    setError(false);

    // Fire all queries in parallel — each section renders as soon as its data arrives
    fetchWithRetry(() => supabase.from('banners').select('*').eq('placement', 'homepage').eq('is_active', true).limit(1).maybeSingle())
      .then(({ data }) => setBanner(data))
      .catch(() => {})
      .finally(() => setBannerLoaded(true));

    fetchWithRetry(() => supabase.from('works').select('*').eq('work_type', 'short').eq('status', 'published').order('published_at', { ascending: false }).limit(6))
      .then(({ data }) => setShorts(data || []))
      .catch(() => {})
      .finally(() => setShortsLoaded(true));

    fetchWithRetry(() => supabase.from('meets').select('*').in('status', ['upcoming', 'live']).order('start_date', { ascending: true }).limit(4))
      .then(({ data }) => setUpcomingMeets(data || []))
      .catch(() => {})
      .finally(() => setMeetsLoaded(true));

    fetchWithRetry(() => supabase.from('works').select('*').in('work_type', ['work', 'feature']).eq('status', 'published').order('published_at', { ascending: false }).limit(6))
      .then(({ data }) => setRecentWorks(data || []))
      .catch(() => {})
      .finally(() => setWorksLoaded(true));
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleSubscribe = async () => {
    if (!email) return;
    const { error } = await supabase.from('newsletter_subscribers').insert({ email });
    if (error) {
      if (error.code === '23505') toast.info('You\'re already subscribed!');
      else toast.error('Something went wrong. Try again.');
    } else {
      toast.success('Welcome aboard! You\'re subscribed.');
      setEmail('');
    }
  };

  const statusColor = (s: string) => {
    if (s === 'live') return 'bg-red-500 text-white';
    if (s === 'upcoming') return 'bg-primary text-primary-foreground';
    return 'bg-muted text-muted-foreground';
  };

  if (error && !loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <p className="text-muted-foreground">Something went wrong loading this content.</p>
        <Button onClick={loadData} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" /> Try Again
        </Button>
      </div>
    );
  }

  return (
    <div>
      {/* 1. Hero Banner */}
      {!bannerLoaded ? (
        <Skeleton className="h-[70vh] min-h-[500px] w-full rounded-none" />
      ) : banner && (
        <section className="relative h-[70vh] min-h-[500px] flex items-center justify-center overflow-hidden">
          <img src={banner.image_url} alt="" className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/20" />
          <div className="relative z-10 text-center text-white px-4 max-w-3xl mx-auto animate-fade-in">
            <h1 className="font-display text-5xl sm:text-6xl lg:text-7xl mb-4">{banner.title}</h1>
            <p className="text-lg sm:text-xl text-white/80 mb-8 max-w-2xl mx-auto">{banner.subtitle}</p>
            {banner.cta_label && (
              <Button asChild size="lg" className="text-base">
                <Link to={banner.cta_url || '/works'}>{banner.cta_label}</Link>
              </Button>
            )}
          </div>
        </section>
      )}

      {/* 2. Weekly Shorts Carousel */}
      {!shortsLoaded ? (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-4">
          <Skeleton className="h-8 w-48" />
          <div className="flex gap-4">
            {[1, 2, 3].map(i => <Skeleton key={i} className="w-[320px] sm:w-[400px] aspect-[16/10] rounded-lg flex-shrink-0" />)}
          </div>
        </div>
      ) : shorts.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="flex items-center justify-between mb-8">
            <h2 className="font-display text-2xl sm:text-3xl">Weekly Shorts</h2>
            <Link to="/works?type=short" className="flex items-center gap-1 text-sm font-medium text-primary hover:underline">
              View all <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="overflow-hidden" ref={shortsRef}>
            <div className="flex gap-4">
              {shorts.map(s => (
                <Link key={s.id} to={`/works/${s.slug}`} className="flex-shrink-0 w-[320px] sm:w-[400px] group">
                  <div className="relative aspect-[16/10] rounded-lg overflow-hidden">
                    <img src={s.cover_image_url} alt={s.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-4">
                      <p className="text-white font-semibold text-sm sm:text-base line-clamp-2">{s.title}</p>
                      <p className="text-white/60 text-xs mt-1">{s.published_at && format(new Date(s.published_at), 'MMM d, yyyy')}</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Newsletter CTA */}
          <div className="mt-8 flex flex-col sm:flex-row items-center gap-3 p-6 rounded-lg bg-secondary">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Mail className="h-4 w-4 text-primary" />
              <span>Get Weekly Shorts in your inbox</span>
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <Input type="email" placeholder="you@email.com" value={email} onChange={e => setEmail(e.target.value)} className="sm:w-64" />
              <Button onClick={handleSubscribe} size="sm">Subscribe</Button>
            </div>
          </div>
        </section>
      )}

      {/* 3. Upcoming Meets */}
      {!meetsLoaded ? (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-4">
          <Skeleton className="h-8 w-48" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => <Skeleton key={i} className="aspect-[16/9] rounded-lg" />)}
          </div>
        </div>
      ) : upcomingMeets.length > 0 && (
        <section className="bg-secondary/50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
            <div className="flex items-center justify-between mb-8">
              <h2 className="font-display text-2xl sm:text-3xl">Upcoming Meets</h2>
              <Link to="/meets" className="flex items-center gap-1 text-sm font-medium text-primary hover:underline">View all <ArrowRight className="h-4 w-4" /></Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {upcomingMeets.map(m => (
                <Link key={m.id} to={`/meets/${m.slug}`} className="group bg-background rounded-lg border border-border overflow-hidden hover:shadow-lg transition-shadow">
                  {m.hero_image_url && (
                    <div className="aspect-[16/9] overflow-hidden">
                      <img src={m.hero_image_url} alt={m.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    </div>
                  )}
                  <div className="p-5">
                    <div className="flex items-center gap-2 mb-2"><Badge className={statusColor(m.status)}>{m.status}</Badge></div>
                    <h3 className="font-semibold text-lg mb-1">{m.name}</h3>
                    <p className="text-sm text-muted-foreground">{format(new Date(m.start_date), 'MMM d, yyyy')}{m.end_date && ` – ${format(new Date(m.end_date), 'MMM d, yyyy')}`}</p>
                    <p className="text-sm text-muted-foreground">{m.venue}, {m.location}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 4. Recent Works Carousel */}
      {!worksLoaded ? (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-4">
          <Skeleton className="h-8 w-48" />
          <div className="flex gap-6">
            {[1, 2, 3].map(i => <Skeleton key={i} className="w-[300px] sm:w-[360px] aspect-[4/3] rounded-lg flex-shrink-0" />)}
          </div>
        </div>
      ) : recentWorks.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="flex items-center justify-between mb-8">
            <h2 className="font-display text-2xl sm:text-3xl">Recent Works</h2>
            <Link to="/works" className="flex items-center gap-1 text-sm font-medium text-primary hover:underline">View all <ArrowRight className="h-4 w-4" /></Link>
          </div>
          <div className="overflow-hidden" ref={worksRef}>
            <div className="flex gap-6">
              {recentWorks.map(w => (
                <Link key={w.id} to={`/works/${w.slug}`} className="flex-shrink-0 w-[300px] sm:w-[360px] group">
                  <div className="aspect-[4/3] rounded-lg overflow-hidden mb-3">
                    <img src={w.cover_image_url} alt={w.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  </div>
                  <Badge variant="outline" className="mb-2 text-xs capitalize">{w.work_type}</Badge>
                  <h3 className="font-semibold line-clamp-2 mb-1 group-hover:text-primary transition-colors">{w.title}</h3>
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-1">{w.summary}</p>
                  <p className="text-xs text-muted-foreground">{w.published_at && format(new Date(w.published_at), 'MMM d, yyyy')}</p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 5. About Us */}
      <section className="bg-secondary/50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
          <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl mb-6">Our Motley Crew Is Creating the Modern Home of Racing</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Tracklnd exists to elevate track and field storytelling. We believe the sport deserves
            the same cinematic treatment, editorial depth, and passionate community that other major
            sports enjoy. From live meet coverage to long-form athlete profiles, we're building
            something that celebrates the beauty, grit, and humanity of racing.
          </p>
        </div>
      </section>
    </div>
  );
}
