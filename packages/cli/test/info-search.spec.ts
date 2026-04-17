import { describe, test, expect } from "bun:test";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as os from "node:os";
import { infoCommand } from "../src/commands/info";
import { searchCommand } from "../src/commands/search";

function captureStdout() {
  const orig = process.stdout.write.bind(process.stdout);
  const out: string[] = [];
  process.stdout.write = ((s: string | Uint8Array) => {
    out.push(typeof s === "string" ? s : s.toString());
    return true;
  }) as typeof process.stdout.write;
  return {
    text: () => out.join(""),
    restore: () => {
      process.stdout.write = orig;
    },
  };
}

// A small in-memory registry for search tests — written to a temp file and
// pointed at via the `registry` override so we don't depend on the bundled
// one-entry registry.
const MULTI_REG = {
  schema_version: 1,
  updated_at: "2026-04-17T00:00:00Z",
  entries: [
    {
      schema_version: 1,
      name: "refactor-helper",
      description: "Refactor TypeScript code with AI help.",
      author: "alice",
      license: "MIT",
      repo: "alice/refactor",
      sha: "0123456789abcdef0123456789abcdef01234567",
      tier: "Reviewed",
      targets: ["claude-code"],
      capabilities: { network: false, filesystem: true, shell: false },
      tags: ["refactor", "typescript", "quality"],
      added_at: "2026-04-10T00:00:00Z",
    },
    {
      schema_version: 1,
      name: "test-runner",
      description: "Run and auto-fix failing unit tests.",
      author: "bob",
      license: "Apache-2.0",
      repo: "bob/tests",
      sha: "1234567890abcdef1234567890abcdef12345678",
      tier: "Community",
      targets: ["claude-code"],
      capabilities: { network: false, filesystem: true, shell: true },
      tags: ["testing", "quality"],
      added_at: "2026-04-12T00:00:00Z",
    },
    {
      schema_version: 1,
      name: "docs-generator",
      description: "Generate markdown docs from source comments.",
      author: "alice",
      license: "MIT",
      repo: "alice/docgen",
      sha: "2345678901abcdef2345678901abcdef23456789",
      tier: "Reviewed",
      targets: ["claude-code"],
      capabilities: { network: false, filesystem: true, shell: false },
      tags: ["docs", "markdown"],
      added_at: "2026-04-15T00:00:00Z",
    },
  ],
};

async function withTempRegistry<T>(
  fn: (registryPath: string) => Promise<T>,
): Promise<T> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "skillz-reg-"));
  const p = path.join(dir, "registry.json");
  await fs.writeFile(p, JSON.stringify(MULTI_REG), "utf-8");
  try {
    return await fn(p);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
}

describe("skillz info", () => {
  test("prints entry metadata for a known name", async () => {
    await withTempRegistry(async (reg) => {
      process.env.SKILLZ_REGISTRY = reg;
      const cap = captureStdout();
      try {
        const r = await infoCommand({ name: "refactor-helper", json: false });
        expect(r.code).toBe(0);
        const out = cap.text();
        expect(out).toContain("refactor-helper");
        expect(out).toContain("Reviewed");
        expect(out).toContain("alice");
        expect(out).toContain("refactor, typescript, quality");
        expect(out).toContain("skillz run refactor-helper");
        expect(out).toContain("skillz install refactor-helper");
      } finally {
        cap.restore();
        delete process.env.SKILLZ_REGISTRY;
      }
    });
  });

  test("exits EXIT.INPUT when name is missing", async () => {
    const cap = captureStdout();
    try {
      const r = await infoCommand({ name: "", json: false });
      expect(r.code).toBe(2);
    } finally {
      cap.restore();
    }
  });

  test("exits EXIT.INPUT when name is not in the registry", async () => {
    await withTempRegistry(async (reg) => {
      process.env.SKILLZ_REGISTRY = reg;
      const cap = captureStdout();
      try {
        const r = await infoCommand({ name: "nonexistent", json: false });
        expect(r.code).toBe(2);
      } finally {
        cap.restore();
        delete process.env.SKILLZ_REGISTRY;
      }
    });
  });

  test("--json emits the full raw entry", async () => {
    await withTempRegistry(async (reg) => {
      process.env.SKILLZ_REGISTRY = reg;
      const cap = captureStdout();
      try {
        const r = await infoCommand({ name: "refactor-helper", json: true });
        expect(r.code).toBe(0);
        const parsed = JSON.parse(cap.text());
        expect(parsed.name).toBe("refactor-helper");
        expect(parsed.tier).toBe("Reviewed");
        expect(parsed.capabilities.shell).toBe(false);
      } finally {
        cap.restore();
        delete process.env.SKILLZ_REGISTRY;
      }
    });
  });
});

