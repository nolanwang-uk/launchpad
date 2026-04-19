---
title: Migration guide
order: 6
summary: How skill.yml schema changes will roll out — and what happens to installed skills when they do.
---

# Migration guide

v1 ships with `schema_version: 1`. This page describes how the schema will evolve and how existing skills + installed copies will be kept working.

## The contract

Every `skill.yml` and every registry entry declares `schema_version`. The CLI checks it on startup and on every install / run. When the CLI's supported range and the skill's version don't overlap:

- **Skill is older than CLI supports:** CLI prints a `migrate` hint and refuses to proceed until you upgrade the skill (or pin to an older CLI).
- **Skill is newer than CLI supports:** CLI prints an `upgrade skillz` hint with the exact command.

Both paths exit with `EXIT.INPUT` so CI scripts fail loudly.

## Compatibility promise

- **Patch-level tweaks** (accepting new optional fields, clarifying existing semantics) don't bump `schema_version`. Existing skills keep working.
- **Breaking changes** (removing fields, changing semantics, renaming verbs) do bump `schema_version`. A `skillz migrate` command will translate the old shape to the new one in place. We'll ship it with the CLI version that introduces the breaking change, never later.

## `skillz migrate`

In v1, `skillz migrate` is a stub that prints the current schema version and a link to this page. Real migration logic ships with the first schema bump (v2 is likely the runtime-sandbox release).

When it becomes real, the shape will be:

```bash
skillz migrate                  # dry-run over every installed skill
skillz migrate --apply          # rewrite in place after confirmation
skillz migrate <path>           # migrate a skill repo you're authoring
skillz migrate --from 1 --to 2  # explicit version targeting
```

Each rewrite is tracked in `.skillz-lock.json` so `skillz verify-install` (also v2) can prove what migrated when.

## What triggers a schema bump?

The three plausible candidates for v2:

- **Runtime capability enforcement.** Today `capabilities` is author-declared and not enforced. v2's sandbox will tighten the semantics; the field stays but its meaning changes from "documentation" to "contract."
- **Cross-agent targets.** v1 allows only `["claude-code"]`. When `targets` meaningfully grows (Cursor, OpenCode, Codex), install resolution will branch on it.
- **Producer publish flow.** `skillz publish` (deferred from v1) may require new manifest fields (release notes, changelog pointer, suggested price for private skills if the paid-marketplace v2 direction ships).

None of these are planned for the current release window. The contract above is the pact you can rely on.

## What never changes

- Full 40-char SHAs in registry entries. Always.
- Closed grammar for Reviewed tier. The analyzer's allowlist shrinks only; it never grows.
- Scrubbed exec env for `install_commands`. We may add items to the passthrough allowlist (via explicit `capabilities`), never remove the baseline scrub.

If a v2 would require breaking any of these three, it's a v1 → v2 major-version break and we'll ship it as `skillz2` alongside `skillz` rather than quietly changing defaults.
