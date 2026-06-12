# Together App — Handoff: Wave 5 critique pass + next phase

**Date:** 2026-06-12
**Branch:** `refactor/together_app_v2_1`
**Test baseline:** 225 FE vitest / 192 BE jest (permanently broken `e2e/tasks.spec.ts` excluded always)

---

## What happened this session

### Wave 5 UI cleanup sweep — COMPLETE

All 7 items done with strict TDD (red commit then green commit per item):

| Item | Commit (red) | Commit (green) | Summary |
|------|-------------|----------------|---------|
| FD-07 | `024371f` | `bdb569b` | `StepProgress` nav in login — 3-step `aria-current="step"` indicator |
| FD-10 | `cc3fa24` | `9195dec` | PIN field in collapsed "Advanced" toggle on register; "3FA" jargon gone |
| FD-11 | `5dfc12a` | `a3fdea4` | forgot-password + reset-password adopt split 2-col layout |
| FD-12 | `4516e1d` | `b2ab7c9` | ChatPanel header shows partner name via `useTasks()`; "Workspace" → "Together" in sidebar |
| AUD-10/12 | `1614198` | — | Close+Send `min-h-[44px]`; chat panel `w-[calc(100vw-3rem)] sm:w-80 max-w-sm` |
| FD-17 | `3032145` | `b9bf8b3` | Account index → real `<Link>` cards; stub pages at `/account/profile` and `/account/security` |

Docs updated in `43e614d`. FD-08/09 explicitly NOT in scope; FD-15 (logs tooling) explicitly deferred as last step.

### `/impeccable critique pulse` + fixes — COMPLETE (`276124e`)

Pulse page scored 25/40 on 2026-06-12. Two P1s and two P2s fixed in one commit:
- **P1 load-error trap:** split `if (loading || !view)` into separate guards; `setLoading(true)` at start of `load()`; `hasEverLoaded` ref for retry recovery
- **P1 "Today's reading" framing:** added section label above reading result
- **P2 partner-first copy:** "has checked in today." → "is already in."
- **P2 success moment:** `pulseStateIn` keyframe (260ms ease-out) in `globals.css`; `pulse-state-in` class on state-transition paragraphs and complete section
- Two new load-failure recovery tests added to `pulse-page.test.tsx`

### `/impeccable critique statistics` + fixes — COMPLETE (`138aeb4`)

Statistics page scored 22/40 on 2026-06-12 (down from 24 on 2026-06-09 — prior critique predated the rebuilt page). Two P1s, three P2s, one P3 fixed:
- **P1 motion-safe:** `useCountUp` hook removed (was powering removed stat cards); `motion-safe:` added to donut SVG circles and both tab buttons
- **P1 Token Law:** semantic color tokens added to `globals.css @theme inline` (`--color-success`, `--color-info`, `--color-warning`, `--color-danger` + pale variants, `--color-surface`, `--color-bg`); `donutData`/`priorityData` colors now reference `var(--color-*)` CSS custom properties; all `text-gray-*` replaced with `text-sl`/`text-sl-muted`/`text-sl-dim`; SVG inline fill attrs removed
- **P2 Workspace breadcrumb:** removed entirely (stale after FD-12)
- **P2 Gamification pressure:** 4-card metric dashboard (emoji + ↑/↓ colored trend arrows) replaced with compact summary strip (baseline number + label, no directional pressure, no green/red)
- **P2 DonutChart a11y:** `role="img" aria-label="Task status: X done…"` on SVG
- **P2 Tabular mobile overflow:** `overflow-x-auto` + `min-w-[560px]` wrapper; 6-column grid now scrolls instead of clipping
- **Full card rethink:** "Moved Together" is now the hero section; status/priority charts in a 2-col grid below

---

## Critique scorecard (all surfaces)

| Surface | File | Last score | Date | P0 | P1 | Addressed? |
|---------|------|-----------|------|----|----|------------|
| Login | `app/login/page.tsx` | 18/40 | 2026-06-09 | 1 | 2 | Partial — FD-07 added step progress; P0/P1s not directly fixed |
| Register | `app/register/page.tsx` | no score | 2026-06-09 | — | — | Partial — FD-10 added Advanced PIN |
| Tasks | `app/(app)/tasks/page.tsx` | 26/40 | 2026-06-09 | 0 | 3 | **No** — highest priority for next session |
| Chat | `components/chat/ChatPanel.tsx` | 21/40 | 2026-06-09 | 0 | 3 | Partial — FD-12 fixed header; P1s not directly fixed |
| Statistics | `app/(app)/statistics/page.tsx` | 22/40 | 2026-06-12 | 0 | 0 | **Yes — this session** |
| Admin/Users | `app/(app)/admin/users/page.tsx` | 24/40 | 2026-06-09 | 0 | 1 | No |
| Account/Sessions | `app/(app)/account/sessions/page.tsx` | 18/40 | 2026-06-09 | 1 | 3 | No |
| Pulse | `app/(app)/pulse/page.tsx` | ~30/40 est. | 2026-06-12 | 0 | 0 | **Yes — this session** |

