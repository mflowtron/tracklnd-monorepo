import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { Plus } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function ContentTab() {
  const [works, setWorks] = useState<any[]>([]);
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    supabase.from('works').select('*').order('published_at', { ascending: false }).then(({ data }) => setWorks(data || []));
  }, []);

  const filtered = works.filter(w => (typeFilter === 'all' || w.work_type === typeFilter) && (statusFilter === 'all' || w.status === statusFilter));
  const counts = { all: works.length, short: works.filter(w => w.work_type === 'short').length, work: works.filter(w => w.work_type === 'work').length, feature: works.filter(w => w.work_type === 'feature').length, published: works.filter(w => w.status === 'published').length, draft: works.filter(w => w.status === 'draft').length };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Content</h2>
        <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Create Work</Button>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <Card><CardContent className="pt-4 pb-3"><p className="text-2xl font-bold">{counts.all}</p><p className="text-xs text-muted-foreground">Total</p></CardContent></Card>
        <Card><CardContent className="pt-4 pb-3"><p className="text-2xl font-bold">{counts.published}</p><p className="text-xs text-muted-foreground">Published</p></CardContent></Card>
        <Card><CardContent className="pt-4 pb-3"><p className="text-2xl font-bold">{counts.draft}</p><p className="text-xs text-muted-foreground">Drafts</p></CardContent></Card>
        <Card><CardContent className="pt-4 pb-3"><p className="text-2xl font-bold">{counts.short}/{counts.work}/{counts.feature}</p><p className="text-xs text-muted-foreground">S / W / F</p></CardContent></Card>
      </div>
      <div className="flex gap-2 mb-6 flex-wrap">
        {['all', 'short', 'work', 'feature'].map(f => (
          <button key={f} onClick={() => setTypeFilter(f)} className={`px-3 py-1 rounded-full text-xs font-medium capitalize transition-colors ${typeFilter === f ? 'bg-primary text-primary-foreground' : 'bg-secondary hover:bg-accent'}`}>{f === 'all' ? 'All Types' : f === 'short' ? 'Shorts' : f === 'work' ? 'Works' : 'Features'}</button>
        ))}
        <span className="w-px bg-border mx-1" />
        {['all', 'published', 'draft', 'archived'].map(f => (
          <button key={f} onClick={() => setStatusFilter(f)} className={`px-3 py-1 rounded-full text-xs font-medium capitalize transition-colors ${statusFilter === f ? 'bg-primary text-primary-foreground' : 'bg-secondary hover:bg-accent'}`}>{f === 'all' ? 'All Status' : f}</button>
        ))}
      </div>
      <div className="space-y-2">
        {filtered.map(w => (
          <div key={w.id} className="flex items-center gap-4 p-3 rounded-lg border bg-background hover:shadow-sm transition-shadow">
            <img src={w.cover_image_url} alt="" className="w-12 h-12 rounded object-cover flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">{w.title}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <Badge variant="outline" className="text-[10px] capitalize">{w.work_type}</Badge>
                <Badge variant={w.status === 'published' ? 'default' : 'secondary'} className="text-[10px]">{w.status}</Badge>
                <span className="text-xs text-muted-foreground">{w.published_at && format(new Date(w.published_at), 'MMM d, yyyy')}</span>
              </div>
            </div>
            <Button variant="outline" size="sm" asChild><Link to={`/works/${w.slug}`}>View</Link></Button>
          </div>
        ))}
      </div>
    </div>
  );
}
