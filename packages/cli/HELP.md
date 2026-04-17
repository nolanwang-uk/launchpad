# skillz — CLI Help Reference

> Source of truth for `--help` output. Update here first, then mirror into code.

## Synopsis

```
skillz [flags] <verb> [args]
```

## Verbs

| Verb | Synopsis | Status in v1 |
|---|---|---|
| (no args) | Opens a palette: recent installs + available verbs | Planned (Phase 1) |
| `run <name\|url>` | Fetches a skill, shows the diff, executes one-shot in a temp dir | **Shipping (Phase 1)** |
| `install <name\|url>` | Same as `run` but copies the skill into `~/.claude/skills/<name>/` | Planned (Phase 1) |
| `uninstall <name>` | Removes an installed skill from `~/.claude/skills/` | Planned (Phase 1) |
| `info <name>` | Prints the skill's registry entry + a link to its source repo | Planned (Phase 2) |
| `search <term>` | Fuzzy-matches a term against the local registry cache | Planned (Phase 2) |
| `list` | Lists installed skills, their SHAs, and their declared capabilities | Planned (Phase 2) |
| `update [<name>]` | Refreshes a skill to a newer SHA (with capability-diff re-prompt) | Planned (Phase 2) |
| `doctor` | Preflight check: PATH, HOME perms, registry reachable, Node/Bun versions | Planned (Phase 1) |
| `verify` | cosign check on the `skillz` binary itself against the signed SHASUMS | Planned (Phase 5) |
| `init <name>` | Scaffolds a new skill repo layout locally (producer CLI) | Planned (Phase 2.5) |
| `validate [<path>]` | Runs the registry PR validator locally (producer CLI) | Planned (Phase 2.5) |
| `cache clear` | Deletes the local registry cache | Planned (Phase 2) |
| `completion <shell>` | Emits shell completions for bash / zsh / fish | Planned (Phase 5) |

## Flags

| Flag | Effect |
|---|---|
| `--help`, `-h` | Print this help and exit 0 |
| `--version`, `-V` | Print CLI version + install source (`brew` / `npm`) and exit 0 |
| `--json` | Machine-readable output for scripts |
| `--quiet`, `-q` | Suppress non-error output |
| `--no-color` | Disable ANSI color |
| `--yes`, `-y` | Accept no-shell skills without prompting |
| `--yes --i-accept-risk` | Required together for shell-enabled skills in CI |
| `--dry-run` | Show what would happen but don't exec or write anything |
| `--from-local <path>` | Point at a local directory instead of fetching from GitHub |
| `--no-cache` | Bypass the local registry cache |
| `--target <dir>` | Override default `~/.claude/skills/` for `install` |

## Error message format

Every error the CLI prints follows exactly this shape:

```
error: <short one-line summary>
why:   <one sentence on cause>
fix:   <imperative next step>
more:  <url>
```

See `ERRORS.md` for the full taxonomy and 3 worked examples.

## Exit codes

| Code | Meaning |
|---|---|
| 0 | Success (including user-abort on the prompt) |
| 1 | Generic runtime error |
| 2 | Invalid input (bad URL, bad SHA, bad manifest) |
| 3 | Network error (couldn't fetch registry or archive) |
| 4 | Security violation (SHA mismatch, analyzer rejected) |
| 5 | Install command exited non-zero |
| 130 | Interrupted by signal (SIGINT / SIGTERM) |
