# Together App — Handoff: Phase 3 Complete / Wave 4 Ready

**Date:** 2026-06-11  
**Branch:** `refactor/together_app_v2_1`  
**Working directory:** `C:\Scoala\UBB\System Design and Implementation\together-app`  
**Authoritative plan:** `REDESIGN-PLAN.md` (root of repo — fully up to date as of Wave 3 completion)

---

## Where we are

**Waves 1, 2, and 3 are 100% complete.** All backlog items committed on `refactor/together_app_v2_1`. `REDESIGN-PLAN.md` is updated to reflect this.

### Test suite (current, all passing)

- Frontend (vitest): **107 tests**
- Backend (jest): **97 tests**
- Pre-existing Playwright e2e failure (`e2e/tasks.spec.ts`) is a runner-mismatch, unrelated to any wave work — ignore it.

### What each wave delivered

**Wave 1 — foundations** (AUD-01/02/05/09/13/14, BUG-02/03/17/18/19, BUG-32)
- Brand token block in `globals.css` → focus rings, link colors, heading font all now render
- Identity wire: `useAuth().user.id` threaded into task/comment creation and "mine" checks (5 bugs resolved by one root fix)
- GraphQL client: `credentials:'include'` added

**Wave 2 — mechanical token/markup sweep** (AUD-03/04/06/07/08/11/15, CR-06/11/12, FD-13/14)
- All ~55 inline hex styles → token classes; banned cream purged; stale navy migrated
- Heading hierarchy fixed across all auth pages; nested admin `<Link>` flattened
- ARIA labels on icon-only controls; priority conveyed by shape not color; task rows keyboard-navigable

**Wave 3 — correctness fixes** (all BUG-xx + CR-xx items)
- Backend: chat timestamps, due-date validation, stats math, role unification, setState locking, admin delete FK handling, session metadata, long-tail items
- Frontend UX: device labels, surfaced error states on revoke/resolve/submit, PIN back button, styled confirm dialogs, poll control
- Offline/realtime: tempId remap on drain, drain error surfacing, per-op localStorage keys, totalTasks dedup, REPLACE_ID idempotent, reconnect resync, WS polling fallback, ChatPanel disconnect guard, realtime comments (WS), debounced server-side search

---

## Immediate next step — PRESENT ARCHITECTURE, DO NOT WRITE CODE

The fresh agent's immediate next step is to **present the architectural approach for Wave 4 Dual-Presence (FD-05 / FD-06)** to the user for review and approval before any implementation begins.

**Do not write code. Do not start Wave 4. Present the plan first.**

Wave 4 is the signature build (see ADR-0002). The user has explicitly required a hard checkpoint here:
> "Do NOT start Wave 4 or Wave 5 without explicit user confirmation."

### What to present (architecture brief for Wave 4)

Wave 4 scope from `REDESIGN-PLAN.md`:
- **FD-06** — dual-presence: server-side partner online/viewing state over the authenticated sockets (sidebar dot, task-row co-presence, modal co-presence per DESIGN.md §5). The presence dot is currently a stub that is always offline.
- **FD-05** — mine/theirs identity layer on tasks and comments (the identity wire from Wave 1 wired the `userId`; Wave 4 builds the visual framing: task cards show who created/is assigned, comments show whose is whose).
- **FD-03 + FD-04** — leaderboard removal + shared-progress view (replaces the contribution ranking; CR-01 fabricated KPIs and CR-07 hardcoded legend names die with this rebuild).
- **FD-01 + FD-02** — account entry point (sidebar footer user menu → `/account` index page).

Dependencies:
- SEC-04 (authenticated WebSockets) is done on the security hotfix branch. The sockets use JWT from the HttpOnly cookie at handshake; `senderId` is derived server-side. Wave 4 presence builds on this authenticated socket.
- Wave 1 identity wire is done. Task/comment `createdById`/`authorId` are real user IDs.

The architectural questions to resolve before coding:
1. **Presence state storage**: in-memory per process (fine for single-tenant) vs. Redis (required for horizontal scaling)? Given single-tenant ADR-0003, in-memory is acceptable.
2. **Presence events**: `user:online` / `user:offline` on `connect`/`disconnect`; `user:viewing` for task-modal co-presence?
3. **Mine/theirs visual layer**: where does the framing live — TaskCard, task list row, CommentsThread? Does it come from a new context value or is it derived locally via `useAuth().user.id`?
4. **Shared-progress view**: replaces the stat cards + leaderboard on `/statistics`; what shape (weekly chart of joint completions, no per-person breakdown)?
5. **Account IA**: sidebar footer → account menu → `/account` with profile / security / sessions sub-pages.

