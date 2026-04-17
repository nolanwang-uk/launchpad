<!-- /autoplan restore point: /Users/nolan/.gstack/projects/launchpad/main-autoplan-restore-20260417-114521.md -->
# Launchpad — Implementation Plan

Plan for v1 of Launchpad, a skill marketplace for Claude Code. This plan derives from the approved design doc at `~/.gstack/projects/workspace/nolan-no-branch-design-20260417-113158.md`. Read the design doc for the "why." This plan covers the "how."

## Target

Ship v1 in ~10 days. Definition of Done below. Scope locked after /autoplan review on 2026-04-17; see "Locked Scope (v1 final)" below for the authoritative scope. Earlier phase sections below retain detail/rationale but are subject to the final locked decisions.

## Locked Scope (v1 final, supersedes prior sections on conflict)

| # | Area | Final decision | Source |
|---|------|---------------|--------|
| F1 | **V1 shape** | **Revised B-lite:** gallery + CLI + producer CLI (init/validate only) + 10 Reviewed seed skills. NO trending counter in v1. NO sparklines. `npx launchpad run` is the primary install path; Homebrew is "for heavy users." | UC-CEO-D/TC + UC-DX-3 |
| F2 | **Capability UI in diff prompt** | **Dropped.** Capabilities field stays in `skill.yml` (for future runtime enforcement) but is NOT shown in the CLI diff prompt. Revert D1 to two panels: decoded install_commands + file tree with byte counts. Gallery rail CAN show capability chips but must label them "author-declared." | UC-Eng-1 (a) |
| F3 | **Static analyzer / install_commands** | **Two-track:** Reviewed tier enforces closed grammar (`mkdir`, `cp`, `mv`, `chmod`, `ln` only); PR rejected if any other verb appears. Community tier allows arbitrary shell ONLY when `capabilities.shell: true` is declared, AND requires typing full word `yes`, AND runs through the full fuzz-tested analyzer. | UC-Eng-2 (b) |
| F4 | **Producer CLI** | Ship `skillz init` (scaffolder) + `skillz validate` (runs the same checks the registry validator runs) in v1. Defer `skillz publish` (PR via `gh`) to v1.1. +1 day scope = Phase 2.5. | UC-DX-1 (c) |
| F5 | **Install primacy** | `npx launchpad run <name>` is the hero on the home page and the first example in the README. Homebrew (`brew install …/tap/skillz`) is "For heavy users who run skills daily." | UC-DX-3 (a) |
| F6 | **Typography** | Inter Display + JetBrains Mono. Free, strong default. Reconsider if v1 gets traction. | TD-Design-1 |
| F7 | **Motion / animation** | Ship slot-machine counter roll (80ms) — wait, counter deferred; **drop the counter-roll.** Keep card-hover lift (2px / 150ms ease-out) and copy-icon morph (200ms cross-fade). Respect `prefers-reduced-motion`. | TD-Design-2 (auto) |
| F8 | **Sparkline per card** | Dropped. Depended on trending counter which is deferred. | TD-Design-3 (auto-followed) |

### V1 → V2 roadmap (explicit, so the plan survives launch)

- **V2 candidates** (ordered by stack-ranked post-launch priority):
  - Runtime sandbox (`bwrap` on Linux, `sandbox-exec` on macOS) — unlocks truthful capability UI
  - Trending counter + sparklines — after install volume justifies the infra
  - `skillz publish` (producer publish via `gh`)
  - Cross-agent adapters (if `targets:` array gets 2nd value in the wild)
  - Native Windows binary
  - Skill authoring UI on the gallery
  - **Private skills + paid marketplace** (see sketch below)

### V2 sketch: Private skills + paid marketplace

**Problem it solves:** The producer flywheel. Today the only incentive to publish is status. Paid skills give creators a revenue reason to author and maintain, and differentiate Launchpad from Anthropic's eventual free first-party browser (they sell tokens, not content).

**What we already have that carries over:**
- SHA-pinned, deterministic install unit (a skill pinned at a specific SHA is a sellable artifact).
- Capability manifest (`network/filesystem/shell`) describes exactly what the buyer is authorizing.
- Closed-grammar install_commands (Reviewed tier) means buyers can audit before paying.
- `skillz verify` (Phase 5) already sets the pattern for runtime-verified trust.

**What's new (not free):**
1. **Visibility flag on registry entries:** `visibility: "public" | "private"`. Private entries are absent from the public gallery and require a signed token to install.
2. **License server:** a Vercel endpoint that mints HMAC-signed, time-limited install tokens for a `(skill-sha, buyer-identity)` pair. CLI passes the token to the registry resolver; without a valid token, private entries return a `402` / `skillz` prints the purchase URL.
3. **Payment integration:** Stripe Checkout (likely Connect for creator payouts). One-time purchase first; subscriptions later. Prices in creator-set USD with regional price parity later.
4. **Creator dashboard:** auth (probably GitHub OAuth for reach + dev identity), skill listing + price management, payout status, sales history.
5. **Buyer dashboard:** list of purchased skills, re-download, license portability across devices.
6. **`skillz login` / identity:** CLI needs a stable buyer identity (not a device ID) so a purchase survives reinstalls and works across their laptops.
7. **Legal + tax:** Terms of Service (creator + buyer), DMCA process, refund policy, VAT/MOSS for EU sales, US state sales tax where thresholds apply, 1099-K for US creators over $600/yr.

