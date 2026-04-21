import "server-only";

import { getServiceRoleSupabase } from "@/lib/supabase/server";
import type { InquiryRow } from "@/lib/supabase/types";

/**
 * Server-only helpers for the /engage inquiry flow. Uses the
 * service-role client so anonymous form submissions can land
 * without an authenticated Supabase session — RLS still blocks
 * reads, which only editorial can perform.
 */

export type InquiryInput = {
  target_kind: "skill" | "practitioner";
  target_slug: string;
  buyer_name: string;
  buyer_email: string;
  buyer_company?: string;
  buyer_role?: string;
  timeline?: string;
  brief: string;
  source?: string;
};

export async function insertInquiry(
  input: InquiryInput,
): Promise<
  | { ok: true; id: string; created_at: string }
  | { ok: false; error: string }
> {
  const supabase = getServiceRoleSupabase();
  if (!supabase) {
    return { ok: false, error: "Supabase is not configured on this deploy." };
  }
  const { data, error } = await supabase
    .from("inquiries")
    .insert({
      target_kind: input.target_kind,
      target_slug: input.target_slug,
      buyer_name: input.buyer_name.trim(),
      buyer_email: input.buyer_email.trim().toLowerCase(),
      buyer_company: nullable(input.buyer_company),
      buyer_role: nullable(input.buyer_role),
      timeline: nullable(input.timeline),
      brief: input.brief.trim(),
      source: nullable(input.source),
    })
    .select("id, created_at")
    .single();
  if (error || !data) {
    return { ok: false, error: error?.message ?? "unknown insert error" };
  }
  return { ok: true, id: data.id, created_at: data.created_at };
}

export type InquiryRowFull = InquiryRow;

function nullable(v: string | undefined): string | null {
  if (!v) return null;
  const t = v.trim();
  return t.length === 0 ? null : t;
}
