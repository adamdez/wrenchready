create table if not exists public.wrenchready_jeff_conversation (
  id text primary key,
  call_id text,
  session_id text,
  job_id text,
  job_label text,
  job_match_status text not null default 'unresolved' check (
    job_match_status in ('confirmed', 'inferred', 'unresolved', 'manual')
  ),
  channel text not null default 'voice' check (
    channel in (
      'voice',
      'sms',
      'mms',
      'upload',
      'email',
      'vendor',
      'approval',
      'invoice',
      'payment',
      'system'
    )
  ),
  caller_phone text,
  assistant_id text,
  started_at timestamptz,
  ended_at timestamptz not null,
  duration_seconds integer,
  transcript text,
  raw_summary text,
  recording_url text,
  needs_review boolean not null default false,
  review_reason text,
  source_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists wrenchready_jeff_conversation_call_id_idx
  on public.wrenchready_jeff_conversation (call_id)
  where call_id is not null;

create index if not exists wrenchready_jeff_conversation_job_time_idx
  on public.wrenchready_jeff_conversation (job_id, ended_at desc)
  where job_id is not null;

create index if not exists wrenchready_jeff_conversation_review_idx
  on public.wrenchready_jeff_conversation (needs_review, ended_at desc);

create table if not exists public.wrenchready_jeff_conversation_summary (
  id text primary key,
  conversation_id text not null references public.wrenchready_jeff_conversation(id) on delete cascade,
  job_id text,
  summary_kind text not null default 'after_call' check (
    summary_kind in ('after_call', 'manual_compaction', 'unresolved_call')
  ),
  summary text not null,
  known_facts text[] not null default '{}'::text[],
  tests_performed text[] not null default '{}'::text[],
  readings text[] not null default '{}'::text[],
  suspected_issues text[] not null default '{}'::text[],
  unproven_assumptions text[] not null default '{}'::text[],
  proof_needed text[] not null default '{}'::text[],
  next_actions text[] not null default '{}'::text[],
  blockers text[] not null default '{}'::text[],
  customer_safe_recap text,
  confidence text not null default 'medium' check (confidence in ('high', 'medium', 'low')),
  created_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists wrenchready_jeff_conversation_summary_job_time_idx
  on public.wrenchready_jeff_conversation_summary (job_id, created_at desc)
  where job_id is not null;

create index if not exists wrenchready_jeff_conversation_summary_conversation_idx
  on public.wrenchready_jeff_conversation_summary (conversation_id, created_at desc);

create table if not exists public.wrenchready_jeff_job_workspace_snapshot (
  id text primary key,
  job_id text not null,
  generated_at timestamptz not null,
  latest_conversation_id text,
  snapshot_summary text not null,
  known_facts text[] not null default '{}'::text[],
  latest_tests_and_readings text[] not null default '{}'::text[],
  latest_media_and_reports text[] not null default '{}'::text[],
  open_blockers text[] not null default '{}'::text[],
  next_actions text[] not null default '{}'::text[],
  missing_proof text[] not null default '{}'::text[],
  needs_review boolean not null default false,
  source_counts jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists wrenchready_jeff_job_workspace_snapshot_job_time_idx
  on public.wrenchready_jeff_job_workspace_snapshot (job_id, generated_at desc);

alter table public.wrenchready_jeff_conversation enable row level security;
alter table public.wrenchready_jeff_conversation_summary enable row level security;
alter table public.wrenchready_jeff_job_workspace_snapshot enable row level security;

grant usage on schema public to service_role;
grant select, insert, update, delete on table public.wrenchready_jeff_conversation to service_role;
grant select, insert, update, delete on table public.wrenchready_jeff_conversation_summary to service_role;
grant select, insert, update, delete on table public.wrenchready_jeff_job_workspace_snapshot to service_role;
