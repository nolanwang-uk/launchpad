import { describe, test, expect } from "bun:test";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as os from "node:os";
import { runCommand } from "../src/commands/run";

const FIXTURE_DIR = path.join(import.meta.dir, "fixtures", "test-skill");

describe("e2e: skillz run --from-local", () => {
  test("installs hello-world to a scratch dir and exits 0", async () => {
    const scratch = await fs.mkdtemp(path.join(os.tmpdir(), "skillz-e2e-"));
    process.env.SKILLZ_TEST_OUT = scratch;

    try {
      const result = await runCommand("", {
        target: "",
        assumeYes: true,
        acceptRisk: false,
        dryRun: false,
        fromLocal: FIXTURE_DIR,
      });

      expect(result.code).toBe(0);
      expect(result.abortedByUser).toBeFalsy();

      const installed = await fs.readFile(
        path.join(scratch, "hello.md"),
        "utf-8",
      );
      expect(installed).toContain("hello-world");
    } finally {
      delete process.env.SKILLZ_TEST_OUT;
      await fs.rm(scratch, { recursive: true, force: true });
    }
  });

  test("--dry-run prints the diff but does not exec", async () => {
    const scratch = await fs.mkdtemp(path.join(os.tmpdir(), "skillz-e2e-"));
    process.env.SKILLZ_TEST_OUT = scratch;

    try {
      const result = await runCommand("", {
        target: "",
        assumeYes: false,
        acceptRisk: false,
        dryRun: true,
        fromLocal: FIXTURE_DIR,
      });

      expect(result.code).toBe(0);

      // hello.md should NOT exist because dry-run skipped exec
      const exists = await fs
        .stat(path.join(scratch, "hello.md"))
        .then(() => true)
        .catch(() => false);
      expect(exists).toBe(false);
    } finally {
      delete process.env.SKILLZ_TEST_OUT;
      await fs.rm(scratch, { recursive: true, force: true });
    }
  });

  test("fails with EXIT.INPUT when --from-local path is not a directory", async () => {
    const result = await runCommand("", {
      target: "",
      assumeYes: true,
      acceptRisk: false,
      dryRun: false,
      fromLocal: "/nonexistent/path/does/not/exist",
    });
    expect(result.code).toBe(2); // EXIT.INPUT
  });
});
