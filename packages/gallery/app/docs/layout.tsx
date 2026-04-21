import Link from "next/link";
import { loadAllDocs } from "@/lib/docs";

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  const docs = loadAllDocs();

  return (
    <div className="min-h-screen">
      <nav className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
        <Link
          href="/"
          className="font-[family-name:var(--font-display)] text-2xl tracking-[color:var(--tracking-display-tight)] py-3 inline-flex items-center min-h-[44px]"
        >
          Launchpad
        </Link>
        <div className="flex items-center gap-2 sm:gap-4 text-sm text-[color:var(--color-fg-muted)]">
          <Link
            href="/docs"
            className="hover:text-[color:var(--color-fg)] px-2 py-3 inline-flex items-center min-h-[44px]"
          >
            Docs
          </Link>
          <a
            href="https://github.com/nolanwang-uk/launchpad"
            className="hover:text-[color:var(--color-fg)] px-2 py-3 inline-flex items-center min-h-[44px]"
          >
            GitHub
          </a>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-6 py-10 grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-8 lg:gap-12">
        {/*
          Desktop: persistent sidebar, sticky.
          Mobile: collapsed <details> summary so the 7-link TOC doesn't push
          the actual doc content below the fold.
        */}
        <aside className="self-start text-sm lg:sticky lg:top-6">
          <details className="docs-nav group" open>
            <summary
              className={[
                "lg:hidden list-none cursor-pointer",
                "flex items-center justify-between",
                "px-4 py-3 rounded-md min-h-[44px]",
                "border border-[color:var(--color-border)]",
                "bg-[color:var(--color-bg-elevated)]",
                "text-[color:var(--color-fg-muted)]",
                "[&::-webkit-details-marker]:hidden",
              ].join(" ")}
            >
              <span className="text-xs uppercase tracking-widest">
                Documentation · {docs.length} pages
              </span>
              <span
                aria-hidden="true"
                className="text-[color:var(--color-fg-subtle)] transition-transform group-open:rotate-90"
              >
                ›
              </span>
            </summary>

            <p className="hidden lg:block text-xs uppercase tracking-widest text-[color:var(--color-fg-subtle)] mb-4">
              Documentation
            </p>
            <ul className="space-y-0.5 mt-2 lg:mt-0">
              {docs.map((d) => (
                <li key={d.slug}>
                  <Link
                    href={`/docs/${d.slug}`}
                    className="block py-2 px-2 -mx-2 rounded text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-fg)] hover:bg-[color:var(--color-bg-hover)] transition-colors min-h-[44px] flex items-center"
                  >
                    {d.title}
                  </Link>
                </li>
              ))}
            </ul>
          </details>
        </aside>

        <main id="main" className="min-w-0">
          {children}
        </main>
      </div>
    </div>
  );
}
