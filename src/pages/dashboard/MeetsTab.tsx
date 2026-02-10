import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { Calendar, Plus, Pencil, Trash2 } from 'lucide-react';
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

  const loadMeets = useCallback(async () => {
    const { data } = await supabase.from('meets').select('*').order('start_date', { ascending: false });
    setMeets(data || []);
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

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Meets</h2>
        <Button size="sm" onClick={() => { setEditing(null); setFormOpen(true); }}><Plus className="h-4 w-4 mr-1" /> Create Meet</Button>
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
            <div className="flex items-center gap-2">
              <Badge className={statusColor(m.status)}>{m.status}</Badge>
              <Button variant="ghost" size="icon" onClick={() => { setEditing(m); setFormOpen(true); }}><Pencil className="h-4 w-4" /></Button>
              <Button variant="ghost" size="icon" onClick={() => setDeleteId(m.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              <Button variant="outline" size="sm" asChild><Link to={`/meets/${m.slug}`}>View</Link></Button>
            </div>
          </div>
        ))}
      </div>
      <MeetFormDialog open={formOpen} onOpenChange={setFormOpen} onSaved={loadMeets} initialData={editing} />
      <DeleteConfirmDialog open={!!deleteId} onOpenChange={o => !o && setDeleteId(null)} onConfirm={handleDelete} loading={deleting} title="Delete Meet?" description="This will permanently delete this meet. Associated events and entries may also be affected." />
    </div>
  );
}
