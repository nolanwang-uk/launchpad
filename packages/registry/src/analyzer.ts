/**
 * Static analyzer for install_commands.
 *
 * Two modes:
 *  - `flagPatterns(cmd)` — pattern-based flagging used by the CLI diff prompt
 *    for Community-tier skills. Flags obvious exfil patterns but does not
 *    aspire to catch every bypass. Full-word `yes` is required when anything
 *    is flagged.
 *  - `isClosedGrammar(commands)` — strict check used at PR time for
 *    Reviewed-tier skills. Only a fixed verb whitelist is permitted.
 *    Anything else → registry PR rejected.
 *
 * Per UC-Eng-2 (F3): Reviewed tier is closed-grammar only. Community may
 * use arbitrary shell if `capabilities.shell: true` is declared.
 */

// Pattern-based flags (Community tier, pre-exec prompt)
const BASE64_PIPE_RE = /\b(?:base64|openssl\s+base64)\b[^\n]*\|\s*(?:sh|bash|zsh)\b/;
const CURL_PIPE_RE = /\b(?:curl|wget|fetch)\b[^\n|]*\|\s*(?:sh|bash|zsh)\b/;
const SUBSHELL_EXEC_RE = /\b(?:sh|bash|zsh)\s+-c\s*"?\$\(/;
const HERE_DOC_EXEC_RE = /\b(?:sh|bash|zsh)\s*(?:-[A-Za-z]+)?\s*<<-?\s*['"]?\w+['"]?/;
const PROCESS_SUB_RE = /<\s*\(\s*(?:curl|wget|fetch)\b/;
const INTERPRETER_EVAL_RE = /\b(?:python3?|node|ruby|perl|php)\s+-[cer]\b/;
const DANGEROUS_VERBS_RE = /\b(?:eval|osascript|sudo|su\b)\b/;
const SOURCE_REMOTE_RE = /\b(?:source|\.)\s+<\s*\(/;
// Base64-ish literal: 40+ chars of [A-Za-z0-9+/] with optional = padding.
const BASE64_LITERAL_RE = /\b[A-Za-z0-9+/]{40,}={0,2}\b/;
const HEX_ESCAPE_PRINTF_RE = /\bprintf\s+['"](?:\\x[0-9a-fA-F]{2}){4,}/;
// Env-var indirection: `X=curl; $X ... | sh`
const ENV_INDIRECT_EXEC_RE = /\b[A-Z_][A-Z0-9_]*=[a-z]+[^;]*;\s*\$[A-Z_][A-Z0-9_]*\b/;
// Writes outside allowlisted dirs (very rough heuristic)
const WRITE_OUTSIDE_RE =
  /(?:>|>>|--?(?:output|out|dest|destination)[= ])\s*(?!["']?(?:\$\{?HOME\}?|~|\$\{?TMPDIR\}?|\$\{?SKILLZ_TEST_OUT\}?|\.\/|\$\{?PWD\}?)[^\s]*)(?!\$|"\$)(\/[^\s"'$]+)/;

export type FlagKind =
  | "base64-pipe-to-shell"
  | "remote-fetch-to-shell"
  | "subshell-command-exec"
  | "here-doc-exec"
  | "process-substitution-remote"
  | "interpreter-eval"
  | "dangerous-verb"
  | "source-remote"
  | "base64-literal"
  | "hex-escape-printf"
  | "env-indirect-exec"
  | "write-outside-allowed-dirs";

export type Flag = {
  kind: FlagKind;
  line: number; // 1-indexed
  excerpt: string;
};

const CHECKS: Array<{ kind: FlagKind; re: RegExp }> = [
  { kind: "base64-pipe-to-shell", re: BASE64_PIPE_RE },
  { kind: "remote-fetch-to-shell", re: CURL_PIPE_RE },
  { kind: "subshell-command-exec", re: SUBSHELL_EXEC_RE },
  { kind: "here-doc-exec", re: HERE_DOC_EXEC_RE },
  { kind: "process-substitution-remote", re: PROCESS_SUB_RE },
  { kind: "interpreter-eval", re: INTERPRETER_EVAL_RE },
  { kind: "dangerous-verb", re: DANGEROUS_VERBS_RE },
  { kind: "source-remote", re: SOURCE_REMOTE_RE },
  { kind: "base64-literal", re: BASE64_LITERAL_RE },
  { kind: "hex-escape-printf", re: HEX_ESCAPE_PRINTF_RE },
  { kind: "env-indirect-exec", re: ENV_INDIRECT_EXEC_RE },
  { kind: "write-outside-allowed-dirs", re: WRITE_OUTSIDE_RE },
];

export function flagPatterns(commands: readonly string[]): Flag[] {
  const flags: Flag[] = [];
  for (let i = 0; i < commands.length; i++) {
    const cmd = commands[i]!;
    for (const c of CHECKS) {
      const m = c.re.exec(cmd);
      if (m) {
        flags.push({
          kind: c.kind,
          line: i + 1,
          excerpt: cmd.slice(0, 120),
        });
      }
    }
  }
  return flags;
}

// Closed-grammar verbs for Reviewed tier.
// Intentionally tiny: we want a proof-defensible security story.
const CLOSED_VERBS = new Set([
  "mkdir",
  "cp",
  "mv",
  "chmod",
  "ln",
  "echo", // allowed only if followed by `>` to an allowlisted path (checked below)
]);

const ALLOWED_ECHO_TARGET_RE =
  /^echo\s+.+?\s>\s*(?:"[^"]+"|'[^']+'|\S+)\s*$/;

export type ClosedGrammarResult =
  | { ok: true; violations: [] }
  | {
      ok: false;
      violations: Array<{ line: number; verb: string; reason: string; excerpt: string }>;
    };

export function isClosedGrammar(commands: readonly string[]): ClosedGrammarResult {
  const violations: Array<{
    line: number;
    verb: string;
    reason: string;
    excerpt: string;
  }> = [];

  for (let i = 0; i < commands.length; i++) {
    const cmd = commands[i]!.trim();
    if (cmd.length === 0) continue;

    // Any pattern flags = immediate fail (base64, curl|sh, eval, etc.)
    for (const c of CHECKS) {
      if (c.re.test(cmd)) {
        violations.push({
          line: i + 1,
          verb: c.kind,
          reason: "pattern-analyzer flagged this command",
          excerpt: cmd.slice(0, 120),
        });
      }
    }

    // Parse the leading verb (first whitespace-separated token, strip any env-var prefix)
    const firstTokenMatch = /^(?:[A-Z_][A-Z0-9_]*=\S+\s+)*(\S+)/.exec(cmd);
    const verb = firstTokenMatch?.[1] ?? "";
    if (!CLOSED_VERBS.has(verb)) {
      violations.push({
        line: i + 1,
        verb,
        reason: `verb '${verb}' is not in the Reviewed-tier whitelist (${[...CLOSED_VERBS].join(", ")})`,
        excerpt: cmd.slice(0, 120),
      });
      continue;
    }

    // Special handling: `echo X > path` is only allowed to specific targets.
    if (verb === "echo" && !ALLOWED_ECHO_TARGET_RE.test(cmd)) {
      violations.push({
        line: i + 1,
        verb: "echo",
        reason: "echo is only permitted with a simple redirect to a single path",
        excerpt: cmd.slice(0, 120),
      });
    }

    // Shell metacharacters that enable command chaining / substitution.
    if (/[;&|`]|\$\(|<\(|\$\{/.test(cmd)) {
      // Exception: `echo X > path` is OK (redirect is allowed for echo).
      if (!(verb === "echo" && ALLOWED_ECHO_TARGET_RE.test(cmd))) {
        violations.push({
          line: i + 1,
          verb,
          reason: "shell metacharacters not allowed in Reviewed tier",
          excerpt: cmd.slice(0, 120),
        });
      }
    }
  }

  if (violations.length === 0) return { ok: true, violations: [] };
  return { ok: false, violations };
}
