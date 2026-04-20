# Shipping Launchpad — one-time deploy runbook

This is the concrete list of commands + configuration changes that take the
repo from "CI green on main" to "installable + verifiable v0.1.0 release with
a live gallery + a live edge proxy."

Each step lists the exact command to run, the identity/auth needed, and
what success looks like.

## Prerequisites (already in place)

- ✅ GitHub repo: https://github.com/nolanwang-uk/launchpad
- ✅ CI green on `main` (`ci.yml` — typecheck + 235 tests + CLI smoke)
- ✅ Five path-scoped workflows wired: `ci`, `registry-validate`,
  `cli-release`, `og-render`, (no standalone proxy workflow — it auto-deploys
  with the Vercel project)

## Step 1 — Vercel: deploy the edge proxy

```bash
cd packages/proxy
npx vercel@latest login          # interactive; OAuth in browser
npx vercel@latest link --yes     # creates the Vercel project
npx vercel@latest deploy --prod  # first deploy to production
```

What success looks like: a `*.vercel.app` URL that responds to
`curl -I https://<url>/api/archive/launchpad-skills/hello-world/<a-real-sha>`
with `200 OK` + `Cache-Control: public, max-age=31536000, immutable`.

Once the domain is live, point `launchpad.dev/api/archive/*` at it (via
a Vercel domain + rewrite, or a downstream CDN). The CLI defaults to
`https://launchpad.dev/api/archive`; until that domain is pointed, users
can set `SKILLZ_ARCHIVE_BASE` to the `*.vercel.app` URL explicitly.

## Step 2 — Vercel: deploy the gallery

```bash
cd packages/gallery
npx vercel@latest link --yes     # links a second project under the same account
npx vercel@latest deploy --prod
```

`packages/gallery/vercel.json` already specifies:
- framework: `nextjs`
- installCommand: `cd ../.. && bun install --frozen-lockfile`
- buildCommand: `bun run build`
- outputDirectory: `.next`

Vercel auto-detects the monorepo root from the `.vercel` folder that
`link` creates. If it complains about `Root Directory`, set it to
`packages/gallery` in the Vercel dashboard and redeploy.

Point `launchpad.dev` (apex) at this project's domain.

## Step 3 — npm: reserve the package name

```bash
cd packages/npm
npm login                        # interactive
# Confirm the name is free:
npm view launchpad 2>&1 | head -3
# If free, reserve it by publishing a placeholder (or wait for the release
# workflow to publish the first real version). Either way:
npm publish --access public --dry-run   # sanity check, no publish
```

The first real publish will happen automatically when `cli-release.yml`
runs on the `skillz-v*` tag. That requires setting:

```bash
gh secret set NPM_TOKEN --repo nolanwang-uk/launchpad < <(echo "$NPM_TOKEN")
```

Generate the token at https://www.npmjs.com/settings/<user>/tokens
(type: **Automation**, scope: **Publish**).

## Step 4 — Homebrew tap repo

```bash
gh repo create nolanwang-uk/homebrew-tap --public \
  --description "Homebrew tap for launchpad (skillz CLI)."
# Seed it with the formula:
mkdir -p /tmp/tap/Formula
cp packages/homebrew/Formula/skillz.rb /tmp/tap/Formula/
cp packages/homebrew/TAP.md /tmp/tap/README.md
cd /tmp/tap
git init -b main
git add .
git commit -m "chore: initial tap (placeholder formula — first real release bumps it)"
git remote add origin https://github.com/nolanwang-uk/homebrew-tap.git
git push -u origin main
```

Then generate a deploy key + set the secret so `cli-release.yml` can push
updated formulas back to the tap:

```bash
ssh-keygen -t ed25519 -N "" -f /tmp/tap-deploy-key -C launchpad-release-bot
gh repo deploy-key add /tmp/tap-deploy-key.pub \
  --repo nolanwang-uk/homebrew-tap \
  --title "launchpad-release-bot" \
  --allow-write
gh secret set TAP_DEPLOY_KEY --repo nolanwang-uk/launchpad < /tmp/tap-deploy-key
rm /tmp/tap-deploy-key*
```

