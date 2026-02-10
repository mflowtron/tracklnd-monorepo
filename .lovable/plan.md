
# Touch Drag-and-Drop for Mobile

## Overview

Replace the up/down arrow buttons with touch-based drag-and-drop using `touchstart`, `touchmove`, and `touchend` events. HTML5 drag events don't work on mobile browsers, so we need a custom touch implementation that mirrors the existing mouse drag behavior.

## Changes

### File: `src/components/rankings/RankingList.tsx`

**Remove:**
- The `ChevronUp` and `ChevronDown` imports from lucide-react
- The `moveItem` function
- The mobile arrow button block (lines 262-278) -- the `sm:hidden` div with up/down buttons

**Add touch drag handlers:**
- `handleTouchStart(index, e)`: Record the starting touch Y position, snapshot the order into `preDragOrder`, set `dragIndex` state, and store the touched element's height for calculating positions
- `handleTouchMove(e)`: Calculate which row index the finger is currently over by comparing `touch.clientY` against the container's row positions. If the target index changed, reorder the `order` array live (same logic as the existing `handleDragOver`)
- `handleTouchEnd`: Finalize the drag, mark `hasChanges` if order changed, clear drag state

**Refs needed:**
- `containerRef` (ref on the list container div) -- used to get bounding rects of child rows during touch move
- `touchStartY` ref -- stores initial touch Y coordinate
- `touchDragIndex` ref -- tracks which index the finger is currently over

**Row changes:**
- Add `onTouchStart`, `onTouchMove`, `onTouchEnd` to each draggable row
- On touch start, call `e.preventDefault()` to prevent scroll hijacking (only on the grip handle area to avoid blocking normal scroll on the row content)
- The grip handle (`GripVertical`) becomes the touch target -- attach touch events specifically to it so users can still scroll the page by touching elsewhere on the row

**Visual feedback:**
- Reuse the same `isBeingDragged` styling (`opacity-50 scale-[0.98] shadow-lg ring-2`) that already works for mouse drag
- Rows animate with the existing `transition-all duration-150`

**Key detail -- preventing page scroll during drag:**
- When the user starts dragging via the grip handle, we need `touch-action: none` on the row being dragged to prevent the browser from scrolling the page
- Apply this inline style conditionally when `isBeingDragged` is true

### No new dependencies

Pure touch event handling -- no external drag library needed.
