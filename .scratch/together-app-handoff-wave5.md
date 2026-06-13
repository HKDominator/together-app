# Together App — Wave 5 Handoff

**Date generated:** 2026-06-12  
**Branch:** `refactor/together_app_v2_1`  
**For:** fresh agent picking up Wave 5

---

## 1. Where We Are

### Repository
- Working directory: `C:\Scoala\UBB\System Design and Implementation\together-app`
- Branch: **`refactor/together_app_v2_1`** (do not create a new branch)
- Main branch (PRs target): `main`

### Wave 4 status: 100% COMPLETE AND COMMITTED

All 8 steps are on `refactor/together_app_v2_1`. Test suite is fully green:

| Suite | Count | State |
|---|---|---|
| FE vitest (`together-app-ui`) | **171 passing** | ✅ green |
| BE jest (`together-backend`) | **111 passing** | ✅ green |
| E2E Playwright `e2e/tasks.spec.ts` | 0 passing | ⚠ pre-existing runner-mismatch — **always ignore** |

Wave 4 commits (most recent last):
- `e9357a9` — Step 1: socket auth plumbing
- `ed576c4` — Step 2: PresenceService + gateway hooks
- `e5a9810` — Step 3: PresenceContext + sidebar presence dot
- `20db610` — Step 4: viewing presence UI
- `0460469` — Step 5: completion moment (amber flash)
- `d283a80` — Step 6: FD-05 identity framing ("You" / partner name)
- `2b2ec95` — Step 7: statistics rebuild (Moved Together chart, leaderboard deleted)
- `a7e630c` — Step 8: account entry (sidebar footer + /account index)

---

## 2. One Uncommitted Fix to Commit First

Before doing anything else, commit the backend login fix that was applied but not yet committed in this session:

**Changed files (unstaged):**
- `together-backend/together-backend/src/auth/auth.service.ts`
- `together-backend/together-backend/src/auth/auth.service.spec.ts`

**What the fix does:** `passwordHash` and `securityPinHash` are `@Column({ select: false })` on the `User` entity. Plain `findOne()` silently omits them, causing `bcrypt.compare(password, undefined)` → "data and hash arguments required" crash on every login attempt.

Fixed via a private `findUserForAuth({ email?, id? })` helper in `AuthService` that uses `createQueryBuilder().addSelect('u.passwordHash').addSelect('u.securityPinHash').leftJoinAndSelect(...)`. The three callers (`beginLogin`, `verifyOtp`, `verifyPin`) now go through this helper instead of bare `findOne`. Spec updated to mock `createQueryBuilder` via a `mockQb` chain object.

**Commit command:**
```
cd together-backend/together-backend
git add src/auth/auth.service.ts src/auth/auth.service.spec.ts
git commit -m "Fix: select:false passwordHash/securityPinHash not loaded by findOne — use createQueryBuilder+addSelect in auth login/pin paths"
```

Verify: `npx jest --no-coverage` → 111 passing.

---

## 3. What Wave 5 Covers

Wave 5 items from REDESIGN-PLAN.md (fix-sequencing section):

1. **FD-16** — Couple Pulse (replaces the dead-end placeholder; kills CR-05 jargon copy). **This is the first and most complex item.**
2. Auth surface: **FD-07** (login step indicator), **FD-08+FD-11** (shared `AuthLayout`), **FD-09** (register copy), **FD-10** (PIN in collapsed section).
3. **FD-12** — Chat/workspace rename to relationship-centric copy.
4. **FD-15** — Admin logs search/filter/sort/pagination.
5. **FD-17** — Account IA (profile edit, password change, PIN change).
6. Responsive/touch: **AUD-10** (44px targets + touch-visible controls), **AUD-12** (responsive ChatPanel).

---

## 4. IMMEDIATE FIRST TASK — Pulse Build Plan (NO CODE YET)

**The absolute first task for Wave 5 is to produce a written architectural build-plan brief for Couple Pulse.**

This plan must be written and presented to the user for approval **before a single line of application code is written**. Do not create files, do not scaffold a module, do not touch any `.ts`/`.tsx`/`.css` file until the plan is signed off.

### What the build plan must cover

The plan is a structured brief (markdown, not prose), covering:

1. **Data model** — What new BE entities/columns are needed?
   - `pulse_checkins` table: schema, column types, constraints
   - Uniqueness rule: one check-in per partner per Pulse Day (local calendar day)
   - History retention policy (rows kept, never surfaced in UI per ADR-0004)

2. **Backend module structure**
   - NestJS module name and location
   - Service(s): check-in CRUD, Reading computation, Ollama suggestion, fallback list
   - Controller: REST endpoints (what URLs, what guards, what DTOs)
   - Gateway hook (if any WS events needed for reveal-after-you-share)
   - OllamaClient extraction: currently at `together-backend/src/logging/ai/ollama.client.ts` — plan whether to extract to a shared module or import directly

3. **Reading computation**
   - The deterministic rule table (mood × energy → Reading name from fixed vocabulary)
   - Rule table must live in code, not the LLM
   - No numerals; named readings only ("In step", "Different speeds today", etc.)

