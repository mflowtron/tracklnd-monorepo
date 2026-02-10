

# User Rankings for Meet Events

## Overview

Add a fan ranking feature where logged-in users can drag-and-drop athletes within each event to create their personal podium predictions. The top 3 picks are visually highlighted as gold, silver, and bronze. Rankings are saved per user per event in the database.

## Database

### New Table: `event_rankings`

Stores one row per user per event, with the user's ordered list of athlete IDs.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | Primary key |
| user_id | uuid | NOT NULL, references auth.users ON DELETE CASCADE |
| event_id | uuid | NOT NULL, references events ON DELETE CASCADE |
| ranked_athlete_ids | text[] | Ordered array of athlete IDs (1st = index 0) |
| updated_at | timestamptz | Auto-set via trigger |

- **Unique constraint** on `(user_id, event_id)` so each user has one ranking per event
- **RLS policies:**
  - Authenticated users can SELECT their own rankings (`auth.uid() = user_id`)
  - Authenticated users can INSERT their own rankings (`auth.uid() = user_id`)
  - Authenticated users can UPDATE their own rankings (`auth.uid() = user_id`)
  - Authenticated users can DELETE their own rankings (`auth.uid() = user_id`)

### Why text[] for rankings

Storing the full ordered list as an array keeps it simple -- one upsert per save, no join table, easy to swap to a REST API later (just send a JSON array). The array stores athlete UUIDs in ranked order.

## UI Changes

### 1. Meet Detail Page (`MeetDetailPage.tsx`)

Add a "Rank Athletes" button/toggle per event that switches the entry list into ranking mode:

- **Default view**: Current read-only results table (unchanged)
- **Ranking mode**: Draggable list of athletes with grip handles
  - Top 3 slots show gold/silver/bronze badges
  - "Save Rankings" button to persist
  - "Cancel" to discard changes
  - If not logged in, clicking the rank button redirects to `/login`

### 2. Broadcast Sidebar (`EventLineupCard.tsx`)

Add a compact ranking toggle in the sidebar event cards:

- Small "My Picks" button that expands a ranking area below the results table
- Same drag-and-drop reordering, adapted for the dark theme and smaller width
- Shows saved picks with medal indicators when collapsed

### 3. New Component: `RankingList.tsx`

A reusable drag-and-drop ranking component used in both contexts:

- Accepts entries (athletes), current ranking, and save callback
- Uses HTML5 drag-and-drop (no extra dependency needed) for simplicity
- Touch-friendly: tap-to-select + move-up/move-down buttons as fallback for mobile
- Visual states:
  - Rank 1: Gold accent border + "1st" badge
  - Rank 2: Silver accent border + "2nd" badge  
  - Rank 3: Bronze accent border + "3rd" badge
  - Rank 4+: Subtle numbered list
- Login prompt shown for unauthenticated users

### 4. Data Service: `src/services/rankings.ts`

Centralized data access following the project's backend portability pattern:

- `getUserRankings(eventId)` -- fetch current user's ranking for an event
- `getUserRankingsForMeet(meetId)` -- fetch all rankings for a meet's events (batch)
- `saveRanking(eventId, rankedAthleteIds)` -- upsert ranking
- `deleteRanking(eventId)` -- remove ranking

## Technical Details

### New Files
- `src/components/rankings/RankingList.tsx` -- drag-and-drop ranking component
- `src/services/rankings.ts` -- data access layer for rankings

### Modified Files
- `src/pages/public/MeetDetailPage.tsx` -- add ranking mode toggle per event
- `src/components/broadcast/EventLineupCard.tsx` -- add "My Picks" section
- `src/components/broadcast/BroadcastSidebar.tsx` -- pass auth state down

### Database Migration
- Create `event_rankings` table
- Add RLS policies for authenticated user access
- Add unique constraint on (user_id, event_id)
- Add updated_at trigger

### No New Dependencies
Uses HTML5 native drag-and-drop API -- no external drag library needed. Mobile fallback uses up/down arrow buttons.

### Implementation Order
1. Create database migration for `event_rankings` table with RLS
2. Create `src/services/rankings.ts` data service
3. Build `RankingList.tsx` component with drag-and-drop + mobile fallback
4. Integrate ranking mode into `MeetDetailPage.tsx`
5. Integrate compact "My Picks" into `EventLineupCard.tsx` for broadcast sidebar

