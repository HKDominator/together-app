# Together App — Handoff: Wave 4 Steps 5–6

**Date:** 2026-06-11  
**Branch:** `refactor/together_app_v2_1`  
**Working directory:** `C:\Scoala\UBB\System Design and Implementation\together-app`  
**Authoritative plan:** `REDESIGN-PLAN.md` (root of repo — updated as of Step 4 completion)

---

## Current state

**We are on branch `refactor/together_app_v2_1`.  
Wave 4 Steps 1 through 4 are 100% complete. The test suite is green: 141 FE vitest / 111 BE jest.**  
(One pre-existing Playwright e2e failure in `e2e/tasks.spec.ts` is a runner-mismatch — ignore it.)

### Commits (newest first)

| Hash | Step | Summary |
|------|------|---------|
| `20db610` | Step 4 | FD-06 viewing presence: detail + modal + task-row bubble, BUG-25 guard |
| `e5a9810` | Step 3 | FD-06 PresenceContext + sidebar presence dot |
| `ed576c4` | Step 2 | FD-06 backend PresenceService + TasksGateway hooks |
| `e9357a9` | Step 1 | FD-06 socket plumbing: withCredentials + attachAuthReconnect |

### What Steps 1–4 built

- **Step 1** — Both sockets get `withCredentials: true`. `attachAuthReconnect` on the tasks socket: on disconnect, refresh the access token and reconnect so the socket always carries fresh auth.
- **Step 2** — Backend `PresenceService` + `TasksGateway` hooks: `presence:state` snapshot emitted on socket join (seeds client), `presence:online/offline` on connect/disconnect (5 s grace via `PRESENCE_OFFLINE_GRACE_MS`), `presence:viewing` delta forwarded to partner.
- **Step 3** — `context/PresenceContext.tsx`: rides the tasks socket (ADR-0002 — no second connection), seeds `onlineUserIds` and `viewingByUser` from `presence:state` on every connect+reconnect, patches via deltas, re-emits own viewing focus on reconnect. `Sidebar.tsx`: self always green, partner dot = `onlineUserIds.has(id)`, `motion-safe:animate-pulse`. `app/(app)/layout.tsx` wraps with `<PresenceProvider>`.
- **Step 4** — `TaskDetailContent` extracted from `TaskDetailPage` for testability (Next.js 15 `use(params)` / jsdom Suspense limitation). Detail page and edit modal call `setViewingTask(id)` on mount and `setViewingTask(null)` on unmount. BUG-25 guard: `tmp_*` ids are silently no-oped. Co-presence "Ana is looking at this too" line on detail page. Partner initials bubble on task row. `usePresence()` returns safe empty default outside provider.

### Key files changed in Wave 4

```
together-app-ui/context/PresenceContext.tsx         (new)
together-app-ui/components/layout/Sidebar.tsx       (modified)
together-app-ui/app/(app)/layout.tsx                (modified)
together-app-ui/app/(app)/tasks/[id]/page.tsx       (modified — TaskDetailContent extracted)
together-app-ui/app/(app)/tasks/page.tsx            (modified)
together-app-ui/components/tasks/TaskFormModal.tsx  (modified)
together-app-ui/__tests__/presence-context.test.tsx (new — 9 tests)
together-app-ui/__tests__/sidebar-presence-dot.test.tsx     (new — 5 tests)
together-app-ui/__tests__/task-detail-viewing.test.tsx      (new — 4 tests)
together-app-ui/__tests__/task-form-modal-viewing.test.tsx  (new — 4 tests)
together-app-ui/__tests__/task-row-partner-bubble.test.tsx  (new — 4 tests)
together-app-api/src/presence/presence.service.ts   (new)
```

---

## Immediate next step — Step 5: Completion moment

**Use `/tdd`. Show the failing test first before writing any implementation. Do not start Step 6 until Step 5 is green and you stop for review.**

### What to build

When a `task:updated` WebSocket event arrives from the server and the state transition is `not-done → done` (i.e., previous state was `todo` or `in_progress`, new state is `done`) **and the partner is currently online** (`onlineUserIds.has(partnerId)`), briefly flash the task's state chip with a warm amber highlight.

