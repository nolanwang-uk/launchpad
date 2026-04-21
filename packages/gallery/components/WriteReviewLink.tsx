"use client";

import { EDITORIAL_EMAIL } from "@/lib/editorial";

/**
 * Mailto-based "write a review" entry point. Static site, no backend,
 * so reviews in v1 are editorial-curated: the reader emails the desk,
 * the desk confirms the reader has actually used the skill (ideally
 * via their engagement history), and publishes. Honest for the stage.
 */
export function WriteReviewLink({
  skillName,
  practitionerName,
}: {
  skillName: string;
  practitionerName: string;
}) {
  const subject = `[Launchpad] Reader note: ${skillName}`;
  const body = [
    `Reader note for: ${skillName}`,
    `Practitioner: ${practitionerName}`,
    "",
    "My role / why I used this:",
    "",
    "",
    "What I used it for:",
    "",
    "",
    "Rating (1–5):",
    "",
    "",
    "Two sentences the desk can publish:",
    "",
    "",
    "Sent via launchpad.dev",
  ].join("\n");
  const href = `mailto:${EDITORIAL_EMAIL}?subject=${encodeURIComponent(
    subject,
  )}&body=${encodeURIComponent(body)}`;

  return (
    <a
      href={href}
      className={[
        "inline-flex items-center gap-2 min-h-[44px] px-4 py-2.5",
        "text-sm font-medium text-[color:var(--color-accent)]",
        "border border-[color:var(--color-accent)]",
        "hover:bg-[color:var(--color-accent)] hover:text-[color:var(--color-accent-fg)]",
        "transition-colors",
      ].join(" ")}
    >
      <span aria-hidden="true">✍</span>
      Write a reader note
    </a>
  );
}
