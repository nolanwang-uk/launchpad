import * as fs from "node:fs/promises";
import * as path from "node:path";
import type { Manifest } from "./manifest";

export type Tier = "Reviewed" | "Community";

export type DiffOutput = {
  text: string;
  requireFullYes: boolean;
  flaggedPatterns: string[];
};

const BASE64_PIPE_RE = /\b(?:base64|openssl\s+base64)\b[^\n]*\|\s*(?:sh|bash|zsh)\b/;
const CURL_PIPE_RE = /\b(?:curl|wget|fetch)\b[^\n|]*\|\s*(?:sh|bash|zsh)\b/;
const SUBSHELL_EXEC_RE = /\bsh\s+-c\s*"?\$\(/;
const DANGEROUS_VERBS_RE = /\b(?:eval|osascript|sudo|source)\b/;
// Base64-ish payload literal: 40+ chars of [A-Za-z0-9+/] with optional = padding.
const BASE64_LITERAL_RE = /\b[A-Za-z0-9+/]{40,}={0,2}\b/;

function detectFlags(commands: readonly string[]): string[] {
  const flags: string[] = [];
  for (const cmd of commands) {
    if (BASE64_PIPE_RE.test(cmd)) flags.push("base64 pipe to shell");
    if (CURL_PIPE_RE.test(cmd)) flags.push("remote-fetch piped to shell");
    if (SUBSHELL_EXEC_RE.test(cmd)) flags.push("command substitution into shell -c");
    if (DANGEROUS_VERBS_RE.test(cmd)) flags.push("dangerous verb (eval/sudo/osascript/source)");
    if (BASE64_LITERAL_RE.test(cmd)) flags.push("suspicious base64-ish literal");
  }
  return Array.from(new Set(flags));
}

/**
 * Decoded-form annotation. If a command contains a base64 literal, try to
 * decode it and show the decoded value next to the raw line.
 */
function decodedAnnotation(cmd: string): string | null {
  const b64 = BASE64_LITERAL_RE.exec(cmd);
  if (!b64 || !b64[0]) return null;
  try {
    const decoded = Buffer.from(b64[0], "base64").toString("utf-8");
    // Only annotate if decoding yields printable ASCII-ish text.
    if (/^[\x20-\x7e\n\r\t]{1,200}$/.test(decoded)) {
      return `${b64[0].slice(0, 16)}… → ${decoded.slice(0, 120)}`;
    }
  } catch {
    /* ignore */
  }
  return null;
}

async function computeFilePlan(
  extractDir: string,
  files: readonly string[],
): Promise<Array<{ name: string; size: number }>> {
  const result: Array<{ name: string; size: number }> = [];
  for (const f of files) {
    const abs = path.join(extractDir, f);
    try {
      const stat = await fs.stat(abs);
      result.push({ name: f, size: stat.size });
    } catch {
      result.push({ name: f, size: -1 });
    }
  }
  return result;
}

function humanSize(bytes: number): string {
  if (bytes < 0) return "MISSING";
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

/**
 * Renders the two-panel diff prompt (per F2 — no capability UI in v1).
 * Returns the rendered text plus whether the prompt should require the
 * full word `yes` (Community + shell, or any flagged pattern).
 */
export async function renderDiff(
  manifest: Manifest,
  tier: Tier,
  extractDir: string,
): Promise<DiffOutput> {
  const flags = detectFlags(manifest.install_commands);
  const requireFullYes =
    flags.length > 0 ||
    (tier === "Community" && manifest.capabilities.shell);

  const filePlan = await computeFilePlan(extractDir, manifest.files);
  const totalBytes = filePlan.reduce(
    (s, f) => s + (f.size > 0 ? f.size : 0),
    0,
  );

  const header =
    `┌${"─".repeat(55)}┐\n` +
    `│  Skill: ${manifest.name}  (${tier} · v${manifest.version})\n`;

  const cmdLines = manifest.install_commands
    .map((c, i) => {
      const num = (i + 1).toString().padStart(2, " ");
      const decoded = decodedAnnotation(c);
      const body = `│  ${num}. ${c}\n`;
      return decoded ? `${body}│      ↳ decoded from: ${decoded}\n` : body;
    })
    .join("");

  const fileLines = filePlan
    .map((f) => `│    + ${f.name.padEnd(40)} ${humanSize(f.size).padStart(8)}\n`)
    .join("");

  const flagBanner =
    flags.length > 0
      ? `│  ⚠ FLAGGED PATTERNS: ${flags.join(", ")}\n│\n`
      : "";

  const text =
    header +
    `├${"─".repeat(55)}┤\n` +
    `│  INSTALL COMMANDS (exec with env -i PATH=/usr/bin:/bin):\n` +
    cmdLines +
    flagBanner +
    `├${"─".repeat(55)}┤\n` +
    `│  FILES TO WRITE: ${manifest.files.length} files (${humanSize(totalBytes)} total)\n` +
    fileLines +
    `└${"─".repeat(55)}┘\n`;

  return { text, requireFullYes, flaggedPatterns: flags };
}
