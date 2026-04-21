"use client";

import type {
  CreditLedgerEntry,
  Engagement,
  Submission,
  User,
  UserReview,
} from "./types";
import { generateSalt, hashPassword } from "./hash";
import { newId } from "./id";
import {
  hasSeeded,
  loadAccounts,
  markSeeded,
  saveAccount,
  saveEngagements,
  saveLedger,
  saveSubmissions,
  saveUserReviews,
} from "./storage";

/**
 * Seeds four demo accounts (three practitioners matching the public
 * registry + one reader) on first load. Idempotent: runs once per
 * browser profile, gated by hasSeeded(). Gives every dashboard page
 * real content to render without requiring the user to click through
 * a six-step onboarding flow just to see design.
 *
 * All seeded accounts share the same demo password ("demo") so users
 * can prefill the login form and walk the flows.
 */

export const DEMO_PASSWORD = "demo";

type Seed = {
  email: string;
  display_name: string;
  slug: string;
  role: User["role"];
  credential: string;
  bio: string;
};

const SEED_USERS: Seed[] = [
  {
    email: "mara@example.com",
    display_name: "Mara Ellison",
    slug: "mara-ellison",
    role: "practitioner",
    credential:
      "Former SEC Division of Corporation Finance staff attorney (2014–2021). USPTO-registered patent agent.",
    bio: "Securities + patent practice. Spent seven years inside the SEC reviewing corporate disclosures; now advises public-company counsel on comment-letter risk. Interested in encoding the patterns staff reviewers actually look for.",
  },
  {
    email: "priya@example.com",
    display_name: "Dr. Priya Natarajan",
    slug: "priya-natarajan",
    role: "practitioner",
    credential:
      "AHIMA-credentialed CCS, 12 years in ambulatory coding compliance. Biostatistician, 9 years in Phase II/III oncology trials.",
    bio: "Clinical coding auditor by day, oncology biostatistician on contract projects. Cross-domain by accident — started in coding, did a PhD to move into trial design, kept the coding certification because the cash flow was real.",
  },
  {
    email: "jordan@example.com",
    display_name: "Jordan Avery",
    slug: "jordan-avery",
    role: "practitioner",
    credential: "FP&A lead at two Series-C SaaS companies. CPA (inactive).",
    bio: "Spent most of the last decade closing months for $15M–$80M ARR SaaS companies. The ARR bridge skill came from getting tired of watching new analysts reconcile the same subscription-ledger variances every close.",
  },
  {
    email: "alex@example.com",
    display_name: "Alex Chen",
    slug: "alex-chen",
    role: "reader",
    credential: "",
    bio: "Platform engineer who buys skills for the compliance and finance teams I partner with. Not a practitioner — someone who gets assigned AI automation work and would rather buy than build.",
  },
];

