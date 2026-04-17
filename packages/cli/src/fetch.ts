import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as os from "node:os";
import { spawn } from "node:child_process";
import { err, EXIT } from "./errors";
import { assertValidSha40, verifyExtractedArchiveSha } from "./sha";

export type RepoRef = {
  owner: string;
  name: string;
  sha: string;
};

const GITHUB_URL = /^https?:\/\/github\.com\/([^/]+)\/([^/]+?)(?:\.git)?\/?$/;
const SHORT_REF = /^([^/]+)\/([^/@]+)(?:@([0-9a-f]{40}))?$/;

export function parseRepoArg(arg: string, declaredSha?: string): RepoRef {
  let owner: string | undefined;
  let name: string | undefined;
  let sha: string | undefined;

  const ghUrl = GITHUB_URL.exec(arg);
  if (ghUrl && ghUrl[1] && ghUrl[2]) {
    owner = ghUrl[1];
    name = ghUrl[2];
  } else {
    const short = SHORT_REF.exec(arg);
    if (short && short[1] && short[2]) {
      owner = short[1];
      name = short[2];
      if (short[3]) sha = short[3];
    }
  }

  if (!owner || !name) {
    throw err(
      "bad-url",
      "could not parse a GitHub repo from the argument",
      `expected: github.com/<owner>/<repo>, or <owner>/<repo>@<sha40>. Got: '${arg}'.`,
      "pass a valid GitHub URL, e.g. `skillz run github.com/you/my-skill`.",
      EXIT.INPUT,
    );
  }

  const effectiveSha = declaredSha ?? sha;
  if (!effectiveSha) {
    throw err(
      "missing-sha",
      "no SHA provided",
      `the argument '${arg}' does not include a commit SHA, and no registry entry was resolved.`,
      "append @<sha40> to the argument, or resolve via the registry once short names land in Phase 2.",
      EXIT.INPUT,
    );
  }

  assertValidSha40(effectiveSha, "argument or registry");
  return { owner, name, sha: effectiveSha };
}

/**
 * Fetches a git archive tarball for a specific commit SHA and extracts
 * it into a fresh temp directory. Returns the path to the extracted root.
 *
 * The caller is responsible for cleaning up via `cleanupExtracted(path)`.
 */
export async function fetchAndExtract(ref: RepoRef): Promise<string> {
  const tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), "skillz-"));
  const url = `https://codeload.github.com/${ref.owner}/${ref.name}/tar.gz/${ref.sha}`;

  const res = await fetch(url).catch((e: unknown) => {
    throw err(
      "fetch-failed",
      "could not download the skill archive",
      `GET ${url} failed: ${e instanceof Error ? e.message : String(e)}.`,
      "check your network, or confirm the SHA exists in the source repo.",
      EXIT.NETWORK,
    );
  });

  if (!res.ok) {
    throw err(
      "fetch-status",
      `archive download returned HTTP ${res.status}`,
      `${url} returned ${res.status} ${res.statusText}. Common causes: SHA missing from repo, repo is private, GitHub rate-limit.`,
      res.status === 403
        ? "wait a few minutes (GitHub unauth rate limit is 60/hr), or authenticate via `gh auth login`."
        : "verify the SHA and repo exist on GitHub.",
      EXIT.NETWORK,
    );
  }

  const tarballPath = path.join(tmpRoot, "archive.tgz");
  const buf = new Uint8Array(await res.arrayBuffer());
  await fs.writeFile(tarballPath, buf);

  // Extract via system `tar`. Bun has no built-in tar extraction.
  const extractDir = path.join(tmpRoot, "extracted");
  await fs.mkdir(extractDir, { recursive: true });

  await new Promise<void>((resolve, reject) => {
    const child = spawn("tar", ["-xzf", tarballPath, "-C", extractDir, "--strip-components=1"], {
      stdio: "ignore",
    });
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else
        reject(
          err(
            "tar-extract",
            "failed to extract the skill archive",
            `tar exited with code ${code}. Archive may be corrupted or truncated.`,
            "re-run the command; if it persists, file an issue with the skill URL and SHA.",
            EXIT.NETWORK,
          ),
        );
    });
    child.on("error", (e) =>
      reject(
        err(
          "tar-spawn",
          "could not invoke tar to extract the archive",
          `spawn failed: ${e.message}. skillz requires a POSIX tar on PATH.`,
          "install tar (`brew install gnu-tar` on macOS) and retry.",
          EXIT.RUNTIME,
        ),
      ),
    );
  });

  await verifyExtractedArchiveSha(ref.sha, extractDir);

  // Return the parent so callers can clean up one dir.
  // Attach the extractDir as the "root" and tmpRoot as the cleanup handle.
  Object.defineProperty(extractDir, "_cleanup", {
    value: tmpRoot,
    enumerable: false,
  });
  return extractDir;
}

/**
 * Removes the temp root for an extracted archive. Safe to call multiple times.
 * Pass the path returned by `fetchAndExtract`.
 */
export async function cleanupExtracted(extractDir: string): Promise<void> {
  // The temp root is the parent of the extractDir (we created /tmp/skillz-XXX/extracted).
  const tmpRoot = path.dirname(extractDir);
  if (!tmpRoot.includes("skillz-") || tmpRoot === "/" || tmpRoot === os.tmpdir()) {
    // Defensive: refuse to nuke unexpected paths.
    return;
  }
  await fs.rm(tmpRoot, { recursive: true, force: true }).catch(() => {
    /* swallow: cleanup must not fail the command */
  });
}