**What it'd cost:** Best case, 4–6 weeks for a single builder. Not a weekend, not a 2-week feature. Payments + tax + legal eat real founder time even with Stripe.

**Trigger to revisit (success criteria for V2 kickoff):**
- V1 has ≥1,000 weekly installs across free skills (validates demand density).
- At least 3 unsolicited creator inquiries asking "can I charge for mine?"
- Anthropic has NOT shipped a paid first-party skill browser (unlikely but worth monitoring).

**Alternative — lighter weight, could go in v1.1 if demand appears:**
- "Pay what you want" tip button on the gallery skill page (Stripe Payment Link, no account infra). Solves the "reward creators" problem without building a full market. One-evening build. The market question ("can you make a living selling skills?") stays open, but creators who want money can receive it.

**Explicitly out of v2 scope (to prevent feature-creep):**
- Marketplace curation (Apple-style editorial). Keep it creator-publishes-directly.
- Enterprise / team / org licenses. Single-user purchases only.
- Creator royalty splits (collaborations). One-creator-per-skill.
- Skill versioning discounts or upgrade pricing. Each SHA is its own sale.


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
- Each entry includes `targets: [claude-code]` array (CEO revision E1 — preserves cross-agent optionality without implementation cost)
- Each entry includes `capabilities: { network: bool, filesystem: bool, shell: bool }` declared by author (stored in schema for future runtime enforcement; per F2 NOT shown in the CLI diff prompt; per F3 `shell: true` is required for any Community-tier skill using arbitrary shell)
- `skillz run <short-name>` resolves against the registry
- CLI caches registry via GitHub ETag (not fixed TTL per E-I5)
- 10 seed skills authored, reviewed, added to registry — all Reviewed tier, all closed-grammar install_commands (per F3)

### Phase 2.5 — Producer CLI (NEW, per F4, ~1 day)

Ships with v1 to seed the producer flywheel. `skillz publish` deferred to v1.1.

- `skillz init <name>` — scaffolds a new skill repo layout locally: `skill.yml` with `schema_version: 1` and commented fields, `README.md` template, `files/` directory with placeholder, `.gitignore`, `LICENSE` prompt (SPDX picker). Opens the local dir in `$EDITOR`.
- `skillz validate [<path>]` — runs the same checks the registry PR validator runs (schema, `sha` format, capability presence, closed-grammar check for Reviewed-target skills, static analyzer on install_commands). Green output means your skill WILL pass PR validation.
- `skillz validate` is also runnable from CI (a `skillz-validate` GitHub Action shipped in v1.1).

### Phase 3 — Gallery (3–4 days)

- Next.js 15 app on Vercel
- Home: featured + trending tabs (featured is hand-curated, trending is by install count)
- Per-skill page: rendered README, tier badge, SHA, install commands with copy button, GitHub source link
- Tag/category filter on home
- Static generation with on-demand revalidation when registry repo updates

### Phase 4 — ~~Trending counter~~ DEFERRED to v2 (per F1)

The trending counter is deferred. At launch-era volume (10 skills, expected 5–50 installs/week), "trending" is mathematical noise. The home page uses "New this week" instead (D3). Reclaimed ~1 day goes to producer CLI (Phase 2.5) and launch polish.

When install volume justifies it (~500+ weekly installs), resurrect this phase with the E-S3 HMAC + ip_hash rate-limit design already specified below.

<details>
<summary>Deferred spec (kept for v2 reference)</summary>

- Vercel Function + Vercel KV (or Upstash Redis)
- POST `/api/count/<name>` — HMAC-signed token from archive SHA, rate-limit on `(sha256(ip), name)` sliding window, IP stored as SHA-256 only (GDPR), cap per-name-per-hour delta
- CLI prompts user opt-in on first install
- Opt-in persisted in `~/.config/launchpad/config.json`
</details>

### Phase 5 — Reviewed tier + launch polish (2–3 days)

**Note:** "Verified" renamed to "Reviewed" per CEO revision E4. Two-track security per F3 (UC-Eng-2 (b)).

- **Reviewed tier:** install_commands restricted to a **closed grammar** — only these verbs permitted: `mkdir`, `cp`, `mv`, `chmod`, `ln`, `echo > <path>` (limited redirection to allowlisted paths). Any other verb → PR rejected. This makes the analyzer job tractable and gives the Reviewed badge a defensible meaning: "no shell, no network, files only."
- **Community tier:** can use arbitrary shell if the skill declares `capabilities.shell: true`. Runs through the full fuzz-tested analyzer (E-T1). Diff prompt requires typing full word `yes`. No Reviewed badge.
- **Reviewed** badge = slate-500 pill with check-in-circle glyph. `aria-label="Reviewed: maintainer audited this skill against a published checklist. Closed-grammar install only. Does not guarantee bug-free behavior."`
- Audit checklist published at `packages/registry/AUDIT.md`. Audit capacity capped at **2 hours/week**. Skills beyond cap sit in Community tier until slots open.
- Registry PR validator: schema check, SHA-40 regex (E-S1), archive oid verify, capability-declaration present, closed-grammar check (Reviewed-target), full static analyzer (Community-target arbitrary shell).
- Launch polish: screenshots for docs, OG images per skill (Playwright at merge per E-I3), dark mode, privacy page.
- Launch post draft.

