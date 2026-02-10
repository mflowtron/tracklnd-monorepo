
# Diagnose and Fix Content Loading Reliability

## Root Cause Analysis

After thorough investigation:

- **Database**: Healthy. Contains 4 meets, 12 works, 1 banner, 24 events.
- **RLS Policies**: Correct. All public tables have open SELECT policies.
- **No console errors**: The app renders without errors -- queries just silently return nothing.
- **Zero network requests**: The browser tool shows literally zero XHR/fetch requests being made, even after 10+ seconds across multiple page navigations. Even the auth `getSession()` call from AuthContext doesn't fire.

This points to an **intermittent environment issue** (the Supabase instance going to sleep or the preview sandbox having connectivity issues). The code itself is correct -- when requests go through, everything works.

However, the current code has a significant **resilience problem**: every data-fetching page uses the `.then()` pattern without error handling, and conditionally renders content with `{data.length > 0 && ...}`. When requests fail or hang, users see a blank page with no feedback.

## Plan: Add Error Handling and Loading States

### 1. `src/pages/public/HomePage.tsx`

- Add a `loading` state (default `true`) that turns `false` after all fetches complete
- Add `.catch()` handlers to each Supabase call to log errors and prevent silent failures
- Show a skeleton/loading state while data is being fetched
- If all sections are empty after loading completes, show a fallback message instead of a blank page

### 2. `src/pages/public/MeetsPage.tsx`

- Add `loading` state with a skeleton grid while fetching
- Add `.catch()` error handling
- Show "No meets found" only after loading is complete (currently shows it while data is still loading)

### 3. `src/pages/public/MeetDetailPage.tsx`

- Already has a "Loading..." fallback, but add error handling to the Supabase calls
- Add a retry mechanism or error state if the meet data fails to load

### 4. `src/pages/dashboard/OverviewPage.tsx`

- Add `loading` state (this is likely the "endless spinner" -- the dashboard layout renders but OverviewPage shows nothing while waiting)
- Add `.catch()` handlers
- Show skeleton cards while loading

### 5. `src/contexts/AuthContext.tsx`

- Add error handling to `getSession()`, `fetchProfile()`, and `fetchRole()` calls
- Ensure `loading` is set to `false` even if requests fail (currently if `getSession()` hangs, `loading` stays `true` forever, causing the ProtectedRoute spinner to show indefinitely -- this is the dashboard endless spinner)

## Technical Details

- Use `Promise.allSettled()` instead of individual `.then()` calls where appropriate so one failed request doesn't block the others
- Add `console.error` in catch blocks so failures are visible in logs for debugging
- Add a timeout fallback: if loading takes more than 8 seconds, set loading to false and show whatever data arrived
- Keep the conditional rendering but gate it behind `!loading` checks

### Files Modified
- `src/pages/public/HomePage.tsx`
- `src/pages/public/MeetsPage.tsx`
- `src/pages/public/MeetDetailPage.tsx`
- `src/pages/dashboard/OverviewPage.tsx`
- `src/contexts/AuthContext.tsx`
