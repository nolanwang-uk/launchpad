# Supabase setup

This doc is the manual half of the Vercel ↔ Supabase integration. The
code half ships in `lib/supabase/`, `lib/db/`, `app/api/inquiry/`,
`app/api/application/`, and `middleware.ts`. When the env vars below
are set, the engage + submit forms POST to Supabase and email editorial
via Resend. When the env vars are absent the forms fall back to the
mailto flow, so `bun dev` keeps working with zero setup.

## One-time setup (6 clicks, ~5 minutes)

### 1. Install the Supabase integration on Vercel

1. Open `https://vercel.com/integrations/supabase` and click **Add
   Integration**.
2. Pick your Vercel account, scope to the `launchpad` project (or
   wherever the gallery deploy lives), click **Install**.
3. On the "Create a Supabase project" step, pick the free Hobby
   tier and a region near your Vercel deploy region. Name it
   `launchpad`. Hit **Create**.
4. When the integration UI says "Environment variables connected",
   the following env vars will have been injected into the Vercel
   project's Production environment automatically:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `POSTGRES_URL` (and a few siblings — `POSTGRES_PRISMA_URL`,
     `POSTGRES_URL_NON_POOLING`, `SUPABASE_JWT_SECRET`, etc.)

### 2. Run the schema migration

1. In the Vercel → Storage view, click the `launchpad` Supabase
   row → **Open in Supabase**. That sends you to the Supabase
   dashboard for this project.
2. In Supabase: left nav → **SQL Editor** → **+ New query**.
3. Open `packages/gallery/db/migrations/001_initial.sql` in this
   repo, copy the whole file, paste into the editor, click **Run**.
4. You should see "Success. No rows returned" at the bottom. All
   eight tables (`profiles`, `submissions`, `reviews`,
   `engagements`, `ledger`, `saved`, `inquiries`, `applications`)
   are now created with RLS enabled.

### 3. Add Resend for transactional email (optional but recommended)

The inquiry + application routes fire a notification email to
`editorial@launchpad.dev` (or wherever `NEXT_PUBLIC_EDITORIAL_EMAIL`
points). This is a convenience — the DB row is the source of truth —
but without it you'll need to poll the Supabase `inquiries` and
`applications` tables manually.

1. Go to `https://resend.com/signup`, sign up with the same email
   you want to receive editorial notifications at.
2. Resend → **API Keys** → **Create API Key** → give it full access,
   copy the `re_...` key.
3. Resend → **Domains** → **Add Domain** → enter the domain you'll
   send from (e.g., `launchpad.dev`). Resend gives you 3 DNS records
   (SPF, DKIM, DMARC) — add them wherever `launchpad.dev` DNS lives.
4. In Vercel → your project → **Settings** → **Environment
   Variables** → add these two for Production:
   - `RESEND_API_KEY` = the `re_...` key from step 2
   - `RESEND_FROM` = `editorial@launchpad.dev` (must match your
     verified Resend domain)

If Resend isn't configured, the routes still work — they just
skip the email send silently. Editorial can still see submissions by
querying the `inquiries` and `applications` tables in Supabase
directly.

### 4. Redeploy (or let the next push trigger it)

The Supabase integration sets env vars on the Production
environment. Redeploy once so Next.js picks them up:

```bash
cd packages/gallery
vercel --prod         # or just git push — auto-deploy runs the same build
```

### 5. Pull env vars locally for dev

```bash
cd packages/gallery
vercel env pull .env.local
```

This gives `bun dev` access to the same Supabase project as
production. If you don't want that, stop here — dev without
`.env.local` transparently falls back to mailto + localStorage.

### 6. Smoke-test end to end

1. Visit `/engage/sec-10k-reviewer` on the live site, fill the form,
   hit "Send to editorial".
2. In Supabase → **Table Editor** → `inquiries`, you should see the
   row appear within a second.
3. Check the `editorial@launchpad.dev` inbox for the notification
   email. (If Resend isn't set up yet, skip this step.)
4. Same drill for `/submit` → `applications` table.

---

## What to check if something breaks

| Symptom | Likely cause |
|---|---|
| Form shows "Couldn't submit" | Check Supabase SQL log in the dashboard — RLS policy might be denying the insert. |
| Form falls back to mailto on live deploy | `SUPABASE_SERVICE_ROLE_KEY` is missing on Vercel env — the API route can't authenticate to insert. |
| 500 from `/api/inquiry` | Check Vercel → Logs for the specific error. Usually a schema mismatch or missing column. |
| Email not arriving | Resend domain not verified, or `RESEND_FROM` doesn't match the verified domain. |

## What's still not wired

The dashboard UI (at `/dashboard/*`) still reads from `localStorage`
via the existing mock in `lib/auth/storage.ts`. The Supabase schema
is ready for those tables but the migration of the client code is a
focused next session. Scope reminder:

- `profiles`, `submissions`, `reviews`, `engagements`, `ledger`,
  `saved` — all have tables in Supabase. Waiting on a future session
  to rewrite `lib/auth/context.tsx` + `lib/auth/storage.ts` as
  async Supabase-backed functions.
- `inquiries`, `applications` — live now. The forms write to
  Supabase + send Resend email.

When you're ready to migrate the dashboard, the existing
`lib/auth/storage.ts` signatures map one-for-one to the schema;
every function becomes `async` and the callsites each gain an `await`.
Expect roughly 4–6 hours of mechanical work in a focused session.
