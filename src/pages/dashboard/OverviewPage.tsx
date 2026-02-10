import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { Calendar, FileText, Radio, TrendingUp } from 'lucide-react';

export default function OverviewPage() {
  const { profile } = useAuth();
  const [stats, setStats] = useState({ live: 0, upcoming: 0, events: 0, works: 0 });
  const [upcomingEvents, setUpcomingEvents] = useState<any[]>([]);
  const [recentWorks, setRecentWorks] = useState<any[]>([]);

  useEffect(() => {
    supabase.from('meets').select('status').then(({ data }) => {
      setStats(s => ({ ...s, live: data?.filter(m => m.status === 'live').length || 0, upcoming: data?.filter(m => m.status === 'upcoming').length || 0 }));
    });
    supabase.from('events').select('*, meets(name)').order('scheduled_time', { ascending: true }).limit(5).then(({ data }) => { setUpcomingEvents(data || []); setStats(s => ({ ...s, events: data?.length || 0 })); });
    supabase.from('works').select('*').eq('status', 'published').order('published_at', { ascending: false }).limit(5).then(({ data }) => { setRecentWorks(data || []); setStats(s => ({ ...s, works: data?.length || 0 })); });
  }, []);

  const statCards = [
    { label: 'Live Meets', value: stats.live, icon: Radio, live: true },
    { label: 'Upcoming Meets', value: stats.upcoming, icon: Calendar },
    { label: 'Total Events', value: stats.events, icon: TrendingUp },
    { label: 'Published Works', value: stats.works, icon: FileText },
  ];

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Welcome back, {profile?.display_name || 'there'}!</h2>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map(s => (
          <Card key={s.label}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-2">
                <s.icon className="h-5 w-5 text-muted-foreground" />
                {s.live && s.value > 0 && (
                  <span className="relative flex h-2.5 w-2.5"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" /><span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" /></span>
                )}
              </div>
              <p className="text-3xl font-bold">{s.value}</p>
              <p className="text-sm text-muted-foreground">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-lg">Upcoming Schedule</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {upcomingEvents.map(e => (
              <div key={e.id} className="flex items-center justify-between py-2 border-b last:border-0">
                <div><p className="font-medium text-sm">{e.name}</p><p className="text-xs text-muted-foreground">{(e.meets as any)?.name}</p></div>
                <span className="text-xs text-muted-foreground">{e.scheduled_time && format(new Date(e.scheduled_time), 'MMM d, h:mm a')}</span>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-lg">Recent Works</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {recentWorks.map(w => (
              <Link key={w.id} to={`/works/${w.slug}`} className="flex items-center justify-between py-2 border-b last:border-0 hover:bg-accent/50 -mx-2 px-2 rounded">
                <div className="flex items-center gap-2"><Badge variant="outline" className="text-[10px] capitalize">{w.work_type}</Badge><span className="font-medium text-sm">{w.title}</span></div>
                <span className="text-xs text-muted-foreground">{w.published_at && format(new Date(w.published_at), 'MMM d')}</span>
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
