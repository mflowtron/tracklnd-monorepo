import { useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from '@/components/ui/command';
import { Check, Plus, Trash2, UserPlus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface Athlete {
  id: string;
  full_name: string;
  country_flag: string;
  country_code: string;
  team: string | null;
}

interface Entry {
  id: string;
  athlete_id: string;
  event_id: string;
  place: number | null;
  result: string | null;
  is_pb: boolean;
  athletes?: Athlete;
}

interface RowState {
  id?: string;
  athleteSearch: string;
  selectedAthlete: Athlete | null;
  place: string;
  result: string;
  isPb: boolean;
  isNew: boolean;
  isSaving: boolean;
}

function entryToRow(entry: Entry): RowState {
  return {
    id: entry.id,
    athleteSearch: entry.athletes?.full_name || '',
    selectedAthlete: entry.athletes || null,
    place: entry.place?.toString() || '',
    result: entry.result || '',
    isPb: entry.is_pb,
    isNew: false,
    isSaving: false,
  };
}

function createEmptyRow(): RowState {
  return {
    athleteSearch: '',
    selectedAthlete: null,
    place: '',
    result: '',
    isPb: false,
    isNew: true,
    isSaving: false,
  };
}

function rankAthletes(athletes: Athlete[], query: string): Athlete[] {
  if (!query.trim()) return [];
  const q = query.toLowerCase();
  const exact: Athlete[] = [];
  const startsWith: Athlete[] = [];
  const contains: Athlete[] = [];

  for (const a of athletes) {
    const name = a.full_name.toLowerCase();
    if (name === q) exact.push(a);
    else if (name.startsWith(q)) startsWith.push(a);
    else if (name.includes(q)) contains.push(a);
  }
  return [...exact, ...startsWith, ...contains].slice(0, 8);
}

interface Props {
  eventId: string;
  entries: Entry[];
  onDataChanged: () => void;
}

export default function EntrySpreadsheet({ eventId, entries, onDataChanged }: Props) {
  const [allAthletes, setAllAthletes] = useState<Athlete[]>([]);
  const [rows, setRows] = useState<RowState[]>([]);
  const [openPopoverIdx, setOpenPopoverIdx] = useState<number | null>(null);

  // Load all athletes once
  useEffect(() => {
    supabase.from('athletes').select('*').order('full_name').then(({ data }) => {
      setAllAthletes(data || []);
    });
  }, []);

  // Sync rows from entries prop
  useEffect(() => {
    setRows(entries.map(entryToRow));
  }, [entries]);

  const updateRow = useCallback((idx: number, patch: Partial<RowState>) => {
    setRows(prev => prev.map((r, i) => i === idx ? { ...r, ...patch } : r));
  }, []);

  const addRow = () => {
    setRows(prev => [...prev, createEmptyRow()]);
  };

  const removeNewRow = (idx: number) => {
    setRows(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSelectAthlete = (idx: number, athlete: Athlete) => {
    updateRow(idx, {
      selectedAthlete: athlete,
      athleteSearch: athlete.full_name,
    });
    setOpenPopoverIdx(null);
  };

  const handleCreateAthlete = async (idx: number, name: string) => {
    const { data, error } = await supabase
      .from('athletes')
      .insert({ full_name: name.trim() })
      .select()
      .single();

    if (error) {
      toast.error('Failed to create athlete: ' + error.message);
      return;
    }
    setAllAthletes(prev => [...prev, data]);
    handleSelectAthlete(idx, data);
    toast.success(`Created athlete "${data.full_name}"`);
  };

  const handleSaveRow = async (idx: number) => {
    const row = rows[idx];
    if (!row.selectedAthlete) {
      toast.error('Please select an athlete first');
      return;
    }

    updateRow(idx, { isSaving: true });

    const payload = {
      athlete_id: row.selectedAthlete.id,
      event_id: eventId,
      place: row.place ? parseInt(row.place, 10) : null,
      result: row.result || null,
      is_pb: row.isPb,
    };

    let error;
    if (row.isNew) {
      ({ error } = await supabase.from('event_entries').insert(payload));
    } else {
      ({ error } = await supabase.from('event_entries').update(payload).eq('id', row.id!));
    }

    updateRow(idx, { isSaving: false });

    if (error) {
      toast.error('Save failed: ' + error.message);
      return;
    }

    toast.success(row.isNew ? 'Entry added' : 'Entry updated');
    onDataChanged();
  };

  const handleDeleteEntry = async (idx: number) => {
    const row = rows[idx];
    if (row.isNew) {
      removeNewRow(idx);
      return;
    }
    const { error } = await supabase.from('event_entries').delete().eq('id', row.id!);
    if (error) {
      toast.error('Delete failed: ' + error.message);
      return;
    }
    toast.success('Entry deleted');
    onDataChanged();
  };

  const medalEmoji = (place: string) => {
    if (place === '1') return '🥇 ';
    if (place === '2') return '🥈 ';
    if (place === '3') return '🥉 ';
    return '';
  };

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-muted-foreground">
              <th className="py-2 pr-2 min-w-[200px]">Athlete</th>
              <th className="py-2 pr-2 w-12"></th>
              <th className="py-2 pr-2 min-w-[100px]">Team</th>
              <th className="py-2 pr-2 w-20">Place</th>
              <th className="py-2 pr-2 min-w-[100px]">Result</th>
              <th className="py-2 pr-2 w-12">PB</th>
              <th className="py-2 w-24"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => {
              const suggestions = rankAthletes(allAthletes, row.athleteSearch);
              const showCreate = row.athleteSearch.trim().length > 1 && suggestions.length === 0;

              return (
                <tr key={row.id || `new-${idx}`} className="border-b last:border-0">
                  {/* Athlete Name */}
                  <td className="py-1.5 pr-2">
                    <Popover open={openPopoverIdx === idx} onOpenChange={(o) => setOpenPopoverIdx(o ? idx : null)}>
                      <PopoverTrigger asChild>
                        <Input
                          value={row.athleteSearch}
                          onChange={(e) => {
                            updateRow(idx, { athleteSearch: e.target.value, selectedAthlete: null });
                            if (e.target.value.trim().length > 0) setOpenPopoverIdx(idx);
                          }}
                          onFocus={() => {
                            if (row.athleteSearch.trim().length > 0) setOpenPopoverIdx(idx);
                          }}
                          placeholder="Type athlete name…"
                          className="h-8 text-sm"
                        />
                      </PopoverTrigger>
                      {(suggestions.length > 0 || showCreate) && (
                        <PopoverContent className="p-0 w-[300px]" align="start" onOpenAutoFocus={(e) => e.preventDefault()}>
                          <Command>
                            <CommandList>
                              {suggestions.length > 0 && (
                                <CommandGroup>
                                  {suggestions.map(a => (
                                    <CommandItem
                                      key={a.id}
                                      onSelect={() => handleSelectAthlete(idx, a)}
                                      className="flex items-center gap-2"
                                    >
                                      <span>{a.country_flag}</span>
                                      <span className="font-medium">{a.full_name}</span>
                                      {a.team && <span className="text-xs text-muted-foreground ml-auto">{a.team}</span>}
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              )}
                              {showCreate && (
                                <CommandGroup>
                                  <CommandItem onSelect={() => handleCreateAthlete(idx, row.athleteSearch)} className="flex items-center gap-2">
                                    <UserPlus className="h-3.5 w-3.5" />
                                    <span>Create "<strong>{row.athleteSearch.trim()}</strong>"</span>
                                  </CommandItem>
                                </CommandGroup>
                              )}
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      )}
                    </Popover>
                  </td>

                  {/* Flag */}
                  <td className="py-1.5 pr-2 text-center">
                    {row.selectedAthlete?.country_flag || ''}
                  </td>

                  {/* Team */}
                  <td className="py-1.5 pr-2 text-muted-foreground text-sm">
                    {row.selectedAthlete?.team || '–'}
                  </td>

                  {/* Place */}
                  <td className="py-1.5 pr-2">
                    <div className="flex items-center gap-1">
                      <span className="text-sm">{medalEmoji(row.place)}</span>
                      <Input
                        type="number"
                        min={1}
                        value={row.place}
                        onChange={(e) => updateRow(idx, { place: e.target.value })}
                        className="h-8 w-16 text-sm font-mono"
                        placeholder="–"
                      />
                    </div>
                  </td>

                  {/* Result */}
                  <td className="py-1.5 pr-2">
                    <Input
                      value={row.result}
                      onChange={(e) => updateRow(idx, { result: e.target.value })}
                      className="h-8 text-sm font-mono"
                      placeholder="e.g. 10.45"
                    />
                  </td>

                  {/* PB */}
                  <td className="py-1.5 pr-2">
                    <Switch checked={row.isPb} onCheckedChange={(v) => updateRow(idx, { isPb: v })} />
                  </td>

                  {/* Actions */}
                  <td className="py-1.5">
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => handleSaveRow(idx)}
                        disabled={row.isSaving || !row.selectedAthlete}
                        title="Save row"
                      >
                        {row.isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5 text-emerald-600" />}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => handleDeleteEntry(idx)}
                        title={row.isNew ? 'Remove row' : 'Delete entry'}
                      >
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Button variant="outline" size="sm" className="mt-3" onClick={addRow}>
        <Plus className="h-3.5 w-3.5 mr-1" /> Add Row
      </Button>
    </div>
  );
}