## Step 5 — OG-render commit token (optional but recommended)

The `og-render.yml` workflow's `commit` job uses `${{ secrets.OG_COMMIT_TOKEN }}`
to push back to `main` (bypasses protected-branch checks if you enable them).
Falls back to `github.token` if the secret isn't set — which works today but
will need the secret the moment you protect `main`.

```bash
# Generate a fine-grained PAT scoped to this one repo with contents:write.
# https://github.com/settings/personal-access-tokens/new
gh secret set OG_COMMIT_TOKEN --repo nolanwang-uk/launchpad
```

## Step 6 — Cut the first release

```bash
# Pick the first public tag. For a -dev tag, the release workflow
# builds + signs but does NOT publish to npm or bump the tap (nice dry-run):
git tag skillz-v0.1.0-dev.0
git push origin skillz-v0.1.0-dev.0

# When the dry-run looks good, cut the real one:
git tag skillz-v0.1.0
git push origin skillz-v0.1.0
```

Watch the workflow run:

```bash
gh run watch --repo nolanwang-uk/launchpad
```

On success:
- GitHub Release created with 4 binaries + SHASUMS256.txt + .sig + .bundle
- npm package `launchpad` published with the vendored binaries
- `launchpad-skills/homebrew-tap`'s `Formula/skillz.rb` updated with the
  release URLs + sha256 values

## Step 7 — End-to-end verify

On a clean machine (or `rm -rf ~/.cache/launchpad` first):

```bash
# Zero install path:
npx launchpad@latest run hello-world --dry-run

# Heavy-user path:
brew install nolanwang-uk/tap/skillz
skillz verify          # confirms binary sha256 + cosign signature
skillz doctor
skillz run hello-world --dry-run
```

If any step fails, check:
- `skillz verify` mismatch → SHASUMS file served by GitHub doesn't match
  what cosign signed. Usually means the release asset upload was partial.
- cosign signature failure → GitHub OIDC identity on the signed bundle
  didn't match `^https://github.com/launchpad-skills/launchpad/.*`
  (reminder: we've been publishing under `nolanwang-uk/launchpad`, not
  `launchpad-skills/launchpad`, so the identity pattern in `skillz verify`
  needs to be updated before the first public release — see Step 0 below).

## Step 0 — Pre-release: reconcile the identity-pattern assumption

`packages/cli/src/commands/verify.ts` and `.github/workflows/cli-release.yml`
both assume the repo lives at `launchpad-skills/launchpad`. For the one-off
release under `nolanwang-uk`, either:

1. Transfer the repo to a `launchpad-skills` org first (`gh repo transfer`),
   then re-verify CI green before tagging, OR
2. Do a find-and-replace: `launchpad-skills/launchpad → nolanwang-uk/launchpad`
   in `verify.ts` (default error URL + cosign identity regex) and in
   `cli-release.yml` (release-notes URL + self-verify identity). Commit,
   push, wait for CI green, then tag.

Option 1 is cleaner but requires owning the `launchpad-skills` org.
Option 2 ships under the current identity. Either works — just pick
before tagging so the signature identity matches reality.

## Known gaps this runbook does not cover

- **Custom domains**: `launchpad.dev` isn't registered here. Point both
  the gallery and proxy at it via Vercel's domain settings once acquired.
- **Seed skills**: only `hello-world` is in `registry.json` today with
  a placeholder SHA. Before launch, replace with 10 real skills with
  real SHAs per the design doc's success criteria.
- **First Reviewed audit**: 2hrs/week capacity per `packages/registry/AUDIT.md`
  — formally adopt the checklist by writing AUDIT.md (currently referenced
  but not written — a Phase 5 item).
- **`security@launchpad.dev` mailbox**: referenced in the security docs
  and the privacy page. Needs a real inbox before those docs go live.
