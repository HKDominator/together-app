# Together v2 Redesign Plan

## Findings backlog (Phase 1)

Consolidated, deduped index of every Phase 1 finding across all four review passes. This table is the single source of truth for _what_ needs doing; the detailed write-ups live below (and the raw per-surface design critiques in [CRITIQUES-RAW.md](CRITIQUES-RAW.md)).

- **Sources:** `critique` = impeccable per-surface design critique · `audit` = impeccable code-level audit · `security` = backend/frontend security review · `bugsweep` = functional bug sweep.
- **Severity scale:** Critical / High / Medium / Low (+ Info). **impeccable P0–P3 map as:** P0 → Critical, P1 → High, P2 → Medium, P3 → Low.
- **Dedupe:** findings raised by more than one pass are listed once, with every contributing pass in the `source` column. Detail IDs (`SEC-xx`, `BUG-xx`, `AUD-xx`, `CR-xx`) point at the sections below.
- The two tables split **Fixes** (correctness, security, a11y, token/theming violations — things with a right answer) from **Feature/identity decisions** (product calls: what to build, remove, or rename). Minor cosmetic observations are not row-itemized here; they remain verbatim in CRITIQUES-RAW.md.

### Fixes

Bugs, security, accessibility, and token/theming violations. Ordered by severity.

| ID     | source                    | surface                                   | finding                                                                                                                                     | conf.    | severity     |
| ------ | ------------------------- | ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ------------ |
| SEC-01 | security                  | be · graphql                              | GraphQL resolvers unguarded — unauthenticated read/write to the whole data model, bypasses RBAC (incl. `deleteTask`)                        | High     | **Critical** |
| AUD-01 | audit, critique           | fe · forms                                | App-wide focus indicator never renders (`focus:ring-cr-pale`/`focus:border-cr` undefined in FormInput); WCAG 2.4.7                          | High     | **Critical** |
| SEC-02 | security                  | be · auth                                 | `/auth/dev/inbox` fail-open OTP/reset-code oracle (`MAIL_DEV` defaults true) → account takeover                                             | High     | High         |
| SEC-03 | security                  | be · auth                                 | Hardcoded fallback JWT secret when `JWT_SECRET` unset → forge admin tokens                                                                  | High     | High         |
| SEC-04 | security, bugsweep        | be · ws                                   | WebSocket gateways unauthenticated — chat sender spoofing + eavesdropping on both partners                                                  | High     | High         |
| SEC-05 | security, critique        | be · tasks                                | Generator endpoints unauthenticated (and the "Generate" dev button is exposed in the prod UI)                                               | High     | High         |
| SEC-06 | security, bugsweep        | be · auth                                 | No attempt cap on PIN verification (`verifyPin` omits the MAX check) → PIN brute-forceable                                                  | High     | High         |
| SEC-07 | security, critique        | be · auth / login                         | Seeded weak admin creds (`anaana123` / PIN `1234`) printed in the login bundle                                                              | High     | High         |
| AUD-02 | audit, critique           | fe · globals.css                          | Brand token block missing — `cr/sl/cm/font-display` undefined → colorless links, invisible toggles, unstyled headings app-wide (root cause) | High     | High         |
| AUD-03 | audit, critique           | fe · 14 files                             | ~55 inline color styles (Token-Law violations)                                                                                              | High     | High         |
| AUD-04 | audit                     | fe · sidebar/activity/landing             | Banned `#E8D5B7` cream survives in production                                                                                               | High     | High         |
| AUD-05 | audit                     | fe · globals.css                          | Body font is Arial, not the brand Geist                                                                                                     | High     | High         |
| AUD-08 | audit, critique           | fe · chat/comments/tasks/sessions/sidebar | Near-zero ARIA; icon-only controls (×, 🗑, ✎, 🔍, presence dots, revoke) unlabeled                                                          | High     | High         |
| AUD-09 | audit, critique           | fe · global                               | No `prefers-reduced-motion` anywhere (CSS keyframes + `useCountUp`)                                                                         | High     | High         |
| CR-01  | critique                  | fe · statistics                           | Two KPI cards show hardcoded fabricated analytics (`+12%`, `Balanced`)                                                                      | High     | High         |
| CR-02  | critique                  | fe · account                              | Session device labels meaningless — raw UA first token (`Mozilla`)                                                                          | High     | High         |
| CR-03  | critique                  | fe · account                              | `revoke()` / `revokeOthers()` have no error handling — silent failures on security actions                                                  | High     | High         |
| CR-04  | critique                  | fe · login                                | PIN step has no back button — user is trapped                                                                                               | High     | High         |
| CR-05  | critique                  | fe · pulse                                | "Gold challenge" internal jargon + em dash in user-facing copy                                                                              | High     | High         |
| FD-13  | critique                  | fe · chat                                 | Chat bubbles re-color (approved spec): mine = `cm` fill + `sl` text, theirs = white + gray-100 border; crimson reserved for send button     | Med      | High         |
| SEC-08 | security                  | be · global                               | No rate limiting anywhere (password / OTP / reset / refresh brute force)                                                                    | High     | Medium       |
| SEC-09 | security                  | be · auth                                 | Access + refresh tokens returned in response body (XSS-exposable; partially defeats httpOnly)                                               | Med      | Medium       |
| SEC-10 | security                  | be · auth                                 | Refresh tokens never rotated; 7-day TTL; no reuse detection                                                                                 | Med      | Medium       |
| SEC-11 | security                  | be · global                               | No security headers (no Helmet: CSP / HSTS / X-Frame-Options)                                                                               | Med      | Medium       |
| SEC-12 | security                  | be · graphql                              | Introspection on + CSRF off + embedded Sandbox at `/graphql` in committed config                                                            | Med      | Medium       |
| AUD-06 | audit, critique           | fe · login/register/forgot/reset          | `<h3>` used as primary page heading on all four auth pages (+ statistics h2 skip)                                                           | High     | Medium       |
| AUD-07 | audit, bugsweep, critique | fe · sidebar                              | Invalid nested `<Link>` (anchor-in-anchor) in admin nav — breaks keyboard nav + renders scrambled                                           | High     | Medium       |
| AUD-10 | audit, critique           | fe · presence dots/icon btns/comments     | Touch targets far below 44px; hover-only controls dead on touch                                                                             | Med      | Medium       |
| AUD-11 | audit, critique           | fe · chat/admin/avatars                   | Text below readable floor (8–11px)                                                                                                          | High     | Medium       |
| AUD-12 | audit, critique           | fe · ChatPanel                            | Fixed 320×448 panel, no responsive behavior                                                                                                 | High     | Medium       |
| BUG-01 | bugsweep                  | be · chat                                 | Chat history timestamps all render as "now" (`toPayload` ignores stored `createdAt`)                                                        | High     | Medium       |
| BUG-02 | bugsweep                  | be · tasks                                | Task `createdById` is always the first owner, not the actual creator                                                                        | High     | Medium       |
| BUG-03 | bugsweep                  | be · comments                             | All comments attributed to the first owner; edit/delete ownership check is a no-op                                                          | High     | Medium       |
| BUG-08 | bugsweep                  | be · tasks/ws                             | `setState` TOCTOU — concurrent transitions both pass validation (no row lock/version)                                                       | Med      | Medium       |
| BUG-11 | bugsweep                  | be · admin                                | Admin user-delete 500s on any user referenced by a task/comment (FK `RESTRICT`, no reassignment)                                            | High     | Medium       |
| BUG-17 | bugsweep                  | fe · TasksContext                         | `currentUser = users[0]`, not the authenticated user (AuthContext ignored)                                                                  | High     | Medium       |
| BUG-18 | bugsweep, critique        | fe · CommentsThread                       | `CURRENT_USER_ID='u1'` → comment edit/delete controls never appear (IDs are UUIDs)                                                          | High     | Medium       |
| BUG-20 | bugsweep                  | fe · offline sync                         | tempId never remapped → offline edits to an offline-created task are dropped silently on sync                                               | High     | Medium       |
| BUG-21 | bugsweep                  | fe · offline sync                         | Offline create that fails server validation vanishes silently on drain                                                                      | Med      | Medium       |
| BUG-25 | bugsweep                  | fe · realtime                             | Optimistic create + WS echo race can duplicate a task row (`REPLACE_ID` no dedupe)                                                          | Med      | Medium       |
| BUG-26 | bugsweep                  | fe · realtime                             | No resync on socket reconnect → missed events leave the list stale                                                                          | Med      | Medium       |
| BUG-28 | bugsweep                  | fe · ChatPanel                            | Message dropped silently if the socket is disconnected (draft cleared, no delivery, no error)                                               | Med-High | Medium       |
| CR-06  | critique                  | fe · statistics                           | Priority conveyed by emoji color alone (WCAG 1.4.1)                                                                                         | High     | Medium       |
| CR-07  | critique                  | fe · statistics                           | BarChart legend hardcodes "Ana"/"Dan" instead of actual user names                                                                          | High     | Medium       |
| CR-08  | critique                  | fe · account                              | Native `confirm()` for destructive actions (breaks style, no-op on some mobile)                                                             | Med      | Medium       |
| CR-09  | critique                  | fe · admin/observation                    | `resolve()` has no error handling                                                                                                           | High     | Medium       |
| CR-10  | critique                  | fe · admin/observation                    | Auto-polls every 5s with no manual refresh / pause control                                                                                  | Med      | Medium       |
| CR-11  | critique, audit           | fe · tasks                                | Overdue description `text-gray-400` on `bg-red-50` ≈2.1:1 (WCAG AA)                                                                         | High     | Medium       |
| CR-12  | critique, audit           | fe · tasks                                | List rows are `<div onClick>` (not button/anchor) — not keyboard-accessible                                                                 | High     | Medium       |
| CR-13  | critique                  | fe · tasks                                | `handleSubmit`/`handleEdit` swallow errors to `console.error` — no user feedback on failure                                                 | High     | Medium       |
| FD-14  | critique                  | fe · tasks/global                         | Eyebrow pattern removal (approved spec): label-scale uppercase only on table column headers + form labels; removed everywhere else         | Med      | Medium       |
| SEC-13 | security                  | be · auth                                 | JWT verified without algorithm pinning (`algorithms: ['HS256']`)                                                                            | Med      | Low          |
| SEC-14 | security                  | be · auth                                 | Login timing enables email enumeration (bcrypt skipped when user missing)                                                                   | Med      | Low          |
| SEC-15 | security                  | be · auth/logging                         | Client-controlled `X-Forwarded-For` trusted for session/log IP                                                                              | Med      | Low          |
| SEC-16 | security                  | be · auth                                 | Weak credential policy (password min-8 only; 4-digit PIN allowed)                                                                           | High     | Low          |
| SEC-17 | security                  | be · graphql                              | No GraphQL query depth/complexity limit (DoS, compounded by SEC-01)                                                                         | Med      | Low          |
| AUD-13 | audit                     | fe · globals.css                          | Bounce/overshoot easing on modal entrance                                                                                                   | High     | Low          |
| AUD-14 | audit                     | fe · globals.css                          | Accidental `prefers-color-scheme: dark` block → broken theming                                                                              | Med      | Low          |
| AUD-15 | audit                     | fe · sidebar/chat/landing                 | Stale `#2C3E50` navy + shadow drift + `#1A2533` typo                                                                                        | High     | Low          |
| BUG-04 | bugsweep                  | be · tasks                                | `update` skips the due-date-in-past check that `create` enforces                                                                            | High     | Low          |
| BUG-05 | bugsweep                  | be · tasks                                | `assertDueDateNotInPast` UTC-vs-local mismatch can misjudge "today"                                                                         | Med      | Low          |
| BUG-06 | bugsweep                  | be · stats                                | `completionRate` counts cancelled in the denominator; N+1 in top-commented                                                                  | Med      | Low          |
| BUG-07 | bugsweep                  | be · users                                | Two parallel role systems (`user.role` string vs `roles` relation) drift                                                                    | High     | Low          |
| BUG-09 | bugsweep                  | be · logging                              | `AnomalyDetector.flag()` upsert race → duplicate observations / lost score                                                                  | Med-High | Low          |
| BUG-10 | bugsweep                  | be · tasks                                | Generator run-state is an in-memory singleton (wrong under multi-instance)                                                                  | Med      | Low          |
| BUG-12 | bugsweep                  | be · database                             | Missing `init-sql/` silently disables the stats stored-proc → runtime throw                                                                 | Med      | Low          |
| BUG-13 | bugsweep                  | be · auth                                 | Abandoned login-attempts / unused password-resets are never swept                                                                           | High     | Low          |
| BUG-15 | bugsweep                  | be · chat (PG↔Mongo)                      | Chat `senderId` unvalidated against Postgres users; orphaned on user delete                                                                 | High     | Low          |
| BUG-16 | bugsweep                  | be · (PG↔Mongo)                           | No cross-store integrity/transaction between Mongo chat and Postgres                                                                        | High     | Low          |
| BUG-19 | bugsweep                  | fe · TasksContext                         | `optimisticTask.createdById='u1'` placeholder                                                                                               | High     | Low          |
| BUG-22 | bugsweep                  | fe · offline sync                         | Mid-drain failure refetches page 1, discarding loaded pages + pagination                                                                    | Med      | Low          |
| BUG-23 | bugsweep                  | fe · offline queue                        | localStorage read-modify-write clobbers across tabs (lost ops)                                                                              | Med      | Low          |
| BUG-24 | bugsweep                  | fe · realtime                             | Own create/delete double-counts `totalTasks` (optimistic + WS echo)                                                                         | High     | Low          |
| BUG-27 | bugsweep                  | fe · ws                                   | Websocket-only transport → no realtime where raw WS is blocked                                                                              | Med      | Low          |
| BUG-29 | bugsweep                  | fe · ChatPanel                            | History `.catch(()=>{})` → empty panel, no error on failure                                                                                 | High     | Low          |
| BUG-30 | bugsweep                  | fe · api                                  | Transient network blip during 401-refresh logs the user out                                                                                 | Med      | Low          |
| BUG-31 | bugsweep                  | fe · api                                  | No single-flight on `/auth/refresh` (thundering herd on concurrent 401s)                                                                    | High     | Low          |
| BUG-32 | bugsweep                  | fe · api                                  | `graphql()` omits `credentials:'include'` (works only because of SEC-01)                                                                    | High     | Low          |
| BUG-33 | bugsweep                  | fe · comments                             | Comments aren't realtime and have no offline support                                                                                        | High     | Low          |
| BUG-34 | bugsweep                  | fe · CommentsThread                       | `isEdited` timestamp string-compare → false "· edited" possible                                                                             | Low      | Low          |
| BUG-35 | bugsweep                  | fe · tasks                                | Search is client-side, title-only, over loaded pages only                                                                                   | High     | Low          |
| BUG-36 | bugsweep                  | fe · tasks                                | Generator start/stop swallow errors but set state optimistically                                                                            | High     | Low          |
| BUG-37 | bugsweep                  | be · auth                                 | `register()` creates the first session with empty ip/userAgent                                                                              | High     | Low          |