Re-critique login, register, chat, and account/sessions to get updated scores post-Wave-5-UI-fixes before treating the old findings as current.

---

## Next phase: 4-part plan

The user specified this order: tasks critique → app consistency check → motion pass → harden.

### 1. `/impeccable critique tasks`

Target: `together-app-ui/app/(app)/tasks/page.tsx`

Prior score: **26/40** (3 P1s). The critique snapshot is at `.impeccable/critique/2026-06-09T15-17-35Z__together-app-ui-app-app-tasks-page-tsx.md` — re-read this before starting; do NOT treat the 2026-06-09 findings as current (the page has been significantly rebuilt since).

The task page is the most-used surface. It drives the primary couple workflow. Score it fresh, implement all P0/P1s, and use the same pattern as Pulse/Statistics: critique → AskUserQuestion → implement.

### 2. App-wide consistency check

A systematic sweep of the entire frontend for cross-surface inconsistencies. Key things to look for:

**Copy inconsistencies:**
- Any remaining "Workspace" references (FD-12 renamed to "Together" — check all pages)
- Any "Coming soon" copy surviving outside FD-15 deferred logs (FD-17 removed it from account; check elsewhere)
- Breadcrumbs that reference wrong section names

**Token Law audit:**
- Any `text-gray-*`, `bg-gray-*` classes that should be brand tokens (`text-sl`, `text-sl-muted`, `text-sl-dim`, `bg-cm`, `bg-cm-pale`)
- Any `style={{ color: '#hex' }}` or `style={{ background: '#hex' }}` with hardcoded hex (data-driven avatar colors are exempt)
- Any `bg-white` that should be `bg-surface`
- Pages to check: `app/(app)/tasks/page.tsx`, `app/(app)/tasks/[id]/page.tsx`, `app/(app)/admin/logs/page.tsx`, `app/(app)/admin/users/page.tsx`, `app/(app)/account/sessions/page.tsx`, `app/login/page.tsx`, `app/register/page.tsx`, `components/chat/ChatPanel.tsx`, `app/(app)/layout.tsx`, `components/layout/Sidebar.tsx`

