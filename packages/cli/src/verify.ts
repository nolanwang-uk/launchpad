import * as fs from "node:fs/promises";
import { createHash } from "node:crypto";

export type ShasumEntry = { hash: string; file: string };

/**
 * Parse a sha256sum(1)-format SHASUMS256.txt.
 * Each line is "<64-char hex>  <filename>" or "<hash> *<filename>" (binary mode).
 * Blank lines + lines starting with '#' are ignored.
 */
export function parseShasums(text: string): ShasumEntry[] {
  const out: ShasumEntry[] = [];
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (line.length === 0 || line.startsWith("#")) continue;
    // Match either two-space separator or "  *" (binary mode) or single-space fallback.
    const m = /^([0-9a-fA-F]{64})\s+\*?(.+)$/.exec(line);
    if (!m) continue;
    out.push({ hash: m[1]!.toLowerCase(), file: m[2]!.trim() });
  }
  return out;
}

/** Compute the sha256 hex digest of a file. */
export async function sha256File(path: string): Promise<string> {
  const buf = await fs.readFile(path);
  const h = createHash("sha256");
  h.update(buf);
  return h.digest("hex");
}

export type VerifyOutcome =
  | { kind: "ok"; file: string; hash: string }
  | { kind: "mismatch"; file: string; expected: string; got: string }
  | { kind: "not-listed"; file: string }
  | { kind: "missing-shasums"; path: string };

export async function verifyBinaryAgainstShasums(
  binaryPath: string,
  binaryName: string,
  shasumsPath: string,
): Promise<VerifyOutcome> {
  let text: string;
  try {
    text = await fs.readFile(shasumsPath, "utf-8");
  } catch {
    return { kind: "missing-shasums", path: shasumsPath };
  }

  const entries = parseShasums(text);
  const match = entries.find((e) => e.file === binaryName);
  if (!match) return { kind: "not-listed", file: binaryName };

  const actual = await sha256File(binaryPath);
  if (actual !== match.hash) {
    return {
      kind: "mismatch",
      file: binaryName,
      expected: match.hash,
      got: actual,
    };
  }
  return { kind: "ok", file: binaryName, hash: actual };
}
