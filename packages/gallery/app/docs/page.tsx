import Link from "next/link";
import { loadAllDocs } from "@/lib/docs";

export const metadata = {
  title: "Docs — launchpad",
  description: "Everything you need to author, publish, install, and verify Claude Code skills with Launchpad.",
};

export default function DocsIndex() {
  const docs = loadAllDocs();
  return (
    <div>
      <h1 className="text-4xl md:text-5xl font-semibold tracking-[color:var(--tracking-display-tight)] mb-6">
        Docs
      </h1>
      <p className="text-lg text-[color:var(--color-fg-muted)] mb-12 max-w-2xl leading-relaxed">
        Seven pages. Everything you need to author, publish, install, and verify
        skills with Launchpad. Start from the top.
      </p>

      <ul className="space-y-4 max-w-2xl">
        {docs.map((d) => (
          <li key={d.slug}>
            <Link
              href={`/docs/${d.slug}`}
              className="block p-5 rounded-lg border border-[color:var(--color-border)] bg-[color:var(--color-bg-elevated)] hover:bg-[color:var(--color-bg-hover)] hover:border-[color:var(--color-border-strong)] transition-colors"
            >
              <h2 className="font-semibold text-lg mb-1 tracking-[color:var(--tracking-display-tight)]">
                {d.title}
              </h2>
              {d.summary && (
                <p className="text-sm text-[color:var(--color-fg-muted)]">
                  {d.summary}
                </p>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
