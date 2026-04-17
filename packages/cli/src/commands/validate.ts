import * as fs from "node:fs/promises";
import * as path from "node:path";
import {
  flagPatterns,
  isClosedGrammar,
  type Flag,
} from "@launchpad/registry";
import { parseManifest, type Manifest } from "../manifest";
import { isValidSha40 } from "../sha";
import { err, EXIT, isSkillzError, printErr } from "../errors";

export type ValidateOpts = {
  skillPath: string;
  targetTier?: "Reviewed" | "Community";
  json: boolean;
};

export type ValidateReport = {
  ok: boolean;
  target: string;
  tier_eligibility: {
    reviewed: boolean;
    community: boolean;
  };
  manifest: {
    name: string;
    version: string;
    declared_capabilities: Manifest["capabilities"];
  } | null;
  issues: string[];
  flags: Flag[];
  closed_grammar_violations: Array<{
    line: number;
    verb: string;
    reason: string;
  }>;
};

// SPDX allowlist — a broader set than init; the registry validator
// accepts any well-known SPDX identifier.
const SPDX_ALLOWLIST = new Set([
  "MIT",
  "Apache-2.0",
  "BSD-3-Clause",
  "BSD-2-Clause",
  "ISC",
  "GPL-3.0-only",
  "GPL-3.0-or-later",
  "GPL-2.0-only",
  "GPL-2.0-or-later",
  "LGPL-3.0-only",
  "LGPL-2.1-only",
  "MPL-2.0",
  "CC0-1.0",
  "CC-BY-4.0",
  "CC-BY-SA-4.0",
  "Unlicense",
]);

export async function validateCommand(
  opts: ValidateOpts,
): Promise<{ code: number; report: ValidateReport }> {
  const target = path.resolve(opts.skillPath);
  const report: ValidateReport = {
    ok: false,
    target,
    tier_eligibility: { reviewed: false, community: true },
    manifest: null,
    issues: [],
    flags: [],
    closed_grammar_violations: [],
  };

  try {
    // 1. Directory exists
    const stat = await fs.stat(target).catch(() => null);
    if (!stat?.isDirectory()) {
      report.issues.push(`target is not a directory: ${target}`);
      return finalize(report, opts);
    }

    // 2. skill.yml exists and parses
    const manifestPath = path.join(target, "skill.yml");
    let yamlText: string;
    try {
      yamlText = await fs.readFile(manifestPath, "utf-8");
    } catch {
      report.issues.push(`missing skill.yml at ${manifestPath}`);
      return finalize(report, opts);
    }

    let manifest: Manifest;
    try {
      manifest = parseManifest(yamlText, manifestPath);
    } catch (e) {
      if (isSkillzError(e)) {
        report.issues.push(`skill.yml: ${e.short} — ${e.why}`);
      } else {
        report.issues.push(
          `skill.yml: ${e instanceof Error ? e.message : String(e)}`,
        );
      }
      return finalize(report, opts);
    }

    report.manifest = {
      name: manifest.name,
      version: manifest.version,
      declared_capabilities: manifest.capabilities,
    };

    // 3. All files[] exist on disk
    for (const f of manifest.files) {
      const p = path.join(target, f);
      const s = await fs.stat(p).catch(() => null);
      if (!s || !s.isFile()) {
        report.issues.push(`files[]: '${f}' is listed in skill.yml but not found at ${p}`);
      }
    }

    // 4. License is a known SPDX identifier
    if (!SPDX_ALLOWLIST.has(manifest.license)) {
      report.issues.push(
        `license: '${manifest.license}' is not in the SPDX allowlist (${[...SPDX_ALLOWLIST].join(", ")})`,
      );
    }

    // 5. Pattern analyzer (Community tier or above)
    report.flags = flagPatterns(manifest.install_commands);
    for (const flag of report.flags) {
      report.issues.push(
        `install_commands[${flag.line}] flagged: ${flag.kind}`,
      );
    }

    // 6. Closed-grammar check (Reviewed tier eligibility)
    const closed = isClosedGrammar(manifest.install_commands);
    if (closed.ok) {
      report.tier_eligibility.reviewed = true;
      // Sanity: a Reviewed-eligible skill must NOT have capabilities.shell true.
      if (manifest.capabilities.shell) {
        report.tier_eligibility.reviewed = false;
        report.issues.push(
          "capabilities.shell: true is incompatible with Reviewed tier (closed grammar forbids shell metacharacters)",
        );
      }
    } else {
      report.closed_grammar_violations = closed.violations.map((v) => ({
        line: v.line,
        verb: v.verb,
        reason: v.reason,
      }));
    }

    // Community eligibility: passes if no analyzer flags OR (flags present AND capabilities.shell:true declared).
    // A flagged skill without declared shell is NOT eligible even for Community.
    const hasFlags = report.flags.length > 0;
    if (hasFlags && !manifest.capabilities.shell) {
      report.tier_eligibility.community = false;
      report.issues.push(
        "install_commands contain patterns that require capabilities.shell: true. Declare it or simplify the commands.",
      );
    }

    // 7. If the author specified a target tier, check eligibility.
    if (opts.targetTier === "Reviewed" && !report.tier_eligibility.reviewed) {
      report.issues.push(
        `target tier 'Reviewed' requested but skill is not Reviewed-eligible (see violations above)`,
      );
    }
    if (opts.targetTier === "Community" && !report.tier_eligibility.community) {
      report.issues.push(
        `target tier 'Community' requested but skill is not Community-eligible`,
      );
    }

    report.ok = report.issues.length === 0;
    return finalize(report, opts);
  } catch (e) {
    if (isSkillzError(e)) {
      printErr(e);
      return { code: e.code, report };
    }
    throw e;
  }
}

