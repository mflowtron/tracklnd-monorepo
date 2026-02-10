import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { fetchWithRetry } from '@/lib/supabase-fetch';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Popover, PopoverAnchor, PopoverContent } from '@/components/ui/popover';
import { Command, CommandGroup, CommandItem, CommandList } from '@/components/ui/command';
import { Check, Plus, Trash2, UserPlus, Loader2, ClipboardPaste } from 'lucide-react';
import { toast } from 'sonner';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';

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
    id: crypto.randomUUID(),
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
  const [pasteDialogOpen, setPasteDialogOpen] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [isPasting, setIsPasting] = useState(false);

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

    try {
      if (row.isNew) {
        const { error } = await fetchWithRetry(() => supabase.from('event_entries').insert(payload));
        if (error) throw error;
      } else {
        const { error } = await fetchWithRetry(() => supabase.from('event_entries').update(payload).eq('id', row.id!));
        if (error) throw error;
      }
      toast.success(row.isNew ? 'Entry added' : 'Entry updated');
      onDataChanged();
    } catch (err: any) {
      toast.error('Save failed: ' + (err?.message || 'Unknown error'));
    } finally {
      updateRow(idx, { isSaving: false });
    }
  };

  const handleDeleteEntry = async (idx: number) => {
    const row = rows[idx];
    if (row.isNew) {
      removeNewRow(idx);
      return;
    }
    try {
      const { error } = await fetchWithRetry(() => supabase.from('event_entries').delete().eq('id', row.id!));
      if (error) throw error;
      toast.success('Entry deleted');
      onDataChanged();
    } catch (err: any) {
      toast.error('Delete failed: ' + (err?.message || 'Unknown error'));
    }
  };

  const medalEmoji = (place: string) => {
    if (place === '1') return '🥇 ';
    if (place === '2') return '🥈 ';
    if (place === '3') return '🥉 ';
    return '';
  };

  // Bulk paste: parse tab/comma-separated rows, match athletes, create rows
  const handleBulkPaste = async () => {
    if (!pasteText.trim()) return;
    setIsPasting(true);

    const lines = pasteText.trim().split('\n').filter(l => l.trim());
    const newRows: RowState[] = [];
    const athletesToCreate: { lineIdx: number; name: string }[] = [];

    for (const line of lines) {
      // Support tab-separated or comma-separated: Name\tPlace\tResult or Name,Place,Result
      const parts = line.includes('\t') ? line.split('\t') : line.split(',');
      const name = (parts[0] || '').trim();
      if (!name) continue;

      const place = (parts[1] || '').trim();
      const result = (parts[2] || '').trim();

      // Try to match athlete
      const q = name.toLowerCase();
      let matched = allAthletes.find(a => a.full_name.toLowerCase() === q);
      if (!matched) {
        matched = allAthletes.find(a => a.full_name.toLowerCase().startsWith(q));
      }
      if (!matched) {
        matched = allAthletes.find(a => a.full_name.toLowerCase().includes(q));
      }

      const row: RowState = {
        athleteSearch: matched ? matched.full_name : name,
        selectedAthlete: matched || null,
        place: place.replace(/[^0-9]/g, ''),
        result,
        isPb: false,
        isNew: true,
        isSaving: false,
      };
      newRows.push(row);

      if (!matched) {
        athletesToCreate.push({ lineIdx: newRows.length - 1, name });
      }
    }

    // Create unmatched athletes in bulk
    if (athletesToCreate.length > 0) {
      const { data: created, error } = await supabase
        .from('athletes')
        .insert(athletesToCreate.map(a => ({ full_name: a.name })))
        .select();

      if (error) {
        toast.error('Failed to create some athletes: ' + error.message);
      } else if (created) {
        setAllAthletes(prev => [...prev, ...created]);
        for (let i = 0; i < athletesToCreate.length; i++) {
          const row = newRows[athletesToCreate[i].lineIdx];
          const athlete = created[i];
          if (athlete) {
            row.selectedAthlete = athlete;
            row.athleteSearch = athlete.full_name;
          }
        }
      }
    }

    setRows(prev => [...prev, ...newRows]);
    setPasteDialogOpen(false);
    setPasteText('');
    setIsPasting(false);

    const matched = newRows.filter(r => r.selectedAthlete).length;
    toast.success(`Pasted ${newRows.length} rows (${matched} matched, ${newRows.length - matched} unmatched)`);
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
                    <Popover open={openPopoverIdx === idx && row.athleteSearch.trim().length > 0} onOpenChange={(o) => { if (!o) setOpenPopoverIdx(null); }}>
                      <PopoverAnchor asChild>
                        <Input
                          value={row.athleteSearch}
                          onChange={(e) => {
                            updateRow(idx, { athleteSearch: e.target.value, selectedAthlete: null });
                            if (e.target.value.trim().length > 0) setOpenPopoverIdx(idx);
                            else setOpenPopoverIdx(null);
                          }}
                          onFocus={() => {
                            if (row.athleteSearch.trim().length > 0) setOpenPopoverIdx(idx);
                          }}
                          placeholder="Type athlete name…"
                          className="h-8 text-sm"
                        />
                      </PopoverAnchor>
                      <PopoverContent className="p-0 w-[300px]" align="start" onOpenAutoFocus={(e) => e.preventDefault()}>
                        <Command>
                          <CommandList>
                            {suggestions.length > 0 ? (
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
                            ) : showCreate ? (
                              <CommandGroup>
                                <CommandItem onSelect={() => handleCreateAthlete(idx, row.athleteSearch)} className="flex items-center gap-2">
                                  <UserPlus className="h-3.5 w-3.5" />
                                  <span>Create "<strong>{row.athleteSearch.trim()}</strong>"</span>
                                </CommandItem>
                              </CommandGroup>
                            ) : (
                              <div className="p-3 text-sm text-muted-foreground text-center">No matches found</div>
                            )}
                          </CommandList>
                        </Command>
                      </PopoverContent>
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
                        {row.isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5 text-primary" />}
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

      <div className="flex items-center gap-2 mt-3">
        <Button variant="outline" size="sm" onClick={addRow}>
          <Plus className="h-3.5 w-3.5 mr-1" /> Add Row
        </Button>
        <Button variant="outline" size="sm" onClick={() => setPasteDialogOpen(true)}>
          <ClipboardPaste className="h-3.5 w-3.5 mr-1" /> Paste from Spreadsheet
        </Button>
      </div>

      <Dialog open={pasteDialogOpen} onOpenChange={setPasteDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Paste Entries from Spreadsheet</DialogTitle>
            <DialogDescription>
              Paste rows copied from Excel or Google Sheets. Expected format: one athlete per line with columns separated by tabs or commas.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              <strong>Format:</strong> Name, Place, Result (one per line)
            </p>
            <p className="text-xs text-muted-foreground font-mono bg-muted p-2 rounded">
              Sha'Carri Richardson{'\t'}1{'\t'}10.71<br />
              Shelly-Ann Fraser{'\t'}2{'\t'}10.89<br />
              Elaine Thompson{'\t'}3{'\t'}10.92
            </p>
            <Textarea
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              placeholder="Paste your data here…"
              rows={8}
              className="font-mono text-sm"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPasteDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleBulkPaste} disabled={isPasting || !pasteText.trim()}>
              {isPasting ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <ClipboardPaste className="h-4 w-4 mr-1" />}
              Import {pasteText.trim().split('\n').filter(l => l.trim()).length} Rows
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