export async function runSeedIfNeeded(): Promise<void> {
  if (hasSeeded()) return;
  // If the accounts store is already populated, don't double-seed.
  if (Object.keys(loadAccounts()).length > 0) {
    markSeeded();
    return;
  }

  const now = new Date();
  const users: User[] = [];
  for (const s of SEED_USERS) {
    const salt = generateSalt();
    const password_hash = await hashPassword(DEMO_PASSWORD, salt);
    const user: User = {
      id: newId("u"),
      email: s.email,
      display_name: s.display_name,
      slug: s.slug,
      role: s.role,
      credential: s.credential,
      bio: s.bio,
      credits_balance_cents: 0,
      email_prefs: {
        engagement_requests: true,
        review_published: true,
        weekly_digest: true,
        product_updates: false,
      },
      created_at: new Date(
        now.getTime() - 1000 * 60 * 60 * 24 * (30 + users.length * 7),
      ).toISOString(),
    };
    saveAccount({ user, password_hash, password_salt: salt });
    users.push(user);
  }

  // Map seed names → user ids so we can wire the fixtures.
  const byEmail = new Map(users.map((u) => [u.email, u] as const));
  const mara = byEmail.get("mara@example.com")!;
  const priya = byEmail.get("priya@example.com")!;
  const jordan = byEmail.get("jordan@example.com")!;
  const alex = byEmail.get("alex@example.com")!;

  // Submissions
  const submissions: Submission[] = [
    {
      id: newId("sub"),
      user_id: mara.id,
      skill_name: "sec-10k-reviewer",
      domain: "law",
      description:
        "Reviews a public-company 10-K against historical SEC comment-letter patterns.",
      status: "published",
      submitted_at: monthsAgo(3),
      published_as: "sec-10k-reviewer",
    },
    {
      id: newId("sub"),
      user_id: mara.id,
      skill_name: "patent-prior-art-scanner",
      domain: "law",
      description:
        "Structures independent claims and drafts prior-art search queries.",
      status: "published",
      submitted_at: monthsAgo(4),
      published_as: "patent-prior-art-scanner",
    },
    {
      id: newId("sub"),
      user_id: mara.id,
      skill_name: "8k-event-classifier",
      domain: "law",
      description:
        "Classifies a current-report Form 8-K against the seven Item 1–9 event buckets plus free-text Item 7.01.",
      status: "under_review",
      submitted_at: daysAgo(5),
      editorial_note:
        "Strong framing. Close the install grammar on the cp step (use closed-set verbs), then we’ll publish.",
    },
    {
      id: newId("sub"),
      user_id: priya.id,
      skill_name: "icd10-chart-auditor",
      domain: "medicine",
      description:
        "Audits outpatient encounter notes against ICD-10-CM coding guidelines.",
      status: "published",
      submitted_at: monthsAgo(2),
      published_as: "icd10-chart-auditor",
    },
    {
      id: newId("sub"),
      user_id: priya.id,
      skill_name: "clinical-trial-protocol-reader",
      domain: "research",
      description:
        "Extracts endpoints, I/E criteria, and power assumptions from a trial protocol.",
      status: "published",
      submitted_at: monthsAgo(2),
      published_as: "clinical-trial-protocol-reader",
    },
    {
      id: newId("sub"),
      user_id: priya.id,
      skill_name: "hcc-risk-adjustment-primer",
      domain: "medicine",
      description:
        "Primer skill: walks a chart looking for undocumented HCC conditions the coder missed.",
      status: "draft",
      submitted_at: daysAgo(1),
    },
    {
      id: newId("sub"),
      user_id: jordan.id,
      skill_name: "saas-arr-bridge",
      domain: "finance",
      description:
        "Walks an ARR bridge and reconciles against the subscription ledger.",
      status: "published",
      submitted_at: monthsAgo(1),
      published_as: "saas-arr-bridge",
    },
    {
      id: newId("sub"),
      user_id: jordan.id,
      skill_name: "deferred-revenue-waterfall",
      domain: "finance",
      description:
        "Builds a 12-month deferred-revenue waterfall from a contract ledger export.",
      status: "changes_requested",
      submitted_at: daysAgo(9),
      editorial_note:
        "Narrow the scope to ASC 606 only — the dual-track IFRS 15 branch is too much for a first skill and dilutes the byline.",
    },
  ];
  saveSubmissions(submissions);

  // Reviews — Alex reviewing Mara's and Priya's skills, Mara reviewing Jordan's.
  const reviews: UserReview[] = [
    {
      id: newId("rev"),
      reviewer_user_id: alex.id,
      skill_name: "sec-10k-reviewer",
      rating: 5,
      body: "Flagged two risk-factor phrasings that got us a comment letter last year. Worth the price on the first review.",
      status: "published",
      created_at: daysAgo(12),
    },
    {
      id: newId("rev"),
      reviewer_user_id: alex.id,
      skill_name: "icd10-chart-auditor",
      rating: 5,
      body: "Caught three underspecified primary-dx selections in the first ten charts we ran through it.",
      status: "published",
      created_at: daysAgo(20),
    },
    {
      id: newId("rev"),
      reviewer_user_id: alex.id,
      skill_name: "saas-arr-bridge",
      rating: 4,
      body: "Found a $40K variance between our bridge and the subscription ledger that no one had caught for two quarters.",
      status: "pending",
      created_at: daysAgo(3),
    },
    {
      id: newId("rev"),
      reviewer_user_id: mara.id,
      skill_name: "saas-arr-bridge",
      rating: 4,
      body: "Solid for FP&A but doesn’t know about revrec elections. Useful for the bridge itself though.",
      status: "published",
      created_at: daysAgo(30),
    },
  ];
  saveUserReviews(reviews);

  // Engagements for practitioners
  const engagements: Engagement[] = [
    {
      id: newId("eng"),
      practitioner_user_id: mara.id,
      skill_name: "sec-10k-reviewer",
      buyer_display: "Mid-cap issuer · Associate GC",
      buyer_context:
        "Pre-filing 10-K review, Item 7 MD&A + Item 1A risk factors.",
      amount_cents: 250000, // $2,500
      status: "paid",
      requested_at: daysAgo(21),
      delivered_at: daysAgo(11),
      paid_at: daysAgo(4),
    },
    {
      id: newId("eng"),
      practitioner_user_id: mara.id,
      skill_name: "patent-prior-art-scanner",
      buyer_display: "Software startup · Head of IP",
      buyer_context: "Prior-art search ahead of three non-provisional filings.",
      amount_cents: 120000,
      status: "in_progress",
      requested_at: daysAgo(6),
    },
    {
      id: newId("eng"),
      practitioner_user_id: priya.id,
      skill_name: "icd10-chart-auditor",
      buyer_display: "Hospital system · Director of Coding",
      buyer_context:
        "Pilot audit on 200 encounter notes across three service lines.",
      amount_cents: 450000,
      status: "paid",
      requested_at: daysAgo(40),
      delivered_at: daysAgo(18),
      paid_at: daysAgo(5),
    },
    {
      id: newId("eng"),
      practitioner_user_id: priya.id,
      skill_name: "clinical-trial-protocol-reader",
      buyer_display: "CRO · Clinical Operations",
      buyer_context: "Protocol onboarding for 12 Phase II oncology trials.",
      amount_cents: 180000,
      status: "quoted",
      requested_at: daysAgo(2),
    },
    {
      id: newId("eng"),
      practitioner_user_id: jordan.id,
      skill_name: "saas-arr-bridge",
      buyer_display: "Series B SaaS · FP&A Manager",
      buyer_context: "Monthly close support for Q2 and Q3.",
      amount_cents: 90000,
      status: "delivered",
      requested_at: daysAgo(35),
      delivered_at: daysAgo(7),
    },
  ];
  saveEngagements(engagements);

  // Credit ledger — practitioners earn from paid engagements,
  // Alex starts with a purchased balance and has spent a little.
  const ledger: CreditLedgerEntry[] = [
    ledger_(mara.id, "editorial_grant", 5000, "Welcome to the exchange — onboarding credit.", daysAgo(90)),
    ledger_(mara.id, "earn_engagement", 200000, "sec-10k-reviewer engagement · mid-cap issuer (80% split)", daysAgo(4), "eng-mara-1"),
    ledger_(priya.id, "editorial_grant", 5000, "Welcome to the exchange — onboarding credit.", daysAgo(60)),
    ledger_(priya.id, "earn_engagement", 360000, "icd10-chart-auditor engagement · hospital system (80% split)", daysAgo(5), "eng-priya-1"),
    ledger_(priya.id, "earn_skill_sale", 6930, "99 × clinical-trial-protocol-reader (free skill, editorial grant)", daysAgo(14)),
    ledger_(jordan.id, "editorial_grant", 5000, "Welcome to the exchange — onboarding credit.", daysAgo(45)),
    ledger_(jordan.id, "earn_engagement", 72000, "saas-arr-bridge engagement · SaaS FP&A (80% split, pending final payout)", daysAgo(7), "eng-jordan-1"),
    ledger_(alex.id, "purchase", 100000, "Bought 1,000 credits", daysAgo(22)),
    ledger_(alex.id, "spend", -250000, "sec-10k-reviewer engagement · pre-filing review", daysAgo(4), "eng-mara-1"),
    ledger_(alex.id, "purchase", 200000, "Bought 2,000 credits", daysAgo(3)),
  ];
  saveLedger(ledger);

  // Rebalance each user's cached credits_balance_cents from the ledger.
  for (const u of users) {
    const sum = ledger
      .filter((e) => e.user_id === u.id)
      .reduce((t, e) => t + e.amount_cents, 0);
    const next: User = { ...u, credits_balance_cents: sum };
    const account = (() => {
      const map = loadAccounts();
      return map[u.email.toLowerCase()]!;
    })();
    saveAccount({ ...account, user: next });
  }

  markSeeded();
}

function daysAgo(n: number): string {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000).toISOString();
}
function monthsAgo(n: number): string {
  return new Date(Date.now() - n * 30 * 24 * 60 * 60 * 1000).toISOString();
}

function ledger_(
  user_id: string,
  kind: CreditLedgerEntry["kind"],
  amount_cents: number,
  memo: string,
  at: string,
  ref?: string,
): CreditLedgerEntry {
  return { id: newId("led"), user_id, kind, amount_cents, memo, at, ref };
}
