<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# WrenchReady Source Of Truth

This `wrenchready` app repo is the active WrenchReady system. Do not create new operational memory, job packets, quote records, invoice records, parts records, or Jeff notes in the sibling `../WrenchReady Assistant` folder unless Dez explicitly asks for a legacy-file migration.

Canonical stores:

- Live job/customer/quote/schedule/payment state: Promise CRM and Supabase-backed app data.
- Jeff field calls, app messages, photos/files metadata, field events, summaries, and durable memory candidates: Jeff app storage/Supabase tables, with `.data/jeff` only as local pilot fallback.
- Stable reviewed operating rules: docs in this repo, especially `docs/planning/JEFF_CORE_MEMORY.md`, `docs/planning/WRENCHREADY_SINGLE_SOURCE_OF_TRUTH.md`, and Jeff code in `src/lib/jeff-field-assistant/operating-context.ts`.
- Media bytes: Google Drive or durable object storage when configured; local files are not production truth.

The sibling `../WrenchReady Assistant` folder is now a legacy archive/import source. If useful rules, templates, or job history are found there, migrate the useful content into the canonical app repo docs, CRM/Supabase records, or an explicit reviewed import document. Do not leave new facts only in the legacy folder.
