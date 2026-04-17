import { describe, test, expect } from "bun:test";
import { spawn } from "node:child_process";
import * as path from "node:path";

const CLI_PATH = path.join(import.meta.dir, "..", "src", "validate-cli.ts");
const FIXTURES = path.join(import.meta.dir, "fixtures");

type Result = { code: number; stdout: string; stderr: string };

function run(args: string[]): Promise<Result> {
  return new Promise((resolve) => {
    const child = spawn("bun", [CLI_PATH, ...args], { stdio: "pipe" });
    let stdout = "";
    let stderr = "";
    child.stdout?.on("data", (d) => (stdout += d.toString()));
    child.stderr?.on("data", (d) => (stderr += d.toString()));
    child.on("exit", (code) =>
      resolve({ code: code ?? -1, stdout, stderr }),
    );
  });
}

describe("registry validate-cli", () => {
  test("exits 0 on the bundled registry.json", async () => {
    const registry = path.join(import.meta.dir, "..", "registry.json");
    const r = await run(["--path", registry]);
    expect(r.code).toBe(0);
    expect(r.stdout).toContain("all checks passed");
  });

  test("exits 0 on the good fixture", async () => {
    const r = await run(["--path", path.join(FIXTURES, "good-registry.json")]);
    expect(r.code).toBe(0);
  });

  test("exits 1 on the bad fixture and reports multiple errors", async () => {
    const r = await run(["--path", path.join(FIXTURES, "bad-registry.json")]);
    expect(r.code).toBe(1);
    expect(r.stderr).toContain("error");
    // Bad fixture has: bad name pattern, bad sha, bad tier, unknown target,
    // non-boolean capability, bad tag, bad date, duplicate name.
    // Expect at least 5 distinct errors surfaced.
    const errorLines = r.stderr.split("\n").filter((l) => l.trim().length > 0);
    expect(errorLines.length).toBeGreaterThanOrEqual(5);
  });

  test("exits 2 when the file is missing", async () => {
    const r = await run(["--path", "/nonexistent/registry.json"]);
    expect(r.code).toBe(2);
  });

  test("--json emits structured output", async () => {
    const r = await run([
      "--path",
      path.join(FIXTURES, "good-registry.json"),
      "--json",
    ]);
    expect(r.code).toBe(0);
    const parsed = JSON.parse(r.stdout);
    expect(parsed.ok).toBe(true);
    expect(parsed.errors).toEqual([]);
  });

  test("--json on bad fixture includes all errors in the structured output", async () => {
    const r = await run([
      "--path",
      path.join(FIXTURES, "bad-registry.json"),
      "--json",
    ]);
    expect(r.code).toBe(1);
    const parsed = JSON.parse(r.stdout);
    expect(parsed.ok).toBe(false);
    expect(parsed.errors.length).toBeGreaterThanOrEqual(5);
    expect(parsed.errors.some((e: string) => e.includes("duplicate"))).toBe(
      true,
    );
    expect(parsed.errors.some((e: string) => e.includes("sha"))).toBe(true);
  });
});
