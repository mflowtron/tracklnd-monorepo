import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { fetchWithRetry } from '@/lib/supabase-fetch';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { Calendar, Plus, Pencil, Trash2, ExternalLink, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import type { Tables } from '@/integrations/supabase/types';
import MeetFormDialog from '@/components/dashboard/MeetFormDialog';
import DeleteConfirmDialog from '@/components/dashboard/DeleteConfirmDialog';

const filters = ['all', 'live', 'upcoming', 'draft', 'archived'] as const;

export default function MeetsTab() {
  const [meets, setMeets] = useState<Tables<'meets'>[]>([]);
  const [filter, setFilter] = useState('all');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Tables<'meets'> | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const loadMeets = useCallback(async () => {
    setLoading(true);
    setError(false);
    const { data, error: err } = await fetchWithRetry(
      () => supabase.from('meets').select('*').order('start_date', { ascending: false })
    );
    if (err) {
      console.error('MeetsTab: failed to load meets:', err.message);
      setError(true);
    } else {
      setMeets(data || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadMeets(); }, [loadMeets]);

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    const { error } = await supabase.from('meets').delete().eq('id', deleteId);
    setDeleting(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Meet deleted');
    setDeleteId(null);
    loadMeets();
  };

  const filtered = filter === 'all' ? meets : meets.filter(m => m.status === filter);
  const statusColor = (s: string) => {
    if (s === 'live') return 'bg-red-500 text-white';
    if (s === 'upcoming') return 'bg-primary text-primary-foreground';
    if (s === 'archived') return 'bg-muted text-muted-foreground';
    return 'bg-secondary text-secondary-foreground';
  };
  const counts = { all: meets.length, live: meets.filter(m => m.status === 'live').length, upcoming: meets.filter(m => m.status === 'upcoming').length, draft: meets.filter(m => m.status === 'draft').length, archived: meets.filter(m => m.status === 'archived').length };

  if (error && !loading) {
    return (
      <div>
        <h2 className="text-2xl font-bold mb-6">Meets</h2>
        <div className="flex flex-col items-center justify-center min-h-[30vh] gap-4">
          <p className="text-muted-foreground">Something went wrong loading meets.</p>
          <Button onClick={loadMeets} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" /> Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Meets</h2>
        <Button size="sm" onClick={() => { setEditing(null); setFormOpen(true); }}><Plus className="h-4 w-4 mr-1" /> Create Meet</Button>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {(['all', 'live', 'upcoming', 'archived'] as const).map(k => (
          <Card key={k}><CardContent className="pt-4 pb-3">
            {loading ? <Skeleton className="h-8 w-12 mb-1" /> : <p className="text-2xl font-bold">{counts[k]}</p>}
            <p className="text-xs text-muted-foreground capitalize">{k === 'all' ? 'Total' : k} Meets</p>
          </CardContent></Card>
        ))}
      </div>
      <div className="flex gap-2 mb-6 flex-wrap">
        {filters.map(f => (
          <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1 rounded-full text-xs font-medium capitalize transition-colors ${filter === f ? 'bg-primary text-primary-foreground' : 'bg-secondary hover:bg-accent'}`}>{f}</button>
        ))}
      </div>
      <div className="space-y-3">
        {loading ? [1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full rounded-lg" />) : filtered.map(m => (
          <div key={m.id} className="flex items-center justify-between p-4 rounded-lg border bg-background hover:shadow-sm transition-shadow">
            <div className="flex items-center gap-4">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-semibold">{m.name}</p>
                <p className="text-sm text-muted-foreground">{format(new Date(m.start_date), 'MMM d, yyyy')} · {m.venue}, {m.location}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge className={statusColor(m.status)}>{m.status}</Badge>
              <Button variant="ghost" size="icon" onClick={() => { setEditing(m); setFormOpen(true); }}><Pencil className="h-4 w-4" /></Button>
              <Button variant="ghost" size="icon" onClick={() => setDeleteId(m.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              <Button variant="outline" size="sm" asChild><Link to={`/dashboard/meets/${m.id}`}>Manage</Link></Button>
              <Button variant="ghost" size="sm" asChild><a href={`/meets/${m.slug}`} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-3 w-3" /></a></Button>
            </div>
          </div>
        ))}
      </div>
      <MeetFormDialog open={formOpen} onOpenChange={setFormOpen} onSaved={loadMeets} initialData={editing} />
      <DeleteConfirmDialog open={!!deleteId} onOpenChange={o => !o && setDeleteId(null)} onConfirm={handleDelete} loading={deleting} title="Delete Meet?" description="This will permanently delete this meet. Associated events and entries may also be affected." />
    </div>
  );
}