function finalize(
  report: ValidateReport,
  opts: ValidateOpts,
): { code: number; report: ValidateReport } {
  report.ok = report.issues.length === 0;

  if (opts.json) {
    process.stdout.write(JSON.stringify(report, null, 2) + "\n");
    return { code: report.ok ? EXIT.OK : EXIT.INPUT, report };
  }

  // Human-readable output
  process.stdout.write(`skillz validate ${report.target}\n\n`);

  if (report.manifest) {
    process.stdout.write(
      `  ${report.manifest.name} v${report.manifest.version}\n`,
    );
    const caps = report.manifest.declared_capabilities;
    process.stdout.write(
      `  declared capabilities: network=${caps.network}  filesystem=${caps.filesystem}  shell=${caps.shell}\n\n`,
    );
  }

  process.stdout.write(
    `  Community tier eligible: ${report.tier_eligibility.community ? "✓" : "✗"}\n`,
  );
  process.stdout.write(
    `  Reviewed tier eligible:  ${report.tier_eligibility.reviewed ? "✓" : "✗"}\n\n`,
  );

  if (report.flags.length > 0) {
    process.stdout.write(`  analyzer flags (${report.flags.length}):\n`);
    for (const f of report.flags) {
      process.stdout.write(`    line ${f.line}: ${f.kind}\n`);
      process.stdout.write(`      ${f.excerpt}\n`);
    }
    process.stdout.write("\n");
  }

  if (report.closed_grammar_violations.length > 0) {
    process.stdout.write(
      `  closed-grammar violations (Reviewed tier only — Community can ignore these if capabilities.shell is declared):\n`,
    );
    for (const v of report.closed_grammar_violations.slice(0, 8)) {
      process.stdout.write(`    line ${v.line}: ${v.reason}\n`);
    }
    if (report.closed_grammar_violations.length > 8) {
      process.stdout.write(
        `    … and ${report.closed_grammar_violations.length - 8} more\n`,
      );
    }
    process.stdout.write("\n");
  }

  if (report.issues.length === 0) {
    process.stdout.write(`✓ all checks passed.\n`);
  } else {
    process.stdout.write(`✗ ${report.issues.length} issue(s):\n`);
    for (const i of report.issues) {
      process.stdout.write(`    - ${i}\n`);
    }
  }

  return { code: report.ok ? EXIT.OK : EXIT.INPUT, report };
}