## Open Decisions (resolve before Phase 1 or during)

1. **CLI name.** `skillz` is a placeholder. Decide before publishing to npm/homebrew.
2. **Install-counter privacy model.** Opt-in (chosen in design doc) — confirm and write the exact opt-in copy.
3. **`skill.yml` spec.** Minimum viable fields locked to: `schema_version: 1` (DX-1), `name`, `version`, `description`, `author`, `license` (DX-14, SPDX identifier), `targets: [claude-code]` (E1), `capabilities: { network: bool, filesystem: bool, shell: bool }` (E2), `files[]`, `install_commands[]`. Confirm before Phase 2.
4. **Reviewed-tier throughput.** RESOLVED per E4: checklist published, 2hrs/week cap, skills beyond cap sit in Community.
5. **Forbidden-command heuristics.** RESOLVED per E3: block `curl|sh` to non-allowlisted hosts, obfuscated bash (base64 pipes), writes outside `~/.claude/ | ~/.config/ | $PWD`; flag for human review: `eval`, `osascript`, `sudo`.
6. **Monorepo vs split repos.** Monorepo is assumed. Confirm before writing `package.json`.

## Definition of Done (v1)

- CLI published to npm and homebrew, works on macOS + Linux
- Gallery deployed to a production URL with a custom domain
- Registry has 10 curated skills, all `reviewed` tier and all using closed-grammar install_commands per F3
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

## Decision Audit Trail (auto-populated by /autoplan)

