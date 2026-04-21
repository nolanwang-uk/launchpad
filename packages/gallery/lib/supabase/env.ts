/**
 * Supabase env-var detection. Drives the dual-mode storage pattern:
 * when these are present the app uses live Supabase, when absent it
 * silently falls back to the localStorage mock so `bun dev` works
 * without any external credentials.
 *
 * Read via NEXT_PUBLIC_* so both server and client can check.
 */

export const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || "";
export const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() || "";

export const SUPABASE_ENABLED =
  SUPABASE_URL.length > 0 && SUPABASE_ANON_KEY.length > 0;

/**
 * Server-only: service-role key used for admin operations (inserting
 * inquiry/application rows from public forms, editorial queue moves).
 * Never import this from a client component — Next.js will throw.
 */
export const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || "";