describe("skillz search", () => {
  test("exact name match scores highest", async () => {
    await withTempRegistry(async (reg) => {
      process.env.SKILLZ_REGISTRY = reg;
      const cap = captureStdout();
      try {
        const r = await searchCommand({
          term: "refactor-helper",
          json: true,
          limit: 20,
        });
        expect(r.code).toBe(0);
        expect(r.hits[0]!.entry.name).toBe("refactor-helper");
        expect(r.hits[0]!.score).toBe(100);
      } finally {
        cap.restore();
        delete process.env.SKILLZ_REGISTRY;
      }
    });
  });

  test("tag match returns entries with that tag", async () => {
    await withTempRegistry(async (reg) => {
      process.env.SKILLZ_REGISTRY = reg;
      const cap = captureStdout();
      try {
        const r = await searchCommand({
          term: "quality",
          json: true,
          limit: 20,
        });
        expect(r.code).toBe(0);
        const names = r.hits.map((h) => h.entry.name);
        expect(names).toContain("refactor-helper");
        expect(names).toContain("test-runner");
        expect(names).not.toContain("docs-generator");
      } finally {
        cap.restore();
        delete process.env.SKILLZ_REGISTRY;
      }
    });
  });

  test("description word match returns matches", async () => {
    await withTempRegistry(async (reg) => {
      process.env.SKILLZ_REGISTRY = reg;
      const cap = captureStdout();
      try {
        const r = await searchCommand({
          term: "markdown",
          json: true,
          limit: 20,
        });
        expect(r.code).toBe(0);
        const names = r.hits.map((h) => h.entry.name);
        expect(names).toContain("docs-generator");
      } finally {
        cap.restore();
        delete process.env.SKILLZ_REGISTRY;
      }
    });
  });

  test("no match returns empty list with exit 0", async () => {
    await withTempRegistry(async (reg) => {
      process.env.SKILLZ_REGISTRY = reg;
      const cap = captureStdout();
      try {
        const r = await searchCommand({
          term: "zzzzzzzzz",
          json: true,
          limit: 20,
        });
        expect(r.code).toBe(0);
        expect(r.hits).toEqual([]);
      } finally {
        cap.restore();
        delete process.env.SKILLZ_REGISTRY;
      }
    });
  });

  test("empty term is an input error", async () => {
    const cap = captureStdout();
    try {
      const r = await searchCommand({ term: "", json: true, limit: 20 });
      expect(r.code).toBe(2);
    } finally {
      cap.restore();
    }
  });

  test("--limit caps results", async () => {
    await withTempRegistry(async (reg) => {
      process.env.SKILLZ_REGISTRY = reg;
      const cap = captureStdout();
      try {
        // 'e' matches all three entries (in 'refactor-helper', 'test-runner',
        // 'docs-generator') via description/name contains.
        const r = await searchCommand({ term: "e", json: true, limit: 2 });
        expect(r.code).toBe(0);
        expect(r.hits.length).toBeLessThanOrEqual(2);
      } finally {
        cap.restore();
        delete process.env.SKILLZ_REGISTRY;
      }
    });
  });
});