Present these as a concrete proposal (data flow, component changes, new socket events) and wait for user sign-off before writing any implementation.

---

## Hard checkpoints — USER REVIEW REQUIRED before proceeding

| Before | Why |
|--------|-----|
| **Wave 4** | Dual-presence (FD-06) and mine/theirs (FD-05) are the signature identity features — user must approve the architectural approach before the build starts |
| **Wave 5** | Couple Pulse build (FD-16) — PRD exists at `scratch/couple-pulse/PRD.md`; user must sign off on the build plan before execution |

---

## Security track status (separate from Wave work)

- **Done (on `hotfix/security-phase1`):** SEC-01–07
- **Done (on this branch, during Wave 1/2 sprint):** SEC-08 (rate limiting), SEC-13 (JWT alg pinning), two unplanned guards (`UsersController`, `StatsController`)
- **Pending:** SEC-09/10/11/12, SEC-14–17

Do not address SEC-09–17 in Wave 4 work unless a specific feature requires it.

---

## Key architecture facts

**Monorepo layout:**
```
together-app/
  together-backend/        # NestJS API (TypeORM, GraphQL, REST)
  together-app-ui/         # Next.js 15 + Tailwind v4 frontend
  REDESIGN-PLAN.md         # Single source of truth for backlog + wave plan
  docs/adr/                # ADR-0001 through ADR-0004
  scratch/couple-pulse/    # PRD.md for Wave 5 Pulse feature
```

**Test commands:**
- Frontend: `npx vitest run` from `together-app-ui/`
- Backend: `npx jest` from `together-backend/together-backend/`

**Tailwind v4 token classes** (`together-app-ui/app/globals.css`):
- `bg-cr` / `text-cr` / `var(--color-cr)` = Crimson `#C0392B`
- `bg-sl` / `text-sl` = Slate navy `#1A2535`
- `bg-cm` / `text-cm` = Clay mauve `#F2EAE3`
- `bg-cm-pale`, `bg-cr-pale` = pale tints

**Auth pattern:**
- JWT in HttpOnly cookie; `AuthGuard` on all REST + GraphQL routes
- `useAuth()` → `user.id` is the only correct source for `currentUserId` — never hardcode

**WS pattern (post-SEC-04):**
- Sockets authenticated at handshake (JWT from cookie verified server-side)
- `senderId` / `authorId` derived server-side from the JWT claim — never trusted from client payload

**TasksContext shape** (`context/TasksContext.tsx`):
- `drainError` / `clearDrainError` / `ownCreatedIds` / `ownDeletedIds` / `hasConnectedRef` added in Wave 3
- `refreshOnce()` in `lib/api.ts` provides single-flight 401 refresh

---

## Key reference files

| Path | Purpose |
|------|---------|
| `REDESIGN-PLAN.md` | Full backlog table + ADR decisions + wave plan (authoritative) |
| `docs/adr/0002-dual-presence-identity-signature.md` | ADR for Wave 4 (FD-05/FD-06) |
| `docs/adr/0001-remove-leaderboard-shared-progress.md` | ADR for FD-03/FD-04 |
| `docs/adr/0004-couple-pulse.md` | ADR for Wave 5 Pulse |
| `together-app-ui/app/globals.css` | Token definitions |
| `together-app-ui/context/AuthContext.tsx` | Auth state |
| `together-app-ui/context/TasksContext.tsx` | Task state + offline/realtime machinery |
| `together-app-ui/lib/api.ts` | REST + GraphQL client |
| `together-app-ui/lib/ws.ts` | Socket.io client (task WS) |
| `together-backend/src/tasks/tasks.gateway.ts` | Task WS gateway (emits task + comment events) |
| `together-backend/src/chat/chat.gateway.ts` | Chat WS gateway (authenticated handshake) |

---

## Suggested skills

- `/tdd` — for Wave 4 implementation (when approved): one item at a time, RED→GREEN→commit
- `/security-review` — run before Wave 4 if the WS auth flow changes significantly
