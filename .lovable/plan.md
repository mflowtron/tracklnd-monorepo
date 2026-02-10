

# Spreadsheet-Style Entry Editor with Smart Athlete Matching

## Overview

Replace the current one-at-a-time entry dialog with an inline, Excel-like table editor for each event. Admins can rapidly add and edit multiple entries in a grid, and athlete names are matched intelligently against the existing athlete database to prevent duplicates and typos.

## How It Works

### The Spreadsheet Table

When you expand an event in the meet dashboard, the existing entries table becomes editable. Below the existing rows, empty rows are available for adding new entries. Each row has these columns:

| Athlete Name | Flag | Team | Place | Result | PB | Actions |
|---|---|---|---|---|---|---|
| (type-ahead input) | auto-filled | auto-filled | editable | editable | toggle | save/delete |

- **Athlete Name column**: A text input with a dropdown suggestion list. As you type, it fuzzy-searches the athlete database and shows the best matches ranked by similarity.
- **Flag / Team columns**: Auto-populated when an athlete is selected from suggestions. Read-only to prevent inconsistency.
- **Place / Result / PB columns**: Directly editable inline.
- Each row has a Save button (checkmark) that commits that single row, and a Delete/Remove button.

### Smart Athlete Matching

When the admin types in the Athlete Name field:

1. The input searches all athletes in the database using a case-insensitive substring match
2. Results are ranked by match quality -- exact matches first, then "starts with", then "contains"
3. Each suggestion shows the athlete's flag, name, and team so the admin can confirm they're picking the right person
4. If no match is found, a "Create new athlete" option appears at the bottom of the dropdown, which lets the admin type the new name and add it to the athletes table on the fly
5. This prevents duplicates because you always see existing athletes first before creating a new one

### Workflow

1. Admin expands an event accordion
2. Sees existing entries in an editable table
3. Clicks "+ Add Row" to append a blank row at the bottom
4. Types an athlete name -- suggestions appear instantly
5. Selects an existing athlete (or creates a new one)
6. Fills in place, result, toggles PB
7. Clicks the checkmark to save that row
8. Repeats for more entries -- no dialog opening/closing needed

## Technical Details

### New Component: `src/components/dashboard/EntrySpreadsheet.tsx`

A self-contained component that receives `eventId` and the current `entries` array, and renders the editable table.

**State per row:**
- `athleteSearch`: string (the text typed into the name field)
- `selectedAthlete`: object or null (the matched/selected athlete)
- `place`: string
- `result`: string
- `isPb`: boolean
- `isNew`: boolean (unsaved row vs existing entry)
- `isSaving`: boolean

**Athlete search logic (client-side):**
- On component mount, fetch all athletes once (the database has a manageable number)
- Filter in-memory as the user types using case-insensitive substring matching
- Sort results: exact match first, then startsWith, then includes
- Show top 8 suggestions in a dropdown (using Popover + Command from existing UI components)

**Inline create athlete:**
- If no suggestions match, show "Create [typed name] as new athlete"
- On click: insert into `athletes` table with defaults (US flag, no team), then select the newly created athlete for that row
- The admin can later edit the athlete's full details from the Athletes tab

**Save logic:**
- Each row saves independently via upsert to `event_entries`
- For new rows: `insert` with `athlete_id`, `event_id`, `place`, `result`, `is_pb`
- For existing rows: `update` by entry `id`
- On success: toast + mark row as saved
- On error: toast with error message, row stays editable

### Modified: `src/pages/dashboard/MeetDetailDashboard.tsx`

- Replace the entries `<table>` block (lines 306-344) with the new `<EntrySpreadsheet>` component
- Remove the `EntryFormDialog` usage and related state (`entryFormOpen`, `entryEventId`, `editingEntry`)
- Keep the "Add Entry" button but wire it to append a new row in the spreadsheet instead of opening a dialog
- Keep delete confirmation dialog for entry deletion

### Kept: `src/components/dashboard/EntryFormDialog.tsx`

Keep this file for now (no breaking changes), but it will no longer be imported by `MeetDetailDashboard`.

### UI Components Used (all existing)

- `Input` for editable cells
- `Switch` for PB toggle
- `Popover` + `Command`/`CommandInput`/`CommandItem` for the athlete search dropdown
- `Button` for save/delete/add-row actions
- `Badge` for PB indicator
- `toast` from sonner for feedback

### Files Changed

- `src/components/dashboard/EntrySpreadsheet.tsx` -- **new** (main spreadsheet component)
- `src/pages/dashboard/MeetDetailDashboard.tsx` -- **modified** (swap table for spreadsheet)

