---
title: Build your first skill
order: 1
summary: From empty directory to submitted PR in under 30 minutes.
---

# Build your first skill

The producer path is deliberately boring: write a few files, run one validator, open a PR. This page walks the whole thing in about 20 minutes.

## Prerequisites

- `skillz` installed (see [Install](/#install))
- A GitHub account
- An editor

## 1. Scaffold

```bash
skillz init my-first-skill --author your-github-handle --license MIT
cd my-first-skill
```

You'll see four files:

```
my-first-skill/
├── skill.yml          # manifest — this is the spec
├── SKILL.md           # the prompt Claude Code loads
├── .gitignore
└── LICENSE
```

`skill.yml` starts with `schema_version: 1` and the closed-grammar install commands that make you eligible for the **Reviewed** tier by default. Don't go looking for a way to add `curl | bash` unless you're sure — you'll lose the Reviewed badge.

## 2. Write the skill

Open `SKILL.md` and replace the template body with the actual prompt you want Claude Code to load when a user installs your skill. One prompt, one concern. Keep it focused.

## 3. Validate locally

```bash
skillz validate .
```

This runs the same checks the registry's PR validator will run in CI: schema shape, SPDX license, file list vs disk, install-command grammar, tier eligibility. Fix whatever it flags; re-run until green.

Want to target Community tier (arbitrary shell allowed)? Pass `--tier Community` to assert that target explicitly:

```bash
skillz validate . --tier Community
```

## 4. Publish the skill repo

```bash
git init
git add .
git commit -m "initial skill"
gh repo create your-handle/my-first-skill --public --push
```

Capture the resulting commit SHA:

```bash
git rev-parse HEAD
```

## 5. Submit a registry PR

Fork `launchpad-skills/launchpad` and add an entry to `packages/registry/registry.json`:

```json
{
  "schema_version": 1,
  "name": "my-first-skill",
  "description": "One-sentence summary.",
  "author": "your-handle",
  "license": "MIT",
  "repo": "your-handle/my-first-skill",
  "sha": "<full 40-char SHA>",
  "tier": "Reviewed",
  "targets": ["claude-code"],
  "capabilities": { "network": false, "filesystem": true, "shell": false },
  "tags": ["examples"],
  "added_at": "2026-04-19T00:00:00Z"
}
```

Open the PR. The `registry-validate` workflow will run the same validator locally + re-run the full analyzer fuzz suite as a security gate. Fix anything it flags.

## 6. After merge

Within minutes, `skillz run my-first-skill` resolves from the registry. You'll also show up in the gallery under **New this week** until the next release.

## What's deferred to v1.1

- `skillz publish` that opens the PR for you via `gh`. Today you do it by hand.
- Skill versioning beyond "bump the SHA in the registry entry."

The slow path exists to keep launch scope honest.
