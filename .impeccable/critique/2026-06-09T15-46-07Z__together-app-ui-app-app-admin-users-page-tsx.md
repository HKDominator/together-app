---
target: admin
total_score: 24
p0_count: 0
p1_count: 1
timestamp: 2026-06-09T15-46-07Z
slug: together-app-ui-app-app-admin-users-page-tsx
---
## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 2 | Permission/loading states on all pages. Observation auto-polls every 5s. No loading state during initial data fetch. Resolve button stays clickable during in-flight PATCH. |
| 2 | Match System / Real World | 3 | Technical language appropriate for admin. Permission codes shown correctly. Status codes color-coded. Signal types (scraper/vandal/probe/burst) are clear domain terms. |
| 3 | User Control and Freedom | 2 | Logs pagination with disabled bounds. Resolve has no undo. No manual refresh on observation. Users table has no actions at all. |
| 4 | Consistency and Standards | 2 | Users page uses text-sl (undefined). Logs page doesn't. Different h1 treatments. font-display undefined on all. |
| 5 | Error Prevention | 3 | Permission gates on all pages. Error states shown. Low-risk resolve doesn't need confirm. |
| 6 | Recognition Rather Than Recall | 3 | Status codes color-coded. Signal badges labeled. Pagination explicit. Score has no tooltip. |
| 7 | Flexibility and Efficiency | 2 | No search on logs (50/page, unknown total). No date/method/status filter. No sort. No manual refresh on observation. |
| 8 | Aesthetic and Minimalist Design | 3 | Appropriately dense. No hero-metric cards (only section in app without them). Functional color use. Details collapse for evidence. |
| 9 | Error Recovery | 2 | Fetch errors displayed. Resolve has no catch — silent failure if PATCH fails. Logs doesn't distinguish empty vs failed. |
| 10 | Help and Documentation | 2 | Permission denied messages explain required permission. Signal types not explained. Score field has no tooltip. |
| Total | | 24/40 | Acceptable |

## Anti-Patterns Verdict

LLM: Admin surface is the cleanest section of the app — no hero-metric cards, no decorative panels, no slop. Observation page is thoughtful: AI signal badges, evidence collapse, functional color coding. Inherited issues: font-display and text-sl undefined, uppercase table headers (legitimate here — banned for section eyebrows, not table columns).

Detector: 0 findings across all 3 admin pages.

## Priority Issues

[P1] Logs page has no search, filter, or sort — 50 entries per page, unknown total pages. Finding specific errors or users requires paging through everything. Add method, status code, and date range filters.

[P2] Observation auto-polls every 5s with no user control — aggressive, page refreshes while admin is reading. Add manual refresh + longer default interval (30-60s) + "last updated" indicator.

[P2] text-[10px] and text-[11px] below readable minimum — userId (11px), IP (10px), flaggedAt (10px). Use text-xs (12px) minimum.

[P2] Resolve action has no error handling — silent failure if PATCH fails. Admin thinks they resolved something that wasn't resolved.

[P2] font-display and text-sl undefined tokens on admin/users heading — same root cause as all other surfaces.

## Persona Red Flags

Alex (Admin investigating 4xx spike): No status code filter, no date filter, no path search. Must page through 50-entry pages manually. userId is 8-char truncated ID not recognizable without cross-referencing users table.

Sam (Screen Reader): "Mark resolved" button has no accessible name including the user's name. text-[10px] timestamps invisible at low vision. Sidebar admin link has nested Link-in-Link (already flagged in chat critique) — breaks keyboard nav.
