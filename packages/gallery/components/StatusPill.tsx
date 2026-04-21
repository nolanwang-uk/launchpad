import type {
  EngagementStatus,
  SubmissionStatus,
  UserReviewStatus,
} from "@/lib/auth/types";

type Kind = "submission" | "review" | "engagement";

const TONES = {
  quiet: "bg-transparent border border-[color:var(--color-border-strong)] text-[color:var(--color-fg-muted)]",
  amber: "bg-[#f7ecc4] text-[#6b4f00] border border-[#d7b04a]",
  green: "bg-[#d8ecdb] text-[#164a2b] border border-[#7cb28f]",
  red: "bg-[#f6dada] text-[#7b1f1f] border border-[#c57878]",
  gold: "bg-[color:var(--color-tier-verified)] text-[color:var(--color-tier-verified-fg)]",
} as const;

const SUBMISSION: Record<SubmissionStatus, { label: string; tone: keyof typeof TONES }> = {
  draft: { label: "Draft", tone: "quiet" },
  under_review: { label: "Under review", tone: "amber" },
  changes_requested: { label: "Changes requested", tone: "red" },
  published: { label: "Published", tone: "gold" },
  rejected: { label: "Rejected", tone: "red" },
};

const REVIEW: Record<UserReviewStatus, { label: string; tone: keyof typeof TONES }> = {
  draft: { label: "Draft", tone: "quiet" },
  pending: { label: "Pending review", tone: "amber" },
  published: { label: "Published", tone: "green" },
  rejected: { label: "Rejected", tone: "red" },
};

const ENGAGEMENT: Record<EngagementStatus, { label: string; tone: keyof typeof TONES }> = {
  requested: { label: "Requested", tone: "quiet" },
  quoted: { label: "Quoted", tone: "amber" },
  in_progress: { label: "In progress", tone: "amber" },
  delivered: { label: "Delivered", tone: "green" },
  paid: { label: "Paid", tone: "gold" },
  cancelled: { label: "Cancelled", tone: "red" },
};

export function StatusPill({
  kind,
  status,
}: {
  kind: Kind;
  status: string;
}) {
  const map =
    kind === "submission"
      ? SUBMISSION
      : kind === "review"
        ? REVIEW
        : ENGAGEMENT;
  const entry = (map as Record<string, { label: string; tone: keyof typeof TONES }>)[status];
  const { label, tone } = entry ?? { label: status, tone: "quiet" as const };
  return (
    <span
      className={[
        "inline-flex items-center rounded-sm font-medium uppercase",
        "text-[10px] px-2 py-0.5 tracking-[0.14em]",
        TONES[tone],
      ].join(" ")}
    >
      {label}
    </span>
  );
}
