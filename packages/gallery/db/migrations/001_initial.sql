-- Launchpad schema v1. Maps one-for-one to lib/auth/types.ts so the
-- storage adapter can swap from localStorage to Supabase with the
-- function signatures unchanged. Every table protected by RLS;
-- readers can only see their own rows, practitioners can only see
-- engagements where they're the practitioner, and editorial runs
-- under the service_role key server-side.

-- ---------- profiles (extends auth.users) ----------
-- One row per Supabase auth user. `slug` is the public /p/<slug>
-- handle. Non-auth fields (bio, credential, role, credits) live
-- here so RLS can gate who reads/edits them.

create table if not exists public.profiles (
  id uuid primary key references auth.users on delete cascade,
  email text not null unique,
  display_name text not null,
  slug text not null unique check (slug ~ '^[a-z0-9][a-z0-9-]{0,63}$'),
  role text not null check (role in ('reader','practitioner','both')) default 'reader',
  credential text,
  bio text,
  credits_balance_cents integer not null default 0,
  email_prefs jsonb not null default jsonb_build_object(
    'engagement_requests', true,
    'review_published', true,
    'weekly_digest', true,
    'product_updates', false
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists profiles_slug_idx on public.profiles (slug);

-- Trigger: when a new auth.users row is created, seed profiles.
-- display_name + slug defaulted off the email local-part; the client
-- calls updateProfile() right after register to set the real value.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  fallback_slug text;
begin
  fallback_slug := regexp_replace(lower(split_part(new.email, '@', 1)), '[^a-z0-9]+', '-', 'g');
  if fallback_slug = '' then fallback_slug := 'user'; end if;
  -- If the slug is taken, append the first 8 chars of the uuid.
  if exists (select 1 from public.profiles where slug = fallback_slug) then
    fallback_slug := fallback_slug || '-' || left(new.id::text, 8);
  end if;
  insert into public.profiles (id, email, display_name, slug, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    fallback_slug,
    coalesce(new.raw_user_meta_data->>'role', 'reader')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Updated-at trigger for every table that has it.
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists profiles_touch_updated_at on public.profiles;
create trigger profiles_touch_updated_at before update on public.profiles
  for each row execute function public.touch_updated_at();

-- ---------- submissions (practitioner sends a skill to editorial) ----------
create table if not exists public.submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles on delete cascade,
  skill_name text not null check (skill_name ~ '^[a-z0-9][a-z0-9-]{0,63}$'),
  domain text not null,
  description text not null check (char_length(description) between 1 and 2000),
  status text not null check (status in ('draft','under_review','changes_requested','published','rejected')) default 'draft',
  editorial_note text,
  published_as text,
  submitted_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists submissions_user_idx on public.submissions (user_id);
create index if not exists submissions_status_idx on public.submissions (status);

drop trigger if exists submissions_touch_updated_at on public.submissions;
create trigger submissions_touch_updated_at before update on public.submissions
  for each row execute function public.touch_updated_at();

-- ---------- reviews (reader notes) ----------
create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  reviewer_user_id uuid not null references public.profiles on delete cascade,
  skill_name text not null,
  rating numeric(2,1) not null check (rating between 0 and 5 and (rating * 2) = round(rating * 2)),
  body text not null check (char_length(body) between 1 and 600),
  status text not null check (status in ('draft','pending','published','rejected')) default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists reviews_reviewer_idx on public.reviews (reviewer_user_id);
create index if not exists reviews_skill_idx on public.reviews (skill_name);

drop trigger if exists reviews_touch_updated_at on public.reviews;
create trigger reviews_touch_updated_at before update on public.reviews
  for each row execute function public.touch_updated_at();

-- ---------- engagements (buyer ↔ practitioner deals) ----------
create table if not exists public.engagements (
  id uuid primary key default gen_random_uuid(),
  practitioner_user_id uuid not null references public.profiles on delete cascade,
  -- Buyer is optional — v1 inquiries come from mailto; we'll attach
  -- a buyer_user_id once inquiry flow moves into an authenticated API.
  buyer_user_id uuid references public.profiles on delete set null,
  skill_name text,
  buyer_display text not null,
  buyer_context text not null,
  amount_cents integer not null default 0 check (amount_cents >= 0),
  status text not null check (status in ('requested','quoted','in_progress','delivered','paid','cancelled')) default 'requested',
  requested_at timestamptz not null default now(),
  delivered_at timestamptz,
  paid_at timestamptz,
  updated_at timestamptz not null default now()
);

create index if not exists engagements_practitioner_idx on public.engagements (practitioner_user_id);
create index if not exists engagements_buyer_idx on public.engagements (buyer_user_id);
create index if not exists engagements_status_idx on public.engagements (status);

drop trigger if exists engagements_touch_updated_at on public.engagements;
create trigger engagements_touch_updated_at before update on public.engagements
  for each row execute function public.touch_updated_at();

-- ---------- ledger (credit events) ----------
create table if not exists public.ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles on delete cascade,
  kind text not null check (kind in ('purchase','spend','earn_engagement','earn_skill_sale','editorial_grant','refund')),
  amount_cents integer not null,
  memo text not null check (char_length(memo) between 1 and 400),
  at timestamptz not null default now(),
  ref text
);

create index if not exists ledger_user_at_idx on public.ledger (user_id, at desc);

-- ---------- saved (favorites per user) ----------
create table if not exists public.saved (
  user_id uuid not null references public.profiles on delete cascade,
  skill_name text not null,
  saved_at timestamptz not null default now(),
  primary key (user_id, skill_name)
);

-- ---------- inquiries (from /engage form — not tied to auth in v1) ----------
-- Anonymous-friendly inquiry queue for editorial. Any authenticated
-- or anonymous user can insert via the inquiry API route; reads
-- require service_role.
create table if not exists public.inquiries (
  id uuid primary key default gen_random_uuid(),
  target_kind text not null check (target_kind in ('skill','practitioner')),
  target_slug text not null,
  buyer_name text not null check (char_length(buyer_name) between 1 and 160),
  buyer_email text not null check (char_length(buyer_email) between 3 and 160),
  buyer_company text,
  buyer_role text,
  timeline text,
  brief text not null check (char_length(brief) between 10 and 4000),
  source text,
  created_at timestamptz not null default now()
);

create index if not exists inquiries_created_idx on public.inquiries (created_at desc);

-- ---------- applications (from /submit form) ----------
create table if not exists public.applications (
  id uuid primary key default gen_random_uuid(),
  applicant_name text not null check (char_length(applicant_name) between 1 and 160),
  credential text not null check (char_length(credential) between 1 and 300),
  domain text not null,
  years_practice text,
  verification_ref text not null check (char_length(verification_ref) between 1 and 2000),
  proposed_skill text not null check (char_length(proposed_skill) between 10 and 4000),
  links text,
  created_at timestamptz not null default now()
);

-- ================== Row Level Security ==================
alter table public.profiles enable row level security;
alter table public.submissions enable row level security;
alter table public.reviews enable row level security;
alter table public.engagements enable row level security;
alter table public.ledger enable row level security;
alter table public.saved enable row level security;
alter table public.inquiries enable row level security;
alter table public.applications enable row level security;

-- profiles: everyone can read (public byline is public), owner can update
drop policy if exists profiles_read_all on public.profiles;
create policy profiles_read_all on public.profiles
  for select to anon, authenticated using (true);
drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles
  for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

-- submissions: owner-only read + write
drop policy if exists submissions_own_rw on public.submissions;
create policy submissions_own_rw on public.submissions
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- reviews: reviewer owns their row; anyone can read published
drop policy if exists reviews_read_public on public.reviews;
create policy reviews_read_public on public.reviews
  for select to anon, authenticated using (status = 'published' or auth.uid() = reviewer_user_id);
drop policy if exists reviews_own_write on public.reviews;
create policy reviews_own_write on public.reviews
  for insert to authenticated with check (auth.uid() = reviewer_user_id);
drop policy if exists reviews_own_update on public.reviews;
create policy reviews_own_update on public.reviews
  for update to authenticated using (auth.uid() = reviewer_user_id) with check (auth.uid() = reviewer_user_id);
drop policy if exists reviews_own_delete on public.reviews;
create policy reviews_own_delete on public.reviews
  for delete to authenticated using (auth.uid() = reviewer_user_id);

-- engagements: practitioner OR buyer can read their row
drop policy if exists engagements_party_read on public.engagements;
create policy engagements_party_read on public.engagements
  for select to authenticated using (
    auth.uid() = practitioner_user_id or auth.uid() = buyer_user_id
  );
-- No INSERT/UPDATE policy for authenticated users — the editorial
-- desk moves engagement status via a service-role API route.

-- ledger: user can read their own; no writes via anon/auth key.
drop policy if exists ledger_own_read on public.ledger;
create policy ledger_own_read on public.ledger
  for select to authenticated using (auth.uid() = user_id);

-- saved: user owns their own
drop policy if exists saved_own_rw on public.saved;
create policy saved_own_rw on public.saved
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- inquiries: anyone authenticated OR anon can insert (captured from
-- public forms). Reads restricted to service_role (policy absent →
-- RLS blocks; service_role bypasses RLS).
drop policy if exists inquiries_anyone_write on public.inquiries;
create policy inquiries_anyone_write on public.inquiries
  for insert to anon, authenticated with check (true);

-- applications: same pattern
drop policy if exists applications_anyone_write on public.applications;
create policy applications_anyone_write on public.applications
  for insert to anon, authenticated with check (true);
