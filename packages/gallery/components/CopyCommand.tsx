"use client";

import { useState } from "react";

type Size = "hero" | "inline";

const sizes: Record<Size, string> = {
  hero:
    "text-lg md:text-xl px-8 py-5 gap-4 rounded-xl shadow-lg shadow-white/10",
  inline: "text-sm px-4 py-2.5 gap-3 rounded-md",
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

  const label =
    state === "copied"
      ? "✓ copied — paste in your terminal"
      : state === "error"
        ? "couldn't copy — select and copy manually"
        : "click to copy";

  return (
    <button
      type="button"
      onClick={copy}
      className={[
        "group relative inline-flex items-center justify-between",
        "bg-[color:var(--color-fg)] text-[color:var(--color-bg)]",
        "hover:bg-[color:var(--color-accent-muted)]",
        "transition-colors duration-150",
        "font-[family-name:var(--font-mono)] tracking-[color:var(--tracking-mono)]",
        "font-medium",
        "cursor-pointer select-none",
        "w-full max-w-2xl",
        sizes[size],
      ].join(" ")}
      aria-label={`Copy install command: ${command}`}
    >
      <span className="truncate text-left">{command}</span>
      <span
        className={[
          "shrink-0 text-xs font-[family-name:var(--font-display)]",
          "opacity-60 group-hover:opacity-100 transition-opacity",
          state === "copied" ? "text-emerald-700" : "",
          state === "error" ? "text-red-700" : "",
        ].join(" ")}
      >
        {label}
      </span>
    </button>
  );
}
