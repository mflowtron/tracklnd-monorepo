import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

export default function UsersTab() {
  const [profiles, setProfiles] = useState<any[]>([]);
  const [roles, setRoles] = useState<Record<string, string>>({});

  useEffect(() => {
    supabase.from('profiles').select('*').order('created_at', { ascending: false }).then(({ data }) => setProfiles(data || []));
    supabase.from('user_roles').select('*').then(({ data }) => {
      const map: Record<string, string> = {};
      data?.forEach(r => { map[r.user_id] = r.role; });
      setRoles(map);
    });
  }, []);

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
              <Badge variant={role === 'admin' ? 'default' : 'secondary'} className="text-xs">{role}</Badge>
            </div>
          );
        })}
      </div>
    </div>
  );
}
