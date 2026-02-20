import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Trash2 } from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';

interface SeedMoneyManagerProps {
  configId: string;
  eventAllocations: (Tables<'event_purse_allocations'> & { events?: { name: string } })[];
  placeAllocations: Tables<'place_purse_allocations'>[];
  disabled?: boolean;
  onChanged?: () => void;
}

type SeedLevel = 'meet' | 'event' | 'place';

const placeLabel = (n: number) => {
  if (n === 1) return '1st';
  if (n === 2) return '2nd';
  if (n === 3) return '3rd';
  return `${n}th`;
};

export default function SeedMoneyManager({ configId, eventAllocations, placeAllocations, disabled, onChanged }: SeedMoneyManagerProps) {
  const [seeds, setSeeds] = useState<Tables<'purse_seed_money'>[]>([]);

  // Form state
  const [level, setLevel] = useState<SeedLevel>('meet');
  const [selectedEventAllocId, setSelectedEventAllocId] = useState<string>('');
  const [selectedPlaceAllocId, setSelectedPlaceAllocId] = useState<string>('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const loadSeeds = useCallback(async () => {
    const { data } = await supabase
      .from('purse_seed_money')
      .select('*')
      .eq('config_id', configId)
      .order('created_at');
    setSeeds(data || []);
  }, [configId]);

  useEffect(() => { loadSeeds(); }, [loadSeeds]);

  const placesForEvent = selectedEventAllocId
    ? placeAllocations.filter(p => p.event_allocation_id === selectedEventAllocId)
    : [];

  const getSeedLabel = (seed: Tables<'purse_seed_money'>) => {
    if (seed.place_allocation_id) {
      const place = placeAllocations.find(p => p.id === seed.place_allocation_id);
      const eventAlloc = eventAllocations.find(a => a.id === seed.event_allocation_id);
      return `${(eventAlloc as any)?.events?.name || 'Event'} — ${placeLabel(place?.place ?? 0)} Place`;
    }
    if (seed.event_allocation_id) {
      const eventAlloc = eventAllocations.find(a => a.id === seed.event_allocation_id);
      return (eventAlloc as any)?.events?.name || 'Event';
    }
    return 'Meet';
  };

  const getSeedLevel = (seed: Tables<'purse_seed_money'>): string => {
    if (seed.place_allocation_id) return 'Place';
    if (seed.event_allocation_id) return 'Event';
    return 'Meet';
  };

  const handleAdd = async () => {
    const parsedAmount = parseFloat(amount);
    if (!parsedAmount || parsedAmount <= 0) {
      toast.error('Enter a valid amount');
      return;
    }

    setSaving(true);
    const payload: any = {
      config_id: configId,
      amount: parsedAmount,
      note: note || null,
      event_allocation_id: null,
      place_allocation_id: null,
    };

    if (level === 'event' || level === 'place') {
      if (!selectedEventAllocId) {
        toast.error('Select an event');
        setSaving(false);
        return;
      }
      payload.event_allocation_id = selectedEventAllocId;
    }

    if (level === 'place') {
      if (!selectedPlaceAllocId) {
        toast.error('Select a place');
        setSaving(false);
        return;
      }
      payload.place_allocation_id = selectedPlaceAllocId;
    }

    const { error } = await supabase.from('purse_seed_money').insert(payload);
    if (error) {
      toast.error(error.message);
      setSaving(false);
      return;
    }

    toast.success('Seed money added');
    setAmount('');
    setNote('');
    setSaving(false);
    loadSeeds();
    onChanged?.();
  };

  const handleDelete = async (seedId: string) => {
    const { error } = await supabase.from('purse_seed_money').delete().eq('id', seedId);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success('Seed money removed');
    loadSeeds();
    onChanged?.();
  };

  return (
    <div className="space-y-4">
      {/* Existing seeds table */}
      {seeds.length > 0 && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Level</TableHead>
              <TableHead>Target</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead>Note</TableHead>
              {!disabled && <TableHead className="w-10" />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {seeds.map(seed => (
              <TableRow key={seed.id}>
                <TableCell>{getSeedLevel(seed)}</TableCell>
                <TableCell>{getSeedLabel(seed)}</TableCell>
                <TableCell className="text-right font-mono">${seed.amount.toFixed(2)}</TableCell>
                <TableCell className="text-muted-foreground text-sm">{seed.note || '—'}</TableCell>
                {!disabled && (
                  <TableCell>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDelete(seed.id)}>
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {seeds.length === 0 && (
        <p className="text-sm text-muted-foreground">No seed money added yet.</p>
      )}

      {/* Add form */}
      {!disabled && (
        <div className="border rounded-lg p-4 space-y-3">
          <p className="text-sm font-medium">Add Seed Money</p>

          <div className="flex gap-2">
            {(['meet', 'event', 'place'] as SeedLevel[]).map(l => (
              <Button
                key={l}
                type="button"
                variant={level === l ? 'default' : 'outline'}
                size="sm"
                onClick={() => { setLevel(l); setSelectedEventAllocId(''); setSelectedPlaceAllocId(''); }}
              >
                {l.charAt(0).toUpperCase() + l.slice(1)}
              </Button>
            ))}
          </div>

          {(level === 'event' || level === 'place') && (
            <Select value={selectedEventAllocId} onValueChange={v => { setSelectedEventAllocId(v); setSelectedPlaceAllocId(''); }}>
              <SelectTrigger><SelectValue placeholder="Select event" /></SelectTrigger>
              <SelectContent>
                {eventAllocations.map(a => (
                  <SelectItem key={a.id} value={a.id}>
                    {(a as any).events?.name || a.event_id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {level === 'place' && selectedEventAllocId && (
            <Select value={selectedPlaceAllocId} onValueChange={setSelectedPlaceAllocId}>
              <SelectTrigger><SelectValue placeholder="Select place" /></SelectTrigger>
              <SelectContent>
                {placesForEvent.map(p => (
                  <SelectItem key={p.id} value={p.id}>{placeLabel(p.place)} Place</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Input
              type="number"
              step="0.01"
              min="0"
              placeholder="Amount"
              value={amount}
              onChange={e => setAmount(e.target.value)}
            />
            <Input
              placeholder="Note (optional)"
              value={note}
              onChange={e => setNote(e.target.value)}
            />
          </div>

          <Button onClick={handleAdd} disabled={saving} size="sm">
            {saving ? 'Adding...' : 'Add Seed Money'}
          </Button>
        </div>
      )}
    </div>
  );
}
