import { AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Users } from 'lucide-react';

interface EventLineupCardProps {
  event: any;
  entries: any[];
}

const statusStyle = (s: string) => {
  if (s === 'in_progress') return 'bg-amber-500 text-white';
  if (s === 'complete') return 'bg-emerald-600 text-white';
  return 'bg-white/10 text-white/60';
};

const genderLabel = (g: string) => (g === 'men' ? 'M' : g === 'women' ? 'W' : 'X');

const medalEmoji = (place: number | null) => {
  if (place === 1) return '🥇';
  if (place === 2) return '🥈';
  if (place === 3) return '🥉';
  return '';
};

export default function EventLineupCard({ event, entries }: EventLineupCardProps) {
  const isLive = event.status === 'in_progress';

  return (
    <AccordionItem
      value={event.id}
      className={`border border-white/10 rounded-lg px-3 transition-colors ${isLive ? 'border-amber-500/50 bg-amber-500/5' : 'bg-white/[0.03]'}`}
    >
      <AccordionTrigger className="hover:no-underline py-3 text-white [&>svg]:text-white/40">
        <div className="flex items-center gap-2.5 text-left flex-1 min-w-0">
          <Badge variant="outline" className="text-[10px] font-mono border-white/20 text-white/70 shrink-0">
            {genderLabel(event.gender)}
          </Badge>
          <span className="font-medium text-sm truncate">{event.name}</span>
          {event.round && <span className="text-xs text-white/40 shrink-0">— {event.round}</span>}
          <div className="ml-auto flex items-center gap-2 shrink-0">
            <Badge className={`text-[10px] ${statusStyle(event.status)}`}>
              {isLive && (
                <span className="relative flex h-1.5 w-1.5 mr-1">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-white" />
                </span>
              )}
              {event.status.replace('_', ' ')}
            </Badge>
            <span className="text-[10px] text-white/30 flex items-center gap-0.5">
              <Users className="h-3 w-3" /> {entries.length}
            </span>
          </div>
        </div>
      </AccordionTrigger>
      <AccordionContent className="pb-3">
        {entries.length === 0 ? (
          <p className="text-xs text-white/40 py-2">No entries yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-white/10 text-left text-white/40">
                  <th className="py-1.5 pr-2 w-8">#</th>
                  <th className="py-1.5 pr-2">Athlete</th>
                  <th className="py-1.5 pr-2 w-8"></th>
                  <th className="py-1.5 pr-2">Team</th>
                  <th className="py-1.5 pr-2 font-mono">Result</th>
                  <th className="py-1.5 w-8"></th>
                  {/* Future: vote/rank column */}
                  <th className="py-1.5 w-10"></th>
                </tr>
              </thead>
              <tbody>
                {entries.map(entry => (
                  <tr
                    key={entry.id}
                    className={`border-b border-white/5 last:border-0 ${entry.place && entry.place <= 3 ? 'bg-amber-500/5' : ''}`}
                  >
                    <td className="py-2 pr-2 font-medium text-white/70">
                      {medalEmoji(entry.place)} {entry.place || '–'}
                    </td>
                    <td className="py-2 pr-2 font-medium text-white">{entry.athletes?.full_name}</td>
                    <td className="py-2 pr-2">{entry.athletes?.country_flag}</td>
                    <td className="py-2 pr-2 text-white/50">{entry.athletes?.team || '–'}</td>
                    <td className="py-2 pr-2 font-mono font-medium text-white/80">{entry.result || '–'}</td>
                    <td className="py-2">
                      {entry.is_pb && (
                        <Badge className="bg-emerald-500/20 text-emerald-400 text-[9px] border-0">PB</Badge>
                      )}
                    </td>
                    {/* Future: vote/rank action area */}
                    <td className="py-2"></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </AccordionContent>
    </AccordionItem>
  );
}
