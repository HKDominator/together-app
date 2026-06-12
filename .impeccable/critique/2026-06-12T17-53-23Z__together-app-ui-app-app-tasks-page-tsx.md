---
target: tasks
total_score: 25
p0_count: 0
p1_count: 3
timestamp: 2026-06-12T17-53-23Z
slug: together-app-ui-app-app-tasks-page-tsx
---
## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Good pagination loading states; initial mount briefly shows false empty state before tasks arrive |
| 2 | Match System / Real World | 3 | "Workspace > Tasks > All" breadcrumb is stale post-FD-12; language otherwise natural |
| 3 | User Control and Freedom | 3 | ESC not wired to close modals; no "clear all filters" shortcut; otherwise solid |
| 4 | Consistency and Standards | 2 | StateChip/PriorityBadge use generic Tailwind colors; text-gray-* throughout when text-sl-* is the standard; "Workspace" breadcrumb vs "Together" in sidebar |
| 5 | Error Prevention | 3 | Delete confirmation modal; inline form validation with handleBlur; maxLength on title |
| 6 | Recognition Rather Than Recall | 3 | Filter state always visible; table headers labeled; assignee shown |
| 7 | Flexibility and Efficiency of Use | 2 | No keyboard shortcuts; no bulk actions; filter reset requires individual clicks |
| 8 | Aesthetic and Minimalist Design | 2 | 4-card hero-metric grid with progress bars hits the absolute ban; 9 concurrent filter controls crowd the bar |
| 9 | Error Recovery | 3 | Drain error, generator error, and form submit error are all dismissible with plain-language messages |
| 10 | Help and Documentation | 1 | No help, no tooltip on "Generate" (a confusing dev tool), no guidance on empty task list |
| **Total** | | **25/40** | **Acceptable -- significant improvements needed** |

## Anti-Patterns Verdict

**LLM assessment:** Not fully clean. The 4-card stat grid ("Loaded / In Progress / Done / Overdue" with big bold numbers and colored mini-progress bars) is the textbook hero-metric template -- exactly the pattern the statistics page was restructured to remove. The rest of the page -- table, filter bar, modal, presence bubbles -- reads as genuine and considered. The stat cards undercut that work by anchoring the top of the most-used surface in the most recognizable SaaS cliche. The "Workspace > Tasks > All" breadcrumb also reads as corporate placeholder copy that survived the rename pass.

**Deterministic scan:** 1 finding -- gray-on-color warning at page.tsx:341 -- text-gray-400 on bg-red-50 (action buttons rendered inside overdue rows). The detector did not flag the inline barC hex colors (they live inside a JS object literal, not directly in JSX attribute position), but those are confirmed Token Law violations at lines 196-199.

## Overall Impression

The table itself is solid -- presence bubbles work, identity is right, keyboard/role semantics are in place. But the hero-metric stat cards sit at the top of every visit and immediately signal generic SaaS, undoing the personal framing below. The Token Law is also partially broken here: stat bars use inline hex, and StateChip/PriorityBadge still use generic Tailwind color classes that bypass the brand token system. Fix the cards and consolidate the color vocabulary and this surface earns its place.

## What's Working

1. **Dual-presence is genuinely implemented.** Partner viewing bubbles on task rows and co-presence tracking in the edit modal are real and working -- not a stub. This is the signature feature and it's visible.
2. **Identity layer lands correctly.** "You" vs. partner name in the assignee cell reads naturally. The mine/theirs distinction doesn't feel bolted on.
3. **Error states are recoverable.** Drain error, generator error, and form submit error all surface as dismissible alerts with plain-language copy, near the source, non-blocking.

## Priority Issues

### [P1] Hero-metric stat card grid -- banned pattern

**What:** Four stat cards ("Loaded", "In Progress", "Done", "Overdue") with display-scale numbers, supporting text, and colored progress bars. This is the hero-metric template in the absolute bans list. The statistics page was already restructured to remove this exact pattern.

**Why it matters:** This is the first thing users see on their most-visited surface. It signals "AI-generated SaaS dashboard" before they read a single task. The numbers don't give the couple anything actionable: knowing "4 of 22 loaded" tells them nothing about what to do next. The pattern also carries three Token Law violations (inline barC hex at lines 196-199, including a non-standard #E74C3C for Overdue that is not the danger token #DC2626).

**Fix:** Remove the 4-card grid. Replace with a compact summary strip -- e.g., "22 tasks total / 4 in progress / 1 overdue" -- using text-sl-muted and brand tokens throughout. The overdue count can activate the overdue filter. No bars, no display-scale numbers, no inline style={{ background: ... }}.

**Suggested command:** /impeccable polish

### [P1] "Workspace > Tasks > All" stale breadcrumb

**What:** Line 155 renders "Workspace > Tasks > All". FD-12 renamed "Workspace" to "Together" across the sidebar and chat header, but this breadcrumb was not updated.

**Why it matters:** Every user sees "Workspace" on the most-used page, immediately after the sidebar says "Together". It's a brand-consistency break at the highest-traffic surface.

