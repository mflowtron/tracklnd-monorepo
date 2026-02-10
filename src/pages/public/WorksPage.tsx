import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';

const typeFilters = ['all', 'short', 'work', 'feature'] as const;

export default function WorksPage() {
  const [works, setWorks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();
  const activeType = searchParams.get('type') || 'all';

  useEffect(() => {
    setLoading(true);
    supabase.from('works').select('*').eq('status', 'published').order('published_at', { ascending: false })
      .then(({ data }) => setWorks(data || []))
      .finally(() => setLoading(false));
  }, []);

  const filtered = activeType === 'all' ? works : works.filter(w => w.work_type === activeType);

  const counts = {
    all: works.length,
    short: works.filter(w => w.work_type === 'short').length,
    work: works.filter(w => w.work_type === 'work').length,
    feature: works.filter(w => w.work_type === 'feature').length,
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-10">
        <h1 className="font-display text-4xl sm:text-5xl mb-3">Works</h1>
        <p className="text-lg text-muted-foreground">Stories, features, and coverage from the world of track and field.</p>
      </div>

      <div className="flex gap-2 mb-8 flex-wrap">
        {typeFilters.map(f => (
          <button
            key={f}
            onClick={() => setSearchParams(f === 'all' ? {} : { type: f })}
            className={`px-4 py-1.5 rounded-full text-sm font-medium capitalize transition-colors ${
              activeType === f ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground hover:bg-accent'
            }`}
          >
            {f === 'all' ? 'All' : f === 'short' ? 'Shorts' : f === 'work' ? 'Works' : 'Features'} ({counts[f]})
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className={`relative overflow-hidden rounded-lg ${i <= 2 ? 'sm:col-span-2 aspect-[16/9]' : 'aspect-[4/3]'}`}>
              <Skeleton className="absolute inset-0 w-full h-full rounded-lg" />
            </div>
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((w, i) => {
              const isLarge = w.work_type === 'feature' && i < 2;
              return (
                <Link
                  key={w.id}
                  to={`/works/${w.slug}`}
                  className={`group relative overflow-hidden rounded-lg ${isLarge ? 'sm:col-span-2 aspect-[16/9]' : 'aspect-[4/3]'}`}
                >
                  <img
                    src={w.cover_image_url}
                    alt={w.title}
                    className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-5">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline" className="text-white/90 border-white/30 text-xs capitalize bg-white/10">
                        {w.work_type}
                      </Badge>
                      <span className="text-white/60 text-xs">{w.published_at && format(new Date(w.published_at), 'MMM d, yyyy')}</span>
                    </div>
                    <h3 className={`text-white font-semibold line-clamp-2 ${isLarge ? 'text-xl sm:text-2xl' : 'text-base'}`}>{w.title}</h3>
                  </div>
                </Link>
              );
            })}
          </div>

          {filtered.length === 0 && (
            <p className="text-center text-muted-foreground py-12">No works found.</p>
          )}
        </>
      )}
    </div>
  );
}
