# Launchpad — Implementation Plan

Plan for v1 of Launchpad, a skill marketplace for Claude Code. This plan derives from the approved design doc at `~/.gstack/projects/workspace/nolan-no-branch-design-20260417-113158.md`. Read the design doc for the "why." This plan covers the "how."

## Target

Ship v1 in 1–2 weeks. Definition of Done below.

## Architecture

Three surfaces, one data source.

```
┌──────────────────┐      ┌───────────────────┐      ┌──────────────────┐
│   Gallery UI     │      │   registry.json   │      │      CLI         │
│  (Next.js 15)    │──────│ (public GH repo)  │──────│ (Bun, 1 binary)  │
│   vercel-host    │      │   PR-based adds   │      │  skillz run/inst │
└──────────────────┘      └───────────────────┘      └──────────────────┘
         │                                                     │
         │                                                     │
         └───────────────► trending counter ◄──────────────────┘
                          (Vercel Fn + KV)
```

All three read the same `registry.json`. The CLI pings a counter on install (opt-in). The gallery reads counts to render the trending tab.

## Repo layout (target)

```
launchpad/
├── README.md
├── PLAN.md
├── packages/
│   ├── cli/                    # Bun + TS, single-binary CLI
│   │   ├── src/
│   │   │   ├── index.ts        # entry, arg parsing
│   │   │   ├── commands/
│   │   │   │   ├── run.ts      # primary verb
│   │   │   │   └── install.ts  # secondary verb
│   │   │   ├── registry.ts     # fetch + resolve short names
│   │   │   ├── fetch.ts        # pinned-SHA git archive
│   │   │   ├── diff.ts         # show-before-apply
│   │   │   └── counter.ts      # opt-in install ping
│   │   ├── test/
│   │   └── package.json
│   ├── gallery/                # Next.js 15 gallery
│   │   ├── app/
│   │   │   ├── page.tsx        # home: featured + trending
│   │   │   ├── s/[name]/       # per-skill page
│   │   │   └── api/
│   │   │       └── count/      # install counter endpoint
│   │   └── package.json
│   └── registry/               # the data + schema
│       ├── registry.json
│       ├── schema.json
│       └── skills/             # seed 10 skills live as subdirs or refs
├── .github/workflows/
│   ├── ci.yml                  # lint/test on PR
│   ├── cli-release.yml         # tag push → npm + homebrew
│   └── registry-validate.yml   # validate registry.json on PR
└── package.json                # bun workspaces
```

Monorepo with Bun workspaces. Three packages: `cli`, `gallery`, `registry`.

## Phased build

### Phase 0 — Spec the CLI (The Assignment, ~1 hour)

Before writing code, write the literal CLI command you wish existed. Exact syntax, exact output. Paste it into `packages/cli/SPEC.md`. That file becomes the acceptance criterion for Phase 1.

### Phase 1 — CLI MVP (2–3 days)

- `skillz run <github-url>` works end-to-end with one hardcoded test skill
- Fetches pinned SHA via `git archive`
- Extracts to a temp dir
- Parses a `skill.yml` manifest (minimal: name, version, files, install_commands)
- Prints diff: "this will write N files and execute these commands"
- Prompts y/N
- Executes if y, cleans up temp dir on either path
- `skillz install` is the same flow but targets `~/.claude/skills/<skill-name>/`

Tests: one integration test against a real test-skill repo. Unit tests for diff rendering, manifest parsing, SHA resolution.

### Phase 2 — Registry + short names (1 day)

- `registry.json` schema locked (see Open Decisions)
- `skillz run <short-name>` resolves against the registry
- CLI caches registry for 10 min
- 10 seed skills authored, reviewed, added to registry

### Phase 3 — Gallery (3–4 days)

- Next.js 15 app on Vercel
- Home: featured + trending tabs (featured is hand-curated, trending is by install count)
- Per-skill page: rendered README, tier badge, SHA, install commands with copy button, GitHub source link
- Tag/category filter on home
- Static generation with on-demand revalidation when registry repo updates

### Phase 4 — Trending counter (1 day)

- Vercel Function + Vercel KV (or Upstash Redis)
- POST `/api/count/<name>` — increments, rate-limited by IP
- CLI prompts user opt-in on first install ("Share install counts so authors can see their skills are used? [y/N]")
- Opt-in persisted in `~/.config/launchpad/config.json`

### Phase 5 — Verified tier + launch polish (2–3 days)

- Green verified badge in gallery and CLI output
- Manual audit workflow documented (AUDIT.md in registry package)
- Registry PR validator workflow: schema check, SHA-exists check, forbidden-command heuristics
- Gallery polish pass: screenshots for docs, OG images per skill, dark mode
- Launch post draft

## Open Decisions (resolve before Phase 1 or during)

1. **CLI name.** `skillz` is a placeholder. Decide before publishing to npm/homebrew.
2. **Install-counter privacy model.** Opt-in (chosen in design doc) — confirm and write the exact opt-in copy.
3. **`skill.yml` spec.** Minimum viable fields. Lock before Phase 2.
4. **Verified-tier throughput.** What's the audit checklist? Time budget? Rejection bar?
5. **Forbidden-command heuristics.** What commands auto-fail registry PR validation? (e.g., `rm -rf /`, `curl | sh` to unknown hosts, etc.)
6. **Monorepo vs split repos.** Monorepo is assumed. Confirm before writing `package.json`.

## Definition of Done (v1)

- CLI published to npm and homebrew, works on macOS + Linux
- Gallery deployed to a production URL with a custom domain
- Registry has 10 curated skills, all with `verified` tier
- End-to-end test: visitor sees gallery → clicks skill → pastes command → skill installs with diff prompt
- Zero known security issues in the diff/exec flow
- README in each package has a 2-minute getting-started
- Launch post drafted

## Success Criteria (from design doc)

- One launch post drives ≥5 installs in the first 24 hours
- First unsolicited external PR to the registry within 2 weeks
- Zero "a skill nuked my env" reports in first 90 days
- Gallery passes the "screenshot-and-be-proud" bar

## Out of scope for v1

- User accounts / auth
- Comments, ratings, reviews
- Payments, tips, sponsorship
- Cross-agent support (Cursor, Copilot, etc.)
- Private registries or enterprise features
- Skill versioning beyond "pin the SHA you care about"
- A hosted skill editor / authoring UI

## Risks

- **Security posture is v1's hardest problem.** The show-diff flow must be clear enough that a user actually reads it. If it becomes a y/N rubber-stamp, the whole trust story collapses.
- **Naming.** A weak name will cap adoption. Don't publish to npm until you've slept on at least 3 candidates.
- **Registry growth flywheel.** If nobody submits PRs after the launch post, the gallery dies. Pre-commit to writing the first 10 skills yourself and being aggressive about featuring community submissions.
