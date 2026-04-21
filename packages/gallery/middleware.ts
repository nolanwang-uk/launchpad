import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

/**
 * Wires the Supabase session-refresh middleware into every
 * non-asset request. When Supabase env vars are absent this is a
 * no-op, so dev without a database still works.
 */
export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    // Skip static assets + the registry.json route.
    "/((?!_next/static|_next/image|favicon.ico|og/.*|.*\\..*|registry\\.json).*)",
  ],
};