| # | Phase | Decision | Classification | Principle | Rationale | Rejected |
|---|-------|----------|----------------|-----------|-----------|----------|
| 1 | CEO (E1) | Add `targets: [claude-code]` to skill.yml | Mechanical | P1 (completeness) | Zero-cost hedge against cross-agent; avoids rebrand later | — |
| 2 | CEO (E2) | Add `capabilities` field to skill.yml | Mechanical | P1 (completeness) | Seeds runtime-enforced trust; author-declared, machine-readable | — |
| 3 | CEO (E3) | Static analyzer for install_commands | Mechanical | P1 (completeness) | Human diff review insufficient against obfuscation; automated backstop | — |
| 4 | CEO (E4) | Rename Verified → Reviewed + checklist + 2hr/wk cap | Mechanical | P5 (explicit over clever) | Describes process, not guarantee; removes legal exposure | Original "Verified" name + green badge |
| 5 | CEO (D) | Consider Approach D ("run-only beta") at Phase 4 gate | Taste | (surfaced) | User chose B in office-hours; both models lean A/D | Held for final gate |
| 6 | CEO (TC) | Trending counter deferred vote at Phase 4 gate | Taste | (surfaced) | Subagent says defer to v2; user weighed in office-hours | Held for final gate |
| 7 | Design (D1) | Three-panel CLI diff prompt + capability summary + decoded forms | Mechanical | P1 (completeness) | Risks section flagged y/N rubber-stamp as trust-collapse; specific design addresses it | — |
| 8 | Design (D2) | Home page hero: "Skill of the Week" with asciinema autoplay + giant CTA | Mechanical | P1 (completeness) | Subagent scored TTHW 3/10; hero is the showroom frame | Generic featured/trending grid |
| 9 | Design (D3) | Hide Trending tab until >100 installs; show "New this week" | Mechanical | P3 (pragmatic) | Low-data trending is noise; placeholder handles early-stage | — |
| 10 | Design (D4) | Mobile "Send to laptop" QR + short URL for install commands | Mechanical | P1 (completeness) | iOS Safari install-copy is broken by default; can't skip | — |
| 11 | Design (D5) | Sticky rail with badge/SHA/commands/capabilities on per-skill pages | Mechanical | P5 (explicit) | README-first hierarchy buries the install action | — |
| 12 | Design (D6) | Slate "Reviewed" pill + outlined "Community" pill; no shield iconography | Mechanical | P5 (explicit) | Specific color + glyph locks the visual language; "neutral" was underspecified | — |
| 13 | Design (D7) | ⌘K palette, focus rings, aria-labels, reduced-motion respect | Mechanical | P1 (completeness) | Accessibility baseline; non-negotiable for a polished product | — |
| 14 | Design (D8) | OG images = real terminal screenshots, not logo-on-gradient | Mechanical | P5 (explicit) | OG images are the tweet-embed; terminal output is on-brand | — |
| 15 | Design (TD-1) | Typography: Inter Display + JetBrains Mono (free) vs Söhne + Berkeley Mono (paid) | Taste | (surfaced) | Free tier ships, paid is a moat bet | Held for final gate |
| 16 | Design (TD-2) | Motion: slot-machine counter roll + card lift + icon morph | Taste | (surfaced) | Hard-to-copy polish layer vs user-annoyance risk | Held for final gate |
| 17 | Design (TD-3) | Sparkline per card | Taste | (conditional) | Only makes sense if trending counter ships in v1 | Held for final gate |
| 18 | Eng (E-S1) | SHA-40 regex + archive oid verify | Mechanical | P1 (completeness) | Blocks tag/branch sneaks; critical security control | Accepting tag or branch |
| 19 | Eng (E-S2) | Scrubbed exec env for install_commands | Mechanical | P1 (completeness) | Prevents token/credential exfil via skill | Inheriting user shell env |
| 20 | Eng (E-S3) | HMAC counter tokens + ip_hash rate-limit | Mechanical | P1 (completeness) | GDPR-clean + abuse-resistant counter | Plain POST with raw IP |
| 21 | Eng (E-I1) | Vercel edge-cached archive proxy | Mechanical | P3 (pragmatic) | GitHub 60/hr unauth rate-limit is install-breaking at launch | Direct GitHub raw |
| 22 | Eng (E-I3) | Playwright OG render at merge vs Satori | Mechanical | P5 (explicit) | D8 spec requires real terminal; Satori cannot render it | Satori/`@vercel/og` |
| 23 | Eng (E-D1-4) | Platform matrix + cosign + safe npm postinstall | Mechanical | P1 (completeness) | Signed releases + no curl-in-our-supply-chain | Implicit unsigned |
| 24 | Eng (E-T1-5) | Expanded test plan including fuzz + e2e-malicious | Mechanical | P1 (completeness) | Single security control needs fuzz; proof-of-defense needs e2e | Single integration test |
| 25 | Eng (E-E1) | ERRORS.md + single defer for tmp cleanup | Mechanical | P5 (explicit) | Error semantics must be specified, not implicit | Undocumented error paths |
| 26 | Eng (UC-1) | Capability UI vs enforcement | User Challenge | (surfaced) | Showing unenforced capabilities is false reassurance per both voices | Held for final gate |
| 27 | Eng (UC-2) | Closed-grammar install_commands vs shell-with-flag | User Challenge | (surfaced) | Security story is tractable with closed grammar; limits expressiveness | Held for final gate |
| 28 | DX (DX-1) | `schema_version: 1` in skill.yml | Mechanical | P1 (completeness) | Zero-cost upgrade hedge; not doing it is malpractice | No schema versioning |
| 29 | DX (DX-3,4) | CLI verb table + shell completions locked | Mechanical | P1 (completeness) | `--help` matrix is non-negotiable for a CLI developer tool | Undefined help surface |
| 30 | DX (DX-5) | Error message 4-line template (error/why/fix/more) | Mechanical | P5 (explicit) | Actionable errors are baseline DX; template enforces consistency | Free-form errors |
| 31 | DX (DX-6) | Escape-hatch flag set (--yes, --dry-run, --from-local, --no-cache, --json) | Mechanical | P1 (completeness) | Power users need escape hatches; CI needs `--yes` | No flags beyond defaults |
| 32 | DX (DX-9) | `npx launchpad run` as first-visitor zero-install entrypoint | Mechanical | P3 (pragmatic) | Matches design doc's `run`-as-primary; no `curl \| sh` needed | Homebrew-only first-run |
| 33 | DX (DX-10) | `skillz verify` cosign check command | Mechanical | P1 (completeness) | Trust must be verifiable not asserted; complements E-D2 | No verify path |
| 34 | DX (DX-11) | `/docs` path with 7 pages | Mechanical | P1 (completeness) | Baseline developer docs for a CLI + schema + gallery product | Per-package READMEs only |
| 35 | DX (DX-14) | Require `license` SPDX field in skill.yml | Mechanical | P1 (completeness) | No-license skills are a legal footgun for consumers | License optional |
| 36 | DX (UC-DX-1) | Producer CLI in v1 (init/validate/publish) | User Challenge | (surfaced) | Gallery has no flywheel without producer tooling; scope add | Held for final gate |
| 37 | DX (UC-DX-2) | Elevate UC-Eng-1 to BLOCKING Phase 1 start | User Challenge | (surfaced) | D1 diff-prompt spec is incoherent until capability UI decision is made | Held for final gate |
| 38 | DX (UC-DX-3) | `npx launchpad run` primary vs Homebrew primary | User Challenge | (surfaced) | Install primacy shapes home hero design and README framing | Held for final gate |

## DX Addendum (from Phase 3.5 DX review)

All 8 DX dimensions confirmed weak-to-critical. Consumer TTHW is 8–15 min (target 5). Producer TTFSP is hours-to-days (target 30 min). The plan spec'd a consumer CLI; the producer journey was an afterthought.

### Schema + upgrade (locked)
- **DX-1.** `schema_version: 1` in `skill.yml` from day one (zero-cost hedge against future schema changes).
- **DX-2.** `skillz` startup checks installed skills' `schema_version` vs supported range; prints migration hint on mismatch. `skillz migrate` shipped as stub, real in v1.1+.

