import { describe, test, expect } from "bun:test";
import {
  handleArchive,
  parsePath,
  OWNER_RE,
  REPO_RE,
  SHA_RE,
} from "../src/handler";

const SHA = "0123456789abcdef0123456789abcdef01234567";

type StubCall = { url: string; init: RequestInit | undefined };

function stubFetch(response: Response) {
  const calls: StubCall[] = [];
  const fn = (async (url: string | URL | Request, init?: RequestInit) => {
    calls.push({
      url: typeof url === "string" ? url : (url as URL).toString(),
      init,
    });
    return response;
  }) as typeof fetch;
  return { fn, calls };
}

function throwingFetch(err: Error): typeof fetch {
  return (async () => {
    throw err;
  }) as unknown as typeof fetch;
}

describe("path regexes", () => {
  test("owner: valid and invalid", () => {
    expect(OWNER_RE.test("me")).toBe(true);
    expect(OWNER_RE.test("launchpad-skills")).toBe(true);
    expect(OWNER_RE.test("A")).toBe(true);
    expect(OWNER_RE.test("-leading-hyphen")).toBe(false);
    expect(OWNER_RE.test("bad/slash")).toBe(false);
    expect(OWNER_RE.test("a".repeat(40))).toBe(false);
    expect(OWNER_RE.test("")).toBe(false);
  });

  test("repo: valid and invalid", () => {
    expect(REPO_RE.test("foo")).toBe(true);
    expect(REPO_RE.test("my.skill")).toBe(true);
    expect(REPO_RE.test("my_skill")).toBe(true);
    expect(REPO_RE.test("my-skill")).toBe(true);
    expect(REPO_RE.test("foo/bar")).toBe(false);
    expect(REPO_RE.test(".hidden")).toBe(false);
    expect(REPO_RE.test("")).toBe(false);
  });

  test("sha: only 40-char lowercase hex", () => {
    expect(SHA_RE.test(SHA)).toBe(true);
    expect(SHA_RE.test(SHA.toUpperCase())).toBe(false);
    expect(SHA_RE.test("main")).toBe(false);
    expect(SHA_RE.test("v1.0.0")).toBe(false);
    expect(SHA_RE.test(SHA.slice(0, 39))).toBe(false);
    expect(SHA_RE.test(SHA + "0")).toBe(false);
  });
});

describe("parsePath", () => {
  test("extracts owner/repo/sha from a valid path", () => {
    const p = parsePath("https://lp.dev/api/archive/foo/bar/" + SHA);
    expect(p).toEqual({ owner: "foo", repo: "bar", sha: SHA });
  });

  test("returns nulls for a wrong-shape path", () => {
    expect(parsePath("https://lp.dev/api/archive")).toEqual({
      owner: null,
      repo: null,
      sha: null,
    });
    expect(parsePath("https://lp.dev/api/archive/foo")).toEqual({
      owner: null,
      repo: null,
      sha: null,
    });
    expect(parsePath("https://lp.dev/api/archive/foo/bar/" + SHA + "/extra")).toEqual({
      owner: null,
      repo: null,
      sha: null,
    });
  });

  test("returns nulls for a path that's not under /api/archive", () => {
    expect(parsePath("https://lp.dev/docs/foo/bar/" + SHA)).toEqual({
      owner: null,
      repo: null,
      sha: null,
    });
  });
});

