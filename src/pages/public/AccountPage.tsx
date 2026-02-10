import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

export default function AccountPage() {
  const { user, profile, isAdmin, logout } = useAuth();
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState(profile?.display_name || '');
  const [saving, setSaving] = useState(false);

  const initials = displayName
    ? displayName.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    : '?';

  const handleSave = async () => {
    if (!profile) return;
    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({ display_name: displayName })
      .eq('id', profile.id);
    setSaving(false);
    if (error) toast.error('Failed to update profile');
    else toast.success('Profile updated!');
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12">
      <h1 className="font-display text-3xl mb-8">Account</h1>

      <Card>
        <CardHeader className="flex flex-row items-center gap-4 pb-4">
          <Avatar className="h-16 w-16">
            <AvatarFallback className="text-lg bg-primary text-primary-foreground">{initials}</AvatarFallback>
          </Avatar>
          <div>
            <h2 className="text-xl font-semibold">{profile?.display_name || 'User'}</h2>
            <p className="text-sm text-muted-foreground">{user?.email}</p>
            <Badge variant="outline" className="mt-1">{isAdmin ? 'Admin' : 'Viewer'}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="displayName">Display Name</Label>
            <Input id="displayName" value={displayName} onChange={e => setDisplayName(e.target.value)} />
          </div>
          <div className="flex gap-3">
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Save Changes
            </Button>
            <Button variant="destructive" onClick={handleLogout}>Sign Out</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
