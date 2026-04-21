"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth/context";
import {
  engagementsForPractitioner,
  loadEngagements,
  saveEngagements,
  appendLedgerEntry,
} from "@/lib/auth/storage";
import { newId } from "@/lib/auth/id";
import type { Engagement, EngagementStatus } from "@/lib/auth/types";
import { StatusPill } from "@/components/StatusPill";

type Filter = "all" | "open" | "paid";

const PRACTITIONER_SHARE = 0.8;

export default function SoldPage() {
  const { user, updateUser } = useAuth();
  const [engagements, setEngagements] = useState<Engagement[]>([]);
  const [filter, setFilter] = useState<Filter>("all");

  useEffect(() => {
    if (!user) return;
    setEngagements(engagementsForPractitioner(user.id));
  }, [user]);

  const filtered = useMemo(() => {
    const base =
      filter === "paid"
        ? engagements.filter((e) => e.status === "paid")
        : filter === "open"
          ? engagements.filter(
              (e) =>
                e.status === "requested" ||
                e.status === "quoted" ||
                e.status === "in_progress" ||
                e.status === "delivered",
            )
          : engagements;
    return [...base].sort(
      (a, b) => Date.parse(b.requested_at) - Date.parse(a.requested_at),
    );
  }, [engagements, filter]);

  const totals = useMemo(() => {
    let booked = 0;
    let paid = 0;
    for (const e of engagements) {
      booked += e.amount_cents;
      if (e.status === "paid") paid += e.amount_cents;
    }
    return { booked, paid };
  }, [engagements]);

  if (!user) return null;
  if (user.role === "reader") {
    return (
      <div className="max-w-xl">
        <p className="text-[11px] uppercase tracking-[0.2em] text-[color:var(--color-fg-subtle)] mb-3">
          Engagements
        </p>
        <h1 className="font-[family-name:var(--font-display)] text-3xl md:text-4xl leading-[1.05] font-medium mb-4">
          Reader accounts don&rsquo;t have an engagements tab.
        </h1>
        <p className="text-[color:var(--color-fg-muted)] leading-relaxed">
          To sell engagements, switch your role to Practitioner in{" "}
          <Link
            href="/dashboard/profile"
            className="text-[color:var(--color-accent)] underline decoration-[color:var(--color-border-strong)] underline-offset-4"
          >
            Profile
          </Link>
          , then submit your first skill.
        </p>
      </div>
    );
  }

  const markAsPaid = (engagement: Engagement) => {
    const earnedCents = Math.round(engagement.amount_cents * PRACTITIONER_SHARE);
    const now = new Date().toISOString();
    const all = loadEngagements();
    const next = all.map((e) =>
      e.id === engagement.id
        ? ({ ...e, status: "paid", paid_at: now } satisfies Engagement)
        : e,
    );
    saveEngagements(next);
    appendLedgerEntry({
      id: newId("led"),
      user_id: user.id,
      kind: "earn_engagement",
      amount_cents: earnedCents,
      memo: `${engagement.skill_name ?? "Direct hire"} engagement · ${engagement.buyer_display} (80% split)`,
      at: now,
      ref: engagement.id,
    });
    updateUser({
      credits_balance_cents: user.credits_balance_cents + earnedCents,
    });
    setEngagements(engagementsForPractitioner(user.id));
  };

  return (
    <div>
      <header className="mb-8">
        <p className="text-[11px] uppercase tracking-[0.2em] text-[color:var(--color-fg-subtle)] mb-3">
          Engagements
        </p>
        <h1 className="font-[family-name:var(--font-display)] text-4xl md:text-5xl leading-[1.02] tracking-[color:var(--tracking-display-tight)] font-medium">
          Sold through the desk.
        </h1>
      </header>

      <section className="grid grid-cols-2 md:grid-cols-3 gap-px bg-[color:var(--color-border)] border border-[color:var(--color-border)] mb-10">
        <SummaryStat label="Engagements" value={String(engagements.length)} />
        <SummaryStat label="Booked (GMV)" value={formatCurrency(totals.booked)} />
        <SummaryStat
          label={`Your share (${Math.round(PRACTITIONER_SHARE * 100)}%)`}
          value={formatCurrency(
            Math.round(totals.paid * PRACTITIONER_SHARE),
          )}
        />
      </section>

      <div className="flex flex-wrap gap-1 mb-6 border-b border-[color:var(--color-border)]">
        {(["all", "open", "paid"] as Filter[]).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={[
              "px-3 py-2 -mb-px text-sm min-h-[40px] capitalize",
              filter === f
                ? "border-b-2 border-b-[color:var(--color-accent)] text-[color:var(--color-fg)] font-medium"
                : "border-b-2 border-b-transparent text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-fg)]",
              "transition-colors",
            ].join(" ")}
          >
            {f === "open"
              ? "Open"
              : f === "paid"
                ? "Paid"
                : "All"}
            <span className="ml-1.5 text-[color:var(--color-fg-subtle)]">
              {f === "all"
                ? engagements.length
                : f === "paid"
                  ? engagements.filter((e) => e.status === "paid").length
                  : engagements.filter((e) =>
                      (
                        ["requested", "quoted", "in_progress", "delivered"] as EngagementStatus[]
                      ).includes(e.status),
                    ).length}
            </span>
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="border border-dashed border-[color:var(--color-border-strong)] p-10 text-center">
          <p className="font-[family-name:var(--font-display)] text-xl mb-2">
            No engagements in this bucket.
          </p>
          <p className="text-sm text-[color:var(--color-fg-muted)]">
            When a buyer hires you through the exchange, the engagement
            lands here.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-[color:var(--color-border)] border-t border-b border-[color:var(--color-border)]">
          {filtered.map((e) => (
            <li key={e.id} className="py-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-3 flex-wrap mb-1">
                    <h3 className="font-[family-name:var(--font-display)] text-lg leading-tight">
                      {e.buyer_display}
                    </h3>
                    <StatusPill kind="engagement" status={e.status} />
                  </div>
                  <p className="text-sm text-[color:var(--color-fg-muted)] leading-relaxed max-w-3xl">
                    {e.buyer_context}
                  </p>
                  <p className="mt-2 text-[11px] uppercase tracking-[0.14em] text-[color:var(--color-fg-subtle)]">
                    {e.skill_name ? (
                      <Link
                        href={`/s/${e.skill_name}`}
                        className="hover:text-[color:var(--color-fg)] transition-colors"
                      >
                        {e.skill_name}
                      </Link>
                    ) : (
                      "Direct hire"
                    )}
                    <span className="mx-2">·</span>
                    Requested {formatDate(e.requested_at)}
                    {e.delivered_at && (
                      <>
                        <span className="mx-2">·</span>
                        Delivered {formatDate(e.delivered_at)}
                      </>
                    )}
                    {e.paid_at && (
                      <>
                        <span className="mx-2">·</span>
                        Paid {formatDate(e.paid_at)}
                      </>
                    )}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="font-[family-name:var(--font-display)] text-lg">
                    {formatCurrency(e.amount_cents)}
                  </p>
                  <p className="text-[11px] text-[color:var(--color-fg-subtle)] uppercase tracking-[0.14em] mt-0.5">
                    Your cut:{" "}
                    {formatCurrency(
                      Math.round(e.amount_cents * PRACTITIONER_SHARE),
                    )}
                  </p>
                  {e.status === "delivered" && (
                    <button
                      type="button"
                      onClick={() => markAsPaid(e)}
                      className="mt-3 inline-flex items-center min-h-[36px] px-3 py-1.5 text-xs font-medium bg-[color:var(--color-accent)] text-[color:var(--color-accent-fg)] hover:bg-[color:var(--color-accent-hover)] transition-colors"
                    >
                      Mark paid + credit me
                    </button>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function SummaryStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-5 bg-[color:var(--color-bg-elevated)] min-h-[100px]">
      <p className="text-[11px] uppercase tracking-[0.14em] text-[color:var(--color-fg-subtle)] mb-3">
        {label}
      </p>
      <p className="font-[family-name:var(--font-display)] text-2xl leading-none">
        {value}
      </p>
    </div>
  );
}

function formatCurrency(cents: number): string {
  const dollars = cents / 100;
  if (dollars >= 1000)
    return `$${Math.round(dollars).toLocaleString("en-US")}`;
  return `$${dollars.toFixed(dollars < 10 ? 2 : 0)}`;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}
