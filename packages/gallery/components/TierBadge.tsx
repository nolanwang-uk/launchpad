import type { Tier } from "@launchpad/registry";

/**
 * Practitioners' Exchange tiering (D-direction):
 *   Reviewed (schema) → "Verified" in UI. Practitioner credential was
 *     checked by an editor and the install grammar is closed. Rendered
 *     as an antique-gold pill with a small seal glyph.
 *   Community (schema) → "Community". PR-accepted, diff shown at
 *     install. No editorial review. Rendered as an outlined pill.
 *
 * We intentionally don't use the word "Reviewed" in display: on an
 * exchange, what you're trading on is *who signed the work*, not
 * whether code was inspected.
 */

const VERIFIED_ARIA =
  "Verified practitioner: the author's professional credential was checked by the Launchpad editorial team and the install commands use a closed grammar vetted against common attack patterns.";
const COMMUNITY_ARIA =
  "Community: submitted via public PR, diff shown at install time. No editorial credential check.";

export function TierBadge({
  tier,
  size = "sm",
}: {
  tier: Tier;
  size?: "sm" | "md";
}) {
  const base =
    size === "md"
      ? "text-[11px] px-2.5 py-1 gap-1.5 tracking-[0.14em]"
      : "text-[10px] px-2 py-0.5 gap-1 tracking-[0.12em]";

  if (tier === "Reviewed") {
    return (
      <span
        aria-label={VERIFIED_ARIA}
        className={[
          "inline-flex items-center rounded-sm font-medium uppercase",
          "bg-[color:var(--color-tier-verified)] text-[color:var(--color-tier-verified-fg)]",
          base,
        ].join(" ")}
      >
        <SealGlyph />
        <span>Verified</span>
      </span>
    );
  }

  return (
    <span
      aria-label={COMMUNITY_ARIA}
      className={[
        "inline-flex items-center rounded-sm font-medium uppercase",
        "bg-transparent text-[color:var(--color-fg-muted)]",
        "border border-[color:var(--color-border-strong)]",
        base,
      ].join(" ")}
    >
      <DotGlyph />
      <span>Community</span>
    </span>
  );
}

function SealGlyph() {
  // Minimal editorial seal: concentric circle + inner tick. Hints at a
  // wax seal/credential stamp without being literal.
  return (
    <svg
      aria-hidden="true"
      width="10"
      height="10"
      viewBox="0 0 16 16"
      fill="none"
    >
      <circle
        cx="8"
        cy="8"
        r="6"
        stroke="currentColor"
        strokeWidth="1.3"
        fill="none"
      />
      <path
        d="M5.5 8.25L7.25 10L10.5 6.5"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function DotGlyph() {
  return (
    <svg
      aria-hidden="true"
      width="6"
      height="6"
      viewBox="0 0 8 8"
      fill="currentColor"
    >
      <circle cx="4" cy="4" r="2.5" />
    </svg>
  );
}
