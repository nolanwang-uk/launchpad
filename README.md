# Launchpad

A skill marketplace for Claude Code. Browse a polished gallery, run or install skills with one command, trust what you're running via SHA-pinned diffs and a tiered verification system.

**Status:** Pre-code. Design approved, implementation plan in [`PLAN.md`](./PLAN.md).

**Design doc:** `~/.gstack/projects/workspace/nolan-no-branch-design-20260417-113158.md`

## Shape (TL;DR)

- **CLI** (Bun + TypeScript, single binary). `skillz run <name|url>` is primary. `skillz install <name|url>` is secondary. Both show a diff prompt before writing files or executing commands.
- **Registry** — `registry.json` in a public GitHub repo. PR-based contribution.
- **Gallery** — Next.js 15 on Vercel. Featured + trending + per-skill pages. Reads the same `registry.json`.
- **Trust** — Reviewed tier (manually audited against a published checklist, capped at 2hrs/week) vs Community tier (PR-accepted, always shows diff). SHA pinning on every entry. Author-declared capabilities in `skill.yml` (network/filesystem/shell) for future runtime enforcement. Static analyzer blocks obvious exfil patterns in `install_commands` at PR time.

Claude Code only for v1–v3. Door open for cross-agent later, but nothing designed for it now.
