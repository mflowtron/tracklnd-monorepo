import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { fetchWithRetry } from '@/lib/supabase-fetch';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { Plus, Pencil, Trash2, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import type { Tables } from '@/integrations/supabase/types';
import WorkFormDialog from '@/components/dashboard/WorkFormDialog';
import DeleteConfirmDialog from '@/components/dashboard/DeleteConfirmDialog';

export default function ContentTab() {
  const [works, setWorks] = useState<Tables<'works'>[]>([]);
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Tables<'works'> | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const loadWorks = useCallback(async () => {
    setLoading(true);
    setError(false);
    const { data, error: err } = await fetchWithRetry(
      () => supabase.from('works').select('*').order('published_at', { ascending: false })
    );
    if (err) {
      console.error('ContentTab: failed to load works:', err.message);
      setError(true);
    } else {
      setWorks(data || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadWorks(); }, [loadWorks]);

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    const { error } = await supabase.from('works').delete().eq('id', deleteId);
    setDeleting(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Work deleted');
    setDeleteId(null);
    loadWorks();
  };

  const filtered = works.filter(w => (typeFilter === 'all' || w.work_type === typeFilter) && (statusFilter === 'all' || w.status === statusFilter));
  const counts = { all: works.length, short: works.filter(w => w.work_type === 'short').length, work: works.filter(w => w.work_type === 'work').length, feature: works.filter(w => w.work_type === 'feature').length, published: works.filter(w => w.status === 'published').length, draft: works.filter(w => w.status === 'draft').length };

  if (error && !loading) {
    return (
      <div>
        <h2 className="text-2xl font-bold mb-6">Content</h2>
        <div className="flex flex-col items-center justify-center min-h-[30vh] gap-4">
          <p className="text-muted-foreground">Something went wrong loading content.</p>
          <Button onClick={loadWorks} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" /> Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Content</h2>
        <Button size="sm" onClick={() => { setEditing(null); setFormOpen(true); }}><Plus className="h-4 w-4 mr-1" /> Create Work</Button>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <Card><CardContent className="pt-4 pb-3">{loading ? <Skeleton className="h-8 w-12 mb-1" /> : <p className="text-2xl font-bold">{counts.all}</p>}<p className="text-xs text-muted-foreground">Total</p></CardContent></Card>
        <Card><CardContent className="pt-4 pb-3">{loading ? <Skeleton className="h-8 w-12 mb-1" /> : <p className="text-2xl font-bold">{counts.published}</p>}<p className="text-xs text-muted-foreground">Published</p></CardContent></Card>
        <Card><CardContent className="pt-4 pb-3">{loading ? <Skeleton className="h-8 w-12 mb-1" /> : <p className="text-2xl font-bold">{counts.draft}</p>}<p className="text-xs text-muted-foreground">Drafts</p></CardContent></Card>
        <Card><CardContent className="pt-4 pb-3">{loading ? <Skeleton className="h-8 w-12 mb-1" /> : <p className="text-2xl font-bold">{counts.short}/{counts.work}/{counts.feature}</p>}<p className="text-xs text-muted-foreground">S / W / F</p></CardContent></Card>
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
        {loading ? [1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full rounded-lg" />) : filtered.map(w => (
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
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" onClick={() => { setEditing(w); setFormOpen(true); }}><Pencil className="h-4 w-4" /></Button>
              <Button variant="ghost" size="icon" onClick={() => setDeleteId(w.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              <Button variant="outline" size="sm" asChild><Link to={`/works/${w.slug}`}>View</Link></Button>
            </div>
          </div>
        ))}
      </div>
      <WorkFormDialog open={formOpen} onOpenChange={setFormOpen} onSaved={loadWorks} initialData={editing} />
      <DeleteConfirmDialog open={!!deleteId} onOpenChange={o => !o && setDeleteId(null)} onConfirm={handleDelete} loading={deleting} title="Delete Work?" description="This will permanently delete this content." />
    </div>
  );
}
