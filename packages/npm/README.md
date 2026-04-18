# launchpad

One command to run or install any Claude Code skill.

```bash
# Zero install. Just try a skill:
npx launchpad run <skill-name>

# Install the CLI for heavy use:
npm i -g launchpad
skillz --help
```

## What this package is

A **pure-Node launcher** that ships pre-built `skillz` binaries for 4
platforms (macOS arm64 + x64, Linux arm64 + x64). `npx launchpad` picks
the right one at runtime and `exec`s it. No Bun required to use this
wrapper — only the bundled binary was built with Bun.

**No `postinstall`, no `curl | sh`, no runtime download.** The binaries
ride inside the tarball. Verify after install with:

```bash
skillz verify
```

which checks the sha-256 against the release's signed `SHASUMS256.txt`
and (optionally, if cosign is installed) the cosign keyless signature
bundle against the GitHub OIDC issuer scoped to this repo.

## Platform support

v1 supports macOS arm64/x64 and Linux arm64/x64. Windows users should
use WSL. A native Windows binary is on the v2 roadmap.

## Links

- Gallery: https://launchpad.dev
- Source / issues: https://github.com/launchpad-skills/launchpad
- Security model: https://launchpad.dev/docs/security