### CLI verb table (locked in `packages/cli/HELP.md` before Phase 0 SPEC.md ends)
```
skillz                    palette/help + recent installs
skillz run <name|url>     primary verb
skillz install <name|url> secondary verb
skillz uninstall <name>
skillz info <name>
skillz search <term>      fuzzy-match local registry cache
skillz list               show installed skills
skillz update [<name>]    refresh skills to latest SHAs (with capability-diff re-prompt)
skillz doctor             env preflight (PATH, HOME perms, registry reachable)
skillz verify             cosign check on the CLI binary itself
skillz cache clear        nuke local registry cache
skillz completion <shell> emit shell completions for bash/zsh/fish
Flags: --help --version --json --quiet --no-color
       --yes (no-shell skills only)
       --yes --i-accept-risk (shell skills, deliberately verbose)
       --dry-run --from-local <path> --no-cache --target <dir>
```

### Error message template (locked)
Every CLI error prints exactly this shape:
```
error: <short one-line summary>
why:   <one sentence on cause>
fix:   <imperative next step>
more:  <url>
```
`packages/cli/ERRORS.md` ships with 3 worked examples (SHA mismatch, analyzer flag, install_command non-zero exit).

### Install primacy + first-visitor bootstrap (locked)
- **DX-7.** Homebrew = install for heavy users. `skillz --version` prints install source and warns on dual presence.
- **DX-9.** `npx launchpad run <name>` is the zero-install entrypoint for first-time visitors. Home-hero Copy button alternates between `npx launchpad run <name>` (default) and `skillz run <name>` (returner-detect via localStorage). This is the true "npx for skills" pattern — no `curl | sh`, works on any dev machine with Node already installed.

### Trust verification (locked)
- **DX-10.** `skillz verify` checks local binary against cosign-signed `SHASUMS256.txt`; prints pubkey fingerprint + release-notes URL. Trust story is verifiable, not just asserted.

### Documentation architecture (locked)
Gallery `/docs` path with:
1. **Build Your First Skill** — producer tutorial, 5-minute path from idea to submitted PR
2. **`skill.yml` Reference** — auto-generated from `schema.json`
3. **Registry Entry Reference** — authoritative schema doc
4. **Security Model** — "why `yes` is more than a y/N," the trust story explainer
5. **Troubleshooting** — mapped from ERRORS.md
6. **Migration Guide** — stub in v1; populated as schema evolves
7. **Privacy** — counter opt-in copy + what's stored (SHA-256 IP hashes only)

### Skill page UX refinements
- **DX-12.** Sticky rail adds a one-liner under the two commands: `run = try once · install = keep it in ~/.claude/skills/`
- **DX-13.** `skillz update <name>` with a new SHA that declares different capabilities shows a capability-diff and re-prompts. New consent required per capability change.

### Platform messaging
- **DX-16.** Install page explicitly states "Windows: WSL in v1, native binary on v2 roadmap." No ambiguity.

### DX Scorecard (baseline → target)

| Dimension | Baseline | With DX fixes | Target |
|---|---|---|---|
| TTHW consumer | 8–15 min | 3–5 min (via `npx launchpad run` one-shot) | <5 min ✓ |
| TTFSP producer | hrs–days | depends on UC-DX-1 decision (a→30min, b/c→hrs) | <30 min (if UC-DX-1 = (a) or (c)) |
| API/CLI ergonomics | 5/10 | 8/10 | 8+ |
| Error messages actionable | 3/10 | 8/10 | 8+ |
| Docs findable & complete | 3/10 | 8/10 | 8+ |
| Upgrade path safe | 1/10 | 7/10 (schema_version + stub migrate) | 7+ |
| Install friction | 4/10 | 8/10 (npx + brew + verify) | 8+ |
| Escape hatches | 5/10 | 9/10 | 8+ |

### DX Implementation Checklist

- [ ] `skill.yml` schema finalized with `schema_version: 1` + `license` (before Phase 1)
- [ ] `packages/cli/HELP.md` verb table written (before Phase 0 SPEC.md)
- [ ] `ERRORS.md` template + 3 examples (Phase 1)
- [ ] `npx launchpad run <name>` wire-up (Phase 1)
- [ ] `skillz verify` command (Phase 5)
- [ ] `skillz doctor` command (Phase 1)
- [ ] `skillz search` + `skillz list` + `skillz info` (Phase 2)
- [ ] `skillz update` with capability-diff re-prompt (Phase 2)
- [ ] Shell completions (Phase 5)
- [ ] `/docs` built on the gallery (Phase 3)
- [ ] Privacy page (Phase 4)
- [ ] Platform/install page with Windows messaging (Phase 3)

## Eng Addendum (from Phase 3 eng review)

All 6 eng dimensions (architecture, tests, performance, security, error paths, deployment) were confirmed weak by both voices. Criticals were in security. Mechanical fixes applied below; 2 user challenges held for Phase 4 gate.

### Dependency graph (new)

