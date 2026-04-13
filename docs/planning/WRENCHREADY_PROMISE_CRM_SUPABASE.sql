-- WrenchReady Promise CRM ops mirror
-- Canonical purpose:
-- - website / phone / text intake lands in wrenchready_inbound
-- - qualified work is promoted into wrenchready_promise
-- - promise board reads from these records for operational visibility

create extension if not exists "pgcrypto";

create table if not exists public.wrenchready_inbound (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  source text not null check (source in ('website', 'phone', 'text', 'manual', 'voicemail')),
  customer_name text not null,
  customer_phone text not null,
  customer_email text,
  preferred_contact text not null default 'call' check (preferred_contact in ('call', 'text', 'email')),
  vehicle_year integer,
  vehicle_make text not null,
  vehicle_model text not null,
  vehicle_mileage integer,
  vehicle_label text not null,
  location_label text not null,
  city text not null,
  territory text not null,
  access_notes text,
  requested_service text not null,
  normalized_service text not null,
  service_lane text not null,
  symptom_summary text not null,
  owner text not null default 'Unassigned' check (owner in ('Dez', 'Simon', 'Unassigned')),
  readiness_risk text not null check (readiness_risk in ('low', 'medium', 'high')),
  qualification_status text not null default 'new' check (qualification_status in ('new', 'screening', 'promoted')),
  promise_fit text not null check (promise_fit in ('strong', 'conditional', 'review')),
  preferred_window_label text not null,
  preferred_window_start timestamptz,
  preferred_window_end timestamptz,
  next_action text not null,
  notes jsonb not null default '[]'::jsonb,
  raw_payload jsonb not null default '{}'::jsonb
);

create index if not exists wrenchready_inbound_created_at_idx
  on public.wrenchready_inbound (created_at desc);

create index if not exists wrenchready_inbound_qualification_status_idx
  on public.wrenchready_inbound (qualification_status);

create index if not exists wrenchready_inbound_territory_idx
  on public.wrenchready_inbound (territory);

create table if not exists public.wrenchready_promise (
  id uuid primary key default gen_random_uuid(),
  inbound_id uuid references public.wrenchready_inbound(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  customer_name text not null,
  customer_phone text not null,
  customer_email text,
  preferred_contact text not null default 'call' check (preferred_contact in ('call', 'text', 'email')),
  vehicle_year integer,
  vehicle_make text not null,
  vehicle_model text not null,
  vehicle_mileage integer,
  location_label text not null,
  city text not null,
  territory text not null,
  access_notes text,
  service_scope text not null,
  owner text not null check (owner in ('Dez', 'Simon', 'Unassigned')),
  readiness_risk text not null check (readiness_risk in ('low', 'medium', 'high')),
  status text not null check (status in ('promises-waiting', 'tomorrow-at-risk', 'follow-through-due', 'completed')),
  scheduled_window_label text not null,
  scheduled_window_start timestamptz,
  scheduled_window_end timestamptz,
  readiness_summary text not null,
  next_action text not null,
  top_risks jsonb not null default '[]'::jsonb,
  notes jsonb not null default '[]'::jsonb,
  follow_through_due_at timestamptz
);

create index if not exists wrenchready_promise_status_idx
  on public.wrenchready_promise (status);

create index if not exists wrenchready_promise_owner_idx
  on public.wrenchready_promise (owner);

create index if not exists wrenchready_promise_scheduled_window_start_idx
  on public.wrenchready_promise (scheduled_window_start);

create or replace function public.set_wrenchready_promise_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists wrenchready_promise_set_updated_at on public.wrenchready_promise;

create trigger wrenchready_promise_set_updated_at
before update on public.wrenchready_promise
for each row
execute function public.set_wrenchready_promise_updated_at();

alter table public.wrenchready_inbound enable row level security;
alter table public.wrenchready_promise enable row level security;

-- Start conservative. Server-side routes should use SUPABASE_SERVICE_ROLE_KEY.
-- Add finer-grained authenticated policies later when internal auth exists.
