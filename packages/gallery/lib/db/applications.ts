import "server-only";

import { getServiceRoleSupabase } from "@/lib/supabase/server";

/**
 * /submit form handoff. Same pattern as inquiries — service-role
 * insert, editorial reads via dashboard (future work) or Resend
 * email (this session).
 */

export type ApplicationInput = {
  applicant_name: string;
  credential: string;
  domain: string;
  years_practice?: string;
  verification_ref: string;
  proposed_skill: string;
  links?: string;
};

export async function insertApplication(
  input: ApplicationInput,
): Promise<
  | { ok: true; id: string; created_at: string }
  | { ok: false; error: string }
> {
  const supabase = getServiceRoleSupabase();
  if (!supabase) {
    return { ok: false, error: "Supabase is not configured on this deploy." };
  }
  const { data, error } = await supabase
    .from("applications")
    .insert({
      applicant_name: input.applicant_name.trim(),
      credential: input.credential.trim(),
      domain: input.domain.trim(),
      years_practice: input.years_practice?.trim() || null,
      verification_ref: input.verification_ref.trim(),
      proposed_skill: input.proposed_skill.trim(),
      links: input.links?.trim() || null,
    })
    .select("id, created_at")
    .single();
  if (error || !data) {
    return { ok: false, error: error?.message ?? "unknown insert error" };
  }
  return { ok: true, id: data.id, created_at: data.created_at };
}
