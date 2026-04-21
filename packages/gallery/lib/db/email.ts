import "server-only";

import { Resend } from "resend";
import { EDITORIAL_EMAIL } from "@/lib/editorial";

/**
 * Thin Resend wrapper. v1 sends a single editorial-notification
 * email per inbound form submission. Returns ok even when the key
 * is absent — the DB row is the source of truth, email is a
 * courtesy notification that editorial can re-derive from the row.
 */

const RESEND_API_KEY = process.env.RESEND_API_KEY?.trim() || "";
const SENDING_DOMAIN = process.env.RESEND_FROM?.trim() || "editorial@launchpad.dev";

let client: Resend | null = null;
function getResend() {
  if (RESEND_API_KEY.length === 0) return null;
  if (!client) client = new Resend(RESEND_API_KEY);
  return client;
}

export type EditorialEmail = {
  subject: string;
  /** Plain-text body. Multiline. */
  text: string;
};

export async function sendEditorialEmail(email: EditorialEmail): Promise<{
  ok: boolean;
  skipped?: boolean;
  error?: string;
}> {
  const resend = getResend();
  if (!resend) return { ok: true, skipped: true };
  try {
    const { error } = await resend.emails.send({
      from: `Launchpad editorial <${SENDING_DOMAIN}>`,
      to: [EDITORIAL_EMAIL],
      subject: email.subject,
      text: email.text,
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "send failed" };
  }
}
