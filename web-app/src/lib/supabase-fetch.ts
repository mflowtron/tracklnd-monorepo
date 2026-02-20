import { supabase } from '@/integrations/supabase/client';

export function withTimeout<T>(promise: PromiseLike<T>, ms = 10000): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Request timed out after ${ms}ms`)), ms);
    promise.then(
      (val) => { clearTimeout(timer); resolve(val); },
      (err) => { clearTimeout(timer); reject(err); }
    );
  });
}

/**
 * Returns true when a Supabase PostgREST error looks like an auth/JWT
 * problem. PostgREST returns 401 and rejects the *entire* request when the
 * JWT is expired or malformed — even for tables with permissive RLS
 * policies like USING(true).
 */
function isAuthError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const msg = String((error as any).message || '').toLowerCase();
  const code = String((error as any).code || '');
  return (
    msg.includes('jwt expired') ||
    msg.includes('jwt') && msg.includes('invalid') ||
    msg.includes('token is expired') ||
    msg.includes('invalid claim') ||
    code === 'PGRST301'
  );
}

/**
 * Deduplicates concurrent refreshSession() calls.  When multiple queries
 * detect an expired JWT at the same time, only one refresh actually runs;
 * all callers await the same promise.
 */
let refreshPromise: Promise<boolean> | null = null;

function refreshSessionOnce(): Promise<boolean> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = supabase.auth
    .refreshSession()
    .then(({ data, error }) => {
      refreshPromise = null;
      if (error || !data.session) {
        console.error('fetchWithRetry: session refresh failed, signing out');
        supabase.auth.signOut();
        return false;
      }
      return true;
    })
    .catch((err) => {
      refreshPromise = null;
      console.error('fetchWithRetry: session refresh threw:', err);
      supabase.auth.signOut();
      return false;
    });

  return refreshPromise;
}

/**
 * Wraps a Supabase query with timeout and retry logic.
 *
 * Unlike the previous version, this correctly handles Supabase responses
 * which return { data, error } instead of throwing.  When a JWT/auth error
 * is detected the helper forces a session refresh and retries the query.
 */
export async function fetchWithRetry<T>(
  fn: () => PromiseLike<T>,
  retries = 2,
  timeoutMs = 10000
): Promise<T> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const result = await withTimeout(fn(), timeoutMs);

      // Detect auth errors inside Supabase-style { data, error } responses.
      const maybeError = (result as any)?.error;
      if (maybeError && isAuthError(maybeError) && attempt < retries) {
        console.warn(
          `Auth error on attempt ${attempt + 1}/${retries + 1}, refreshing session and retrying…`
        );
        const refreshed = await refreshSessionOnce();
        if (!refreshed) {
          // Refresh failed and user was signed out — return the error as-is
          // so callers see the original auth error instead of retrying forever.
          return result;
        }
        // Small back-off so the refreshed token propagates.
        await new Promise(r => setTimeout(r, 500 * (attempt + 1)));
        continue;
      }

      return result;
    } catch (err) {
      // Network/timeout errors — retry with exponential back-off.
      if (attempt === retries) throw err;
      await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
    }
  }
  throw new Error('Unreachable');
}
