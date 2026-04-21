/**
 * Editorial star rating. Half-star precision, monochrome gold glyph so
 * it fits the Practitioners' Exchange palette (no neon yellow). Used
 * on cards and on per-skill pages. Intentionally not a UGC input
 * component — v1 ratings are editorial/declared, not collected.
 */
export function StarRating({
  value,
  reviewsCount,
  size = "sm",
}: {
  value: number;
  reviewsCount?: number;
  size?: "sm" | "md";
}) {
  const clamped = Math.max(0, Math.min(5, value));
  const full = Math.floor(clamped);
  const hasHalf = clamped - full >= 0.25 && clamped - full < 0.75;
  const dim =
    size === "md" ? { star: 16, gap: "gap-0.5" } : { star: 12, gap: "gap-0.5" };

  return (
    <span
      className={["inline-flex items-center", dim.gap].join(" ")}
      aria-label={`${clamped.toFixed(1)} out of 5${
        reviewsCount !== undefined ? `, ${reviewsCount} reviews` : ""
      }`}
    >
      <span className={["inline-flex", dim.gap].join(" ")} aria-hidden="true">
        {Array.from({ length: 5 }).map((_, i) => {
          if (i < full) return <Star key={i} size={dim.star} fill="full" />;
          if (i === full && hasHalf)
            return <Star key={i} size={dim.star} fill="half" />;
          return <Star key={i} size={dim.star} fill="empty" />;
        })}
      </span>
      {reviewsCount !== undefined && (
        <span
          className={[
            "ml-1.5 text-[color:var(--color-fg-subtle)]",
            size === "md" ? "text-xs" : "text-[11px]",
            "tabular-nums",
          ].join(" ")}
        >
          {clamped.toFixed(1)} · {reviewsCount}
        </span>
      )}
    </span>
  );
}

function Star({
  size,
  fill,
}: {
  size: number;
  fill: "full" | "half" | "empty";
}) {
  const color = "var(--color-gold)";
  const empty = "var(--color-border-strong)";
  const id = `halfgrad-${Math.random().toString(36).slice(2, 8)}`;
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      {fill === "half" && (
        <defs>
          <linearGradient id={id} x1="0" x2="1" y1="0" y2="0">
            <stop offset="50%" stopColor={color} />
            <stop offset="50%" stopColor={empty} />
          </linearGradient>
        </defs>
      )}
      <path
        d="M8 1.5l1.95 4.15 4.55.6-3.35 3.1.85 4.5L8 11.65 3.95 13.85l.85-4.5L1.45 6.25l4.55-.6L8 1.5z"
        fill={
          fill === "full" ? color : fill === "empty" ? empty : `url(#${id})`
        }
      />
    </svg>
  );
}
