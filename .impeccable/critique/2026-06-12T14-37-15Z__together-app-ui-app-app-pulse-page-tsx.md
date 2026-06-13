---
target: pulse
total_score: 25
p0_count: 0
p1_count: 2
timestamp: 2026-06-12T14-37-15Z
slug: together-app-ui-app-app-pulse-page-tsx
---
## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 2 | "Saving…" text is the only feedback; load failure renders "Loading…" forever |
| 2 | Match System / Real World | 3 | Natural mood/energy vocabulary; "Reading" undefined for first-timers |
| 3 | User Control and Freedom | 2 | Load failure traps user; complete state has no update path |
| 4 | Consistency and Standards | 3 | Token-compliant, internally consistent; minor legend style variance |
| 5 | Error Prevention | 3 | Button correctly disabled until both fields selected; load error silently swallowed |
| 6 | Recognition Rather Than Recall | 3 | All options visible and labeled; Reading label appears without context |
| 7 | Flexibility and Efficiency | 2 | Keyboard-navigable radio pattern; window-focus refetch is a nice detail |
| 8 | Aesthetic and Minimalist Design | 4 | Genuinely excellent — spare, token-clean, no decoration |
| 9 | Error Recovery | 2 | Alert shown for save failures; no retry affordance; load failure shows nothing |
| 10 | Help and Documentation | 1 | No contextual help; Reading concept undefined anywhere in the UI |
| **Total** | | **25/40** | **Acceptable** |

## Anti-Patterns Verdict

LLM: Passes cleanly. Not AI slop. Intentionally spare, token-compliant, accessible radio pattern. Detector found zero issues.

Detector: [] — 0 findings.

## Priority Issues

[P1] Load failure traps user permanently — view stays null after catch, loading=false in finally, if (loading || !view) remains truthy → "Loading…" forever. Fix: add error state, show retry affordance.

[P1] "Reading" concept undefined in complete state — reading label ("In step") appears with no label above it. Add small "Today's reading" label in legend scale above the reading.

[P2] No feedback moment when check-in succeeds — state silently transitions after save. Add motion-safe fade-in on the state-contextual copy or brief "Your check-in is in." acknowledgment.

[P2] Partner-first copy implies social pressure — "{name} has checked in today." is transactional and mildly pressuring. Rephrase to "{name} is in today." or avatar-based visual treatment.

[P3] Loading state copy is generic — "Loading…" violates the personal empty-state principle. Replace with "Getting today's pulse…".

[P3] Save error passes raw API message — add length check and safe fallback string.
