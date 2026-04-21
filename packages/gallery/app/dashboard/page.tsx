"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth/context";
import {
  engagementsForPractitioner,
  ledgerForUser,
  reviewsByUser,
  submissionsForUser,
} from "@/lib/auth/storage";
import type {
  CreditLedgerEntry,
  Engagement,
  Submission,
  UserReview,
} from "@/lib/auth/types";
import { StatusPill } from "@/components/StatusPill";
import { OnboardingChecklist } from "@/components/OnboardingChecklist";

export default function DashboardOverview() {
  const { user } = useAuth();
  const [subs, setSubs] = useState<Submission[]>([]);
  const [reviews, setReviews] = useState<UserReview[]>([]);
  const [engs, setEngs] = useState<Engagement[]>([]);
  const [ledger, setLedger] = useState<CreditLedgerEntry[]>([]);

  useEffect(() => {
    if (!user) return;
    setSubs(submissionsForUser(user.id));
    setReviews(reviewsByUser(user.id));
    setEngs(engagementsForPractitioner(user.id));
    setLedger(ledgerForUser(user.id));
  }, [user]);

  if (!user) return null;

  const published = subs.filter((s) => s.status === "published").length;
  const inReview = subs.filter(
    (s) => s.status === "under_review" || s.status === "changes_requested",
  ).length;
  const pendingEngagements = engs.filter(
    (e) => e.status === "requested" || e.status === "quoted",
  ).length;
  const openReviewNotes = reviews.filter(
    (r) => r.status === "pending" || r.status === "draft",
  ).length;
  const isPractitioner = user.role !== "reader";
  const recentLedger = ledger.slice(0, 5);

  return (
    <div>
      <header className="mb-10">
        <p className="text-[11px] uppercase tracking-[0.2em] text-[color:var(--color-fg-subtle)] mb-3">
          Welcome back
        </p>
        <h1 className="font-[family-name:var(--font-display)] text-4xl md:text-5xl leading-[1.02] tracking-[color:var(--tracking-display-tight)] font-medium">
          {greet(user.display_name)}
        </h1>
        <p className="mt-4 text-[color:var(--color-fg-muted)] leading-relaxed max-w-2xl">
          A look at what&rsquo;s moving across your desk today.
        </p>
      </header>

      <OnboardingChecklist />

      <section className="grid grid-cols-2 md:grid-cols-4 gap-px bg-[color:var(--color-border)] border border-[color:var(--color-border)] mb-12">
        <Stat
          label="Credits"
          value={formatCurrency(user.credits_balance_cents)}
          href="/dashboard/credits"
        />
        {isPractitioner && (
          <>
            <Stat
              label="Published skills"
              value={String(published)}
              href="/dashboard/submits"
            />
            <Stat
              label="In review"
              value={String(inReview)}
              href="/dashboard/submits"
            />
            <Stat
              label="Pending engagements"
              value={String(pendingEngagements)}
              href="/dashboard/sold"
            />
          </>
        )}
        {!isPractitioner && (
          <>
            <Stat
              label="Reader notes"
              value={String(reviews.length)}
              href="/dashboard/reviews"
            />
            <Stat
              label="Pending notes"
              value={String(openReviewNotes)}
              href="/dashboard/reviews"
            />
            <Stat
              label="Browse"
              value="/all"
              href="/all"
              external
            />
          </>
        )}
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        {isPractitioner && (
          <OverviewBlock
            title="Recent submissions"
            empty="No submissions yet."
            href="/dashboard/submits"
            hrefLabel="All submissions →"
          >
            {subs.slice(0, 4).map((s) => (
              <RowLink
                key={s.id}
                href="/dashboard/submits"
                title={s.skill_name}
                sub={formatRelative(s.submitted_at)}
                pill={<StatusPill kind="submission" status={s.status} />}
              />
            ))}
          </OverviewBlock>
        )}

        <OverviewBlock
          title="Credit activity"
          empty="No credit activity yet."
          href="/dashboard/credits"
          hrefLabel="Full ledger →"
        >
          {recentLedger.map((e) => (
            <RowLink
              key={e.id}
              href="/dashboard/credits"
              title={e.memo}
              sub={formatRelative(e.at)}
              pill={
                <span
                  className={[
                    "text-sm font-[family-name:var(--font-mono)] tabular-nums",
                    e.amount_cents < 0
                      ? "text-[color:var(--color-fg-muted)]"
                      : "text-[color:var(--color-success)]",
                  ].join(" ")}
                >
                  {e.amount_cents < 0 ? "" : "+"}
                  {formatCurrency(e.amount_cents)}
                </span>
              }
            />
          ))}
        </OverviewBlock>

        {isPractitioner && (
          <OverviewBlock
            title="Latest engagements"
            empty="No engagements yet. Your first one lands here when a buyer hires you."
            href="/dashboard/sold"
            hrefLabel="All engagements →"
          >
            {engs.slice(0, 4).map((e) => (
              <RowLink
                key={e.id}
                href="/dashboard/sold"
                title={e.buyer_display}
                sub={`${e.skill_name ?? "Direct hire"} · ${formatRelative(e.requested_at)}`}
                pill={<StatusPill kind="engagement" status={e.status} />}
              />
            ))}
          </OverviewBlock>
        )}

        <OverviewBlock
          title="Your reader notes"
          empty="No reader notes yet. Hire something, then let the desk know what you thought."
          href="/dashboard/reviews"
          hrefLabel="All notes →"
        >
          {reviews.slice(0, 4).map((r) => (
            <RowLink
              key={r.id}
              href="/dashboard/reviews"
              title={r.skill_name}
              sub={`${r.rating.toFixed(1)} ★ · ${formatRelative(r.created_at)}`}
              pill={<StatusPill kind="review" status={r.status} />}
            />
          ))}
        </OverviewBlock>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  href,
  external,
}: {
  label: string;
  value: string;
  href: string;
  external?: boolean;
}) {
  const inner = (
    <>
      <p className="text-[11px] uppercase tracking-[0.14em] text-[color:var(--color-fg-subtle)] mb-3">
        {label}
      </p>
      <p className="font-[family-name:var(--font-display)] text-3xl leading-none">
        {value}
      </p>
    </>
  );
  const className =
    "group block p-5 bg-[color:var(--color-bg-elevated)] hover:bg-[color:var(--color-bg-hover)] transition-colors min-h-[110px]";
  return external ? (
    <a href={href} className={className}>
      {inner}
    </a>
  ) : (
    <Link href={href} className={className}>
      {inner}
    </Link>
  );
}

