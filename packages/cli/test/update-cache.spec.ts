import { describe, test, expect } from "bun:test";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as os from "node:os";
import { updateCommand } from "../src/commands/update";
import { cacheCommand } from "../src/commands/cache";
import { installCommand } from "../src/commands/install";
import { writeLock, makeLock, skillDir } from "../src/install-lock";
import { parseManifest } from "../src/manifest";
import { cacheDir } from "../src/cache";

const FIXTURE_DIR = path.join(
  import.meta.dir,
  "fixtures",
  "test-skill",
);

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

async function mkScratch(): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), "skillz-up-cache-"));
}

async function writeRegistry(
  dir: string,
  entrySha: string,
  caps?: { network: boolean; filesystem: boolean; shell: boolean },
): Promise<string> {
  const p = path.join(dir, "registry.json");
  const body = {
    schema_version: 1,
    updated_at: "2026-04-17T00:00:00Z",
    entries: [
      {
        schema_version: 1,
        name: "hello-world",
        description: "Test seed skill.",
        author: "tests",
        license: "MIT",
        repo: "launchpad-skills/hello-world",
        sha: entrySha,
        tier: "Reviewed",
        targets: ["claude-code"],
        capabilities: caps ?? { network: false, filesystem: true, shell: false },
        tags: ["test"],
        added_at: "2026-04-17T00:00:00Z",
      },
    ],
  };
  await fs.writeFile(p, JSON.stringify(body), "utf-8");
  return p;
}

async function seedInstalled(
  skillsRoot: string,
  name: string,
  sha: string,
): Promise<void> {
  // Read the fixture manifest to get its shape, then stamp a lock with a chosen SHA.
  const manifestYaml = await fs.readFile(
    path.join(FIXTURE_DIR, "skill.yml"),
    "utf-8",
  );
  const manifest = parseManifest(manifestYaml, "fixture");

  const target = skillDir(name, skillsRoot);
  await fs.mkdir(target, { recursive: true });
  for (const f of manifest.files) {
    await fs.copyFile(
      path.join(FIXTURE_DIR, f),
      path.join(target, f),
    );
  }
  await writeLock(
    target,
    makeLock({ manifest, sha, sourceUrl: `github.com/launchpad-skills/${name}@${sha}` }),
  );
}

