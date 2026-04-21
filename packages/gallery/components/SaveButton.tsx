"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth/context";
import { isSaved, toggleSaved } from "@/lib/auth/storage";

type Variant = "chip" | "inline";

/**
 * Bookmark a skill. Shows a heart glyph, filled when saved. Reads
 * and writes through lib/auth/storage so the state persists across
 * routes and tabs. Signed-out users see a sign-in prompt rather
 * than a broken action.
 */
export function SaveButton({
  skillName,
  variant = "chip",
}: {
  skillName: string;
  variant?: Variant;
}) {
  const { user } = useAuth();
  const [saved, setSaved] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (!user) {
      setHydrated(true);
      return;
    }
    setSaved(isSaved(user.id, skillName));
    setHydrated(true);
  }, [user, skillName]);

  if (!user) {
    return (
      <a
        href={`/login?next=${encodeURIComponent(`/s/${skillName}`)}`}
        className={[
          "inline-flex items-center gap-2",
          "text-sm font-medium text-[color:var(--color-fg-muted)]",
          "hover:text-[color:var(--color-accent)]",
          variant === "chip"
            ? "min-h-[40px] px-3 py-2"
            : "min-h-[44px] px-4 py-2.5",
        ].join(" ")}
        title="Sign in to save"
      >
        <HeartGlyph filled={false} />
        <span>Save</span>
      </a>
    );
  }

  const onClick = () => {
    if (!hydrated) return;
    const res = toggleSaved(user.id, skillName);
    setSaved(res.saved);
  };

  if (variant === "chip") {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-pressed={saved}
        title={saved ? "Remove from saved" : "Save to your list"}
        className={[
          "inline-flex items-center gap-2 min-h-[40px] px-3 py-2",
          "border",
          saved
            ? "border-[color:var(--color-accent)] bg-[color:var(--color-bg-hover)] text-[color:var(--color-accent)]"
            : "border-[color:var(--color-border-strong)] text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-fg)] hover:border-[color:var(--color-fg-muted)]",
          "text-sm font-medium transition-colors",
        ].join(" ")}
      >
        <HeartGlyph filled={saved} />
        <span>{saved ? "Saved" : "Save"}</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={saved}
      title={saved ? "Remove from saved" : "Save to your list"}
      className={[
        "inline-flex items-center justify-center gap-2",
        "min-h-[44px] px-4 py-2.5",
        "text-sm font-medium",
        saved
          ? "bg-[color:var(--color-bg-hover)] text-[color:var(--color-accent)] border border-[color:var(--color-accent)]"
          : "bg-transparent text-[color:var(--color-fg)] border border-[color:var(--color-border-strong)] hover:border-[color:var(--color-fg-muted)]",
        "transition-colors",
      ].join(" ")}
    >
      <HeartGlyph filled={saved} />
      <span>{saved ? "Saved" : "Save for later"}</span>
    </button>
  );
}

function HeartGlyph({ filled }: { filled: boolean }) {
  return (
    <svg
      aria-hidden="true"
      width="14"
      height="14"
      viewBox="0 0 16 16"
      fill={filled ? "currentColor" : "none"}
    >
      <path
        d="M8 13.5S2.5 10 2.5 6.25C2.5 4.5 3.9 3.1 5.65 3.1c1.05 0 2 .55 2.35 1.35C8.35 3.65 9.3 3.1 10.35 3.1 12.1 3.1 13.5 4.5 13.5 6.25 13.5 10 8 13.5 8 13.5z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}
