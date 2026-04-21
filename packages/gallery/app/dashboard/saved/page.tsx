"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { RegistryEntry } from "@launchpad/registry";
import { useAuth } from "@/lib/auth/context";
import { savedForUser, toggleSaved } from "@/lib/auth/storage";
import { PractitionerMark } from "@/components/PractitionerMark";
import { StarRating } from "@/components/StarRating";
import { TierBadge } from "@/components/TierBadge";

/**
 * Saved-skills list. Client component because saved state lives in
 * localStorage. Reads full entry metadata from an embedded registry
 * snapshot exposed on the global window — avoids re-importing the
 * server-only loader. In practice the saved list is always small,
 * so we fetch the entries on mount by asking every registry-backed
 * page we already prerendered.
 *
 * For v1 we take a pragmatic shortcut: fetch the bundled registry
 * JSON served alongside the build as `/registry.json`.
 */
type SavedRow = {
  entry: RegistryEntry;
  saved_at: string;
};

export default function SavedPage() {
  const { user } = useAuth();
  const [registry, setRegistry] = useState<RegistryEntry[]>([]);
  const [rows, setRows] = useState<SavedRow[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    // Fetch the public registry JSON at runtime so we can look up
    // each saved skill's metadata. The file is also read at build
    // time for SSG pages; fetching it here keeps client bundles small.
    fetch("/registry.json")
      .then((r) => (r.ok ? r.json() : { entries: [] }))
      .then((j) => {
        setRegistry(Array.isArray(j.entries) ? j.entries : []);
      })
      .catch(() => setRegistry([]))
      .finally(() => setLoaded(true));
  }, []);

  useEffect(() => {
    if (!user || registry.length === 0) return;
    const saved = savedForUser(user.id);
    const byName = new Map(registry.map((e) => [e.name, e]));
    setRows(
      saved
        .map((s) => {
          const entry = byName.get(s.skill_name);
          if (!entry) return null;
          return { entry, saved_at: s.saved_at };
        })
        .filter((r): r is SavedRow => r !== null),
    );
  }, [user, registry]);

  const empty = useMemo(() => loaded && rows.length === 0, [loaded, rows]);

  if (!user) return null;

  const onRemove = (skillName: string) => {
    toggleSaved(user.id, skillName);
    setRows((prev) => prev.filter((r) => r.entry.name !== skillName));
  };

  return (
    <div>
      <header className="mb-8">
        <p className="text-[11px] uppercase tracking-[0.2em] text-[color:var(--color-fg-subtle)] mb-3">
          Saved
        </p>
        <h1 className="font-[family-name:var(--font-display)] text-4xl md:text-5xl leading-[1.02] tracking-[color:var(--tracking-display-tight)] font-medium">
          Your shortlist.
        </h1>
        <p className="mt-4 text-[color:var(--color-fg-muted)] leading-relaxed max-w-2xl">
          Skills you&rsquo;ve bookmarked for later.
        </p>
      </header>

      {empty ? (
        <div className="border border-dashed border-[color:var(--color-border-strong)] p-10 text-center">
          <p className="font-[family-name:var(--font-display)] text-xl mb-2">
            Nothing saved yet.
          </p>
          <p className="text-sm text-[color:var(--color-fg-muted)] mb-4">
            Click the ♡ icon on any skill page or card to bookmark it.
          </p>
          <Link
            href="/all"
            className="inline-flex items-center text-sm text-[color:var(--color-accent)] underline decoration-[color:var(--color-border-strong)] underline-offset-4"
          >
            Browse the exchange →
          </Link>
        </div>
      ) : !loaded ? (
        <p className="text-sm text-[color:var(--color-fg-subtle)]">
          Loading saved skills…
        </p>
      ) : (
        <ul className="divide-y divide-[color:var(--color-border)] border-t border-b border-[color:var(--color-border)]">
          {rows.map((r) => (
            <li key={r.entry.name} className="py-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <Link
                  href={`/s/${r.entry.name}`}
                  className="flex items-start gap-3 min-w-0 flex-1 group"
                >
                  <PractitionerMark name={r.entry.author} size="sm" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <h3 className="font-[family-name:var(--font-display)] text-xl leading-tight group-hover:text-[color:var(--color-accent)] transition-colors">
                        {r.entry.name}
                      </h3>
                      <TierBadge tier={r.entry.tier} />
                    </div>
                    <p className="text-sm text-[color:var(--color-fg-muted)] leading-relaxed line-clamp-2 max-w-3xl">
                      {r.entry.description}
                    </p>
                    <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] uppercase tracking-[0.14em] text-[color:var(--color-fg-subtle)]">
                      <span>by {r.entry.author}</span>
                      {typeof r.entry.rating === "number" &&
                        (r.entry.reviews_count ?? 0) > 0 && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="normal-case tracking-normal">
                              <StarRating
                                value={r.entry.rating}
                                reviewsCount={r.entry.reviews_count}
                              />
                            </span>
                          </>
                        )}
                      <span aria-hidden="true">·</span>
                      <span>saved {formatRelative(r.saved_at)}</span>
                    </p>
                  </div>
                </Link>
                <button
                  type="button"
                  onClick={() => onRemove(r.entry.name)}
                  className="shrink-0 text-xs uppercase tracking-[0.14em] text-[color:var(--color-fg-muted)] hover:text-[#7b1f1f] px-3 py-2 min-h-[40px] transition-colors"
                >
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function formatRelative(iso: string): string {
  const at = Date.parse(iso);
  if (Number.isNaN(at)) return iso;
  const diff = Date.now() - at;
  const days = Math.floor(diff / (24 * 60 * 60 * 1000));
  if (days < 1) return "today";
  if (days < 2) return "yesterday";
  if (days < 30) return `${days}d ago`;
  if (days < 60) return "1 mo ago";
  if (days < 365) return `${Math.round(days / 30)} mo ago`;
  return `${Math.round(days / 365)}y ago`;
}
