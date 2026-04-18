# Launchpad Homebrew Tap

This directory is the source of truth for the Homebrew tap that publishes
the `skillz` CLI. At release time, the contents of `Formula/` are pushed to
the `launchpad-skills/homebrew-tap` repo by the `cli-release.yml` workflow.

## Install (once we cut the first public release)

```
brew install launchpad-skills/tap/skillz
```

or long-form:

```
brew tap launchpad-skills/tap
brew install skillz
```

## How releases flow

1. A maintainer pushes a `skillz-v*` tag (e.g. `skillz-v0.2.0`).
2. `cli-release.yml` builds the 4 binaries, signs the SHASUMS, creates a
   GitHub release.
3. The same workflow opens a PR (or commits direct, depending on config)
   against `launchpad-skills/homebrew-tap` with the new URLs + sha256
   values for each platform inside `Formula/skillz.rb`.
4. The PR merges → `brew update && brew upgrade skillz` pulls the new build.

## Maintainership

The tap is intentionally single-maintainer until the workflow proves out.
The Reviewed-tier capacity cap (2 hrs/week, per PLAN.md F3/E-R1) applies
here too — if maintaining the formula becomes a bottleneck, `AUDIT.md`
style deputization is the playbook.

## Verifying an installed binary

```
brew install cosign
skillz verify
```

`skillz verify` will:
1. Hash the binary on disk and compare against the SHASUMS256.txt that
   shipped with the release.
2. If cosign is installed, verify the Sigstore bundle on SHASUMS256.txt
   against the GitHub Actions OIDC issuer scoped to this repo.

A mismatch on either layer → exit code 4 + `DO NOT TRUST` verdict. The
bar is "what an attacker would have to do": replace the binary AND
re-sign under a GitHub OIDC identity bound to the official repo. The
second is the part Sigstore makes hard.

## Unsupported platforms

v1 ships:
- macOS arm64 + x64
- Linux arm64 + x64

Windows is WSL-only in v1; a native binary is on the v2 roadmap.
