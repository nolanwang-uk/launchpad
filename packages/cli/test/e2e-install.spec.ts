import { describe, test, expect } from "bun:test";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as os from "node:os";
import { installCommand } from "../src/commands/install";
import { uninstallCommand } from "../src/commands/uninstall";
import { listCommand } from "../src/commands/list";

const FIXTURE_DIR = path.join(import.meta.dir, "fixtures", "test-skill");

async function mkScratch(): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), "skillz-install-test-"));
}

describe("e2e: skillz install / uninstall / list", () => {
  test("install copies files, runs install_commands, writes lock file", async () => {
    const skillsRoot = await mkScratch();
    process.env.SKILLZ_TEST_OUT = skillsRoot; // the fixture writes here too

    try {
      const result = await installCommand("", {
        targetRoot: skillsRoot,
        assumeYes: true,
        acceptRisk: false,
        dryRun: false,
        fromLocal: FIXTURE_DIR,
      });

      expect(result.code).toBe(0);
      expect(result.installedTo).toBe(path.join(skillsRoot, "hello-world"));

      // Lock file written
      const lockRaw = await fs.readFile(
        path.join(skillsRoot, "hello-world", ".skillz-lock.json"),
        "utf-8",
      );
      const lock = JSON.parse(lockRaw);
      expect(lock.name).toBe("hello-world");
      expect(lock.version).toBe("0.1.0");
      expect(lock.sha).toBe("local");
      expect(lock.source_url).toBe("local");
      expect(lock.schema).toBe(1);

      // Copied file present
      const skillMd = await fs.readFile(
        path.join(skillsRoot, "hello-world", "SKILL.md"),
        "utf-8",
      );
      expect(skillMd).toContain("hello-world");
    } finally {
      delete process.env.SKILLZ_TEST_OUT;
      await fs.rm(skillsRoot, { recursive: true, force: true });
    }
  });

  test("list reads installed skills from the skills root", async () => {
    const skillsRoot = await mkScratch();
    process.env.SKILLZ_TEST_OUT = skillsRoot;

    try {
      await installCommand("", {
        targetRoot: skillsRoot,
        assumeYes: true,
        acceptRisk: false,
        dryRun: false,
        fromLocal: FIXTURE_DIR,
      });

      // Capture stdout
      const chunks: string[] = [];
      const origWrite = process.stdout.write.bind(process.stdout);
      process.stdout.write = ((data: string | Uint8Array) => {
        chunks.push(typeof data === "string" ? data : data.toString());
        return true;
      }) as typeof process.stdout.write;

      try {
        const result = await listCommand({
          targetRoot: skillsRoot,
          json: true,
        });
        expect(result.code).toBe(0);
      } finally {
        process.stdout.write = origWrite;
      }

      const out = chunks.join("");
      const parsed = JSON.parse(out);
      expect(parsed).toHaveLength(1);
      expect(parsed[0].name).toBe("hello-world");
    } finally {
      delete process.env.SKILLZ_TEST_OUT;
      await fs.rm(skillsRoot, { recursive: true, force: true });
    }
  });

  test("uninstall removes the skill directory", async () => {
    const skillsRoot = await mkScratch();
    process.env.SKILLZ_TEST_OUT = skillsRoot;

    try {
      await installCommand("", {
        targetRoot: skillsRoot,
        assumeYes: true,
        acceptRisk: false,
        dryRun: false,
        fromLocal: FIXTURE_DIR,
      });

      const result = await uninstallCommand("hello-world", {
        targetRoot: skillsRoot,
        assumeYes: true,
      });
      expect(result.code).toBe(0);

      const exists = await fs
        .stat(path.join(skillsRoot, "hello-world"))
        .then(() => true)
        .catch(() => false);
      expect(exists).toBe(false);
    } finally {
      delete process.env.SKILLZ_TEST_OUT;
      await fs.rm(skillsRoot, { recursive: true, force: true });
    }
  });

  test("uninstall refuses when no lock file is present", async () => {
    const skillsRoot = await mkScratch();
    try {
      // Create a bogus dir without a lock file
      await fs.mkdir(path.join(skillsRoot, "fake-skill"), { recursive: true });
      const result = await uninstallCommand("fake-skill", {
        targetRoot: skillsRoot,
        assumeYes: true,
      });
      expect(result.code).toBe(2); // EXIT.INPUT
      // Confirm we did not rm the dir
      const stillThere = await fs
        .stat(path.join(skillsRoot, "fake-skill"))
        .then(() => true)
        .catch(() => false);
      expect(stillThere).toBe(true);
    } finally {
      await fs.rm(skillsRoot, { recursive: true, force: true });
    }
  });
});
