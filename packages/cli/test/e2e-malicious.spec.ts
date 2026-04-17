import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as os from "node:os";
import { runCommand } from "../src/commands/run";
import { validateCommand } from "../src/commands/validate";

const FIXTURES = path.join(import.meta.dir, "fixtures");
const FLAGGED_DIR = path.join(FIXTURES, "flagged-no-shell-skill");
const EXFIL_DIR = path.join(FIXTURES, "malicious-exfil-skill");
const BASE64_DIR = path.join(FIXTURES, "base64-skill");

const SENSITIVE_TOKEN_VALUE = "ghp_SECRET_SHOULD_NEVER_LEAK_12345";
const SENSITIVE_AWS_VALUE = "aws_secret_SHOULD_NEVER_LEAK";
const SENSITIVE_OPENAI_VALUE = "sk-openai-SHOULD_NEVER_LEAK";

async function mkScratch(): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), "skillz-e2e-mal-"));
}

function captureStdStreams() {
  const origOut = process.stdout.write.bind(process.stdout);
  const origErr = process.stderr.write.bind(process.stderr);
  const out: string[] = [];
  const err: string[] = [];
  process.stdout.write = ((s: string | Uint8Array) => {
    out.push(typeof s === "string" ? s : s.toString());
    return true;
  }) as typeof process.stdout.write;
  process.stderr.write = ((s: string | Uint8Array) => {
    err.push(typeof s === "string" ? s : s.toString());
    return true;
  }) as typeof process.stderr.write;
  return {
    stdout: () => out.join(""),
    stderr: () => err.join(""),
    restore: () => {
      process.stdout.write = origOut;
      process.stderr.write = origErr;
    },
  };
}

describe("e2e-malicious: the security net", () => {
  describe("flagged skills refuse unsafe consent", () => {
    test("refuses --yes without --i-accept-risk when install_commands match a flag pattern", async () => {
      const streams = captureStdStreams();
      try {
        const result = await runCommand("", {
          target: "",
          assumeYes: true,
          acceptRisk: false, // critical: user did NOT pass --i-accept-risk
          dryRun: false,
          fromLocal: FLAGGED_DIR,
        });

        // Consent is refused, abortedByUser is set. Exit is OK (user's fault,
        // not an error state) but install_commands never execute.
        expect(result.abortedByUser).toBe(true);
        expect(result.code).toBe(0);

        // The refusal message must reference --i-accept-risk so the user
        // understands how to authorize the skill if they really meant it.
        const stderr = streams.stderr();
        expect(stderr).toContain("--i-accept-risk");
      } finally {
        streams.restore();
      }
    });

    test("flagged skill is rejected by validate without capabilities.shell declared", async () => {
      const streams = captureStdStreams();
      try {
        const { code, report } = await validateCommand({
          skillPath: FLAGGED_DIR,
          json: true,
        });
        expect(code).toBe(2); // EXIT.INPUT (validation failure)
        expect(report.ok).toBe(false);
        expect(report.tier_eligibility.community).toBe(false);
        expect(report.tier_eligibility.reviewed).toBe(false);
        expect(report.flags.length).toBeGreaterThan(0);
        // The remote-fetch-to-shell pattern must be specifically caught.
        expect(
          report.flags.some((f) => f.kind === "remote-fetch-to-shell"),
        ).toBe(true);
      } finally {
        streams.restore();
      }
    });
  });

  describe("scrubbed exec env blocks token exfiltration (E-S2)", () => {
    beforeEach(() => {
      process.env.GITHUB_TOKEN = SENSITIVE_TOKEN_VALUE;
      process.env.AWS_SECRET_ACCESS_KEY = SENSITIVE_AWS_VALUE;
      process.env.OPENAI_API_KEY = SENSITIVE_OPENAI_VALUE;
    });

    afterEach(() => {
      delete process.env.GITHUB_TOKEN;
      delete process.env.AWS_SECRET_ACCESS_KEY;
      delete process.env.OPENAI_API_KEY;
    });

    test("install_commands do not see GITHUB_TOKEN / AWS / OPENAI even when author declares shell", async () => {
      const scratch = await mkScratch();
      process.env.SKILLZ_TEST_OUT = scratch;

      const streams = captureStdStreams();
      try {
        const result = await runCommand("", {
          target: "",
          assumeYes: true,
          acceptRisk: true, // user explicitly opted in to shell exec
          dryRun: false,
          fromLocal: EXFIL_DIR,
        });

        expect(result.code).toBe(0);
        expect(result.abortedByUser).toBeFalsy();

        const dump = await fs.readFile(
          path.join(scratch, "env-dump.txt"),
          "utf-8",
        );

        // None of the parent's sensitive env vars must appear in the child.
        expect(dump).not.toContain(SENSITIVE_TOKEN_VALUE);
        expect(dump).not.toContain(SENSITIVE_AWS_VALUE);
        expect(dump).not.toContain(SENSITIVE_OPENAI_VALUE);
        expect(dump).not.toContain("GITHUB_TOKEN");
        expect(dump).not.toContain("AWS_SECRET_ACCESS_KEY");
        expect(dump).not.toContain("OPENAI_API_KEY");

        // And the scrubbed env should still have the expected-visible vars
        // (PATH, HOME, TMPDIR, SKILLZ_TEST_OUT). Prove the scrub is tight but
        // not so tight that nothing works.
        expect(dump).toContain("PATH=/usr/bin:/bin");
        expect(dump).toContain("SKILLZ_TEST_OUT=");
      } finally {
        delete process.env.SKILLZ_TEST_OUT;
        await fs.rm(scratch, { recursive: true, force: true });
        streams.restore();
      }
    });
  });

  describe("base64 literals in install_commands are auto-decoded in the diff", () => {
    test("the diff output shows the decoded form next to the raw line", async () => {
      const scratch = await mkScratch();
      process.env.SKILLZ_TEST_OUT = scratch;

      const streams = captureStdStreams();
      try {
        // dry-run so we don't actually exec — we only want the diff text.
        const result = await runCommand("", {
          target: "",
          assumeYes: false,
          acceptRisk: false,
          dryRun: true,
          fromLocal: BASE64_DIR,
        });
        expect(result.code).toBe(0);

        const stdout = streams.stdout();
        expect(stdout).toContain("↳ decoded from:");
        // The decoded payload text should appear so the user can see it.
        expect(stdout).toContain("decoded test payload");
      } finally {
        delete process.env.SKILLZ_TEST_OUT;
        await fs.rm(scratch, { recursive: true, force: true });
        streams.restore();
      }
    });
  });
});
