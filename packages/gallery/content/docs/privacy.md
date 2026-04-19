---
title: Privacy
order: 7
summary: What Launchpad stores about you (almost nothing) and what it doesn't (almost everything).
---

# Privacy

Launchpad's default posture is: the less we know, the less there is to leak.

## The gallery (launchpad.dev)

- Static HTML served via Vercel. No analytics cookies. No session tracking.
- Vercel receives standard edge logs (IP, requested path, user-agent). We don't read them except to debug production outages.
- No account system in v1. Nothing to sign in to, nothing to forget.

## The CLI (`skillz`)

- **No phone-home on install or run.** Not in `--yes` mode, not in `--dry-run` mode, not silently in the background.
- **No telemetry.** Zero `fetch` calls to launchpad-owned domains outside of what you explicitly asked for (fetching a skill from GitHub is the user-intended network call).
- **Install-counter infra is deferred to v2.** When it ships it will be opt-in (not opt-out), the first install will ask with clear copy, your IP will be hashed (SHA-256) before persistence, and the only field sent is the skill name + a nonce. If that tradeoff isn't acceptable to you, you'll be able to skip it per-install or globally.

## The registry (GitHub repo)

- The registry is a public JSON file. Your skill's metadata (name, description, author handle) is public by design — that's how discovery works.
- The author field is a GitHub handle, so your GitHub public profile is linked.
- We don't track registry installs at the entry level in v1 (no counter infra).

## What we do not collect

- Email addresses.
- Crash reports. (`skillz` exits with a structured error; nothing is sent anywhere.)
- Your skill inventory. The CLI reads `~/.claude/skills/*/.skillz-lock.json` locally; no copy is made or transmitted.
- Your `install_commands` execution output.

## Third parties

- **GitHub:** every skill install fetches a git archive from `codeload.github.com`. Their privacy terms apply. Authenticating (`gh auth login`) is optional and only affects rate limits.
- **Vercel:** hosts the gallery. Their edge-logging policy applies for gallery page views.
- **Sigstore:** if you run `skillz verify` with cosign, a keyless verification request hits Rekor's public transparency log. No user info is sent; the request is about our public release signatures.

## Changes

This page changes when the code does, not before. If the counter infra or any kind of telemetry lands, the commit that adds it will update this page in the same PR and a release note will call it out.

## Contact

Privacy concern? `security@launchpad.dev`. We answer.
