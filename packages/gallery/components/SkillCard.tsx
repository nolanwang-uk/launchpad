import Link from "next/link";
import type { RegistryEntry } from "@launchpad/registry";
import { TierBadge } from "./TierBadge";

export function SkillCard({ entry }: { entry: RegistryEntry }) {
  return (
    <Link
      href={`/s/${entry.name}`}
      className={[
        "group block rounded-lg border border-[color:var(--color-border)]",
        "bg-[color:var(--color-bg-elevated)]",
        "hover:bg-[color:var(--color-bg-hover)] hover:border-[color:var(--color-border-strong)]",
        "transition-colors duration-150",
        "p-5",
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <h3 className="text-lg font-semibold tracking-[color:var(--tracking-display-tight)]">
          {entry.name}
        </h3>
        <TierBadge tier={entry.tier} />
      </div>

      <p className="text-sm text-[color:var(--color-fg-muted)] line-clamp-2 mb-4 min-h-[2.5rem]">
        {entry.description}
      </p>

      <div className="flex items-center justify-between text-xs">
        <span className="text-[color:var(--color-fg-subtle)]">
          by {entry.author}
        </span>
        <code className="font-[family-name:var(--font-mono)] text-[color:var(--color-fg-subtle)]">
          {entry.sha.slice(0, 7)}
        </code>
      </div>

      {entry.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-4">
          {entry.tags.slice(0, 4).map((t) => (
            <span
              key={t}
              className={[
                "text-[10px] px-2 py-0.5 rounded",
                "bg-[color:var(--color-bg)] text-[color:var(--color-fg-subtle)]",
                "border border-[color:var(--color-border)]",
              ].join(" ")}
            >
              {t}
            </span>
          ))}
        </div>
      )}
    </Link>
  );
}
