import { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { GripVertical, Trophy, LogIn } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';

interface Athlete {
  id: string;
  full_name: string;
  country_flag: string;
  team: string | null;
}

interface Entry {
  id: string;
  athlete_id: string;
  athletes: Athlete | null;
  place: number | null;
  result: string | null;
  is_pb: boolean;
}

interface RankingListProps {
  entries: Entry[];
  savedRanking: string[] | null;
  isAuthenticated: boolean;
  onSave: (rankedAthleteIds: string[]) => Promise<void>;
  variant?: 'light' | 'dark';
}

const medalStyles = [
  { bg: 'bg-amber-100 dark:bg-amber-500/20', border: 'border-amber-400', text: 'text-amber-700 dark:text-amber-300', emoji: '🥇' },
  { bg: 'bg-slate-100 dark:bg-slate-500/20', border: 'border-slate-400', text: 'text-slate-600 dark:text-slate-300', emoji: '🥈' },
  { bg: 'bg-orange-100 dark:bg-orange-500/20', border: 'border-orange-400', text: 'text-orange-700 dark:text-orange-300', emoji: '🥉' },
];

const medalEmoji = (place: number | null) => {
  if (place === 1) return '🥇';
  if (place === 2) return '🥈';
  if (place === 3) return '🥉';
  return '';
};

export default function RankingList({ entries, savedRanking, isAuthenticated, onSave, variant = 'light' }: RankingListProps) {
  const isDark = variant === 'dark';

  const buildOrder = useCallback(() => {
    const athleteIds = entries.map(e => e.athlete_id);
    if (savedRanking?.length) {
      const ranked = savedRanking.filter(id => athleteIds.includes(id));
      const remaining = athleteIds.filter(id => !ranked.includes(id));
      return [...ranked, ...remaining];
    }
    return athleteIds;
  }, [entries, savedRanking]);

  const [order, setOrder] = useState<string[]>(buildOrder);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const preDragOrder = useRef<string[]>([]);
  const dragAthleteId = useRef<string | null>(null);

  // Touch drag refs
  const containerRef = useRef<HTMLDivElement>(null);
  const touchDragIndex = useRef<number | null>(null);

  const entryMap = new Map(entries.map(e => [e.athlete_id, e]));

  // --- Logged-out: blurb at top + static read-only list ---
  if (!isAuthenticated) {
    return (
      <div className="space-y-3">
        {/* Login blurb at top */}
        <div className={cn(
          'rounded-lg border p-4',
          isDark ? 'bg-white/5 border-white/10' : 'bg-muted/50 border-border'
        )}>
          <div className="flex items-start gap-3">
            <div className={cn(
              'h-9 w-9 rounded-full flex items-center justify-center shrink-0',
              isDark ? 'bg-amber-500/20' : 'bg-amber-100'
            )}>
              <Trophy className={cn('h-4.5 w-4.5', isDark ? 'text-amber-300' : 'text-amber-600')} />
            </div>
            <div className="flex-1 min-w-0">
              <p className={cn('font-semibold text-sm', isDark ? 'text-white' : 'text-foreground')}>
                Pick your podium
              </p>
              <p className={cn('text-xs mt-0.5', isDark ? 'text-white/50' : 'text-muted-foreground')}>
                Log in to rank athletes and predict the top 3 finishers for each event.
              </p>
              <Button asChild size="sm" className="mt-2" variant={isDark ? 'outline' : 'default'}>
                <Link to="/login">
                  <LogIn className="h-3.5 w-3.5 mr-1" /> Log In to Pick
                </Link>
              </Button>
            </div>
          </div>
        </div>

        {/* Static athlete list (read-only, no drag) */}
        <div className="space-y-1">
          {entries.map(entry => {
            const athlete = entry.athletes;
            if (!athlete) return null;
            return (
              <div
                key={entry.id}
                className={cn(
                  'flex items-center gap-2 px-2 py-1.5 rounded-md border text-sm',
                  entry.place && entry.place <= 3
                    ? isDark ? 'bg-amber-500/10 border-amber-500/20' : 'bg-amber-50/50 border-amber-200'
                    : isDark ? 'bg-white/5 border-white/10' : 'bg-background border-border'
                )}
              >
                <span className={cn('w-8 text-center font-mono text-xs font-bold shrink-0', isDark ? 'text-white/50' : 'text-muted-foreground')}>
                  {medalEmoji(entry.place)} {entry.place || '–'}
                </span>
                <span className={cn('flex-1 truncate font-medium', isDark ? 'text-white' : 'text-foreground')}>
                  {athlete.country_flag} {athlete.full_name}
                </span>
                <span className={cn('text-xs truncate max-w-[80px] hidden sm:inline', isDark ? 'text-white/40' : 'text-muted-foreground')}>
                  {athlete.team || ''}
                </span>
                <span className={cn('font-mono text-xs font-medium w-16 text-right shrink-0', isDark ? 'text-white/70' : 'text-foreground')}>
                  {entry.result || '–'}
                </span>
                {entry.is_pb && <Badge className="bg-emerald-100 text-emerald-700 text-[10px] border-0 shrink-0">PB</Badge>}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // --- Logged-in: draggable unified list ---
  if (entries.length === 0) return null;

  const handleDragStart = (index: number) => {
    preDragOrder.current = [...order];
    dragAthleteId.current = order[index];
    setDragIndex(index);
    setDragOverIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (dragIndex === null || dragAthleteId.current === null) return;
    if (index === dragOverIndex) return;
    const currentIndex = order.indexOf(dragAthleteId.current!);
    if (currentIndex === -1 || currentIndex === index) return;
    const newOrder = [...order];
    const [removed] = newOrder.splice(currentIndex, 1);
    newOrder.splice(index, 0, removed);
    setOrder(newOrder);
    setDragOverIndex(index);
  };

  const handleDragEnd = () => {
    if (dragIndex !== null && dragAthleteId.current !== null) {
      const changed = preDragOrder.current.some((id, i) => order[i] !== id);
      if (changed) setHasChanges(true);
    }
    setDragIndex(null);
    setDragOverIndex(null);
    dragAthleteId.current = null;
  };

  const handleDragLeave = (e: React.DragEvent) => {
    const container = e.currentTarget as HTMLElement;
    const related = e.relatedTarget as HTMLElement | null;
    if (related && container.contains(related)) return;
    setOrder(preDragOrder.current);
    setDragIndex(null);
    setDragOverIndex(null);
    dragAthleteId.current = null;
  };

  // --- Touch drag handlers ---
  const handleTouchStart = (index: number, e: React.TouchEvent) => {
    e.preventDefault();
    preDragOrder.current = [...order];
    dragAthleteId.current = order[index];
    touchDragIndex.current = index;
    setDragIndex(index);
    setDragOverIndex(index);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    e.preventDefault();
    if (dragAthleteId.current === null || !containerRef.current) return;
    const touch = e.touches[0];
    const children = Array.from(containerRef.current.children) as HTMLElement[];
    let targetIndex = touchDragIndex.current ?? 0;

    for (let i = 0; i < children.length; i++) {
      const rect = children[i].getBoundingClientRect();
      const midY = rect.top + rect.height / 2;
      if (touch.clientY < midY) {
        targetIndex = i;
        break;
      }
      targetIndex = i;
    }

    if (targetIndex === touchDragIndex.current) return;
    touchDragIndex.current = targetIndex;

    const currentIndex = order.indexOf(dragAthleteId.current);
    if (currentIndex === -1 || currentIndex === targetIndex) return;
    const newOrder = [...order];
    const [removed] = newOrder.splice(currentIndex, 1);
    newOrder.splice(targetIndex, 0, removed);
    setOrder(newOrder);
    setDragOverIndex(targetIndex);
  };

  const handleTouchEnd = () => {
    if (dragIndex !== null && dragAthleteId.current !== null) {
      const changed = preDragOrder.current.some((id, i) => order[i] !== id);
      if (changed) setHasChanges(true);
    }
    setDragIndex(null);
    setDragOverIndex(null);
    dragAthleteId.current = null;
    touchDragIndex.current = null;
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(order);
      setHasChanges(false);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setOrder(buildOrder());
    setHasChanges(false);
  };

  const isDragging = dragIndex !== null;
  const draggedAthleteId = dragAthleteId.current;

  return (
    <div className="space-y-2">
      <div className={cn('flex items-center gap-2 mb-2', isDark ? 'text-white/70' : 'text-muted-foreground')}>
        <Trophy className="h-4 w-4" />
        <span className="text-xs font-medium uppercase tracking-wide">Your Picks</span>
      </div>

      <div className="space-y-1" ref={containerRef} onDragLeave={handleDragLeave}>
        {order.map((athleteId, index) => {
          const entry = entryMap.get(athleteId);
          const athlete = entry?.athletes;
          if (!athlete) return null;
          const medal = index < 3 ? medalStyles[index] : null;
          const isBeingDragged = isDragging && athleteId === draggedAthleteId;

          return (
            <div
              key={athleteId}
              draggable
              onDragStart={() => handleDragStart(index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragEnd={handleDragEnd}
              style={isBeingDragged ? { touchAction: 'none' } : undefined}
              className={cn(
                'flex items-center gap-2 px-2 py-1.5 rounded-md border cursor-grab active:cursor-grabbing text-sm',
                !isBeingDragged && 'transition-all duration-150',
                isBeingDragged && 'opacity-50 scale-[0.98] shadow-lg ring-2 ring-primary/40 z-10 relative',
                medal
                  ? isDark
                    ? `${medal.bg} border-${medal.border.split('-').slice(1).join('-')}/30`
                    : `${medal.bg} ${medal.border}`
                  : isDark
                    ? 'bg-white/5 border-white/10'
                    : 'bg-background border-border'
              )}
            >
              <div
                className="touch-none select-none"
                onTouchStart={(e) => handleTouchStart(index, e)}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
              >
                <GripVertical className={cn('h-4 w-4 shrink-0', isDark ? 'text-white/30' : 'text-muted-foreground/50')} />
              </div>

              <span className={cn('w-6 text-center font-mono text-xs font-bold shrink-0', medal ? medal.text : isDark ? 'text-white/40' : 'text-muted-foreground')}>
                {medal ? medal.emoji : index + 1}
              </span>

              <span className={cn('flex-1 truncate font-medium', isDark ? 'text-white' : 'text-foreground')}>
                {athlete.country_flag} {athlete.full_name}
              </span>

              <span className={cn('text-xs truncate max-w-[80px] hidden sm:inline', isDark ? 'text-white/40' : 'text-muted-foreground')}>
                {athlete.team || ''}
              </span>

              <span className={cn('font-mono text-xs font-medium w-16 text-right shrink-0', isDark ? 'text-white/70' : 'text-foreground')}>
                {entry?.result || '–'}
              </span>

              {entry?.is_pb && <Badge className="bg-emerald-100 text-emerald-700 text-[10px] border-0 shrink-0">PB</Badge>}
            </div>
          );
        })}
      </div>

      {hasChanges && (
        <div className="flex gap-2 pt-1">
          <Button size="sm" onClick={handleSave} disabled={saving} className="flex-1">
            {saving ? 'Saving…' : 'Save Picks'}
          </Button>
          <Button size="sm" variant="outline" onClick={handleCancel} disabled={saving}
            className={isDark ? 'border-white/20 text-white hover:bg-white/10' : ''}>
            Cancel
          </Button>
        </div>
      )}

      {!hasChanges && savedRanking?.length ? (
        <p className={cn('text-xs', isDark ? 'text-white/40' : 'text-muted-foreground')}>
          ✓ Picks saved · drag to reorder
        </p>
      ) : null}
    </div>
  );
}
