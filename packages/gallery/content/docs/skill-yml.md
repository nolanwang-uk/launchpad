---
title: skill.yml reference
order: 2
summary: Every field that lives in a skill's manifest, and what values are valid.
---

# `skill.yml` reference

Every skill ships with a `skill.yml` at its repo root. This is the authoritative schema for `schema_version: 1`.

## Complete example

```yaml
schema_version: 1

name: awesome-refactor
version: 0.3.1
description: Refactor TypeScript code with step-by-step explanations.
author: your-handle
license: MIT

targets:
  - claude-code

capabilities:
  network: false
  filesystem: true
  shell: false

files:
  - SKILL.md
  - templates/refactor.md

install_commands:
  - mkdir -p $HOME/.claude/skills/awesome-refactor
  - cp SKILL.md $HOME/.claude/skills/awesome-refactor/
  - cp -r templates $HOME/.claude/skills/awesome-refactor/
```

## Fields

| Field | Type | Required | Notes |
|---|---|---|---|
| `schema_version` | integer | yes | Must be `1` in v1. Reserved for future incompatible changes. |
| `name` | string | yes | Lowercase kebab-case, 1–64 chars: `^[a-z0-9][a-z0-9-]{0,63}$`. |
| `version` | string | yes | SemVer recommended but not enforced in v1. |
| `description` | string | yes | One-line summary. 1–280 chars. Shown on the gallery card. |
| `author` | string | yes | Your GitHub handle or display name. |
| `license` | string | yes | SPDX identifier (`MIT`, `Apache-2.0`, `BSD-3-Clause`, …). |
| `targets` | string[] | yes | v1 accepts only `["claude-code"]`. Array shape preserves cross-agent optionality for v2. |
| `capabilities` | object | yes | `{ network: bool, filesystem: bool, shell: bool }`. Author-declared; not runtime-enforced in v1. |
| `files` | string[] | yes | Paths (relative to the repo root) that `install` will copy. |
| `install_commands` | string[] | yes | Shell commands run in a scrubbed env after files are copied. Tier rules below. |

## Tier rules

### Reviewed

- `install_commands` must use only: `mkdir`, `cp`, `mv`, `chmod`, `ln`, `echo > <path>`.
- No pipes, subshells, command substitution, here-docs, or interpreter `-c` / `-e`.
- `capabilities.shell` must be `false`.
- Passes `skillz validate . --tier Reviewed` with zero violations.

### Community

- `install_commands` can use arbitrary shell, but only if `capabilities.shell: true` is declared.
- Any analyzer-flagged pattern (curl-pipe-sh, `eval`, `osascript`, `sudo`, base64 pipe, etc.) forces the runtime diff prompt to require typing the full word `yes` (not just `y`).
- Shows up with a grey **Community** badge in the gallery.

## Common mistakes

- **SHA in `skill.yml`?** No. The SHA lives in the registry entry, not the manifest.
- **Interactive prompts in `install_commands`?** No. Install runs non-interactively under `env -i`; anything that reads stdin will hang.
- **Writes to `/etc`, `/usr/local/bin`, etc.?** The analyzer flags them. Keep writes under `~/.claude/`, `~/.config/`, `$TMPDIR`, or the skill's cwd.
- **Trying to inherit `$GITHUB_TOKEN`?** Scrubbed. The exec env is `PATH=/usr/bin:/bin HOME=$HOME` + locale + `TMPDIR`, nothing else.