### Feature/identity decisions

Product calls — what to build, remove, rename, or restructure. **All rows are decided as of 2026-06-10** — locked decisions are ADR-backed ([docs/adr/](docs/adr/)); the rest were approved as defaults in the veto pass (zero vetoes), recorded under "Scoped features + fixes (Phase 2)" below. FD-13 and FD-14 turned out to be mechanical token/markup work once decided and were moved into the Fixes table above. Ordered by severity (mapped from the critique's P-level).

| ID     | source   | surface               | decision                                                                                                                     | conf. | severity     |
| ------ | -------- | --------------------- | ---------------------------------------------------------------------------------------------------------------------------- | ----- | ------------ |
| FD-01  | critique | fe · account          | Account surface is unreachable from nav — add a user menu / account entry point (IA)                                         | High  | **Critical** |
| FD-03  | critique | fe · statistics       | Remove the Contribution Ranking leaderboard (gamified, PRODUCT.md anti-ref); replace with a shared-progress view             | High  | High         |
| FD-04  | critique | fe · tasks/statistics | Replace the banned hero-metric stat cards with a 2-person-aware summary                                                      | High  | High         |
| FD-05  | critique | fe · tasks            | Build the "Two of Us" identity layer (partner awareness, mine/theirs framing)                                                | High  | High         |
| FD-06  | critique | fe · chat/design      | Build dual-presence — the signature feature; the presence dot is currently a stub (always offline)                           | High  | High         |
| FD-07  | critique | fe · login            | Add step progress to the 3-step login flow                                                                                   | Med   | High         |
| FD-08  | critique | fe · register/auth    | Replace the empty rose-amber gradient auth panels with brand-committed content                                               | High  | High         |
| FD-09  | critique | fe · register         | Remove SaaS copy ("No credit card needed"); name the product premise in the heading                                          | High  | High         |
| FD-15  | critique | fe · admin/logs       | Add search / filter / sort to the logs page                                                                                  | Med   | High         |
| FD-16  | critique | fe · pulse            | Decide what Pulse is; replace the dead-end placeholder with a real interim state                                             | High  | High         |
| FD-10  | critique | fe · register         | Move the Security PIN field into a collapsed "advanced" section with plain-language copy                                     | Med   | Medium       |
| FD-11  | critique | fe · auth             | Standardize the auth layout (split vs centered) across login/register/forgot/reset                                           | Med   | Medium       |
| FD-12  | critique | fe · chat             | Rename "Workspace chat" and replace enterprise "Workspace" copy/breadcrumbs with relationship-centric copy                   | Med   | Medium       |
| FD-02  | critique | fe · account          | Add an `/account` index page (currently 404s) + reserve profile/security settings (IA)                                       | Med   | Medium       |
| FD-17  | critique | fe · account          | Decide account IA: profile edit, in-app password change, partner connection                                                  | Med   | Medium       |
| SEC-18 | security | be · tasks/comments   | Decide the tenancy boundary: authorization is permission-based, not ownership-scoped (fine for one couple, not multi-tenant) | High  | Info         |

---

# /impeccable audit — code-level technical audit (Phase 1)

> Scope: `together-app-ui` (Next.js frontend). This is the **code-level, verifiable** pass — a11y, performance, responsive, theming, anti-patterns — distinct from the per-surface design critiques logged below. Where a finding overlaps a critique it is cross-referenced, not repeated. Run via the bundled detector + manual source verification. Confidence is **High** unless noted. Read-only; no fixes applied.

## Audit Health Score

| #         | Dimension         | Score    | Key Finding                                                                                                                                                           |
| --------- | ----------------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1         | Accessibility     | 1/4      | App-wide focus ring never renders (undefined `cr`/`cr-pale` tokens in shared FormInput); ~zero `aria-label`/`role`; no reduced-motion                                 |
| 2         | Performance       | 3/4      | No raster images; optimistic updates + memoization present. Minor: 5s admin poll, per-render inline-style object churn                                                |
| 3         | Responsive Design | 2/4      | Fixed 320×448 ChatPanel; touch targets far below 44px; 8–10px text below readable floor; hover-only controls dead on touch                                            |
| 4         | Theming           | 0/4      | Entire DESIGN.md token system undefined in `globals.css`; ~55 inline color styles; banned `#E8D5B7` cream + old `#2C3E50` navy persist; body font is Arial, not Geist |
| 5         | Anti-Patterns     | 1/4      | Hero-metric cards, eyebrow-on-every-section, contribution leaderboard, support-widget chat, gray-on-color, bounce easing, side-stripe nav                             |
| **Total** |                   | **7/20** | **Poor — major overhaul needed**                                                                                                                                      |

## Anti-Patterns Verdict

**Fail — reads AI-generated.** Detector run (`detect.mjs`) returned 5 hits; manual pass adds several structural tells the detector can't see. Confirmed tells: hero-metric stat cards (tasks + statistics), uppercase tracked eyebrow on every section/table/form label, the contribution-ranking leaderboard (medals + stars), the floating crimson support-widget chat, gray-text-on-color, overshoot/bounce modal easing, and the 2px side-stripe nav border. The deeper problem is theming-level, not pattern-level: the brand exists only in `DESIGN.md`, never in the running CSS.

## Executive Summary

- **Audit Health Score: 7/20 (Poor — major overhaul needed).**
- **Issue counts:** P0 ×1, P1 ×6, P2 ×5, P3 ×3.
- **Root cause behind most findings:** `globals.css` `@theme inline` defines only `background`, `foreground`, `font-sans`, `font-mono`. None of the brand tokens (`cr`, `cr-deep`, `cr-pale`, `sl`, `sl-muted`, `sl-dim`, `cm`, `cm-pale`, `font-display`) exist. Every `bg-cr` / `text-sl` / `focus:ring-cr-pale` / `font-display` across the app resolves to nothing — so the design system is, at runtime, absent. This single gap produces the broken focus rings, the colorless brand links, the fallback heading font, and pushed devs toward the ~55 inline hex styles that are the Token-Law violations.
- **Top 5 critical issues:** (1) focus indicator never renders app-wide; (2) brand token block missing from `globals.css`; (3) banned `#E8D5B7` cream survives in production; (4) body font is Arial not Geist; (5) no `prefers-reduced-motion` anywhere (CSS or TSX).

## Detailed Findings by Severity

### [P0] App-wide focus indicator never renders

- **Location:** `components/ui/FormInput.tsx:19,22` (`focus:ring-cr-pale`, `focus:border-cr`) — shared by every form in the app.
- **Category:** Accessibility / Theming
- **Impact:** `cr-pale` and `cr` are undefined Tailwind tokens, so the focus ring and focus border produce no styles. Keyboard and screen-reader users get **no visible focus** on any input across login, register, forgot/reset, task modal, and search. This is the highest-severity a11y defect because it blocks the primary flow for an entire user class.
- **WCAG:** 2.4.7 Focus Visible (AA) — fails.
- **Recommendation:** Define the tokens (below); the existing classes then resolve correctly. No component change needed once tokens exist.
- **Suggested command:** `/impeccable audit` (token sweep), then `/impeccable harden`

### [P1] Brand token block missing from `globals.css`

- **Location:** `app/globals.css:8-13` (`@theme inline` defines only 4 non-brand tokens).
- **Category:** Theming
- **Impact:** Systemic. `bg-cr`, `text-sl`, `text-sl-muted`, `bg-cm`, `bg-cm-pale`, `text-cr`, `bg-cr-pale`, `font-display` are referenced across ~all surfaces and resolve to nothing — colorless links, invisible active toggle states (statistics view switch), unstyled headings. This is the root cause cross-referenced throughout the design critiques.
- **Recommendation:** Add the exact block from `DESIGN.md §2` (the 8 `--color-*` tokens + `--font-display`). One edit, systemic fix.
- **Suggested command:** `/impeccable audit` (token sweep)

### [P1] Token-Law violations: ~55 inline color styles across 14 files

- **Location:** `style={{ background: '#C0392B' }}` and friends in `login` (×3), `register`, `reset-password`, `forgot-password`, `tasks/page` (×3), `tasks/[id]`, `statistics`, `ChatPanel` (×2), `CommentsThread` (×2), `TaskFormModal`, `Sidebar` (×9), `ActivityIndicator` (×6), `page.tsx` (×6), `OfflineBanner`.
- **Category:** Theming
- **Impact:** DESIGN.md "Token Law" names every inline color a finding. Inconsistency is already visible: the same crimson button is a token in some places and inline hex in others; the focus ring (token) is broken while buttons (inline) render. Maintenance and theming both break.
- **Recommendation:** After tokens exist, replace inline hex with `bg-cr` / `text-sl` / etc. Mechanical once the token block lands.
- **Suggested command:** `/impeccable harden`

### [P1] Banned `#E8D5B7` cream survives in production

- **Location:** `rgba(232,213,183,…)` throughout `Sidebar.tsx` (all nav + workspace text colors), `ActivityIndicator.tsx` (×6), `app/page.tsx` (×2).
- **Category:** Theming / Anti-Pattern
- **Impact:** DESIGN.md explicitly: `#E8D5B7` "sits squarely in the AI-default warm-neutral band … and must not survive into production." It is currently the text color for the entire sidebar — the app's most persistent surface. Direct violation of a named "Don't."
- **Recommendation:** Replace sidebar text with the spec'd white-alpha values (`rgba(255,255,255,0.55/0.75/0.3)`); replace `#E8D5B7` everywhere with `cm`/`cm-pale` tokens or white-alpha as appropriate.
- **Suggested command:** `/impeccable colorize` (sidebar) + `/impeccable harden`

### [P1] Body font is Arial, not the brand Geist

- **Location:** `app/globals.css:112` — `font-family: Arial, Helvetica, sans-serif;` on `body`.
- **Category:** Theming / Typography
- **Impact:** The `@theme inline` block sets `--font-sans: var(--font-geist-sans)`, but `body` hard-overrides to Arial, and `font-display` is undefined (falls back to body). Net result: **every heading and body string in the app renders in Arial**, not Geist. The entire DESIGN.md typography system (§3) is unrendered. (Detector flagged this at line 112.)
- **Recommendation:** Remove the Arial override; let `body` inherit `font-sans` (Geist). Define `--font-display: var(--font-geist-sans)`.
- **Suggested command:** `/impeccable typeset`

### [P1] No `prefers-reduced-motion` anywhere (CSS or TSX)

- **Location:** `app/globals.css` (7 keyframe animations + button/card transitions, zero reduced-motion blocks); `0` occurrences of `prefers-reduced-motion` across all `.tsx`. `useCountUp` (statistics) also animates unconditionally.
- **Category:** Accessibility
- **Impact:** Page fade, row stagger, modal slide, stat pop, button press-scale, and the count-up all fire regardless of OS reduced-motion preference. DESIGN.md "Do": reduced-motion alternative for _every_ animation; PRODUCT.md: "Support reduced motion."
- **WCAG:** 2.3.3 Animation from Interactions (AAA) + vestibular-safety best practice.
- **Recommendation:** Add a global `@media (prefers-reduced-motion: reduce)` block neutralizing animations to instant/crossfade; gate `useCountUp` on the media query.
- **Suggested command:** `/impeccable animate` (reduced-motion pass)

### [P1] Near-zero ARIA + icon-only controls unlabeled

- **Location:** Whole app: exactly **1** `aria-label`/`role` occurrence (`role="alert"` in FormInput). Unlabeled icon-only buttons: ChatPanel `×` close and 💬 toggle, CommentsThread ✎/🗑, tasks 🗑 + 🔍 search, sessions "Revoke" (×N, no per-session name), sidebar presence dots (no online/offline accessible name).
- **Category:** Accessibility
- **Impact:** Screen-reader users hear "button" / "times" / "wastebasket" with no context, and three identical "Revoke" buttons with no way to tell which session. Presence — the signature feature — is announced as nothing.
- **WCAG:** 4.1.2 Name, Role, Value (A); 1.1.1 (A).
- **Recommendation:** Add `aria-label` to every icon-only control; include the target (session device, comment author) in the accessible name.
- **Suggested command:** `/impeccable harden`

### [P2] `<h3>` used as primary page heading on all four auth pages

- **Location:** `login:72`, `forgot-password:28`, `reset-password:45`, `register:66` — each page's first/only heading is `<h3>`.
- **Category:** Accessibility (semantic HTML)
- **Impact:** Screen readers announce a level-3 heading with no parent h1/h2 — broken document outline on every entry point to the app. (Critique noted register+login; confirmed across all four.) Secondary: statistics jumps h1→h3 (skips h2).
- **WCAG:** 1.3.1 Info and Relationships (A).
- **Recommendation:** Promote auth page titles to `<h1>`; fix the statistics h2 skip.
- **Suggested command:** `/impeccable typeset`

### [P2] Invalid nested `<Link>` (anchor-in-anchor) in Sidebar admin nav

- **Location:** `components/layout/Sidebar.tsx:77-96` — `<Link href="/admin/users">` contains `<Link href="/admin/logs">` and `<Link href="/admin/observation">`, plus the icon/label.
- **Category:** Accessibility / Functional
- **Impact:** `<a>` inside `<a>` is invalid HTML; React hydration warns, the inner links are not reliably keyboard-reachable, and the row renders the labels mashed together ("Admin Logs Anomaly Detection 🔐 Users"). Breaks admin sub-navigation. (Also belongs in the functional bug sweep.)
- **Recommendation:** Flatten to three sibling `<Link>` items under the "Administration" label.
- **Suggested command:** `/impeccable layout` / functional fix

### [P2] Touch targets far below 44×44px; hover-only controls dead on touch

- **Location:** Presence dots `w-2 h-2` (8px); icon buttons ×/🗑/✎ with no min size; CommentsThread edit/delete are `opacity-0 group-hover:opacity-100` (no `@media (hover:none)` fallback).
- **Category:** Responsive / Accessibility
- **Impact:** On phones — the couple's most likely device — primary comment actions are invisible and unreachable, and tap targets miss the 44px minimum.
- **WCAG:** 2.5.5 Target Size (AAA) / 2.5.8 (AA).
- **Recommendation:** Min 44px hit area on interactive icons; reveal hover-only controls on touch via `@media (hover: none)` or a persistent affordance.
- **Suggested command:** `/impeccable adapt`

### [P2] Text below readable floor (8–11px)

- **Location:** `text-[9px]` ChatPanel timestamps; `text-[10px]` ChatPanel sender, CommentsThread badge, observation timestamps; inline `fontSize: 8/9` on avatar bubbles (tasks, statistics, tasks/[id]); admin logs `text-[10px]/[11px]` IP + userId.
- **Category:** Responsive / Accessibility
- **Impact:** Below the ~12px readable minimum; IP addresses and timestamps that admins must read accurately are illegible.
- **Recommendation:** Floor content text at `text-xs` (12px).
- **Suggested command:** `/impeccable typeset`

### [P2] ChatPanel is a fixed 320×448 with no responsive behavior

- **Location:** `components/chat/ChatPanel.tsx` (fixed-size floating panel).
- **Category:** Responsive
- **Impact:** On small phones the panel can overflow/clip; no breakpoint or full-screen sheet variant for mobile.
- **Recommendation:** Make the panel a responsive sheet (`max-w` + viewport-relative height, full-screen on `sm`).
- **Suggested command:** `/impeccable adapt`

### [P3] Bounce/overshoot easing on modal entrance

- **Location:** `app/globals.css:50` — `.modal-enter` uses `cubic-bezier(0.34, 1.56, 0.64, 1)` (1.56 = overshoot).
- **Category:** Anti-Pattern / Motion
- **Impact:** DESIGN.md §Motion and the impeccable rules both ban bounce/elastic; real objects decelerate smoothly.
- **Recommendation:** Swap for an ease-out-quint/expo curve.
- **Suggested command:** `/impeccable animate`

### [P3] Accidental dark-mode block produces broken theming

- **Location:** `app/globals.css:102-107` — `@media (prefers-color-scheme: dark)` flips `--background`→`#0a0a0a`, `--foreground`→`#ededed`.
- **Category:** Theming
- **Impact:** The app is light-only by design (DESIGN.md has no dark theme), but every surface uses hard-coded `bg-white`/`text-gray-*`. Under OS dark mode the body gutter goes near-black around white cards, and any element relying on the inherited foreground turns near-white on white. Unintended, untested state.
- **Recommendation:** Remove the dark block, or commit to a real dark theme. Removal is the low-risk choice for Phase 1.
- **Suggested command:** `/impeccable audit` (theming)

### [P3] Stale `#2C3E50` navy + shadow color drift

- **Location:** `#2C3E50` in `Sidebar:23`, `ChatPanel:85`, `page.tsx:19`; shadow/scrollbar `rgba(44,62,80,…)` in `globals.css:93,99`; `#1A2533` typo in `page.tsx:106` (should be `#1A2535`).
- **Category:** Theming
- **Impact:** DESIGN.md §2 states `sl` (#1A2535) _replaces_ the old Flat-UI `#2C3E50`; the old value persists on the sidebar/chat/hero, and shadows still use the old navy's RGB instead of the spec'd `rgba(26,37,51,…)`.
- **Recommendation:** Migrate to `sl` token + spec'd shadow RGB during the token sweep.
- **Suggested command:** `/impeccable harden`

## Patterns & Systemic Issues

1. **The design system is unrendered.** Every brand finding traces to the missing `@theme inline` token block. Fixing `globals.css` is the highest-leverage single edit in the project — it resolves the P0 focus ring, the colorless links, the heading font, the toggle active states, and unblocks the inline-style cleanup.
2. **Inline hex is the dev workaround for missing tokens.** ~55 inline color styles exist _because_ `bg-cr` didn't work. Define tokens first, then the replacement is mechanical.
3. **Accessibility was never instrumented.** 1 ARIA attribute total, 0 reduced-motion, 0 `inputMode`/`autoComplete`, divs-as-buttons (task rows), h3-as-h1. These are additive (no redesign needed) but pervasive.
4. **Sub-readable text + sub-44px targets recur** wherever density appears (chat, admin logs, avatar bubbles) — a consistent "shrink to fit" reflex rather than one-off mistakes.

## Positive Findings

- **`role="alert"` on form errors** (FormInput) — correct live-region usage; replicate the pattern for async mutation errors.
- **Semantic table HTML** in all three admin pages (`<table>/<thead>/<th>`) — keyboard + screen-reader friendly; the task list should adopt this instead of `div` rows.
- **No raster images** — avatars are colored initials, so there is no lazy-load/alt-text debt; Performance scores well largely because of this plus optimistic updates and `useMemo`.
- **Optimistic UI with rollback** (CommentsThread) and **infinite scroll** (tasks) are solid engineering to preserve through the redesign.

## Recommended Actions (priority order)

1. **[P0/P1] `/impeccable audit` (token sweep):** add the 8 `--color-*` tokens + `--font-display` to `globals.css §@theme inline` — fixes focus rings, link colors, toggle states, heading font in one edit.
2. **[P1] `/impeccable typeset`:** remove the Arial override; promote auth `h3`→`h1`; floor text at 12px.
3. **[P1] `/impeccable harden`:** add `aria-label`s to icon-only controls; replace ~55 inline hex with tokens; flatten nested sidebar links; migrate `#2C3E50`→`sl`.
4. **[P1] `/impeccable colorize`:** purge banned `#E8D5B7` cream from sidebar/activity/landing.
5. **[P1] `/impeccable animate`:** global `prefers-reduced-motion` block; replace bounce easing.
6. **[P2] `/impeccable adapt`:** responsive ChatPanel; 44px touch targets; reveal hover-only controls on touch.
7. **[P3 → final] `/impeccable polish`:** remove the accidental dark-mode block, fix `#1A2533` typo, last pass.

> Run `/impeccable audit` again after the token sweep — the score should jump primarily on Theming (0→3) and Accessibility (1→2/3).

---

# Backend + frontend security review (Phase 1)

> `source=security`. Scope: NestJS backend (`together-backend`) with focus on the JWT/OTP/PIN auth flow, session handling, and cookie/CORS config, plus a sweep of the rest of the backend and the frontend. Severity = Critical / High / Medium / Low. Confidence = High / Medium / Low. Read-only; nothing fixed. **Threat-model note:** many issues are _fail-open defaults_ — the app is only secure if a specific env var is set in production. Verify the prod env before any deploy.

## Severity summary

> Superseded by the consolidated **Findings backlog (Phase 1)** table at the top of this file.
> The per-finding detail for each SEC-xx follows below.

## Auth-flow findings (focus area)

### [SEC-01 · Critical · High] GraphQL bypasses the entire auth/RBAC layer

- **Where:** `graphql/tasks.resolver.ts`, `graphql/misc.resolvers.ts`, `graphql/comments.resolver.ts` — none carry `@UseGuards`, `AuthGuard`, `PermissionsGuard`, or `@RequirePermissions`. `app.module.ts` and `auth.module.ts` register no `APP_GUARD`, so there is no global guard either (REST controllers each apply guards locally — confirming guards are not global).
- **Impact:** The REST layer is carefully gated (`AuthGuard` + `PermissionsGuard` + per-route permissions), but the same services are re-exposed through GraphQL with **zero authentication or authorization**. Anyone who can reach `/graphql` (introspection is on, Sandbox is embedded) can: `query { tasks }`, `query { users }`, `query { stats }`, and run `createTask` / `updateTask` / `setTaskState` / **`deleteTask`** mutations. `deleteTask` is especially severe: REST restricts deletion to the `task.delete` permission that the `user` role explicitly lacks, yet GraphQL lets an unauthenticated caller delete any task. Full unauthenticated read/write to the product's entire data model.
- **Fix direction:** Apply a Gql-aware `AuthGuard` + `PermissionsGuard` to every resolver (or globally via `APP_GUARD` with a guard that handles both HTTP and GraphQL contexts); mirror the REST permission decorators on each query/mutation.

### [SEC-02 · High · High] `/auth/dev/inbox` is a fail-open OTP / reset-code oracle

- **Where:** `auth.controller.ts:138` (`GET /auth/dev/inbox`, no guard) → `mailer.peek(email)`; `mailer.service.ts:16` sets `devMode = cfg.get('MAIL_DEV', 'true') === 'true'` (**defaults to true**); `auth.service.ts:147` (`devOtp`) and `recovery.service.ts:47` (`devCode`) echo codes in API responses when `isDev()`.
- **Impact:** If `MAIL_DEV` is not explicitly set to `false` in production, `peek()` returns the most recent email body for **any** address with no authentication. Attack: `POST /auth/login` for the victim (triggers an OTP email) → `GET /auth/dev/inbox?email=victim` → read the OTP → complete 2FA. Same path reads password-reset codes (the reset email body contains the code) → full account takeover. The `devOtp`/`devCode` response fields leak the codes directly under the same default.
- **Fix direction:** Default `MAIL_DEV` to `false`; hard-gate the endpoint behind a non-prod guard; never echo codes in responses outside an explicit dev build.

### [SEC-03 · High · High] Hardcoded fallback JWT secret

- **Where:** `jwt-util.service.ts:32` — `cfg.get<string>('JWT_SECRET', 'dev-only-secret-change-me')`.
- **Impact:** If `JWT_SECRET` is unset, the app silently signs/verifies with a publicly-known, in-repo secret. An attacker can forge an access token with `roles: ['admin']` and any `sub`/`sid`, granting full admin access — provided the `sid` matches a live session (or the session lookup can be satisfied). Fail-open default.
- **Fix direction:** Fail fast on boot if `JWT_SECRET` is missing or equals the placeholder; require a high-entropy secret.

### [SEC-06 · High · High] No attempt cap on PIN verification

- **Where:** `auth.service.ts:197-224` (`verifyPin`). `verifyOtp` enforces `attempt.attempts >= MAX_OTP_ATTEMPTS` (line 165), but `verifyPin` only increments `attempt.attempts` on failure and **never checks the cap**.
- **Impact:** Once a user passes OTP and reaches the PIN stage, the 4–6 digit PIN can be brute-forced with unlimited tries inside the remaining attempt-window (the row keeps `expiresAt` from OTP creation, ~10 min). A 4-digit PIN is 10,000 combinations; with no lockout and no global rate limit (SEC-08), this is practically brute-forceable. The PIN factor provides little real protection.
- **Fix direction:** Apply the same `MAX` check in `verifyPin`; delete the attempt row on exhaustion.

### [SEC-07 · High · High] Seeded weak admin credentials, echoed in the client bundle

- **Where:** `database/seed.ts:79-90` seeds `ana@together.dev` / `anaana123` / PIN `1234` as **admin** (3FA on) and `dan@together.dev` / `dandan123` as user; `app/login/page.tsx:77-78` prints all of them in the rendered login page.
- **Impact:** If the seed runs against a production DB, a real admin account exists with a trivially guessable password and PIN `1234` — and the credentials are shown to every visitor in the login UI and shipped in the JS bundle. Anyone can log in as admin. (Design critique flagged the UI exposure as P0; from the security side the accounts are real and weak.)
- **Fix direction:** Never seed real credentials in prod; gate the demo block behind `NODE_ENV==='development'`; force a password+PIN reset for any seeded account.

### [SEC-09 · Medium · Medium] Tokens returned in response body alongside httpOnly cookies

- **Where:** `auth.controller.ts` register/login/otp/pin/refresh all `return result`, where `LoginResult` includes `accessToken` + `refreshToken`; cookies are also set httpOnly.
- **Impact:** The httpOnly cookie protects the token from JS, but returning the same tokens in the JSON body re-exposes them to any XSS on the page and to anything that logs response bodies. Frontend confirms it relies on cookies (`credentials: 'include'`) and does **not** persist tokens to localStorage (good), so the body tokens are unused — they should not be sent.
- **Fix direction:** Drop `accessToken`/`refreshToken` from response bodies; rely solely on the httpOnly cookies.

### [SEC-10 · Medium · Medium] Refresh tokens not rotated

- **Where:** `auth.service.ts:294` returns the same `refreshToken` on refresh (comment: "we don't rotate refresh tokens in Bronze"); 7-day TTL (`JWT_REFRESH_TTL_SEC`).
- **Impact:** A stolen refresh token is replayable for up to 7 days with no rotation and no reuse detection. Session revocation does mitigate (revoked sessions can't refresh — see positives), but a token captured before revocation stays valid until the absolute window.
- **Fix direction:** Rotate refresh tokens on each use; detect reuse of a consumed token and revoke the session.

### [SEC-13 · Low · Medium] JWT verified without algorithm pinning

- **Where:** `jwt-util.service.ts:46,52` — `jwt.verify(token, this.secret)` with no `algorithms` option.
- **Impact:** Low with a symmetric HMAC secret (jsonwebtoken v9 rejects `alg:none` by default and won't accept asymmetric algs against a string key), but pinning `algorithms: ['HS256']` is defense-in-depth against future config drift.
- **Fix direction:** Pass `{ algorithms: ['HS256'] }` to both verifies.

### [SEC-14 · Low · Medium] Login timing enables email enumeration

- **Where:** `auth.service.ts:114-117` — when the user is missing, the method throws before `bcrypt.compare`, so the "invalid" response returns measurably faster than for a real email with a wrong password. The "constant-time-ish" comment overstates the protection.
- **Fix direction:** Compare against a dummy bcrypt hash on the missing-user path to equalize timing.

### [SEC-16 · Low · High] Weak credential policy

- **Where:** `register.dto.ts` (password `MinLength(8)` only); `verify-pin.dto.ts` / `register.dto.ts` allow a 4-digit PIN.
- **Impact:** No complexity, breach-list, or length-beyond-8 requirement; a 4-digit PIN combined with SEC-06 is weak. Policy-level, but it lowers the bar for SEC-08/SEC-06 attacks.

## Cookie / CORS / session config (focus area)

- **Cookies (good, with caveat):** `auth.controller.ts:146-164` sets `httpOnly: true`, `sameSite` `lax`/`none` and `secure` driven by `COOKIE_CROSS_SITE` / `HTTPS_KEY`. Correct for the Vercel↔Render cross-site deploy. Caveat: no explicit `path`/`domain` scoping; the body-token leak (SEC-09) undercuts the httpOnly benefit.
- **CORS (good):** `main.ts:30-34` uses a concrete env-driven allowlist with `credentials: true` (no wildcard-with-credentials). The WS gateways read the same `CLIENT_ORIGIN`. Note: socket.io origin checks only constrain _browsers_ — a non-browser client ignores them, which is why SEC-04 matters.
- **Session handling (good):** `auth.guard.ts` re-validates the session on every request (exists / not revoked / not expired / idle-timeout), bumps `lastSeenAt`, and revokes on idle. Logout (`auth.service.ts:300`) and password reset (`recovery.service.ts:73`) revoke sessions, and revoked sessions cannot refresh (`auth.service.ts:265`). Session list/revoke endpoints are user-scoped — **no IDOR** (`sessions.service.ts:21`).

## Broader backend sweep

### [SEC-04 · High · High] Unauthenticated WebSocket gateways

- **Where:** `chat.gateway.ts` — `handleConnection` joins `workspace` with no auth; `chat:send` trusts `senderId`/`senderName` from the client payload (comment admits "we trust the senderId"). `tasks.gateway.ts` — no connection auth; broadcasts every `task:created/updated/deleted` to all clients.
- **Impact:** Any client (browser or script) can connect, **eavesdrop on the couple's entire chat and all task mutations**, and **send chat messages impersonating either partner** by setting `senderId`. Message `body` is unbounded and unsanitized (stored + broadcast; React escaping is the only XSS backstop on render).
- **Fix direction:** Authenticate the socket handshake (verify the access cookie/JWT), derive `senderId` server-side from the authenticated user, scope rooms per workspace, and bound message length.

### [SEC-05 · High · High] Unauthenticated generator endpoints

- **Where:** `tasks/generator.controller.ts` — `@Controller('tasks/generate')` with no `@UseGuards`; `start` / `stop` / `status` all open.
- **Impact:** Anyone can `POST /api/tasks/generate/start` to spawn tasks on an interval (resource exhaustion / data pollution) or `stop` the generator. No auth, no permission.
- **Fix direction:** Guard with `AuthGuard` + an admin/dev permission, or remove from production builds.

### [SEC-08 · Medium · High] No rate limiting anywhere

- **Where:** `app.module.ts` registers no `ThrottlerModule`; no `ThrottlerGuard`. `main.ts` adds none.
- **Impact:** `/auth/login` (password), `/auth/login/otp` (capped per-attempt-row but not per-IP), `/auth/login/pin` (uncapped — SEC-06), `/auth/recover/*` (reset-code guessing), and `/auth/refresh` all accept unlimited requests. Enables online brute force and credential stuffing.
- **Fix direction:** Add `@nestjs/throttler` globally with stricter limits on the auth routes.

### [SEC-11 · Medium · Medium] No security headers

- **Where:** `main.ts` — no `helmet()` or equivalent.
- **Impact:** Missing CSP, HSTS, X-Frame-Options/frame-ancestors (clickjacking), X-Content-Type-Options, Referrer-Policy. The embedded GraphQL Sandbox + reflected content raise the value of a CSP.
- **Fix direction:** `app.use(helmet())` with a tuned CSP.

### [SEC-12 · Medium · Medium] GraphQL hardening disabled in committed config

- **Where:** `graphql.module.ts:35-37` — `introspection: true`, `csrfPrevention: false` ("dev-only" but committed), `ApolloServerPluginLandingPageLocalDefault({ embed: true })` serving the Sandbox at `GET /graphql`.
- **Impact:** Schema disclosure + a CSRF-able, browsable mutation surface — which, combined with SEC-01, is unauthenticated. Even after SEC-01 is fixed, these should be off in prod.
- **Fix direction:** Disable introspection + Sandbox and enable CSRF prevention when `NODE_ENV==='production'`.

### [SEC-15 · Low · Medium] Client-controlled IP trusted for session/log

- **Where:** `auth.controller.ts:19-24` (`meta()` reads `x-forwarded-for` first); `logging.interceptor.ts` records `req.ip`.
- **Impact:** A client can spoof `X-Forwarded-For`, polluting session IPs, action logs, and the anomaly detector's per-IP signals. Set Express `trust proxy` to the known proxy and read the real client IP from the trusted hop only.

### [SEC-17 · Low · Medium] No GraphQL depth/complexity limiting

- **Where:** `graphql.module.ts` — no depth/complexity plugin; `TaskGQL.comments` is a resolve-field enabling nested expansion.
- **Impact:** Expensive/cyclic queries can be issued (unauthenticated, per SEC-01) for DoS.
- **Fix direction:** Add a query depth + cost limit.

### [SEC-18 · Info · High] Permission-based, not ownership-scoped, authorization

- **Where:** `tasks.controller.ts` / `tasks.service.ts` operate on any task id given the right permission; no check that the task belongs to the caller's workspace. Same for comments.
- **Impact:** Acceptable for the current single shared 2-person workspace (both partners share everything by design), but there is no tenancy boundary — if the product ever hosts more than one couple, every authenticated user can read and modify every task/comment. Worth recording as a design constraint before any multi-tenant move.

### Logging note

- `logging.interceptor.ts` logs method + **full URL including query strings** (not request bodies — credentials in POST bodies are safe). Query-param secrets (e.g. `?email=` on the dev inbox, any future token-in-URL) would land in the `action_log` table. Low, but tighten if query secrets are ever introduced.

## Positive security findings (preserve these)

- **Hashing done right:** passwords, OTP, PIN, and reset codes are all bcrypt-hashed (cost 10); OTP and reset codes use `crypto.randomInt` (CSPRNG).
- **Session lifecycle is enforced server-side:** every request re-checks revoked/expired/idle; logout and password-reset revoke sessions; revoked sessions can't refresh. Logout genuinely invalidates the access token.
- **Session revoke endpoints are user-scoped — no IDOR.**
- **REST is consistently gated:** `AuthGuard` + `PermissionsGuard` + per-route `@RequirePermissions` across tasks, admin users, logs, observation, sessions.
- **Anti-enumeration on password recovery** (`request()` always returns `{ ok: true }`).
- **Global `ValidationPipe`** with `whitelist: true` + class-validator DTOs; cross-site cookie flags are correct.
- **Frontend:** auth rides httpOnly cookies (`credentials: 'include'`); tokens are **not** persisted to localStorage; **no `dangerouslySetInnerHTML`** anywhere (React escaping mitigates stored-XSS from chat/comments).

## Recommended remediation order (Phase 2)

1. **SEC-01** — guard the GraphQL resolvers (or remove GraphQL from prod). Single largest exposure.
2. **SEC-02 / SEC-03 / SEC-07** — close the fail-open defaults: `MAIL_DEV=false`, fail-fast on missing `JWT_SECRET`, stop seeding/printing real admin creds.
3. **SEC-04 / SEC-05** — authenticate the WebSockets; guard the generator endpoints.
4. **SEC-06 / SEC-08** — cap PIN attempts; add global rate limiting.
5. **SEC-09 / SEC-10 / SEC-11 / SEC-12** — stop leaking tokens in bodies; rotate refresh tokens; add Helmet; disable GraphQL introspection/Sandbox/CSRF-off in prod.
6. **SEC-13–18** — hardening pass (alg pinning, timing, trust-proxy, password policy, query limits, tenancy note).

---

# Functional bug sweep (Phase 1)

> `source=bugsweep`. Whole app, frontend + backend. Focus: logic errors, WebSocket-gateway races, error-handling gaps, and Postgres↔Mongo data consistency. **Coverage-first — every finding is listed including low-confidence and low-severity ones, unfiltered.** Severity = High / Medium / Low. Confidence = High / Medium / Low. Read-only. Items that overlap the security review or the audit are cross-referenced, not re-derived.

## Summary table

> Superseded by the consolidated **Findings backlog (Phase 1)** table at the top of this file.
> The per-finding detail for each BUG-xx follows below.

## Backend — logic errors

- **[BUG-01 · Med · High] Chat history timestamps are always the current time.** `chat.service.ts:48` — `toPayload` returns `createdAt: new Date().toISOString()` instead of the document's stored `createdAt`. The Mongo schema _does_ persist `createdAt` (`message.schema.ts:9`, `timestamps: true`), and reads are sorted by it, but the value handed to the client is "now". Result: opening chat history shows every past message stamped at page-load time. Frontend `ChatPanel` renders `m.createdAt` directly, so the bug is user-visible.
- **[BUG-02 · Med · High] Task creator is always the first owner.** `tasks.service.ts:121-127` `resolveDefaultCreator()` pulls `role === 'owner'` (the seeded Ana) and uses it as `createdById` for every create, ignoring the authenticated user — even though auth has landed (the comment "Until Silver auth lands" is stale). Any task Dan creates is recorded as created by Ana. The GraphQL `createTask` path (SEC-01, unauthenticated) hits the same default.
- **[BUG-03 · Med · High] Comment authorship + ownership check are broken.** `comments.service.ts:77-82` `resolveDefaultAuthor()` returns the first owner for _every_ request. So (a) all comments are attributed to the owner regardless of who wrote them, and (b) the edit/delete guard `c.authorId !== author.id` compares owner-against-owner and effectively always passes — the "only the author can edit/delete" rule is a no-op. Pairs with the frontend BUG-18.
- **[BUG-04 · Low · High] `update` doesn't re-validate due date.** `tasks.service.ts:66-81` sets `patch.dueDate` with no past-date check, while `create` enforces `assertDueDateNotInPast`. A task can be edited to a past due date.
- **[BUG-05 · Low · Med] Due-date timezone mismatch.** `tasks.service.ts:113-118` compares `new Date(dueDate)` (a `YYYY-MM-DD` string parsed as UTC midnight) against `today` set to _local_ midnight. Near midnight in non-UTC zones this can reject a valid "today" or accept a past date.
- **[BUG-06 · Low · Med] Stats quirks.** `stats.service.ts:71-72` `completionRate = done / total` includes cancelled tasks in `total`, understating the rate; `:74-81` does an N+1 (`findById` per top-commented task). Both minor. (Separately, the frontend statistics page shows hardcoded "+12%" and "Balanced" — see the design critique; those are client-only fabrications, not backend values.)
- **[BUG-07 · Low · High] Two parallel role systems.** `user.entity.ts` has a `role` string (`'owner'|'partner'`) _and_ a `roles` M:M relation (`'admin'|'user'`). `register()` always sets `role: 'partner'` while assigning the `user` relation; seed sets `'owner'`. Business logic keys off `role === 'owner'` (BUG-02/03) while RBAC keys off the relation. The two can drift; the string field is essentially decorative.

## Backend — race conditions (gateways + shared state)

- **[BUG-08 · Med · Med] `setState` TOCTOU.** `tasks.service.ts:92-105` reads the task, validates the transition against the in-memory `task.state`, then writes — no row lock or `@VersionColumn` on `Task`. Two concurrent `setState` calls (plausible: both partners act on the same task, REST + GraphQL both open) can each validate against the stale state and apply conflicting transitions; last-write-wins silently drops one. The gateway then emits both `task:updated` events out of order.
- **[BUG-09 · Low · Med-High] Observation upsert race.** `anomaly-detector.service.ts:98-114` `flag()` does find-then-(update|insert) on `(userId, resolved:false)` with no unique constraint. `observe()` is fired per request by the logging middleware and requests run concurrently, so two flags for the same user can both miss the existing row and insert duplicates, or both increment and lose one. Duplicate/!accurate observation rows in the admin UI.
- **[BUG-10 · Low · Med] Generator state is process-local.** `task-generator.service.ts` keeps `running`/`timer` in instance memory. Under more than one backend instance, `start`/`stop`/`status` only affect the instance that served the request, and the WS `generator:started/stopped` broadcast won't match other instances' actual state.

## Backend — error-handling gaps

- **[BUG-11 · Med · High] Admin user-delete throws a raw 500 for any real user.** `admin-users.controller.ts:36-40` hard-deletes via `users.delete(id)` with no reassignment. `task.entity.ts:36,40` (`assigneeId`, `createdById`) and `comment.entity.ts:19` (`authorId`) are all `onDelete: 'RESTRICT'`. Every seeded user is referenced by tasks/comments, so deletion fails at the DB with an unhandled FK-violation 500 rather than a clean error. (Orphan note: even if it succeeded, Mongo chat messages by that user are not cleaned — BUG-15.)
- **[BUG-12 · Low · Med] Stats stored-proc can be silently absent.** `sql-bootstrap.ts:17-19` warns-and-returns if `init-sql/` is missing; `tasks.repository.ts:89-104` `getUserTaskStats` then calls `get_user_task_stats($1)`, which throws "function does not exist" at request time. Deploy-environment dependent.
- **[BUG-13 · Low · High] Auth ephemera never swept.** Abandoned `login_attempts` (user starts login, never finishes) and unused `password_resets` are only deleted on access paths; there's no TTL/cron sweep, so both tables grow unbounded.
- **[BUG-14 · Med · High] `verifyPin` has no attempt cap.** Cross-reference SEC-06 — from the robustness angle, `auth.service.ts:197-224` increments `attempt.attempts` on a wrong PIN but never enforces `MAX_OTP_ATTEMPTS`, so the counter rises forever within the window.

## Data consistency — Postgres ↔ Mongo

- **[BUG-15 · Med · High] Chat sender references are unvalidated and orphan-prone.** Chat messages live in Mongo (`message.schema.ts`); `senderId`/`senderName`/`senderColor` are free strings taken from the client (WS, SEC-04) with no check against the Postgres `users` table. So a message can reference a non-existent or spoofed user, and deleting a Postgres user leaves their Mongo messages orphaned (no cross-DB cascade). `senderName`/`senderColor` are also denormalized snapshots — renaming a user or changing avatar color won't update historical messages.
- **[BUG-16 · Low · High] No cross-store transaction.** A Mongo chat insert commits independently of any Postgres state; the two databases have no shared transaction or reconciliation. Acceptable for append-only chat, but worth recording as an explicit boundary — there is no mechanism to detect or repair divergence.

## Frontend — identity

- **[BUG-17 · Med · High] `currentUser` is the first user, not the logged-in user.** `TasksContext.tsx:401` `currentUser: users[0]`. `AuthContext` holds the real authenticated user (`auth.me()`), but TasksContext never consumes it. Anything keyed off `currentUser` ("mine vs theirs", future presence) is wrong for whichever partner isn't `users[0]`.
- **[BUG-18 · Med · High] Comment edit/delete controls never appear.** `CommentsThread.tsx:20` `const CURRENT_USER_ID = 'u1'`; `:143` `isMe = c.authorId === 'u1'`. Real author IDs are UUIDs, so `isMe` is never true on persisted comments → the ✎/🗑 controls (gated on `isMe`, `:194`) never render for anyone. (Briefly true for an optimistic insert, which sets `authorId='u1'`, then vanishes when the real comment replaces it.) Compounds backend BUG-03.
- **[BUG-19 · Low · High] Optimistic task uses a placeholder creator.** `TasksContext.tsx:124` `createdById: 'u1'`. Cosmetic — replaced on server echo — but renders a wrong creator for the optimistic window and is a latent bug if any UI keys off it.

## Frontend — offline sync (data consistency)

- **[BUG-20 · Med · High] Offline edits to an offline-created task are lost.** Create-while-offline enqueues with a `tempId` and shows an optimistic task (`TasksContext.tsx:319-337`). A subsequent offline update/delete/state enqueues an op with `taskId = tempId`. On reconnect drain (`:280-313`), the create runs first and the row is remapped (`REPLACE_ID tempId→real`), but the dependent op still carries `tempId`. `api.updateTask(tempId,…)` 404s → treated as a non-network error → the op is dropped (`offlineQueue.remove`) and a page-1 refetch runs. The user's offline change never reaches the server, with no error surfaced. The queue needs a tempId→realId remap as each create resolves.
- **[BUG-21 · Med · Med] Offline create that fails server validation vanishes silently.** Offline creates skip backend validation (assignee exists, due date not past). If state changed by sync time (e.g., the due date is now in the past), the drained create throws a non-network error → op dropped + page-1 refetch (`:298-309`) replaces the list, removing the optimistic task. The user sees their task disappear with no explanation.
- **[BUG-22 · Low · Med] Mid-drain failure resets the list.** On any non-network failure during drain, `SET_TASKS` with page-1 results runs _inside_ the loop (`:302-308`), discarding all loaded pages and resetting `currentPage/totalPages` while remaining ops continue to drain against the truncated state.
- **[BUG-23 · Low · Med] Offline queue is not concurrency-safe.** `offlineQueue.ts:36-39,42-64` does `save([...load(), op])` — a read-modify-write on a single localStorage key. Two tabs (or very rapid enqueues) can overwrite each other's queue and lose ops. No size cap either (unbounded if perpetually offline).

## Frontend — realtime / counters

- **[BUG-24 · Low · High] `totalTasks` double-counts own mutations.** `createTask` does `setTotalTasks(n=>n+1)` optimistically (`:322`), and the WS `task:created` echo for the same task does it again (`:239`). Symmetrically, `deleteTask` (`:359`) and the WS `task:deleted` echo (`:246`) both decrement. The "N of M total" counter drifts from reality with every local create/delete.
- **[BUG-25 · Med · Med] Optimistic create + WS echo can duplicate a row.** If the WS `task:created` (real id) arrives before `api.createTask` resolves: `onCreated` UPSERTs the real task (inserted, since it's new), then the awaited `REPLACE_ID(tempId→real)` (`:327`) overwrites the temp slot with the real task too — `REPLACE_ID` doesn't check for an existing real id elsewhere → two array entries with the same id.
- **[BUG-26 · Med · Med] No resync after reconnect.** socket.io doesn't replay missed events; while the socket is disconnected (offline), other clients' `task:created/updated/deleted` are lost. On reconnect the list is only re-hydrated if there were queued local ops (`:276-316`) — a passive client that just went offline and back shows a stale list.
- **[BUG-27 · Low · Med] WebSocket-only transport.** `ws.ts:30` `transports: ['websocket']` with no polling fallback; behind proxies that block raw WS the client never connects and realtime silently fails (no error surfaced).

## Frontend — error handling / UX

- **[BUG-28 · Med · Med-High] ChatPanel drops messages when disconnected.** `ChatPanel.tsx:49-60` `send()` calls `socket.emit('chat:send', …)` then clears the draft unconditionally. If the socket is disconnected, the emit is a silent no-op — the message is neither queued nor persisted, the draft is gone, and the user gets no error. No optimistic insert and no delivery ack.
- **[BUG-29 · Low · High] ChatPanel history errors swallowed.** `ChatPanel.tsx:23` `chatApi.history(ROOM).then(setMessages).catch(()=>{})` — a failed history load leaves an empty panel indistinguishable from "no messages", with no retry.
- **[BUG-30 · Low · Med] Network blip during refresh logs you out.** `api.ts:70-79` — on a 401, if the `/auth/refresh` fetch throws (offline), the catch falls through and dispatches `auth:unauthorized`, which `AuthContext` turns into a redirect to `/login`. A transient network failure is treated as a dead session.
- **[BUG-31 · Low · High] No single-flight on refresh.** `api.ts:70-73` — concurrent 401s each fire their own `/auth/refresh`. Harmless today (no refresh rotation) but a thundering herd, and it breaks the moment SEC-10 (rotation) is implemented.
- **[BUG-32 · Low · High] GraphQL client sends no credentials.** `api.ts:159-163` `graphql()` omits `credentials:'include'`, so no auth cookie is sent. It only works because the resolvers are unguarded (SEC-01); fixing SEC-01 will make this client 401 on every call.
- **[BUG-33 · Low · High] Comments aren't realtime and have no offline support.** `CommentsThread` is self-contained REST with no WS subscription and no offline queue (unlike tasks). A partner's new comment — and the task's `commentCount` — only appear after a manual reload; offline comment actions just error.
- **[BUG-34 · Low · Low] False "· edited" possible.** `CommentsThread.tsx:144` `isEdited = c.updatedAt !== c.createdAt` string-compares timestamps; if TypeORM writes slightly different create/update values on insert, a never-edited comment shows "· edited".
- **[BUG-35 · Low · High] Search is loaded-pages-only.** `tasks/page.tsx:51-59` filters client-side on `title` only, and infinite scroll is disabled while any filter/search is active (`:66-73`) — so search never reaches tasks that haven't been scrolled into memory. Users will believe matching tasks don't exist.
- **[BUG-36 · Low · High] Generator toggle hides failures.** `TasksContext.tsx:389-394` `start/stopGenerator` swallow errors and set `generatorRunning` optimistically; a failed call leaves the button showing the wrong state.
- **[BUG-37 · Low · High] First session has blank metadata.** `auth.service.ts:100` `register()` calls `completeLogin(user, { ip: '', userAgent: '' })`, so the session created at registration stores empty ip/userAgent — the sessions UI shows a blank device for it.

## Notes for backlog consolidation

- BUG-14 ≡ SEC-06; BUG-15/16 are the data-integrity face of SEC-04; BUG-32 depends on SEC-01; the sidebar nested-`<Link>` (audit P2) is also a functional nav bug. Dedupe these when merging.
- The identity cluster (BUG-02, BUG-03, BUG-17, BUG-18, BUG-19) all trace to one root: the authenticated user from `AuthContext` / the JWT is never threaded into task/comment creation or the "mine" checks. Fixing that one wire removes five findings.

---

## Per-surface design critiques (raw)

The full impeccable per-surface critique prose (register, auth, tasks, chat, statistics, admin,
pulse, account) — Design Health Scores, anti-pattern verdicts, persona red flags, and minor
observations — has been moved to [CRITIQUES-RAW.md](CRITIQUES-RAW.md) to keep this plan scannable.
Every actionable finding from those critiques is captured in the consolidated table at the top of
this file (rows tagged `source=critique`).

## Scoped features + fixes (Phase 2)

> Phase 2 is decision + sequencing only. No build in this phase except the security track, which runs separately: SEC-01–07 are fixed on `hotfix/security-phase1`; SEC-08–17 follow the remediation order in the security section above and stay on the security track.

### Locked decisions (made with the product owner)

| ID            | decision                                                                                                                                                                                                                                                          | status                  |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- |
| FD-03         | **Remove** the Contribution Ranking leaderboard outright. No replacement ranking, medals, or per-person score of any kind (PRODUCT.md anti-gamification).                                                                                                         | **Locked** → ADR-0001   |
| FD-04         | Replace the banned hero-metric stat cards with a **shared-progress view**: a 2-person-aware summary framed as "what we moved together", never as a comparison between partners.                                                                                   | **Locked** → ADR-0001   |
| FD-05 + FD-06 | **Signature build.** Dual-presence (real partner online/viewing state, replacing the stubbed always-offline dot) plus the mine/theirs identity layer on tasks and comments. These two ship together — presence without identity (or vice versa) is half a feature. | **Locked** → ADR-0002   |
| FD-16         | **Pulse = Couple Pulse.** Per-partner mood/energy check-in → **Sync Score**, a shared mood reading (explicitly *not* a grade, streak, or target) → one suggested shared activity. Generation reuses the existing local Ollama client (`logging/ai/ollama.client.ts`) with graceful degradation when Ollama is unavailable. | **Locked** → ADR-0004   |
| SEC-18        | **Single-tenant is deliberate.** One couple per deployment; authorization stays permission-based, not ownership-scoped. Multi-tenancy requires a new ADR before any work in that direction.                                                                       | **Locked** → ADR-0003   |

### Approved decisions (veto pass complete 2026-06-10 — zero vetoes)

The remaining FD rows, approved as proposed by the product owner. These are now binding for the build; reopening one means a new decision entry (and an ADR if contested). FD-13 and FD-14 resolved into mechanical token/markup work and were moved to the **Fixes** table at the top of this file.

| ID            | approved decision                                                                                                                                                                                                               |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| FD-01 + FD-02 | Sidebar footer user menu (avatar + name → Account, Sign out) + an `/account` index page linking profile / security / sessions. Kills the 404 and the unreachable-surface IA gap.                                                |
| FD-17         | Account IA: profile (display name, avatar color), security (in-app password change, PIN change, session list). **Partner connection/invite flow deferred** — the couple is seeded, single-tenant (SEC-18); an invite flow is a later ADR. |
| FD-07         | Step indicator on login ("Step 2 of 3 · code from your email"); step count adapts if PIN is optional (FD-10).                                                                                                                   |
| FD-08 + FD-11 | One shared `AuthLayout` across login/register/forgot/reset: split layout at `lg+` with a brand panel (crimson heart + product premise copy, no gradient), collapsing to a centered card on mobile.                              |
| FD-09         | Register heading names the premise (e.g. "One shared space for the two of you"); all SaaS copy ("No credit card needed") removed.                                                                                               |
| FD-10         | PIN moves to a collapsed optional section on register with plain-language copy ("Add an extra check at sign-in"), mono input per DESIGN.md.                                                                                     |
| FD-12         | Chat header becomes the partner's name + presence dot (it is a 1:1 conversation, so the header is the person, like any messenger). All "Workspace" copy/breadcrumbs replaced with relationship-centric language ("Our space").  |
| FD-15         | Admin logs get text search, filter by user/action/date range, sortable columns, server-side pagination. Plain table is fine — admin-only surface.                                                                               |

### Fix sequencing (waves)

Order is dependency-driven: tokens unblock the visual sweep, the identity wire unblocks the signature features. Every backlog ID is slotted; nothing is dropped.

**Wave 0 — security track (separate, in flight).** SEC-01–07 done on `hotfix/security-phase1`; SEC-08–12 next, then SEC-13–17 hardening.

**Wave 1 — foundations (highest leverage, do first).**
- `globals.css` batch (one file): **AUD-02** token block (auto-resolves **AUD-01** focus rings), **AUD-05** Arial→Geist, **AUD-09** global reduced-motion block, **AUD-13** easing, **AUD-14** remove dark-mode block.
- **Identity wire** (one root fix): thread the authenticated user from AuthContext/JWT into task & comment creation and the "mine" checks — resolves **BUG-02, BUG-03, BUG-17, BUG-18, BUG-19** at once. Hard prerequisite for FD-05/FD-06.
- **BUG-32** `graphql()` missing `credentials:'include'` — a live regression now that SEC-01 guards the resolvers; the GraphQL client 401s without it.

**Wave 2 — mechanical token/markup sweep (after Wave 1 tokens exist).**
- Color migration: **AUD-03** (~55 inline hex), **AUD-04** (banned cream), **AUD-15** (stale navy + typo), **FD-13** chat bubble re-color, **FD-14** eyebrow removal.
- Markup/a11y: **AUD-06** heading levels, **AUD-07** nested sidebar links, **AUD-08** ARIA on icon-only controls, **AUD-11** 12px text floor, **CR-06** priority not color-alone, **CR-11** overdue contrast, **CR-12** task rows → real buttons.

**Wave 3 — correctness fixes.**
- Backend logic: **BUG-01** chat timestamps, **BUG-04/05** due-date validation, **BUG-06** stats math, **BUG-07** role-system unification, **BUG-08** setState locking, **BUG-11** admin delete, **BUG-37** session metadata; long tail **BUG-09, BUG-10, BUG-12, BUG-13, BUG-15, BUG-16**.
- Frontend error handling/UX: **CR-02** device labels, **CR-03/CR-09/CR-13** surfaced errors, **CR-04** PIN back button, **CR-08** styled confirm, **CR-10** poll control, **BUG-29, BUG-30, BUG-31, BUG-34, BUG-36**.
- Offline/realtime: **BUG-20, BUG-21, BUG-22, BUG-23, BUG-24, BUG-25, BUG-26, BUG-27, BUG-28, BUG-33, BUG-35**.

**Wave 4 — signature feature build (identity).** Depends on Wave 1 identity wire + SEC-04 (authed WS, done).
- **FD-06** dual-presence (server-side presence over the authenticated sockets; sidebar dot, task-row co-presence, modal co-presence per DESIGN.md §5).
- **FD-05** mine/theirs layer on tasks/comments.
- **FD-03** leaderboard removal + **FD-04** shared-progress view — **CR-01** (fabricated KPIs) and **CR-07** (hardcoded legend names) die with this rebuild.
- **FD-01 + FD-02** account entry point + index page.

**Wave 5 — surface feature build.**
- **FD-16** Couple Pulse (replaces the placeholder; kills **CR-05** jargon copy).
- Auth surface: **FD-07, FD-08, FD-09, FD-10, FD-11**.
- **FD-12** chat/workspace rename, **FD-15** logs tooling, **FD-17** account IA.
- Responsive/touch: **AUD-10** 44px targets + touch-visible controls, **AUD-12** responsive ChatPanel.

### Stretch — only after Wave 4 ships

> **Guardrail:** no new features get built until dual-presence (FD-05/FD-06) is functional and shipped.

## Decisions / ADRs

ADRs live in [docs/adr/](docs/adr/):

- [ADR-0001](docs/adr/0001-remove-leaderboard-shared-progress.md) — Remove the contribution leaderboard; statistics become a shared-progress view (FD-03, FD-04)
- [ADR-0002](docs/adr/0002-dual-presence-identity-signature.md) — Dual-presence + mine/theirs identity layer are the signature build (FD-05, FD-06)
- [ADR-0003](docs/adr/0003-single-tenant-by-design.md) — Single-tenant, permission-based authorization is deliberate (SEC-18)
- [ADR-0004](docs/adr/0004-couple-pulse.md) — Pulse is Couple Pulse: check-in → Sync Score → suggested activity, via local Ollama (FD-16)

The "Approved decisions" table above was approved as proposed on 2026-06-10 (zero vetoes). Those rows are deliberately not ADR-backed — they were uncontested defaults; promote one to an ADR only if it is later reopened and actually debated.

## Handoff notes

- **Phase 1** (review) is complete: backlog table above + [CRITIQUES-RAW.md](CRITIQUES-RAW.md).
- **Security track** runs independently on `hotfix/security-phase1` (SEC-01–07 fixed; two pre-existing test failures are unrelated; SEC-07 has a seed residual to finish).
- **Phase 2** (this section) is complete: all decisions locked or approved (veto pass 2026-06-10, zero vetoes). Next action: build starts at **Wave 1** — `globals.css` tokens, the identity wire, and BUG-32 are the first three changes.
- Wave 1's identity wire is the single highest-leverage code change outside security: five findings collapse into one fix and it unblocks the signature features.
