import { err, EXIT, type SkillzError } from "./errors";

const SHA40 = /^[0-9a-f]{40}$/;

export function isValidSha40(s: string): boolean {
  return SHA40.test(s);
}

export function assertValidSha40(s: string, context: string): void {
  if (!isValidSha40(s)) {
    throw err(
      "invalid-sha",
      "declared sha is not a 40-char hex commit oid",
      `${context} contains '${s}', but skillz requires a full SHA-40 (no tags, no branches, no short SHAs).`,
      "the skill author must update skill.yml to use a full 40-character commit SHA.",
      EXIT.SECURITY,
    );
  }
}

/**
 * Verifies the archive's actual commit oid equals the declared SHA.
 * Strategy (Phase 1): we fetched the archive via a URL keyed on the declared SHA,
 * so we trust GitHub's codeload endpoint to return that specific commit. In a
 * future phase (E-I1), a Vercel edge proxy will verify independently.
 *
 * For now this is a placeholder hook — given a directory extracted from the
 * declared-SHA URL, we confirm the extraction succeeded (directory exists +
 * has files). The real cryptographic verification is the URL scheme itself.
 *
 * TODO(phase-2): plumb git-archive ref-verification through the edge proxy.
 */
export async function verifyExtractedArchiveSha(
  declaredSha: string,
  extractedDir: string,
): Promise<void> {
  assertValidSha40(declaredSha, "registry entry");
  const fs = await import("node:fs/promises");
  const entries = await fs.readdir(extractedDir).catch(() => [] as string[]);
  if (entries.length === 0) {
    throw err(
      "empty-archive",
      "archive extracted to an empty directory",
      `expected files from @${declaredSha.slice(0, 7)}, got nothing.`,
      "check your network connection, or check that the SHA exists in the declared repo (git fetch + git cat-file -e <sha>).",
      EXIT.NETWORK,
    );
  }
}

export { type SkillzError };
