create table if not exists public.wrenchready_jeff_media (
  id text primary key,
  job_id text,
  conversation_id text,
  session_id text,
  field_event_id text,
  photo_id text,
  source_channel text not null check (
    source_channel in (
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
  uploaded_at timestamptz not null,
  uploaded_by text not null,
  file_name text not null,
  content_type text not null,
  size_bytes integer not null default 0,
  label text,
  note text,
  storage_provider text not null check (
    storage_provider in (
      'google-drive',
      'local-file',
      'external-url',
      'runtime-memory',
      'metadata-only'
    )
  ),
  storage_status text not null check (
    storage_status in (
      'available',
      'temporary',
      'metadata-only',
      'failed'
    )
  ),
  drive_file_id text,
  drive_web_view_link text,
  drive_web_content_link text,
  external_url text,
  local_storage_key text,
  parse_status text not null default 'not-needed' check (
    parse_status in (
      'not-needed',
      'pending',
      'parsed',
      'failed',
      'blocked'
    )
  ),
  review_status text not null default 'accepted' check (
    review_status in (
      'accepted',
      'needs-review',
      'rejected',
      'archived'
    )
  ),
  extracted_text text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists wrenchready_jeff_media_job_uploaded_idx
  on public.wrenchready_jeff_media (job_id, uploaded_at desc)
  where job_id is not null;

create index if not exists wrenchready_jeff_media_session_uploaded_idx
  on public.wrenchready_jeff_media (session_id, uploaded_at desc)
  where session_id is not null;

create index if not exists wrenchready_jeff_media_conversation_idx
  on public.wrenchready_jeff_media (conversation_id, uploaded_at desc)
  where conversation_id is not null;

create index if not exists wrenchready_jeff_media_review_idx
  on public.wrenchready_jeff_media (review_status, uploaded_at desc)
  where review_status = 'needs-review';

create index if not exists wrenchready_jeff_media_photo_idx
  on public.wrenchready_jeff_media (photo_id)
  where photo_id is not null;

alter table public.wrenchready_jeff_media enable row level security;

grant usage on schema public to service_role;
grant select, insert, update, delete on table public.wrenchready_jeff_media to service_role;
