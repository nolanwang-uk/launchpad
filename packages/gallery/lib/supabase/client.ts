"use client";

import { createBrowserClient } from "@supabase/ssr";
import { SUPABASE_ANON_KEY, SUPABASE_ENABLED, SUPABASE_URL } from "./env";
import type { Database } from "./types";

/**
 * Browser-side Supabase client. Singleton per page load. Cookie
 * handling is done by @supabase/ssr so auth state is shared with
 * the server components under the same origin.
 *
 * Returns null when Supabase env vars are absent — callers should
 * check and fall back to the localStorage mock.
 */

let cached: ReturnType<typeof createBrowserClient<Database>> | null = null;

export function getBrowserSupabase() {
  if (!SUPABASE_ENABLED) return null;
  if (cached) return cached;
  cached = createBrowserClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY);
  return cached;
}
