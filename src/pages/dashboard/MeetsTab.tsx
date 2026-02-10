import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { Calendar, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';

const filters = ['all', 'live', 'upcoming', 'draft', 'archived'] as const;

export default function MeetsTab() {
  const [meets, setMeets] = useState<any[]>([]);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    supabase.from('meets').select('*').order('start_date', { ascending: false }).then(({ data }) => setMeets(data || []));
  }, []);

  const filtered = filter === 'all' ? meets : meets.filter(m => m.status === filter);
  const statusColor = (s: string) => {
    if (s === 'live') return 'bg-red-500 text-white';
    if (s === 'upcoming') return 'bg-primary text-primary-foreground';
    if (s === 'archived') return 'bg-muted text-muted-foreground';
    return 'bg-secondary text-secondary-foreground';
  };
  const counts = { all: meets.length, live: meets.filter(m => m.status === 'live').length, upcoming: meets.filter(m => m.status === 'upcoming').length, draft: meets.filter(m => m.status === 'draft').length, archived: meets.filter(m => m.status === 'archived').length };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Meets</h2>
        <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Create Meet</Button>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {(['all', 'live', 'upcoming', 'archived'] as const).map(k => (
          <Card key={k}><CardContent className="pt-4 pb-3"><p className="text-2xl font-bold">{counts[k]}</p><p className="text-xs text-muted-foreground capitalize">{k === 'all' ? 'Total' : k} Meets</p></CardContent></Card>
        ))}
      </div>
      <div className="flex gap-2 mb-6 flex-wrap">
        {filters.map(f => (
          <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1 rounded-full text-xs font-medium capitalize transition-colors ${filter === f ? 'bg-primary text-primary-foreground' : 'bg-secondary hover:bg-accent'}`}>{f}</button>
        ))}
      </div>
      <div className="space-y-3">
        {filtered.map(m => (
          <div key={m.id} className="flex items-center justify-between p-4 rounded-lg border bg-background hover:shadow-sm transition-shadow">
            <div className="flex items-center gap-4">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-semibold">{m.name}</p>
                <p className="text-sm text-muted-foreground">{format(new Date(m.start_date), 'MMM d, yyyy')} · {m.venue}, {m.location}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge className={statusColor(m.status)}>{m.status}</Badge>
              <Button variant="outline" size="sm" asChild><Link to={`/meets/${m.slug}`}>View</Link></Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