describe("skillz update", () => {
  test("reports up-to-date when installed SHA matches registry SHA", async () => {
    const skillsRoot = await mkScratch();
    const regDir = await mkScratch();
    const sha = "a".repeat(40);

    try {
      await seedInstalled(skillsRoot, "hello-world", sha);
      const registryPath = await writeRegistry(regDir, sha);
      process.env.SKILLZ_REGISTRY = registryPath;

      const cap = captureStdout();
      try {
        const r = await updateCommand({
          targetRoot: skillsRoot,
          registry: registryPath,
          assumeYes: true,
          acceptRisk: false,
          dryRun: true,
        });
        expect(r.code).toBe(0);
        expect(r.plan).toHaveLength(1);
        expect(r.plan[0]!.reason).toBe("up-to-date");
        expect(cap.text()).toContain("up to date");
      } finally {
        cap.restore();
      }
    } finally {
      delete process.env.SKILLZ_REGISTRY;
      await fs.rm(skillsRoot, { recursive: true, force: true });
      await fs.rm(regDir, { recursive: true, force: true });
    }
  });

  test("flags newer SHA + capability diff in dry-run plan", async () => {
    const skillsRoot = await mkScratch();
    const regDir = await mkScratch();
    const oldSha = "a".repeat(40);
    const newSha = "b".repeat(40);

    try {
      await seedInstalled(skillsRoot, "hello-world", oldSha);
      const registryPath = await writeRegistry(regDir, newSha, {
        network: true, // new capability!
        filesystem: true,
        shell: false,
      });
      process.env.SKILLZ_REGISTRY = registryPath;

      const cap = captureStdout();
      try {
        const r = await updateCommand({
          targetRoot: skillsRoot,
          registry: registryPath,
          assumeYes: true,
          acceptRisk: false,
          dryRun: true,
        });
        expect(r.code).toBe(0);
        expect(r.plan[0]!.reason).toBe("newer-sha");
        expect(r.plan[0]!.capability_diff).toHaveLength(1);
        expect(r.plan[0]!.capability_diff![0]!.key).toBe("network");
        expect(r.plan[0]!.capability_diff![0]!.after).toBe(true);
        const out = cap.text();
        expect(out).toContain("↑");
        expect(out).toContain("NEW capability network");
        expect(out).toContain("dry-run");
      } finally {
        cap.restore();
      }
    } finally {
      delete process.env.SKILLZ_REGISTRY;
      await fs.rm(skillsRoot, { recursive: true, force: true });
      await fs.rm(regDir, { recursive: true, force: true });
    }
  });

  test("local-only installs are skipped", async () => {
    const skillsRoot = await mkScratch();
    const regDir = await mkScratch();

    try {
      // Install via --from-local so lock.sha === "local"
      process.env.SKILLZ_TEST_OUT = await mkScratch();
      await installCommand("", {
        targetRoot: skillsRoot,
        assumeYes: true,
        acceptRisk: false,
        dryRun: false,
        fromLocal: FIXTURE_DIR,
      });
      delete process.env.SKILLZ_TEST_OUT;

      const registryPath = await writeRegistry(regDir, "c".repeat(40));
      const cap = captureStdout();
      try {
        const r = await updateCommand({
          targetRoot: skillsRoot,
          registry: registryPath,
          assumeYes: true,
          acceptRisk: false,
          dryRun: true,
        });
        expect(r.code).toBe(0);
        expect(r.plan[0]!.reason).toBe("local-only");
        expect(cap.text()).toContain("does not refresh local installs");
      } finally {
        cap.restore();
      }
    } finally {
      await fs.rm(skillsRoot, { recursive: true, force: true });
      await fs.rm(regDir, { recursive: true, force: true });
    }
  });

  test("empty skills root reports nothing to update", async () => {
    const skillsRoot = await mkScratch();
    try {
      const cap = captureStdout();
      try {
        const r = await updateCommand({
          targetRoot: skillsRoot,
          assumeYes: true,
          acceptRisk: false,
          dryRun: true,
        });
        expect(r.code).toBe(0);
        expect(r.plan).toEqual([]);
        expect(cap.text()).toContain("no skills installed");
      } finally {
        cap.restore();
      }
    } finally {
      await fs.rm(skillsRoot, { recursive: true, force: true });
    }
  });
});

describe("skillz cache", () => {
  test("cache show prints the cache dir path", async () => {
    const cap = captureStdout();
    try {
      const r = await cacheCommand({ subverb: "show" });
      expect(r.code).toBe(0);
      expect(cap.text()).toContain("cache dir:");
      expect(cap.text()).toContain("launchpad");
      expect(cap.text()).toContain(cacheDir());
    } finally {
      cap.restore();
    }
  });

  test("cache clear on an absent dir prints the 'nothing to clear' message", async () => {
    // Redirect XDG_CACHE_HOME to a scratch dir so we don't touch real state.
    const scratch = await mkScratch();
    process.env.XDG_CACHE_HOME = scratch;

    try {
      const cap = captureStdout();
      try {
        const r = await cacheCommand({ subverb: "clear" });
        expect(r.code).toBe(0);
        expect(cap.text()).toContain("nothing to clear");
      } finally {
        cap.restore();
      }
    } finally {
      delete process.env.XDG_CACHE_HOME;
      await fs.rm(scratch, { recursive: true, force: true });
    }
  });

  test("cache clear removes an existing cache dir", async () => {
    const scratch = await mkScratch();
    process.env.XDG_CACHE_HOME = scratch;
    const target = path.join(scratch, "launchpad");
    await fs.mkdir(target, { recursive: true });
    await fs.writeFile(path.join(target, "stale"), "x");

    try {
      const cap = captureStdout();
      try {
        const r = await cacheCommand({ subverb: "clear" });
        expect(r.code).toBe(0);
        expect(cap.text()).toContain("cleared launchpad cache");
        const stillThere = await fs
          .stat(target)
          .then(() => true)
          .catch(() => false);
        expect(stillThere).toBe(false);
      } finally {
        cap.restore();
      }
    } finally {
      delete process.env.XDG_CACHE_HOME;
      await fs.rm(scratch, { recursive: true, force: true });
    }
  });
});
