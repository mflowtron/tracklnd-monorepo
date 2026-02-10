import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import PrizePurseDisplay from '@/components/prize-purse/PrizePurseDisplay';
import { Loader2 } from 'lucide-react';

export default function PrizePursePage() {
  const { meetId } = useParams();
  const [configId, setConfigId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!meetId) return;
    (async () => {
      const { data, error: fetchError } = await supabase
        .from('prize_purse_configs')
        .select('id')
        .eq('meet_id', meetId)
        .maybeSingle();

      if (fetchError || !data) {
        setError('Prize purse not found for this meet.');
      } else {
        setConfigId(data.id);
      }
      setLoading(false);
    })();
  }, [meetId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[hsl(220,20%,5%)] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-amber-400" />
      </div>
    );
  }

  if (error || !configId || !meetId) {
    return (
      <div className="min-h-screen bg-[hsl(220,20%,5%)] flex items-center justify-center">
        <p className="text-white/60">{error || 'Prize purse not available.'}</p>
      </div>
    );
  }

  return <PrizePurseDisplay configId={configId} meetId={meetId} />;
}
