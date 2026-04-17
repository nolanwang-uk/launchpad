import type { Tier } from "@launchpad/registry";

const REVIEWED_ARIA =
  "Reviewed tier: maintainer audited this skill against a published checklist using closed-grammar install commands. Does not guarantee bug-free behavior.";
const COMMUNITY_ARIA =
  "Community tier: PR-accepted by the registry. Diff shown before install. No maintainer audit.";

export function TierBadge({
  tier,
  size = "sm",
}: {
  tier: Tier;
  size?: "sm" | "md";
}) {
  const base =
    size === "md"
      ? "text-xs px-2.5 py-1 gap-1.5"
      : "text-[11px] px-2 py-0.5 gap-1";

  if (tier === "Reviewed") {
    return (
      <span
        aria-label={REVIEWED_ARIA}
        className={[
          "inline-flex items-center rounded-full font-medium",
          "bg-[color:var(--color-tier-reviewed)] text-[color:var(--color-tier-reviewed-fg)]",
          "border-l-[3px] border-l-white/40",
          base,
        ].join(" ")}
      >
        <CheckGlyph />
        <span>Reviewed</span>
      </span>
    );
  }

  return (
    <span
      aria-label={COMMUNITY_ARIA}
      className={[
        "inline-flex items-center rounded-full font-medium",
        "bg-transparent text-[color:var(--color-fg-muted)]",
        "border border-[color:var(--color-border-strong)]",
        base,
      ].join(" ")}
    >
      <BranchGlyph />
      <span>Community</span>
    </span>
  );
}

function CheckGlyph() {
  return (
    <svg
      aria-hidden="true"
      width="10"
      height="10"
      viewBox="0 0 16 16"
      fill="none"
    >
      <path
        d="M13 4L6 11.5L3 8.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function BranchGlyph() {
  return (
    <svg
      aria-hidden="true"
      width="10"
      height="10"
      viewBox="0 0 16 16"
      fill="none"
    >
      <circle cx="5" cy="4" r="1.5" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="11" cy="4" r="1.5" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="5" cy="12" r="1.5" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M5 5.5v5M11 5.5c0 3-3 3.5-6 5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
