

# Meet Management - Full CRUD Dashboard

## Overview

The meets list page (`/dashboard/meets`) already supports creating, editing, and deleting meets. However, managing **Events** and **Entries** (athletes within events) is currently embedded in the public-facing meet detail page. This plan creates a dedicated dashboard meet detail page with full hierarchical CRUD.

## What Already Exists
- **MeetsTab** (list page): Create, edit, delete meets -- working
- **MeetFormDialog**: Full meet form with image upload -- working
- **EventFormDialog**: Create/edit events -- working
- **EntryFormDialog**: Create/edit entries (athletes in events) -- working
- **DeleteConfirmDialog**: Reusable delete confirmation -- working
- **Database tables**: `meets`, `events`, `event_entries`, `athletes` with proper RLS policies -- all set

## What Will Be Built

### 1. Dashboard Meet Detail Page (`/dashboard/meets/:id`)

A new page accessible by clicking "Manage" on a meet row. This page will show:

- **Meet summary header** -- name, dates, status, venue, with quick Edit/Delete buttons
- **Events section** -- list of events belonging to this meet, with Add/Edit/Delete controls
- **Entries per event** -- expandable accordion for each event showing its athlete entries with Add/Edit/Delete controls
- **Back navigation** to the meets list

### 2. Updated Meets List

- Replace the current "View" button (which links to the public page) with a "Manage" button linking to `/dashboard/meets/:id`
- Keep the public "View" link as a secondary action

### 3. Remove Admin Controls from Public Page

- Strip the event/entry CRUD buttons from `MeetDetailPage.tsx` so the public page is read-only
- The public page will only display event results

## Technical Details

### New Files
- `src/pages/dashboard/MeetDetailDashboard.tsx` -- dashboard meet detail page with events and entries management

### Modified Files
- `src/App.tsx` -- add route `/dashboard/meets/:id` pointing to the new page
- `src/pages/dashboard/MeetsTab.tsx` -- change "View" button to "Manage" linking to dashboard detail, add secondary public link
- `src/pages/public/MeetDetailPage.tsx` -- remove all admin CRUD controls (event add/edit/delete, entry add/edit/delete buttons), keep read-only display
- `src/layouts/DashboardLayout.tsx` -- add dynamic page title support for meet detail routes

### Data Flow
The new dashboard page will:
1. Fetch the meet by ID using `supabase.from('meets').select('*').eq('id', id).maybeSingle()`
2. Fetch events using `supabase.from('events').select('*').eq('meet_id', id).order('sort_order')`
3. Fetch entries per event using `supabase.from('event_entries').select('*, athletes(*)').eq('event_id', eventId).order('place')`
4. Reuse `EventFormDialog`, `EntryFormDialog`, `MeetFormDialog`, and `DeleteConfirmDialog` for all operations

### Route Structure
```text
/dashboard/meets          --> MeetsTab (list)
/dashboard/meets/:id      --> MeetDetailDashboard (manage events + entries)
```

