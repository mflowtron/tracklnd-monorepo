

# Merge Ranking into Main Athlete Listing

## Overview

Instead of having two separate views (a results table and a separate "Your Picks" drag-and-drop list below it), merge them into a single unified list. Each athlete row is both informational (showing result, place, team) AND draggable for ranking. The login blurb moves above the list for maximum visibility.

## Changes

### 1. `src/pages/public/MeetDetailPage.tsx`

- **Remove** the separate results table (lines 191-217) and the separate `RankingList` section below it (lines 220-228)
- **Replace** with a single `RankingList` component that receives full entry data (result, place, PB status) and renders everything in one unified list
- Update the `RankingList` props to pass entries with their result data, not just athlete info

### 2. `src/components/rankings/RankingList.tsx`

**Props update:**
- Expand the `Entry` interface to include `place`, `result`, `is_pb` fields so the component can render result data inline

**Layout changes -- unified rows:**
- Each draggable row now shows: grip handle | rank pick number/medal | athlete name + flag | team | result | PB badge | mobile arrows
- This replaces both the old static table AND the old drag list with one combined view
- Rows with official place 1-3 keep the amber highlight for results context

**Login blurb moved to top:**
- For logged-out users, render the "Pick your podium" info blurb ABOVE the athlete list (not instead of it)
- The athlete list still renders below in a read-only state (no grip handles, no arrows) so users can see the data
- This ensures the CTA is the first thing users see when expanding an event

**Logged-in vs logged-out rendering:**
- Logged in: grip handles visible, rows draggable, medal styling on top 3 picks, save/cancel buttons
- Logged out: blurb at top, then a static list of athletes with results (same row layout but no drag affordances)

### Visual layout per row (merged)

```text
| Grip | Pick# | Athlete Flag Name | Team | Result | PB |
```

- Pick# shows medal emoji for top 3 picks (logged-in users) or official place (logged-out)
- Result column shows the official time/mark
- PB badge appears when `is_pb` is true

### Files Modified
- `src/pages/public/MeetDetailPage.tsx` -- simplify to single `RankingList` rendering
- `src/components/rankings/RankingList.tsx` -- merge result data into draggable rows, move blurb to top

