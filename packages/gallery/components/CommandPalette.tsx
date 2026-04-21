"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

export type PaletteEntry = {
  name: string;
  description: string;
  tier: "Reviewed" | "Community";
  tags: readonly string[];
};

type Hit = { entry: PaletteEntry; score: number };

/**
 * Score an entry against a lowercase term. Mirrors the CLI's search.ts
 * algorithm so local (web) and remote (CLI) ranking stay aligned.
 */
function score(entry: PaletteEntry, term: string): number {
  const name = entry.name.toLowerCase();
  const desc = entry.description.toLowerCase();
  if (term.length === 0) return 1; // show everything when the input is empty
  if (name === term) return 100;
  if (name.startsWith(term)) return 80;
  if (name.includes(term)) return 50;
  for (const t of entry.tags) {
    const low = t.toLowerCase();
    if (low === term) return 40;
    if (low.includes(term)) return 25;
  }
  if (new RegExp(`\\b${term.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\\\$&")}\\b`).test(desc)) return 20;
  if (desc.includes(term)) return 10;
  return 0;
}

export function CommandPalette({ entries }: { entries: readonly PaletteEntry[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // Global shortcut: ⌘K / Ctrl+K
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === "Escape" && open) {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // Focus + scroll reset on open
  useEffect(() => {
    if (open) {
      setQuery("");
      setSelected(0);
      // Let the modal mount first.
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  const hits: Hit[] = useMemo(() => {
    const term = query.trim().toLowerCase();
    const scored: Hit[] = [];
    for (const e of entries) {
      const s = score(e, term);
      if (s > 0) scored.push({ entry: e, score: s });
    }
    scored.sort(
      (a, b) => b.score - a.score || a.entry.name.localeCompare(b.entry.name),
    );
    return scored.slice(0, 20);
  }, [entries, query]);

  // Clamp the selected index when the hit list shrinks.
  useEffect(() => {
    if (selected >= hits.length) setSelected(Math.max(0, hits.length - 1));
  }, [hits.length, selected]);

  const choose = (hit: Hit) => {
    setOpen(false);
    router.push(`/s/${hit.entry.name}`);
  };

  const onInputKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelected((s) => Math.min(hits.length - 1, s + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelected((s) => Math.max(0, s - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const hit = hits[selected];
      if (hit) choose(hit);
    }
  };

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-label="Search skills"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-[15vh]"
      onClick={(e) => {
        if (e.target === e.currentTarget) setOpen(false);
      }}
    >
      {/* Backdrop */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />

      {/* Panel */}
      <div
        className={[
          "relative w-full max-w-2xl",
          "bg-[color:var(--color-bg-elevated)]",
          "border border-[color:var(--color-border-strong)]",
          "rounded-xl shadow-2xl shadow-black/80 overflow-hidden",
        ].join(" ")}
      >
        <div className="flex items-center gap-3 px-4 py-3 border-b border-[color:var(--color-border)]">
          <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none">
            <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
            <path d="M21 21l-4.5-4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onInputKey}
            placeholder="Search skills by name, tag, description…"
            aria-label="Search skills"
            autoComplete="off"
            spellCheck={false}
            className="flex-1 bg-transparent outline-none text-[color:var(--color-fg)] placeholder:text-[color:var(--color-fg-subtle)] text-base"
          />
          <kbd className="hidden sm:inline-flex items-center gap-1 text-[10px] text-[color:var(--color-fg-subtle)] border border-[color:var(--color-border)] rounded px-1.5 py-0.5 font-[family-name:var(--font-mono)]">
            esc
          </kbd>
        </div>

        <ul
          ref={listRef}
          role="listbox"
          aria-label="Matching skills"
          className="max-h-[60vh] overflow-y-auto py-1"
        >
          {hits.length === 0 && (
            <li className="px-4 py-6 text-sm text-[color:var(--color-fg-subtle)]">
              no skills match &quot;{query}&quot;
            </li>
          )}
          {hits.map((h, i) => (
            <li
              key={h.entry.name}
              role="option"
              aria-selected={i === selected}
              onMouseEnter={() => setSelected(i)}
              onClick={() => choose(h)}
              className={[
                "px-4 py-2.5 cursor-pointer flex items-baseline gap-3",
                i === selected ? "bg-[color:var(--color-bg-hover)]" : "",
              ].join(" ")}
            >
              <span className="font-medium">{h.entry.name}</span>
              <span
                className={[
                  "text-[10px] px-1.5 py-0.5 uppercase tracking-[0.12em]",
                  h.entry.tier === "Reviewed"
                    ? "bg-[color:var(--color-tier-verified)] text-[color:var(--color-tier-verified-fg)]"
                    : "border border-[color:var(--color-border-strong)] text-[color:var(--color-fg-muted)]",
                ].join(" ")}
              >
                {h.entry.tier === "Reviewed" ? "Verified" : "Community"}
              </span>
              <span className="flex-1 text-sm text-[color:var(--color-fg-muted)] truncate">
                {h.entry.description}
              </span>
            </li>
          ))}
        </ul>

        <div className="px-4 py-2 border-t border-[color:var(--color-border)] flex items-center gap-3 text-[11px] text-[color:var(--color-fg-subtle)]">
          <span className="flex items-center gap-1">
            <kbd className="border border-[color:var(--color-border)] rounded px-1 font-[family-name:var(--font-mono)]">
              ↑↓
            </kbd>
            move
          </span>
          <span className="flex items-center gap-1">
            <kbd className="border border-[color:var(--color-border)] rounded px-1 font-[family-name:var(--font-mono)]">
              ↵
            </kbd>
            open
          </span>
          <span className="flex items-center gap-1">
            <kbd className="border border-[color:var(--color-border)] rounded px-1 font-[family-name:var(--font-mono)]">
              esc
            </kbd>
            close
          </span>
        </div>
      </div>
    </div>
  );
}

/**
 * Client trigger that also mounts the palette. Gives visible UX that
 * ⌘K is available without always showing the modal.
 */
export function CommandPaletteTrigger({
  entries,
}: {
  entries: readonly PaletteEntry[];
}) {
  const [isMac, setIsMac] = useState(false);
  useEffect(() => {
    setIsMac(
      typeof navigator !== "undefined" &&
        /Mac|iPod|iPhone|iPad/.test(navigator.platform),
    );
  }, []);
  return (
    <>
      <button
        type="button"
        onClick={() => {
          // Dispatch a synthetic ⌘K so the palette's global listener handles it.
          window.dispatchEvent(
            new KeyboardEvent("keydown", { key: "k", metaKey: true, ctrlKey: !isMac }),
          );
        }}
        className={[
          "hidden md:inline-flex items-center gap-2 text-sm",
          "px-3 py-1.5 rounded-md",
          "text-[color:var(--color-fg-muted)]",
          "border border-[color:var(--color-border)]",
          "hover:bg-[color:var(--color-bg-hover)] hover:text-[color:var(--color-fg)]",
          "transition-colors",
        ].join(" ")}
        aria-label="Open search palette"
      >
        <span>Search</span>
        <kbd className="text-[10px] font-[family-name:var(--font-mono)] border border-[color:var(--color-border)] rounded px-1">
          {isMac ? "⌘K" : "Ctrl+K"}
        </kbd>
      </button>
      <CommandPalette entries={entries} />
    </>
  );
}
