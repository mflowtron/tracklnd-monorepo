import { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { GripVertical, ChevronUp, ChevronDown, Trophy, LogIn } from 'lucide-react';
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
}

interface RankingListProps {
  entries: Entry[];
  savedRanking: string[] | null;
  isAuthenticated: boolean;
  onSave: (rankedAthleteIds: string[]) => Promise<void>;
  variant?: 'light' | 'dark';
}

const medalStyles = [
  { bg: 'bg-amber-100 dark:bg-amber-500/20', border: 'border-amber-400', text: 'text-amber-700 dark:text-amber-300', label: '1st', emoji: '🥇' },
  { bg: 'bg-slate-100 dark:bg-slate-500/20', border: 'border-slate-400', text: 'text-slate-600 dark:text-slate-300', label: '2nd', emoji: '🥈' },
  { bg: 'bg-orange-100 dark:bg-orange-500/20', border: 'border-orange-400', text: 'text-orange-700 dark:text-orange-300', label: '3rd', emoji: '🥉' },
];

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

  // Drag state
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const preDragOrder = useRef<string[]>([]);
  const dragAthleteId = useRef<string | null>(null);

  if (!isAuthenticated) {
    return (
      <div className={cn('flex flex-col items-center gap-2 py-4 text-center', isDark ? 'text-white/60' : 'text-muted-foreground')}>
        <LogIn className="h-5 w-5" />
        <p className="text-sm">Log in to rank your picks</p>
        <Button asChild size="sm" variant={isDark ? 'outline' : 'default'} className={isDark ? 'border-white/20 text-white hover:bg-white/10' : ''}>
          <Link to="/login">Log In</Link>
        </Button>
      </div>
    );
  }

  if (entries.length === 0) return null;

  const athleteMap = new Map(entries.map(e => [e.athlete_id, e.athletes]));

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

    // Live reorder: move the dragged item to the new position
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
      // Check if order actually changed from pre-drag
      const changed = preDragOrder.current.some((id, i) => order[i] !== id);
      if (changed) setHasChanges(true);
    }
    setDragIndex(null);
    setDragOverIndex(null);
    dragAthleteId.current = null;
  };

  const handleDragLeave = (e: React.DragEvent) => {
    // Only revert if leaving the container entirely
    const container = e.currentTarget as HTMLElement;
    const related = e.relatedTarget as HTMLElement | null;
    if (related && container.contains(related)) return;

    setOrder(preDragOrder.current);
    setDragIndex(null);
    setDragOverIndex(null);
    dragAthleteId.current = null;
  };

  const moveItem = (index: number, direction: -1 | 1) => {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= order.length) return;
    const newOrder = [...order];
    [newOrder[index], newOrder[newIndex]] = [newOrder[newIndex], newOrder[index]];
    setOrder(newOrder);
    setHasChanges(true);
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

      <div
        className="space-y-1"
        onDragLeave={handleDragLeave}
      >
        {order.map((athleteId, index) => {
          const athlete = athleteMap.get(athleteId);
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
              className={cn(
                'flex items-center gap-2 px-2 py-1.5 rounded-md border cursor-grab active:cursor-grabbing text-sm',
                // Smooth transition for non-dragged rows
                !isBeingDragged && 'transition-all duration-150',
                // Dragged item styling
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
              <GripVertical className={cn('h-4 w-4 shrink-0', isDark ? 'text-white/30' : 'text-muted-foreground/50')} />

              <span className={cn('w-6 text-center font-mono text-xs font-bold shrink-0', medal ? medal.text : isDark ? 'text-white/40' : 'text-muted-foreground')}>
                {medal ? medal.emoji : index + 1}
              </span>

              <span className={cn('flex-1 truncate font-medium', isDark ? 'text-white' : 'text-foreground')}>
                {athlete.country_flag} {athlete.full_name}
              </span>

              <span className={cn('text-xs truncate max-w-[80px]', isDark ? 'text-white/40' : 'text-muted-foreground')}>
                {athlete.team || ''}
              </span>

              {/* Mobile fallback arrows */}
              <div className="flex flex-col gap-0 sm:hidden">
                <button
                  onClick={() => moveItem(index, -1)}
                  disabled={index === 0}
                  className={cn('p-0.5 rounded hover:bg-black/10 disabled:opacity-20', isDark && 'hover:bg-white/10')}
                >
                  <ChevronUp className="h-3 w-3" />
                </button>
                <button
                  onClick={() => moveItem(index, 1)}
                  disabled={index === order.length - 1}
                  className={cn('p-0.5 rounded hover:bg-black/10 disabled:opacity-20', isDark && 'hover:bg-white/10')}
                >
                  <ChevronDown className="h-3 w-3" />
                </button>
              </div>
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
