import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

export default function BannersTab() {
  const [banners, setBanners] = useState<any[]>([]);

  useEffect(() => {
    supabase.from('banners').select('*').order('created_at', { ascending: false }).then(({ data }) => setBanners(data || []));
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Banners</h2>
        <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Create Banner</Button>
      </div>
      <div className="space-y-3">
        {banners.map(b => (
          <div key={b.id} className={`flex items-center gap-4 p-4 rounded-lg border bg-background ${b.is_active ? 'ring-2 ring-primary' : ''}`}>
            {b.image_url && <img src={b.image_url} alt="" className="w-20 h-14 rounded object-cover flex-shrink-0" />}
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm">{b.title}</p>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className="text-[10px] capitalize">{b.placement}</Badge>
                {b.is_active && <Badge className="text-[10px] bg-emerald-100 text-emerald-700">Active</Badge>}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
