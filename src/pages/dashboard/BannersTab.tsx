import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import type { Tables } from '@/integrations/supabase/types';
import BannerFormDialog from '@/components/dashboard/BannerFormDialog';
import DeleteConfirmDialog from '@/components/dashboard/DeleteConfirmDialog';

export default function BannersTab() {
  const [banners, setBanners] = useState<Tables<'banners'>[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Tables<'banners'> | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadBanners = useCallback(async () => {
    const { data } = await supabase.from('banners').select('*').order('created_at', { ascending: false });
    setBanners(data || []);
  }, []);

  useEffect(() => { loadBanners(); }, [loadBanners]);

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    const { error } = await supabase.from('banners').delete().eq('id', deleteId);
    setDeleting(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Banner deleted');
    setDeleteId(null);
    loadBanners();
  };

  const toggleActive = async (b: Tables<'banners'>) => {
    const { error } = await supabase.from('banners').update({ is_active: !b.is_active }).eq('id', b.id);
    if (error) { toast.error(error.message); return; }
    toast.success(b.is_active ? 'Banner deactivated' : 'Banner activated');
    loadBanners();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Banners</h2>
        <Button size="sm" onClick={() => { setEditing(null); setFormOpen(true); }}><Plus className="h-4 w-4 mr-1" /> Create Banner</Button>
      </div>
      <div className="space-y-3">
        {banners.map(b => (
          <div key={b.id} className={`flex items-center gap-4 p-4 rounded-lg border bg-background ${b.is_active ? 'ring-2 ring-primary' : ''}`}>
            {b.image_url && <img src={b.image_url} alt="" className="w-20 h-14 rounded object-cover flex-shrink-0" />}
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm">{b.title}</p>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className="text-[10px] capitalize">{b.placement}</Badge>
                <button onClick={() => toggleActive(b)} className="cursor-pointer">
                  <Badge className={`text-[10px] ${b.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-muted text-muted-foreground'}`}>
                    {b.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </button>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" onClick={() => { setEditing(b); setFormOpen(true); }}><Pencil className="h-4 w-4" /></Button>
              <Button variant="ghost" size="icon" onClick={() => setDeleteId(b.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
            </div>
          </div>
        ))}
      </div>
      <BannerFormDialog open={formOpen} onOpenChange={setFormOpen} onSaved={loadBanners} initialData={editing} />
      <DeleteConfirmDialog open={!!deleteId} onOpenChange={o => !o && setDeleteId(null)} onConfirm={handleDelete} loading={deleting} title="Delete Banner?" description="This will permanently delete this banner." />
    </div>
  );
}
