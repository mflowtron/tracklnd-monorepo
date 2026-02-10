import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Pencil, Trash2, Search } from 'lucide-react';
import { toast } from 'sonner';
import type { Tables } from '@/integrations/supabase/types';
import AthleteFormDialog from '@/components/dashboard/AthleteFormDialog';
import DeleteConfirmDialog from '@/components/dashboard/DeleteConfirmDialog';

export default function AthletesTab() {
  const [athletes, setAthletes] = useState<Tables<'athletes'>[]>([]);
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Tables<'athletes'> | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadAthletes = useCallback(async () => {
    const { data } = await supabase.from('athletes').select('*').order('full_name');
    setAthletes(data || []);
  }, []);

  useEffect(() => { loadAthletes(); }, [loadAthletes]);

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    const { error } = await supabase.from('athletes').delete().eq('id', deleteId);
    setDeleting(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Athlete deleted');
    setDeleteId(null);
    loadAthletes();
  };

  const filtered = search
    ? athletes.filter(a =>
        a.full_name.toLowerCase().includes(search.toLowerCase()) ||
        (a.team?.toLowerCase().includes(search.toLowerCase()))
      )
    : athletes;

  const teams = new Set(athletes.map(a => a.team).filter(Boolean));

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Athletes</h2>
        <Button size="sm" onClick={() => { setEditing(null); setFormOpen(true); }}>
          <Plus className="h-4 w-4 mr-1" /> Add Athlete
        </Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-2xl font-bold">{athletes.length}</p>
            <p className="text-xs text-muted-foreground">Total Athletes</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-2xl font-bold">{teams.size}</p>
            <p className="text-xs text-muted-foreground">Teams / Clubs</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-2xl font-bold">
              {new Set(athletes.map(a => a.country_code)).size}
            </p>
            <p className="text-xs text-muted-foreground">Countries</p>
          </CardContent>
        </Card>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search athletes or teams…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="space-y-2">
        {filtered.map(a => (
          <div key={a.id} className="flex items-center gap-4 p-3 rounded-lg border bg-background hover:shadow-sm transition-shadow">
            <span className="text-xl flex-shrink-0">{a.country_flag}</span>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm">{a.full_name}</p>
              {a.team && <p className="text-xs text-muted-foreground">{a.team}</p>}
            </div>
            <span className="text-xs text-muted-foreground font-mono">{a.country_code}</span>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditing(a); setFormOpen(true); }}>
                <Pencil className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDeleteId(a.id)}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="text-center text-muted-foreground py-8 text-sm">
            {search ? 'No athletes match your search.' : 'No athletes yet.'}
          </p>
        )}
      </div>

      <AthleteFormDialog open={formOpen} onOpenChange={setFormOpen} onSaved={loadAthletes} initialData={editing} />
      <DeleteConfirmDialog
        open={!!deleteId}
        onOpenChange={o => !o && setDeleteId(null)}
        onConfirm={handleDelete}
        loading={deleting}
        title="Delete Athlete?"
        description="This will permanently delete this athlete and remove them from all event entries."
      />
    </div>
  );
}
