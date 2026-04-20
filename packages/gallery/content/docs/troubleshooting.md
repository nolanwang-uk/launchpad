---
title: Troubleshooting
order: 5
summary: What the common skillz error messages mean, and how to get unstuck.
---

# Troubleshooting

Every error the CLI prints follows this shape:

```
error: <one-line summary>
why:   <what caused it>
fix:   <what to do next>
more:  <url>
```

This page is the human index of the `more:` URLs.

## `error: declared sha is not a 40-char hex commit oid`

**Why:** the registry entry (or your `--from-local` skill) has a `sha` that isn't a full 40-char lowercase hex string.

**Fix:** update the registry entry to use `git rev-parse HEAD` output. Tag names and branch names are intentionally rejected — force-pushes are real and this is the single cheapest defense against them.

## `error: archive SHA does not match the declared SHA`

**Why:** the tarball downloaded from `codeload.github.com` resolved to a different commit than the registry says.

**Fix:** this should be impossible under normal operation. If you hit it, the registry is out of sync with the source repo, or someone is mid-attack. Don't type yes. File an issue with the skill name + declared SHA.

## `error: install_command contains a disallowed pattern`

**Why:** the static analyzer flagged the skill's `install_commands` as containing a known-dangerous shell pattern (`curl | sh`, `eval`, `sudo`, base64 pipe, here-doc exec, etc.).

**Fix:** if you're the author: rewrite the command without the flagged pattern, or mark the skill Community tier with `capabilities.shell: true` declared. If you're an installer: do **not** pass `--i-accept-risk`; ask the author to fix it.

## `error: install_command #N exited with code <N>`

**Why:** one of the `install_commands` returned a nonzero exit after the user consented.

**Fix:** read the command's stdout/stderr above the error. Common causes:

- Binary not found on `PATH` — remember install runs under `env -i PATH=/usr/bin:/bin`. Include the binary in `files[]` and invoke it with a relative path.
- Permission denied — missing `chmod +x` before invocation.
- The skill expects input on stdin — install runs non-interactively; skills that prompt will hang, then time out.

## `error: --yes --i-accept-risk required`

**Why:** the CLI refused to auto-accept a skill that either declares `capabilities.shell: true` or contains an analyzer-flagged pattern.

**Fix:** audit the `install_commands` in the diff prompt. If you trust the skill, re-run with both flags:

```bash
skillz run foo --yes --i-accept-risk
```

`--yes` alone is deliberately insufficient for shell/flagged skills — it would turn the confirm step into a CI-script footgun.

## `error: skill.yml not found at the archive root`

**Why:** the skill repo doesn't have `skill.yml` at its top level.

**Fix:** if you're the author, put `skill.yml` at the repo root (same dir as the top-level `README.md`). Launchpad does not search subdirectories.

## `error: no installed skill found at ~/.claude/skills/<name>`

**Why:** `skillz uninstall <name>` couldn't find a `.skillz-lock.json` at that path.

**Fix:** run `skillz list` to see what's actually installed. The lock file is written by `skillz install`; if you hand-created the directory, skillz refuses to delete it (safety).

## `error: binary sha256 does not match the signed SHASUMS256.txt`

**Why:** `skillz verify` found that the local binary's hash doesn't match the hash in the release's `SHASUMS256.txt`. Someone has either tampered with the binary, tampered with `SHASUMS256.txt`, or you accidentally downloaded a different release's SHASUMS.

**Fix:** re-download both files from [the latest release](https://github.com/nolanwang-uk/launchpad/releases/latest) and re-run `skillz verify`. If it still fails, do not use the binary; file an issue.

## `error: unsupported-platform`

**Why:** the npm / Homebrew wrapper detected a platform outside v1's support matrix.

**Fix:** v1 ships binaries for macOS arm64 + x64 and Linux arm64 + x64. Windows users should use WSL. Native Windows is on the v2 roadmap.

## Still stuck?

- Run `skillz doctor` — it checks the most common environment assumptions.
- Search [issues on GitHub](https://github.com/nolanwang-uk/launchpad/issues).
- If you're a skill author, `skillz validate .` locally usually catches the specific thing causing CI to reject your PR.
