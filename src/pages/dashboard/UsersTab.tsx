import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import DeleteConfirmDialog from '@/components/dashboard/DeleteConfirmDialog';

export default function UsersTab() {
  const [profiles, setProfiles] = useState<any[]>([]);
  const [roles, setRoles] = useState<Record<string, string>>({});
  const [confirmUserId, setConfirmUserId] = useState<string | null>(null);
  const [pendingRole, setPendingRole] = useState<string | null>(null);
  const [changing, setChanging] = useState(false);

  const loadData = useCallback(async () => {
    const [{ data: p }, { data: r }] = await Promise.all([
      supabase.from('profiles').select('*').order('created_at', { ascending: false }),
      supabase.from('user_roles').select('*'),
    ]);
    setProfiles(p || []);
    const map: Record<string, string> = {};
    r?.forEach(role => { map[role.user_id] = role.role; });
    setRoles(map);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const initiateRoleChange = (userId: string, newRole: string) => {
    if (roles[userId] === newRole) return;
    setConfirmUserId(userId);
    setPendingRole(newRole);
  };

  const confirmRoleChange = async () => {
    if (!confirmUserId || !pendingRole) return;
    setChanging(true);
    const { error } = await supabase.from('user_roles').update({ role: pendingRole as any }).eq('user_id', confirmUserId);
    setChanging(false);
    if (error) { toast.error(error.message); return; }
    toast.success(`Role changed to ${pendingRole}`);
    setConfirmUserId(null);
    setPendingRole(null);
    loadData();
  };

  const admins = profiles.filter(p => roles[p.user_id] === 'admin').length;

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Users</h2>
      <div className="grid grid-cols-3 gap-4 mb-6">
        <Card><CardContent className="pt-4 pb-3"><p className="text-2xl font-bold">{profiles.length}</p><p className="text-xs text-muted-foreground">Total Users</p></CardContent></Card>
        <Card><CardContent className="pt-4 pb-3"><p className="text-2xl font-bold">{admins}</p><p className="text-xs text-muted-foreground">Admins</p></CardContent></Card>
        <Card><CardContent className="pt-4 pb-3"><p className="text-2xl font-bold">{profiles.length - admins}</p><p className="text-xs text-muted-foreground">Viewers</p></CardContent></Card>
      </div>
      <div className="space-y-2">
        {profiles.map(p => {
          const role = roles[p.user_id] || 'viewer';
          const initials = p.display_name ? p.display_name.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2) : '?';
          return (
            <div key={p.id} className="flex items-center gap-4 p-3 rounded-lg border bg-background">
              <Avatar className="h-9 w-9"><AvatarFallback className="text-xs bg-primary text-primary-foreground">{initials}</AvatarFallback></Avatar>
              <div className="flex-1"><p className="font-medium text-sm">{p.display_name || 'Unnamed'}</p></div>
              <Select value={role} onValueChange={v => initiateRoleChange(p.user_id, v)}>
                <SelectTrigger className="w-28 h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">admin</SelectItem>
                  <SelectItem value="viewer">viewer</SelectItem>
                </SelectContent>
              </Select>
            </div>
          );
        })}
      </div>
      <DeleteConfirmDialog
        open={!!confirmUserId}
        onOpenChange={o => { if (!o) { setConfirmUserId(null); setPendingRole(null); } }}
        onConfirm={confirmRoleChange}
        loading={changing}
        title="Change User Role?"
        description={`Are you sure you want to change this user's role to "${pendingRole}"?`}
      />
    </div>
  );
}
