create extension if not exists "pgcrypto";

create table if not exists public.wrenchready_jeff_field_event (
  id text primary key,
  job_id text not null,
  event_type text not null check (
    event_type in (
      'voice_call_started',
      'voice_transcript_note',
      'sms_received',
      'mms_photo_received',
      'field_upload_received',
      'photo_analysis_completed',
      'diagnostic_email_received',
      'scan_report_parsed',
      'part_search_completed',
      'cart_prepared',
      'purchase_blocked',
      'approval_requested',
      'approval_received',
      'invoice_updated',
      'payment_link_ready',
      'closeout_started',
      'field_note_recorded',
      'conflict_flagged'
    )
  ),
  channel text not null check (
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
  timestamp timestamptz not null,
  sender text not null,
  summary text not null,
  extracted_facts jsonb not null default '{}'::jsonb,
  raw_source_reference text,
  confidence text not null check (confidence in ('high', 'medium', 'low')),
  needs_review boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists wrenchready_jeff_field_event_job_time_idx
  on public.wrenchready_jeff_field_event (job_id, timestamp desc);

create index if not exists wrenchready_jeff_field_event_needs_review_idx
  on public.wrenchready_jeff_field_event (needs_review, timestamp desc);

alter table public.wrenchready_jeff_field_event enable row level security;

grant usage on schema public to service_role;
grant select, insert, update, delete on table public.wrenchready_jeff_field_event to service_role;
