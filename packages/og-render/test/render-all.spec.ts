import { describe, test, expect } from "bun:test";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as os from "node:os";
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";

const CLI = path.join(import.meta.dir, "..", "src", "render-all.ts");

// These tests exercise the CLI's arg-parsing + cache logic by pointing it
// at tiny synthetic registry files with unrenderable state (e.g. a
// registry with zero entries) so we don't need Playwright + Chromium to
// run them. The actual render path is covered by the real smoke test
// run against the real registry.

type Run = { code: number; stdout: string; stderr: string };

function runRenderAll(env: NodeJS.ProcessEnv, args: string[]): Promise<Run> {
  return new Promise((resolve) => {
    const child = spawn("bun", [CLI, ...args], {
      stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env, ...env },
    });
    let stdout = "";
    let stderr = "";
    child.stdout?.on("data", (d: Buffer) => (stdout += d.toString()));
    child.stderr?.on("data", (d: Buffer) => (stderr += d.toString()));
    child.on("exit", (code) =>
      resolve({ code: code ?? -1, stdout, stderr }),
    );
  });
}

async function writeRegistry(dir: string, entries: unknown[]): Promise<string> {
  const p = path.join(dir, "registry.json");
  await fs.writeFile(
    p,
    JSON.stringify({
      schema_version: 1,
      updated_at: "2026-04-19T00:00:00Z",
      entries,
    }),
    "utf-8",
  );
  return p;
}

describe("render-all CLI", () => {
  test("reports all up-to-date on an empty registry (no browser launch)", async () => {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "og-empty-"));
    try {
      const reg = await writeRegistry(tmp, []);
      const out = path.join(tmp, "og");
      const r = await runRenderAll({}, ["--registry", reg, "--out", out]);
      expect(r.code).toBe(0);
      expect(r.stdout).toContain("up-to-date");
      // Still writes the manifest for idempotency.
      expect(existsSync(path.join(out, ".manifest.json"))).toBe(true);
    } finally {
      await fs.rm(tmp, { recursive: true, force: true });
    }
  });

  test("fails clean when the registry file is invalid JSON", async () => {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "og-badjson-"));
    try {
      const reg = path.join(tmp, "registry.json");
      await fs.writeFile(reg, "{not valid", "utf-8");
      const r = await runRenderAll({}, ["--registry", reg, "--out", path.join(tmp, "og")]);
      expect(r.code).toBe(1);
      expect(r.stderr).toContain("og-render failed");
    } finally {
      await fs.rm(tmp, { recursive: true, force: true });
    }
  });

  test("fails clean when the registry fails schema validation", async () => {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "og-bad-"));
    try {
      // entry uses a branch name instead of a SHA — validator must reject.
      const reg = await writeRegistry(tmp, [
        {
          schema_version: 1,
          name: "bad",
          description: "invalid sha",
          author: "t",
          license: "MIT",
          repo: "foo/bar",
          sha: "main",
          tier: "Reviewed",
          targets: ["claude-code"],
          capabilities: { network: false, filesystem: true, shell: false },
          tags: [],
          added_at: "2026-04-19T00:00:00Z",
        },
      ]);
      const r = await runRenderAll({}, ["--registry", reg, "--out", path.join(tmp, "og")]);
      expect(r.code).toBe(1);
      expect(r.stderr).toContain("validation");
    } finally {
      await fs.rm(tmp, { recursive: true, force: true });
    }
  });

  test("cache is valid on subsequent runs (manifest survives)", async () => {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "og-cache-"));
    try {
      const reg = await writeRegistry(tmp, []);
      const out = path.join(tmp, "og");
      await runRenderAll({}, ["--registry", reg, "--out", out]);

      const mani1 = JSON.parse(
        await fs.readFile(path.join(out, ".manifest.json"), "utf-8"),
      );
      expect(mani1).toEqual({});

      // Run a second time — should still succeed and still show up-to-date.
      const r = await runRenderAll({}, ["--registry", reg, "--out", out]);
      expect(r.code).toBe(0);
      expect(r.stdout).toContain("up-to-date");
    } finally {
      await fs.rm(tmp, { recursive: true, force: true });
    }
  });
});
