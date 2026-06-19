create table if not exists public.wrenchready_operator_task (
  id text primary key,
  title text not null,
  detail text not null,
  task_type text not null default 'other' check (
    task_type in (
      'inbound-screening',
      'job-review',
      'quote-review',
      'schedule',
      'parts',
      'field-proof',
      'customer-follow-up',
      'payment',
      'jeff-review',
      'memory-review',
      'system',
      'other'
    )
  ),
  status text not null default 'open' check (
    status in ('open', 'in-progress', 'blocked', 'done', 'dismissed')
  ),
  priority text not null default 'normal' check (
    priority in ('critical', 'high', 'normal', 'low')
  ),
  owner text not null default 'Ops',
  due_at timestamptz,
  promise_id text,
  inbound_id text,
  customer_name text,
  vehicle_label text,
  source_channel text not null default 'system',
  source_kind text not null,
  source_id text,
  source_url text,
  blocker text,
  completion_summary text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists wrenchready_operator_task_status_priority_idx
  on public.wrenchready_operator_task (status, priority, due_at nulls first, updated_at desc);

create index if not exists wrenchready_operator_task_promise_idx
  on public.wrenchready_operator_task (promise_id, status, updated_at desc)
  where promise_id is not null;

create index if not exists wrenchready_operator_task_source_idx
  on public.wrenchready_operator_task (source_kind, source_id)
  where source_id is not null;

alter table public.wrenchready_operator_task enable row level security;

grant usage on schema public to service_role;
grant select, insert, update, delete on table public.wrenchready_operator_task to service_role;
