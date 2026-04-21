import { NextResponse, type NextRequest } from "next/server";
import {
  insertApplication,
  type ApplicationInput,
} from "@/lib/db/applications";
import { sendEditorialEmail } from "@/lib/db/email";

export const runtime = "nodejs";

/**
 * POST /api/application — practitioner onboarding application.
 * Body: ApplicationInput.
 */
export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("invalid JSON body");
  }
  if (typeof body !== "object" || body === null) {
    return fail("body must be an object");
  }
  const b = body as Record<string, unknown>;

  const applicant_name = str(b.applicant_name);
  const credential = str(b.credential);
  const domain = str(b.domain);
  const verification_ref = str(b.verification_ref);
  const proposed_skill = str(b.proposed_skill);

  if (!applicant_name || applicant_name.length > 160) {
    return fail("applicant_name required (<=160 chars)");
  }
  if (!credential || credential.length > 300) {
    return fail("credential required (<=300 chars)");
  }
  if (!domain || domain.length > 80) {
    return fail("domain required");
  }
  if (!verification_ref || verification_ref.length > 2000) {
    return fail("verification_ref required (<=2000 chars)");
  }
  if (
    !proposed_skill ||
    proposed_skill.length < 10 ||
    proposed_skill.length > 4000
  ) {
    return fail("proposed_skill required (10-4000 chars)");
  }

  const input: ApplicationInput = {
    applicant_name,
    credential,
    domain,
    years_practice: str(b.years_practice),
    verification_ref,
    proposed_skill,
    links: str(b.links),
  };

  const insert = await insertApplication(input);
  if (!insert.ok) {
    return NextResponse.json({ ok: false, error: insert.error }, { status: 503 });
  }

  const subject = `[Launchpad] Practitioner application · ${input.applicant_name}`;
  const text = [
    `A new practitioner application was submitted.`,
    ``,
    `Name:          ${input.applicant_name}`,
    `Credential:    ${input.credential}`,
    `Domain:        ${input.domain}`,
    input.years_practice ? `Years:         ${input.years_practice}` : null,
    ``,
    `Verification:`,
    input.verification_ref,
    ``,
    `Proposed skill:`,
    input.proposed_skill,
    ``,
    input.links ? `Links: ${input.links}` : null,
    ``,
    `---`,
    `Application id: ${insert.id}`,
    `Received:       ${insert.created_at}`,
  ]
    .filter(Boolean)
    .join("\n");
  void sendEditorialEmail({ subject, text });

  return NextResponse.json({ ok: true, id: insert.id });
}

function str(v: unknown): string | undefined {
  if (typeof v !== "string") return undefined;
  const t = v.trim();
  return t.length === 0 ? undefined : t;
}

function fail(message: string) {
  return NextResponse.json({ ok: false, error: message }, { status: 400 });
}
