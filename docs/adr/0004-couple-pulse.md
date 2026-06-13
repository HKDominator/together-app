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

---

## Addendum A — Synchronized Breathing field (Pulse visual centerpiece)

- **Status:** Accepted
- **Date:** 2026-06-13
- **Scope:** `together-app-ui/app/(app)/pulse/page.tsx` + `globals.css`. Pure frontend, visual only.

### Context

The Pulse surface is sparse by design — three of its four states (empty, partner-first, solo) are mostly whitespace and a form. The critique (`.impeccable/critique/2026-06-12…pulse`) scored the page "technically correct and emotionally inert": the once-a-day Reading payoff landed flat and the sparse states had no warmth. We want a single relational anchor that makes the page feel *accompanied* without adding copy, data, or a pressure mechanic.

This collides with a hard rule in DESIGN.md §1: delight is bounded to three categories (completion moments, presence transitions, considered empty states) and **"does not leak into ambient decoration … nothing else animates."** A circle that breathes continuously is, on its face, the ambient decoration that line forbids. DESIGN.md also requires that any delight outside the three categories get deliberate review — this addendum *is* that review.

### Decision

Pulse gets a **Synchronized Breathing field**: one or two soft, blurred, slowly-breathing circles that anchor the sparse states and lock into phase when the partner is live. It is admitted as a **sanctioned ambient-presence exception**, justified by binding it to two of the three existing delight categories rather than inventing a fourth:

- It is the **considered-empty-state** treatment for states (a)/(b)/(c) — those *are* the empty states the system says deserve craft.
- The phase-alignment when the partner comes online is a **presence transition** — the same family as the sidebar presence dot.

The exception is granted **only within the hard ceilings below.** Exceeding them re-opens this addendum.

### Hard constraints (audit-checkable; a violation is a regression, not a tweak)

1. **Amplitude ceiling — scale oscillation ≤ ±4% (use ±3–4%, i.e. 0.96–1.04).** Coupled opacity sway ≤ ±0.06. The breath must read as "alive," never as decoration. If it's noticeable without looking for it, it's too strong.
2. **Period floor — one breath cycle ≥ 6s (use 6–8s).** No faster. Faster reads as a loader or a heartbeat-monitor, both wrong.
3. **Palette — warm-sand neutrals only.** The orbs are soft-blurred discs with a *low-contrast* warm-sand radial fill (you: `#F1E5D7`→`#DEC9AF`; partner: `#F6EEE3`→`#E9DAC8`) at ~0.9 opacity — deepened siblings of the `cm` family, because `cm`/`cm-pale` themselves are invisible against the `stone-100` (`#F5F5F4`) app background (revised 2026-06-13: the original `cm`/`cm-pale`-only flat-blob rule produced a sub-perceptible smudge on the real page). The radial is tonal, not saturated — no crimson, no pink/rose, no Valentine's wash (DESIGN.md). Crimson stays rationed to the single "Check in" button in states a/b/c.
4. **The second circle means *live presence*, consistently, in every state — never "checked in."** Presence (online now) and check-in (logged today) are orthogonal facts and must not be conflated. Partner online ⇒ second circle; partner offline ⇒ no second circle, in *all four* states including (d).
5. **Presence-driven only; valence-blind.** The breath looks byte-identical regardless of the Reading. "In step", "Different speeds today", and "Quiet day for both" produce the same field. The breath never encodes mood, alignment, or any reading valence — that would smuggle a grade back in (cf. the no-red→green guardrail in the main decision).
6. **It recedes in state (d).** When the Reading reveals, the field drops to a low-opacity halo behind the Reading card and hands focus to the Reading on the same beat. The Reading is the peak-end payoff; the breath must never compete with it.
7. **Reduced motion strips everything kinetic.** Under `prefers-reduced-motion: reduce`: no breathing, no phase-lerp, no rAF — circles render static at rest scale. Partner-present is still shown, carried entirely by the *presence* of the static second circle (geometry, not motion) — mirroring how the presence dot keeps its color when its pulse is stripped.

### Mechanism notes (locked)

- **The connect moment is a two-orb choreography (revised 2026-06-13).** The original single-blob-that-pulses read as a stray smudge and the overlapping-blur "sync" was invisible. Replaced with two distinct orbs on separate position/scale layers: idle is one centered orb breathing subtly; when the partner comes online the "you" orb drifts aside (CSS `.is-paired` translate) while the partner orb slides in from the side (CSS `partnerArrive`) and the two settle into an overlapping union. The visible signal is **positional** — a one-time presence transition, *not* raised-amplitude ambient breath, so the §1 amplitude ceiling is untouched.
- **Phase-alignment** runs ~3s via `requestAnimationFrame`, easing the partner orb's breath phase offset (~π, counter-breathing) toward 0 (unison) on top of the positional settle. The clock is a **local `performance.now()` captured at the partner offline→online transition** — no PresenceContext API change, no timestamp added to the snapshot. Convergence is one-directional and non-repeating within a session (no re-sync on every window focus — a repeating animation would be the slot-machine pattern the main ADR rejects). The rAF loop stops once aligned and hands back to the shared CSS keyframe.
- **Partner identity** is derived, not fetched: `partnerOnline = [...onlineUserIds].some(id => id !== useAuth().user.id)`. Safe because Pulse is single-tenant per ADR-0003. No `partner.userId` is added to the Pulse payload.

### Boundaries held (unchanged from the main decision)

- Pure visual: no backend, no storage, no new socket events. Rides the existing Wave-4 presence boolean (ADR-0002, one connection).
- No TasksContext dependency — PresenceContext is a separate provider.
- No numeral, no "Score," no nudge/reminder copy, no re-roll, no history. The breath replaces nudge copy: in the solo state the partner's circle arriving *is* the "they're here" signal, with no words.

### Consequences

- The next `/impeccable audit` will see continuous motion on Pulse. This addendum is the paper trail that it is sanctioned; the audit's job becomes verifying the constraints above (amplitude, period, palette, valence-blindness, reduced-motion), not flagging the motion's existence.
- Any future change that raises amplitude/period, makes the breath valence-aware, ties the second circle to check-in instead of presence, or lets it persist as the centerpiece in state (d) must re-open this addendum first.