```
┌──────────┐     HTTPS + ETag    ┌──────────────────────┐
│   CLI    │ ───────────────────►│  registry.json       │
│ (Bun TS) │                     │  (GitHub raw +       │
└────┬─────┘                     │   Vercel edge cache) │
     │                           └──────────────────────┘
     │     git archive @SHA via proxy
     │     (Vercel edge cache keyed by SHA, immutable)
     ▼
┌──────────────────┐  verify oid match   ┌──────────────┐
│  Archive proxy   │ ───────────────────►│ Skill repo   │
│ (Vercel Edge Fn) │                     │ (GitHub)     │
└──────────────────┘                     └──────────────┘
     │
     ▼ extract to /tmp/<rand>
┌──────────────────┐
│  skill.yml parse │ ── fail ──► exit 2, cleanup tmp
└────────┬─────────┘
         ▼
┌──────────────────┐
│  3-panel diff UI │ ── user aborts ──► exit 0, cleanup tmp
└────────┬─────────┘
         │  user types `yes` (or `y` if no shell/flags)
         ▼
┌────────────────────────────────┐
│ exec install_commands          │
│ env -i PATH=/usr/bin:/bin      │
│ HOME=$HOME, no tokens          │
└────────┬───────────────────────┘
         │  success → optional counter ping
         ▼
┌──────────────────┐   HMAC token    ┌──────────────────────┐
│  counter.ts      │ ───────────────►│ POST /api/count      │
│  (opt-in only)   │                 │ Vercel Fn + KV       │
└──────────────────┘                 │ rate-limit(ip_hash,  │
                                     │            name)     │
                                     └──────────┬───────────┘
                                                │
                                                ▼ ISR revalidate
                                     ┌──────────────────────┐
                                     │ Gallery (Next.js 15) │
                                     │ tag-based revalidate │
                                     │ per skill            │
                                     └──────────────────────┘
```

### Security (locked, critical-grade)

- **E-S1.** Registry validator requires `sha` matching `^[0-9a-f]{40}$`. Fetch verifies archive top-level commit oid equals declared SHA (reject any mismatch).
- **E-S2.** `install_commands` exec with `env -i PATH=/usr/bin:/bin HOME=$HOME` only. No `$GITHUB_TOKEN`, no cloud creds, no ssh-agent.
- **E-S3.** Counter endpoint: HMAC-signed token (derived from archive SHA + install nonce). Rate-limit keyed on `(sha256(ip), name)` sliding window (60/hr). Cap per-name-per-hour delta. IPs stored as SHA-256 only. Opt-in UX preserved.

### Tests (see detailed test plan in `~/.gstack/projects/launchpad/nolan-main-test-plan-20260417-115500.md`)

Blockers for each phase:
- **Phase 1:** SHA verification unit test, scrubbed-env integration test, e2e hello-world
- **Phase 2:** analyzer fuzz suite, SHA-format enforcement test, capability-presence test
- **Phase 3:** visual regression for all D3 states, mobile e2e on real device
- **Phase 4:** counter idempotency + abuse-vector tests
- **Phase 5:** e2e-malicious.spec.ts (proves security net catches a real payload)

Coverage targets: 80% on CLI, 60% on gallery, 100% branch on `registry/src/analyzer.ts`.

### Infrastructure (locked)

- **E-I1.** Vercel edge-cached proxy for `git archive` (SHA is immutable → cache forever). GitHub raw is fallback.
- **E-I2.** ISR uses tag-based revalidation per skill, not full rebuild.
- **E-I3.** OG images rendered via Playwright in a GitHub Action at registry-merge time, committed as static assets. `@vercel/og`/Satori cannot produce terminal-output images as specified in D8.
- **E-I4.** "Send to laptop" uses stateless signed URL: `launchpad.dev/i?s=<name>&c=<sha-prefix>&sig=<hmac>`. No KV.
- **E-I5.** Registry cache uses GitHub ETag / If-None-Match for revalidation. Takedowns propagate immediately.

### Deployment (locked)

- **E-D1.** Binaries: macOS arm64 + x64, Linux arm64 + x64. Windows documented via WSL. No native Windows binary in v1.
- **E-D2.** `SHASUMS256.txt` signed with sigstore/cosign. Public key published in README and release notes.
- **E-D3.** npm package ships the binary; `postinstall` copies it — never fetches at install time. Our supply chain does not `curl | sh`.
- **E-D4.** Homebrew tap: ownership + maintainer listed in `TAP.md`. Deputy workflow documented.

### Errors (new artifact)

- **E-E1.** Write `packages/cli/ERRORS.md` specifying exit code + cleanup for each failure mode. Single `defer`-style wrapper on the whole exec flow ensures SIGINT paths are tmp-clean.

### Reviewer-tier deputization

- **E-R1.** `packages/registry/AUDIT.md` includes "How to become a second reviewer" — onboarding is a PR, not governance.

### Eng Failure-Modes Registry

