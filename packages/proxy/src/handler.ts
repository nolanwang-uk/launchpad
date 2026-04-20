/**
 * Edge proxy for codeload.github.com/<owner>/<repo>/tar.gz/<sha>.
 *
 * Why this exists:
 *   - GitHub unauth rate limit is 60 requests/hour/IP. One viral tweet
 *     reaches that in minutes.
 *   - A commit SHA is immutable. So are the tarballs codeload produces
 *     for a given SHA. We can safely cache them forever.
 *   - Vercel's edge network gives us a shared, region-aware cache for
 *     free. Keying on (owner, repo, sha) makes every install that
 *     requests the same skill a cache hit after the first.
 *
 * This handler is a pure (Request, fetch) → Response function so it's
 * easy to test without spinning up a runtime. The Vercel wrapper in
 * api/archive.ts just forwards to this.
 */

export const OWNER_RE = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,38}$/;
export const REPO_RE = /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,99}$/;
export const SHA_RE = /^[0-9a-f]{40}$/;

export type ProxyInput = {
  owner: string | null;
  repo: string | null;
  sha: string | null;
};

export function parsePath(url: string): ProxyInput {
  const u = new URL(url);
  // Expected path: /api/archive/<owner>/<repo>/<sha>
  const parts = u.pathname.split("/").filter((p) => p.length > 0);
  // parts = ["api", "archive", owner, repo, sha]
  if (parts.length !== 5 || parts[0] !== "api" || parts[1] !== "archive") {
    return { owner: null, repo: null, sha: null };
  }
  return {
    owner: parts[2] ?? null,
    repo: parts[3] ?? null,
    sha: parts[4] ?? null,
  };
}

export function badRequest(msg: string): Response {
  return new Response(
    JSON.stringify({ error: "bad-request", detail: msg }) + "\n",
    {
      status: 400,
      headers: {
        "content-type": "application/json",
        "cache-control": "public, max-age=60",
      },
    },
  );
}

/**
 * Core handler. `upstream` is injected so tests can stub GitHub.
 */
export async function handleArchive(
  req: Request,
  upstream: typeof fetch = fetch,
): Promise<Response> {
  if (req.method !== "GET" && req.method !== "HEAD") {
    return new Response("method not allowed", {
      status: 405,
      headers: { "cache-control": "public, max-age=3600", "allow": "GET, HEAD" },
    });
  }

  const { owner, repo, sha } = parsePath(req.url);

  if (!owner || !OWNER_RE.test(owner)) {
    return badRequest("invalid owner (expected [A-Za-z0-9-], 1-39 chars)");
  }
  if (!repo || !REPO_RE.test(repo)) {
    return badRequest("invalid repo (expected [A-Za-z0-9._-], 1-100 chars)");
  }
  if (!sha || !SHA_RE.test(sha)) {
    return badRequest("invalid sha (must be 40-char lowercase hex)");
  }

  const upstreamUrl = `https://codeload.github.com/${owner}/${repo}/tar.gz/${sha}`;

  let upstreamRes: Response;
  try {
    upstreamRes = await upstream(upstreamUrl, {
      method: req.method,
      // codeload uses 302 → objects.githubusercontent.com. Follow so we
      // can cache the terminal response, not the redirect.
      redirect: "follow",
    });
  } catch (e) {
    // Network error reaching GitHub. Make this a 502 so the CLI's
    // fallback path kicks in to codeload directly.
    return new Response(
      JSON.stringify({
        error: "upstream-unreachable",
        detail: e instanceof Error ? e.message : String(e),
      }) + "\n",
      {
        status: 502,
        headers: {
          "content-type": "application/json",
          "cache-control": "public, max-age=10",
        },
      },
    );
  }

  if (!upstreamRes.ok) {
    // 404 from GitHub = the SHA or repo genuinely doesn't exist.
    // Do NOT cache that forever — a force-push could make it appear later.
    // For 5xx, pass through with a short TTL so we don't pin a transient
    // failure at the edge.
    const ttl = upstreamRes.status >= 500 ? 10 : 60;
    return new Response(
      JSON.stringify({
        error: "upstream-error",
        status: upstreamRes.status,
        detail: upstreamRes.statusText,
      }) + "\n",
      {
        status: upstreamRes.status,
        headers: {
          "content-type": "application/json",
          "cache-control": `public, max-age=${ttl}`,
        },
      },
    );
  }

  // Happy path: tarball body + immutable cache.
  // The SHA is content-addressed, so the body for this URL will never
  // change for the life of the repo. A year of edge cache is plenty.
  const headers = new Headers({
    "content-type": "application/gzip",
    "cache-control": "public, max-age=31536000, immutable",
    "x-launchpad-proxy": "codeload-v1",
  });
  // Pass through a useful subset of upstream headers.
  const passthrough = ["etag", "last-modified", "content-length"];
  for (const h of passthrough) {
    const v = upstreamRes.headers.get(h);
    if (v) headers.set(h, v);
  }

  return new Response(upstreamRes.body, {
    status: 200,
    headers,
  });
}
