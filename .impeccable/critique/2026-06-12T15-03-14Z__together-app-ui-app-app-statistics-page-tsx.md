---
target: statistics
total_score: 22
p0_count: 0
p1_count: 2
timestamp: 2026-06-12T15-03-14Z
slug: together-app-ui-app-app-statistics-page-tsx
---
## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 2 | No loading skeleton; animated counter mounts at 0 with no motion guard |
| 2 | Match System / Real World | 2 | "Workspace" in breadcrumb stale after FD-12; triangle/square symbols not intuitive |
| 3 | User Control and Freedom | 3 | View toggle works; no column sorting in tabular view |
| 4 | Consistency and Standards | 2 | Emoji in cards not used elsewhere; inline colors bypass token system throughout |
| 5 | Error Prevention | 3 | Read-only surface; division-by-zero guarded; empty donut handled |
| 6 | Recognition Rather Than Recall | 3 | Legends visible; chart labelled; triangle/square priority symbols require familiarity |
| 7 | Flexibility and Efficiency | 2 | No column sorting, no date-range filter, no keyboard shortcuts |
| 8 | Aesthetic and Minimalist Design | 2 | Emoji + colored trend arrows + big number + sub-line all compete in each stat card |
| 9 | Error Recovery | 2 | No error boundary or retry if useTasks context fails; counters silently show 0 |
| 10 | Help and Documentation | 1 | No contextual help; no tooltip on Moved Together concept or donut segments |
| **Total** | | **22/40** | **Acceptable — significant improvements needed** |

## Anti-Patterns Verdict

LLM assessment: The 4-card summary grid reads as the hero-metric template the design system explicitly bans. Big number, small label, colored trend indicator, icon decoration. The emoji (checkmark, target, warning, handshake, chart, clipboard) reads as placeholder icon rather than deliberate brand voice; they are used nowhere else in the app. The stat card layout would pass as a SaaS metrics dashboard with no changes, which is the wrong category for Together. The rest of the page (Moved Together chart, donut, priority bars) is cleaner and more on-brand.

Deterministic scan: detect.mjs returned [] — no automated pattern hits. The inline colors are in JSX style props and SVG attributes, which the detector does not flag.

Visual overlays: Browser automation not available; no overlay.

## Overall Impression

The statistics page has a solid data integrity story (ADR-0001 compliance, no fabricated KPIs, real-data math), but the surface presentation borrowed from the wrong genre. The summary cards feel like a SaaS OKR dashboard dropped into a couples app. The emotional register of "up completion rate" and "down need attention" is adversarial to the brand stated rejection of gamification pressure. Fixable without structural change — the bones are right.

## What Is Working

1. ADR-0001 compliance is clean. No per-person split anywhere; "Moved Together" framing is warm, specific, and brand-right. The concept is a genuine differentiator.
2. Donut + bar charts work without libraries. The pure SVG donut and CSS bar approach keeps the bundle lean. The donut empty-state (gray ring) is a considered edge case.
3. View toggle is functional and clear. bg-sl active state uses the correct token; the segmented control pattern is recognizable and accessible via click.

## Priority Issues

[P1] motion-safe: guard missing — 3 locations
Why it matters: DESIGN.md section 6 is absolute with no exceptions. useCountUp runs an unconditional setInterval — users with prefers-reduced-motion see numbers counting up on every page mount. DonutChart uses transition-all duration-500 on SVG circles (line 55). Tab buttons use transition-all with no guard (line 190).
Fix: useCountUp: add early return when window.matchMedia prefers-reduced-motion matches — return the target directly, skip the interval. DonutChart circles: motion-safe:transition-all motion-safe:duration-500. Tab buttons: motion-safe:transition-all on both toggle buttons.
Suggested command: /impeccable harden

