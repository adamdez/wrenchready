## 8. Build, Tooling, Config & Developer Experience

**Verdict:** The build/config baseline is conventional and sane for a Next.js 16 app — strict TypeScript, a clean Turbopack/PostCSS/Tailwind v4 setup, a passing lint run, and no `ignoreBuildErrors` escape hatches. But the "test" story is integration smoke-scripts that all require a live server, there is **zero CI**, env management is a sprawl of five on-disk `.env*` files with a 77-vs-25 key mismatch, and the repo ships **a live FAL API key hardcoded into three committed Python files**. A new engineer can `npm run dev` quickly, but cannot run any test offline, has no `.env.example`-to-runtime contract enforcement, and would inherit cross-platform (Windows-path) breakage and a leaked credential.

**Score: 5.0 / 10**

### What's here

Root config surface (all present, all small and readable):

- `next.config.ts` (78 lines): a `www`→apex 301 redirect, `X-Robots-Tag: noindex` headers for `/ops*` and `/jeff*`, and `turbopack.root = process.cwd()`.
- `tsconfig.json`: `strict: true`, `noEmit`, `moduleResolution: "bundler"`, `target: "ES2017"`, `@/*` path alias.
- `eslint.config.mjs` (flat config): just `eslint-config-next` core-web-vitals + typescript presets, nothing custom.
- `vercel.json`: one daily cron (`/api/al/wrenchready/jeff/sync` at `0 12 * * *`), framework pinned to `nextjs`.
- `components.json` (shadcn, `base-nova` style), `postcss.config.mjs` (Tailwind v4 plugin only).
- `package.json`: 13 runtime deps, 8 devDeps, **no test framework**, 16 npm scripts (5 of them `verify:*`, plus `sync:*`/`google:oauth`/`call:jeff` operational scripts).

"Test harness": `scripts/verify-*.mjs` (7 files, ~2,100 LOC). Every one imports `./load-local-env.mjs` and hits a running HTTP server via `fetch` (`scripts/verify-jeff-field-assistant.mjs:5`, `scripts/verify-wrenchready-api-security.mjs:3`). They are hand-rolled `assert()` integration probes, not unit tests.

Env management: `.env.example` (118 lines, 77 keys), plus on-disk `.env.local`, `.env.local.backup-20260618-070059`, `.env.project.local`, `.env.vercel.local`. Runtime access goes through `src/lib/env.ts` `readEnv(...keys)` (fallback-chain lookup with quote/CRLF normalization) and `scripts/load-local-env.mjs` (a mini dotenv loader that reads `.env.local`, `.env.vercel.local`, `.env.project.local` in order).

Stray repo artifacts: 6 Python media-generation scripts (`gen-favicons.py`, `composite-and-submit.py`, `gen-rotor-clip.py`, `poll-rotor.py`, `stitch-mobile.py`, `gen-rotor-clip.py`) and 4 `*-probe.json` ffprobe dumps, all committed.

### Strengths

- **No build-error suppression.** `next.config.ts` does *not* set `typescript.ignoreBuildErrors` or `eslint.ignoreDuringBuilds` (verified by grep — none present). Combined with `strict: true` (`tsconfig.json:7`) and `noEmit` (`tsconfig.json:8`), type and lint errors actually fail the Vercel build. This is the single most important DX guardrail and it's correctly in place.
- **Lint is green and meaningful enough.** `npm run lint` returns `0 errors, 9 warnings` — all `no-unused-vars` (e.g. `src/app/locations/[slug]/page.tsx:3`). The flat config inherits Next's core-web-vitals + TS rules (`eslint.config.mjs:6`), so it catches real React/Next foot-guns rather than being a no-op.
- **Centralized, defensive env reader.** `readEnv` (`src/lib/env.ts:13`) supports multi-key fallback and strips quotes/escaped CRLF (`src/lib/env.ts:4`), which is genuinely useful given Google service-account private keys and quoted review URLs in the env set. 36 source files use it; only ~10 touch `process.env` directly.
- **Clean secret-ignore baseline for env files.** `.gitignore` has both `.env*` (`!.env.example`) and a trailing `.env*.local`, and `git check-ignore` confirms `.env.local`, `.env.local.backup-*`, and `.env.vercel.local` are all ignored — so the *dotenv* secrets are not committed.
- **Pinned framework versions.** `next`, `react`, `react-dom`, and `eslint-config-next` are exact-pinned (`package.json:31`, `:46`), reducing "works on my machine" drift on the critical path.

### Findings