describe("handleArchive — validation", () => {
  test("rejects non-GET/HEAD methods with 405", async () => {
    const { fn } = stubFetch(new Response("ok"));
    const res = await handleArchive(
      new Request("https://lp.dev/api/archive/foo/bar/" + SHA, {
        method: "POST",
      }),
      fn,
    );
    expect(res.status).toBe(405);
    expect(res.headers.get("allow")).toBe("GET, HEAD");
  });

  test("400 on missing path parts", async () => {
    const { fn } = stubFetch(new Response("ok"));
    const res = await handleArchive(
      new Request("https://lp.dev/api/archive/foo"),
      fn,
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("bad-request");
  });

  test("400 on invalid owner", async () => {
    const { fn, calls } = stubFetch(new Response("ok"));
    const res = await handleArchive(
      new Request("https://lp.dev/api/archive/-bad/bar/" + SHA),
      fn,
    );
    expect(res.status).toBe(400);
    expect(calls).toEqual([]); // never reaches upstream
  });

  test("400 on invalid sha (branch name, short SHA, uppercase)", async () => {
    const { fn, calls } = stubFetch(new Response("ok"));
    for (const bad of ["main", "abcdef1", SHA.toUpperCase()]) {
      const res = await handleArchive(
        new Request(`https://lp.dev/api/archive/foo/bar/${bad}`),
        fn,
      );
      expect(res.status).toBe(400);
    }
    expect(calls).toEqual([]);
  });
});

describe("handleArchive — happy path", () => {
  test("forwards GET to codeload and caches immutably", async () => {
    const { fn, calls } = stubFetch(
      new Response("fake tarball bytes", {
        status: 200,
        headers: {
          etag: '"abc123"',
          "content-length": "18",
        },
      }),
    );

    const res = await handleArchive(
      new Request(`https://lp.dev/api/archive/foo/bar/${SHA}`),
      fn,
    );

    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("application/gzip");
    expect(res.headers.get("cache-control")).toBe(
      "public, max-age=31536000, immutable",
    );
    expect(res.headers.get("x-launchpad-proxy")).toBe("codeload-v1");
    expect(res.headers.get("etag")).toBe('"abc123"');
    expect(res.headers.get("content-length")).toBe("18");

    expect(calls).toHaveLength(1);
    expect(calls[0]!.url).toBe(
      `https://codeload.github.com/foo/bar/tar.gz/${SHA}`,
    );

    const body = await res.text();
    expect(body).toBe("fake tarball bytes");
  });

  test("HEAD request propagates upstream HEAD (no body work)", async () => {
    const { fn, calls } = stubFetch(
      new Response(null, {
        status: 200,
        headers: { "content-length": "5000" },
      }),
    );
    const res = await handleArchive(
      new Request(`https://lp.dev/api/archive/foo/bar/${SHA}`, {
        method: "HEAD",
      }),
      fn,
    );
    expect(res.status).toBe(200);
    expect(calls[0]!.init?.method).toBe("HEAD");
  });
});

describe("handleArchive — upstream failure modes", () => {
  test("504 / 503 from GitHub → same status, SHORT ttl (so the edge doesn't pin a transient)", async () => {
    const { fn } = stubFetch(
      new Response("server on fire", { status: 503 }),
    );
    const res = await handleArchive(
      new Request(`https://lp.dev/api/archive/foo/bar/${SHA}`),
      fn,
    );
    expect(res.status).toBe(503);
    expect(res.headers.get("cache-control")).toBe("public, max-age=10");
    const body = await res.json();
    expect(body.error).toBe("upstream-error");
  });

  test("404 from GitHub → propagates as 404 but NOT cached forever", async () => {
    const { fn } = stubFetch(new Response("not found", { status: 404 }));
    const res = await handleArchive(
      new Request(`https://lp.dev/api/archive/foo/bar/${SHA}`),
      fn,
    );
    expect(res.status).toBe(404);
    // ttl is 60s — short enough that a force-push making the SHA appear
    // becomes visible within a minute.
    expect(res.headers.get("cache-control")).toBe("public, max-age=60");
  });

  test("thrown fetch error → 502 + short ttl so CLI falls back to codeload", async () => {
    const res = await handleArchive(
      new Request(`https://lp.dev/api/archive/foo/bar/${SHA}`),
      throwingFetch(new Error("ECONNRESET")),
    );
    expect(res.status).toBe(502);
    expect(res.headers.get("cache-control")).toBe("public, max-age=10");
    const body = await res.json();
    expect(body.error).toBe("upstream-unreachable");
    expect(body.detail).toContain("ECONNRESET");
  });
});
