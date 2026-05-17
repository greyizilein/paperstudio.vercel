// Centralised authenticated edge-function fetch helpers.
// CRITICAL: Always sends the user's real session JWT as Authorization,
// not the publishable anon key. The backend uses this token to resolve
// the user's tier and admin status — sending the anon key makes every
// request look unauthenticated/free, which silently downgrades models
// and triggers false "credits exhausted" errors.

import { supabase } from "@/integrations/supabase/client";

const FUNCTIONS_BASE = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;
const ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

/**
 * Build the correct headers for an authenticated edge-function call.
 * Returns:
 *   - Authorization: Bearer <user session JWT>
 *   - apikey:        <anon publishable key>   (Supabase gateway requirement)
 *   - Content-Type:  application/json
 *
 * Throws if the user has no active session.
 */
export async function authedHeaders(extra?: Record<string, string>): Promise<Record<string, string>> {
  // Refresh the session first to avoid stale JWT 401s.
  const { error: refreshErr } = await supabase.auth.refreshSession();
  if (refreshErr) console.warn("edgeFetch session refresh failed:", refreshErr.message);

  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error("Not signed in. Please sign in again to continue.");
  }
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${session.access_token}`,
    apikey: ANON_KEY,
    ...(extra || {}),
  };
}

/**
 * Authenticated POST to an edge function. Returns the raw Response so
 * callers can stream, parse JSON, or read text as they need.
 */
export async function fetchEdge(
  fnName: string,
  body: unknown,
  init?: { signal?: AbortSignal; headers?: Record<string, string> },
): Promise<Response> {
  const headers = await authedHeaders(init?.headers);
  return fetch(`${FUNCTIONS_BASE}/${fnName}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
    signal: init?.signal,
  });
}

/** Convenience wrapper that POSTs and parses JSON, throwing on non-2xx. */
export async function postEdgeJson<T = any>(
  fnName: string,
  body: unknown,
  init?: { signal?: AbortSignal },
): Promise<T> {
  const resp = await fetchEdge(fnName, body, init);
  const text = await resp.text();
  if (!resp.ok) {
    let msg = text || resp.statusText;
    try { msg = JSON.parse(text)?.error || msg; } catch { /* ignore */ }
    throw new Error(`${fnName} failed (${resp.status}): ${msg}`);
  }
  try { return JSON.parse(text) as T; } catch { return text as unknown as T; }
}
