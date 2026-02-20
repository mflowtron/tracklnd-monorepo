import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { fetchWithRetry } from '@/lib/supabase-fetch';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import DeleteConfirmDialog from '@/components/dashboard/DeleteConfirmDialog';

export default function UsersTab() {
  const [profiles, setProfiles] = useState<any[]>([]);
  const [roles, setRoles] = useState<Record<string, string>>({});
  const [confirmUserId, setConfirmUserId] = useState<string | null>(null);
  const [pendingRole, setPendingRole] = useState<string | null>(null);
  const [changing, setChanging] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(false);
    const [profilesResult, rolesResult] = await Promise.all([
      fetchWithRetry(() => supabase.from('profiles').select('*').order('created_at', { ascending: false })),
      fetchWithRetry(() => supabase.from('user_roles').select('*')),
    ]);
    if (profilesResult.error || rolesResult.error) {
      console.error('UsersTab: failed to load data',
        profilesResult.error?.message,
        rolesResult.error?.message
      );
      setError(true);
      setLoading(false);
      return;
    }
    setProfiles(profilesResult.data || []);
    const map: Record<string, string> = {};
    rolesResult.data?.forEach(role => { map[role.user_id] = role.role; });
    setRoles(map);
    setLoading(false);
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

  if (error && !loading) {
    return (
      <div>
        <h2 className="text-2xl font-bold mb-6">Users</h2>
        <div className="flex flex-col items-center justify-center min-h-[30vh] gap-4">
          <p className="text-muted-foreground">Something went wrong loading users.</p>
          <Button onClick={loadData} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" /> Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Users</h2>
      <div className="grid grid-cols-3 gap-4 mb-6">
        <Card><CardContent className="pt-4 pb-3">{loading ? <Skeleton className="h-8 w-12 mb-1" /> : <p className="text-2xl font-bold">{profiles.length}</p>}<p className="text-xs text-muted-foreground">Total Users</p></CardContent></Card>
        <Card><CardContent className="pt-4 pb-3">{loading ? <Skeleton className="h-8 w-12 mb-1" /> : <p className="text-2xl font-bold">{admins}</p>}<p className="text-xs text-muted-foreground">Admins</p></CardContent></Card>
        <Card><CardContent className="pt-4 pb-3">{loading ? <Skeleton className="h-8 w-12 mb-1" /> : <p className="text-2xl font-bold">{profiles.length - admins}</p>}<p className="text-xs text-muted-foreground">Viewers</p></CardContent></Card>
      </div>
      <div className="space-y-2">
        {loading ? [1, 2, 3].map(i => <Skeleton key={i} className="h-14 w-full rounded-lg" />) : profiles.map(p => {
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