[P1] Token Law violations — inline colors throughout
Why it matters: DESIGN.md section 2 states every inline color attribute is a finding to replace. The violations are systematic: style background in DonutChart legend dots (line 73), SVG fill hex in the donut center label (line 65), hardcoded hex values in donutData and priorityData arrays, style width+background on priority bars (line 264). Using raw hex wired to style props bypasses the token system — a future palette update will not reach these values.
Fix: Replace the raw hex arrays with token-mapped CSS custom property values using var(--color-success), var(--color-info), var(--color-danger), var(--color-sl-dim). The text-gray-* usage throughout (text-gray-800, text-gray-500, text-gray-400) should map to text-sl, text-sl-muted, and text-sl-dim respectively.
Suggested command: /impeccable polish

[P2] Workspace in breadcrumb — stale copy
Why it matters: Line 185 reads "Workspace > Statistics > Tasks Overview". FD-12 renamed Workspace to Together across the app. This is a visible inconsistency on every statistics page load.
Fix: Change to "Together > Statistics" and drop "Tasks Overview" — it is redundant with the h1.
Suggested command: /impeccable clarify

[P2] Gamification pressure in summary cards
Why it matters: The "up +5 this month" in green and "down need attention" in red sub-lines with directional arrows impose OKR/streak mechanics on a couples shared life tool. DESIGN.md section 1 explicitly bans streaks and gamified pressure. "down need attention" is a nag.
Fix: Replace directional indicators with neutral context. "up +5 this month" becomes "5 added this month". "down need attention" becomes "2 coming due" or remove the sub-line entirely. Remove the green/red color coding from sub-lines and use text-sl-muted throughout.
Suggested command: /impeccable clarify

[P2] DonutChart SVG is inaccessible
Why it matters: The SVG chart has no title element, no role="img", no aria-label. Screen reader users get nothing from this chart — the data disappears entirely.
Fix: Add a title element with id="donut-title" as the first child of the SVG with text summarizing the data. Add role="img" aria-labelledby="donut-title" on the svg element.
Suggested command: /impeccable audit

[P3] Emoji in stat cards and tab buttons
Why it matters: Emoji icons in stat cards and tab buttons are not used anywhere else in the app. They compete with the metric numbers for visual weight and read as placeholder decorations.
Fix: Remove the icon div from stat cards. Drop emoji from tab button labels — the text Visual and Tabular is sufficient.
Suggested command: /impeccable distill

## Persona Red Flags

Sam (accessibility-dependent): DonutChart SVG announced as nothing by a screen reader — no title, no role, no label. Priority bars are div elements with percentage widths driven by inline style — no text alternative. The triangle, square, and inverted triangle Unicode symbols used for priority labels may be read as their full Unicode names by some screen readers.

Casey (distracted mobile user): The grid-cols six-column tabular layout has no overflow-x-auto wrapper — on a 375px viewport the grid overflows and clips silently. The rightmost columns (Priority, Status, Due) become invisible with no indication they exist.

Riley (stress tester): At 0 tasks the page shows all zeros without a true empty state or redirect to task creation. The "down need attention" sub-line on an overdue card showing 0 is semantically incorrect — 0 overdue tasks do not need attention.

## Minor Observations

- h1 uses text-gray-800 (line 183) instead of text-sl. Section h2 headings also use text-gray-800.
- var(--font-body) in the DonutChart SVG (line 65) is not defined in globals.css; it silently falls back to the browser default font.
- doneThisWeek uses updatedAt as a proxy for completion date — tasks edited after being marked done will be miscounted in a later week.
- priorityData uses triangle/square/inverted-triangle Unicode text symbols while the tabular view uses the imported PriorityBadge component — visual inconsistency within the same page.

## Questions to Consider

- The donut To Do segment uses #E74C3C (Flat UI red), not the danger token #DC2626 or the todo chip color. What does red mean for a to-do item — urgency, or just differentiation?
- Should donut segments link to the tasks list filtered by that state so partners can act on what they see?
- Moved Together is the most brand-aligned section on the page. Should it lead instead of the summary cards?
