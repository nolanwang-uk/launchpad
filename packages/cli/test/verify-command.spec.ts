import { describe, test, expect } from "bun:test";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as os from "node:os";
import { verifyCommand } from "../src/commands/verify";
import { sha256File } from "../src/verify";

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

async function setup(
  shasums: string | null,
  binContents: string,
  assetName = "skillz-test",
) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "skillz-verify-cmd-"));
  const binaryPath = path.join(dir, assetName);
  await fs.writeFile(binaryPath, binContents);
  let shasumsPath = path.join(dir, "SHASUMS256.txt");
  if (shasums !== null) {
    await fs.writeFile(shasumsPath, shasums);
  } else {
    shasumsPath = path.join(dir, "does-not-exist.txt");
  }
  return { dir, binaryPath, shasumsPath, assetName };
}

describe("skillz verify (command)", () => {
  test("missing SHASUMS → warning + OK exit (partial verification)", async () => {
    const { dir, binaryPath, shasumsPath, assetName } = await setup(
      null,
      "unused",
    );
    try {
      const cap = captureStdout();
      try {
        const r = await verifyCommand({
          binaryPath,
          shasumsPath,
          assetName,
          json: false,
        });
        expect(r.code).toBe(0);
        const out = cap.text();
        expect(out).toContain("SHASUMS256.txt not found");
        expect(out).toContain("partial verification");
      } finally {
        cap.restore();
      }
    } finally {
      await fs.rm(dir, { recursive: true, force: true });
    }
  });

  test("sha matches + no cosign → partial verification, not fatal", async () => {
    const payload = "fake binary body";
    const hash = await (async () => {
      const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "skillz-hash-"));
      const p = path.join(tmp, "x");
      await fs.writeFile(p, payload);
      const h = await sha256File(p);
      await fs.rm(tmp, { recursive: true, force: true });
      return h;
    })();

    const { dir, binaryPath, shasumsPath, assetName } = await setup(
      `${hash}  skillz-test\n`,
      payload,
    );
    try {
      const cap = captureStdout();
      try {
        const r = await verifyCommand({
          binaryPath,
          shasumsPath,
          assetName,
          json: false,
        });
        expect(r.code).toBe(0);
        const out = cap.text();
        expect(out).toContain("sha256 matches SHASUMS256.txt");
        // Runtime test: cosign may or may not be installed; both paths are OK.
        const cosignOk = out.includes("cosign keyless signature verifies");
        const cosignMissing =
          out.includes("cosign not installed") ||
          out.includes("SHASUMS256.txt.sig");
        expect(cosignOk || cosignMissing).toBe(true);
      } finally {
        cap.restore();
      }
    } finally {
      await fs.rm(dir, { recursive: true, force: true });
    }
  });

  test("sha MISMATCH → exits EXIT.SECURITY with 'DO NOT TRUST' verdict", async () => {
    const { dir, binaryPath, shasumsPath, assetName } = await setup(
      `${"0".repeat(64)}  skillz-test\n`,
      "something-that-wont-match",
    );
    try {
      const cap = captureStdout();
      try {
        const r = await verifyCommand({
          binaryPath,
          shasumsPath,
          assetName,
          json: false,
        });
        expect(r.code).toBe(4); // EXIT.SECURITY
        const out = cap.text();
        expect(out).toContain("MISMATCH");
        expect(out).toContain("DO NOT TRUST");
      } finally {
        cap.restore();
      }
    } finally {
      await fs.rm(dir, { recursive: true, force: true });
    }
  });

  test("asset name not in SHASUMS → warning, partial verification exit 0", async () => {
    const { dir, binaryPath, shasumsPath, assetName } = await setup(
      `${"a".repeat(64)}  skillz-some-other-platform\n`,
      "x",
    );
    try {
      const cap = captureStdout();
      try {
        const r = await verifyCommand({
          binaryPath,
          shasumsPath,
          assetName,
          json: false,
        });
        expect(r.code).toBe(0);
        const out = cap.text();
        expect(out).toContain("not found in SHASUMS256.txt");
      } finally {
        cap.restore();
      }
    } finally {
      await fs.rm(dir, { recursive: true, force: true });
    }
  });

  test("--json emits a structured report", async () => {
    const { dir, binaryPath, shasumsPath, assetName } = await setup(
      `${"a".repeat(64)}  unknown-asset\n`,
      "x",
    );
    try {
      const cap = captureStdout();
      try {
        const r = await verifyCommand({
          binaryPath,
          shasumsPath,
          assetName,
          json: true,
        });
        expect(r.code).toBe(0);
        const parsed = JSON.parse(cap.text());
        expect(parsed.binary).toBe(binaryPath);
        expect(parsed.asset_name).toBe(assetName);
        expect(parsed.platform).toContain(process.platform);
        expect(parsed.hash_check.kind).toBe("not-listed");
        expect(typeof parsed.cosign_available).toBe("boolean");
        expect(typeof parsed.signature_state).toBe("string");
      } finally {
        cap.restore();
      }
    } finally {
      await fs.rm(dir, { recursive: true, force: true });
    }
  });
});
