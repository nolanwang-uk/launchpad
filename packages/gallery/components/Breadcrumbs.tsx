import Link from "next/link";

type Crumb = { label: string; href?: string };

/**
 * Editorial breadcrumb rail. Separator is a centered dot rather than
 * a slash to stay quiet. Current page (last crumb without `href`) is
 * rendered in display font, everything prior in quiet ink.
 */
export function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav
      aria-label="Breadcrumb"
      className="text-[11px] uppercase tracking-[0.16em] text-[color:var(--color-fg-subtle)] flex flex-wrap items-center gap-x-2 gap-y-1"
    >
      {items.map((c, i) => {
        const isLast = i === items.length - 1;
        return (
          <span key={i} className="flex items-center gap-x-2">
            {c.href && !isLast ? (
              <Link
                href={c.href}
                className="hover:text-[color:var(--color-fg)] transition-colors"
              >
                {c.label}
              </Link>
            ) : (
              <span className="text-[color:var(--color-fg)] font-[family-name:var(--font-display)] tracking-[0.02em] normal-case text-sm">
                {c.label}
              </span>
            )}
            {!isLast && <span aria-hidden="true">·</span>}
          </span>
        );
      })}
    </nav>
  );
}
