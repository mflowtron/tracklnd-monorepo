import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { ExternalLink, Tv, Users, Plus, Pencil, Trash2, UserPlus } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import EventFormDialog from '@/components/dashboard/EventFormDialog';
import EntryFormDialog from '@/components/dashboard/EntryFormDialog';
import DeleteConfirmDialog from '@/components/dashboard/DeleteConfirmDialog';

export default function MeetDetailPage() {
  const { slug } = useParams();
  const { isAdmin } = useAuth();
  const [meet, setMeet] = useState<any>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [entriesByEvent, setEntriesByEvent] = useState<Record<string, any[]>>({});

  // Event CRUD state
  const [eventFormOpen, setEventFormOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<any>(null);
  const [deleteEventId, setDeleteEventId] = useState<string | null>(null);
  const [deletingEvent, setDeletingEvent] = useState(false);

  // Entry CRUD state
  const [entryFormOpen, setEntryFormOpen] = useState(false);
  const [entryEventId, setEntryEventId] = useState<string>('');
  const [editingEntry, setEditingEntry] = useState<any>(null);
  const [deleteEntryId, setDeleteEntryId] = useState<string | null>(null);
  const [deletingEntry, setDeletingEntry] = useState(false);

  const loadMeetData = useCallback(async () => {
    if (!slug) return;
    const { data: meetData } = await supabase.from('meets').select('*').eq('slug', slug).maybeSingle();
    setMeet(meetData);
    if (!meetData) return;

    const { data: evts } = await supabase.from('events').select('*').eq('meet_id', meetData.id).order('sort_order');
    setEvents(evts || []);

    const newEntries: Record<string, any[]> = {};
    await Promise.all(
      (evts || []).map(async (evt) => {
        const { data: entries } = await supabase
          .from('event_entries')
          .select('*, athletes(*)')
          .eq('event_id', evt.id)
          .order('place', { ascending: true, nullsFirst: false });
        newEntries[evt.id] = entries || [];
      })
    );
    setEntriesByEvent(newEntries);
  }, [slug]);

  useEffect(() => { loadMeetData(); }, [loadMeetData]);

  // Delete handlers
  const handleDeleteEvent = async () => {
    if (!deleteEventId) return;
    setDeletingEvent(true);
    const { error } = await supabase.from('events').delete().eq('id', deleteEventId);
    setDeletingEvent(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Event deleted');
    setDeleteEventId(null);
    loadMeetData();
  };

  const handleDeleteEntry = async () => {
    if (!deleteEntryId) return;
    setDeletingEntry(true);
    const { error } = await supabase.from('event_entries').delete().eq('id', deleteEntryId);
    setDeletingEntry(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Entry deleted');
    setDeleteEntryId(null);
    loadMeetData();
  };

  if (!meet) return <div className="flex items-center justify-center min-h-[50vh] text-muted-foreground">Loading...</div>;

  const statusColor = (s: string) => {
    if (s === 'live') return 'bg-red-500 text-white';
    if (s === 'upcoming') return 'bg-primary text-primary-foreground';
    if (s === 'in_progress') return 'bg-amber-500 text-white';
    if (s === 'complete') return 'bg-emerald-600 text-white';
    if (s === 'scheduled') return 'bg-secondary text-secondary-foreground';
    return 'bg-muted text-muted-foreground';
  };

  const genderLabel = (g: string) => g === 'men' ? 'M' : g === 'women' ? 'W' : 'X';

  const medalEmoji = (place: number | null) => {
    if (place === 1) return '🥇';
    if (place === 2) return '🥈';
    if (place === 3) return '🥉';
    return '';
  };

  return (
    <div>
      {/* Hero */}
      <section className="relative h-[50vh] min-h-[400px] flex items-end overflow-hidden">
        {meet.hero_image_url && (
          <img src={meet.hero_image_url} alt="" className="absolute inset-0 w-full h-full object-cover" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/10" />
        <div className="relative z-10 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pb-10">
          <div className="flex items-center gap-3 mb-3">
            <Badge className={statusColor(meet.status)}>
              {meet.status === 'live' && (
                <span className="relative flex h-2 w-2 mr-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-white" />
                </span>
              )}
              {meet.status}
            </Badge>
          </div>
          <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl text-white mb-3">{meet.name}</h1>
          <p className="text-white/80 text-lg">
            {format(new Date(meet.start_date), 'MMMM d, yyyy')}
            {meet.end_date && ` – ${format(new Date(meet.end_date), 'MMMM d, yyyy')}`}
          </p>
          <p className="text-white/60">{meet.venue}, {meet.location}</p>
          {meet.cta_label && meet.cta_url && (
            <Button asChild size="lg" className="mt-4">
              <a href={meet.cta_url} target="_blank" rel="noopener noreferrer">
                {meet.cta_label} <ExternalLink className="h-4 w-4 ml-1" />
              </a>
            </Button>
          )}
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Meet Info */}
        {meet.description && (
          <div className="max-w-3xl mb-10">
            <p className="text-lg leading-relaxed text-foreground/80">{meet.description}</p>
          </div>
        )}

        {/* Broadcast card */}
        {meet.broadcast_partner && (
          <div className="mb-10 p-6 rounded-lg bg-primary/5 border border-primary/20 flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Tv className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-semibold">Broadcast by {meet.broadcast_partner}</p>
                <p className="text-sm text-muted-foreground">Watch the action live</p>
              </div>
            </div>
            {meet.broadcast_url && (
              <Button asChild variant="outline" className="sm:ml-auto">
                <a href={meet.broadcast_url} target="_blank" rel="noopener noreferrer">
                  Watch Live <ExternalLink className="h-4 w-4 ml-1" />
                </a>
              </Button>
            )}
          </div>
        )}

        {/* Events Accordion */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-display text-2xl sm:text-3xl">Events</h2>
          {isAdmin && (
            <Button size="sm" onClick={() => { setEditingEvent(null); setEventFormOpen(true); }}>
              <Plus className="h-4 w-4 mr-1" /> Add Event
            </Button>
          )}
        </div>
        <Accordion type="multiple" className="space-y-2">
          {events.map(evt => {
            const entries = entriesByEvent[evt.id] || [];
            return (
              <AccordionItem key={evt.id} value={evt.id} className="border rounded-lg px-4">
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-3 text-left flex-1">
                    <Badge variant="outline" className="text-xs font-mono">{genderLabel(evt.gender)}</Badge>
                    <span className="font-semibold">{evt.name}</span>
                    {evt.round && <span className="text-sm text-muted-foreground">— {evt.round}</span>}
                    <Badge className={`ml-auto mr-4 ${statusColor(evt.status)}`}>{evt.status.replace('_', ' ')}</Badge>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Users className="h-3 w-3" /> {entries.length}
                    </span>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  {/* Admin event actions */}
                  {isAdmin && (
                    <div className="flex items-center gap-2 mb-3 pb-3 border-b">
                      <Button size="sm" variant="outline" onClick={() => { setEditingEvent(evt); setEventFormOpen(true); }}>
                        <Pencil className="h-3 w-3 mr-1" /> Edit Event
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setDeleteEventId(evt.id)}>
                        <Trash2 className="h-3 w-3 mr-1 text-destructive" /> Delete Event
                      </Button>
                      <Button size="sm" variant="outline" className="ml-auto" onClick={() => { setEntryEventId(evt.id); setEditingEntry(null); setEntryFormOpen(true); }}>
                        <UserPlus className="h-3 w-3 mr-1" /> Add Entry
                      </Button>
                    </div>
                  )}

                  {entries.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-2">No entries yet.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b text-left text-muted-foreground">
                            <th className="py-2 pr-3 w-12">#</th>
                            <th className="py-2 pr-3">Athlete</th>
                            <th className="py-2 pr-3 w-12"></th>
                            <th className="py-2 pr-3">Team</th>
                            <th className="py-2 pr-3 font-mono">Result</th>
                            <th className="py-2 w-12"></th>
                            {isAdmin && <th className="py-2 w-20"></th>}
                          </tr>
                        </thead>
                        <tbody>
                          {entries.map(entry => (
                            <tr
                              key={entry.id}
                              className={`border-b last:border-0 ${
                                entry.place && entry.place <= 3 ? 'bg-amber-50/50' : ''
                              }`}
                            >
                              <td className="py-2.5 pr-3 font-medium">
                                {medalEmoji(entry.place)} {entry.place || '–'}
                              </td>
                              <td className="py-2.5 pr-3 font-medium">{entry.athletes?.full_name}</td>
                              <td className="py-2.5 pr-3">{entry.athletes?.country_flag}</td>
                              <td className="py-2.5 pr-3 text-muted-foreground">{entry.athletes?.team}</td>
                              <td className="py-2.5 pr-3 font-mono font-medium">{entry.result || '–'}</td>
                              <td className="py-2.5">
                                {entry.is_pb && (
                                  <Badge className="bg-emerald-100 text-emerald-700 text-[10px]">PB</Badge>
                                )}
                              </td>
                              {isAdmin && (
                                <td className="py-2.5">
                                  <div className="flex items-center gap-1">
                                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEntryEventId(evt.id); setEditingEntry(entry); setEntryFormOpen(true); }}>
                                      <Pencil className="h-3 w-3" />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setDeleteEntryId(entry.id)}>
                                      <Trash2 className="h-3 w-3 text-destructive" />
                                    </Button>
                                  </div>
                                </td>
                              )}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      </div>

      {/* Dialogs */}
      {meet && (
        <>
          <EventFormDialog open={eventFormOpen} onOpenChange={setEventFormOpen} onSaved={loadMeetData} meetId={meet.id} initialData={editingEvent} />
          <EntryFormDialog open={entryFormOpen} onOpenChange={setEntryFormOpen} onSaved={loadMeetData} eventId={entryEventId} initialData={editingEntry} />
          <DeleteConfirmDialog open={!!deleteEventId} onOpenChange={o => !o && setDeleteEventId(null)} onConfirm={handleDeleteEvent} loading={deletingEvent} title="Delete Event?" description="This will delete the event and all its entries." />
          <DeleteConfirmDialog open={!!deleteEntryId} onOpenChange={o => !o && setDeleteEntryId(null)} onConfirm={handleDeleteEntry} loading={deletingEntry} title="Delete Entry?" description="This will remove this athlete from the event." />
        </>
      )}
    </div>
  );
}
