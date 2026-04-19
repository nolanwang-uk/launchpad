---
title: Security model
order: 4
summary: Why typing "yes" is more than a y/N, and what we don't protect against.
---

# Security model

Launchpad skills execute arbitrary commands in your development environment. We're honest about that. This page documents what the runtime **does** protect against, what it **doesn't**, and how to think about the tradeoffs.

## The layers

### 1. SHA pinning (E-S1)

Every registry entry declares a 40-char commit SHA. The CLI fetches the archive keyed on that exact SHA and verifies the archive's top-level commit oid matches before extraction. Tag and branch names are rejected at PR time with a regex check.

**Prevents:** an attacker force-pushing over a tag or renaming a branch to smuggle a new payload under an old name.

### 2. Closed grammar for Reviewed tier (F3 / UC-Eng-2)

Reviewed-tier skills can only use six verbs in their `install_commands`: `mkdir`, `cp`, `mv`, `chmod`, `ln`, and `echo > <path>`. No pipes, subshells, command substitution, here-docs, or interpreter `-c`/`-e`. The registry validator rejects Reviewed PRs that violate this.

**Prevents:** almost every interesting attack. A skill that can't run a shell can't fetch-and-exec, can't read arbitrary files, can't open sockets.

**Tradeoff:** some legitimate skills (those that need a postinstall build step) can't be Reviewed and ship as Community instead.

### 3. Static analyzer + fuzz suite (E-T1)

For Community tier, a pattern analyzer flags obvious exfil attempts — `curl | sh`, `eval`, `osascript`, `sudo`, base64 pipes, here-doc exec, process substitution on remote fetches, env-var indirection, writes outside allowed dirs, etc. A 27-entry fuzz corpus runs in CI on every registry PR; if the suite ever regresses, all PRs are blocked until it's fixed.

**Prevents:** the most common obfuscation patterns that would sneak a payload past a human reviewer.

### 4. Diff-before-exec (F2)

The CLI shows a two-panel diff prompt before executing anything:

```
┌───────────────────────────────────────┐
│  Skill: foo  (Reviewed · v0.1.0)      │
├───────────────────────────────────────┤
│  INSTALL COMMANDS (env -i ...):       │
│   1. mkdir -p ~/.claude/skills/foo    │
│   2. cp SKILL.md ~/.claude/skills/foo │
├───────────────────────────────────────┤
│  FILES TO WRITE: 1 file (4.2KB)       │
│    + SKILL.md             4.2KB       │
└───────────────────────────────────────┘
```

Community-tier skills that declare `capabilities.shell: true` OR that trip an analyzer flag require typing the full word `yes` (not `y`). Any base64 literal in an install command auto-decodes inline with a `↳ decoded from:` annotation so you can read the payload in plain text.

**Prevents:** rubber-stamping hostile commands.

### 5. Scrubbed exec environment (E-S2)

`install_commands` run under `env -i PATH=/usr/bin:/bin HOME=$HOME` plus locale vars and `TMPDIR`. Everything else is stripped: `$GITHUB_TOKEN`, AWS creds, `$OPENAI_API_KEY`, `$SSH_AUTH_SOCK`, all custom env vars.

**Prevents:** a skill that gets past the prompt from exfiltrating secrets that were in your shell.

**Proof, not claim:** `packages/cli/test/e2e-malicious.spec.ts` sets sensitive env vars in the parent, runs a shell-declared skill that dumps its env to a scratch file, and asserts the sensitive values do NOT appear in the dump.

### 6. Signed releases (DX-10)

The `skillz` binary itself ships with a cosign-signed `SHASUMS256.txt`. `skillz verify` checks the binary against the shasum AND verifies the Sigstore bundle against the GitHub OIDC issuer scoped to this repo.

**Prevents:** a tampered binary masquerading as an official release.

## What we don't protect against

- **Filesystem reads by Reviewed skills.** `cp` can read anything in your home directory. A malicious Reviewed skill could copy `~/.ssh/id_rsa` into `~/.claude/skills/evil/` and a later, seemingly-unrelated Community skill could exfiltrate it. Accepted risk — runtime sandboxing is v2.
- **Malicious skills that pass the audit.** The Reviewed tier promises "audited against a published checklist", not "bug-free" or "benign." Trust the source repo, not just the badge.
- **Supply-chain compromise of `skillz` itself.** Mitigated by cosign keyless signing + repo-scoped OIDC, not eliminated. If GitHub's OIDC issuer is compromised, so are we.

## Future work (v2)

- Runtime capability enforcement via `bwrap` (Linux) or `sandbox-exec` (macOS) — turns the author-declared `capabilities` block into an actual sandbox.
- Deep per-entry registry validation — fetch each `skill.yml` at the declared SHA and re-run the full analyzer against it at PR time.

## Reporting vulnerabilities

If you find a bypass of the analyzer, a misleading diff prompt render, or a way to leak env vars past the scrubbed exec: **email security@launchpad.dev** or open a GitHub issue marked with the `security` label. We'll credit you on the fix commit if you'd like.
