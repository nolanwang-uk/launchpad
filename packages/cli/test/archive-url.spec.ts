import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import {
  primaryArchiveUrl,
  codeloadUrl,
  shouldFallback,
  fetchArchiveWithFallback,
  DEFAULT_ARCHIVE_BASE,
  CODELOAD_BASE,
} from "../src/archive-url";

const REF = {
  owner: "launchpad-skills",
  name: "hello-world",
  sha: "0123456789abcdef0123456789abcdef01234567",
};

describe("URL builders", () => {
  test("primaryArchiveUrl defaults to launchpad.dev/api/archive", () => {
    delete process.env.SKILLZ_ARCHIVE_BASE;
    expect(primaryArchiveUrl(REF)).toBe(
      `${DEFAULT_ARCHIVE_BASE}/launchpad-skills/hello-world/${REF.sha}`,
    );
  });

  test("primaryArchiveUrl honors SKILLZ_ARCHIVE_BASE", () => {
    process.env.SKILLZ_ARCHIVE_BASE = "https://my-proxy.example/archive/";
    try {
      expect(primaryArchiveUrl(REF)).toBe(
        `https://my-proxy.example/archive/launchpad-skills/hello-world/${REF.sha}`,
      );
    } finally {
      delete process.env.SKILLZ_ARCHIVE_BASE;
    }
  });

  test("primaryArchiveUrl takes an explicit base over the env", () => {
    process.env.SKILLZ_ARCHIVE_BASE = "https://ignored.example/";
    try {
      expect(primaryArchiveUrl(REF, "https://explicit.example")).toBe(
        `https://explicit.example/launchpad-skills/hello-world/${REF.sha}`,
      );
    } finally {
      delete process.env.SKILLZ_ARCHIVE_BASE;
    }
  });

  test("codeloadUrl always points at the canonical GitHub endpoint", () => {
    expect(codeloadUrl(REF)).toBe(
      `${CODELOAD_BASE}/launchpad-skills/hello-world/tar.gz/${REF.sha}`,
    );
  });
});

describe("shouldFallback", () => {
  test("retries on network throw", () => {
    expect(shouldFallback(null, true)).toBe(true);
  });

  test("retries on 5xx", () => {
    expect(shouldFallback(new Response("", { status: 500 }), false)).toBe(true);
    expect(shouldFallback(new Response("", { status: 502 }), false)).toBe(true);
    expect(shouldFallback(new Response("", { status: 503 }), false)).toBe(true);
    expect(shouldFallback(new Response("", { status: 504 }), false)).toBe(true);
  });

  test("retries on 429 (proxy rate limit, codeload may not have one)", () => {
    expect(shouldFallback(new Response("", { status: 429 }), false)).toBe(true);
  });

  test("does NOT retry on 404 (authoritative missing)", () => {
    expect(shouldFallback(new Response("", { status: 404 }), false)).toBe(false);
  });

  test("does NOT retry on 400 (our own validator rejected the URL)", () => {
    expect(shouldFallback(new Response("", { status: 400 }), false)).toBe(false);
  });

  test("does NOT retry on 200", () => {
    expect(shouldFallback(new Response("", { status: 200 }), false)).toBe(false);
  });
});

describe("fetchArchiveWithFallback", () => {
  type Call = { url: string };

  function mkStub(
    responses: Array<Response | Error>,
  ): { fn: typeof fetch; calls: Call[] } {
    const calls: Call[] = [];
    let i = 0;
    const fn = (async (url: string | URL | Request) => {
      calls.push({
        url: typeof url === "string" ? url : (url as URL).toString(),
      });
      const r = responses[i++];
      if (!r) throw new Error("stub ran out of responses");
      if (r instanceof Error) throw r;
      return r;
    }) as typeof fetch;
    return { fn, calls };
  }

  beforeEach(() => {
    delete process.env.SKILLZ_ARCHIVE_BASE;
  });
  afterEach(() => {
    delete process.env.SKILLZ_ARCHIVE_BASE;
  });

  test("happy path: primary returns 200 — fallback not called", async () => {
    const { fn, calls } = mkStub([
      new Response("tarball", { status: 200 }),
    ]);
    const r = await fetchArchiveWithFallback({ ref: REF, fetchImpl: fn });
    expect(r.kind).toBe("ok");
    if (r.kind === "ok") {
      expect(r.from).toBe("primary");
      expect(await r.res.text()).toBe("tarball");
    }
    expect(calls).toHaveLength(1);
    expect(calls[0]!.url).toContain(DEFAULT_ARCHIVE_BASE);
  });

  test("primary 503 → falls back to codeload and returns the good response", async () => {
    const { fn, calls } = mkStub([
      new Response("edge failed", { status: 503 }),
      new Response("codeload tarball", { status: 200 }),
    ]);
    const r = await fetchArchiveWithFallback({ ref: REF, fetchImpl: fn });
    expect(r.kind).toBe("ok");
    if (r.kind === "ok") {
      expect(r.from).toBe("fallback");
      expect(await r.res.text()).toBe("codeload tarball");
    }
    expect(calls).toHaveLength(2);
    expect(calls[0]!.url).toContain(DEFAULT_ARCHIVE_BASE);
    expect(calls[1]!.url).toContain(CODELOAD_BASE);
  });

  test("primary throws → falls back", async () => {
    const { fn, calls } = mkStub([
      new Error("ECONNRESET"),
      new Response("codeload tarball", { status: 200 }),
    ]);
    const r = await fetchArchiveWithFallback({ ref: REF, fetchImpl: fn });
    expect(r.kind).toBe("ok");
    if (r.kind === "ok") expect(r.from).toBe("fallback");
    expect(calls).toHaveLength(2);
  });

  test("primary 404 does NOT fall back — returns an error immediately", async () => {
    const { fn, calls } = mkStub([
      new Response("not found", { status: 404 }),
    ]);
    const r = await fetchArchiveWithFallback({ ref: REF, fetchImpl: fn });
    expect(r.kind).toBe("error");
    if (r.kind === "error") {
      expect(r.status).toBe(404);
    }
    expect(calls).toHaveLength(1);
  });

  test("both fail → returns error with combined message", async () => {
    const { fn, calls } = mkStub([
      new Response("", { status: 503 }),
      new Response("", { status: 500 }),
    ]);
    const r = await fetchArchiveWithFallback({ ref: REF, fetchImpl: fn });
    expect(r.kind).toBe("error");
    if (r.kind === "error") {
      expect(r.status).toBe(500);
      expect(r.message).toContain("fallback");
    }
    expect(calls).toHaveLength(2);
  });

  test("primary throws + fallback throws → error with 0 status", async () => {
    const { fn } = mkStub([
      new Error("ECONNRESET"),
      new Error("EHOSTUNREACH"),
    ]);
    const r = await fetchArchiveWithFallback({ ref: REF, fetchImpl: fn });
    expect(r.kind).toBe("error");
    if (r.kind === "error") {
      expect(r.status).toBe(0);
      expect(r.message).toContain("both proxy and codeload unreachable");
    }
  });
});
