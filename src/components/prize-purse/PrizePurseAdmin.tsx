import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { usePursePolling } from '@/hooks/usePursePolling';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { DollarSign, Pencil, Lock, Trophy } from 'lucide-react';
import AnimatedPurseAmount from './AnimatedPurseAmount';
import PurseConfigForm from './PurseConfigForm';
import EventAllocationsEditor from './EventAllocationsEditor';
import PlaceAllocationsEditor from './PlaceAllocationsEditor';
import SeedMoneyManager from './SeedMoneyManager';
import type { Tables } from '@/integrations/supabase/types';

interface PrizePurseAdminProps {
  meetId: string;
  events: { id: string; name: string; gender: string }[];
}

export default function PrizePurseAdmin({ meetId, events }: PrizePurseAdminProps) {
  const [config, setConfig] = useState<Tables<'prize_purse_configs'> | null>(null);
  const [loading, setLoading] = useState(true);
  const [configFormOpen, setConfigFormOpen] = useState(false);
  const [finalizeOpen, setFinalizeOpen] = useState(false);
  const [finalizing, setFinalizing] = useState(false);

  const [eventAllocations, setEventAllocations] = useState<(Tables<'event_purse_allocations'> & { events?: { name: string } })[]>([]);
  const [placeAllocations, setPlaceAllocations] = useState<Tables<'place_purse_allocations'>[]>([]);

  const { meetTotal, contributionCount, getEventTotal } = usePursePolling(config?.id ?? null);

  const loadConfig = useCallback(async () => {
    const { data } = await supabase
      .from('prize_purse_configs')
      .select('*')
      .eq('meet_id', meetId)
      .maybeSingle();
    setConfig(data);
    setLoading(false);
  }, [meetId]);

  const loadAllocations = useCallback(async () => {
    if (!config) return;

    const [eventResult, placeResult] = await Promise.all([
      supabase
        .from('event_purse_allocations')
        .select('*, events(name)')
        .eq('config_id', config.id)
        .order('created_at'),
      supabase
        .from('place_purse_allocations')
        .select('*')
        .in(
          'event_allocation_id',
          (await supabase.from('event_purse_allocations').select('id').eq('config_id', config.id))
            .data?.map(a => a.id) || ['__none__']
        )
        .order('place'),
    ]);

    setEventAllocations(eventResult.data || []);
    setPlaceAllocations(placeResult.data || []);
  }, [config]);

  useEffect(() => { loadConfig(); }, [loadConfig]);
  useEffect(() => { if (config) loadAllocations(); }, [config, loadAllocations]);

  const handleCreateConfig = async () => {
    const { error } = await supabase.from('prize_purse_configs').insert({
      meet_id: meetId,
      ppv_purse_mode: 'static',
    } as any);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success('Prize purse enabled');
    loadConfig();
  };

  const handleFinalize = async () => {
    if (!config) return;
    setFinalizing(true);

    const { data, error } = await supabase.functions.invoke('finalize-purse', {
      body: { config_id: config.id },
    });

    if (error || !data?.success) {
      toast.error(data?.error || error?.message || 'Failed to finalize');
      setFinalizing(false);
      return;
    }

    toast.success('Prize purse finalized');
    setFinalizing(false);
    setFinalizeOpen(false);
    loadConfig();
  };

  if (loading) {
    return <div className="text-sm text-muted-foreground">Loading prize purse...</div>;
  }

  if (!config) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <Trophy className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
          <p className="text-muted-foreground mb-4">No prize purse configured for this meet.</p>
          <Button onClick={handleCreateConfig}>
            <DollarSign className="h-4 w-4 mr-1" /> Enable Prize Purse
          </Button>
        </CardContent>
      </Card>
    );
  }

  const isFinalized = config.is_finalized;

  return (
    <div className="space-y-6">
      {/* Finalized warning */}
      {isFinalized && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-center gap-3">
          <Lock className="h-5 w-5 text-amber-600 shrink-0" />
          <p className="text-sm text-amber-800">This prize purse has been finalized and is read-only.</p>
        </div>
      )}

      {/* Live Preview */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Grand Total Prize Purse</p>
              <AnimatedPurseAmount value={meetTotal} className="text-3xl font-bold text-foreground" />
              <p className="text-xs text-muted-foreground mt-1">{contributionCount} contributions</p>
            </div>
            <div className="flex gap-2">
              {!isFinalized && (
                <>
                  <Button variant="outline" size="sm" onClick={() => setConfigFormOpen(true)}>
                    <Pencil className="h-3.5 w-3.5 mr-1" /> Edit Config
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setFinalizeOpen(true)}
                  >
                    <Lock className="h-3.5 w-3.5 mr-1" /> Finalize
                  </Button>
                </>
              )}
            </div>
          </div>
          {/* Mini event breakdown */}
          {eventAllocations.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-3 border-t">
              {eventAllocations.map(alloc => (
                <div key={alloc.id} className="text-center">
                  <p className="text-xs text-muted-foreground truncate">{(alloc as any).events?.name}</p>
                  <AnimatedPurseAmount
                    value={getEventTotal(alloc.id)}
                    className="text-sm font-semibold"
                  />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Config details */}
      <Card>
        <CardContent className="pt-6">
          <h4 className="text-sm font-semibold mb-3">Configuration</h4>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">PPV Price</p>
              <p className="font-medium">${config.ppv_ticket_price.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Purse Mode</p>
              <p className="font-medium capitalize">{config.ppv_purse_mode}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Purse Amount/Pct</p>
              <p className="font-medium">
                {config.ppv_purse_mode === 'static'
                  ? `$${(config.ppv_purse_static_amount ?? 0).toFixed(2)}`
                  : `${config.ppv_purse_percentage ?? 0}%`}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Places Paid</p>
              <p className="font-medium">{config.places_paid}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm mt-3">
            <div>
              <p className="text-muted-foreground">Status</p>
              <Badge variant={config.is_active ? 'default' : 'secondary'}>
                {isFinalized ? 'Finalized' : config.is_active ? 'Active' : 'Inactive'}
              </Badge>
            </div>
            <div>
              <p className="text-muted-foreground">Contribution Window</p>
              <p className="font-medium text-xs">
                {config.contributions_open_at
                  ? new Date(config.contributions_open_at).toLocaleString()
                  : 'Always open'}
                {' — '}
                {config.contributions_close_at
                  ? new Date(config.contributions_close_at).toLocaleString()
                  : 'No close date'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Event Allocations */}
      <Card>
        <CardContent className="pt-6">
          <h4 className="text-sm font-semibold mb-3">Event Allocations (% of Meet Pool)</h4>
          <EventAllocationsEditor
            configId={config.id}
            events={events}
            disabled={isFinalized}
            onChanged={loadAllocations}
          />
        </CardContent>
      </Card>

      {/* Place Allocations */}
      <Card>
        <CardContent className="pt-6">
          <h4 className="text-sm font-semibold mb-3">Place Allocations (% of Event Pool)</h4>
          <PlaceAllocationsEditor
            configId={config.id}
            placesPaid={config.places_paid}
            eventAllocations={eventAllocations}
            disabled={isFinalized}
            onChanged={loadAllocations}
          />
        </CardContent>
      </Card>

      {/* Seed Money */}
      <Card>
        <CardContent className="pt-6">
          <h4 className="text-sm font-semibold mb-3">Seed Money</h4>
          <SeedMoneyManager
            configId={config.id}
            eventAllocations={eventAllocations}
            placeAllocations={placeAllocations}
            disabled={isFinalized}
            onChanged={loadAllocations}
          />
        </CardContent>
      </Card>

      {/* Dialogs */}
      <PurseConfigForm
        open={configFormOpen}
        onOpenChange={setConfigFormOpen}
        onSaved={loadConfig}
        meetId={meetId}
        initialData={config}
      />

      <AlertDialog open={finalizeOpen} onOpenChange={setFinalizeOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Finalize Prize Purse?</AlertDialogTitle>
            <AlertDialogDescription>
              This is irreversible. All purse totals will be locked and no further contributions or refunds will be accepted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleFinalize} disabled={finalizing}>
              {finalizing ? 'Finalizing...' : 'Finalize'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
