---
title: Registry entry reference
order: 3
summary: The JSON schema for one entry in registry.json.
---

# Registry entry reference

The registry lives in one file: `packages/registry/registry.json`. Each entry is a JSON object that maps a short name to a pinned SHA + metadata.

## Complete example

```json
{
  "schema_version": 1,
  "name": "awesome-refactor",
  "description": "Refactor TypeScript code with step-by-step explanations.",
  "author": "your-handle",
  "license": "MIT",
  "repo": "your-handle/awesome-refactor",
  "sha": "0123456789abcdef0123456789abcdef01234567",
  "tier": "Reviewed",
  "targets": ["claude-code"],
  "capabilities": {
    "network": false,
    "filesystem": true,
    "shell": false
  },
  "tags": ["refactor", "typescript"],
  "added_at": "2026-04-19T00:00:00Z",
  "readme_md": "## What this skill does\n\n…"
}
```

## Fields

| Field | Type | Required | Notes |
|---|---|---|---|
| `schema_version` | integer | yes | `1`. |
| `name` | string | yes | Same regex as `skill.yml`. Must be unique across the registry. |
| `description` | string | yes | 1–280 chars. |
| `author` | string | yes | GitHub handle. |
| `license` | string | yes | SPDX identifier. |
| `repo` | string | yes | `owner/name` pair. `https://github.com/<repo>/tree/<sha>` must resolve. |
| `sha` | string | yes | **Full 40-char lowercase hex.** Tags and branch names are rejected at PR time. |
| `tier` | enum | yes | `Reviewed` or `Community`. |
| `targets` | string[] | yes | v1 accepts only `["claude-code"]`. |
| `capabilities` | object | yes | Mirrors the skill's `skill.yml`. Shown on the gallery page as metadata. |
| `tags` | string[] | yes | Up to 8. Each matches `^[a-z0-9-]{1,32}$`. |
| `added_at` | string | yes | ISO 8601 timestamp. |
| `deprecated` | boolean | no | When `true`, `skillz update` refuses by default and the gallery shows a warning. |
| `readme_md` | string | no | Optional inline Markdown (max 40,000 chars). When present, rendered on the per-skill page. When absent, the page links to the source repo. |

## What gets validated at PR time

The `registry-validate.yml` workflow blocks the PR unless all of these pass:

- Every entry parses against the schema (type + pattern checks above).
- Every `sha` is exactly 40 lowercase hex chars.
- No duplicate `name` across entries.
- The analyzer fuzz suite still passes (security backstop — if the suite regresses, all registry PRs are blocked until it's fixed).

## What does **not** get validated at PR time (yet)

Deep per-entry validation — fetching `skill.yml` at the declared SHA and re-running the analyzer against it — is v1.1. Today we rely on authors running `skillz validate` locally before opening the PR.

For the Reviewed tier, a human maintainer still audits per the checklist in [`packages/registry/AUDIT.md`](https://github.com/launchpad-skills/launchpad/blob/main/packages/registry/AUDIT.md) (capacity: 2 hrs/week; beyond that, skills land as Community).
