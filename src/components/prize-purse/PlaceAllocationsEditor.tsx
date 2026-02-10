import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import type { Tables } from '@/integrations/supabase/types';

interface PlaceAllocationsEditorProps {
  configId: string;
  placesPaid: number;
  eventAllocations: (Tables<'event_purse_allocations'> & { events?: { name: string } })[];
  disabled?: boolean;
  onChanged?: () => void;
}

interface PlaceRow {
  id?: string;
  place: number;
  event_pct: number;
}

const placeLabel = (n: number) => {
  if (n === 1) return '1st Place';
  if (n === 2) return '2nd Place';
  if (n === 3) return '3rd Place';
  return `${n}th Place`;
};

export default function PlaceAllocationsEditor({ configId, placesPaid, eventAllocations, disabled, onChanged }: PlaceAllocationsEditorProps) {
  const [placesByAlloc, setPlacesByAlloc] = useState<Record<string, PlaceRow[]>>({});
  const [saving, setSaving] = useState<string | null>(null);

  const loadPlaces = useCallback(async () => {
    const allocIds = eventAllocations.map(a => a.id);
    if (allocIds.length === 0) return;

    const { data } = await supabase
      .from('place_purse_allocations')
      .select('*')
      .in('event_allocation_id', allocIds)
      .order('place');

    const result: Record<string, PlaceRow[]> = {};
    for (const alloc of eventAllocations) {
      const existing = (data || []).filter(p => p.event_allocation_id === alloc.id);
      const rows: PlaceRow[] = [];
      for (let p = 1; p <= placesPaid; p++) {
        const found = existing.find(e => e.place === p);
        rows.push({ id: found?.id, place: p, event_pct: found?.event_pct ?? 0 });
      }
      result[alloc.id] = rows;
    }
    setPlacesByAlloc(result);
  }, [eventAllocations, placesPaid]);

  useEffect(() => { loadPlaces(); }, [loadPlaces]);

  const updatePct = (allocId: string, placeIdx: number, val: number) => {
    setPlacesByAlloc(prev => ({
      ...prev,
      [allocId]: prev[allocId].map((r, i) => i === placeIdx ? { ...r, event_pct: val } : r),
    }));
  };

  const getTotal = (allocId: string) =>
    (placesByAlloc[allocId] || []).reduce((sum, r) => sum + r.event_pct, 0);

  const handleSave = async (allocId: string) => {
    const total = getTotal(allocId);
    if (Math.abs(total - 100) >= 0.01) {
      toast.error('Percentages must equal exactly 100%');
      return;
    }

    setSaving(allocId);
    const rows = placesByAlloc[allocId] || [];

    for (const row of rows) {
      if (row.id) {
        const { error } = await supabase
          .from('place_purse_allocations')
          .update({ event_pct: row.event_pct })
          .eq('id', row.id);
        if (error) { toast.error(error.message); setSaving(null); return; }
      } else {
        const { error } = await supabase
          .from('place_purse_allocations')
          .insert({
            event_allocation_id: allocId,
            place: row.place,
            event_pct: row.event_pct,
          });
        if (error) { toast.error(error.message); setSaving(null); return; }
      }
    }

    toast.success('Place allocations saved');
    setSaving(null);
    loadPlaces();
    onChanged?.();
  };

  if (eventAllocations.length === 0) {
    return <p className="text-sm text-muted-foreground">Save event allocations first.</p>;
  }

  return (
    <Accordion type="multiple" className="space-y-2">
      {eventAllocations.map(alloc => {
        const rows = placesByAlloc[alloc.id] || [];
        const total = getTotal(alloc.id);
        const isValid = Math.abs(total - 100) < 0.01;
        const eventName = (alloc as any).events?.name || alloc.event_id;

        return (
          <AccordionItem key={alloc.id} value={alloc.id} className="border rounded-lg px-4">
            <AccordionTrigger className="hover:no-underline">
              <span className="font-medium">{eventName}</span>
            </AccordionTrigger>
            <AccordionContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Place</TableHead>
                    <TableHead className="w-32 text-right">% of Event Pool</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row, idx) => (
                    <TableRow key={row.place}>
                      <TableCell>{placeLabel(row.place)}</TableCell>
                      <TableCell className="text-right">
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          max="100"
                          value={row.event_pct}
                          onChange={e => updatePct(alloc.id, idx, Number(e.target.value))}
                          disabled={disabled}
                          className="w-24 ml-auto text-right"
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                <TableFooter>
                  <TableRow>
                    <TableCell className="font-semibold">Total</TableCell>
                    <TableCell className={`text-right font-semibold ${isValid ? '' : 'text-destructive'}`}>
                      {total.toFixed(2)}%
                    </TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
              {!disabled && (
                <div className="flex justify-end mt-3">
                  <Button
                    onClick={() => handleSave(alloc.id)}
                    disabled={saving === alloc.id || !isValid}
                    size="sm"
                  >
                    {saving === alloc.id ? 'Saving...' : 'Save'}
                  </Button>
                </div>
              )}
            </AccordionContent>
          </AccordionItem>
        );
      })}
    </Accordion>
  );
}
