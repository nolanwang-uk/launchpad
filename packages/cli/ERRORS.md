# skillz — Error Message Taxonomy

Every error follows the exact 4-line format below. No exceptions, no bonus context.

```
error: <short one-line summary>
why:   <single sentence on cause>
fix:   <imperative next step>
more:  <url>
```

## Exit codes

See `HELP.md § Exit codes`.

## Worked examples

### 1. SHA mismatch (exit code 4)

```
error: archive SHA does not match the declared SHA
why:   the tarball downloaded from github.com/foo/bar resolved to 3e1f... but skill.yml declares abcd....
fix:   the skill author must update the `sha` field to a 40-char commit SHA and re-PR.
more:  https://launchpad.dev/docs/errors/sha-mismatch
```

Cleanup: temp dir removed. No files written to `~/.claude/skills/`.

### 2. Analyzer rejected install_command (exit code 4)

```
error: install_command contains a disallowed pattern
why:   line 2 of install_commands pipes a remote script into a shell (`curl … | sh`), which the analyzer blocks at PR-time for Reviewed skills.
fix:   ask the skill author to inline the script or move the skill to Community tier with `capabilities.shell: true`.
more:  https://launchpad.dev/docs/errors/analyzer
```

Cleanup: temp dir removed. No files written. Prompt never shown.

### 3. install_command exited non-zero (exit code 5)

```
error: install_command #2 exited with code 127
why:   the command `./bin/setup.sh` was not found on PATH inside the install shell (env -i PATH=/usr/bin:/bin).
fix:   the skill author must either include the binary in files[] or call it via an absolute path.
more:  https://launchpad.dev/docs/errors/exit-nonzero
```

Cleanup: temp dir removed. Partial writes to `~/.claude/skills/` (if any) left in place — the CLI does not roll back mid-install. User is responsible for running `skillz uninstall <name>`.

## Format requirements

- All four lines. `why:` one sentence. `fix:` an imperative ("run X", "ask the author", "check Y").
- `more:` must be a canonical URL under `launchpad.dev/docs/errors/<slug>` even if the page is a stub at launch.
- No trailing stack traces. No debug output. Use `--json` for machine-readable details.
- Lines are left-padded to align the colons (`error: ` / `why:   ` / `fix:   ` / `more:  ` — 5 spaces after `why/fix`, 4 after `more`).
