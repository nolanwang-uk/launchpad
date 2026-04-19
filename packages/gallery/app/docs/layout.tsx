import Link from "next/link";
import { loadAllDocs } from "@/lib/docs";

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  const docs = loadAllDocs();

  return (
    <div className="min-h-screen">
      <nav className="max-w-6xl mx-auto px-6 py-5 flex items-center justify-between">
        <Link
          href="/"
          className="font-semibold text-lg tracking-[color:var(--tracking-display-tight)]"
        >
          launchpad
        </Link>
        <div className="flex items-center gap-6 text-sm text-[color:var(--color-fg-muted)]">
          <Link href="/docs" className="hover:text-[color:var(--color-fg)]">
            docs
          </Link>
          <a
            href="https://github.com/launchpad-skills/launchpad"
            className="hover:text-[color:var(--color-fg)]"
          >
            github
          </a>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-6 py-10 grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-12">
        <aside className="lg:sticky lg:top-6 self-start text-sm">
          <p className="text-xs uppercase tracking-widest text-[color:var(--color-fg-subtle)] mb-4">
            Documentation
          </p>
          <ul className="space-y-1.5">
            {docs.map((d) => (
              <li key={d.slug}>
                <Link
                  href={`/docs/${d.slug}`}
                  className="block py-1 text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-fg)] transition-colors"
                >
                  {d.title}
                </Link>
              </li>
            ))}
          </ul>
        </aside>

        <main className="min-w-0">{children}</main>
      </div>
    </div>
  );
}
