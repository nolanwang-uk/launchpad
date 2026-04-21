/**
 * Auth + account-state types. These describe the shape the UI depends
 * on. v1 persists them in localStorage through lib/auth/storage.ts;
 * v2 swaps the storage adapter for a real backend without any UI
 * change. Keep them narrow — anything the UI doesn't need belongs in
 * the backend, not here.
 */

export type UserRole = "reader" | "practitioner" | "both";

export type User = {
  id: string;
  email: string;
  display_name: string;
  /** Slug used for public /p/[slug] routing if role includes practitioner. */
  slug: string;
  role: UserRole;
  /** Short professional credential — optional for readers. */
  credential?: string;
  /** Free-form bio shown on the profile page. */
  bio?: string;
  /** Current credit balance in cents. Derived from the ledger. */
  credits_balance_cents: number;
  /** Opt-in flags for transactional emails. */
  email_prefs: {
    engagement_requests: boolean;
    review_published: boolean;
    weekly_digest: boolean;
    product_updates: boolean;
  };
  created_at: string;
};

/** Auth credentials paired with a user. Never returned from the
 *  AuthContext — only the storage layer sees this. */
export type StoredAccount = {
  user: User;
  /** SHA-256 hex of (salt + password). */
  password_hash: string;
  password_salt: string;
};

/** In-memory session representation — just the user record. */
export type Session = {
  user: User;
};

export type SubmissionStatus =
  | "draft"
  | "under_review"
  | "changes_requested"
  | "published"
  | "rejected";

export type Submission = {
  id: string;
  user_id: string;
  skill_name: string;
  domain: string;
  description: string;
  status: SubmissionStatus;
  submitted_at: string;
  /** Last editorial note to the practitioner. */
  editorial_note?: string;
  /** If published, the resulting registry entry name. */
  published_as?: string;
};

export type UserReviewStatus = "draft" | "pending" | "published" | "rejected";

export type UserReview = {
  id: string;
  reviewer_user_id: string;
  /** The skill being reviewed. */
  skill_name: string;
  rating: number; // 0.0 - 5.0 in 0.5 steps
  body: string;
  status: UserReviewStatus;
  created_at: string;
};

export type EngagementStatus =
  | "requested"
  | "quoted"
  | "in_progress"
  | "delivered"
  | "paid"
  | "cancelled";

export type Engagement = {
  id: string;
  practitioner_user_id: string;
  /** Skill this engagement originated from, if any. */
  skill_name?: string;
  buyer_display: string;
  buyer_context: string;
  amount_cents: number;
  status: EngagementStatus;
  requested_at: string;
  delivered_at?: string;
  paid_at?: string;
};

export type CreditLedgerKind =
  | "purchase"
  | "spend"
  | "earn_engagement"
  | "earn_skill_sale"
  | "editorial_grant"
  | "refund";

export type CreditLedgerEntry = {
  id: string;
  user_id: string;
  kind: CreditLedgerKind;
  amount_cents: number; // positive for earn/purchase, negative for spend
  /** Free-text memo shown next to the entry. */
  memo: string;
  at: string;
  /** Optional cross-ref to an engagement or skill. */
  ref?: string;
};
