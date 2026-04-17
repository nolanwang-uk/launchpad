# @launchpad/cli (skillz)

The Launchpad CLI. `skillz run <name|url>` fetches a skill, shows a diff, asks consent, executes one-shot in a temp dir with a scrubbed env.

## Status — Phase 1 MVP

| Verb / flow | Status |
|---|---|
| `skillz run --from-local <dir>` | ✅ working end-to-end |
| `skillz run github.com/owner/repo@<sha40>` | ✅ working end-to-end (live fetch) |
| `skillz --help` / `--version` | ✅ |
| `--yes` / `--i-accept-risk` / `--dry-run` | ✅ |
| `skillz install` | planned next |
| `skillz doctor` | planned |
| Registry short-name resolution | Phase 2 |

See [`HELP.md`](./HELP.md) for the full verb table and [`ERRORS.md`](./ERRORS.md) for the error format + worked examples.

## Architecture (implemented)

```
index.ts  ──►  commands/run.ts
                 │
                 ├──►  fetch.ts        (git archive via codeload, tar -x, sha verify)
                 ├──►  manifest.ts     (YAML parse + schema_version + field validation)
                 ├──►  diff.ts         (two-panel render + analyzer flags + base64 decode)
                 ├──►  prompt.ts       (y vs full-word `yes` gating)
                 ├──►  exec.ts         (env -i scrubbed spawn, sequential install_commands)
                 └──►  errors.ts       (4-line template, exit codes)
```

Per the approved plan's F2 (user challenge UC-Eng-1), the diff prompt is **two panels** (install commands + file tree). Capability declarations live in `skill.yml` for future runtime enforcement but are NOT shown in the prompt — v1 is honest about the enforcement gap.

## Running

```bash
# From the monorepo root:
bun install

# Dry-run against the test fixture:
bun packages/cli/src/index.ts run \
  --from-local packages/cli/test/fixtures/test-skill \
  --dry-run

# Actual run (writes to $SKILLZ_TEST_OUT):
SKILLZ_TEST_OUT=/tmp/skillz-test bun packages/cli/src/index.ts run \
  --from-local packages/cli/test/fixtures/test-skill \
  --yes
```

## Tests

```bash
bun test                          # all
bun test packages/cli/test/sha    # sha regex + exit-code semantics
bun test packages/cli/test/manifest  # YAML → typed Manifest
bun test packages/cli/test/e2e-hello  # end-to-end with local fixture
```

19 tests. Coverage targets per PLAN.md E-T1..E-T5: 80% CLI, 100% branch on the analyzer. Phase 2 adds the fuzz suite.

## Known gaps (tracked in PLAN.md)

- No real binary build yet (`bun build --compile` needs wiring into `.github/workflows/cli-release.yml`).
- No `skillz install` verb.
- No registry short-name resolution (Phase 2).
- No `skillz verify` (cosign check — Phase 5).
- No shell completions (Phase 5).
- The static analyzer inside `diff.ts` is pattern-based; the closed-grammar AST check for Reviewed tier (per F3) is Phase 5.
