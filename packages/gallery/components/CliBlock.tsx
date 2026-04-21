"use client";

import { useState } from "react";
import { CopyCommand } from "./CopyCommand";

type Mode = "run" | "install";

/**
 * Collapsed CLI block for the per-skill rail. Hire is the primary
 * action; this block is secondary and toggles between "run once" and
 * "install permanently." A single command shown at a time keeps the
 * rail visually calm.
 */
export function CliBlock({ skillName }: { skillName: string }) {
  const [mode, setMode] = useState<Mode>("run");
  const command =
    mode === "run"
      ? `npx launchpad run ${skillName}`
      : `skillz install ${skillName}`;
  const helper =
    mode === "run"
      ? "One-shot. Runs in a temp dir with a scrubbed environment."
      : "Persists the skill to ~/.claude/skills/. Requires skillz CLI.";

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] uppercase tracking-[0.18em] text-[color:var(--color-fg-subtle)]">
          For developers
        </p>
        <div
          role="tablist"
          aria-label="Command"
          className="inline-flex border border-[color:var(--color-border-strong)] bg-[color:var(--color-bg-elevated)]"
        >
          <Toggle
            active={mode === "run"}
            onClick={() => setMode("run")}
            label="Run once"
          />
          <Toggle
            active={mode === "install"}
            onClick={() => setMode("install")}
            label="Install"
          />
        </div>
      </div>
      <CopyCommand command={command} />
      <p className="text-xs text-[color:var(--color-fg-subtle)] leading-relaxed">
        {helper}
      </p>
    </div>
  );
}

function Toggle({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={[
        "text-[11px] uppercase tracking-[0.14em] px-3 py-1.5 min-h-[32px]",
        "transition-colors",
        active
          ? "bg-[color:var(--color-fg)] text-[color:var(--color-bg)]"
          : "bg-transparent text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-fg)]",
      ].join(" ")}
    >
      {label}
    </button>
  );
}
