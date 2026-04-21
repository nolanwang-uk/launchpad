import "server-only";

import { getServiceRoleSupabase } from "@/lib/supabase/server";
import type { ReviewRow } from "@/lib/supabase/types";

/**
 * Reader-note submission + read helpers.
 *
 * v1 policy:
 * - Anyone can submit a reader note via /api/reader-note. Inserts
 *   land with status='pending'. The reviewer_user_id is nullable
 *   for v1 because we don't force sign-in yet — we just capture
 *   reviewer + skill + body + rating for editorial to moderate.
 *   (The column itself is non-null in the migration; we'll relax
 *   that in a v1.1 migration once the submit flow is hardened.)
 * - Published reviews read from anon.
 */

export type ReaderNoteInput = {
  skill_name: string;
  reviewer_user_id: string; // required by schema
  rating: number;
  body: string;
};

export async function insertReaderNote(
  input: ReaderNoteInput,
): Promise<
  | { ok: true; id: string; created_at: string }
  | { ok: false; error: string }
> {
  const supabase = getServiceRoleSupabase();
  if (!supabase) {
    return { ok: false, error: "Supabase is not configured on this deploy." };
  }
  if (input.rating < 0 || input.rating > 5) {
    return { ok: false, error: "rating out of range" };
  }
  if (input.body.length < 10 || input.body.length > 600) {
    return { ok: false, error: "body must be 10-600 chars" };
  }
  const { data, error } = await supabase
    .from("reviews")
    .insert({
      reviewer_user_id: input.reviewer_user_id,
      skill_name: input.skill_name,
      rating: input.rating,
      body: input.body.trim(),
      status: "pending",
    })
    .select("id, created_at")
    .single();
  if (error || !data) {
    return { ok: false, error: error?.message ?? "unknown insert error" };
  }
  return { ok: true, id: data.id, created_at: data.created_at };
}

export async function listPublishedReviewsForSkill(
  skillName: string,
  limit = 20,
): Promise<ReviewRow[]> {
  const supabase = getServiceRoleSupabase();
  if (!supabase) return [];
  const { data } = await supabase
    .from("reviews")
    .select("*")
    .eq("skill_name", skillName)
    .eq("status", "published")
    .order("created_at", { ascending: false })
    .limit(limit);
  return data ?? [];
}