**Component vocabulary:**
- `StateChip` and `PriorityBadge` still use `bg-gray-100 text-gray-600` etc. rather than brand tokens — flag but may be intentional (they're inherited from pre-token era)
- Confirm all primary buttons use `bg-cr` not `bg-red-*`
- Confirm all secondary buttons follow ghost pattern (`transparent` / `bg-cm` on hover)

**Loading states:**
- Does every async page have a loading skeleton or a "Getting…" loading copy? (Pulse has it; statistics relies on `useTasks` context; tasks page status TBD)

### 3. Motion pass

A dedicated sweep of all animation and transition usage:

**Checklist:**
- Every `transition-*` class has `motion-safe:` prefix — run `grep -r "transition-" --include="*.tsx" --include="*.ts" | grep -v "motion-safe:"` across `app/` and `components/`
- Every `animation-*` class has `motion-safe:` prefix
- Every CSS keyframe in `globals.css` has a `@media (prefers-reduced-motion: reduce)` override or is already covered by the global `*` rule at the bottom
- The global `prefers-reduced-motion` block in `globals.css` sets `animation-duration: 0.01ms` — verify this applies to all custom keyframes (pageFadeIn, rowFadeIn, modalSlideUp, backdropFade, pulseStateIn, statPop, presencePulse)
- `button:active:not(:disabled) { transform: scale(0.97) }` in globals.css has no `motion-safe:` guard — this is a global rule that fires for all users including reduced-motion users; the global `*` rule at the bottom should suppress it but verify

**Duration calibration:**
- Product register: 150–250ms on most transitions (users are in flow)
- Check any `duration-700` or `duration-500` in product surfaces — these are on the long end for interactive elements (OK for data viz bars/charts, not OK for hover/focus feedback)

### 4. Harden

Systematic error + edge case pass. Scope: the core couple-facing surfaces (tasks, pulse, statistics, account).

**Error state checklist per surface:**
- What happens if the API call fails on mount? Is there a retry affordance? (Pulse: yes — fixed this session. Statistics: relies on useTasks context; tasks: TBD)
- What is the empty state? Does it acknowledge the pair and the situation, or just show zeros/nothing?
- Are form error messages plain-language, near the source, and non-blocking (don't wipe the form)?
- Is the save error visible and recoverable? (Pulse: yes — `role="alert"` with sanitized message)

**Edge cases to verify:**
- 0 tasks (tasks page empty state)
- Very long task titles (truncation in tabular view, wrapping in detail view)
- Both partners offline (presence dots, chat state)
- Session expiry mid-flow (global auth error dispatch — verify it fires correctly from `useTasks` and `pulseApi`)

---

## Key technical reminders for next session

- **Permanently broken e2e:** `e2e/tasks.spec.ts` — never touch, always ignore its failure
- **ADR-0004 hard rules (Pulse only):** No "Score", no numerals, no nudge copy, `motion-safe:` on everything, no TasksContext dependency
- **ADR-0001 (statistics):** No per-person split anywhere in the stats surface
- **`motion-safe:` is a DESIGN.md §6 hard rule** with no exceptions — the global `prefers-reduced-motion` block covers keyframes but Tailwind `transition-*` classes need individual `motion-safe:` prefixes
- **Token Law:** Every static color in the codebase must be a token class (`bg-cr`, `text-sl-muted`) or CSS custom property (`var(--color-success)`). Hardcoded hex in `style={}` or `stroke=` is a violation unless it is a data-driven runtime value (user avatar color)
- **Semantic color tokens now in globals.css** (added this session): `--color-success`, `--color-success-pale`, `--color-info`, `--color-info-pale`, `--color-warning`, `--color-warning-pale`, `--color-danger`, `--color-danger-pale`, `--color-surface`, `--color-bg`
- **`font-display` token** is defined: `--font-display: var(--font-geist-sans)` — use `font-display` class on display headings
- **Impeccable critique flow:** `context.mjs` once per session → `reference/critique.md` → `reference/product.md` → read the target file → run `detect.mjs --json [target]` → Assessment A + B → synthesize → persist snapshot → `AskUserQuestion` → implement

---

## Files changed this session (complete list)

```
together-app-ui/__tests__/login-step-progress.test.tsx          (created — FD-07 red)
together-app-ui/app/login/page.tsx                              (updated — FD-07 green)
together-app-ui/__tests__/register-pin-advanced.test.tsx        (created — FD-10 red)
together-app-ui/app/register/page.tsx                           (updated — FD-10 green)
together-app-ui/__tests__/auth-layout-standard.test.tsx         (created — FD-11 red)
together-app-ui/app/forgot-password/page.tsx                    (updated — FD-11 green)
together-app-ui/app/reset-password/page.tsx                     (updated — FD-11 green)
together-app-ui/__tests__/chat-header-partner.test.tsx          (created — FD-12 red)
together-app-ui/components/chat/ChatPanel.tsx                   (updated — FD-12 green)
together-app-ui/__tests__/chat-panel.test.tsx                   (updated — added useTasks mock)
together-app-ui/__tests__/chat-panel-send-disconnected.test.tsx (updated — added useTasks mock)
together-app-ui/components/layout/Sidebar.tsx                   (updated — "Workspace" → "Together")
together-app-ui/__tests__/chat-responsive-touch.test.tsx        (created — AUD-10/12)
together-app-ui/__tests__/account-ia.test.tsx                   (created — FD-17 red)
together-app-ui/app/(app)/account/page.tsx                      (updated — FD-17 green)
together-app-ui/app/(app)/account/profile/page.tsx              (created — stub)
together-app-ui/app/(app)/account/security/page.tsx             (created — stub)
together-app-ui/app/(app)/pulse/page.tsx                        (updated — critique fixes)
together-app-ui/__tests__/pulse-page.test.tsx                   (updated — critique fixes)
together-app-ui/app/globals.css                                 (updated — pulseStateIn + semantic tokens)
together-app-ui/app/(app)/statistics/page.tsx                   (updated — critique fixes)
REDESIGN-PLAN.md                                                (updated — Wave 5 docs)
memory/wave5-status.md                                          (updated)
.impeccable/critique/2026-06-12T14-37-15Z__...-pulse-page-tsx.md   (created)
.impeccable/critique/2026-06-12T15-03-14Z__...-statistics-page-tsx.md (created)
```
