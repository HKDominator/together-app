---
target: pulse page
total_score: 23
p0_count: 1
p1_count: 2
timestamp: 2026-06-12T20-04-10Z
slug: app-app-pulse-page-tsx
---
## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 2 | Loading and partner states shown; complete state gives no signal that reading is the reward |
| 2 | Match System / Real World | 3 | Check in/Update natural; Pulse and Reading unexplained for first-timers |
| 3 | User Control and Freedom | 2 | Can edit in solo state; no way to undo once complete; locked after state d |
| 4 | Consistency and Standards | 3 | Patterns hold; Try again used inconsistently as link and button |
| 5 | Error Prevention | 3 | Submit disabled until both fields chosen; good constraint |
| 6 | Recognition Rather Than Recall | 3 | Radio pattern correct; mood/energy vocabulary undefined |
| 7 | Flexibility and Efficiency | 2 | No shortcuts, no defaults from prior day, no memory |
| 8 | Aesthetic and Minimalist Design | 2 | Form uncluttered; complete state too minimal — feels empty not intentional |
| 9 | Error Recovery | 2 | Try again on load failure; Ollama-down copy vague |
| 10 | Help and Documentation | 1 | No help text, no vocabulary guidance, no onboarding context |
| **Total** | | **23/40** | **Acceptable — significant improvements needed** |

## Anti-Patterns Verdict

LLM assessment: Not obviously AI-generated in structure, but designed like a template in feeling. Solid A11y foundation (fieldset/legend/radio, focus ring, role=alert). What is missing is emotional investment. The complete state is visually indistinguishable from a loading state. Choice buttons are shadcn boilerplate with no tactile quality. Made by a careful engineer who ran out of time before the emotional second pass.

Deterministic scan: Zero findings. No gradient text, no side-stripe borders, no hero-metric template. Clean.

## Overall Impression

Technically correct and emotionally inert. The complete state — the peak of the entire interaction arc — delivers a single text-2xl line of muted text with no warmth, no weight, no sense that anything meaningful just happened between two people.

## What's Working

1. Partner-first and solo states have genuine emotional intelligence. "Already in. Check in to see today's reading together." frames this as synchronized — rare and right for a couple-facing app.
2. Semantic HTML and accessibility foundation is solid. fieldset/legend, sr-only radio inputs, focus ring, role=alert. Correct pattern.
3. Form constraint prevents broken states. Submit disabled until both mood and energy chosen.

## Priority Issues

[P0] Complete state is the emotional payoff — it lands flat. Peak-end rule: state d is the reward for synchronizing. Current delivery: text-2xl on white page with muted suggestion. No visual weight, warmth, or sense of arrival. Fix: Reading as unambiguous centerpiece — larger scale, warm surface, animation has visual material to land on. Remove redundant eyebrow label.

[P1] Choice buttons are generic. Active state (bg-cm border-sl-muted) is the right color direction but wrong weight. Doesn't feel selected — feels like a different border. Fix: Active buttons need visual mass: shadow, scale, or both. Generous targets (min-h 56-64px). The inactive-to-active transition should feel like a gentle press.

[P1] Mood/energy vocabulary is undefined. Bright/Steady/Tender/Heavy with no context. Is Tender weak or warm? Is Heavy bad or full? Fix: A single orienting line beneath each legend: "How are you feeling emotionally?" / "What's your energy level right now?"

[P2] Complete state text hierarchy inverted. Eyebrow competes with reading. Suggestion so muted it disappears. Fix: Remove eyebrow (redundant). Elevate reading to dominant display scale. Bring suggestion up to text-sl.

[P2] Ollama-down fallback vague. "Still coming together" does not distinguish processing from error. Fix: If generating: animated indicator + "Generating your reading…". If failed: "Couldn't generate a reading today. Your check-ins are saved."

## Persona Red Flags

Casey (Mobile): flex-wrap gap-2 with min-w-[88px] may wrap asymmetrically on 360px. max-w-lg exceeds most mobile widths. text-xs eyebrow barely readable one-handed.

Jordan (First-timer): No orienting copy. Form opens cold. Vocabulary undefined. No context for what happens when both check in.

Sam (A11y): All-caps legend text harder for dyslexic users. No aria-required on radio inputs. Ollama-down state has no role=status or aria-live.

## Minor Observations

- Try again used in 3 places inconsistently (button vs link style)
- h1 "Today" dominates in state d, competing with the reading itself
- text-sl-dim (#8FA5B8) is 2.8:1 against white — borderline at text-xs in Ollama-down copy
- choiceBase active/inactive tokens and disabled state are correct — only visual weight needs change
