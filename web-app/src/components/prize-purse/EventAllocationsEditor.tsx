import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { Tables } from '@/integrations/supabase/types';

interface EventAllocationsEditorProps {
  configId: string;
  events: { id: string; name: string; gender: string }[];
  disabled?: boolean;
  onChanged?: () => void;
}

interface AllocationRow {
  id?: string;
  event_id: string;
  event_name: string;
  meet_pct: number;
}

export default function EventAllocationsEditor({ configId, events, disabled, onChanged }: EventAllocationsEditorProps) {
  const [rows, setRows] = useState<AllocationRow[]>([]);
  const [saving, setSaving] = useState(false);

  const loadAllocations = useCallback(async () => {
    const { data } = await supabase
      .from('event_purse_allocations')
      .select('*')
      .eq('config_id', configId);

    const existingMap = new Map((data || []).map(a => [a.event_id, a]));

    const allRows: AllocationRow[] = events.map(evt => {
      const existing = existingMap.get(evt.id);
      return {
        id: existing?.id,
        event_id: evt.id,
        event_name: evt.name,
        meet_pct: existing?.meet_pct ?? 0,
      };
    });

    setRows(allRows);
  }, [configId, events]);

  useEffect(() => { loadAllocations(); }, [loadAllocations]);

  const total = rows.reduce((sum, r) => sum + r.meet_pct, 0);
  const isValid = Math.abs(total - 100) < 0.01;

  const updatePct = (idx: number, val: number) => {
    setRows(prev => prev.map((r, i) => i === idx ? { ...r, meet_pct: val } : r));
  };

  const handleSave = async () => {
    if (!isValid) {
      toast.error('Percentages must equal exactly 100%');
      return;
    }
    setSaving(true);

    for (const row of rows) {
      if (row.id) {
        const { error } = await supabase
          .from('event_purse_allocations')
          .update({ meet_pct: row.meet_pct })
          .eq('id', row.id);
        if (error) { toast.error(error.message); setSaving(false); return; }
      } else {
        const { error } = await supabase
          .from('event_purse_allocations')
          .insert({ config_id: configId, event_id: row.event_id, meet_pct: row.meet_pct });
        if (error) { toast.error(error.message); setSaving(false); return; }
      }
    }

    toast.success('Event allocations saved');
    setSaving(false);
    loadAllocations();
    onChanged?.();
  };

  if (events.length === 0) {
    return <p className="text-sm text-muted-foreground">Add events to this meet first before configuring allocations.</p>;
  }

  return (
    <div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Event</TableHead>
            <TableHead className="w-32 text-right">% of Meet Pool</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row, idx) => (
            <TableRow key={row.event_id}>
              <TableCell>{row.event_name}</TableCell>
              <TableCell className="text-right">
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={row.meet_pct}
                  onChange={e => updatePct(idx, Number(e.target.value))}
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
          <Button onClick={handleSave} disabled={saving || !isValid} size="sm">
            {saving ? 'Saving...' : 'Save Allocations'}
          </Button>
        </div>
      )}
    </div>
  );
}