function OverviewBlock({
  title,
  href,
  hrefLabel,
  children,
  empty,
}: {
  title: string;
  href: string;
  hrefLabel: string;
  children: React.ReactNode;
  empty: string;
}) {
  const items = Array.isArray(children) ? children : [children];
  const empties = items.filter(Boolean).length === 0;
  return (
    <section>
      <div className="flex items-baseline justify-between mb-4">
        <h2 className="font-[family-name:var(--font-display)] text-xl tracking-[color:var(--tracking-display)]">
          {title}
        </h2>
        <Link
          href={href}
          className="text-[11px] uppercase tracking-[0.14em] text-[color:var(--color-accent)] hover:underline decoration-[color:var(--color-border-strong)] underline-offset-4"
        >
          {hrefLabel}
        </Link>
      </div>
      {empties ? (
        <div className="border border-dashed border-[color:var(--color-border-strong)] p-6 text-sm text-[color:var(--color-fg-muted)]">
          {empty}
        </div>
      ) : (
        <ul className="divide-y divide-[color:var(--color-border)] border-t border-b border-[color:var(--color-border)]">
          {children}
        </ul>
      )}
    </section>
  );
}

function RowLink({
  href,
  title,
  sub,
  pill,
}: {
  href: string;
  title: string;
  sub: string;
  pill?: React.ReactNode;
}) {
  return (
    <li>
      <Link
        href={href}
        className="flex items-center justify-between gap-4 py-3 hover:bg-[color:var(--color-bg-hover)] transition-colors px-1"
      >
        <div className="min-w-0 flex-1">
          <p className="text-[color:var(--color-fg)] truncate">{title}</p>
          <p className="text-xs text-[color:var(--color-fg-subtle)] mt-0.5 truncate">
            {sub}
          </p>
        </div>
        {pill && <div className="shrink-0">{pill}</div>}
      </Link>
    </li>
  );
}

function greet(name: string): string {
  const h = new Date().getHours();
  const greeting = h < 5 ? "Up late" : h < 12 ? "Morning" : h < 18 ? "Afternoon" : "Evening";
  return `${greeting}, ${firstNameOf(name)}.`;
}

function firstNameOf(full: string): string {
  const f = full.split(/\s+/)[0];
  return f ?? full;
}

function formatCurrency(cents: number): string {
  const dollars = cents / 100;
  const abs = Math.abs(dollars);
  const sign = dollars < 0 ? "-" : "";
  if (abs >= 1000) return `${sign}$${Math.round(abs).toLocaleString("en-US")}`;
  return `${sign}$${abs.toFixed(abs < 10 ? 2 : 0)}`;
}

function formatRelative(iso: string): string {
  const at = Date.parse(iso);
  if (Number.isNaN(at)) return iso;
  const diff = Date.now() - at;
  const days = Math.floor(diff / (24 * 60 * 60 * 1000));
  if (days < 1) return "today";
  if (days < 2) return "yesterday";
  if (days < 30) return `${days}d ago`;
  if (days < 60) return "1 mo ago";
  if (days < 365) return `${Math.round(days / 30)} mo ago`;
  return `${Math.round(days / 365)}y ago`;
}
