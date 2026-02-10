

# Always-On Ranking with Login Encouragement

## Overview

Remove the "Rank Athletes" toggle button and show both the results table and the ranking list side by side (or stacked) within each event accordion. For logged-out users, the ranking area displays an info blurb encouraging them to log in, replacing the current redirect behavior.

## Changes

### 1. `src/pages/public/MeetDetailPage.tsx`

- **Remove** the `rankingMode` state and `toggleRankingMode` function entirely
- **Remove** the toggle button (lines 198-208)
- **Remove** the conditional rendering that switches between ranking and results table
- **Show both** the results table AND the RankingList together inside each accordion:
  - Results table first (the current read-only table with places, results, PB badges)
  - RankingList below it, always visible, separated by a small heading like "Your Picks"
- The RankingList component already handles the logged-out state internally (shows a login prompt), so no extra logic is needed

### 2. `src/components/rankings/RankingList.tsx`

- **Update the logged-out prompt** from the current minimal "Log in to rank your picks" to a more engaging info blurb:
  - Use a styled card/alert with a Trophy icon
  - Headline: "Pick your podium"
  - Body text: "Log in to rank athletes and predict the top 3 finishers for each event."
  - "Log In" button (already exists, just restyle within the new blurb)
- Keep all existing drag-and-drop and save functionality unchanged

## Layout per Event Accordion (after change)

```text
+------------------------------------------+
| Results Table (places, times, PB)        |
+------------------------------------------+
| --- Your Picks section ---               |
| [Draggable ranking list if logged in]    |
| [Info blurb + login CTA if logged out]   |
+------------------------------------------+
```

## Technical Details

### Files Modified
- `src/pages/public/MeetDetailPage.tsx` -- remove toggle state/button, show both views
- `src/components/rankings/RankingList.tsx` -- enhance the logged-out prompt to an info blurb

### No new files or dependencies needed