**Fix:** Remove the breadcrumb (it's redundant given the sidebar active state and the page h1) or update to "Together > Tasks". Removing is the cleaner choice given PRODUCT.md's anti-reference to impersonal "workspace" copy.

**Suggested command:** /impeccable clarify

### [P1] Token Law violations: text-gray-* and component colors

**What:** Multiple Token Law violations across the page and its sub-components:
- text-gray-800 (lines 148, 203, 383) -- should be text-sl
- text-gray-500 (lines 155, 265) -- should be text-sl-muted
- text-gray-400 (line 204, action buttons, also flagged by detector at line 341) -- should be text-sl-dim
- text-gray-600 (line 318) -- should be text-sl-muted
- bg-gray-50 (table header/footer) -- should be bg-bg
- StateChip: bg-gray-100/text-gray-600 (todo), bg-blue-100/text-blue-700 (in_progress), bg-green-100/text-green-700 (done), bg-gray-100/text-gray-400 (cancelled) -- should use bg-bg/text-sl-muted, bg-info-pale/text-info, bg-success-pale/text-success
- PriorityBadge: bg-red-100/text-red-700, bg-yellow-100/text-yellow-700, bg-green-100/text-green-700 -- should use bg-danger-pale/text-danger, bg-warning-pale/text-warning, bg-success-pale/text-success

The StateChip cancelled state (text-gray-400 on bg-gray-100) has a contrast ratio of ~2.0:1, well below WCAG AA 4.5:1.

**Why it matters:** StateChip and PriorityBadge are in every task row -- the highest-frequency color elements on the page. Their generic Tailwind classes make the whole table look like it's from a different codebase than the sidebar and pulse page.

**Fix:** Migrate StateChip and PriorityBadge to use brand semantic token classes. Replace text-gray-* throughout with text-sl / text-sl-muted / text-sl-dim. Replace bg-gray-50 with bg-bg.

**Suggested command:** /impeccable polish

### [P2] motion-safe: missing on button transitions and stat bar animation

**What:** Multiple Tailwind transition-* classes without motion-safe: prefix:
- Line 161: transition-all hover:-translate-y-0.5 (generator button)
- Line 171: transition-all hover:-translate-y-0.5 active:scale-95 (New Task button)
- Line 206: transition-all duration-700 (stat card progress bar)
- Line 283: transition-colors hover:bg-cm-pale (table rows)
- TaskFormModal lines 208, 215: transition-colors, transition-all hover:-translate-y-0.5

**Why it matters:** Hard rule per DESIGN.md section 6 and the project handoff. The global prefers-reduced-motion block covers CSS keyframes; Tailwind transition-* classes still need individual motion-safe: prefixes.

**Fix:** Prefix all transition-*, hover:-translate-*, and active:scale-* classes with motion-safe: throughout page.tsx and TaskFormModal.tsx.

**Suggested command:** /impeccable polish

### [P2] Table has no mobile overflow handling -- columns will clip

**What:** grid-cols-[2fr_1fr_100px_110px_100px_80px] with no breakpoints and no overflow-x-auto wrapper. At 375px the fixed columns alone are 500px+ and will clip.

**Why it matters:** Partners use this app "throughout the day, often on a phone." The task list is unusable on mobile in its current layout.

**Fix:** Wrap the table container in overflow-x-auto and add min-w-[640px] to the grid container (same pattern as the statistics tabular fix).

**Suggested command:** /impeccable adapt

## Persona Red Flags

**Casey (Distracted Mobile):** The table is a fixed 6-column grid -- every column except "Task" will be clipped on a phone with no affordance for scrolling. The "New Task" button sits top-right, far from the thumb zone. The filter bar with 9 controls (search + 2 selects + 5 state pills) is overwhelming on a small screen. The empty state "No tasks match your filters." gives no path to clear filters; Casey will think the app lost her tasks.

**Riley (Stress Tester):** Clears all tasks -- filtered.length === 0 shows "No tasks match your filters." with no active filters -- wrong message for a truly empty list. Applies a filter that matches nothing -- same message, no "clear filters" affordance. Notices "Workspace > Tasks > All" but "Together" in sidebar. Overdue row: action button text-gray-400 on bg-red-50/30 background is washed out (detector flagged this at line 341).

**Sam (Accessibility):** StateChip "Cancelled" label has text-gray-400 on bg-gray-100 at ~2.0:1 contrast, likely invisible to low-vision users. The "Generate" button has no aria-describedby or tooltip -- screen reader hears "Generate" with no context about what it does or who it's for.

## Minor Observations

- The plus sign in "New Task" button uses fullwidth Unicode U+FF0B, not a regular +. Renders inconsistently across OS/browser.
- Delete confirmation button label "Yes, Delete" -- cleaner as "Delete Task" (verb + object per DESIGN.md copy guidance).
- TaskFormModal heading uses text-gray-700 -- should be text-sl. Modal corners use rounded-3xl; DESIGN.md specifies rounded-xl for cards/modals.
- No initial loading skeleton -- filtered = [] during first mount shows the empty message before tasks arrive.
- Generator button is always visible; it is a dev/admin tool that should be gated by role.

## Questions to Consider

- "The stat cards show data the table already communicates. What does a partner actually need to know at the top of this view -- the count, or the story?"
- "If the two of you open this page at the same time and both see 'Workspace > Tasks > All', does it feel like yours?"
- "The filter bar has 9 controls. What would you remove if you had to drop half of them and make it work on a phone?"