| Failure | Severity | Mitigation | Test covers it? |
|---|---|---|---|
| GitHub raw rate-limit at install | High | E-I1 edge proxy | Yes (integration) |
| Malicious `install_commands` obfuscated past regex | Critical | E-T1 fuzz suite + UC-Eng-2 decision | Yes (fuzz + e2e-malicious) |
| Tag/branch passed as `sha` | Critical | E-S1 regex + oid verify | Yes (unit + registry) |
| SIGINT mid-install leaks tmp | Medium | E-E1 single defer | Yes (integration) |
| Counter endpoint spam / inflation | High | E-S3 HMAC + (ip_hash,name) rate-limit | Yes (abuse test) |
| Registry entry `skill.yml` invalid | Medium | Per-entry validator; bad entry rejected at PR, not at runtime | Yes (fixtures) |
| Capability UI gives false reassurance | Critical | **UC-Eng-1 decision at Phase 4 gate** | Pending |
| Vercel KV outage breaks trending | Low | Fail-open on counter; trending reads last-known | Partial |
| Skill `install_commands` writes outside allowed dirs | High | Analyzer blocks; runtime may catch too (future) | Yes (fuzz) |
| OG image render fails in CI | Low | Skip + use default template | Yes (smoke) |

### Completion Summary (Eng)

| Item | Status |
|---|---|
| Scope challenge (read code, mapped reuse) | ✓ no code yet; plan maps to existing infra appropriately |
| Architecture diagram | ✓ above |
| Dual voices | ✓ subagent-only (codex unavailable) |
| Test diagram / matrix | ✓ written to test-plan artifact |
| Test plan artifact on disk | ✓ `~/.gstack/projects/launchpad/nolan-main-test-plan-20260417-115500.md` |
| Failure modes registry | ✓ above |
| NOT in scope | ✓ unchanged from CEO phase |
| Completion Summary | ✓ this table |
| User challenges surfaced | ✓ UC-Eng-1 and UC-Eng-2 held for Phase 4 gate |

## Design Addendum (from Phase 2 design review)

The Phase 3 Gallery and Phase 1 CLI diff prompt both ship against the following design spec. Both voices (primary + subagent) agreed all 7 dimensions were weak in the original plan. Auto-decided items are locked; taste items are held for the Phase 4 gate.

### D1. Diff-prompt (CLI) — the two-panel design (revised per F2)

Per F2 (user challenge UC-Eng-1 resolved to option (a)), the capability panel is DROPPED from the diff prompt. Shipping author-declared capabilities without runtime enforcement is false reassurance. The capabilities field stays in `skill.yml` for future enforcement work, but the prompt UI shows only what the runtime actually controls: the commands and the files.

```
┌───────────────────────────────────────────────────┐
│  Skill: awesome-refactor  (Reviewed · v0.3.1)     │
├───────────────────────────────────────────────────┤
│  INSTALL COMMANDS (exec with env -i PATH=...):    │
│    1. mkdir -p ~/.claude/skills/awesome-refactor  │
│    2. chmod +x bin/setup.sh                       │
│       ↳ decoded from: (no encoding detected)      │
├───────────────────────────────────────────────────┤
│  FILES TO WRITE: 4 files (12KB total)             │
│    + SKILL.md                    4.2KB            │
│    + bin/setup.sh                1.1KB            │
│    + templates/refactor.md       5.6KB            │
│    + templates/tests.md          1.4KB            │
└───────────────────────────────────────────────────┘
Type `yes` to proceed, or any other key to abort: _
```

- Reviewed-tier skills (closed-grammar only per F3): accept `y` or `yes`.
- Community-tier skills with `capabilities.shell: true`: require typing full word `yes`.
- Any base64-decoded or `$(…)`-expanded form appears beside the raw line with `↳ decoded from:` annotation.
- Gallery pages MAY show author-declared capabilities as informational chips, but must label them clearly: "Author-declared. Not enforced at runtime in v1."

### D2. Home page — hero above featured/new-this-week (revised per F5)
- Above the fold: single "Skill of the Week" card at ~60% viewport height on desktop. Author byline, one-line description, asciinema-style autoplay loop showing the skill actually running (4–6 sec, loops silently), oversized "Copy run command" button → **copies `npx launchpad run <short-name>` to clipboard** (per F5 — zero-install is the hero story). Copied-toast reveals the exact line and a secondary "Heavy user? Install via Homebrew →" link.
- Below the fold: Featured (hand-curated, max 6) + "New this week" (last added; Trending tab does not exist in v1 per F1) + category filter chips.

### D3. Interaction states
- Trending tab hidden until total registry installs >100. "New this week" fills the slot.
- Empty category filter: curated fallback rail ("Try these instead") with 3 hand-picked unrelated-tag skills.
- Loading: per-card skeleton (not full-page spinner). Error: inline reload button + link to status page.
- Empty registry (if ever): static gallery showing what skill pages look like, with a "Submit the first skill" CTA.

### D4. Mobile
- On iOS/Android per-skill page: "Copy install command" is replaced with "Send to laptop" button that opens a share sheet AND shows a short URL (`launchpad.dev/i/<short-id>`) + QR code. The short-URL page on the laptop contains the install command, copy button, and source link.
- Command blocks use `word-break: break-all` + `font-variant-ligatures: none` so long commands don't overflow or mis-paste.
- All primary actions are in the top 80vh on mobile (no scrolling required to reach the install CTA).

