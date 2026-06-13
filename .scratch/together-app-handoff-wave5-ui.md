# Together App — Wave 5 Handoff (Pulse API + UI)

**Date generated:** 2026-06-12
**Branch:** `refactor/together_app_v2_1` (continue here — do NOT create a new branch; PRs target `main`)
**For:** fresh agent (Sonnet) picking up Couple Pulse at Step 6

---

## 1. Where We Are

**Wave 5 backend core (Steps 1–5) is 100% COMPLETE and committed. The suite is fully green: 176 BE jest / 171 FE vitest.**

Couple Pulse (FD-16, ADR-0004) is being built in 10 TDD steps. Steps 1–5 (everything server-side except the controller) are done:

| step | commits | what exists now |
|---|---|---|
| 1 | `daa33fc` | `OllamaClient` extracted to shared `src/ai/ai.module.ts`; LogsModule imports AiModule |
| 2 | `2e133c8` → `c226f2f` | `src/pulse/reading.ts` — frozen vocab + six Readings + pure symmetric rule table |
| 3 | `91ef2f6` → `7604036` | `src/pulse/canon.ts` — 48 approved entries + deterministic `pickCanonEntry(pulseDay, reading)` |
| 4 | `38f89f1` → `637a743` | entities + `PulseService` (upsert, four-state view, reveal enforcement) |
| 5 | `ea42483` → `b971837` | `PulseSuggestionService` (Ollama pipeline, validation, conditional store, lazy repair) + wiring |

All backend paths are: `together-backend/together-backend/src/...`. Frontend: `together-app-ui/...`.

**Read these before writing any code** (they are the spec; do not re-derive decisions):
- `docs/adr/0004-couple-pulse.md` — the locked product decision (hard boundaries)
- `.scratch/couple-pulse/PRD.md` — full implementation/testing decisions
- `CONTEXT.md` § Couple Pulse — glossary incl. frozen vocab, Readings, rule precedence
- `REDESIGN-PLAN.md` § Wave 5 — step-by-step status (just updated)
- The five `src/pulse/*.ts` files + their specs — the house patterns to extend

## 2. Decisions already made (approved 2026-06-12 — do not reopen)

1. Mood = `bright|steady|tender|heavy`; energy = `charged|steady|low` (in `reading.ts`).
2. Six Readings, precedence Bright → Carrying → Quiet → Speeds → Step → Weather. Carrying requires both moods ∈ {tender, heavy} AND ≥1 heavy.
3. **The completing check-in PUT awaits suggestion generation** (8s budget; Ollama-down fast-fails ≤2s via cached health check). This deliberately deviates from the PRD's "async off the request path" — approved.
4. **AuthGuard only** on the controller (match `StatsController`) — no new permission rows, no `PermissionsGuard`.
5. `PULSE_TIMEZONE` env var, default `Europe/Bucharest`.
6. Schema via TypeORM `synchronize` — **no migrations** (repo has none).
7. **Skip the Playwright e2e spec** (runner is permanently broken; never try to fix `e2e/tasks.spec.ts`).
8. Canon copy is product-owner-approved verbatim; **any edit to `canon.ts` entry text needs explicit user review.**

## 3. IMMEDIATE NEXT TASK — Step 6: `PulseController`

Strict TDD: **failing spec committed first (red), then implementation (green). One red commit + one green commit, exactly like steps 2–5** (see those commit messages for the style).

- File: `src/pulse/pulse.controller.ts` + `pulse.controller.spec.ts`, registered in `pulse.module.ts` (`controllers: [PulseController]`; module must also import `AuthModule` for the guard).
- Endpoints (REST only — **no GraphQL resolver, no gateway/WS events**):
  - `GET /pulse/today` → `pulseService.getToday(req.user.id)`
  - `PUT /pulse/today/check-in` → body `{ mood, energy }` → `pulseService.upsertCheckIn(req.user.id, dto)`
- `@UseGuards(AuthGuard)` at controller level (import from `../auth/guards/auth.guard`). Caller id from `req.user.id` (house pattern: `TasksController.create`). **Identity never from the payload.**
- DTO `src/pulse/dto/upsert-check-in.dto.ts`: class-validator `@IsIn(MOODS)` / `@IsIn(ENERGIES)` (import the arrays from `./reading` — note they are `as const`; spread into mutable arrays if needed).
- Spec coverage: unauth rejection (house pattern: the SEC-01/SEC-05-era guard specs, e.g. `generator.controller.spec.ts`), DTO rejects out-of-vocabulary values, both endpoints delegate and return the service's view. Mock `PulseService`.

## 4. Remaining steps after 6 (in order, one red+green commit pair each)

