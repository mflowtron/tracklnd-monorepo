import { Accordion } from '@/components/ui/accordion';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Pause } from 'lucide-react';
import EventLineupCard from './EventLineupCard';

interface BroadcastSidebarProps {
  events: any[];
  entriesByEvent: Record<string, any[]>;
  paused: boolean;
  onTogglePause: () => void;
}

export default function BroadcastSidebar({ events, entriesByEvent, paused, onTogglePause }: BroadcastSidebarProps) {
  // Auto-open in_progress events
  const defaultOpen = events.filter(e => e.status === 'in_progress').map(e => e.id);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <h2 className="text-sm font-semibold text-white">Schedule & Lineups</h2>
        <div className="flex items-center gap-2">
          {paused && (
            <span className="flex items-center gap-1 text-[10px] text-amber-400">
              <Pause className="h-3 w-3" /> Paused
            </span>
          )}
          <Label htmlFor="pause-toggle" className="text-[10px] text-white/40 cursor-pointer">
            Auto-update
          </Label>
          <Switch
            id="pause-toggle"
            checked={!paused}
            onCheckedChange={() => onTogglePause()}
            className="scale-75 origin-right"
          />
        </div>
      </div>

      {/* Event list */}
      <div className="flex-1 overflow-y-auto px-3 py-3">
        {events.length === 0 ? (
          <p className="text-xs text-white/40 text-center py-8">No events scheduled yet.</p>
        ) : (
          <Accordion type="multiple" defaultValue={defaultOpen} className="space-y-2">
            {events.map(evt => (
              <EventLineupCard key={evt.id} event={evt} entries={entriesByEvent[evt.id] || []} />
            ))}
          </Accordion>
        )}
      </div>
    </div>
  );
}
