---
target: pulse
total_score: 18
p0_count: 0
p1_count: 2
timestamp: 2026-06-09T15-58-44Z
slug: together-app-ui-app-app-pulse-page-tsx
---
## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 1 | "Coming soon" communicates absence, not status. No description, no ETA, no forward path. |
| 2 | Match System / Real World | 2 | "Pulse" is recognizable. "Gold challenge" is internal jargon invisible to app users. |
| 3 | User Control and Freedom | 2 | User can leave via sidebar, but the page dead-ends with no explicit forward path. |
| 4 | Consistency and Standards | 2 | font-display, text-sl, text-sl-muted — all undefined tokens. Same root cause as every surface. |
| 5 | Error Prevention | 3 | Nothing to fail. |
| 6 | Recognition Rather Than Recall | 1 | No content. User leaves knowing nothing about what Pulse is. |
| 7 | Flexibility and Efficiency | 1 | No content, no actions, no paths. |
| 8 | Aesthetic and Minimalist Design | 2 | Minimal by absence, not by design. |
| 9 | Error Recovery | 3 | Nothing to recover from. |
| 10 | Help and Documentation | 1 | No help. Only text is unexplained jargon. |
| Total | | 18/40 | Poor |

## Anti-Patterns Verdict

LLM: Not AI slop — there's nothing here to be sloppy. It's an 8-line stub. The issue is an empty coming-soon page that communicates nothing about the feature, combined with internal jargon ("Gold challenge") in a user-facing string.

Detector: [] — 0 findings.

Copy violation: "Coming soon — Gold challenge." uses an em dash (banned). "Gold challenge" is course grading jargon.

## Priority Issues

[P1] Page dead-ends — communicates nothing about what Pulse is or will be. Replace with a real interim state: feature name, one sentence on what it does, visual signal. "Pulse tracks your shared activity — who's been working, what changed, when you last connected."

[P1] "Gold challenge" is unexplained internal jargon in a user-facing string. Remove entirely.

[P2] font-display, text-sl, text-sl-muted undefined tokens — same root cause as every surface.

## Persona Red Flags

The Couple: One partner clicks Pulse hoping for something about the two of them. "Coming soon — Gold challenge." means nothing. Feature fails to build any anticipation.

Jordan (First-Timer): Clicking through nav to understand the app. Pulse has no description. Jordan's mental model of the app now has an unexplained hole.
