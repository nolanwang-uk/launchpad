"use client";

import { useState } from "react";

type Size = "hero" | "inline";

const sizes: Record<Size, string> = {
  hero: "text-lg md:text-xl px-8 py-5 rounded-xl shadow-lg shadow-white/10",
  inline: "text-sm px-4 py-2.5 rounded-md",
};

export function CopyCommand({
  command,
  size = "inline",
}: {
  command: string;
  size?: Size;
}) {
  const [state, setState] = useState<"idle" | "copied" | "error">("idle");

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(command);
      setState("copied");
      setTimeout(() => setState("idle"), 1800);
    } catch {
      setState("error");
      setTimeout(() => setState("idle"), 1800);
    }
  };

  return (
    <div className="group w-full max-w-2xl">
      <button
        type="button"
        onClick={copy}
        className={[
          "relative w-full block text-left",
          "bg-[color:var(--color-fg)] text-[color:var(--color-bg)]",
          "hover:bg-[color:var(--color-accent-muted)]",
          "transition-colors duration-150",
          "font-[family-name:var(--font-mono)] tracking-[color:var(--tracking-mono)]",
          "font-medium",
          "cursor-pointer select-none",
          "min-h-[44px]",
          sizes[size],
        ].join(" ")}
        aria-label={`Copy install command: ${command}`}
        aria-live="polite"
      >
        <span className="block truncate">{command}</span>
      </button>
      {/* Status caption sits outside the pill — doesn't fight the command
          for horizontal space, doesn't force truncation, still visible. */}
      <p
        className={[
          "text-[11px] mt-1.5 px-1 font-[family-name:var(--font-display)] transition-opacity",
          state === "copied"
            ? "text-emerald-500 opacity-100"
            : state === "error"
              ? "text-red-500 opacity-100"
              : "text-[color:var(--color-fg-subtle)] opacity-0 group-hover:opacity-100",
        ].join(" ")}
        role={state === "idle" ? undefined : "status"}
      >
        {state === "copied"
          ? "✓ copied — paste in your terminal"
          : state === "error"
            ? "couldn't copy — select and copy manually"
            : "click to copy"}
      </p>
    </div>
  );
}
