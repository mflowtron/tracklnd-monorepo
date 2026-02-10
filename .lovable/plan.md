

# Broadcast Player Revamp -- ESPN+ Style Fullscreen Experience

## Overview

Transform the broadcast player page into a truly immersive, fullscreen viewing experience with a collapsible sidebar showing live event schedules and athlete lineups. The page will break out of the `PublicLayout` wrapper to eliminate the navbar/footer and own the entire viewport.

## Layout Concept

```text
+--[Top Bar (slim, transparent)]----------------------------------+
| <- Back    Meet Name    LIVE badge    [Sidebar Toggle]          |
+--[Main Area]----------------------------------------------------+
|                                          |  Events & Lineups   |
|                                          |  +--------------+   |
|          Mux Video Player                |  | 100m M Final |   |
|          (fills available space)         |  |  1. Athlete A |   |
|                                          |  |  2. Athlete B |   |
|                                          |  +--------------+   |
|                                          |  | 200m W Semi  |   |
|                                          |  |  ...         |   |
|                                          |  +--------------+   |
|                                          |  [Pause Updates]    |
+------------------------------------------------------------------+
```

On mobile, the sidebar becomes a bottom sheet / drawer that slides up over the player.

## Key Features

### 1. Standalone Fullscreen Route (no PublicLayout)

Move `/meets/:slug/watch` outside the `PublicLayout` wrapper in `App.tsx` so the broadcast page owns the entire viewport -- no navbar, no footer, just the player and sidebar.

### 2. Slim Top Bar

A minimal, semi-transparent header overlay with:
- Back arrow linking to `/meets/:slug`
- Meet name (truncated on mobile)
- Live status badge with pulsing indicator
- Sidebar toggle button (panel icon)

### 3. Collapsible Events Sidebar (Desktop)

A right-side panel (~380px wide) that can be toggled open/closed:
- **Header**: "Schedule & Lineups" title with a "Pause Updates" toggle
- **Event list**: Accordion-style cards for each event, grouped or sorted by `sort_order`
- Each event card shows: event name, gender badge, status badge, scheduled time
- Expanding an event reveals the athlete lineup table (place, name, flag, team, result, PB badge)
- Highlighted row for events currently "in_progress" or "live"
- Smooth slide animation on open/close
- Player resizes to fill remaining space when sidebar is toggled

### 4. Mobile Bottom Drawer

On screens below 768px, the sidebar becomes a `vaul` Drawer that slides up from the bottom:
- A floating "Schedule" button near the bottom of the screen opens it
- Drawer shows the same event accordion content
- Draggable to different snap points (collapsed, half, full)

### 5. Pause Live Updates Toggle

A switch in the sidebar header that:
- When ON (default): Events and entries data auto-refreshes every 30 seconds via polling
- When OFF: Data stays frozen at the last fetched state (for viewers watching behind live)
- Visual indicator showing "Updates paused" when toggled off

### 6. Data Loading

Fetch all events and entries for the meet (same pattern as `MeetDetailPage.tsx`):
- Load meet by slug
- Load active broadcast for the meet
- Load all events ordered by `sort_order`
- Load all entries per event with athlete joins
- Polling interval (30s) controlled by the pause toggle

### 7. Future-Ready: Vote/Rankings Placeholder

Each athlete row in the sidebar will have a subtle right-aligned area (currently empty/disabled) that can later house vote buttons or ranking drag handles. No functionality now, just structural room in the layout.

## Technical Details

### Files Modified

**`src/App.tsx`**
- Move the `/meets/:slug/watch` route outside the `PublicLayout` wrapper so it renders standalone without navbar/footer

**`src/pages/public/BroadcastPage.tsx`**
- Complete rewrite to a fullscreen layout with:
  - `100vh` viewport container, dark theme background
  - Flexbox layout: player area + sidebar
  - Top bar overlay with meet info and controls
  - Sidebar state management (open/closed)
  - Events + entries data fetching with polling
  - Pause toggle using a `useRef` to skip refetch intervals
  - Mobile detection via `useIsMobile()` hook
  - Drawer integration for mobile sidebar

### New Components (extracted within BroadcastPage or as siblings)

**`src/components/broadcast/BroadcastSidebar.tsx`**
- The sidebar panel content: header with pause toggle, scrollable event accordion list
- Receives events, entries, paused state, and toggle handler as props
- Reused in both the desktop panel and mobile drawer

**`src/components/broadcast/EventLineupCard.tsx`**
- Single event accordion item showing event info + athlete lineup table
- Highlights "in_progress" events with a subtle accent border
- Athlete rows with space reserved for future vote/rank actions

### Existing Dependencies Used
- `vaul` (Drawer) -- already installed, for mobile bottom sheet
- `@mux/mux-player-react` -- already installed
- `@radix-ui/react-switch` -- already installed, for pause toggle
- `lucide-react` -- icons (PanelRight, Pause, Play, etc.)
- `useIsMobile()` hook -- already exists

### Implementation Order
1. Move broadcast route outside PublicLayout in App.tsx
2. Create `BroadcastSidebar` and `EventLineupCard` components
3. Rewrite `BroadcastPage` with fullscreen layout, sidebar toggle, data fetching with polling, and mobile drawer
