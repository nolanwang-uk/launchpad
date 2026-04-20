import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as os from "node:os";
import { spawn } from "node:child_process";
import { err, EXIT, isSkillzError, printErr } from "../errors";
import { verifyBinaryAgainstShasums } from "../verify";

export type VerifyOpts = {
  /** Override the binary path. Defaults to the currently-running executable. */
  binaryPath?: string;
  /** Override SHASUMS location. Defaults to the sibling of the binary. */
  shasumsPath?: string;
  /** The release-asset filename to look up inside SHASUMS256.txt. */
  assetName?: string;
  json: boolean;
};

const RELEASE_URL =
  "https://github.com/nolanwang-uk/launchpad/releases/latest";

function detectAssetName(): string {
  const platform = process.platform; // "darwin" | "linux" | ...
  const arch = process.arch; // "arm64" | "x64" | ...
  const shortArch = arch === "x64" ? "x64" : arch === "arm64" ? "arm64" : arch;
  return `skillz-${platform}-${shortArch}`;
}

async function detectCosign(): Promise<boolean> {
  return new Promise((resolve) => {
    const child = spawn("cosign", ["version"], { stdio: "ignore" });
    child.on("exit", (c) => resolve(c === 0));
    child.on("error", () => resolve(false));
  });
}

async function cosignVerify(
  shasumsPath: string,
  bundlePath: string,
): Promise<{ ok: boolean; stderr: string }> {
  // Keyless (Sigstore) verification with identity binding to the GitHub
  // OIDC issuer used by the release workflow. Identity pattern is scoped
  // to our repo so a token from any other GitHub repo won't pass.
  return new Promise((resolve) => {
    let stderr = "";
    const child = spawn(
      "cosign",
      [
        "verify-blob",
        "--certificate-identity-regexp",
        "^https://github.com/nolanwang-uk/launchpad/.*",
        "--certificate-oidc-issuer",
        "https://token.actions.githubusercontent.com",
        "--bundle",
        bundlePath,
        shasumsPath,
      ],
      { stdio: ["ignore", "pipe", "pipe"] },
    );
    child.stderr?.on("data", (d: Buffer) => (stderr += d.toString()));
    child.on("exit", (code) => resolve({ ok: code === 0, stderr }));
    child.on("error", (e) =>
      resolve({ ok: false, stderr: e.message }),
    );
  });
}

