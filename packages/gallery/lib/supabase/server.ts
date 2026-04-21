import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import {
  SUPABASE_ANON_KEY,
  SUPABASE_ENABLED,
  SUPABASE_SERVICE_ROLE_KEY,
  SUPABASE_URL,
} from "./env";
import type { Database } from "./types";

/**
 * Server-component and route-handler Supabase client. Cookie store
 * from next/headers is bridged into @supabase/ssr so auth.getUser()
 * returns the signed-in user without an extra network hop.
 *
 * The inner try/catch around cookies().set() is boilerplate from the
 * @supabase/ssr docs — calling set() from a server component is an
 * error in Next.js but the ssr helper still probes it on refresh.
 */

export async function getServerSupabase() {
  if (!SUPABASE_ENABLED) return null;
  const cookieStore = await cookies();
  return createServerClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Server components can't set cookies — the refresh will
          // happen on the next real request via middleware.
        }
      },
    },
  });
}

/**
 * Service-role admin client. Bypasses RLS. Only ever import from
 * server-only API routes and never pass its result to a client
 * component. Returns null if the service-role env var is missing.
 */
export function getServiceRoleSupabase() {
  if (!SUPABASE_ENABLED || SUPABASE_SERVICE_ROLE_KEY.length === 0) return null;
  return createServerClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    cookies: {
      getAll() {
        return [];
      },
      setAll() {
        /* no-op — service-role never reads or writes session cookies */
      },
    },
  });
}
