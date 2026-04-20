import type { RepoRef } from "./fetch";

export const DEFAULT_ARCHIVE_BASE = "https://launchpad.dev/api/archive";
export const CODELOAD_BASE = "https://codeload.github.com";

/**
 * Resolve the Launchpad edge-proxy URL for this ref. Users can override
 * via SKILLZ_ARCHIVE_BASE (e.g. for a self-hosted proxy, or to bypass
 * the proxy entirely by pointing this at codeload).
 */
export function primaryArchiveUrl(ref: RepoRef, base?: string): string {
  const root = (
    base ?? process.env.SKILLZ_ARCHIVE_BASE ?? DEFAULT_ARCHIVE_BASE
  ).replace(/\/+$/, "");
  return `${root}/${ref.owner}/${ref.name}/${ref.sha}`;
}

/** Direct codeload URL — the fallback path when the edge proxy is down. */
export function codeloadUrl(ref: RepoRef): string {
  return `${CODELOAD_BASE}/${ref.owner}/${ref.name}/tar.gz/${ref.sha}`;
}

/**
 * Decide whether a proxy response should trigger fallback to codeload.
 *
 * Rule: retry on network errors and 5xx. Do NOT retry on 4xx — those
 * are authoritative "the artifact doesn't exist / you're asking wrong"
 * and retrying codeload directly would produce the same answer with
 * an extra GitHub rate-limit tick on the way.
 *
 * Exception: 429 (rate limit) at the proxy level is weird but not
 * fatal — retry directly in that case since codeload will often serve
 * the anonymous request the proxy was rate-limiting.
 */
export function shouldFallback(res: Response | null, threw: boolean): boolean {
  if (threw) return true;
  if (res === null) return true;
  if (res.status >= 500) return true;
  if (res.status === 429) return true;
  return false;
}

export type FetchResult =
  | { kind: "ok"; res: Response; from: "primary" | "fallback" }
  | { kind: "error"; status: number; message: string };

export type FetchOpts = {
  ref: RepoRef;
  base?: string;
  // Injected for tests.
  fetchImpl?: typeof fetch;
};

/**
 * Try the edge proxy; fall back to codeload on retryable failures.
 * Returns either a streaming Response or a structured error so callers
 * can map to their own exit-code / error-reporting conventions.
 */
export async function fetchArchiveWithFallback(
  opts: FetchOpts,
): Promise<FetchResult> {
  const impl = opts.fetchImpl ?? fetch;
  const primary = primaryArchiveUrl(opts.ref, opts.base);
  const fallback = codeloadUrl(opts.ref);

  let primaryRes: Response | null = null;
  let primaryThrew = false;
  try {
    primaryRes = await impl(primary, { redirect: "follow" });
  } catch {
    primaryThrew = true;
  }

  if (!shouldFallback(primaryRes, primaryThrew)) {
    // primaryRes is non-null here because shouldFallback would have
    // returned true for both null and threw.
    if (primaryRes!.ok) {
      return { kind: "ok", res: primaryRes!, from: "primary" };
    }
    return {
      kind: "error",
      status: primaryRes!.status,
      message: `${primaryRes!.status} ${primaryRes!.statusText}`,
    };
  }

  // Fall back to direct codeload.
  try {
    const fallbackRes = await impl(fallback, { redirect: "follow" });
    if (fallbackRes.ok) {
      return { kind: "ok", res: fallbackRes, from: "fallback" };
    }
    return {
      kind: "error",
      status: fallbackRes.status,
      message: `${fallbackRes.status} ${fallbackRes.statusText} (via fallback)`,
    };
  } catch (e) {
    return {
      kind: "error",
      status: 0,
      message: `both proxy and codeload unreachable: ${e instanceof Error ? e.message : String(e)}`,
    };
  }
}
