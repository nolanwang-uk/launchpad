import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { SUPABASE_ANON_KEY, SUPABASE_ENABLED, SUPABASE_URL } from "./env";

/**
 * Session-refresh middleware. Runs before every matched request,
 * exchanges the auth cookie for a refreshed session, and propagates
 * the new cookies onto the response. No-op when Supabase env vars
 * are absent.
 */
export async function updateSession(request: NextRequest) {
  if (!SUPABASE_ENABLED) {
    return NextResponse.next({ request });
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  // Touch the auth state to refresh the cookie.
  await supabase.auth.getUser();
  return response;
}
