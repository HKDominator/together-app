---
target: tasks
total_score: 26
p0_count: 0
p1_count: 3
timestamp: 2026-06-09T15-17-35Z
slug: together-app-ui-app-app-tasks-page-tsx
---
## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Optimistic syncing, infinite scroll spinner, pending badge. No ownership split (mine vs partner's). |
| 2 | Match System / Real World | 2 | "Loaded" stat card exposes pagination state. "Generate" is a dev tool. Breadcrumb is enterprise SaaS grammar. |
| 3 | User Control and Freedom | 3 | Delete confirmation, All reset, backdrop close. No Esc, no undo after delete, no modal × button. |
| 4 | Consistency and Standards | 2 | Back button uses text-blue-600 vs cr elsewhere. State circles use bg-blue-500. Three filter patterns on one row. Token Law violated throughout. |
| 5 | Error Prevention | 3 | Delete confirmation. Blur-validate. Overdue highlighting. Silent console.error on async failures. |
| 6 | Recognition Rather Than Recall | 3 | Filters visible, chips inline. Row click to detail undiscoverable. No saved filters. |
| 7 | Flexibility and Efficiency | 2 | No keyboard shortcuts. No bulk actions. No drag-to-reorder. No task templates. |
| 8 | Aesthetic and Minimalist Design | 2 | Hero-metric stat cards. Eyebrow headers on every section. Emoji icons. Dev Generate button in action bar. |
| 9 | Error Recovery | 3 | Delete confirmation. Validation clears on edit. console.error only on submit failures — user gets no feedback. |
| 10 | Help and Documentation | 1 | Nothing. No tooltip on Generate. No explanation of pending sync. Rows not discoverable as clickable. |
| Total | | 26/40 | Acceptable — significant improvements needed |

## Anti-Patterns Verdict

LLM: The tasks page is a competent task manager that could be Jira or Linear with the logo swapped. Stat cards hit the banned hero-metric template exactly. Table and section headers use all-caps uppercase tracking on every single header — eyebrow-on-every-section AI grammar. Zero of the "Two of Us" north star. No partner awareness, no dual-presence, nothing that says "shared space for two people."

Detector: 1 finding — gray-on-color at tasks/page.tsx:275. text-gray-400 on bg-red-50 (overdue row). ~2.1:1 contrast, well below WCAG AA 4.5:1. Real finding, not a false positive.

## Priority Issues

[P1] Stat cards are the banned hero-metric template — big number + uppercase label + supporting sub-text + inline-colored progress bar. "Loaded" card exposes pagination state as a KPI. Replace with a 2-person-aware summary.

[P1] Zero "Together" identity on the primary daily surface — looks like a solo task manager. No partner awareness in the list, no dual-presence, no "we" framing. The north star is "The Two of Us" and the main surface doesn't reflect it.

[P1] "Generate" dev tool visible in production action bar — gate behind NODE_ENV or feature flag.

[P2] Uppercase eyebrow pattern on every section header — stat card labels, table column headers, modal field labels, task detail section headers. All use text-xs font-semibold uppercase tracking-wide. Reserve for one role only.

[P2] Detector: gray text on red-50 background (tasks/page.tsx:275) — text-gray-400 on overdue bg-red-50. WCAG AA failure. Change to text-gray-600 or text-red-700.

## Persona Red Flags

Alex: No keyboard shortcuts. No bulk select. Row click to detail has no affordance. "Generate" button clicked by accident. Low efficiency ceiling.

Sam: Table rows are div onClick, not button/a — not keyboard-focusable, not announced as interactive. Screen readers cannot navigate the task list without a mouse. Emoji icons announce as "magnifying glass tilted left" and "wastebasket." font-display undefined.

The Couple (daily returning users): Page looks like a solo tool. No partner presence signal. After 2 months of daily use, tasks still looks like a generic task manager, not a shared space.
