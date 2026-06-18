alter table public.wrenchready_jeff_conversation
  add column if not exists call_type text not null default 'unknown' check (
    call_type in ('job', 'personal', 'test', 'admin', 'unknown')
  ),
  add column if not exists subject_label text,
  add column if not exists follow_up_requested boolean not null default false,
  add column if not exists follow_up_status text not null default 'none' check (
    follow_up_status in ('none', 'requested', 'drafted', 'sent', 'blocked', 'failed')
  );

alter table public.wrenchready_jeff_conversation_summary
  add column if not exists recommendation_summary text,
  add column if not exists requested_follow_ups text[] not null default '{}'::text[],
  add column if not exists email_requested boolean not null default false,
  add column if not exists email_status text not null default 'none' check (
    email_status in ('none', 'requested', 'drafted', 'sent', 'blocked', 'failed')
  ),
  add column if not exists email_to text;

create index if not exists wrenchready_jeff_conversation_call_type_time_idx
  on public.wrenchready_jeff_conversation (call_type, ended_at desc);

create index if not exists wrenchready_jeff_conversation_followup_idx
  on public.wrenchready_jeff_conversation (follow_up_requested, follow_up_status, ended_at desc);

update public.wrenchready_jeff_conversation
set call_type = case
    when job_id is not null then 'job'
    when call_id like 'red-team-%' then 'test'
    else call_type
  end
where call_type = 'unknown';
