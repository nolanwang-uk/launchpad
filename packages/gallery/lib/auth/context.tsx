"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { User, UserRole } from "./types";
import { generateSalt, hashPassword, verifyPassword } from "./hash";
import { newId } from "./id";
import {
  clearSession,
  findAccountByEmail,
  loadSession,
  saveAccount,
  updateUser as storageUpdateUser,
  writeSession,
} from "./storage";
import { runSeedIfNeeded } from "./seed";

/**
 * Client-side auth context. The provider mounts once at the root
 * layout, runs the seed on first load, and exposes a narrow API
 * (login / register / logout / updateUser). Protected routes read
 * `user` and `loading` from this hook — when `loading` is false and
 * `user` is null, the route should redirect to /login.
 */

type AuthState = {
  user: User | null;
  loading: boolean;
};

type AuthApi = {
  login(email: string, password: string): Promise<void>;
  register(input: {
    email: string;
    password: string;
    display_name: string;
    role: UserRole;
  }): Promise<void>;
  logout(): void;
  updateUser(patch: Partial<User>): void;
};

const AuthCtx = createContext<(AuthState & AuthApi) | null>(null);

export class AuthError extends Error {
  constructor(
    message: string,
    public readonly code:
      | "invalid_credentials"
      | "email_taken"
      | "weak_password"
      | "invalid_email"
      | "display_name_required",
  ) {
    super(message);
  }
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    loading: true,
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await runSeedIfNeeded();
      if (cancelled) return;
      const session = loadSession();
      setState({ user: session?.user ?? null, loading: false });
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const normalizedEmail = email.trim().toLowerCase();
    if (!EMAIL_RE.test(normalizedEmail)) {
      throw new AuthError("Email looks off.", "invalid_email");
    }
    const account = findAccountByEmail(normalizedEmail);
    if (!account) {
      throw new AuthError(
        "No account with that email. Sign up first.",
        "invalid_credentials",
      );
    }
    const ok = await verifyPassword(
      password,
      account.password_salt,
      account.password_hash,
    );
    if (!ok) {
      throw new AuthError("Wrong password.", "invalid_credentials");
    }
    writeSession(account.user);
    setState({ user: account.user, loading: false });
  }, []);

  const register = useCallback(
    async (input: {
      email: string;
      password: string;
      display_name: string;
      role: UserRole;
    }) => {
      const email = input.email.trim().toLowerCase();
      const display_name = input.display_name.trim();
      if (!EMAIL_RE.test(email)) {
        throw new AuthError("That email looks off.", "invalid_email");
      }
      if (input.password.length < 8) {
        throw new AuthError(
          "Password must be at least 8 characters.",
          "weak_password",
        );
      }
      if (display_name.length < 2) {
        throw new AuthError(
          "Display name required.",
          "display_name_required",
        );
      }
      if (findAccountByEmail(email)) {
        throw new AuthError(
          "An account with that email already exists.",
          "email_taken",
        );
      }
      const salt = generateSalt();
      const hash = await hashPassword(input.password, salt);
      const slug = slugFromEmail(email, display_name);
      const now = new Date().toISOString();
      const user: User = {
        id: newId("u"),
        email,
        display_name,
        slug,
        role: input.role,
        credits_balance_cents: 0,
        email_prefs: {
          engagement_requests: true,
          review_published: true,
          weekly_digest: true,
          product_updates: false,
        },
        created_at: now,
      };
      saveAccount({ user, password_hash: hash, password_salt: salt });
      writeSession(user);
      setState({ user, loading: false });
    },
    [],
  );

  const logout = useCallback(() => {
    clearSession();
    setState({ user: null, loading: false });
  }, []);

  const updateUser = useCallback((patch: Partial<User>) => {
    setState((prev) => {
      if (!prev.user) return prev;
      const next = { ...prev.user, ...patch };
      storageUpdateUser(next);
      writeSession(next);
      return { user: next, loading: false };
    });
  }, []);

  const value = useMemo(
    () => ({ ...state, login, register, logout, updateUser }),
    [state, login, register, logout, updateUser],
  );

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthCtx);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider.");
  }
  return ctx;
}

function slugFromEmail(email: string, name: string): string {
  const candidate = name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (candidate.length > 0) return candidate.slice(0, 64);
  const local = email.split("@")[0] ?? "user";
  return local.replace(/[^a-z0-9]+/g, "-").slice(0, 64) || "user";
}
