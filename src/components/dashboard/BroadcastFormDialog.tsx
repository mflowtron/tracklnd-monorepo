import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, Play, Search } from 'lucide-react';

interface MuxAsset {
  id: string;
  status: string;
  duration: number;
  playback_ids: { id: string; policy: string }[];
  thumbnail_url: string | null;
}

interface BroadcastFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
  meetId: string;
  initialData?: any;
}

export default function BroadcastFormDialog({ open, onOpenChange, onSaved, meetId, initialData }: BroadcastFormDialogProps) {
  const [title, setTitle] = useState('');
  const [playbackId, setPlaybackId] = useState('');
  const [assetId, setAssetId] = useState('');
  const [isActive, setIsActive] = useState(false);
  const [saving, setSaving] = useState(false);

  // Mux asset browser
  const [muxAssets, setMuxAssets] = useState<MuxAsset[]>([]);
  const [loadingAssets, setLoadingAssets] = useState(false);
  const [showBrowser, setShowBrowser] = useState(false);

  useEffect(() => {
    if (open && initialData) {
      setTitle(initialData.title || '');
      setPlaybackId(initialData.mux_playback_id || '');
      setAssetId(initialData.mux_asset_id || '');
      setIsActive(initialData.is_active || false);
    } else if (open) {
      setTitle('');
      setPlaybackId('');
      setAssetId('');
      setIsActive(false);
    }
    setShowBrowser(false);
  }, [open, initialData]);

  const fetchMuxAssets = async () => {
    setLoadingAssets(true);
    setShowBrowser(true);
    try {
      const { data, error } = await supabase.functions.invoke('mux-assets');
      if (error) throw error;
      setMuxAssets(data?.data || []);
    } catch (err: any) {
      toast.error('Failed to load Mux assets: ' + (err.message || 'Unknown error'));
    } finally {
      setLoadingAssets(false);
    }
  };

  const selectAsset = (asset: MuxAsset) => {
    const publicPlayback = asset.playback_ids.find(p => p.policy === 'public') || asset.playback_ids[0];
    if (!publicPlayback) { toast.error('No playback ID found for this asset'); return; }
    setPlaybackId(publicPlayback.id);
    setAssetId(asset.id);
    if (!title) setTitle(`Broadcast – ${Math.round(asset.duration || 0)}s`);
    setShowBrowser(false);
  };

  const handleSave = async () => {
    if (!playbackId.trim()) { toast.error('Playback ID is required'); return; }
    if (!title.trim()) { toast.error('Title is required'); return; }
    setSaving(true);

    const payload = {
      meet_id: meetId,
      title: title.trim(),
      mux_playback_id: playbackId.trim(),
      mux_asset_id: assetId.trim() || null,
      is_active: isActive,
    };

    let error;
    if (initialData?.id) {
      ({ error } = await supabase.from('broadcasts' as any).update(payload).eq('id', initialData.id));
    } else {
      ({ error } = await supabase.from('broadcasts' as any).insert(payload));
    }

    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success(initialData ? 'Broadcast updated' : 'Broadcast added');
    onOpenChange(false);
    onSaved();
  };

  const formatDuration = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.round(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initialData ? 'Edit Broadcast' : 'Add Broadcast'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Title</Label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Day 1 Live Stream" />
          </div>

          <div>
            <Label>Mux Playback ID</Label>
            <div className="flex gap-2">
              <Input value={playbackId} onChange={e => setPlaybackId(e.target.value)} placeholder="e.g. DS00Spx1CV902MCtPj..." className="flex-1" />
              <Button type="button" variant="outline" onClick={fetchMuxAssets}>
                <Search className="h-4 w-4 mr-1" /> Browse
              </Button>
            </div>
          </div>

          {/* Mux Asset Browser */}
          {showBrowser && (
            <div className="border rounded-lg p-3 bg-muted/30 space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Select a Mux asset:</p>
              {loadingAssets ? (
                <div className="flex items-center justify-center py-8"><Loader2 className="h-5 w-5 animate-spin" /></div>
              ) : muxAssets.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">No assets found in your Mux account.</p>
              ) : (
                <div className="grid grid-cols-2 gap-2 max-h-[300px] overflow-y-auto">
                  {muxAssets.map(asset => (
                    <button
                      key={asset.id}
                      type="button"
                      onClick={() => selectAsset(asset)}
                      className="relative group rounded-md overflow-hidden border hover:ring-2 hover:ring-primary transition-all text-left"
                    >
                      {asset.thumbnail_url ? (
                        <img src={asset.thumbnail_url} alt="" className="w-full aspect-video object-cover" />
                      ) : (
                        <div className="w-full aspect-video bg-muted flex items-center justify-center">
                          <Play className="h-8 w-8 text-muted-foreground" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                        <Play className="h-8 w-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <div className="p-2">
                        <p className="text-xs font-mono truncate text-muted-foreground">{asset.id.slice(0, 16)}…</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{asset.status}</span>
                          {asset.duration && <span>{formatDuration(asset.duration)}</span>}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="flex items-center gap-3">
            <Switch checked={isActive} onCheckedChange={setIsActive} />
            <Label>Active (visible on public page)</Label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
            {initialData ? 'Save Changes' : 'Add Broadcast'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