export async function verifyCommand(
  opts: VerifyOpts,
): Promise<{ code: number }> {
  try {
    // Best-effort: if we're running under `bun src/index.ts` rather than a
    // compiled binary, execPath points at bun itself. Let the user pass
    // --binary <path> to verify something specific.
    const binaryPath = opts.binaryPath ?? process.execPath;
    const binaryDir = path.dirname(binaryPath);
    const shasumsPath = opts.shasumsPath ?? path.join(binaryDir, "SHASUMS256.txt");
    const bundlePath = `${shasumsPath}.sig`;
    const assetName = opts.assetName ?? detectAssetName();

    const report: Record<string, unknown> = {
      binary: binaryPath,
      asset_name: assetName,
      shasums: shasumsPath,
      bundle: bundlePath,
      platform: `${process.platform}/${process.arch}`,
    };

    // Step 1: hash match against SHASUMS256.txt
    const hashResult = await verifyBinaryAgainstShasums(
      binaryPath,
      assetName,
      shasumsPath,
    );
    report.hash_check = hashResult;

    // Step 2: cosign signature on SHASUMS256.txt (if cosign + bundle exist)
    const cosignAvailable = await detectCosign();
    report.cosign_available = cosignAvailable;

    let signatureState:
      | "ok"
      | "cosign-missing"
      | "bundle-missing"
      | "signature-failed" = "cosign-missing";
    let cosignStderr = "";

    if (cosignAvailable) {
      const bundleExists = await fs
        .stat(bundlePath)
        .then(() => true)
        .catch(() => false);
      if (!bundleExists) {
        signatureState = "bundle-missing";
      } else {
        const r = await cosignVerify(shasumsPath, bundlePath);
        signatureState = r.ok ? "ok" : "signature-failed";
        cosignStderr = r.stderr;
      }
    }
    report.signature_state = signatureState;

    // Terminal status
    const hashOk = hashResult.kind === "ok";
    const sigOk = signatureState === "ok";
    const fatallyBroken = hashResult.kind === "mismatch" || signatureState === "signature-failed";

    if (opts.json) {
      process.stdout.write(
        JSON.stringify({ ...report, ok: hashOk && (sigOk || !cosignAvailable) }, null, 2) + "\n",
      );
    } else {
      process.stdout.write(`skillz verify\n\n`);
      process.stdout.write(`  binary:      ${binaryPath}\n`);
      process.stdout.write(`  platform:    ${process.platform}/${process.arch}\n`);
      process.stdout.write(`  asset name:  ${assetName}\n`);
      process.stdout.write(`  shasums:     ${shasumsPath}\n\n`);

      switch (hashResult.kind) {
        case "ok":
          process.stdout.write(`  ✓ sha256 matches SHASUMS256.txt\n`);
          process.stdout.write(`    ${hashResult.hash}\n`);
          break;
        case "mismatch":
          process.stdout.write(
            `  ✗ sha256 MISMATCH — this binary is not the released artifact\n`,
          );
          process.stdout.write(`    expected: ${hashResult.expected}\n`);
          process.stdout.write(`    got:      ${hashResult.got}\n`);
          break;
        case "not-listed":
          process.stdout.write(
            `  ? '${hashResult.file}' not found in SHASUMS256.txt\n`,
          );
          process.stdout.write(
            `    the SHASUMS file is for a different platform/version. Re-download from ${RELEASE_URL}\n`,
          );
          break;
        case "missing-shasums":
          process.stdout.write(
            `  ? SHASUMS256.txt not found at ${hashResult.path}\n`,
          );
          process.stdout.write(
            `    download it from ${RELEASE_URL} and place it next to the binary, or use --shasums <path>.\n`,
          );
          break;
      }

      process.stdout.write(`\n`);
      switch (signatureState) {
        case "ok":
          process.stdout.write(`  ✓ cosign keyless signature verifies\n`);
          process.stdout.write(
            `    issuer: https://token.actions.githubusercontent.com\n`,
          );
          process.stdout.write(
            `    identity: ^https://github.com/nolanwang-uk/launchpad/.*\n`,
          );
          break;
        case "cosign-missing":
          process.stdout.write(
            `  ⚠ cosign not installed — cryptographic signature NOT verified\n`,
          );
          process.stdout.write(
            `    install with \`brew install cosign\` and re-run for full provenance.\n`,
          );
          break;
        case "bundle-missing":
          process.stdout.write(
            `  ⚠ ${bundlePath} not found — signature NOT verified\n`,
          );
          process.stdout.write(
            `    download SHASUMS256.txt.sig from ${RELEASE_URL} and place it next to SHASUMS256.txt.\n`,
          );
          break;
        case "signature-failed":
          process.stdout.write(
            `  ✗ cosign signature FAILED to verify — do not trust this binary\n`,
          );
          if (cosignStderr) {
            process.stdout.write(`    ${cosignStderr.split("\n")[0]}\n`);
          }
          break;
      }

      process.stdout.write(`\n`);
      if (fatallyBroken) {
        process.stdout.write(
          `  verdict: DO NOT TRUST. Re-download from ${RELEASE_URL}.\n`,
        );
      } else if (hashOk && sigOk) {
        process.stdout.write(`  verdict: verified end-to-end.\n`);
      } else {
        process.stdout.write(
          `  verdict: partial verification. See warnings above.\n`,
        );
      }
    }

    if (fatallyBroken) {
      throw err(
        "verify-failed",
        hashResult.kind === "mismatch"
          ? "binary sha256 does not match the signed SHASUMS256.txt"
          : "cosign signature verification failed",
        "an attacker could have tampered with the binary or SHASUMS256.txt since it was released.",
        `re-download the binary and SHASUMS256.txt.sig from ${RELEASE_URL}.`,
        EXIT.SECURITY,
      );
    }

    return { code: EXIT.OK };
  } catch (e) {
    if (isSkillzError(e)) {
      printErr(e);
      return { code: e.code };
    }
    throw e;
  }
}
