---
target: account
total_score: 18
p0_count: 1
p1_count: 3
timestamp: 2026-06-09T16-08-31Z
slug: together-app-ui-app-app-account-sessions-page-tsx
---
## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 2 | No loading state during fetch. No success feedback after revoke — silent refresh. |
| 2 | Match System / Real World | 2 | "Sessions" is jargon. Device labels are raw UA first-token ("Mozilla"). Timestamps are absolute ISO, not relative. |
| 3 | User Control and Freedom | 2 | Individual/bulk revoke available. No undo. No back navigation. Page unreachable via app nav. |
| 4 | Consistency and Standards | 2 | font-display undefined. Native confirm() breaks visual style. Green for current is semantically reasonable but off-brand. |
| 5 | Error Prevention | 2 | confirm() before revoke, but mutation errors are swallowed. "Sign out everywhere else" button prominent in header, easy to mis-tap. |
| 6 | Recognition Rather Than Recall | 2 | Session list visible, current highlighted. Device labels meaningless. No relative times. |
| 7 | Flexibility and Efficiency | 1 | Reachable only by direct URL. No filter/sort. No bulk selection. |
| 8 | Aesthetic and Minimalist Design | 3 | Clean functional layout. No hero-metrics, no decorative clutter. |
| 9 | Error Recovery | 1 | revoke() and revokeOthers() have no try/catch. Silent failures on security-critical mutations. |
| 10 | Help and Documentation | 1 | No explanation of what sessions are or what revocation does. |
| Total | | 18/40 | Poor |

## Anti-Patterns Verdict

LLM: Clean, functional, no slop. Problems are structural (unreachable ghost route, missing account index) and functional (silent error handling, meaningless UA labels, native confirm()), not aesthetic.

Detector: [] — 0 findings.

## Priority Issues

[P0] Account surface is unreachable — no sidebar link, no user menu, no profile section. A user who needs to revoke a compromised session has no way to find this page without knowing the URL.

[P1] Device labels are meaningless — UA.split(' ')[0] produces "Mozilla" for every browser. Parse UA properly (browser + OS).

[P1] revoke() and revokeOthers() have no error handling — silent failures on security mutations.

[P1] Native confirm() — breaks on iOS in certain contexts, breaks visual style. Replace with inline confirm pattern.

[P2] No account index page — /account 404s.

## Persona Red Flags

The Couple: Needs to revoke a suspicious session. Can't find session management anywhere in the app nav. Non-interactive user avatar in sidebar. Wrong recovery path taken.

Sam (Screen Reader): Session card Revoke buttons have no accessible name including which session. Screen reader announces "Revoke / Revoke / Revoke" with no disambiguation.

Riley (Stress Tester): Double-click race condition on revoke (no loading state). "Sign out everywhere else" with no progress indicator for bulk operation.
