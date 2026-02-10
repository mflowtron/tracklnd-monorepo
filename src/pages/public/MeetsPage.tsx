import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { RefreshCw } from 'lucide-react';
import { fetchWithRetry } from '@/lib/supabase-fetch';

const filters = ['all', 'upcoming', 'live', 'archived'] as const;

export default function MeetsPage() {
  const [meets, setMeets] = useState<any[]>([]);
  const [filter, setFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const loadData = useCallback(() => {
    console.log('MeetsPage: fetching data...');
    setLoading(true);
    setError(false);
    fetchWithRetry(() => supabase.from('meets').select('*').order('start_date', { ascending: false }))
      .then(({ data }) => { setMeets(data || []); console.log('MeetsPage: fetch complete'); })
      .catch(err => { console.error('MeetsPage: fetch failed:', err); setError(true); })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const filtered = filter === 'all' ? meets : meets.filter(m => m.status === filter);

  const statusColor = (s: string) => {
    if (s === 'live') return 'bg-red-500 text-white';
    if (s === 'upcoming') return 'bg-primary text-primary-foreground';
    if (s === 'archived') return 'bg-muted text-muted-foreground';
    return 'bg-secondary text-secondary-foreground';
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-10">
        <h1 className="font-display text-4xl sm:text-5xl mb-3">Meets</h1>
        <p className="text-lg text-muted-foreground">Track and field competitions across the Pacific Northwest and beyond.</p>
      </div>

      <div className="flex gap-2 mb-8 flex-wrap">
        {filters.map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium capitalize transition-colors ${
              filter === f ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground hover:bg-accent'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {error && !loading ? (
        <div className="flex flex-col items-center justify-center min-h-[30vh] gap-4">
          <p className="text-muted-foreground">Something went wrong loading meets.</p>
          <Button onClick={loadData} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" /> Try Again
          </Button>
        </div>
      ) : loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="rounded-lg border border-border overflow-hidden">
              <Skeleton className="aspect-[16/9] w-full" />
              <div className="p-5 space-y-2">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map(m => (
              <Link
                key={m.id}
                to={`/meets/${m.slug}`}
                className="group bg-background rounded-lg border border-border overflow-hidden hover:shadow-lg transition-shadow"
              >
                {m.hero_image_url && (
                  <div className="relative aspect-[16/9] overflow-hidden">
                    <img src={m.hero_image_url} alt={m.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                    <Badge className={`absolute top-3 right-3 ${statusColor(m.status)}`}>{m.status}</Badge>
                  </div>
                )}
                <div className="p-5">
                  <h3 className="font-semibold text-lg mb-1 group-hover:text-primary transition-colors">{m.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(m.start_date), 'MMM d, yyyy')}
                    {m.end_date && ` – ${format(new Date(m.end_date), 'MMM d, yyyy')}`}
                  </p>
                  <p className="text-sm text-muted-foreground">{m.venue}, {m.location}</p>
                </div>
              </Link>
            ))}
          </div>

          {filtered.length === 0 && (
            <p className="text-center text-muted-foreground py-12">No meets found for this filter.</p>
          )}
        </>
      )}
    </div>
  );
}
