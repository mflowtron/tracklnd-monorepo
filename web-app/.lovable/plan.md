

# Fix Entry Spreadsheet CRUD Issues

## Problem 1: Can't type in the name field after "Add Row"

The `Input` is wrapped inside `PopoverTrigger asChild`, which means Radix Popover intercepts click/focus events on the input to toggle the popover. When you click the input on a new empty row:
- The Popover captures the click to open itself
- But `suggestions` is empty (no search text yet) and `showCreate` is false, so `PopoverContent` doesn't render
- The Popover still steals focus from the input, preventing typing

**Fix**: Decouple the Input from `PopoverTrigger`. Instead of using `asChild` on the Input, use a separate hidden anchor for the Popover and control it purely via the `open` state. The Input becomes a normal controlled input that opens the popover programmatically when text is typed.

Alternatively (simpler approach): Keep the Popover but always render the `PopoverContent` when `openPopoverIdx === idx`, even if there are no suggestions. Show a "No matches" or "Type to search" message. This ensures the Popover has content to render when it opens, and the input won't lose focus. However, the cleaner fix is to separate the trigger.

**Chosen approach**: Remove `PopoverTrigger asChild` from the Input. Instead, wrap the input in a `div` and use `PopoverAnchor` (from Radix) to position the popover relative to the input, while controlling open/close purely through state. This way the input is a plain input that always accepts typing, and the popover floats below it when suggestions exist.

## Problem 2: Can't delete entries

Two potential causes:

1. **RLS policies are fine** -- the migration shows admin delete policy exists on `event_entries`, so this should work if the user is logged in as admin.

2. **The real issue**: After a successful delete, `onDataChanged()` calls `loadData()` which re-fetches everything. The `useEffect` that syncs `rows` from `entries` then runs and resets the rows. This should work. However, if the delete call itself is failing silently (no toast appearing), the problem could be that the Supabase client request is hanging (the same timeout issue from earlier). The `handleDeleteEntry` function does not use `fetchWithRetry`.

3. **Another possibility**: The delete button click might be intercepted by the Popover or accordion, preventing the handler from firing.

**Fix**: 
- Wrap Supabase calls in `handleDeleteEntry` and `handleSaveRow` with the `fetchWithRetry` utility for resilience
- Add a confirmation step or at minimum ensure the click handler fires (add console.log for debugging)
- Ensure the delete/save buttons are not inside any element that could swallow click events

## Technical Changes

### File: `src/components/dashboard/EntrySpreadsheet.tsx`

1. **Replace `PopoverTrigger asChild` pattern with `PopoverAnchor`**:
   - Import `PopoverAnchor` from Radix (it's part of `@radix-ui/react-popover`)
   - The Input sits inside a `PopoverAnchor` wrapper instead of `PopoverTrigger`
   - Remove the `PopoverTrigger` entirely -- the popover opens/closes purely via the `open` prop on `Popover`
   - This lets the Input behave as a normal text input while the popover dropdown appears below it

2. **Always show PopoverContent when popover is open**:
   - Remove the conditional `{(suggestions.length > 0 || showCreate) && ...}` around `PopoverContent`
   - Instead, always render `PopoverContent` and show "No results" or the create option inside it
   - Close the popover when there's no text typed (empty input)

3. **Add error handling to delete/save**:
   - Add `console.log` statements to `handleDeleteEntry` to trace execution
   - Ensure the toast fires on both success and error paths

4. **Fix key stability for new rows**:
   - Use a stable unique ID for new rows (e.g., generate a random client-side ID in `createEmptyRow()`) instead of relying on array index

### File: `src/components/ui/popover.tsx` (minor)

- Export `PopoverAnchor` from the existing popover component file (it's already available from `@radix-ui/react-popover` but not currently exported)
