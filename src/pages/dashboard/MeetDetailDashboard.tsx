import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { ArrowLeft, Calendar, MapPin, Plus, Pencil, Trash2, Users, ExternalLink, Video } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { Switch } from '@/components/ui/switch';
import MeetFormDialog from '@/components/dashboard/MeetFormDialog';
import EventFormDialog from '@/components/dashboard/EventFormDialog';
import EntrySpreadsheet from '@/components/dashboard/EntrySpreadsheet';
import DeleteConfirmDialog from '@/components/dashboard/DeleteConfirmDialog';
import BroadcastFormDialog from '@/components/dashboard/BroadcastFormDialog';

export default function MeetDetailDashboard() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [meet, setMeet] = useState<any>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [entriesByEvent, setEntriesByEvent] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(true);

  // Meet edit
  const [meetFormOpen, setMeetFormOpen] = useState(false);
  const [deleteMeetOpen, setDeleteMeetOpen] = useState(false);
  const [deletingMeet, setDeletingMeet] = useState(false);

  // Event CRUD
  const [eventFormOpen, setEventFormOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<any>(null);
  const [deleteEventId, setDeleteEventId] = useState<string | null>(null);
  const [deletingEvent, setDeletingEvent] = useState(false);

  // Entry delete (kept for legacy, spreadsheet handles its own deletes now)

  // Broadcasts
  const [broadcasts, setBroadcasts] = useState<any[]>([]);
  const [broadcastFormOpen, setBroadcastFormOpen] = useState(false);
  const [editingBroadcast, setEditingBroadcast] = useState<any>(null);
  const [deleteBroadcastId, setDeleteBroadcastId] = useState<string | null>(null);
  const [deletingBroadcast, setDeletingBroadcast] = useState(false);

  const loadData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    const { data: meetData } = await supabase.from('meets').select('*').eq('id', id).maybeSingle();
    setMeet(meetData);
    if (!meetData) { setLoading(false); return; }

    const { data: evts } = await supabase.from('events').select('*').eq('meet_id', id).order('sort_order');
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

    // Load broadcasts
    const { data: bc } = await supabase.from('broadcasts' as any).select('*').eq('meet_id', id).order('created_at');
    setBroadcasts(bc || []);

    setLoading(false);
  }, [id]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleDeleteMeet = async () => {
    if (!id) return;
    setDeletingMeet(true);
    const { error } = await supabase.from('meets').delete().eq('id', id);
    setDeletingMeet(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Meet deleted');
    navigate('/dashboard/meets');
  };

  const handleDeleteEvent = async () => {
    if (!deleteEventId) return;
    setDeletingEvent(true);
    const { error } = await supabase.from('events').delete().eq('id', deleteEventId);
    setDeletingEvent(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Event deleted');
    setDeleteEventId(null);
    loadData();
  };


  const handleDeleteBroadcast = async () => {
    if (!deleteBroadcastId) return;
    setDeletingBroadcast(true);
    const { error } = await supabase.from('broadcasts' as any).delete().eq('id', deleteBroadcastId);
    setDeletingBroadcast(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Broadcast deleted');
    setDeleteBroadcastId(null);
    loadData();
  };

  const toggleBroadcastActive = async (bc: any) => {
    const { error } = await supabase.from('broadcasts' as any).update({ is_active: !bc.is_active }).eq('id', bc.id);
    if (error) { toast.error(error.message); return; }
    loadData();
  };

  if (loading) return <div className="flex items-center justify-center min-h-[50vh] text-muted-foreground">Loading…</div>;
  if (!meet) return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
      <p className="text-muted-foreground">Meet not found.</p>
      <Button variant="outline" onClick={() => navigate('/dashboard/meets')}>Back to Meets</Button>
    </div>
  );

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
      {/* Back + actions */}
      <div className="flex items-center justify-between mb-6">
        <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard/meets')}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Back to Meets
        </Button>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <a href={`/meets/${meet.slug}`} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4 mr-1" /> View Public
            </a>
          </Button>
          <Button variant="outline" size="sm" onClick={() => setMeetFormOpen(true)}>
            <Pencil className="h-4 w-4 mr-1" /> Edit
          </Button>
          <Button variant="destructive" size="sm" onClick={() => setDeleteMeetOpen(true)}>
            <Trash2 className="h-4 w-4 mr-1" /> Delete
          </Button>
        </div>
      </div>

      {/* Meet summary card */}
      <Card className="mb-8">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row sm:items-start gap-4">
            {meet.hero_image_url && (
              <img src={meet.hero_image_url} alt="" className="w-full sm:w-40 h-24 object-cover rounded-md" />
            )}
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h2 className="text-2xl font-bold">{meet.name}</h2>
                <Badge className={statusColor(meet.status)}>{meet.status}</Badge>
              </div>
              <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {format(new Date(meet.start_date), 'MMM d, yyyy')}
                  {meet.end_date && ` – ${format(new Date(meet.end_date), 'MMM d, yyyy')}`}
                </span>
                <span className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" /> {meet.venue}, {meet.location}
                </span>
              </div>
              {meet.description && <p className="mt-2 text-sm text-foreground/70 line-clamp-2">{meet.description}</p>}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Broadcasts section */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-semibold flex items-center gap-2">
          <Video className="h-5 w-5" /> Broadcasts ({broadcasts.length})
        </h3>
        <Button size="sm" onClick={() => { setEditingBroadcast(null); setBroadcastFormOpen(true); }}>
          <Plus className="h-4 w-4 mr-1" /> Add Broadcast
        </Button>
      </div>

      {broadcasts.length === 0 ? (
        <Card className="mb-8">
          <CardContent className="py-8 text-center text-muted-foreground">
            No broadcasts linked. Click "Add Broadcast" to connect a Mux video.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2 mb-8">
          {broadcasts.map((bc: any) => (
            <Card key={bc.id}>
              <CardContent className="py-4 flex items-center gap-4">
                {bc.mux_playback_id && (
                  <img
                    src={`https://image.mux.com/${bc.mux_playback_id}/thumbnail.jpg?width=160&height=90&fit_mode=smartcrop`}
                    alt=""
                    className="w-28 h-16 object-cover rounded"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">{bc.title}</p>
                  <p className="text-xs text-muted-foreground font-mono truncate">{bc.mux_playback_id}</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    <Switch checked={bc.is_active} onCheckedChange={() => toggleBroadcastActive(bc)} />
                    <span className="text-xs text-muted-foreground">{bc.is_active ? 'Active' : 'Inactive'}</span>
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditingBroadcast(bc); setBroadcastFormOpen(true); }}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDeleteBroadcastId(bc.id)}>
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Events section */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-semibold">Events ({events.length})</h3>
        <Button size="sm" onClick={() => { setEditingEvent(null); setEventFormOpen(true); }}>
          <Plus className="h-4 w-4 mr-1" /> Add Event
        </Button>
      </div>

      {events.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No events yet. Click "Add Event" to get started.
          </CardContent>
        </Card>
      ) : (
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
                  {/* Event actions */}
                  <div className="flex items-center gap-2 mb-3 pb-3 border-b">
                    <Button size="sm" variant="outline" onClick={() => { setEditingEvent(evt); setEventFormOpen(true); }}>
                      <Pencil className="h-3 w-3 mr-1" /> Edit Event
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setDeleteEventId(evt.id)}>
                      <Trash2 className="h-3 w-3 mr-1 text-destructive" /> Delete Event
                    </Button>
                  </div>

                  <EntrySpreadsheet eventId={evt.id} entries={entries} onDataChanged={loadData} />
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      )}

      {/* Dialogs */}
      <MeetFormDialog open={meetFormOpen} onOpenChange={setMeetFormOpen} onSaved={loadData} initialData={meet} />
      {meet && (
        <>
          <EventFormDialog open={eventFormOpen} onOpenChange={setEventFormOpen} onSaved={loadData} meetId={meet.id} initialData={editingEvent} />
        </>
      )}
      <DeleteConfirmDialog open={deleteMeetOpen} onOpenChange={setDeleteMeetOpen} onConfirm={handleDeleteMeet} loading={deletingMeet} title="Delete Meet?" description="This will permanently delete this meet and all its events and entries." />
      <DeleteConfirmDialog open={!!deleteEventId} onOpenChange={o => !o && setDeleteEventId(null)} onConfirm={handleDeleteEvent} loading={deletingEvent} title="Delete Event?" description="This will delete the event and all its entries." />
      
      <DeleteConfirmDialog open={!!deleteBroadcastId} onOpenChange={o => !o && setDeleteBroadcastId(null)} onConfirm={handleDeleteBroadcast} loading={deletingBroadcast} title="Delete Broadcast?" description="This will remove this broadcast from the meet." />
      {meet && <BroadcastFormDialog open={broadcastFormOpen} onOpenChange={setBroadcastFormOpen} onSaved={loadData} meetId={meet.id} initialData={editingBroadcast} />}
    </div>
  );
}
