# Together v2 Redesign Plan

## Findings backlog (Phase 1)

<!-- design + security findings: confidence, severity, surface -->

---

# /impeccable audit — code-level technical audit (Phase 1)

> Scope: `together-app-ui` (Next.js frontend). This is the **code-level, verifiable** pass — a11y, performance, responsive, theming, anti-patterns — distinct from the per-surface design critiques logged below. Where a finding overlaps a critique it is cross-referenced, not repeated. Run via the bundled detector + manual source verification. Confidence is **High** unless noted. Read-only; no fixes applied.

## Audit Health Score

| # | Dimension | Score | Key Finding |
|---|-----------|-------|-------------|
| 1 | Accessibility | 1/4 | App-wide focus ring never renders (undefined `cr`/`cr-pale` tokens in shared FormInput); ~zero `aria-label`/`role`; no reduced-motion |
| 2 | Performance | 3/4 | No raster images; optimistic updates + memoization present. Minor: 5s admin poll, per-render inline-style object churn |
| 3 | Responsive Design | 2/4 | Fixed 320×448 ChatPanel; touch targets far below 44px; 8–10px text below readable floor; hover-only controls dead on touch |
| 4 | Theming | 0/4 | Entire DESIGN.md token system undefined in `globals.css`; ~55 inline color styles; banned `#E8D5B7` cream + old `#2C3E50` navy persist; body font is Arial, not Geist |
| 5 | Anti-Patterns | 1/4 | Hero-metric cards, eyebrow-on-every-section, contribution leaderboard, support-widget chat, gray-on-color, bounce easing, side-stripe nav |
| **Total** | | **7/20** | **Poor — major overhaul needed** |

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
- **Impact:** Page fade, row stagger, modal slide, stat pop, button press-scale, and the count-up all fire regardless of OS reduced-motion preference. DESIGN.md "Do": reduced-motion alternative for *every* animation; PRODUCT.md: "Support reduced motion."
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
- **Impact:** DESIGN.md §2 states `sl` (#1A2535) *replaces* the old Flat-UI `#2C3E50`; the old value persists on the sidebar/chat/hero, and shadows still use the old navy's RGB instead of the spec'd `rgba(26,37,51,…)`.
- **Recommendation:** Migrate to `sl` token + spec'd shadow RGB during the token sweep.
- **Suggested command:** `/impeccable harden`

## Patterns & Systemic Issues

1. **The design system is unrendered.** Every brand finding traces to the missing `@theme inline` token block. Fixing `globals.css` is the highest-leverage single edit in the project — it resolves the P0 focus ring, the colorless links, the heading font, the toggle active states, and unblocks the inline-style cleanup.
2. **Inline hex is the dev workaround for missing tokens.** ~55 inline color styles exist *because* `bg-cr` didn't work. Define tokens first, then the replacement is mechanical.
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

> `source=security`. Scope: NestJS backend (`together-backend`) with focus on the JWT/OTP/PIN auth flow, session handling, and cookie/CORS config, plus a sweep of the rest of the backend and the frontend. Severity = Critical / High / Medium / Low. Confidence = High / Medium / Low. Read-only; nothing fixed. **Threat-model note:** many issues are *fail-open defaults* — the app is only secure if a specific env var is set in production. Verify the prod env before any deploy.

## Severity summary

| ID | Severity | Conf. | Finding | Surface |
|----|----------|-------|---------|---------|
| SEC-01 | **Critical** | High | GraphQL resolvers have no guards — entire data model is unauthenticated read/write, bypassing all RBAC | `graphql/*` |
| SEC-02 | **High** | High | `/auth/dev/inbox` + `devOtp`/`devCode` fail-open OTP/reset-code oracle (MAIL_DEV defaults `true`) | auth |
| SEC-03 | **High** | High | Hardcoded fallback JWT secret `dev-only-secret-change-me` (forge any token if `JWT_SECRET` unset) | auth |
| SEC-04 | **High** | High | WebSocket gateways unauthenticated — chat sender spoofing + eavesdropping on both partners | chat/tasks ws |
| SEC-05 | **High** | High | Generator endpoints `/tasks/generate/*` have no guards (DoS / data pollution) | tasks |
| SEC-06 | **High** | High | No attempt cap on PIN verification — 4–6 digit PIN brute-forceable | auth |
| SEC-07 | **High** | High | Seeded weak admin creds (`anaana123` / PIN `1234`) also printed in login bundle | auth/ui |
| SEC-08 | Medium | High | No rate limiting anywhere (password / OTP / reset / refresh brute force) | global |
| SEC-09 | Medium | Med | Access + refresh tokens returned in response body (XSS-exposable, partially defeats httpOnly) | auth |
| SEC-10 | Medium | Med | Refresh tokens never rotated, 7-day TTL, no reuse detection | auth |
| SEC-11 | Medium | Med | No security headers (no Helmet: CSP / HSTS / X-Frame-Options absent) | global |
| SEC-12 | Medium | Med | GraphQL introspection on + CSRF off + embedded Sandbox at `/graphql` in committed config | graphql |
| SEC-13 | Low | Med | JWT verified without algorithm pinning (`algorithms: ['HS256']`) | auth |
| SEC-14 | Low | Med | Email enumeration via login timing (bcrypt skipped when user missing) | auth |
| SEC-15 | Low | Med | Client-controlled `X-Forwarded-For` trusted for session/log IP | auth/logging |
| SEC-16 | Low | High | Weak credential policy (password min-8 only; 4-digit PIN allowed) | auth |
| SEC-17 | Low | Med | No GraphQL query depth/complexity limit (DoS, compounded by SEC-01) | graphql |
| SEC-18 | Info | High | Authorization is permission-based, not ownership-scoped (every user can touch every task) | tasks/comments |

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
- **CORS (good):** `main.ts:30-34` uses a concrete env-driven allowlist with `credentials: true` (no wildcard-with-credentials). The WS gateways read the same `CLIENT_ORIGIN`. Note: socket.io origin checks only constrain *browsers* — a non-browser client ignores them, which is why SEC-04 matters.
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

| ID | Area | Sev | Conf | One-liner |
|----|------|-----|------|-----------|
| BUG-01 | BE logic | Med | High | Chat history timestamps are all "now" — `toPayload` ignores stored `createdAt` |
| BUG-02 | BE logic | Med | High | Task `createdById` is always the first owner, not the actual creator |
| BUG-03 | BE logic | Med | High | All comments attributed to the first owner; edit/delete ownership check is a no-op |
| BUG-04 | BE logic | Low | High | `update` skips the due-date-in-past check that `create` enforces |
| BUG-05 | BE logic | Low | Med | `assertDueDateNotInPast` UTC-vs-local mismatch can misjudge "today" |
| BUG-06 | BE logic | Low | Med | `completionRate` counts cancelled tasks in the denominator; N+1 in top-commented |
| BUG-07 | BE logic | Low | High | Two parallel role systems (`user.role` string vs `roles` relation) drift |
| BUG-08 | BE race | Med | Med | `setState` TOCTOU — concurrent transitions both pass validation (no locking) |
| BUG-09 | BE race | Low | Med-High | `AnomalyDetector.flag()` upsert race → duplicate observations / lost score |
| BUG-10 | BE race | Low | Med | Generator run-state is an in-memory singleton (wrong under multi-instance) |
| BUG-11 | BE errors | Med | High | Admin user-delete 500s on any user referenced by a task/comment (FK RESTRICT) |
| BUG-12 | BE errors | Low | Med | Missing `init-sql/` silently disables the stats stored-proc → runtime throw |
| BUG-13 | BE errors | Low | High | Abandoned login-attempts / unused resets are never swept |
| BUG-14 | BE errors | Med | High | `verifyPin` has no attempt cap (also SEC-06) |
| BUG-15 | Data PG↔Mongo | Med | High | Chat `senderId` unvalidated against Postgres users; orphaned on user delete |
| BUG-16 | Data PG↔Mongo | Low | High | No cross-store integrity/transaction between Mongo chat and Postgres |
| BUG-17 | FE identity | Med | High | `currentUser = users[0]`, not the authenticated user (AuthContext ignored) |
| BUG-18 | FE identity | Med | High | `CURRENT_USER_ID='u1'` → comment edit/delete never shows (IDs are UUIDs) |
| BUG-19 | FE identity | Low | High | `optimisticTask.createdById='u1'` placeholder |
| BUG-20 | FE sync | Med | High | tempId not remapped → offline edits to an offline-created task are dropped |
| BUG-21 | FE sync | Med | Med | Offline create failing server validation vanishes silently on drain |
| BUG-22 | FE sync | Low | Med | Mid-drain failure refetches page 1, discarding loaded pages + pagination |
| BUG-23 | FE sync | Low | Med | `offlineQueue` localStorage read-modify-write clobbers across tabs |
| BUG-24 | FE realtime | Low | High | Own create/delete double-counts `totalTasks` (optimistic + WS echo) |
| BUG-25 | FE realtime | Med | Med | Optimistic create + WS echo race can duplicate a row (`REPLACE_ID` no dedupe) |
| BUG-26 | FE realtime | Med | Med | No resync on socket reconnect → missed events leave the list stale |
| BUG-27 | FE realtime | Low | Med | `ws.ts` websocket-only transport → no realtime where raw WS is blocked |
| BUG-28 | FE errors | Med | Med-High | ChatPanel drops a message silently if the socket is disconnected |
| BUG-29 | FE errors | Low | High | ChatPanel history `.catch(()=>{})` → empty panel, no error on failure |
| BUG-30 | FE errors | Low | Med | Transient network blip during 401-refresh logs the user out |
| BUG-31 | FE errors | Low | High | No single-flight on `/auth/refresh` (thundering herd on concurrent 401s) |
| BUG-32 | FE errors | Low | High | `graphql()` omits `credentials:'include'` (works only because SEC-01) |
| BUG-33 | FE logic | Low | High | Comments are not realtime and have no offline support |
| BUG-34 | FE logic | Low | Low | `isEdited` string-compares timestamps → false "· edited" possible |
| BUG-35 | FE logic | Low | High | Task search is client-side, title-only, over loaded pages only |
| BUG-36 | FE errors | Low | High | Generator start/stop swallow errors but set state optimistically |
| BUG-37 | FE logic | Low | High | `register()` creates the first session with empty ip/userAgent |

## Backend — logic errors

- **[BUG-01 · Med · High] Chat history timestamps are always the current time.** `chat.service.ts:48` — `toPayload` returns `createdAt: new Date().toISOString()` instead of the document's stored `createdAt`. The Mongo schema *does* persist `createdAt` (`message.schema.ts:9`, `timestamps: true`), and reads are sorted by it, but the value handed to the client is "now". Result: opening chat history shows every past message stamped at page-load time. Frontend `ChatPanel` renders `m.createdAt` directly, so the bug is user-visible.
- **[BUG-02 · Med · High] Task creator is always the first owner.** `tasks.service.ts:121-127` `resolveDefaultCreator()` pulls `role === 'owner'` (the seeded Ana) and uses it as `createdById` for every create, ignoring the authenticated user — even though auth has landed (the comment "Until Silver auth lands" is stale). Any task Dan creates is recorded as created by Ana. The GraphQL `createTask` path (SEC-01, unauthenticated) hits the same default.
- **[BUG-03 · Med · High] Comment authorship + ownership check are broken.** `comments.service.ts:77-82` `resolveDefaultAuthor()` returns the first owner for *every* request. So (a) all comments are attributed to the owner regardless of who wrote them, and (b) the edit/delete guard `c.authorId !== author.id` compares owner-against-owner and effectively always passes — the "only the author can edit/delete" rule is a no-op. Pairs with the frontend BUG-18.
- **[BUG-04 · Low · High] `update` doesn't re-validate due date.** `tasks.service.ts:66-81` sets `patch.dueDate` with no past-date check, while `create` enforces `assertDueDateNotInPast`. A task can be edited to a past due date.
- **[BUG-05 · Low · Med] Due-date timezone mismatch.** `tasks.service.ts:113-118` compares `new Date(dueDate)` (a `YYYY-MM-DD` string parsed as UTC midnight) against `today` set to *local* midnight. Near midnight in non-UTC zones this can reject a valid "today" or accept a past date.
- **[BUG-06 · Low · Med] Stats quirks.** `stats.service.ts:71-72` `completionRate = done / total` includes cancelled tasks in `total`, understating the rate; `:74-81` does an N+1 (`findById` per top-commented task). Both minor. (Separately, the frontend statistics page shows hardcoded "+12%" and "Balanced" — see the design critique; those are client-only fabrications, not backend values.)
- **[BUG-07 · Low · High] Two parallel role systems.** `user.entity.ts` has a `role` string (`'owner'|'partner'`) *and* a `roles` M:M relation (`'admin'|'user'`). `register()` always sets `role: 'partner'` while assigning the `user` relation; seed sets `'owner'`. Business logic keys off `role === 'owner'` (BUG-02/03) while RBAC keys off the relation. The two can drift; the string field is essentially decorative.

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
- **[BUG-22 · Low · Med] Mid-drain failure resets the list.** On any non-network failure during drain, `SET_TASKS` with page-1 results runs *inside* the loop (`:302-308`), discarding all loaded pages and resetting `currentPage/totalPages` while remaining ops continue to drain against the truncated state.
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

## Design Health Score

register part
Anti-Patterns Verdict

Does this look AI-generated? Yes, clearly.

LLM assessment: The register page is the most AI-generated-looking surface in the app. Three independent tells
converge: (1) the split-panel layout with a gradient-left / form-right is the most common AI-generated auth page
template — it appears in roughly 60% of AI-generated SaaS designs regardless of brief; (2) the from-rose-50
to-amber-50 gradient is literally dating-app pink, the exact aesthetic Together's PRODUCT.md calls out as a "Don't" by
name; (3) the "No credit card needed" subheading is a SaaS conversion-copy tic that makes no sense for a private
couple app with no pricing tier. The page has zero of the "Two of Us" north star — it could be a sign-up page for
Notion, Linear, or Tinder with no edits needed.

Deterministic scan: Clean. The detector found 0 anti-pattern flags. The slop here is structural and strategic, not
pattern-level — split panels and SaaS-copy aren't rules the detector catches, but they're the most damaging issues.

Browser visualization: Not available in this session — no injection attempted. No overlays.

---

Overall Impression

Functional but identity-free. The error handling is solid, the validation logic is thoughtful (client-side, real-time
clearing, specific messages), and the form structure is clean. But this could be literally any app's register page.
Nothing says "The Two of Us." The left panel works against the brand. First-time users will have no idea why they're
being asked for a security PIN. The page as written is a usable form that tells the wrong story.

---

What's Working

1. Validation quality. Specific, inline, clears on edit, fires before server — this is correct behavior and matches
   the DESIGN.md principle of "clarity over cleverness." The role="alert" on error paragraphs is good.
2. Form field count is defensible. 5 fields is a lot, but the split between identity (name/email/password/confirm) and
   security (PIN) is a real distinction. The issue is communication, not count.
3. Single-column form on the right. The right panel's max-w-md constraint and flex-col layout are clean and readable.

---

Priority Issues

[P1] The left panel is a dating-app gradient

- What: bg-gradient-to-br from-rose-50 to-amber-50 — a rose-to-near-white gradient that reads as Valentine's Day
  warmth. This is directly named in PRODUCT.md anti-references ("dating-app performative warmth: no floating hearts, no
  rose or pink washes, no gradient fills").
- Why it matters: The first thing a new user sees when opening Together on desktop is pink gradient on the left and a
  blank form on the right. The page actively contradicts the brand before anyone reads a word. It also signals "AI
  generated this auth page" to anyone who has seen similar outputs.
- Fix: Replace the left panel with brand-committed content: Slate Void (#1A2535) background with the Pompeii Crimson
  heart logo, the "Together" wordmark, a one-sentence positioning line, and optionally partner avatar placeholders that
  establish the "two of us" model before signup. The panel should make someone want to fill out the form, not just
  provide visual balance.
- Suggested command: /impeccable craft register left-panel

[P1] Zero brand identity on the form side

- What: The form heading is "Create your account" — the most generic possible heading. The sub-copy is "No credit card
  needed." — SaaS template noise that is factually bizarre for a private couple app. There is no heart, no mention of
  Together, no positioning, nothing that suggests this is a product for two people beginning something together.
- Why it matters: Registration is the highest-stakes emotional moment in the product lifecycle. For "The Two of Us,"
  this should feel like the beginning of something — inviting, personal, specific. Currently it feels like a
  Stripe-template demo.
- Fix: The heading should acknowledge the product and its premise. "Start your shared space" or "Create Together, just
  for two" — something that names the product's value before asking for a password. Remove "No credit card needed."
  entirely: it answers a question nobody asked. Consider adding a subtle acknowledgment that both partners will share
  this account.
- Suggested command: /impeccable clarify register

[P1] Wrong heading level + broken focus rings

- What: The primary page heading uses h3, not h1. Screen readers navigate by heading level; a h3 as the first and only
  heading on the page is semantically incorrect. Compound issue: focus:ring-cr-pale in FormInput references an
  undefined Tailwind token, meaning keyboard-navigating users (and anyone tabbing through the form) get no visible focus
  ring. cr on the "Sign in →" link is also undefined, so the link may render as unstyled text with no visual
  distinction.
- Why it matters: Breaks the primary user flow for keyboard users and screen reader users. WCAG 2.1 AA requires
  visible focus indicators. This is the accessibility-critical finding on this page.
- Fix: Change h3 to h1. Define --color-cr, --color-cr-pale in globals.css @theme inline (one line each) so all
  existing token references resolve. This also fixes the "Sign in" link color.
- Suggested command: /impeccable audit register

[P2] Security PIN field: jargon label, wrong placement, wrong disclosure timing

- What: The label "Security PIN (optional — enables 3FA)" has three problems: "3FA" is unexplained technical jargon;
  "(optional — enables 3FA)" is long inline copy crammed into a form label; and showing it upfront creates a cognitive
  decision most first-time users are not ready to make (should I set this up now? what happens if I don't? what is
  3FA?).
- Why it matters: A first-time user sees 5 fields and one of them asks them to make an advanced security configuration
  decision with no context. Most will either skip it (fine) or worry they're misconfiguring something important. The
  anxiety is unnecessary.
- Fix: Move the PIN field into a collapsible "Advanced security" section, collapsed by default. Label it simply
  "Security PIN" with a helper text: "Adds a second factor at login. You can set this up later in your account
  settings." This removes the cognitive overload without removing the feature.
- Suggested command: /impeccable harden register

[P2] Token Law violations throughout

- What: The submit button uses style={{ background: '#C0392B' }} (inline hex). The text-cr class on the sign-in link,
  focus:border-cr and focus:ring-cr-pale in FormInput — these token references are all undefined in globals.css. Some
  produce no styles at all.
- Why it matters: The page is inconsistently styled: the button gets color via inline style while the link gets
  nothing via an undefined class. The focus ring (critical for accessibility) is broken. This is both a Token Law
  violation and a functional regression.
- Fix: Add to globals.css @theme inline: --color-cr, --color-cr-pale, --color-cr-deep, --color-sl, --color-sl-muted,
  --color-cm, --color-cm-pale, --font-display. Replace style={{ background: '#C0392B' }} with className="bg-cr".
- Suggested command: /impeccable audit (token fix pass)

---

Persona Red Flags

Jordan (First-Timer) — opening Together for the first time:
Jordan lands on this page with no context about what Together is. The left panel is a near-white pink gradient that
communicates nothing. The heading says "Create your account" — account for what? There is no product name visible, no
logo, nothing. Jordan reads the sub-copy: "No credit card needed." — and is now confused: was there supposed to be a
credit card? Jordan makes it to field 5: "Security PIN (optional — enables 3FA)." Jordan has no idea what 3FA is,
doesn't know whether to skip it, and feels like they might be setting up something incorrectly. Abandonment risk:
moderate-high on the PIN field specifically.

Sam (Screen Reader / Keyboard Navigation):
Sam tabs into the page. The first heading is h3 — a screen reader announces this as a third-level heading with no
parent h1 or h2. This is non-standard and confusing. Sam tabs through the form: 5 inputs, all labeled correctly
(good). Sam submits with an error — role="alert" fires correctly. Sam tabs to the "Sign in →" link — but since text-cr
is an undefined token, the link may have no visible color distinction from body text. Sam may not realize it's a link
without the color cue.

The Couple (project-specific) — one partner setting up Together to invite the other:
This persona doesn't exist in the standard set but is the core use case. The first partner is setting up the account
on behalf of both. Nothing on this page communicates that Together is for two people, that there will be a partner to
add, or what happens after they register. There's no "invite your partner" step, no mention of the shared space, no
sense of "you're starting something together." The page treats this like any solo-user SaaS sign-up. The emotional
hook that should anchor the product — the relationship — is entirely absent from the registration moment.

---

Minor Observations

- placeholder="Repeat your password" and placeholder="Min. 8 characters" are informative placeholders — good. But
  password requirements should be shown as static helper text, not only revealed on error.
- The noValidate attribute on the form is correct (disables browser default validation in favor of custom).
- The "Already have an account? Sign in →" footer link is appropriately understated and placed.
- On mobile (grid-cols-1), the left gradient panel is hidden entirely (hidden md:block). Mobile users get a plain
  white background with no brand presence at all.
- The → arrow on "Create account →" is a reasonable affordance but should be consistent with the login page's
  "Continue →" / "Verify →" pattern.

---

Questions to Consider

- What if the left panel was the first thing a new user read about Together — what would make them want to fill out
  the form?
- Does the Security PIN field need to be on the registration page at all, or does it belong in post-registration
  account settings?
- What would the "Two of Us" feel like on this page — what visual or copy element could signal "this is for you and
  your partner, not just you"?

---

Now persisting the snapshot:

| #                                 | Heuristic                       | Score | Key Issue                                                                            |
| --------------------------------- | ------------------------------- | ----- | ------------------------------------------------------------------------------------ |
| 1                                 | Visibility of System Status     | 3     | Loading state on button; inline errors on submit. No real-time validation;           |
| no success state before redirect. |
| 2                                 | Match System / Real World       | 3     | Natural language overall. "Security PIN (optional — enables 3FA)" is                 |
| unexplained jargon.               |
| 3                                 | User Control and Freedom        | 3     | Can navigate to /login. No path back to landing or home.                             |
| 4                                 | Consistency and Standards       | 2     | h3 for primary heading. Inline style= on button. cr and cr-pale are                  |
| undefined tokens.                 |
| 5                                 | Error Prevention                | 3     | Client-side validation; clears errors on change. No show/hide password toggle.       |
| Requirements hidden until error.  |
| 6                                 | Recognition Rather Than Recall  | 3     | Fields labeled and placeheld. No tooltip for PIN purpose or 3FA                      |
| concept.                          |
| 7                                 | Flexibility and Efficiency      | 2     | No keyboard shortcuts. autocomplete attributes not set. Optional PIN cannot          |
| be skipped visually.              |
| 8                                 | Aesthetic and Minimalist Design | 2     | Rose-amber gradient panel is dating-app pink and off-brand. Zero brand               |
| personality. SaaS copy noise.     |
| 9                                 | Error Recovery                  | 3     | Specific inline errors. role=alert. Server error in banner. Raw Error.message may be |
| technical.                        |
| 10                                | Help and Documentation          | 1     | No contextual help. No PIN explanation. Password requirements invisible until        |
| error.                            |
| Total                             |                                 | 25/40 | Acceptable — significant improvements needed                                         |

## Anti-Patterns Verdict

LLM: The register page is the most AI-generated-looking surface in the app. Split-panel layout with
gradient-left/form-right is the most common AI auth page template. The rose-to-amber gradient is dating-app pink —
a direct PRODUCT.md anti-reference violation. "No credit card needed" is SaaS template copy that makes no sense
for this product. Zero of the "Two of Us" north star is present.

Detector: 0 findings. Slop is structural/strategic, not pattern-level.

## Priority Issues

[P1] Left panel rose-amber gradient — dating-app pink, explicit PRODUCT.md anti-reference. Replace with
brand-committed content: Slate Void background, heart logo, positioning line, partner context.

[P1] Zero brand identity — "Create your account" + "No credit card needed" is generic SaaS template. Needs heading
that names the product premise and sub-copy that removes the pricing anxiety artifact.

[P1] h3 as page title (should be h1) + focus:ring-cr-pale and text-cr are undefined tokens, breaking focus rings
and link color for keyboard/screen reader users.
[P1] Zero brand identity — "Create your account" + "No credit card needed" is generic SaaS template. Needs heading
that names the product premise and sub-copy that removes the pricing anxiety artifact.

[P1] h3 as page title (should be h1) + focus:ring-cr-pale and text-cr are undefined tokens, breaking focus rings
and link color for keyboard/screen reader users.
white background with no brand presence at all.

- What if the left panel was the first thing a new user read about Together — what would make them want to fill out
  the form?
- Does the Security PIN field need to be on the registration page at all, or does it belong in post-registration
  account settings?
- What would the "Two of Us" feel like on this page — what visual or copy element could signal "this is for you and
  your partner, not just you"?

Three P1s and two P2s to act on. What do you want to tackle first?

1. Left panel — replace the rose-amber gradient with brand-committed content (Slate Void bg, heart logo, "Two of Us"
   framing). This is the biggest single first impression problem. → /impeccable craft register
2. Token definitions — add cr, cr-pale, cr-deep, sl, sl-muted, cm, cm-pale, font-display to globals.css. This unblocks
   focus rings, the sign-in link color, heading font, and the inline-style cleanup everywhere in the app. One file,
   immediate systemic fix. → /impeccable audit register
3. Heading and copy — h3 → h1, remove "No credit card needed", rewrite heading to name the product premise. →
   /impeccable clarify register
4. PIN field — move the Security PIN into a collapsed advanced section with plain-language helper text. → /impeccable
   harden register

The tokens fix (#2) is foundational — everything else will look better once cr and cr-pale resolve. But if the left
panel is what's most visually broken to you right now, that's the right place to start.

auth part

Anti-Patterns Verdict

Does this look AI-generated? Yes, clearly — and for the same reason as the register page.

LLM assessment: The login page is structurally identical to the register page: same split grid, same empty rose-amber
gradient left panel, same h3 font-display heading pattern, same style={{ background: '#C0392B' }} button. The left
panel is purposeless on both pages. The auth flow could belong to any SaaS product — nothing communicates that this is
a shared workspace for exactly two people. The ❤️ emoji in "Welcome back ❤️" attempts warmth but is the design
equivalent of putting a sticker on a generic form. The demo credentials block is the single most damaging element: it
makes the login page look like a public demo environment, not a personal shared workspace.

Deterministic scan: Clean — 0 findings across all three auth pages. The problems here are structural and strategic
(layout sameness, empty decorative panels, credential leakage) rather than pattern-detectable CSS anti-patterns.

---

Overall Impression

The 3-step security model (password → email OTP → PIN) is legitimately thoughtful and more secure than most apps in
this space. The concept is correct. The execution leaves users navigating a dark hallway: no step indicators, no back
button on the last step, demo credentials visible in production, and a visual identity borrowed from the SaaS sign-up
template library. The biggest quick win isn't aesthetic — it's removing the demo credentials block and adding step
progress indicators. After that, the left panel and the h3/h1 issue.

---

What's Working

1. The 3-step security architecture. Password + email OTP + PIN is a correct implementation of multi-factor auth for a
   private app. The staged login() → verifyOtp() → verifyPin() flow with separate attemptId handoffs is solid.
2. Anti-enumeration on forgot-password. "If that email exists, a recovery code has been sent" correctly avoids leaking
   whether an email is registered.
3. Conditional step rendering. The step === 'otp' and step === 'pin' guards mean each sub-form renders independently —
   clean mental model for the code even if not surfaced to the user.

---

Priority Issues

[P0] Demo credentials visible in production UI

- What: The login page renders a visible block — bg-gray-50 with hardcoded email addresses, passwords, and PINs — for
  all visitors. ana@together.dev / anaana123 / PIN 1234 and dan@together.dev / dandan123 are shown unconditionally.
- Why it matters: For a private couple app, the first thing a new user's partner sees when they open the login page is
  someone else's credentials. It signals "this is a demo environment" rather than "this is our private space." It's
  also a production security issue — anyone can log in as these accounts.
- Fix: Gate behind process.env.NODE_ENV === 'development' or remove entirely. If demo accounts need to exist, surface
  them only in a dev-mode overlay separate from the production login form. The devOtp and devCode banners in login and
  forgot-password have the same problem — add explicit NODE_ENV guards.
- Suggested command: /impeccable harden auth

[P1] No step progress in the 3-step login flow

- What: The login page has 3 distinct steps (password → OTP → PIN), but there is zero visual indication of
  progression. Users don't know how many steps there are, which step they're on, or why each step exists. The OTP step
  says "We sent a 6-digit code" with no "step 2 of 3" context. The PIN step says "Final step" which implies only 2 steps
  preceded it but doesn't communicate the overall shape of the flow.
- Why it matters: First-time users will be confused after entering their password and getting asked for a code. "Did
  something go wrong? Why am I seeing a new form?" Without step context, each screen transition feels like an error
  rather than a designed flow.
- Fix: Add a 3-step progress indicator above the form (not a heavy wizard bar — could be as simple as three dots or 1
  · 2 · 3 with the current step highlighted in cr). Add brief context copy at each transition: "Step 2 of 3: verify your
  email" and "Step 3 of 3: enter your PIN." The logic for which step is active already exists — just surface it
  visually.
- Suggested command: /impeccable craft login-progress

[P1] PIN step has no back button — user is trapped

- What: The OTP step (step === 'otp') has a "← Back" button that returns to the password step. The PIN step (step ===
  'pin') has no back button at all. If a user entered the wrong PIN or wants to restart, their only option is a hard
  page refresh — which loses their step state entirely.
- Why it matters: A user who typed an incorrect PIN and wants to check their credentials or re-enter the OTP has no
  path forward. The page is a dead end. Combined with the missing step counter, this creates a trapped feeling.
- Fix: Add a "← Back" button on the PIN step that returns to OTP (setStep('otp')). Note: this means the OTP code would
  need re-entry. That's the correct security behavior — make it explicit ("You'll need to re-enter your verification
  code").
- Suggested command: /impeccable harden auth

[P2] Left panel is the same empty rose-amber gradient as register

- What: bg-gradient-to-br from-rose-50 to-amber-50 hidden md:flex items-center justify-center — an empty, purposeless,
  dating-app-pink decorative panel on the left half of every desktop auth screen.
- Why it matters: Same PRODUCT.md anti-reference violation as the register page (see that critique). The auth flow
  shares the same visual template as register, which means entering the app for the 100th time feels identical to
  signing up for the first time. No returning-user warmth, no brand presence, no reason the panel exists.
- Fix: Replace with brand-committed content: the Together wordmark + heart logo on sl background. For the login page
  specifically, a subtle partner-presence indicator ("Ana is online now") would make returning feel different from
  registering. At minimum, the panel should make the app feel inhabited, not vacant.
- Suggested command: /impeccable craft auth left-panel

[P2] Layout inconsistency breaks visual coherence across the auth flow

- What: Login and register use min-h-screen grid grid-cols-1 md:grid-cols-2. Forgot-password and reset-password use
  min-h-screen flex items-center justify-center. Moving through the auth flow feels like moving between two different
  products.
- Why it matters: The forgot-password flow is reachable directly from the login page ("Forgot password?" link). A user
  clicks it and the layout changes completely — the branded left panel disappears, the proportions shift, the spacing
  changes. It signals visual discontinuity at a moment when users are already anxious (they forgot their password).
- Fix: Standardize all auth pages on the same layout. Either adopt the split layout everywhere (with meaningful
  left-panel content), or adopt the centered layout everywhere. Don't mix. The centered layout is actually more
  appropriate for the recovery flow — consider centering all auth pages and reserving the split layout for the
  marketing/landing page.
- Suggested command: /impeccable layout auth

---

Persona Red Flags

Jordan (First-Timer) — opening Together for the first time, logging in after their partner registered:
Jordan lands on the login page and immediately sees a gray box with two email addresses and passwords. Jordan thinks:
"Is one of these mine? Can I use these?" Jordan types their own email and password. A new form appears asking for a
"Verification code." Jordan hasn't received an email yet. Jordan waits. Code arrives — Jordan types it. Another form
appears: "Final step — enter your security PIN." Jordan doesn't remember setting up a PIN during registration (they
skipped the optional field). Jordan is stuck. There's no back button, no explanation, no help link. Jordan refreshes
the page and starts over. Abandonment risk: high at the PIN step specifically.

Sam (Screen Reader / Keyboard) — tabbing through the login flow:
Sam loads the page. The screen reader announces a heading at level 3 — no parent h1 or h2 exists, so the page
structure is semantically broken. Sam tabs into the demo credentials block and the screen reader reads out the entire
credentials paragraph, including email addresses and passwords. Sam reaches "Continue →" button and submits. The next
form appears — but there's no announcement that the form has changed (no aria-live region, no focus shift to the new
form or its heading). Sam may not know a new step has loaded. The text-cr link for "Forgot password?" has no visible
color (undefined token), so Sam gets no color cue. Focus rings may not render (focus:ring-cr-pale undefined).

The Couple (project-specific) — the daily returning user, 6 weeks in:
One partner opens Together every morning. They see the login page with demo credentials every single time. They type
their email, password, wait for OTP, type the code, then enter their PIN. Three interactions, three page transitions,
every day. For a user who opens the app daily, the absence of "remember this device for 30 days" means the full 3FA
friction is permanent. The app that's supposed to feel like a shared intimate space starts the day by treating every
login like the first one.

---

Minor Observations

- placeholder="••••••••" for the password field and placeholder="••••" for the PIN field — the PIN placeholder uses 4
  dots, implying a 4-digit PIN, but the registration field says "4-6 digits." Inconsistent length signal.
- Reset-password asks for Email Address even though it was just entered on the forgot-password page and passed via URL
  param. The field is pre-filled, but showing it reinforces "I already told you this."
- The devOtp banner in amber-50 (bg-amber-50 text-amber-800 font-mono) doesn't match any token in the design system.
  Fine for dev-only, but if it ever renders in production it will be unstyled relative to the token system.
- The OTP input has type="text" — correct (avoids spin buttons), but inputMode="numeric" is missing, which would bring
  up the number pad on mobile.
- Reset-password success auto-redirects in 1500ms. Minimum recommendation: 3000ms, or replace with an explicit "Back
  to sign in" button and no auto-redirect.
- text-cr hover:underline on links uses an undefined token class — every "forgot password" / "create account" / "back
  to sign in" link across all auth pages may render without color, making them visually indistinguishable from body
  text.

---

Questions to Consider

- If a returning user logs in every morning, what would make the experience feel like coming home rather than proving
  identity?
- The 3-step flow is security-correct — but should it apply to both partners equally, or is the PIN step only
  meaningful for users who enrolled?
- What does the left panel say about the relationship when both partners open the app on the same morning?

---

## Design Health Score

| #                                               | Heuristic                       | Score | Key Issue                                                                             |
| ----------------------------------------------- | ------------------------------- | ----- | ------------------------------------------------------------------------------------- |
| 1                                               | Visibility of System Status     | 2     | Loading state on button only. No step progress in the 3-step login.                   |
| 2                                               | Match System / Real World       | 2     | "Final step" implies 2 steps when there are 3. "Verification code" vs                 |
| "6-digit code" inconsistency.                   |
| 3                                               | User Control and Freedom        | 2     | Back from OTP to password. No back from PIN step — user is trapped. 1.5s              |
| auto-redirect on reset.                         |
| 4                                               | Consistency and Standards       | 2     | Login/register use split layout; forgot/reset use centered layout. h3 on              |
| every page. Token Law violated on every button. |
| 5                                               | Error Prevention                | 2     | Try/catch on all forms. Demo credentials always visible. devOtp/devCode no NODE_ENV   |
| guard.                                          |
| 6                                               | Recognition Rather Than Recall  | 2     | Fields labeled. 3-step flow requires mental model with no visual guide.               |
| No remember-device.                             |
| 7                                               | Flexibility and Efficiency      | 1     | No shortcuts. No remember-me. Daily 3FA friction. PIN step is a dead end.             |
| 8                                               | Aesthetic and Minimalist Design | 2     | Demo credentials block is noise. Empty rose-amber gradient panel.                     |
| Emoji heading.                                  |
| 9                                               | Error Recovery                  | 2     | Errors displayed. Raw Error.message may surface technical strings. No retry count for |
| OTP.                                            |
| 10                                              | Help and Documentation          | 1     | Nothing. No OTP explanation. No step count. Demo credentials are ironically           |
| the only contextual info.                       |
| Total                                           |                                 | 18/40 | Poor — core experience needs significant work before shipping                         |

## Anti-Patterns Verdict

LLM: Login page is structurally identical to the register page — same empty rose-amber gradient left panel, same
h3 font-display heading, same inline style button. Demo credentials block makes the login look like a public demo
environment. The auth flow could belong to any SaaS product. Zero "Two of Us" north star presence.

Detector: 0 findings across all 3 auth pages. Problems are structural/strategic, not pattern-detectable.

## Priority Issues

[P0] Demo credentials visible in production UI — hardcoded email/password/PIN shown unconditionally to all
visitors. Signals "demo environment" not "our private space." Any visitor can log in. Fix: gate behind
process.env.NODE_ENV === 'development'. Same fix for devOtp/devCode banners.

[P1] No step progress in 3-step login — users navigate password → OTP → PIN with no step indicator, no context for
why each step exists, no total step count shown. First-time users will think something is wrong after the
password step triggers a new form.

[P1] PIN step has no back button — user is trapped. OTP step has "← Back" but PIN step does not. Only option from
a wrong PIN is a hard page refresh.

[P2] Left panel rose-amber gradient — same dating-app anti-reference violation as the register page. Empty and
purposeless on both login and register.

password step triggers a new form.

[P1] PIN step has no back button — user is trapped. OTP step has "← Back" but PIN step does not. Only option from
a wrong PIN is a hard page refresh.

[P2] Left panel rose-amber gradient — same dating-app anti-reference violation as the register page. Empty and
purposeless on both login and register.

- text-cr hover:underline on links uses an undefined token class — every "forgot password" / "create account" / "back
  to sign in" link across all auth pages may render without color, making them visually indistinguishable from body
  text.

---

Questions to Consider

- If a returning user logs in every morning, what would make the experience feel like coming home rather than proving
  identity?
- The 3-step flow is security-correct — but should it apply to both partners equally, or is the PIN step only
  meaningful for users who enrolled?
- What does the left panel say about the relationship when both partners open the app on the same morning?

Three things to address, in order of severity:

1. The demo credentials block is a P0 — it's the one issue that makes the login page actively feel like a demo rather
   than a private space. It needs a NODE_ENV guard before anything else ships.
2. The 3-step flow has no progress signaling — this is the core UX problem with the auth experience. Users are
   navigating blind.
3. The rest (left panel, layout inconsistency, token violations) share the same root cause as the register page
   critique.

Which of these do you want to tackle first? The P0 (demo credentials + dev guards) is a one-file edit. The step
progress is a design + implementation job. Or if you want to do a sweep of the whole auth flow in one pass,
/impeccable craft auth would address all of it.

Overall Impression

The 3-step security model (password → email OTP → PIN) is legitimately thoughtful and more secure than most apps in
this space. The concept is correct. The execution leaves users navigating a dark hallway: no step indicators, no back
button on the last step, demo credentials visible in production, and a visual identity borrowed from the SaaS sign-up
template library. The biggest quick win isn't aesthetic — it's removing the demo credentials block and adding step
progress indicators. After that, the left panel and the h3/h1 issue.

tasks:

Anti-Patterns Verdict

Does this look AI-generated? Yes, the primary surface most clearly of all three pages critiqued.

LLM assessment: The tasks page is a competent, functional task manager that could be Jira, Linear, or Asana with the
logo swapped. The stat cards hit the hero-metric template exactly — four cards, big number, small uppercase label,
supporting sub-text, colored progress bar — and this is explicitly banned in the design guidelines. The table headers
("Task", "Assignee", "Priority", "Due Date", "Status") use all-caps uppercase tracking, the saturated AI-table
scaffold. The task detail page compounds this: "State Flow", "Actions", "Activity", "Task Details", "Re-assign" — five
consecutive section headers all using the identical text-xs font-bold uppercase tracking-widest pattern. That is
eyebrow-on-every-section AI grammar, not voice. The surface has zero of the "Two of Us" north star: no partner
awareness, no dual-presence signal, nothing that says "this list belongs to two specific people." A user who opened
this page without knowing the product name would have no indication they're looking at a shared space.

Deterministic scan: 1 finding — gray-on-color at tasks/page.tsx:275. The overdue row uses text-gray-400 on bg-red-50.
Gray-400 on red-50 is approximately 2.1:1 — well below the 4.5:1 WCAG AA requirement for body text. This is a real
contrast failure on a state that signals urgency (overdue tasks). The finding is correct, not a false positive.

Overall Impression

The tasks surface is technically the most complete in the app — infinite scroll, multi-filter, optimistic updates,
state machine transitions, inline modal validation. The engineering is solid. The design is a generic SaaS task
manager that happens to be deployed inside Together. The primary gap is identity: nothing on this screen reflects that
this is a shared space between two specific people. The stat cards and section headers are the visual face of that
identity problem — they export the "productivity tool" aesthetic that PRODUCT.md explicitly anti-references. The
biggest opportunity is to add the "we" layer without rebuilding the underlying architecture.

---

What's Working

1. Optimistic UI with sync feedback. The tmp\_ prefix detection, "syncing" inline label, and pendingCount badge in the
   heading form a coherent real-time feedback loop. Users know something is happening without a full spinner blocking the
   page.
2. Blur-on-validate in TaskFormModal. Field errors appear on blur, clear on change, and the full form validates on
   submit. This is the correct validation pattern — errors appear when needed, disappear immediately when corrected. The
   character count on description is a bonus.
3. Delete confirmation quality. "Keep Task" / "Yes, Delete" with the task title quoted in the confirmation body.
   Quoting the item name in destructive confirmations is correct practice — it forces users to read what they're
   deleting.

---

Priority Issues

[P1] Stat cards are the banned hero-metric template

- What: The 4-card grid (Loaded / In Progress / Done / Overdue) with big number + small uppercase label + supporting
  sub-text + inline-styled colored progress bar is precisely the "hero-metric template" called out in the absolute bans:
  "Big number, small label, supporting stats, gradient accent. SaaS cliché." The "Loaded" card compounds this by
  exposing a technical pagination metric (how many tasks have been fetched into the client) as if it were a meaningful
  KPI.
- Why it matters: The stat cards are the first thing a user sees after the page header. They set the tone. Right now
  the tone is "enterprise analytics dashboard." For a private couple's app, the right questions to surface are about
  shared work: who's carrying more right now, what's overdue between us, what did we just finish together.
- Fix: Remove or replace the stat cards entirely. For Together, a simple row of three numbers with plain-language
  labels fits better: "Active between you: N tasks · N overdue · N finished this week." No progress bars, no uppercase
  headers, no SaaS metric framing. Alternatively, a compact dual-presence summary ("Ana has 4 active · Dan has 2")
  serves the north star.
- Suggested command: /impeccable shape tasks-header

[P1] The surface has zero "Together" identity — the primary daily surface looks like any solo task manager

- What: Nothing on the tasks list page signals that this is a shared workspace for exactly two people. No
  partner-awareness in the list (whose tasks are "ours" vs "theirs" isn't visually surfaced at a glance). No
  dual-presence indicator showing if the partner is active. The filter for "All assignees" works but the 2-person model
  means "my tasks / their tasks / all" would be more natural. The breadcrumb "Workspace › Tasks › All" is enterprise nav
  grammar for a personal app.
- Why it matters: Together's stated differentiator is "The Two of Us." The primary surface is where users spend the
  most time. If it could be any task manager, the product has failed its own brief.
- Fix: Surface the relationship model in the list. Color-code or badge rows by partner with their initials avatar
  visible at a glance. Add a "Mine / Theirs / All" quick filter that replaces the generic assignee dropdown. Show a
  presence indicator in the header when the partner is also viewing tasks. The architecture already supports this
  (assigneeId, users array, socket.io) — it just isn't exposed visually.
- Suggested command: /impeccable craft tasks-together-layer

[P1] "Generate" developer tool visible in the production action bar

- What: The ▶ Generate / ■ Stop generator button sits in the primary action bar next to "New Task," visible to all
  users. This is a testing/load-generation tool with no user-facing purpose.
- Why it matters: For a partner opening Together on their phone, the first thing they see in the task view is a
  "Generate" button with no explanation. It suggests the app is broken or in development mode. It also has destructive
  potential — stopping or starting the generator has real effects on the task list state.
- Fix: Gate behind process.env.NODE_ENV === 'development' or a feature flag. Same fix pattern as the demo credentials
  block on login.
- Suggested command: /impeccable harden tasks

[P2] Uppercase eyebrow pattern on every section header

- What: text-xs font-semibold uppercase tracking-wide appears on: stat card labels, table column headers,
  TaskFormModal field labels, and all five section headers in the task detail page ("State Flow", "Actions", "Activity",
  "Task Details", "Re-assign"). This is the eyebrow-on-every-section AI grammar, banned explicitly in the design
  guidelines.
- Why it matters: When every piece of metadata and every section label uses the same all-caps tracked treatment, there
  is no hierarchy — everything shouts equally. The "absolute ban" note in the guidelines says this "appears on 55–95%
  of generations regardless of brief, which is the definition of a tell."
- Fix: Reserve the uppercase tracked style for one role only: table column headers (where it earns its place as a
  structural label). Field labels in the modal can be sentence-case medium weight. Section headers in the detail page
  can be a simple left-aligned medium line, not all-caps. The visual hierarchy gains clarity; the AI-grammar tell is
  removed.
- Suggested command: /impeccable typeset tasks

[P2] Detector: gray text on red-50 background breaks WCAG contrast

- What: tasks/page.tsx:275 — overdue task description (text-gray-400) renders on bg-red-50. Contrast ratio is
  approximately 2.1:1, less than half the WCAG AA minimum of 4.5:1. This is the most urgent moment for legibility —
  description text on the row that signals a task needs attention is the text users most need to read.
- Why it matters: Overdue tasks are a failure state the user needs to act on. The sub-description text on those rows
  is unreadable for users with low vision.
- Fix: For overdue rows, change description text from text-gray-400 to text-gray-600 or text-red-700. The red-50
  background is subtle — darker gray or a crimson-tinted text color both pass AA.
- Suggested command: /impeccable audit tasks

---

Persona Red Flags

Alex (Power User) — reviewing tasks for the week:
Alex opens tasks expecting to quickly scan active items and move them forward. Alex looks for a keyboard shortcut to
create a new task — none exists. Alex wants to select 3 overdue tasks and mark them all done — no bulk select. Alex
clicks a table row and is surprised it navigates to a detail page (no visual affordance signals it's clickable). Alex
wants to filter to "my tasks, high priority, not done" — requires 3 separate interactions across two different control
types (select + pills). Alex sees "▶ Generate" and clicks it by accident. High frustration risk on discovery; low
efficiency ceiling.

Sam (Screen Reader / Keyboard Navigation) — scanning the task list:
Sam tabs through the page. font-display undefined token means the heading falls back without announcement of a display
font change. The 🔍 emoji in the search field renders as "magnifying glass tilted left" in some screen readers — an
unusual label for a search input (an aria-label="Search tasks" on the input would help). The 🗑 trash emoji announces
as "wastebasket" or "trash bin" depending on the screen reader. The table rows are div elements with cursor-pointer
and an onClick — not <a> or <button> elements — so they're not keyboard-focusable and won't be announced as
interactive by screen readers. Sam cannot navigate the task list at all without a mouse.

The Couple (returning daily users) — opening Together in the morning:
One partner opens tasks to see what's on for the day. The page shows four stat cards with identical visual weight.
Nothing immediately says "here's what needs your attention today" or "your partner just finished this." The table rows
show tasks with partner initials in a small 24px colored circle, but at a glance the page looks like a solo list. The
dual-presence idea from DESIGN.md (the signature feature) is completely absent. After two months of daily use, the
tasks list still looks like a tool, not a shared space.

---

Minor Observations

- The task detail "Back to Tasks" button uses text-blue-600 — should be text-cr for brand consistency.
- State flow circles in the detail page use bg-blue-500 for the current step — should be bg-cr (Pompeii Crimson) per
  the One Crimson Rule (primary action = crimson).
- hover:border-crimson in the Re-assign button is another undefined token (should be hover:border-cr).
- bg-cm-pale on the task description block in the detail page is still an undefined token — the description container
  has no background.
- The fullwidth ＋ character (＋ New Task) will render differently across fonts — use + or an SVG icon.
- Table rows are <div onClick> not <button> or <a> — not keyboard accessible.
- The delete modal in tasks/page.tsx and tasks/[id]/page.tsx is implemented twice with slightly different spacing —
  code duplication and visual inconsistency.
- handleSubmit and handleEdit catch errors with console.error only — users get no feedback if a task creation or
  update fails after modal close.
- The stat card "Loaded" value is tasks.length (client-side loaded count), not a meaningful productivity metric.
- text-wrap: balance is missing on the task title h1 in the detail page — long task names can create uneven line
  breaks.

---

Questions to Consider

- What would "Tasks for the two of you" look like as a visual design, not a feature description?
- If the partner is currently viewing this same task list, what would you want both of them to see?
- The state machine transition logic is already built — what if the state flow visualization was the primary UI for
  the detail page, instead of an "also shown" section?

## Design Health Score

| #                                                                             | Heuristic                       | Score | Key Issue                                                                               |
| ----------------------------------------------------------------------------- | ------------------------------- | ----- | --------------------------------------------------------------------------------------- |
| 1                                                                             | Visibility of System Status     | 3     | Optimistic syncing, infinite scroll spinner, pending badge. No ownership                |
| split (mine vs partner's).                                                    |
| 2                                                                             | Match System / Real World       | 2     | "Loaded" stat card exposes pagination state. "Generate" is a dev tool.                  |
| Breadcrumb is enterprise SaaS grammar.                                        |
| 3                                                                             | User Control and Freedom        | 3     | Delete confirmation, All reset, backdrop close. No Esc, no undo after delete,           |
| no modal × button.                                                            |
| 4                                                                             | Consistency and Standards       | 2     | Back button uses text-blue-600 vs cr elsewhere. State circles use                       |
| bg-blue-500. Three filter patterns on one row. Token Law violated throughout. |
| 5                                                                             | Error Prevention                | 3     | Delete confirmation. Blur-validate. Overdue highlighting. Silent console.error on       |
| async failures.                                                               |
| 6                                                                             | Recognition Rather Than Recall  | 3     | Filters visible, chips inline. Row click to detail undiscoverable. No                   |
| saved filters.                                                                |
| 7                                                                             | Flexibility and Efficiency      | 2     | No keyboard shortcuts. No bulk actions. No drag-to-reorder. No task                     |
| templates.                                                                    |
| 8                                                                             | Aesthetic and Minimalist Design | 2     | Hero-metric stat cards. Eyebrow headers on every section. Emoji icons.                  |
| Dev Generate button in action bar.                                            |
| 9                                                                             | Error Recovery                  | 3     | Delete confirmation. Validation clears on edit. console.error only on submit failures — |
| user gets no feedback.                                                        |
| 10                                                                            | Help and Documentation          | 1     | Nothing. No tooltip on Generate. No explanation of pending sync. Rows not               |
| discoverable as clickable.                                                    |
| Total                                                                         |                                 | 26/40 | Acceptable — significant improvements needed                                            |

## Anti-Patterns Verdict

LLM: The tasks page is a competent task manager that could be Jira or Linear with the logo swapped. Stat cards hit
the banned hero-metric template exactly. Table and section headers use all-caps uppercase tracking on every
single header — eyebrow-on-every-section AI grammar. Zero of the "Two of Us" north star. No partner awareness, no
dual-presence, nothing that says "shared space for two people."

Detector: 1 finding — gray-on-color at tasks/page.tsx:275. text-gray-400 on bg-red-50 (overdue row). ~2.1:1
contrast, well below WCAG AA 4.5:1. Real finding, not a false positive.

## Priority Issues

[P1] Stat cards are the banned hero-metric template — big number + uppercase label + supporting sub-text +
inline-colored progress bar. "Loaded" card exposes pagination state as a KPI. Replace with a 2-person-aware
summary.

[P1] Zero "Together" identity on the primary daily surface — looks like a solo task manager. No partner awareness
in the list, no dual-presence, no "we" framing. The north star is "The Two of Us" and the main surface doesn't
reflect it.

[P1] "Generate" dev tool visible in production action bar — gate behind NODE_ENV or feature flag.
[P1] Stat cards are the banned hero-metric template — big number + uppercase label + supporting sub-text +
inline-colored progress bar. "Loaded" card exposes pagination state as a KPI. Replace with a 2-person-aware
summary.

[P1] Zero "Together" identity on the primary daily surface — looks like a solo task manager. No partner awareness
in the list, no dual-presence, no "we" framing. The north star is "The Two of Us" and the main surface doesn't
reflect it.

[P1] "Generate" dev tool visible in production action bar — gate behind NODE_ENV or feature flag.

- The stat card "Loaded" value is tasks.length (client-side loaded count), not a meaningful productivity metric.
- text-wrap: balance is missing on the task title h1 in the detail page — long task names can create uneven line
  breaks.

---

Questions to Consider

- What would "Tasks for the two of you" look like as a visual design, not a feature description?
- If the partner is currently viewing this same task list, what would you want both of them to see?
- The state machine transition logic is already built — what if the state flow visualization was the primary UI for
  the detail page, instead of an "also shown" section?

chat part

      Design Health Score

#: 1
Heuristic: Visibility of System Status
Score: 3
Key Issue: Typing indicator, optimistic inserts, "Loading…" in CommentsThread. No partner-online indicator before
opening ChatPanel; history load errors silently swallowed.
────────────────────────────────────────
#: 2
Heuristic: Match System / Real World
Score: 2
Key Issue: "Workspace chat" labels a private 2-person channel like a SaaS support tool. ChatPanel sends on Enter but
shows no hint. CommentsThread shows ⌘+Enter (macOS-only). text-[9px] timestamps are below readable size.
────────────────────────────────────────
#: 3
Heuristic: User Control and Freedom
Score: 2
Key Issue: × to close ChatPanel. Comment edit/cancel in CommentsThread. No message delete in ChatPanel, no message
edit
in ChatPanel, no undo for sent messages. Panel auto-scrolls with no way to pause or scroll back without losing
position.
────────────────────────────────────────
#: 4
Heuristic: Consistency and Standards
Score: 2
Key Issue: ChatPanel uses focus:border-red-400 (a Tailwind built-in class, different shade). CommentsThread uses
focus:border-cr (undefined token). My message bubble: bg-red-600 in ChatPanel vs bg-cr inline style in
CommentsThread. Two different send shortcuts. No visual relationship between the two conversation surfaces.
────────────────────────────────────────
#: 5
Heuristic: Error Prevention
Score: 2
Key Issue: CommentsThread has empty-draft guard. ChatPanel send() guards but the Send button doesn't visually disable
for empty input. History load errors swallowed silently in ChatPanel.
────────────────────────────────────────
#: 6
Heuristic: Recognition Rather Than Recall
Score: 2
Key Issue: Typing indicator present. "· edited" label in CommentsThread. Edit/delete controls in CommentsThread are
hover-only — invisible on mobile, undiscoverable on desktop without accidental hover.
────────────────────────────────────────
#: 7
Heuristic: Flexibility and Efficiency
Score: 2
Key Issue: Enter to send in ChatPanel is standard. Cmd+Enter in CommentsThread is a power-user shortcut. No unread
count badge on the Chat bubble. No keyboard path to open ChatPanel. No message history pagination.
────────────────────────────────────────
#: 8
Heuristic: Aesthetic and Minimalist Design
Score: 2
Key Issue: ChatPanel is a crimson floating bubble that looks like a customer support widget. "Workspace chat" header.
Solid bg-red-600 message bubbles fill the right side of the panel with aggressive red. Sidebar presence dot shows
only self-online.
────────────────────────────────────────
#: 9
Heuristic: Error Recovery
Score: 2
Key Issue: CommentsThread shows offline/error states, restores draft on failure, and rolls back optimistic inserts.
ChatPanel swallows all errors silently.
────────────────────────────────────────
#: 10
Heuristic: Help and Documentation
Score: 2
Key Issue: CommentsThread placeholder mentions ⌘+Enter. ChatPanel shows no hint that Enter sends. No context for the
distinction between "workspace chat" and "task conversation."
────────────────────────────────────────
#: Total
Heuristic:
Score: 21/40
Key Issue: Acceptable — significant improvements needed

---

Anti-Patterns Verdict

Does the chat look AI-generated? The ChatPanel does, specifically.

LLM assessment: The ChatPanel is a textbook AI-generated floating support widget: crimson pill button with 💬 emoji
fixed to bottom-right, dark header with "Workspace chat," bubbles right-aligned for me / left-aligned for partner,
Send button. This is the customer-support-chat-widget pattern — every SaaS tool that generates a chat feature produces
exactly this. For Together, whose core premise is intimate dual-presence between two specific people, the chat panel
communicates "support ticket," not "message to someone you love." The solid bg-red-600 message bubbles compound this:
a column of red pills down the right side looks confrontational, not warm. The CommentsThread is better — it uses an
inline discussion format that feels more like a shared annotation — but its section header uses the same uppercase
eyebrow pattern as everywhere else, and the hover-only edit controls make it unusable on mobile.

Deterministic scan: 2 findings.

- ChatPanel.tsx:105 — text-gray-800 on bg-red-600: False positive. The template literal combines both classes but
  they're mutually exclusive — bg-red-600 text-white renders when it's my message, bg-white text-gray-800 when it's the
  partner's. The detector can't parse the conditional correctly.
- CommentsThread.tsx:203 — text-gray-400 on bg-red-50: Borderline. On the delete button, text-gray-400 is the resting
  color and hover:bg-red-50 is the hover background. During the hover CSS transition there is a brief moment where the
  red background exists without the text-red-600 having fully applied — but hover:text-red-600 is also set, so in steady
  hover state the text is red-600 on red-50 (a2.6:1, below AA for small text). Worth fixing in a cleanup pass but not
  blocking.

---

Overall Impression

Two disconnected conversation surfaces — a floating widget and an inline thread — with no visual coherence, no shared
interaction language, and the signature feature (dual-presence) appearing only as a non-functional gray dot in the
sidebar. The foundation is technically sound (optimistic inserts, rollback, typing indicators, history hydration), but
the design communicates "customer support" rather than "private channel between two people." The single biggest
opportunity is giving chat a personality that matches the relationship it serves.

---

What's Working

1. CommentsThread error resilience. Optimistic insert with draft restoration on failure, offline detection, and
   rollback-to-original-state on edit failure — this is careful, correct behavior that most implementations get wrong.
   Users can type while offline and get their text back.
2. Typing indicator in ChatPanel. The 1.5s auto-dismiss after the last chat:typing event is the right pattern — it
   clears itself without requiring an explicit "stopped typing" event. Placed correctly (below messages, above input).
3. Smart timestamps in CommentsThread. Today's comments show time only; older show date + time. This is the correct
   context-sensitive format — reduces cognitive noise for recent activity.

---

Priority Issues

[P1] Chat message bubbles use bg-red-600 — the wrong color and the wrong weight

- What: My sent messages in ChatPanel render as solid bg-red-600 (#DC2626) — not the brand cr (#C0392B), and not a
  token class. The entire right side of the chat panel is a column of solid red pills. At 320px wide in a floating
  panel, this is visually aggressive.
- Why it matters: The One Crimson Rule specifies cr marks exactly one primary action per view. An open chat panel with
  10 messages from me has 10 crimson blocks — each one reads as a primary action. The DESIGN.md specifically says "glow
  on everything is exactly how this would slide into AI-slop." Red bubble chat is the messaging equivalent: emphasis
  everywhere is emphasis nowhere. For an intimate 2-person app the "my message" bubble should be warm and legible, not
  assertive.
- Fix: Replace bg-red-600 with a semantically appropriate token: bg-sl (Slate Void, #1A2535) for "mine" messages
  creates a clear, calm ownership distinction without the red aggression. Alternatively, bg-cm-pale (Cardamom pale) for
  a warm-neutral my-bubble with text-sl text. Reserve crimson for the send button only.
- Suggested command: /impeccable colorize chat

[P1] Dual-presence — the signature feature — is non-functional where it appears

- What: The sidebar shows w-2 h-2 presence dots: green for the current user, gray for everyone else, always. The logic
  is u.id === currentUser.id ? "#27AE60" : "#6B7280" — the partner is permanently shown as offline regardless of actual
  online status. The socket.io infrastructure exists (typing events work) but no user:online / user:offline events are
  connected to the sidebar dots.
- Why it matters: DESIGN.md names dual-presence as "the one signature move" — the feature that's structurally
  impossible to copy because it requires exactly two users who know each other. As implemented, the presence system
  tells you nothing about your partner. Every opening of the app shows the partner as offline. The signature feature is
  a stub.
- Fix: Emit user:online / user:offline events from the socket connection lifecycle. Subscribe in the sidebar (or a
  presence context) and update the dot color reactively. Add a pulsing animation to the green dot per the Dual-Presence
  Dot component spec in .impeccable/design.json (the component snippet already exists with @keyframes pulse-ring).
- Suggested command: /impeccable craft presence-system

[P1] Edit/delete controls in CommentsThread are hover-only — completely inaccessible on mobile

- What: opacity-0 group-hover:opacity-100 — the edit (✎) and delete (🗑) buttons on comments are invisible by default
  and appear only on hover. On touch devices, there is no hover state. A user on mobile cannot edit or delete their own
  comments.
- Why it matters: Together is a couple's app — both partners likely use it on their phones. The primary comment
  management actions (edit, delete) are inaccessible on the device where the app is most likely used.
- Fix: Show the actions in a persistent layout on mobile. On desktop, hover-reveal is acceptable as a progressive
  disclosure mechanism, but on touch it must always be visible. Use @media (hover: none) to override opacity-0 to
  opacity-100 on touch devices. Alternatively, put the actions in a 3-dot menu that's always visible in the top-right of
  the comment row.
- Suggested command: /impeccable adapt chat

[P2] "Workspace chat" header — generic SaaS label on a private 2-person channel

- What: The ChatPanel header says "Workspace chat" in white text on #2C3E50 (the old Flat UI navy, not the updated
  sl). "Workspace" is enterprise vocabulary. For Together — a private space for exactly two people — the chat header
  should name the relationship, not the software category.
- Why it matters: Every time a user opens the chat panel they're reminded this is a "workspace." The emotional
  register is wrong. The header is the first thing you read when the panel opens.
- Fix: Replace "Workspace chat" with the partner's name: "Ana" or "Chat with Ana." The users array is available — use
  users.find(u => u.id !== user.id)?.name to get the partner's name. Update the header background to #1A2535 (the
  DESIGN.md sl value) to match the spec.
- Suggested command: /impeccable clarify chat

[P2] CURRENT_USER_ID = 'u1' hardcoded in CommentsThread

- What: Line 20: const CURRENT_USER_ID = 'u1'. The isMe check (c.authorId === CURRENT_USER_ID) uses this literal. For
  the partner whose user ID is not u1, all comments show as "not mine" — no edit/delete controls appear for anything
  they've written.
- Why it matters: One partner can edit and delete comments; the other cannot, silently. This is a functional
  regression for one half of the user base.
- Fix: Get the current user from useAuth() — the hook is already used in ChatPanel. Replace CURRENT_USER_ID = 'u1'
  with const { user } = useAuth() and replace isMe = c.authorId === CURRENT_USER_ID with isMe = c.authorId === user?.id.
- Suggested command: /impeccable harden chat

---

Persona Red Flags

Casey (Distracted Mobile User) — sending a quick message from their phone:
Casey opens Together on their phone to send a message about a task. The floating "💬 Chat" button is fixed
bottom-right — thumb-reachable. Casey opens it. The panel takes up most of the phone screen (320×448 fixed size with
no responsive behavior). Casey reads the last few messages in a 9px timestamp font they can barely see. Casey wants to
delete something they wrote in the task comments — they tap the comment, nothing happens. The edit/delete controls
are hover-only and invisible. Casey doesn't know those controls exist.

Sam (Screen Reader / Keyboard Navigation) — trying to use the chat:
Sam navigates the sidebar and tabs through the app. The Chat button is at fixed bottom-6 right-6 z-40 — it's in the
DOM after the main content, so tabbing reaches it eventually, but the position is non-semantic. The partner presence
dots in the sidebar (w-2 h-2 rounded-full) have no aria-label — the screen reader announces nothing for them (no
accessible name for the online/offline state). The ChatPanel × close button has no aria-label either: it's a button
containing only "×" character — some screen readers announce "times" or nothing meaningful.

The Couple (intimate daily users) — the chat in context of the relationship:
The experience of sending a message to your partner through Together should feel different from Slack DMs or iMessage
— more personal, more "ours." Currently: open the app, see the floating crimson "💬 Chat" pill (looks like Intercom),
tap it, see "Workspace chat" in a navy header, see your messages as aggressive red bullets on the right, see your
partner's messages as plain white cards on the left. The visual language is indistinguishable from a support chat
widget. Nothing about the experience says "this is a private channel for the two of you." The partner's presence isn't
shown before opening the panel. There's no unread indicator. The chat feels like a bolt-on, not a first-class
surface.

---

Minor Observations

- text-[9px] timestamps in ChatPanel are below minimum readable size (12px minimum recommended). Use text-xs (12px).
- text-[10px] sender name in chat bubbles is also below readable floor. Use text-xs.
- The ChatPanel Send button has no disabled state for empty input — the guard is in send() but not visually
  communicated. Add disabled={!draft.trim()} to match CommentsThread behavior.
- Sidebar admin nav has nested <Link> elements inside a <Link> (lines 78-96) — invalid DOM nesting (<a> inside <a>).
  The inner links will not be reachable via keyboard navigation as expected.
- The sidebar active nav indicator uses border-l-2 with crimson — this is the "side-stripe border" absolute ban.
  DESIGN.md's sidebar component snippet specifies it, so it's an intentional design choice, but it conflicts with the
  skill guidelines. A bottom border, full background tint, or a leading colored circle would be non-banned alternatives.
- ChatPanel history hydration swallows errors: .catch(() => {}) — if the backend is down, the panel silently shows
  empty instead of an error state.
- The Chat button emoji 💬 renders differently across OS/browser. Use an SVG speech bubble for consistent rendering.
- CommentsThread "No comments yet — start the conversation." has a period after the sentence — correct. The ChatPanel
  "No messages yet — say hi 👋" uses an em-dash-equivalent — which is fine here (it's a display-only label, not copy
  prose).

Questions to Consider

- What would the chat look like if the panel background showed the partner's presence state — subtly warmer when
  they're online, cooler when they're not?
- If the chat is a private channel between two people who know each other, should "my" messages look different from
  how they look in a group chat or support widget?
- The CommentsThread and the ChatPanel both handle conversation — is the conceptual distinction (task-scoped vs
  workspace) clear enough that two separate surfaces make sense, or does it create confusion about where to write?

statistics part

Anti-Patterns Verdict

Does this look AI-generated? Yes, on two specific surfaces.

LLM assessment: The summary cards at the top are the hero-metric template again, fourth time across the app — big
number + emoji icon + small label + sub-text trend line. The pattern is deeply embedded. The Contribution Ranking
section is where the slop is most product-damaging: medals (🥇/🥈/🥉), five-star ratings, and numeric scores ranking
one intimate partner above another — this is a verbatim data-analytics-dashboard module that has nothing to do with a
shared couple's workspace. It would fit naturally in a GitHub contributor leaderboard or a sales team dashboard.
PRODUCT.md explicitly calls out "gamified pressure" and "nagging" as anti-references. The star rating system (score =
done / total × 5, always 5.0 for anyone who finished all their tasks) is productivity theater: a made-up metric
rendered as if it's meaningful.

Deterministic scan: Clean — 0 findings. The brand and product problems here are conceptual, not CSS-detectable.

---

Overall Impression

The statistics page is technically well-constructed — the donut chart is custom SVG, the monthly bar chart computes
real data, the count-up animation is smooth, and the visual/tabular toggle is a nice control. But the page is a data
analytics dashboard placed inside a product whose brief is "warm, intimate, reliable." The Contribution Ranking
section turns partners into competitors. Two of the four KPI cards display hardcoded, fabricated numbers as real
insights. The page tells the wrong story about what the data means for the relationship.

---

What's Working

1. Monthly bar chart uses real computed data. The monthlyData useMemo correctly slices tasks by updatedAt into monthly
   buckets per user. This is genuine insight: how much did each partner close per month. The infrastructure is sound.
2. Visual/tabular toggle. The ability to switch between a chart overview and a row-by-row ranked table is a meaningful
   UX affordance — two different cognitive modes for the same data. The toggle itself is clean and lightweight.
3. Donut chart SVG construction. The SVG donut is hand-rolled with correct strokeDasharray math, smooth transition-all
   duration-500, and a graceful empty-state (gray ring at total === 0). No external chart library needed for a 4-segment
   donut.

---

Priority Issues

[P1] Contribution Ranking is a direct PRODUCT.md anti-reference

- What: A section with 🥇/🥈/🥉 medals, a 5-star rating per partner, and a numeric "score" (computed as (done / total)

* 5. ranking one partner above the other.

- Why it matters: PRODUCT.md explicitly names "gamified pressure" and "nagging" as things to avoid. For an intimate
  couple, a competitive leaderboard is the opposite of what the product should do. If one partner has fewer completed
  tasks — because of work, illness, or just different task types — the app now presents this as a lower "score" and a
  silver medal. This is the kind of feature that causes friction in relationships, not warmth. The scoring formula is
  also deceptive: it only measures completion rate (done/total), not difficulty or quality, but the label "Contribution
  Ranking" implies broader merit.
- Fix: Remove the ranking framing entirely. Replace the section with a shared progress view: what did the two of you
  accomplish together, not who did more. "Together, you completed N tasks this month" with a combined total is
  celebration-oriented, not competitive. The individual per-partner breakdown can remain as plain numbers (not ranked).
- Suggested command: /impeccable craft statistics-together-section

[P1] Two of four KPI cards display hardcoded fake analytics

- What: '+12% vs last month' for Completion Rate and 'Balanced' for the Ana/Dan Split are hardcoded strings. The
  "+12%" never changes regardless of the actual data. "Balanced" is always displayed even if one partner has 3× the
  tasks of the other.
- Why it matters: Users will make decisions and have feelings based on these numbers. If one partner sees "+12%" they
  might feel good about productivity — but that number is never real. "Balanced" on a 10/2 split tells the wrong story.
  False analytics erodes trust in the product.
- Fix: Compute the percentage change from the previous month using the same monthlyData logic that's already
  calculating per-month task completions. Compute "Balanced" dynamically: if |userStats[0].total - userStats[1].total|
  <= 2 then "Even," otherwise show the partner with more tasks. Both are achievable in a few lines using the data
  already in scope.
- Suggested command: /impeccable harden statistics

[P2] bg-sl undefined token — active toggle state invisible

- What: The visual/tabular toggle uses ${view === 'visual' ? 'bg-sl text-white' : ...}. Since sl is not defined in
  globals.css, bg-sl renders nothing. Both buttons look identical — users cannot tell which view is active.
- Why it matters: The toggle is the primary navigation control on this page. Invisible active state means users don't
  know which mode they're in after clicking.
- Fix: Same root cause as every other surface — define --color-sl: #1A2535 in globals.css @theme inline. Or interim:
  replace with bg-[#1A2535] until tokens are defined.
- Suggested command: /impeccable audit statistics

[P2] Bar chart legend hardcodes "Ana" / "Dan" user names

- What: BarChart component renders <span>Ana</span> and <span>Dan</span> as hardcoded strings in the legend. The
  actual chart data is computed from users[0]?.id / users[1]?.id correctly, but the legend labels don't use the actual
  user names.
- Why it matters: If the two users are not named Ana and Dan (or when this codebase is used as a template, or if users
  change their names), the legend misidentifies who's represented by which color.
- Fix: Pass users[0]?.name and users[1]?.name as props to BarChart. Replace the hardcoded anaData / danData prop names
  with generic user1Data / user2Data while you're at it — those names leak real user information into the component
  API.
- Suggested command: /impeccable harden statistics

[P2] Priority emoji labels convey meaning via color alone

- What: '🔴 High', '🟡 Medium', '🟢 Low' — the primary visual differentiator is the color of the emoji circle. Screen
  readers announce these as "red circle High", "yellow circle Medium", "green circle Low." Color conveys the urgency
  hierarchy.
- Why it matters: WCAG 2.1 SC 1.4.1 prohibits using color as the only visual means of conveying information. The emoji
  circle color IS the primary indicator here.
- Fix: Remove the emoji from the label. Use the text alone ("High", "Medium", "Low") — the horizontal bar's color
  already encodes the priority level visually. Add aria-label to each bar for screen readers.
- Suggested command: /impeccable audit statistics

---

Persona Red Flags

The Couple (daily users) — one partner opens Statistics:
The partner sees their own score is 3.8 and their partner's is 4.2. The silver medal sits next to their name. The app
is now telling them they're performing worse than their partner. If the lower score reflects a rough week — work
stress, illness, a family issue — the app has just quantified that and labeled it with a relative medal. For a product
whose success is defined as "both partners feel the app knows them," this is the most damaging possible framing. The
partner closes the statistics page and doesn't come back to it.

Riley (Stress Tester) — probing edge cases:
Riley clears all tasks. The summary cards show 0, 0, 0, "0/0" — the "0/0" split still says "Balanced." The Completion
Rate card shows "0%" with "+12% vs last month" — meaningless. The count-up animation fires from 0 to 0 (the
commented-out guard would have prevented this; without it, the interval fires once and stops at 0). Riley changes the
app to a fresh user whose ID is not users[0] — the bar chart labels still say "Ana" and "Dan" while showing their
data. Riley looks at the Contribution Ranking — both users score 0.0, both get 🥇 (same position). Riley opens the
tabular view — all tasks show "Not started" with 0 stars. Clear state reveals the hollow scaffolding.

Alex (Power User) — wanting more from the statistics:
Alex wants to see last quarter. No date range selector exists. Alex wants to filter statistics to just one partner. No
per-user filter exists. Alex wants to export as CSV for a personal spreadsheet. No export. Alex wants to understand
the "Score" formula — no tooltip. Alex looks at the Completion Rate "+12% vs last month" and tries to verify it
against the bar chart. The numbers don't match because "+12%" is hardcoded. Alex loses trust in all the statistics.

---

Minor Observations

- useCountUp hook has no prefers-reduced-motion check — all users see number animations regardless of accessibility
  preference. Add: if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { setValue(target); return } at
  the top of the effect.
- The NaN guard //if (!Number.isFinite(target) || target <= 0) { setValue(0); return } is commented out. Uncomment it.
- Dead code: const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May'] and const anaBar = [3, 5, 6, 4, 7] and const danBar =
  [2, 4, 5, 5, 5] — declared at lines 169-171 but never used. The monthlyData useMemo replaces them. Remove.
- Donut chart uses #E74C3C for "To Do" state — visually close to #C0392B (Pompeii Crimson). Two similar reds on one
  chart. Use a distinct color for To Do: perhaps #E67E22 (orange) to distinguish "not started" from "active urgency."
- var(--font-display) in the SVG <text> element at DonutChart line 62 — --font-display is undefined in globals.css.
  The donut center number uses the browser default font.
- var(--font-body) in the SVG <text> element at line 66 — also undefined, and different from the --font-sans variable
  that IS defined.
- The tabular view duplicates the tasks page's ranked table with an added (artificial) "Score" column. Its purpose on
  a Statistics page isn't clear — consider removing or replacing with a genuine per-partner breakdown.
- "Workspace › Statistics › Tasks Overview" — the SaaS breadcrumb persists here too.
- The view toggle emoji (📊 📋) will render differently across platforms.

---

Questions to Consider

- What would a statistics page look like if it celebrated the partnership rather than ranking it? What would "you both
  had a strong month" look like as a visual?
- The monthly bar chart already tells an interesting story about the rhythm of shared work over time — is that the
  primary thing the statistics page should emphasize?
- If you removed the Contribution Ranking entirely, what would you put in its place that would make both partners feel
  good about what they see?

admin page

Anti-Patterns Verdict

Does this look AI-generated? Not in the same way the partner-facing surfaces do. Admin tooling has more latitude for
density.

LLM assessment: The admin surface is the cleanest section of the app in terms of AI slop — no hero-metric cards, no
gradient panels, no empty decorative sections. The observation page is particularly well-structured: real-time data,
signal-type badges, progressive disclosure on raw evidence, functional color coding. The main tells are inherited from
the app-wide system: font-display and text-sl undefined tokens on headings, and the generic uppercase table headers
(which are legitimately appropriate here — the ban applies to section eyebrows, not table column headers).

Deterministic scan: Clean — 0 findings across all three admin pages.

---

Overall Impression

The admin tooling is solid and honest: it does what it says, handles permissions correctly, shows errors, and the
observation page is genuinely thoughtful (AI signal verdicts, evidence collapse, auto-refresh). The most practical gap
is the logs page — 50 results per page with no search or filter is workable for light use but becomes a problem at
scale. The bigger architectural observation is that a full admin section (user management, action logging, AI anomaly
detection, IP tracking) is significant infrastructure for a 2-person private app — worth noting if the project scope
ever gets re-evaluated.

---

What's Working

1. Semantic table HTML throughout. All three admin pages use <table><thead><tbody> with <th> headers — correct for
   tabular data. This is a notable improvement over the tasks page which uses div grids, and it means screen readers and
   keyboard navigation work correctly for the data content.
2. Permission-denied states are informative. Each page shows exactly which permission is missing and which role grants
   it. An admin troubleshooting access issues gets actionable information, not just "403 Forbidden."
3. Observation page progressive disclosure. AI rationale rendered inline, raw evidence under a <details> collapse,
   resolved items visually de-emphasized (gray border, no resolve button). The information hierarchy is deliberate and
   correct.

---

Priority Issues

[P1] Logs page has no search, filter, or sort — becomes unusable at volume

- What: The logs table shows 50 entries per page across an unknown number of pages (data.totalPages). There's no way
  to filter by user, path, method, status code, or date range. Finding a specific user's actions or a specific error
  requires paging through all results.
- Why it matters: Action logs are most useful when something goes wrong — an admin needs to find "all 500 errors from
  the last hour" or "all actions by user X yesterday." Without search or filter, this requires reading every entry
  across every page.
- Fix: Add at minimum a method filter (GET/POST/PATCH/DELETE), a status code filter (2xx / 4xx / 5xx), and a date
  range selector. A search by path prefix would cover most investigative needs. Pass these as query params to the
  existing ?page=&perPage= endpoint (assuming the backend supports them).
- Suggested command: /impeccable craft logs-filter

[P2] Observation auto-polls every 5 seconds — aggressive, no user control

- What: setInterval(refresh, 5000) runs continuously while the observation page is open. This means a constant stream
  of network requests with no way to pause, change the interval, or trigger a manual refresh instead.
- Why it matters: 5-second polling is standard for live dashboards in high-traffic environments, but it's heavy for a
  2-person app's admin view. More practically: if the admin is reading a long AI rationale block, the page refreshes
  underneath them every 5 seconds, potentially re-sorting the list if new observations arrive.
- Fix: Add a "Refresh" button that fires refresh() manually. Use a longer auto-poll interval (30–60 seconds) combined
  with the manual option. Show a "Last updated: X seconds ago" indicator so the admin knows how fresh the data is.
- Suggested command: /impeccable harden admin

[P2] text-[10px] and text-[11px] text sizes below readable minimum

- What: Logs page: font-mono text-[11px] for userId (line 68) and font-mono text-[10px] for IP address (line 76).
  Observation page: text-[10px] for the flaggedAt timestamp (line 144).
- Why it matters: 10px monospace on a dense log table is illegible at normal viewing distance, particularly for IP
  addresses which admins need to read accurately. 11px for truncated user IDs is borderline.
- Fix: Use text-xs (12px) as the minimum for all content. For truly dense data like IP addresses, text-xs font-mono at
  12px is still compact while remaining readable.
- Suggested command: /impeccable audit admin

[P2] Resolve action has no error handling

- What: The resolve() function (admin/observation/page.tsx:60) fires the PATCH and calls refresh() without a
  try/catch. If the network request fails, the observation stays in the list but the admin has no indication the resolve
  failed — they see the list refresh to the same state with no explanation.
- Why it matters: During an incident, an admin may resolve observations quickly. Silent failures here mean the admin
  thinks they've resolved something that hasn't been resolved, and the observation continues to appear on next refresh.
- Fix: Wrap in try/catch, show an inline error on failure. The existing setError pattern from the same component
  works.
- Suggested command: /impeccable harden admin

[P2] font-display and text-sl undefined tokens on admin/users page heading

- What: h1 className="font-display text-2xl font-bold text-sl mb-2" — both tokens are undefined. The heading renders
  in the browser default font at an indeterminate color.
- Why it matters: Same root cause as every other surface — the token definitions are missing from globals.css. This is
  the one place where text-sl (Slate Void) is used as a heading color, which is the correct semantic use.
- Fix: Define --color-sl and --font-display in globals.css. This is the cross-cutting fix that improves every surface
  simultaneously.
- Suggested command: /impeccable audit (token sweep)

---

Persona Red Flags

Alex (Power User / Admin) — investigating a spike in 4xx errors:
Alex opens Admin Logs after noticing unusual traffic. There are 50 entries per page. Alex needs to find all 401s from
the last 2 hours — there's no status code filter, no date filter. Alex pages through results manually: page 1 of 8.
The path column shows raw API paths in monospace at the minimum readable size. The userId column shows truncated
8-character IDs — Alex can't identify which user without cross-referencing the Admin Users table. Alex gives up after
page 3.

Sam (Accessibility / Screen Reader) — on the observation page:
The observation page uses <div> for the observation cards, not <article> or any landmark element. Each card has a
"Mark resolved" button, but the button has no aria-label — screen readers announce it as "Mark resolved" which is
fine, but without the user's name in the accessible name, Sam can't tell which observation they're resolving. The

  <details> element for raw evidence is accessible (native HTML). The 10px timestamps are invisible to users with low
  vision.

---

Minor Observations

- The users table is entirely read-only — no way to update roles, reset passwords, or disable accounts. For a 2-person
  app this is probably fine, but labeling the page "Users" implies management capability.
- The resolve() function has no loading/disabled state on the "Mark resolved" button — double-clicking triggers two
  simultaneous PATCH requests.
- Logs page doesn't show a "no results" vs "loading" distinction — if data is null (before first fetch) the table body
  is empty with no message.
- The observation page setInterval cleanup is correct (returns clearInterval), which prevents memory leaks on unmount.
- Admin navigation bug already noted in the chat critique: the sidebar admin link has nested <Link> inside <Link> —
  invalid DOM, breaks keyboard navigation for the sub-links.
- The three admin pages have slightly different h1 patterns: users uses text-sl, logs uses neither color nor text-sl,
  observation uses neither. Minor inconsistency that would be resolved by the token sweep.
- text-[10px] text-gray-400 for flaggedAt timestamp renders at approximately the same visual weight as the meta
- For a 2-person private app, what's the right scope for admin tooling? Full action logging and AI anomaly detection
  are meaningful for a multi-tenant SaaS — are they the right complexity for this product's actual threat model?
- If the logs page is primarily useful for debugging incidents, what would a "show me what went wrong in the last
  hour" shortcut look like?
- The observation page identifies suspicious users — but in a 2-person app, there are only two users. What's the
  observation page actually guarding against

pulse page

Anti-Patterns Verdict

LLM assessment: There is nothing to call AI-generated here — there's almost nothing here at all. The issue isn't slop;
it's a stub that hasn't been given a design. The 8 lines of code are a placeholder, not a feature. The single
interesting design problem is: what does a coming-soon page for a private couple's app actually look like, and what
should it tell the user?

Deterministic scan: [] — 0 findings. Clean because there's no markup to scan.

Copy violation: The subtitle "Coming soon — Gold challenge." uses an em dash, which is explicitly banned. Use a colon:
"Coming soon: Gold challenge." Better still: remove the jargon entirely.

---

Overall Impression

The Pulse page currently ships as a navigation dead-end: the user clicks it in the sidebar, lands on a 2-line
placeholder, and leaves knowing nothing more about the app than when they arrived. The name "Pulse" has real potential
for this product — activity feed, presence, the shared heartbeat of a 2-person workspace. Right now none of that
potential is visible. The placeholder doesn't tease it, doesn't explain it, doesn't reassure the user that something
real is coming.

The highest-value question isn't "how do we improve the placeholder?" It's "what is Pulse, and what does the
placeholder need to communicate while we build it?"

---

What's Working

1. font-display text-3xl font-bold — the heading scale and weight choice are consistent with the rest of the app. If
   the token were defined, this would read correctly.
2. Route exists with the correct name — Pulse is registered, linked from the sidebar, and accessible. The feature slot
   exists; it just needs content.

---

Priority Issues

[P1] The page dead-ends — it communicates nothing about what Pulse is or will be

- What: A user who clicks "Pulse" in the sidebar has no idea whether this is a notification feed, an activity log, a
  mood tracker, a presence system, or something else. "Coming soon" with no description is the same as saying "we
  haven't decided yet."
- Why it matters: Coming-soon pages are still product surfaces. They create or destroy anticipation. "Coming soon —
  Gold challenge" creates no anticipation and destroys the sense of a coherent product. The user's mental model of the
  app now has a hole.
- Fix: Replace the placeholder with a real interim state: the feature's name, one sentence on what it will do, and a
  visual signal (illustration, icon, screenshot mockup). "Pulse tracks your shared activity — who's been working, what
  changed, when you last connected. Coming in the next update." That's enough.
- Suggested command: /impeccable onboard pulse

[P1] "Gold challenge" is unexplained internal jargon in a user-facing string

- What: Coming soon — Gold challenge. The phrase "Gold challenge" is a course grading term. It has no meaning to the
  partner using the app.
- Why it matters: It signals that the page was left in a dev/draft state — the kind of copy that got committed before
  it was reviewed. Combined with the em dash (banned from copy rules), this line reads as unfinished notes left in a
  shipping page.
- Fix: Remove "Gold challenge" entirely. The replacement: Coming soon. or, better, a meaningful teaser.
- Suggested command: /impeccable clarify pulse

[P2] font-display, text-sl, text-sl-muted undefined tokens

- What: Same root cause as every other surface. The heading and subtitle render in fallback fonts and colors.
- Fix: Add the token definitions to globals.css. This is the same one-edit fix that resolves every surface
  simultaneously.
- Suggested command: /impeccable audit (token sweep)

---

Persona Red Flags

The Couple (project-specific): One partner opens the app and sees "Pulse" in the sidebar. They're curious — the name
suggests something to do with the two of them. They click it. They read "Coming soon — Gold challenge." They have no
idea what "Gold challenge" means. They close the tab and don't think about it again. The feature has failed to build
any anticipation, and if the app were shipped to a real couple, this would read as a half-finished product.

Jordan (First-Timer): Jordan is onboarding and clicking through every nav item to understand what the app does. They
reach Pulse and have no idea what it is. The sidebar icon gives no hint (if there even is one). The placeholder offers
nothing. Jordan's mental model of the app now has an unexplained gap — a named section that communicates no purpose.
Jordan's confidence in the app decreases slightly.

---

Minor Observations

- The ⚡ emoji in h1 is decorative noise that doesn't contribute to the heading's meaning. For a coming-soon state,
  it's particularly odd — the lightning bolt implies urgency or power that the blank page doesn't deliver. Remove or
  replace with a purposeful icon when the page has real content.
- The p-9 padding (36px) creates a left margin that matches the rest of the app, which is correct.
- This is the only page in the app with a completely empty body aside from a heading and subtitle. Every other page
  has actual content. Pulse stands alone as a pure placeholder, which makes it more noticeable.

---

Questions to Consider

- What is Pulse actually supposed to be? If it's dual-presence and shared activity, the "Two of Us" north star is the
  north star for this feature — what would the couple see that they can't see anywhere else?
- Is the feature being built at all, or is the stub permanent until the "Gold challenge" tier is attempted? If
  permanent for now, the placeholder needs to own that honestly.
- Could the Pulse slot be filled with something real and simpler while the Gold feature is being designed? An activity
  feed of recent task completions, for example, already has data — no new backend work required.

account page:

A critical structural finding before the heuristics: The account surface consists of exactly one page
(/account/sessions) and is not linked from anywhere in the app. The sidebar has Home, Tasks, Statistics, Pulse, and
Admin — no Account, no Settings, no user menu. A user can only reach this page by typing the URL directly.

---

Design Health Score

#: 1
Heuristic: Visibility of System Status
Score: 2
Key Issue: No loading state during session fetch — list renders empty then populates. No success feedback after revoke

    (silently refreshes). No confirmation that "Sign out everywhere else" completed.

────────────────────────────────────────
#: 2
Heuristic: Match System / Real World
Score: 2
Key Issue: "Sessions" is technical jargon. "This device" for current session is good. Other sessions are labeled by
the
first word of the raw user agent string: "Mozilla", "PostmanRuntime", etc. — meaningless to users. Timestamps are
raw
ISO strings, not relative ("3 days ago").
────────────────────────────────────────
#: 3
Heuristic: User Control and Freedom
Score: 2
Key Issue: Individual revoke available. "Sign out everywhere else" available. No undo on revoke. No navigation back to

    any other section of the app (no breadcrumb, no back link). The page itself is unreachable via normal navigation —

no
sidebar link, no user menu, nothing.
────────────────────────────────────────
#: 4
Heuristic: Consistency and Standards
Score: 2
Key Issue: font-display undefined token on the heading (same root cause as every surface). Native confirm() dialogs
break visual consistency with the rest of the app. Green (bg-green-50 border-green-200) for the current session is
semantically reasonable but diverges from the crimson brand identity.
────────────────────────────────────────
#: 5
Heuristic: Error Prevention
Score: 2
Key Issue: confirm() requires confirmation before revoke. But neither revoke() nor revokeOthers() has a try/catch —
errors are swallowed silently. The "Sign out everywhere else" button is prominently positioned in the page header
next to the title, making it easy to trigger accidentally.
────────────────────────────────────────
#: 6
Heuristic: Recognition Rather Than Recall
Score: 2
Key Issue: Sessions list is visible. Current session is highlighted. But the device label from user agent parsing is
nearly always useless (first token = "Mozilla" for virtually every browser). No browser/OS parsing, no relative
times, no location info that would help a user identify an unfamiliar session.
────────────────────────────────────────
#: 7
Heuristic: Flexibility and Efficiency
Score: 1
Key Issue: Page is reachable only by direct URL. No way to filter or sort sessions. No bulk selection for revoking
multiple non-current sessions in one step.
────────────────────────────────────────
#: 8
Heuristic: Aesthetic and Minimalist Design
Score: 3
Key Issue: Actually the cleanest account layout in the app: no hero-metric cards, no decorative panels, functional
card
layout for sessions. The header with title + destructive-action button is a reasonable pattern for this type of
security page.
────────────────────────────────────────
#: 9
Heuristic: Error Recovery
Score: 1
Key Issue: revoke() and revokeOthers() both await async calls with no .catch(). If the API fails, the UI silently
calls
refresh() showing the same state the user just tried to change — they have no idea the action failed. The fetch
error
is caught and shown, but the mutation errors are not.
────────────────────────────────────────
#: 10
Heuristic: Help and Documentation
Score: 1
Key Issue: No explanation of what a session is, why a user might want to revoke one, or what happens after revocation
(does the other session get logged out immediately?). For a security-focused feature, context matters.
────────────────────────────────────────
#: Total
Heuristic:
Score: 18/40
Key Issue: Poor

---

Anti-Patterns Verdict

LLM assessment: The sessions page itself is clean — no slop, no decorative scaffolding, no hero-metrics. It's a
functional security tool with a simple layout that doesn't try to be anything it isn't. The problems here are
structural (unreachable page, missing account index) and functional (silent error handling, meaningless device labels)
rather than aesthetic.

Deterministic scan: [] — 0 findings.

---

Overall Impression

The sessions page is well-intentioned security tooling — revoke access from unknown devices, see your current session,
sign out everywhere. These are the right capabilities. The problem is that the feature exists as a ghost: no route to
it from the app's navigation, no account index page, no profile or security settings around it. The user who needs to
revoke a session because their account was compromised has to know the URL /account/sessions exists. That user
doesn't know.

---

What's Working

1. Current session highlighting is functional and clear. bg-green-50 border-green-200 with "This device" and a
   "current" badge distinguishes the user's active session immediately. The "Revoke" button is correctly absent from the
   current session row.
2. Correct no-duplicate-revoke guard — revoke(id) is only rendered for sessions where !s.isCurrent. This prevents the
   user from signing out their own active session, which is the right constraint.
3. Clean layout without clutter — no unnecessary metadata, no decorative elements, no sections that exist to pad the
   page. This is one of the more honest page layouts in the app.

---

Priority Issues

[P0] The account surface is unreachable from the app's navigation

- What: There is no link to /account/sessions (or any /account/\* route) anywhere in the sidebar, header, user menu, or
  any other navigation surface. The page exists but has no entry point.
- Why it matters: Security features that users can't find don't protect users. The "sign out everywhere else"
  capability is especially important for security incidents. A user who suspects their account was compromised has no
  way to discover this feature without prior knowledge of the URL.
- Fix: Add a user menu or profile section to the sidebar bottom. The sidebar already shows the user's avatar,
  initials, and role in the "Workspace" section — that area is the natural anchor. A click on the user's own avatar/name
  should open account settings. Minimum viable entry: link to /account/sessions from the sidebar user row.
- Suggested command: /impeccable shape account-nav

[P1] Device labels are meaningless — raw user agent first-token parsing

- What: s.userAgent.split(' ')[0] || 'Device' produces "Mozilla" for every browser, "PostmanRuntime" for API clients,
  and other unhelpful strings. The truncated raw UA string is shown below, but it's unreadable jargon. A user looking at
  a list of sessions labeled "Mozilla / Mozilla / Mozilla" cannot identify which session is from their phone and which
  might be an intruder.
- Why it matters: Session management is only useful if the user can identify their sessions. If they can't tell which
  is which, the page can't serve its security purpose.
- Fix: Parse the user agent properly using a lightweight parser (e.g. ua-parser-js) to extract browser + OS. "Chrome
  on Windows", "Safari on iPhone", "Firefox on Mac". Show that as the label, use the raw UA only in an expandable
  detail.
- Suggested command: /impeccable harden account

[P1] revoke() and revokeOthers() have no error handling — silent failures

- What: Both mutation functions await their API calls and call refresh() with no try/catch. If the PATCH or DELETE
  fails, the list refreshes to the same state with no message. The user sees their revoke "succeeded" (nothing changed
  in the error path), potentially leaving a compromised session active.
- Why it matters: Silent failures on security-sensitive operations are particularly dangerous. The user believes
  they've taken a protective action that didn't happen.
- Fix: Wrap both in try/catch, use the existing setErr pattern to show an error message. "Couldn't sign out that
  session — try again."
- Suggested command: /impeccable harden account

[P1] Native confirm() for destructive actions — broken UX + mobile no-op

- What: Both revoke() and revokeOthers() use if (!confirm('...') — the browser's native synchronous confirm dialog. On
  iOS, confirm() is blocked in certain contexts. It visually breaks the app's style. It can't be dismissed with Escape
  on some browsers. It interrupts async rendering.
- Why it matters: A styled confirmation approach (or at minimum a well-placed inline confirm state — "Really? [Cancel]
  [Sign out]") is both more reliable and more cohesive. For "Sign out everywhere else" specifically, the native confirm
  feels like a dev shortcut left in production.
- Fix: Replace confirm() with an inline confirmation pattern on the button: first click changes the button to "Are you
  sure? [Yes, sign out]" + a cancel affordance, second click fires the action.
- Suggested command: /impeccable harden account

[P2] No account index page — /account 404s

- What: There is no app/(app)/account/page.tsx. Navigating to /account returns a 404. The only account page is the
  sub-route /account/sessions, creating a dead root for the account section.
- Why it matters: If an account navigation link is added (as required by the P0 fix), it should link to an account
  index that provides access to all account features. The index page is also where profile, security settings, and
  partner connection would eventually live.
- Fix: Create a minimal account index page that links to sessions and reserves space for profile and security
  settings. This page can be simple — it just needs to not 404.
- Suggested command: /impeccable shape account-index

---

Persona Red Flags

The Couple (project-specific): One partner receives an email saying "new sign-in from a device you don't recognize"
(if such notifications exist). They open the app to revoke the suspicious session. They look at the sidebar: Home,
Tasks, Statistics, Pulse. No Account. They look at the header: nothing. They try clicking their avatar in the sidebar
user panel: nothing happens (it's a non-interactive <div>). They can't find session management. They sign out entirely
and change their password through the forgot-password flow instead, which is the wrong recovery path.

Sam (Accessibility): The "Sign out everywhere else" button has no aria-label beyond its text content, which is fine.
But the session cards are <div> elements — not <article> or <section>, so the screen reader doesn't have landmark
structure. The "Revoke" button has no accessible name that includes the session it revokes — a screen reader will
announce "Revoke" three times for three sessions, with no way to know which is which. The confirm() dialog is
accessible (it's a browser native), but the inconsistency with the rest of the app still applies.

Riley (Stress Tester): Riley revokes a session while the auth.revokeSession() endpoint is slow. The button has no
loading state — Riley clicks again. Two simultaneous revoke requests fire for the same session. The second may return
a 404 (session already revoked), which is swallowed silently. Riley refreshes the page and sees the session is gone —
they assume both clicks succeeded, but only one did. Riley then tries "Sign out everywhere else" on a workspace with
many sessions. The button has no indication of progress.

---

Minor Observations

- The empty state "No active sessions." is wrong if the current session is always included. If the list is truly empty
  (which shouldn't happen if the user is authenticated), the message should be "You have no other active sessions." If
  the fetch fails, the same empty state is shown with no distinction from "actually empty."
- Timestamps use new Date(s.lastSeenAt).toLocaleString() — this is correct for localization, but shows absolute
  timestamps without relative context. "Last active: 3/15/2025, 2:34:22 PM" is harder to assess than "Last active: 3
  days ago (March 15)."
- The "Sign out everywhere else" button is styled bg-red-50 text-red-700 — a soft red pill that reads as less urgent
  than its action deserves. A session revocation is a significant security action. The visual weight should reflect that
  (at least bg-red-100 or a border variant), not feel like a tag.
- font-display is undefined on the heading — same root cause as every other surface in the app.
- The account section has no profile editing, no password change, no 2FA management, no notification preferences. For
  a 2-person private app these may be low priority, but the absence of any profile surface means users' names and
  avatars (shown in the sidebar) can never be updated.

---

Questions to Consider

- Where does the user go to change their name, email, or password? The app has a forgot-password flow, but no in-app
  password change. Is that intentional?
- How does a user discover this page exists? If it requires knowing the URL, is it actually serving its security
  purpose?
- The current session is highlighted green ("This device"). Is there a world where the app shows something more
  meaningful — browser + OS parsed from the UA, approximate location, last-active time in relative format?

---

## Scoped features + fixes (Phase 2)

## Decisions / ADRs

## Handoff notes
