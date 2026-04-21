"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth/context";
import {
  appendLedgerEntry,
  ledgerForUser,
} from "@/lib/auth/storage";
import { newId } from "@/lib/auth/id";
import type { CreditLedgerEntry } from "@/lib/auth/types";
import { FormError, SubmitButton, TextField } from "@/components/FormField";
import { EDITORIAL_EMAIL } from "@/lib/editorial";

const CREDIT_PACKS: { cents: number; label: string }[] = [
  { cents: 10000, label: "$100 · 1,000 credits" },
  { cents: 50000, label: "$500 · 5,250 credits" },
  { cents: 200000, label: "$2,000 · 22,000 credits" },
];

const KIND_LABELS: Record<CreditLedgerEntry["kind"], string> = {
  purchase: "Top-up",
  spend: "Engagement spend",
  earn_engagement: "Engagement earning",
  earn_skill_sale: "Skill sale",
  editorial_grant: "Editorial grant",
  refund: "Refund",
};

export default function CreditsPage() {
  const { user, updateUser } = useAuth();
  const [ledger, setLedger] = useState<CreditLedgerEntry[]>([]);
  const [code, setCode] = useState("");
  const [codeMsg, setCodeMsg] = useState<
    { kind: "ok" | "err"; text: string } | null
  >(null);

  useEffect(() => {
    if (!user) return;
    setLedger(ledgerForUser(user.id));
  }, [user]);

  const totals = useMemo(() => {
    let purchased = 0;
    let earned = 0;
    let spent = 0;
    for (const e of ledger) {
      if (e.kind === "purchase") purchased += e.amount_cents;
      else if (e.kind === "spend") spent += Math.abs(e.amount_cents);
      else if (
        e.kind === "earn_engagement" ||
        e.kind === "earn_skill_sale" ||
        e.kind === "editorial_grant"
      ) {
        earned += e.amount_cents;
      }
    }
    return { purchased, earned, spent };
  }, [ledger]);

  if (!user) return null;

  const onRedeem = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = code.trim().toUpperCase();
    setCodeMsg(null);
    if (clean.length === 0) return;
    // Demo promo codes for the v1 mock.
    const DEMO_CODES: Record<string, number> = {
      "LAUNCHPAD-10": 1000,
      "FIRSTNOTE": 500,
      "PRACTITIONER-50": 5000,
    };
    const amount = DEMO_CODES[clean];
    if (!amount) {
      setCodeMsg({ kind: "err", text: "Unknown code. Try LAUNCHPAD-10." });
      return;
    }
    const entry: CreditLedgerEntry = {
      id: newId("led"),
      user_id: user.id,
      kind: "editorial_grant",
      amount_cents: amount,
      memo: `Promo code applied: ${clean}`,
      at: new Date().toISOString(),
    };
    appendLedgerEntry(entry);
    updateUser({ credits_balance_cents: user.credits_balance_cents + amount });
    setLedger((prev) => [entry, ...prev]);
    setCode("");
    setCodeMsg({
      kind: "ok",
      text: `Applied ${formatCurrency(amount)} to your balance.`,
    });
  };

  const topUpHref = (cents: number) =>
    `mailto:${EDITORIAL_EMAIL}?subject=${encodeURIComponent(
      "[Launchpad] Credit top-up",
    )}&body=${encodeURIComponent(
      [
        "I'd like to top up my Launchpad credit balance.",
        `Account: ${user.email}`,
        `Package: ${CREDIT_PACKS.find((p) => p.cents === cents)?.label ?? formatCurrency(cents)}`,
        "",
        "Send me an invoice when you get a chance.",
      ].join("\n"),
    )}`;

  return (
    <div>
      <header className="mb-10">
        <p className="text-[11px] uppercase tracking-[0.2em] text-[color:var(--color-fg-subtle)] mb-3">
          Credits
        </p>
        <h1 className="font-[family-name:var(--font-display)] text-4xl md:text-5xl leading-[1.02] tracking-[color:var(--tracking-display-tight)] font-medium">
          Balance + ledger.
        </h1>
        <p className="mt-4 text-[color:var(--color-fg-muted)] leading-relaxed max-w-2xl">
          One credit equals one cent. Buyers spend credits on
          engagements. Practitioners earn credits from engagement
          payouts.
        </p>
      </header>

      <section className="grid grid-cols-2 md:grid-cols-4 gap-px bg-[color:var(--color-border)] border border-[color:var(--color-border)] mb-12">
        <SummaryStat
          label="Balance"
          value={formatCurrency(user.credits_balance_cents)}
          accent
        />
        <SummaryStat label="Purchased" value={formatCurrency(totals.purchased)} />
        <SummaryStat label="Earned" value={formatCurrency(totals.earned)} />
        <SummaryStat label="Spent" value={formatCurrency(totals.spent)} />
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-10 items-start mb-14">
        <div>
          <h2 className="font-[family-name:var(--font-display)] text-2xl tracking-[color:var(--tracking-display)] mb-4">
            Ledger
          </h2>
          {ledger.length === 0 ? (
            <div className="border border-dashed border-[color:var(--color-border-strong)] p-8 text-sm text-[color:var(--color-fg-muted)] text-center">
              No credit activity yet. Buy a pack on the right to start.
            </div>
          ) : (
            <ul className="divide-y divide-[color:var(--color-border)] border-t border-b border-[color:var(--color-border)]">
              {ledger.map((e) => (
                <li
                  key={e.id}
                  className="py-4 flex items-start justify-between gap-4"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-[color:var(--color-fg)] leading-snug">
                      {e.memo}
                    </p>
                    <p className="text-[11px] text-[color:var(--color-fg-subtle)] uppercase tracking-[0.14em] mt-1">
                      {KIND_LABELS[e.kind]} · {formatDate(e.at)}
                    </p>
                  </div>
                  <span
                    className={[
                      "font-[family-name:var(--font-mono)] tabular-nums text-base shrink-0",
                      e.amount_cents < 0
                        ? "text-[color:var(--color-fg-muted)]"
                        : "text-[color:var(--color-success)]",
                    ].join(" ")}
                  >
                    {e.amount_cents < 0 ? "" : "+"}
                    {formatCurrency(e.amount_cents)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <aside className="space-y-6 lg:sticky lg:top-6 self-start">
          <div className="p-5 border border-[color:var(--color-border)] bg-[color:var(--color-bg-elevated)]">
            <p className="text-[11px] uppercase tracking-[0.16em] text-[color:var(--color-fg-subtle)] mb-3">
              Top up credits
            </p>
            <p className="text-sm text-[color:var(--color-fg-muted)] leading-relaxed mb-4">
              v1 bills by invoice. Pick a pack; editorial sends you a
              Stripe link within one business day.
            </p>
            <ul className="space-y-2">
              {CREDIT_PACKS.map((p) => (
                <li key={p.cents}>
                  <a
                    href={topUpHref(p.cents)}
                    className={[
                      "w-full block px-3 py-3",
                      "border border-[color:var(--color-border-strong)]",
                      "bg-[color:var(--color-bg)]",
                      "hover:bg-[color:var(--color-bg-hover)]",
                      "transition-colors text-sm",
                    ].join(" ")}
                  >
                    {p.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div className="p-5 border border-[color:var(--color-border)] bg-[color:var(--color-bg-elevated)]">
            <p className="text-[11px] uppercase tracking-[0.16em] text-[color:var(--color-fg-subtle)] mb-3">
              Redeem promo code
            </p>
            <form onSubmit={onRedeem} className="space-y-3">
              <TextField
                label="Code"
                placeholder="LAUNCHPAD-10"
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />
              {codeMsg?.kind === "err" && <FormError message={codeMsg.text} />}
              <SubmitButton>Apply code</SubmitButton>
              {codeMsg?.kind === "ok" && (
                <p
                  role="status"
                  className="text-sm text-[color:var(--color-success)] font-[family-name:var(--font-display)]"
                >
                  ✓ {codeMsg.text}
                </p>
              )}
            </form>
            <p className="text-xs text-[color:var(--color-fg-subtle)] leading-relaxed mt-3">
              Demo codes: <code className="font-[family-name:var(--font-mono)] text-[0.9em]">LAUNCHPAD-10</code>, <code className="font-[family-name:var(--font-mono)] text-[0.9em]">FIRSTNOTE</code>, <code className="font-[family-name:var(--font-mono)] text-[0.9em]">PRACTITIONER-50</code>.
            </p>
          </div>

          <p className="text-xs text-[color:var(--color-fg-subtle)] leading-relaxed">
            Earnings from engagements post automatically when an
            engagement is marked paid from the{" "}
            <Link
              href="/dashboard/sold"
              className="text-[color:var(--color-accent)] underline decoration-[color:var(--color-border-strong)] underline-offset-4"
            >
              Engagements tab
            </Link>
            .
          </p>
        </aside>
      </section>
    </div>
  );
}

function SummaryStat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div
      className={[
        "p-5 min-h-[110px]",
        accent
          ? "bg-[color:var(--color-accent)] text-[color:var(--color-accent-fg)]"
          : "bg-[color:var(--color-bg-elevated)]",
      ].join(" ")}
    >
      <p
        className={[
          "text-[11px] uppercase tracking-[0.14em] mb-3",
          accent
            ? "text-[color:var(--color-accent-fg)]/80"
            : "text-[color:var(--color-fg-subtle)]",
        ].join(" ")}
      >
        {label}
      </p>
      <p className="font-[family-name:var(--font-display)] text-3xl leading-none">
        {value}
      </p>
    </div>
  );
}

function formatCurrency(cents: number): string {
  const dollars = cents / 100;
  const abs = Math.abs(dollars);
  const sign = dollars < 0 ? "-" : "";
  if (abs >= 1000) return `${sign}$${Math.round(abs).toLocaleString("en-US")}`;
  return `${sign}$${abs.toFixed(abs < 10 ? 2 : 0)}`;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
