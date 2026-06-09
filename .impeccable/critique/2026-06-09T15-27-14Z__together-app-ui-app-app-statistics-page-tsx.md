---
target: statistics
total_score: 24
p0_count: 0
p1_count: 2
timestamp: 2026-06-09T15-27-14Z
slug: together-app-ui-app-app-statistics-page-tsx
---
## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Count-up animation, toggle clear. No loading state while TasksContext hydrates. |
| 2 | Match System / Real World | 2 | "+12% vs last month" and "Balanced" are hardcoded strings. Priority emoji labels use color alone. "Contribution Ranking" is enterprise performance-review language. |
| 3 | User Control and Freedom | 3 | Visual/tabular toggle. Read-only surface. |
| 4 | Consistency and Standards | 2 | bg-sl undefined token on active toggle. "Ana"/"Dan" hardcoded in chart legend. All chart colors hardcoded hex. |
| 5 | Error Prevention | 2 | No empty state for zero tasks. NaN guard in useCountUp is commented out. |
| 6 | Recognition Rather Than Recall | 3 | Legends present. Toggle labeled. Score formula opaque. |
| 7 | Flexibility and Efficiency | 2 | Toggle only. No date range, no per-user filter, no export. |
| 8 | Aesthetic and Minimalist Design | 2 | Hero-metric summary cards (4th instance across app). Contribution Ranking with medals and stars between intimate partners is gamification PRODUCT.md bans. |
| 9 | Error Recovery | 3 | Read-only surface. Empty states degrade to gray ring / flat bars. |
| 10 | Help and Documentation | 1 | No tooltip for Score formula. No explanation of Balanced or Ranking. |
| Total | | 24/40 | Acceptable — significant improvements needed |

## Anti-Patterns Verdict

LLM: Hero-metric summary cards appear again (4th surface). Contribution Ranking section is the most product-damaging element: 🥇/🥈/🥉 medals + 5-star ratings ranking one intimate partner above another. PRODUCT.md explicitly bans "gamified pressure" and "nagging." The score formula (done/total × 5) is productivity theater. Two of four KPI cards show hardcoded "+12%" and "Balanced" regardless of actual data.

Detector: 0 findings. Problems are conceptual, not CSS-detectable.

## Priority Issues

[P1] Contribution Ranking is a direct PRODUCT.md anti-reference — medals, star ratings, numeric score ranking one partner above another. Gamified pressure between intimate partners. Replace with a shared achievement view: "together, you completed N tasks this month."

[P1] Two of four KPI cards show hardcoded fake analytics — "+12% vs last month" never changes, "Balanced" always shows. False insights erode trust.

[P2] bg-sl undefined token — active toggle state invisible. Both toggle buttons look identical. Users can't tell which view is active.

[P2] Bar chart legend hardcodes "Ana"/"Dan" — should use users[0]?.name / users[1]?.name.

[P2] Priority emoji labels convey meaning via color alone — WCAG 1.4.1 violation. Remove emoji, use text labels only.

## Persona Red Flags

The Couple: One partner sees silver medal and 3.8 score vs partner's 4.2. The app has just quantified a rough week and labeled it with a competitive medal. This is the most damaging possible framing for the brand promise.

Riley (Stress Tester): Zero-task state shows "+12%" on Completion Rate (hardcoded). "Balanced" on 0/0 split. Bar chart labels say "Ana"/"Dan" for different users. Commented-out NaN guard means useCountUp breaks at zero.

Alex: Can't filter by date range, can't filter by user, can't export. "+12%" can't be verified against the bar chart because it's fake. Loses trust in all statistics.