**Live FAL API key hardcoded in committed Python scripts**
- **Severity: Critical**
- **Location:** `composite-and-submit.py:44`, `gen-rotor-clip.py:6`, `poll-rotor.py:5` (and confirmed in committed `HEAD`)
- **Evidence:** `FAL_KEY = "<REDACTED — exposed fal.ai key; revoke/delete it on fal.ai>"` appeared verbatim in three tracked files (now read from `process.env`). The literal value was also committed to version history, not just the working tree. Key value redacted from this doc 2026-06-21; it remains valid until revoked on fal.ai.
- **Why it matters:** This is a real, active fal.ai credential committed to the repo. Anyone with repo access (or anyone the repo is ever shared/published to) can run paid video-generation jobs on this account. Unlike the `.env*` files, these `.py` files are *not* gitignored and *not* in `.vercelignore`, so they also ship into the Vercel build context.
- **Recommendation:** Rotate the FAL key immediately. Remove it from the files, read it from `process.env`/an env var, and purge it from git history (`git filter-repo`). Add a secret scanner (gitleaks/trufflehog) to a pre-commit hook and CI.

**No CI pipeline at all**
- **Severity: High**
- **Location:** repo root — no `.github/`, `.gitlab-ci.yml`, or `.circleci/` exists (verified by `ls`/`find`).
- **Evidence:** The only quality gates are whatever Vercel runs on deploy (build + the implicit `next lint` if configured) and manually-invoked `verify:*` scripts. Nothing runs lint, typecheck, the verify suite, or a secret scan on push/PR.
- **Why it matters:** For a business that is the "operating system" for live dispatch, money (Stripe), and customer PII, there is no automated gate preventing a broken `tsc`, a regressed auth check, or a newly-leaked secret from reaching `main`. The verify scripts exist but nothing enforces them.
- **Recommendation:** Add a minimal GitHub Actions workflow: `npm ci` → `npx tsc --noEmit` → `npm run lint` → gitleaks. Add a deploy-gated job that runs the `verify:security` / `verify:jeff` scripts against the Vercel preview URL.

**No unit-test framework; "tests" are server-dependent integration probes**
- **Severity: High**
- **Location:** `package.json:11-17`, `scripts/verify-*.mjs`
- **Evidence:** There is no `jest`/`vitest`/`node:test` dependency and no `"test"` npm script. All 7 verify scripts call `fetch(${baseUrl}...)` against `http://localhost:3000` or production (`scripts/verify-jeff-field-assistant.mjs:5`, `:21`; `scripts/verify-wrenchready-api-security.mjs:3`). None can run without a booted server + real env + (for some) `.data/jeff/*.json` fixtures on disk.
- **Why it matters:** The two largest, highest-risk modules — `jeff-field-assistant/tools.ts` (5,765 LOC) and `promise-crm/storage.ts` (4,029 LOC) — have no isolated, fast, deterministic tests. Pure logic (pricing math, diagnostic-tree gating, env normalization) cannot be exercised in milliseconds; every "test" needs the whole app up. This makes refactoring the monolith files dangerous and slows the feedback loop to seconds-per-server-boot.
- **Recommendation:** Add `vitest`, extract pure functions, and write unit tests for pricing/quote logic, `readEnv`, and auth helpers. Keep the `verify:*` scripts as a separate "e2e/smoke" tier wired into CI against previews.

**`.env.example` does not match the real env contract; no startup validation**
- **Severity: Medium**
- **Location:** `.env.example` (77 keys) vs `.env.local` (25 keys); `src/lib/env.ts`
- **Evidence:** `.env.example` lists 77 keys; the working `.env.local` defines only 25. `readEnv` returns `undefined` silently for missing keys (`src/lib/env.ts:21`) — there is no schema/validation (no `zod`/`envalid`) and no boot-time assertion that required vars are present.
- **Why it matters:** A new engineer can't tell which of 77 keys are actually required vs aspirational, and a missing critical secret (e.g. `STRIPE_WEBHOOK_SECRET`, `JEFF_FIELD_ASSISTANT_TOOL_SECRET`) surfaces as a runtime `undefined`/401 deep in a request path rather than a clear startup error. The example file overstates the surface and the runtime understates the failure.
- **Recommendation:** Define a validated env schema (zod) for *required* vars, fail fast at boot with a readable message, and regenerate `.env.example` from it so the example is the contract. Mark optional/feature-flag vars distinctly.

