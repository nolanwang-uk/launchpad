"use client";

import type {
  CreditLedgerEntry,
  Engagement,
  Session,
  StoredAccount,
  Submission,
  User,
  UserReview,
} from "./types";

/**
 * Client-only storage adapter. Every read/write funnels through this
 * module so swapping localStorage for a real API is one file. All
 * methods return synchronously — the real backend adapter will return
 * Promises, so when we port, each call site gets an `await` added and
 * every method signature gains a Promise wrapper. No other UI change.
 *
 * Keys are namespaced with a version so future schema migrations can
 * detect stale data and re-seed.
 */

const NS = "launchpad.v1";

const KEYS = {
  accounts: `${NS}.auth.accounts`,
  session: `${NS}.auth.session`,
  submissions: `${NS}.submissions`,
  reviews: `${NS}.reviews`,
  engagements: `${NS}.engagements`,
  ledger: `${NS}.ledger`,
  seeded: `${NS}.seeded`,
  saved: `${NS}.saved`,
} as const;

function safeRead<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function safeWrite(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // QuotaExceeded or private-mode throw — drop silently; the UI
    // works without persistence this session.
  }
}

// ---- Accounts (email → StoredAccount map) ----

export function loadAccounts(): Record<string, StoredAccount> {
  return safeRead<Record<string, StoredAccount>>(KEYS.accounts, {});
}

export function saveAccount(account: StoredAccount) {
  const map = loadAccounts();
  map[account.user.email.toLowerCase()] = account;
  safeWrite(KEYS.accounts, map);
}

export function findAccountByEmail(email: string): StoredAccount | undefined {
  return loadAccounts()[email.toLowerCase()];
}

export function findAccountByUserId(userId: string): StoredAccount | undefined {
  return Object.values(loadAccounts()).find((a) => a.user.id === userId);
}

export function updateUser(updated: User) {
  const map = loadAccounts();
  const existing = map[updated.email.toLowerCase()];
  if (!existing) return;
  map[updated.email.toLowerCase()] = { ...existing, user: updated };
  safeWrite(KEYS.accounts, map);
}

// ---- Session ----

export function loadSession(): Session | null {
  const session = safeRead<Session | null>(KEYS.session, null);
  if (!session) return null;
  // Session stores a user snapshot. Re-hydrate from the accounts
  // store so edits persist across tabs.
  const fresh = findAccountByUserId(session.user.id);
  if (!fresh) {
    clearSession();
    return null;
  }
  return { user: fresh.user };
}

export function writeSession(user: User) {
  safeWrite(KEYS.session, { user } satisfies Session);
}

export function clearSession() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(KEYS.session);
}

// ---- Submissions ----

export function loadSubmissions(): Submission[] {
  return safeRead<Submission[]>(KEYS.submissions, []);
}

export function saveSubmissions(list: Submission[]) {
  safeWrite(KEYS.submissions, list);
}

export function submissionsForUser(userId: string): Submission[] {
  return loadSubmissions().filter((s) => s.user_id === userId);
}

// ---- Reviews ----

export function loadUserReviews(): UserReview[] {
  return safeRead<UserReview[]>(KEYS.reviews, []);
}

export function saveUserReviews(list: UserReview[]) {
  safeWrite(KEYS.reviews, list);
}

export function reviewsByUser(userId: string): UserReview[] {
  return loadUserReviews().filter((r) => r.reviewer_user_id === userId);
}

// ---- Engagements ----

export function loadEngagements(): Engagement[] {
  return safeRead<Engagement[]>(KEYS.engagements, []);
}

export function saveEngagements(list: Engagement[]) {
  safeWrite(KEYS.engagements, list);
}

export function engagementsForPractitioner(userId: string): Engagement[] {
  return loadEngagements().filter((e) => e.practitioner_user_id === userId);
}

// ---- Credit ledger ----

export function loadLedger(): CreditLedgerEntry[] {
  return safeRead<CreditLedgerEntry[]>(KEYS.ledger, []);
}

export function saveLedger(list: CreditLedgerEntry[]) {
  safeWrite(KEYS.ledger, list);
}

export function ledgerForUser(userId: string): CreditLedgerEntry[] {
  return loadLedger()
    .filter((e) => e.user_id === userId)
    .sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
}

export function appendLedgerEntry(entry: CreditLedgerEntry) {
  const list = loadLedger();
  list.push(entry);
  safeWrite(KEYS.ledger, list);
}

// ---- Saved items (favorites) ----

/**
 * Shape: Record<user_id, { skill_name: string; saved_at: string }[]>.
 * Keyed by user so multiple demo accounts in the same browser each
 * have their own bookmarks.
 */
type SavedMap = Record<string, { skill_name: string; saved_at: string }[]>;

export function loadSavedMap(): SavedMap {
  return safeRead<SavedMap>(KEYS.saved, {});
}

export function savedForUser(
  userId: string,
): { skill_name: string; saved_at: string }[] {
  return loadSavedMap()[userId] ?? [];
}

export function isSaved(userId: string, skillName: string): boolean {
  return savedForUser(userId).some((s) => s.skill_name === skillName);
}

export function toggleSaved(
  userId: string,
  skillName: string,
): { saved: boolean } {
  const map = loadSavedMap();
  const list = map[userId] ?? [];
  const exists = list.find((s) => s.skill_name === skillName);
  if (exists) {
    map[userId] = list.filter((s) => s.skill_name !== skillName);
    safeWrite(KEYS.saved, map);
    return { saved: false };
  }
  map[userId] = [
    { skill_name: skillName, saved_at: new Date().toISOString() },
    ...list,
  ];
  safeWrite(KEYS.saved, map);
  return { saved: true };
}

// ---- Seed gate ----

export function hasSeeded(): boolean {
  return safeRead<boolean>(KEYS.seeded, false);
}

export function markSeeded() {
  safeWrite(KEYS.seeded, true);
}

/**
 * Hard reset — used by settings → "Reset local state" and by
 * seed re-runs during development. Wipes every namespaced key.
 */
export function wipeAll() {
  if (typeof window === "undefined") return;
  for (const key of Object.values(KEYS)) {
    window.localStorage.removeItem(key);
  }
}
