# ADR-0004: Pulse is Couple Pulse — check-in → Sync Score → suggested shared activity, via local Ollama

- **Status:** Accepted
- **Date:** 2026-06-10
- **Backlog:** FD-16 (kills CR-05 "Gold challenge" jargon copy)

## Context

The Pulse page is a dead-end placeholder with internal jargon ("Gold challenge") in user-facing copy. The critique demanded a decision: what *is* Pulse? The product principles want personal, relationship-centric features; the design system bans gamified pressure (no streaks, no grades, no nagging).

## Decision

Pulse becomes **Couple Pulse**:

1. **Check-in:** each partner records a quick mood/energy check-in. **One per partner per Pulse Day** (local calendar day), editable until the day ends. There is no free-form check-in stream.
2. **Sync Score:** the two check-ins combine into a *shared mood reading* — explicitly **not a grade, streak, target, or score to improve**. It reads the pair's current state; it never judges it.

   **Representation & computation (grilled 2026-06-10):**
   - **No numerals anywhere.** The score renders as a named *Reading* from a small fixed vocabulary ("In step", "Different speeds today", "Quiet day for both", …). No numbers, percentages, dials, or progress visuals.
   - **Deterministic rule table in code** maps (mood × energy)² → Reading — same house pattern as `AiAnomalyService.featureBasedVerdict`. Same inputs always give the same Reading; **the LLM never computes or influences the Reading.**
   - **Visual guardrails:** no red→green semantic ramp; divergence and quiet days render in the same calm palette as alignment. A divergent Reading is weather, never a problem to fix — styling it as an error would grade the relationship instead of reading the day.
   - "Sync Score" stays as the product/code/doc term; the UI leads with the Reading text and never shows the word "Score" next to anything countable.
3. **Suggested shared activity:** one suggestion generated from the combined reading.

**The async reality (grilled 2026-06-10):** check-ins are asynchronous, so the surface is designed around incomplete days:

- **Reveal-after-you-share:** the fact that your partner checked in is visible immediately; their mood/energy content is revealed only after you complete your own check-in for that Pulse Day. This keeps check-ins honest (no anchoring, no reactive mood-matching) and gives a warm reason to check in.
- **No nudging, ever:** no reminder button, no push, no "your partner is waiting" copy. A pressure state here is exactly the gamification FD-16 excludes.
- **One-sided day = no Sync Score.** The score slot shows a warm solo state ("Just you so far today"), never a partial score, grayed zero, or placeholder grade. A missing check-in is an absence, not a low reading — scoring it would turn non-participation into failure.

Generation reuses the existing local Ollama integration (`together-backend/src/logging/ai/ollama.client.ts` — injectable, JSON-mode, health-checked). No new AI dependency, no cloud calls; check-in data stays on the deployment.

**History & data boundary (grilled 2026-06-10):**

- **The Pulse surface shows today only.** No history list, calendar, trend, streak, or check-in count — ever. Yesterday's Pulse is gone from the UI when the Pulse Day ends, like yesterday's weather.
- **Check-in rows are retained but never surfaced.** Retention is a data fact, not a product feature ("editable until midnight" needs the row anyway; keeping it preserves future optionality). Delete-on-rollover was considered for a stronger privacy story and rejected for reversibility.
- **Statistics firewall:** the shared-progress view (FD-04/ADR-0001) and every other analytics surface **must not consume Pulse data**. Mood is checked in, read once, never aggregated — otherwise the leaderboard returns with feelings. This boundary has the same weight as the leaderboard removal itself.
- **Any future history/trends/memories feature must reopen this ADR first.** It may not arrive as an innocuous history tab in a PR.

**LLM contract & graceful degradation (grilled 2026-06-10):**

- **The LLM has exactly one job: the suggested shared activity.** Check-in, reveal, and Reading are byte-identical with or without Ollama; nothing else in Pulse ever calls the model.
- **Generated once per Pulse Day, server-side, when the second check-in lands**, then stored. The page renders the stored suggestion — no per-page-load generation, no re-roll on refresh (a refreshable suggestion is a slot machine, i.e. a pressure mechanic).
- **Degradation is invisible, not announced.** If `isAvailable()` is false, the call fails, times out (bounded, 10–15s per the existing client), or returns unusable JSON → fall back to the curated local list keyed by Reading. The user sees a suggestion either way and cannot tell which path produced it: no "AI unavailable" banner, no error state, no empty slot.
- **No retry loop.** If Ollama recovers later, today's fallback suggestion stands — regenerating would visibly swap content the couple may already be acting on.
- Consequence: **the curated fallback list is a first-class deliverable**, not an afterthought. It is the guaranteed quality floor, and on a deployment with no model pulled it is all anyone ever sees.

**Suggestion sources (grilled 2026-06-10):**

- **The curated list is the canon.** A static, hand-written set in code, keyed by Reading (~6–10 activities each). Entry rules: doable *tonight*, at home or walkable, free or near-free, no purchases, no screens-by-default, phrased as an invitation, never an instruction ("Tea on the balcony, phones inside", not "You should disconnect more").
- **The LLM picks and tailors; it does not invent.** Prompt inputs: both check-ins, the Reading, both first names, local time-of-day/day-of-week, and the curated candidates for that Reading. It selects the best fit and rephrases it warmly — same prompt discipline as the anomaly service's `buildPrompt` (explicit rules, priority order, JSON-only). Output is defensively validated (length cap; must trace to a candidate); anything malformed → serve the curated entry directly.
- **No task data, chat data, or statistics in the prompt — ever.** The suggestion draws from how the partners *feel*, never from what they haven't *done*; a task-aware suggestion would turn the anti-task surface into chore-nagging. Mirror of the statistics firewall: nothing flows pulse→stats, nothing flows tasks→pulse.
- All generation is on-box (local Ollama, single-tenant per ADR-0003); the minimal prompt is about tone discipline, not data protection.

## Consequences

- Sequenced as Wave 5 in REDESIGN-PLAN.md; the placeholder (and CR-05 copy) is replaced by the real surface.
- Copy and visuals must follow the no-pressure rule: a low Sync Score is a weather report, not a failure state; no history-based streaks or trends that create obligation.
- Adds a Pulse data model (check-ins per partner per day) and a backend module that consumes `OllamaClient` outside the logging context — consider extracting the client to a shared module when that lands.