Flash must appear on **both**:
1. The state chip in the **task row** on `tasks/page.tsx`
2. The state chip on the **task detail page** (`app/(app)/tasks/[id]/page.tsx`)

#### `TasksContext` changes

Add `lastCompletion: { taskId: string; completedAt: number } | null` to the context value. Whenever a `task:updated` event arrives that satisfies the not-done→done transition with partner online, set `lastCompletion` to `{ taskId, completedAt: Date.now() }`. Clear it after the animation window (500 ms is enough).

- `lastCompletion` should live in `TasksContext` (not `PresenceContext`) because it's derived from a task-state change, not a presence event.
- The context still needs `onlineUserIds` from `PresenceContext` to evaluate the partner-online guard; import `usePresence` inside `TasksContext` provider (or pass it as a prop/ref).

#### UI wiring

On both the row chip and the detail chip:
- When `lastCompletion?.taskId === task.id` (and within the flash window), apply a warm amber ring or background flash: `ring-2 ring-amber-400` or a short `bg-amber-50` → normal crossfade.
- `prefers-reduced-motion`: use `motion-safe:` prefix on all transition/animation classes. Under reduced motion, show a solid amber ring for the same duration with no animation — a static, accessible indicator.
- The flash is a one-shot highlight, not a persistent state change. After ~500 ms (or after the CSS transition ends), `lastCompletion` is cleared.

#### Accessibility

The flash is purely decorative. The state chip already shows "Done" as text. No additional ARIA needed — just ensure `motion-safe:` prefixes are correct.

#### Protocol reminder

The `task:updated` event payload shape (from `together-app-api`):
```typescript
// ServerEvents in together-app-ui/lib/ws.ts — already typed
'task:updated': (task: Task) => void
```
The previous task state is already in `TasksContext`'s in-memory `tasks` array. Compare `tasks.find(t => t.id === task.id)?.state` (before update) vs `task.state` (after) to detect the transition.

---

## Step 6: FD-05 mine/theirs framing sweep

**Execute after Step 5 is reviewed and approved. Use `/tdd`.**

### What to build

Replace all hardcoded names and "your/mine" language with dynamic identity-aware labels, using the two-person model already established (`currentUser` and `partner` from `useTasks()`).

Locations to sweep (non-exhaustive — read the components and find all instances):

1. **Task rows** (`tasks/page.tsx`) — any "Assigned to you" or "Created by you" text → "You" (if `assigneeId === currentUser.id`) or partner's `name`.
2. **Task detail page** — same pattern for assignee and creator lines.
3. **Comments** — comment author display: "You" vs partner name (already partially wired; verify consistency).
4. **No list segregation** — do NOT split tasks into "mine" and "theirs" tabs or sections. The single unified list with inline "You / [Name]" labels is the FD-05 design.

Identity derives from `currentUser` already present in `TasksContext`. Partner is `users.find(u => u.id !== currentUser?.id)`.

---

## Steps 7–8 (for context, do not build yet)

- **Step 7** — FD-03 leaderboard removal + FD-04 shared-progress view ("moved together" chart, two summary lines, no new backend endpoint, no per-person split per ADR-0001). CR-01 and CR-07 die here.
- **Step 8** — FD-01 + FD-02 account entry point + index page.

---

## Architectural constraints (binding)

| ADR | Rule |
|-----|------|
| ADR-0002 | Presence rides the existing tasks socket via `getSocket()` — no second WS connection ever |
| ADR-0003 | Single-tenant; in-memory presence is fine, no Redis |
| ADR-0001 | Statistics = shared-progress only, no per-person split |
| BUG-25 guard | `setViewingTask` silently no-ops `tmp_*` ids |
| reduced-motion | `motion-safe:` prefix on every animation/transition class — global, no exceptions (DESIGN.md §5) |

## Running the test suite

```bash
# FE (from together-app-ui/)
npx vitest run

# BE (from together-app-api/)
npx jest --runInBand
```
