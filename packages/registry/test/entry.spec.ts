import { describe, test, expect } from "bun:test";
import { validateRegistry, validateEntry } from "../src/entry";

const GOOD_ENTRY = {
  schema_version: 1,
  name: "awesome-refactor",
  description: "One-line summary.",
  author: "nolan",
  license: "MIT",
  repo: "launchpad-skills/awesome-refactor",
  sha: "0123456789abcdef0123456789abcdef01234567",
  tier: "Reviewed",
  targets: ["claude-code"],
  capabilities: { network: false, filesystem: true, shell: false },
  tags: ["refactor", "quality"],
  added_at: "2026-04-17T00:00:00Z",
};

describe("registry entry validator", () => {
  test("accepts a valid entry", () => {
    expect(validateEntry(GOOD_ENTRY, 0).ok).toBe(true);
  });

  test("rejects a short SHA", () => {
    const r = validateEntry({ ...GOOD_ENTRY, sha: "abc1234" }, 0);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.join(" ")).toContain("sha");
  });

  test("rejects a tag name in sha", () => {
    const r = validateEntry({ ...GOOD_ENTRY, sha: "v1.0.0" }, 0);
    expect(r.ok).toBe(false);
  });

  test("rejects unknown target", () => {
    const r = validateEntry({ ...GOOD_ENTRY, targets: ["cursor"] }, 0);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.join(" ")).toContain("cursor");
  });

  test("rejects invalid tier", () => {
    const r = validateEntry({ ...GOOD_ENTRY, tier: "Gold" }, 0);
    expect(r.ok).toBe(false);
  });

  test("rejects non-boolean capability", () => {
    const r = validateEntry(
      { ...GOOD_ENTRY, capabilities: { network: "false", filesystem: true, shell: false } },
      0,
    );
    expect(r.ok).toBe(false);
  });

  test("rejects uppercase name", () => {
    const r = validateEntry({ ...GOOD_ENTRY, name: "Awesome" }, 0);
    expect(r.ok).toBe(false);
  });

  test("rejects bad repo format", () => {
    const r = validateEntry({ ...GOOD_ENTRY, repo: "just-a-name" }, 0);
    expect(r.ok).toBe(false);
  });
});

describe("registry-level validator", () => {
  test("accepts a valid registry", () => {
    const reg = {
      schema_version: 1,
      updated_at: "2026-04-17T00:00:00Z",
      entries: [GOOD_ENTRY],
    };
    expect(validateRegistry(reg).ok).toBe(true);
  });

  test("rejects duplicate names", () => {
    const reg = {
      schema_version: 1,
      updated_at: "2026-04-17T00:00:00Z",
      entries: [GOOD_ENTRY, GOOD_ENTRY],
    };
    const r = validateRegistry(reg);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.join(" ")).toContain("duplicate");
  });

  test("rejects missing entries array", () => {
    const r = validateRegistry({
      schema_version: 1,
      updated_at: "2026-04-17T00:00:00Z",
    });
    expect(r.ok).toBe(false);
  });

  test("aggregates multiple errors", () => {
    const reg = {
      schema_version: 1,
      updated_at: "2026-04-17T00:00:00Z",
      entries: [
        { ...GOOD_ENTRY, sha: "bad" },
        { ...GOOD_ENTRY, name: "BAD", sha: "main" },
      ],
    };
    const r = validateRegistry(reg);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.length).toBeGreaterThanOrEqual(3);
  });

  test("validates the actual bundled registry.json", async () => {
    const raw = await Bun.file(
      new URL("../registry.json", import.meta.url),
    ).json();
    const r = validateRegistry(raw);
    if (!r.ok) console.error(r.errors);
    expect(r.ok).toBe(true);
  });
});