### D5. Per-skill page layout
- Desktop: 2-column. Left (main column, 66%): rendered README, live `skillz run` transcript. Right (sticky rail, 33%): tier badge, SHA (monospace, click-to-copy), `skillz run` command, `skillz install` command, capability chips (🌐 network, 📁 filesystem, ⚙️ shell), "View source on GitHub" link.
- Mobile: sticky top bar with the same rail content condensed; README below.

### D6. Tier badges
- **Reviewed:** filled slate-500 (`#64748B`-family) pill with a check-in-circle glyph. 12px text, 500 weight. `aria-label="Reviewed: maintainer audited this skill against a published checklist. Does not guarantee bug-free behavior."`
- **Community:** outlined pill (no fill, slate-400 border) with a PR-branch glyph. Same text/weight. `aria-label="Community tier: PR-accepted, diff always shown before install."`
- No shield iconography anywhere (avoids implying security certification).

### D7. Accessibility (baseline)
- `⌘K` opens a global search palette (fuzzy match on skill name, tags, description).
- All interactive elements: 2px offset focus rings in the accent color.
- Every tier badge and icon-only button has an `aria-label`.
- `prefers-reduced-motion: reduce` disables the counter-roll animation and card-hover lifts.
- Min contrast ratio 4.5:1 for body text, 3:1 for large text and UI chrome. Dark mode ships day one.

### D8. OG images
- Per-skill auto-generated OG images show a terminal screenshot of `skillz run <name>` output with syntax highlighting (use a real Chromium headless render of a styled HTML template). Not logo-on-gradient.

### D-held (taste decisions — surfaced at Phase 4 gate)
- **TD-Design-1 (typography):** Inter Display (free) + JetBrains Mono default. Or upgrade to Söhne (paid, ~$$$) + Berkeley Mono for a signature tell. Recommendation: ship Inter Display + JetBrains Mono for v1; reconsider if launch gets traction.
- **TD-Design-2 (motion):** slot-machine counter roll (80ms), card-hover lift (2px / 150ms ease-out), copy icon morph (200ms cross-fade). Respected by `prefers-reduced-motion`. Recommendation: ship all three — they're the "hard to copy in a weekend" layer.
- **TD-Design-3 (sparkline per card):** 7-day install sparkline on each gallery card. Only makes sense if trending counter ships in v1 (held at Phase 4 gate). If counter is deferred, sparkline also deferred.

## CEO Review — Completion Summary

| Item | Status |
|---|---|
| Step 0 (premise, code leverage, dream state, alternatives) | ✓ complete |
| Dual voices (subagent only, codex unavailable) | ✓ complete, `[subagent-only]` tag |
| Review sections 1-10 (condensed, pre-code) | ✓ complete, no new issues beyond Step 0 findings |
| NOT in scope | ✓ confirmed: cross-agent adapters, skill editor UI, payments, accounts, comments, skill versioning beyond SHA, private registries, trending counter (v1), sparklines (v1) |
| Dream state delta | ✓ plan moves toward ideal with E1/E2 accepted; would move away without them |
| Premise gate | ✓ user accepted E1 + E2/E3 + E4 |
| CEO plan written | ✓ `~/.gstack/projects/launchpad/ceo-plans/2026-04-17-launchpad-v1.md` |

## GSTACK REVIEW REPORT

| Review | Trigger | Runs | Status | Findings |
|---|---|---|---|---|
| CEO Review | `/autoplan` Phase 1 | 1 | issues_open → resolved at gate | 7 (subagent); 4 accepted mechanical (E1–E4), 2 deferred as user challenges now resolved (UC-CEO-D, UC-CEO-TC) |
| Design Review | `/autoplan` Phase 2 | 1 | issues_open → resolved at gate | 11 (subagent); 8 mechanical accepted (D1–D8); 3 taste decisions (TD-Design-1/2/3) all resolved |
| Eng Review | `/autoplan` Phase 3 | 1 | issues_open → resolved at gate | 14 (subagent); 15 mechanical accepted (E-S1..E-R1); 2 user challenges (UC-Eng-1, UC-Eng-2) resolved at gate |
| DX Review | `/autoplan` Phase 3.5 | 1 | issues_open → resolved at gate | 19 (subagent); 16 mechanical accepted (DX-1..DX-16); 3 user challenges (UC-DX-1/2/3) resolved at gate |
| Dual voices (all 4) | per phase | 4 | `[subagent-only]` (codex unavailable) | Consensus across 25 of 26 dimensions; 1 dimension (design DISAGREE=0) |

**VERDICT:** APPROVED with final locked scope per the "Locked Scope (v1 final)" table near the top of this file. 38 decisions logged in Decision Audit Trail. 0 open items. All user challenges resolved. Plan is implementation-ready.

**Next skills:**
- If you want to start: `/ship` handles the first PR workflow (it'll scaffold packages, wire CI, etc.).
- If you want to pause and resume later: the plan is frozen in git. Branch + checkpoint as needed.
- The design doc, CEO plan, test plan, and review log are persisted in `~/.gstack/projects/` and will be re-loaded on any future review run.