**Step 7 — statistics firewall tripwire (BE):** a test asserting the stats response shape contains no Pulse-derived fields and `StatsModule`/`StatsService` has no import from `src/pulse/`. Cheap mechanical guard for ADR-0004's hard boundary. (May be a small spec-only commit if no code change is needed — that's fine, the "tripwire" is the deliverable.)

**Step 8 — FE data layer (vitest red → green):**
- `together-app-ui/lib/pulse.ts`: typed fetchers over the existing `api` client in `lib/api.ts` (cookies/401-refresh already handled there): `getToday()`, `upsertCheckIn({mood, energy})`.
- `derivePulseView(data)` pure function → one of four states: `empty` | `partner-first` | `solo` | `complete`. Mirror the server view type (see `PulseTodayView` in `pulse.service.ts`: `you`, `partner.{name,hasCheckedIn,checkIn}`, optional `reading`/`suggestion`).
- Tests in `together-app-ui/__tests__/` (house pattern: `validation.test.ts`, `tasksReducer.test.ts`).

**Step 9 — FE page (vitest/RTL red → green):** replace `app/(app)/pulse/page.tsx` (the "Coming soon — Gold challenge" placeholder dies here = CR-05 fixed). Requirements:
- Four states: (a) check-in form; (b) form + "Dan has checked in today" fact, content hidden, **no peek affordance**; (c) own editable check-in + solo copy **"Just you so far today."** — no Reading slot, nothing grayed; (d) both check-ins revealed, Reading leading (display type), suggestion beneath.
- Mood/energy as large labelled tappable choices, **≥44px targets**, radio-group semantics, visible focus.
- **Brand tokens only** (`bg-cr`, `text-sl`, `cm`/`cm-pale`; see `DESIGN.md`), calm palette — **no red→green ramp, no danger/success styling on any Reading**, divergent Readings styled identically to aligned ones.
- **No numerals rendered anywhere. The word "Score" never appears.** No nudge/reminder/"waiting" copy. No history of any kind.
- `motion-safe:` prefix on EVERY animation/transition class (global rule, no exceptions).
- Data flow: fetch on mount, refetch after submit and on window focus. **No TasksContext dependency** — identity from `useAuth()`, partner name comes from the endpoint. No new WS events.
- Save failures must surface a visible error (PRD user story 27).
- FE test footgun: `vi.mock` factories cannot reference module-level `let` vars — use `vi.fn()` inside the factory, `vi.mocked()` in tests.

**Step 10 — polish + docs (green commit):** copy pass against the no-pressure rules (em dashes are banned in user-facing copy — CR-05), update REDESIGN-PLAN.md Wave 5 status to done for FD-16, update the memory file (`wave5-status.md` in the auto-memory dir), run both suites, manually verify with the two seeded users if a local stack is available.

**After FD-16 ships:** the rest of Wave 5 (FD-07/08/09/10/11 auth surface, FD-12 rename, FD-15 logs tooling, FD-17 account IA, AUD-10/AUD-12 responsive) — **do not start any of these until Pulse is fully shipped and committed.**

## 5. Hard boundaries (ADR-0004 — violations are rework, not style)

- Pulse data NEVER flows into statistics or any analytics surface; tasks/chat/stats data NEVER flows into Pulse (incl. the LLM prompt — already enforced in step 5).
- Today only: no history tab, calendar, streak, trend, or count — ever.
- `suggestionSource` / `canonEntryId` are never serialized to the client (degradation is invisible; no "AI unavailable" anything).
- No re-roll/regenerate affordance. No nudges of any kind.
- One-sided day = warm solo state, never a partial/zero score.

## 6. Commands & process

- BE tests: `cd together-backend/together-backend; npx jest --no-coverage` → **176 passing** (type-check too: `npx tsc --noEmit -p tsconfig.json`).
- FE tests: `cd together-app-ui; npx vitest run` → **171 passing**.
- Commit style: see `git log --oneline -12`; every commit ends with the Claude co-author trailer; red commit before green commit per step.
- Uncommitted at handoff time: `REDESIGN-PLAN.md` (Wave 5 status update + pre-existing edits from before this session) and `.scratch/` docs — the user decides when these get committed.
- `git status` warnings about LF/CRLF are normal noise on this machine.

## 7. Suggested skills

- `/tdd` — invoke for every remaining step; the red→green discipline is non-negotiable in this repo.
- `/impeccable` — useful at step 9 for the page build/critique against DESIGN.md (it wrote the original critique that produced this backlog).
- `/verify` — after step 9/10 to confirm the four states against a running stack.
- `/handoff` — regenerate before context runs out again.
