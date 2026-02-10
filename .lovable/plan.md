

# Fix Silent Supabase Request Hangs

## Problem

The Supabase JS client's `fetch` calls are silently hanging -- they never resolve or reject. This means:
- `.then()` callbacks never fire, so `loading` stays `true` forever
- No console errors appear because nothing throws
- Pages show skeleton loaders indefinitely

## Root Cause

The `fetch()` API has no built-in timeout. When the backend instance is cold or the connection stalls, `fetch` hangs indefinitely. The Supabase JS client does not add timeouts by default.

## Solution

Create a wrapper utility that adds `AbortController` timeouts to the Supabase client's `fetch`, and add retry logic to all data-fetching pages.

### 1. Create `src/lib/supabase-fetch.ts` -- Timeout Wrapper

A utility function that wraps any Supabase query promise with an `AbortSignal` timeout. If a request takes longer than 10 seconds, it aborts and throws a clear error. Also includes a `fetchWithRetry` helper that retries up to 2 times with exponential backoff.

### 2. Update `src/integrations/supabase/client.ts` -- NO CHANGE

This file is auto-generated and must not be edited. Instead, the Supabase client supports a custom `fetch` option. However since we cannot edit client.ts, we will wrap at the call site level.

### 3. Update `src/pages/public/HomePage.tsx`

- Wrap each Supabase query call with a `Promise.race` against a timeout
- Add `console.log('HomePage: fetching data...')` at effect start for debuggability
- Add `console.log('HomePage: fetch complete')` after `Promise.allSettled` resolves
- If all fetches timeout/fail, show an error state with a "Retry" button instead of permanent skeletons

### 4. Update `src/pages/public/MeetsPage.tsx`

- Same timeout wrapping pattern
- Add retry button on failure
- Add debug logging

### 5. Update `src/pages/public/MeetDetailPage.tsx`

- Same timeout wrapping pattern
- Already has error state UI from previous changes, ensure it triggers on timeout

### 6. Update `src/pages/dashboard/OverviewPage.tsx`

- Same timeout wrapping pattern
- Add retry button on failure

### 7. Update `src/contexts/AuthContext.tsx`

- Wrap `getSession()` with a timeout (it currently has an 8s safety timeout for the loading state, but `getSession()` itself can hang silently)
- Wrap `fetchProfile()` and `fetchRole()` with timeouts
- Add debug logging: `console.log('Auth: initializing...')`, `console.log('Auth: session resolved')`

## Technical Details

### Timeout Utility (`src/lib/supabase-fetch.ts`)

```typescript
export function withTimeout<T>(promise: PromiseLike<T>, ms = 10000): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Request timed out after ${ms}ms`)), ms);
    promise.then(
      (val) => { clearTimeout(timer); resolve(val); },
      (err) => { clearTimeout(timer); reject(err); }
    );
  });
}

export async function fetchWithRetry<T>(
  fn: () => PromiseLike<T>,
  retries = 2,
  timeoutMs = 10000
): Promise<T> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await withTimeout(fn(), timeoutMs);
    } catch (err) {
      if (attempt === retries) throw err;
      await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
    }
  }
  throw new Error('Unreachable');
}
```

### Usage Pattern in Pages

Before:
```typescript
supabase.from('meets').select('*').order(...)
  .then(({ data }) => setMeets(data || []))
```

After:
```typescript
fetchWithRetry(() => supabase.from('meets').select('*').order(...))
  .then(({ data }) => setMeets(data || []))
  .catch(err => { console.error('Failed:', err); setError(true); })
  .finally(() => setLoading(false));
```

### Error/Retry UI

Each page gets an error state with a retry button:
```
Something went wrong loading this content.
[Try Again]
```

Clicking "Try Again" re-runs the data fetch.

### Files Modified
- `src/lib/supabase-fetch.ts` (new)
- `src/pages/public/HomePage.tsx`
- `src/pages/public/MeetsPage.tsx`
- `src/pages/public/MeetDetailPage.tsx`
- `src/pages/dashboard/OverviewPage.tsx`
- `src/contexts/AuthContext.tsx`
