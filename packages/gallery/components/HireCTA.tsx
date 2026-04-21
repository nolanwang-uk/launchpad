import Link from "next/link";

/**
 * The primary marketplace CTA. Points to /engage/[skill] on per-skill
 * pages, /engage/practitioner-[slug] on practitioner-profile pages.
 * Styled as a solid accent button (forest green) to stand apart from
 * "Install" (dark pill) and "Source" (quiet link). Price shown to the
 * right if present — otherwise a descriptive verb ("Free · request an
 * engagement").
 */

type Variant = "primary" | "secondary";
type Size = "md" | "lg";

export function HireCTA({
  href,
  label = "Hire this practitioner",
  priceLabel,
  variant = "primary",
  size = "md",
  newTab = false,
}: {
  href: string;
  label?: string;
  priceLabel?: string;
  variant?: Variant;
  size?: Size;
  newTab?: boolean;
}) {
  const sizing =
    size === "lg"
      ? "text-sm md:text-base px-6 py-3 min-h-[48px]"
      : "text-sm px-4 py-2.5 min-h-[44px]";

  const styles =
    variant === "primary"
      ? [
          "bg-[color:var(--color-accent)] text-[color:var(--color-accent-fg)]",
          "hover:bg-[color:var(--color-accent-hover)]",
        ]
      : [
          "bg-transparent text-[color:var(--color-accent)]",
          "border border-[color:var(--color-accent)]",
          "hover:bg-[color:var(--color-accent)] hover:text-[color:var(--color-accent-fg)]",
        ];

  return (
    <Link
      href={href}
      {...(newTab ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      className={[
        "inline-flex items-center justify-center gap-3",
        "font-medium tracking-[0.02em]",
        "transition-colors duration-150",
        sizing,
        ...styles,
      ].join(" ")}
    >
      <span>{label}</span>
      {priceLabel && (
        <span
          className={[
            "text-[11px] uppercase tracking-[0.12em] opacity-80",
            "border-l",
            variant === "primary"
              ? "border-l-[color:var(--color-accent-fg)]/30"
              : "border-l-[color:var(--color-accent)]/40",
            "pl-3",
          ].join(" ")}
        >
          {priceLabel}
        </span>
      )}
    </Link>
  );
}

export function formatEngagementPrice(cents?: number): string {
  if (cents === undefined || cents === 0) return "Free to install";
  const dollars = cents / 100;
  if (dollars >= 100) return `From $${Math.round(dollars)}`;
  return `From $${dollars.toFixed(dollars < 10 ? 2 : 0)}`;
}
