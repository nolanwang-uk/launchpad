/**
 * Editorial placeholder for a practitioner portrait. Until the registry
 * schema carries real portraits (v2), every practitioner is represented
 * by their initials inside a soft-paper square. The square reads as
 * "byline" not "avatar" — deliberately unrounded to stay editorial.
 */
export function PractitionerMark({
  name,
  size = "md",
}: {
  name: string;
  size?: "sm" | "md" | "lg";
}) {
  const initials = deriveInitials(name);
  const dims =
    size === "lg"
      ? "w-16 h-16 text-xl"
      : size === "md"
        ? "w-10 h-10 text-sm"
        : "w-7 h-7 text-[11px]";
  return (
    <span
      aria-hidden="true"
      className={[
        "inline-flex items-center justify-center shrink-0",
        "bg-[color:var(--color-bg-hover)] border border-[color:var(--color-border-strong)]",
        "text-[color:var(--color-fg)] font-[family-name:var(--font-display)]",
        "tracking-[0.01em] font-medium",
        dims,
      ].join(" ")}
    >
      {initials}
    </span>
  );
}

function deriveInitials(name: string): string {
  const parts = name
    .split(/\s+/)
    .filter((p) => p.length > 0)
    .slice(0, 2);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[1]![0]!).toUpperCase();
}
