# WrenchReady Single Source Of Truth

Purpose: prevent Jeff, Codex, the old WrenchReady Assistant folder, CRM records, Google files, Vapi transcripts, and generated PDFs from becoming separate competing memories.

## Canonical Rule

There is one active WrenchReady operating system: this `wrenchready` app repo plus the connected production data stores it controls.

The sibling `../WrenchReady Assistant` folder is a legacy archive/import source. It may contain useful historical memory, templates, packet examples, job folders, Stripe notes, O'Reilly playbooks, and correction history. It is not the active place for new WrenchReady facts.

## Source Priority

1. Newest explicit Dez instruction.
2. Current Promise CRM/Supabase job, customer, quote, schedule, payment, approval, and field-event records.
3. Source evidence attached to the job: photos, scan reports, emails, vendor confirmations, Stripe/payment records, calendar records, and customer messages.
4. Reviewed stable WrenchReady operating rules in this repo.
5. Imported legacy assistant knowledge that has been copied into this repo and reviewed.
6. Unimported legacy files in `../WrenchReady Assistant`, used only as historical reference.
7. LLM assumptions, clearly labeled.

## Canonical Stores

Live job/customer/quote/schedule/payment state:

- Promise CRM / app records
- Supabase tables when configured

Jeff field memory:

- `wrenchready_jeff_field_event`
- `wrenchready_jeff_memory`
- `wrenchready_jeff_conversation`
- `wrenchready_jeff_conversation_summary`
- `wrenchready_jeff_job_workspace_snapshot`
- `wrenchready_jeff_media`

Local `.data/jeff` files are pilot fallback and local mirror only. They are not production truth.

Stable operating rules:

- `docs/planning/JEFF_CORE_MEMORY.md`
- `docs/planning/WRENCHREADY_SINGLE_SOURCE_OF_TRUTH.md`
- `docs/planning/WRENCHREADY_LEGACY_ASSISTANT_IMPORT_2026-06-18.md`
- `src/lib/jeff-field-assistant/operating-context.ts`

Media:

- Google Drive or durable object storage is the production media archive.
- Local files and `/tmp` files are not durable production memory.

## Cross-Pollination Policy

Codex must not create a new durable fact only in `../WrenchReady Assistant`.

Jeff must not create a new durable fact only in `.data/jeff` if Supabase/Drive/CRM is available.

When Codex discovers useful information in the legacy assistant folder, it should migrate the useful parts into one of:

- CRM/Supabase job record for job-specific facts
- Jeff durable memory candidate for future behavior/preferences
- reviewed repo docs for stable operating rules
- app code/templates for workflows the system must enforce

When Jeff learns useful information during calls, texts, photos, emails, or app messages, he should save it as:

- job event or workspace summary for job-specific facts
- media record for files/photos/reports
- candidate memory for stable preferences or operating rules
- blocked request for missing capabilities

## What Goes Where

Job-specific facts:

- customer, vehicle, VIN, address, appointment, scope, approval, diagnosis, readings, photos, scan reports, parts status, invoice, payment, closeout
- store in CRM/Supabase/Jeff job workspace, not core memory

Stable WrenchReady operating rules:

- pricing defaults, approval rules, parts margin policy, communication rules, scheduling rules, tool limits
- store in reviewed repo docs and Jeff operating context

Technician preferences:

- Simon communication preferences, preferred store, field workflow preferences
- store as approved Jeff memory after review, or in reviewed core memory if stable and low-risk

Personal assistant preferences:

- meals, harmless errands, personal reminders
- store only if Simon opts in and the preference is useful without being distracting

Legacy assistant files:

- use as evidence or import material
- do not treat as live truth until imported and reviewed

## Drift Checks

Any future Jeff/Codex build should fail review if:

- a new customer/job/quote/invoice/parts fact exists only in `../WrenchReady Assistant`
- Jeff says he remembers a rule that is not in approved memory, repo operating context, CRM/Supabase, or current conversation
- quote/parts work is saved only as prose instead of structured parts/economics/job fields
- local `.data/jeff` is treated as durable production storage
- Vapi transcript, email, photo, or SMS data is visible but not attached to the job workspace
