

# Improved Drag-and-Drop with Visual Drop Indicator

## Problem

The current implementation uses basic HTML5 drag-and-drop with no visual feedback -- when dragging an athlete row, the user has no indication of where it will land until they release. This makes ranking feel clunky and unpredictable.

## Solution

Replace the invisible `dragEnter`/`dragEnd` approach with a stateful drag system that:

1. **Highlights the dragged item** with reduced opacity and a subtle scale-down
2. **Shows a colored drop indicator line** between rows where the item will be inserted
3. **Live-previews the reordered list** as the user drags, so the list visually rearranges in real time (the approach used by most modern drag UIs like Trello, Linear, etc.)

## Approach: Live Preview Reorder

Instead of only applying the reorder on drop, the list will **rearrange in real time** as the user drags over each row. This gives immediate visual feedback of the final position:

- On `dragStart`: Store the dragged index, apply a visual "dragging" state (opacity, scale)
- On `dragOver` (each row): If the hovered row differs from the current drag-over target, immediately reorder the `order` array to show where the item would land
- On `dragEnd`: Finalize the order (it's already visually correct)
- On `dragLeave` / escape: Revert to original order

This is the same pattern used by Atlassian's drag libraries and feels far more intuitive than a static drop indicator line.

## Technical Details

### File Modified: `src/components/rankings/RankingList.tsx`

**State changes:**
- Add `dragIndex` state (number | null) -- the index currently being dragged
- Add `dragOverIndex` state (number | null) -- the index being hovered over
- Add `preDragOrder` ref -- snapshot of order before drag started, for cancel/revert
- Remove `dragItem` and `dragOverItem` refs (replaced by state)

**Drag handlers:**
- `onDragStart`: Set `dragIndex`, snapshot current order into `preDragOrder`
- `onDragOver`: Calculate drop position from mouse Y relative to each row's midpoint. If position changed, reorder the array live so the list visually shifts
- `onDragEnd`: Clear drag state, mark `hasChanges = true`
- `onDragLeave` (on container): Revert to `preDragOrder` if drag leaves the list entirely

**Visual feedback on the dragged row:**
- `opacity-50 scale-[0.98] shadow-lg ring-2 ring-primary/40` while dragging
- Other rows get a smooth `transition-transform` so they animate into their new positions

**Drop indicator line:**
- A 2px tall colored bar (primary color) rendered between rows at the current drop position
- Appears via absolute positioning or a conditional div inserted at `dragOverIndex`

**Touch / mobile:**
- The up/down arrow buttons remain as the mobile fallback (unchanged)
- HTML5 drag events don't work reliably on touch, so arrows stay for mobile users

### No new dependencies

This stays zero-dependency -- just smarter use of HTML5 drag events and React state.

### Summary of visual improvements

| Before | After |
|--------|-------|
| No feedback during drag | Live list reordering as you drag |
| No indication of drop target | Drop indicator line between rows |
| Dragged item looks the same | Dragged item has reduced opacity + ring highlight |
| Abrupt position change on drop | Smooth CSS transitions as rows shift |

