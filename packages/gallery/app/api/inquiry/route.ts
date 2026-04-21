import { NextResponse, type NextRequest } from "next/server";
import { insertInquiry, type InquiryInput } from "@/lib/db/inquiries";
import { sendEditorialEmail } from "@/lib/db/email";

export const runtime = "nodejs";

/**
 * POST /api/inquiry
 * Body: InquiryInput (see lib/db/inquiries.ts)
 * Inserts a row in public.inquiries, then fires a best-effort
 * Resend email to editorial. The DB insert is authoritative; the
 * email is a convenience.
 */

const VALID_KINDS = new Set(["skill", "practitioner"]);
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

  const target_kind = str(b.target_kind);
  const target_slug = str(b.target_slug);
  const buyer_name = str(b.buyer_name);
  const buyer_email = str(b.buyer_email);
  const brief = str(b.brief);

  if (!target_kind || !VALID_KINDS.has(target_kind)) {
    return fail("target_kind must be 'skill' or 'practitioner'");
  }
  if (!target_slug || target_slug.length > 120) {
    return fail("target_slug required (<=120 chars)");
  }
  if (!buyer_name || buyer_name.length < 1 || buyer_name.length > 160) {
    return fail("buyer_name required (1-160 chars)");
  }
  if (!buyer_email || !EMAIL_RE.test(buyer_email)) {
    return fail("buyer_email must be a valid email");
  }
  if (!brief || brief.length < 10 || brief.length > 4000) {
    return fail("brief required (10-4000 chars)");
  }

  const input: InquiryInput = {
    target_kind: target_kind as InquiryInput["target_kind"],
    target_slug,
    buyer_name,
    buyer_email,
    buyer_company: str(b.buyer_company),
    buyer_role: str(b.buyer_role),
    timeline: str(b.timeline),
    brief,
    source: str(b.source),
  };

  const insert = await insertInquiry(input);
  if (!insert.ok) {
    return NextResponse.json({ ok: false, error: insert.error }, { status: 503 });
  }

  // Fire-and-forget email; don't block the response.
  const subject = `[Launchpad] Inquiry · ${input.target_kind} · ${input.target_slug}`;
  const text = [
    `A new engagement inquiry was submitted.`,
    ``,
    `Target: ${input.target_kind} / ${input.target_slug}`,
    `From:   ${input.buyer_name} <${input.buyer_email}>`,
    input.buyer_role ? `Role:   ${input.buyer_role}` : null,
    input.buyer_company ? `Co.:    ${input.buyer_company}` : null,
    input.timeline ? `When:   ${input.timeline}` : null,
    ``,
    `Brief:`,
    input.brief,
    ``,
    `---`,
    `Inquiry id: ${insert.id}`,
    `Received:   ${insert.created_at}`,
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
