create table if not exists public.wrenchready_jeff_memory (
  id text primary key,
  subject_type text not null default 'technician' check (
    subject_type in (
      'technician',
      'business',
      'customer',
      'vehicle',
      'vendor',
      'workflow',
      'job',
      'other'
    )
  ),
  subject_key text not null,
  subject_label text not null,
  category text not null,
  memory text not null check (char_length(memory) between 3 and 1200),
  evidence text,
  evidence_event_ids text[] not null default '{}'::text[],
  source_job_id text,
  source_channel text check (
    source_channel is null or source_channel in (
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
  status text not null default 'candidate' check (
    status in ('candidate', 'approved', 'rejected', 'archived')
  ),
  confidence text not null default 'medium' check (confidence in ('high', 'medium', 'low')),
  sensitivity text not null default 'low' check (
    sensitivity in ('low', 'personal', 'sensitive', 'restricted')
  ),
  created_by text not null default 'Jeff',
  approved_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  approved_at timestamptz,
  last_used_at timestamptz,
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists wrenchready_jeff_memory_status_subject_idx
  on public.wrenchready_jeff_memory (status, subject_type, subject_key, updated_at desc);

create index if not exists wrenchready_jeff_memory_source_job_idx
  on public.wrenchready_jeff_memory (source_job_id, created_at desc)
  where source_job_id is not null;

create index if not exists wrenchready_jeff_memory_candidate_idx
  on public.wrenchready_jeff_memory (status, created_at desc)
  where status = 'candidate';

alter table public.wrenchready_jeff_memory enable row level security;

grant usage on schema public to service_role;
grant select, insert, update, delete on table public.wrenchready_jeff_memory to service_role;
