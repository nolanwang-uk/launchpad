import Link from "next/link";

export default function NotFound() {
  return (
    <main
      id="main"
      className="min-h-screen flex items-center justify-center px-6 py-20"
    >
      <div className="max-w-xl text-center">
        <p className="text-[11px] uppercase tracking-[0.2em] text-[color:var(--color-fg-subtle)] mb-4">
          Unknown entry
        </p>
        <h1 className="font-[family-name:var(--font-display)] text-5xl md:text-7xl leading-[1.02] tracking-[color:var(--tracking-display-tight)] font-medium mb-6">
          404
        </h1>
        <p className="text-lg text-[color:var(--color-fg-muted)] leading-relaxed mb-10">
          This page is not in the current issue. Either the entry was
          retired, the URL was mistyped, or the practitioner hasn&rsquo;t
          been published yet.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/"
            className={[
              "inline-flex items-center min-h-[44px] px-5 py-2.5",
              "bg-[color:var(--color-accent)] text-[color:var(--color-accent-fg)]",
              "hover:bg-[color:var(--color-accent-hover)] transition-colors",
              "font-medium text-sm tracking-[0.02em]",
            ].join(" ")}
          >
            ← Back to the masthead
          </Link>
          <Link
            href="/#domains"
            className="inline-flex items-center min-h-[44px] px-3 py-2 text-sm text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-fg)] transition-colors"
          >
            Browse desks
          </Link>
        </div>
      </div>
    </main>
  );
}
