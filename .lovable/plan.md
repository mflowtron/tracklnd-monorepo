

# Mux Broadcast Player -- Full Integration

## Overview

This plan adds end-to-end Mux video integration: a `broadcasts` database table to link Mux playback IDs to meets, a backend function to list assets from your Mux account, dashboard management to assign videos to meets, and a beautiful public broadcast player page.

## Architecture

### 1. Secrets Setup

Two Mux credentials need to be securely stored:
- **MUX_TOKEN_ID** -- your Mux API access token ID
- **MUX_TOKEN_SECRET** -- your Mux API access token secret

These will be stored as backend secrets and used only in a backend function (never exposed to the browser).

### 2. Database -- `broadcasts` Table

A new table linking Mux playback IDs to meets:

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | Primary key |
| meet_id | uuid | FK to meets, nullable (can exist without a meet) |
| title | text | Display title for the broadcast |
| mux_playback_id | text | The Mux public playback ID |
| mux_asset_id | text | The Mux asset ID (for reference) |
| status | text | "idle", "preparing", "ready", "live", "errored" |
| is_active | boolean | Whether this broadcast is currently shown |
| thumbnail_url | text | Optional thumbnail override |
| created_at | timestamptz | Auto-set |
| updated_at | timestamptz | Auto-set |

RLS: Public read access for active broadcasts. Authenticated admin write access.

### 3. Backend Function -- `mux-assets`

A backend function that proxies requests to the Mux API so we never expose credentials to the browser.

**Endpoints:**
- `GET /mux-assets` -- Lists assets from your Mux account (used in dashboard to pick videos)
- Returns asset ID, playback IDs, status, duration, and thumbnail URLs

This function reads MUX_TOKEN_ID and MUX_TOKEN_SECRET from secrets and calls the Mux Assets API (`https://api.mux.com/video/v1/assets`).

### 4. Dashboard -- Broadcasts Management

**Where:** New "Broadcasts" section inside the Meet Detail Dashboard page (`/dashboard/meets/:id`).

- Shows current broadcast(s) linked to the meet
- "Add Broadcast" button opens a dialog where admins can:
  - Browse existing Mux assets (fetched via the backend function)
  - Select one and assign it with a title
  - Or manually enter a Mux playback ID
- Edit/delete existing broadcasts
- Toggle `is_active` status

**New files:**
- `src/components/dashboard/BroadcastFormDialog.tsx` -- form dialog to create/edit a broadcast entry

**Modified files:**
- `src/pages/dashboard/MeetDetailDashboard.tsx` -- add Broadcasts section above Events

### 5. Public Broadcast Player Page

**Route:** `/meets/:slug/watch`

A cinematic, full-width player page featuring:
- Mux Player (via `@mux/mux-player-react`) with the meet's active broadcast playback ID
- Meet name, date, and status overlay
- Link back to the meet detail page for results/events
- Responsive design -- full-width player on mobile, 16:9 contained on desktop
- Dark background for a theater-like experience

**New files:**
- `src/pages/public/BroadcastPage.tsx`

**Modified files:**
- `src/App.tsx` -- add `/meets/:slug/watch` route
- `src/pages/public/MeetDetailPage.tsx` -- add "Watch Broadcast" button when an active broadcast exists

### 6. Sample Data

After the Mux connection is set up, the backend function will be used to fetch your existing Mux assets. One will be selected and linked to the Portland Track Festival meet as a sample broadcast record.

## Technical Details

### New Dependencies
- `@mux/mux-player-react` -- official Mux React player component

### New Files
- `supabase/functions/mux-assets/index.ts` -- backend function to list Mux assets
- `src/pages/public/BroadcastPage.tsx` -- public player page
- `src/components/dashboard/BroadcastFormDialog.tsx` -- dashboard form dialog

### Modified Files
- `src/App.tsx` -- new route for broadcast page
- `src/pages/dashboard/MeetDetailDashboard.tsx` -- add broadcasts section
- `src/pages/public/MeetDetailPage.tsx` -- add "Watch" CTA when broadcast is active

### Database Migration
- Create `broadcasts` table with columns listed above
- Add RLS policies (public SELECT for active, admin INSERT/UPDATE/DELETE)

### Secrets Required
- `MUX_TOKEN_ID`
- `MUX_TOKEN_SECRET`

### Implementation Order
1. Request Mux API credentials (secrets)
2. Create `broadcasts` table migration
3. Create `mux-assets` backend function
4. Install `@mux/mux-player-react`
5. Build `BroadcastFormDialog` component
6. Add broadcasts section to Meet Detail Dashboard
7. Build public `BroadcastPage` with Mux Player
8. Add route and "Watch" button to meet detail page
9. Use backend function to fetch a video from your Mux account and create sample broadcast for Portland Track Festival

