import Link from "next/link";
import type { Integration } from "@launchpad/registry";
import { directionGlyph, labelFor } from "@/lib/integrations";

/**
 * Single integration chip. Links to /all?integration=<kind> so
 * clicking an integration anywhere in the gallery surfaces every
 * skill declaring it. Direction glyph sits inside the pill; caller
 * can hide it via compact=true when space is tight (card rows).
 */
export function IntegrationBadge({
  integration,
  compact = false,
  asLink = true,
}: {
  integration: Integration;
  compact?: boolean;
  asLink?: boolean;
}) {
  const label = labelFor(integration.kind);
  const glyph = directionGlyph(integration.direction);
  const pillClass = [
    "inline-flex items-center gap-1.5",
    "border border-[color:var(--color-border-strong)]",
    "bg-[color:var(--color-bg-elevated)]",
    "text-[color:var(--color-fg)]",
    "text-[11px] uppercase tracking-[0.12em]",
    "px-2 py-0.5 min-h-[24px]",
    asLink
      ? "hover:border-[color:var(--color-accent)] hover:text-[color:var(--color-accent)] transition-colors"
      : "",
  ].join(" ");
  const inner = (
    <>
      <span
        aria-hidden="true"
        className="text-[color:var(--color-gold)] tracking-normal"
        title={integration.direction}
      >
        {glyph}
      </span>
      <span>{label}</span>
      {!compact && integration.note && (
        <span className="text-[color:var(--color-fg-subtle)] normal-case tracking-normal ml-1">
          · {integration.note}
        </span>
      )}
    </>
  );
  return asLink ? (
    <Link
      href={`/all?integration=${integration.kind}`}
      className={pillClass}
      aria-label={`${integration.direction} ${label} — see other skills with this integration`}
    >
      {inner}
    </Link>
  ) : (
    <span className={pillClass}>{inner}</span>
  );
}

/**
 * Integration list, grouped by read / write / both. Used on the
 * per-skill masthead where "how this skill connects" gets a whole
 * block, not just a chip row.
 */
export function IntegrationList({
  integrations,
  asLinks = true,
}: {
  integrations: readonly Integration[];
  asLinks?: boolean;
}) {
  if (integrations.length === 0) return null;
  return (
    <ul className="flex flex-wrap gap-2">
      {integrations.map((it, i) => (
        <li key={`${it.kind}-${i}`}>
          <IntegrationBadge integration={it} asLink={asLinks} />
        </li>
      ))}
    </ul>
  );
}