4. **LLM contract**
   - Exactly one job: generate the suggested activity
   - Generated once per Pulse Day server-side when the second check-in lands, then stored
   - Prompt inputs: both check-ins, the Reading, both first names, local time-of-day/day-of-week, curated candidates for that Reading
   - Fallback: curated static list keyed by Reading (~6–10 activities each); invisible degradation (no error banner)
   - Output validation: length cap + must trace to a candidate

5. **Frontend surface**
   - Page location: `app/(app)/pulse/page.tsx` (already exists as placeholder)
   - State machine: own-check-in-pending / partner-visible-but-content-hidden / both-in → Reading + activity revealed
   - No nudge, no reminder, no "partner is waiting" copy
   - One-sided day: warm solo state ("Just you so far today"), never a partial score
   - Visual palette: no red→green ramp; divergent readings use the same calm palette as aligned ones

6. **Test strategy**
   - Which pieces need BE unit tests (service, rule table, fallback logic)
   - Which pieces need FE vitest (context/hook, page render, state-machine transitions)
   - What to mock (OllamaClient, date/time)

7. **Step sequence** — How many commits, in what order (TDD: failing test first per step)
   - Suggested: (a) BE data model + migration, (b) Reading rule table + service, (c) Ollama/fallback activity generation, (d) REST endpoints + tests, (e) FE context/hook, (f) FE page UI

8. **Constraints from ADR-0004 to explicitly call out in the plan:**
   - Statistics firewall: Pulse data must NOT flow into `app/(app)/statistics/page.tsx` or any analytics surface
   - No history tab, calendar, streak, or trend — ever — without reopening ADR-0004
   - No "Score" next to anything countable in the UI
   - Degradation is invisible (user cannot tell if Ollama was used)

### Reference documents the plan must be grounded in

| Document | Path |
|---|---|
| ADR-0004 (Couple Pulse decision) | `docs/adr/0004-couple-pulse.md` |
| REDESIGN-PLAN.md (Wave 5 section) | `REDESIGN-PLAN.md` |
| PRODUCT.md (product principles) | `PRODUCT.md` (if present) |
| DESIGN.md (visual/motion rules) | `together-app-ui/DESIGN.md` |
| Existing Ollama client | `together-backend/together-backend/src/logging/ai/ollama.client.ts` |
| Existing Pulse page (placeholder) | `together-app-ui/app/(app)/pulse/page.tsx` |
| Existing anomaly service (Ollama pattern to follow) | `together-backend/together-backend/src/logging/ai/anomaly-detector.service.ts` |

Read all of these before writing the plan. Do not guess the Ollama client interface — read the actual file.

---

## 5. Process Rules for This Session

1. **WRITE THE BUILD PLAN FIRST.** Present it to the user. Do not touch application code.
2. **Wait for explicit approval** before starting any implementation.
3. **TDD throughout** once approved: failing test written and committed first, then implementation, then green commit. One commit per logical step.
4. **No application code committed without a preceding failing test commit.** This has been the discipline for all of Waves 1–4.
5. **The Playwright e2e test always fails** (`e2e/tasks.spec.ts` runner-mismatch) — ignore it in the count; never try to fix it.
6. **Do not start FD-07, FD-08, FD-09, FD-10, FD-11, FD-12, FD-15, FD-17, AUD-10, or AUD-12** until Couple Pulse is fully shipped and committed.

---

## 6. Key Technical Context

### Frontend stack
- Next.js 15 (App Router), TypeScript, Tailwind v4, Vitest + React Testing Library
- State: `TasksContext` (useReducer + WS), `PresenceContext`, `AuthContext`
- `vi.mock` hoisting rule: factory functions cannot reference module-level `let` vars; use `vi.fn()` inside the factory, `vi.mocked()` in tests
- `motion-safe:` prefix is mandatory on all animation/transition classes (DESIGN.md §5 — global, no exceptions)

### Backend stack
- NestJS, TypeORM + PostgreSQL, Socket.io, Jest
- Auth: 3-step login (password → OTP → PIN), bcrypt, httpOnly cookies
- `select: false` on sensitive entity columns (`passwordHash`, `securityPinHash`) — any service that needs them must use `createQueryBuilder + addSelect`
- Ollama client at `together-backend/src/logging/ai/ollama.client.ts` — injectable, JSON-mode, health-checked; `isAvailable()` for graceful degradation

### ADR constraints active
- **ADR-0001**: Statistics = shared-progress only; no per-person split
- **ADR-0002**: Presence rides the existing tasks socket; no second WS connection
- **ADR-0003**: Single-tenant by design
- **ADR-0004**: Pulse = Couple Pulse (full spec in `docs/adr/0004-couple-pulse.md`)

---

## 7. Summary

Wave 4 is 100% shipped. The branch is `refactor/together_app_v2_1`. Test suite is green (171 FE / 111 BE).

**Your first two actions:**
1. Commit the uncommitted backend login fix (see Section 2 above).
2. Read ADR-0004 and write the Couple Pulse architectural build plan. Present it. Wait for approval. Do not write any application code until the user approves the plan.