**Cross-platform rot: hardcoded Windows paths in scripts and agent docs**
- **Severity: Medium**
- **Location:** `composite-and-submit.py:8`, `:11`; `stitch-mobile.py` (`BASE = r"c:\Users\adamd\Desktop\Simon\..."`); `gen-favicons.py:4` (`r"public\logo-assets\..."`); `CLAUDE.md` (4 hardcoded `C:\...` vault paths)
- **Evidence:** Scripts embed absolute `C:\Users\adamd\Desktop\Simon\wrenchreadymobile.com\...` paths, but the repo now lives at `/Users/dez/Desktop/Codex Projects/WrenchReady/...` (note the space). `CLAUDE.md` points doctrine at `C:\Users\adamd\Desktop\al-boreland-vault\...` which does not exist on this machine.
- **Why it matters:** These scripts are dead on the current (macOS) host and will silently fail or write to the wrong place. The agent-instruction file references a vault path that can't resolve, undermining the "source of truth" claims it makes. It signals config that was never made portable.
- **Recommendation:** Either delete the one-shot media scripts (they're build-time asset generation, not app code) or parameterize paths via `argv`/env and move them under `scripts/media/`. Update `CLAUDE.md` paths or make them relative.

**One-shot media-gen artifacts committed to the app repo**
- **Severity: Low**
- **Location:** root: `gen-favicons.py`, `composite-and-submit.py`, `gen-rotor-clip.py`, `poll-rotor.py`, `stitch-mobile.py`, `gen-rotor-clip.py`; `hero-probe.json`, `mobile-probe.json`, `rotor-probe.json`, `rotor-v8-probe.json`
- **Evidence:** 6 Python scripts + 4 ffprobe JSON dumps sit in the repo root and are git-tracked. `.gitignore` already excludes *some* generation scripts (`gen-clips*.py`, `stitch-hero*.py`, etc.) — proving the intent to keep these out — but these specific ones slipped through. They are also not in `.vercelignore`, so they're uploaded to every deploy.
- **Why it matters:** Repo-root clutter raises the "what is this?" cost for new contributors, the probe JSONs are throwaway debug output, and (per the Critical finding) some of these scripts are the secret-leak vector. None of it is part of the Next.js app.
- **Recommendation:** Move durable asset-gen tooling into `scripts/media/` with a README, delete the `*-probe.json` dumps, and add `*.py` / `*-probe.json` to `.gitignore` and `.vercelignore`.

**Env-file sprawl with an unmanaged secret-bearing backup**
- **Severity: Low**
- **Location:** `.env.local`, `.env.local.backup-20260618-070059`, `.env.project.local`, `.env.vercel.local`
- **Evidence:** Five `.env*` files on disk including a timestamped `.backup-` copy. `scripts/load-local-env.mjs:35` hardcodes a precedence list of three of them. They are correctly gitignored, but the backup is an ad-hoc, manually-created secret copy with no rotation/cleanup discipline.
- **Why it matters:** Manual `.env.local.backup-<timestamp>` files accumulate plaintext secrets on disk and are easy to accidentally `git add -f`, copy into a shared drive, or leave behind. The 3-file load order is also implicit tribal knowledge — a new dev won't know which file wins.
- **Recommendation:** Standardize on `.env.local` + Vercel-managed env (pull via `vercel env pull`), delete ad-hoc backups, and document the precedence in the README.

**`target: ES2017` is needlessly conservative**
- **Severity: Info**
- **Location:** `tsconfig.json:4`
- **Evidence:** `"target": "ES2017"` (the Next.js scaffold default) while the project runs React 19 / Next 16 on modern Node and modern browsers.
- **Why it matters:** Minor — it forces downleveling of `async/await`, optional chaining, etc. that every supported runtime handles natively, producing slightly larger output. No correctness impact; flagged only for completeness.
- **Recommendation:** Bump to `ES2022` to match the actual runtime floor. Low priority.

### Score rationale

The fundamentals that *prevent* shipping broken code are present and correct: strict TS with no build-error suppression, a green and non-trivial lint config, pinned framework versions, a centralized env reader, and correctly-gitignored dotenv files. That floor keeps this out of "serious problems" territory and is worth real credit.

But this dimension is dragged down hard by three things a top org would never ship: **a live API key committed to source** (Critical), **no CI whatsoever** (High), and **no offline/unit test capability** for a 62K-LOC app whose two biggest files are 4–6K-LOC monoliths handling money and dispatch (High). Add the env-contract mismatch, Windows-path rot, and repo-root clutter, and the new-engineer onboarding story is: clones fine, `npm run dev` works, but cannot test anything without standing up the full stack + real secrets, inherits a leaked credential, and trips over dead cross-platform scripts. That is a working-but-significant-debt profile. **5.0/10.**
