# PRD: Couple Pulse

Status: ready-for-agent
Date: 2026-06-10
Backlog: FD-16 (kills CR-05) · ADR: [ADR-0004](../../docs/adr/0004-couple-pulse.md) (Accepted, fully grilled 2026-06-10)
Wave: 5 (per REDESIGN-PLAN.md fix sequencing). Prerequisites: Wave 1 identity wire (authenticated user threaded into requests), SEC-04 authenticated transport (done).

> Vocabulary note: this PRD uses the CONTEXT.md glossary terms exactly — **Check-in**, **Pulse Day**, **Reveal-after-you-share**, **Sync Score**, **Reading**, **Suggested shared activity**, **Curated Canon**. Do not drift to synonyms.

## Problem Statement

The Pulse page is a dead-end placeholder that says "Coming soon — Gold challenge" — internal jargon shipped to the couple's screen. There is nowhere in the app for partners to share how they're *feeling* rather than what they're *doing*; every existing surface is about tasks, which makes the product transactional. A couple wants a small, warm, daily ritual: each partner says how their day feels, sees how the two of them land together, and gets one gentle idea for something to do together tonight — without grades, streaks, reminders, or any pressure to perform their relationship.

## Solution

Pulse becomes **Couple Pulse**, exactly as locked in ADR-0004:

1. Each partner records one **Check-in** (mood + energy) per **Pulse Day** — a local calendar day. The Check-in is editable until the day ends, then immutable. There is no stream, no history.
2. Check-ins are asynchronous, governed by **Reveal-after-you-share**: you can always see *that* your partner checked in, but you see *what* they checked in only after you complete your own Check-in for that Pulse Day. A one-sided day shows a warm solo state ("Just you so far today") — never a partial score, never a nudge.
3. When both Check-ins exist, they combine into the **Sync Score**, which renders as a **Reading** — a named qualitative state from a small fixed vocabulary ("In step", "Different speeds today", "Quiet day for both", …). Weather-report language: no numerals, no dials, no red→green ramp, nothing to improve. The Reading is computed by a deterministic rule table in code; the LLM never touches it.
4. Alongside the Reading, the couple gets one **Suggested shared activity**, generated **once per Pulse Day, server-side, when the second Check-in lands**, then stored. It is drawn from the **Curated Canon** (hand-written, in-code, keyed by Reading); the local Ollama LLM may *pick and tailor* a Canon entry but never invents one. If Ollama is down, slow, or returns garbage, the Canon entry is served directly — and the user cannot tell which path produced what they see.

Yesterday's Pulse disappears when the Pulse Day ends, like yesterday's weather. Pulse data never feeds statistics; task/chat/statistics data never feeds Pulse.

## User Stories

1. As a partner, I want to record a quick mood/energy Check-in for today, so that I can share how my day feels without writing anything.
2. As a partner, I want exactly one Check-in per Pulse Day, so that the ritual stays a reading of the day rather than a feed I'm expected to maintain.
3. As a partner, I want to edit my Check-in any time before the Pulse Day ends, so that a hasty morning answer doesn't misrepresent my whole day.
4. As a partner, I want my Check-in to become immutable when the Pulse Day ends, so that the record reflects what I actually shared that day.
5. As a partner, I want to see immediately that my partner has checked in today, so that I get a warm reason to check in myself.
6. As a partner, I want my partner's mood/energy content hidden until I complete my own Check-in (Reveal-after-you-share), so that my answer is honest rather than anchored to theirs.
7. As a partner who checked in first, I want a warm solo state ("Just you so far today") instead of a partial score or placeholder, so that my partner's absence is an absence, not a failure.
8. As a partner, I want zero reminders, nudge buttons, or "your partner is waiting" copy, so that checking in stays voluntary and pressure-free.
9. As a couple with both Check-ins recorded, I want to see our shared Reading, so that we can name how the day lands for the two of us.
10. As a partner, I want the Reading expressed in calm qualitative language with no numerals, percentages, dials, or progress visuals, so that our connection is described, never scored.
11. As a partner on a divergent day, I want "Different speeds today" rendered in the same calm palette as alignment, so that mismatch reads as weather, not as a problem to fix.
12. As a partner, I want the same two Check-ins to always produce the same Reading, so that the reading feels trustworthy rather than arbitrary.
13. As a couple, I want one Suggested shared activity alongside our Reading, so that the reading turns into a gentle invitation for tonight.
14. As a partner, I want the suggestion phrased as an invitation ("Tea on the balcony, phones inside"), never an instruction, so that it feels like an idea, not advice.
15. As a partner, I want the suggestion to be doable tonight, at home or walkable, free or near-free, and not screen-based by default, so that we can actually act on it.
16. As a partner refreshing the page, I want the same suggestion all day, so that it isn't a slot machine I'm tempted to re-roll.
17. As a partner, I want my partner's first name and the time of day reflected in how the suggestion is phrased (when the LLM is available), so that it feels written for us.
18. As a couple on a deployment with no LLM model pulled, I want a hand-written Canon suggestion indistinguishable in placement and quality from a tailored one, so that the feature is whole without AI.
19. As a partner, I want no "AI unavailable" banner, error state, or empty suggestion slot ever, so that infrastructure problems never leak into our ritual.
20. As a partner, I want my Check-in content to stay on our own deployment (local Ollama only, no cloud calls), so that how I feel is never shipped to a third party.
21. As a partner, I want the Pulse surface to show today only — no history, calendar, trend, streak, or count — so that yesterday's weather is gone and today carries no accumulated obligation.
22. As a partner, I want Pulse data kept out of statistics and every other analytics surface, so that my moods are read once and never aggregated into a leaderboard with feelings.
23. As a partner, I want the suggestion never to reference our tasks, chat, or statistics, so that the one anti-task surface never becomes chore-nagging.
24. As a partner editing my Check-in after the Reading appeared, I want the Reading to honestly reflect the current pair of Check-ins while the day's suggestion stays fixed, so that nothing visibly swaps out from under us.
25. As a keyboard or screen-reader user, I want the Check-in controls and Reading fully accessible (focus visible, labelled controls, ≥44px targets, reduced-motion respected), so that the ritual includes me.
26. As a partner on my phone at midnight-adjacent hours, I want the Pulse Day boundary computed consistently server-side, so that my Check-in lands on the day I intended.
27. As a partner, I want my Check-in saved with clear feedback and a visible error if it fails, so that I never believe I shared when I didn't.
28. As an unauthenticated visitor or script, I want every Pulse endpoint to reject me, so that the couple's moods are not readable or writable from outside.
29. As a product owner, I want any future history/trends/memories idea to require reopening ADR-0004, so that the today-only boundary can't erode through an innocuous PR.

## Implementation Decisions

### Domain model & schema

- **New `pulse_check_in` table** (Postgres, TypeORM entity like the existing task/comment entities): `id`, `userId` (FK to users), `pulseDay` (DATE), `mood`, `energy`, `createdAt`, `updatedAt`, with a **unique constraint on `(userId, pulseDay)`** — the schema itself enforces "one Check-in per partner per Pulse Day". Writes are upserts against today's row; rows for past Pulse Days are never updatable.
- **New `pulse_day` table — the stored-suggestion requirement**: one row per Pulse Day, created when the second Check-in lands. Columns: `pulseDay` (DATE, unique), **`suggestionText` (the stored suggestion — generated once, then read forever)**, `suggestionSource` (`llm` | `canon`, server-side provenance only), `canonEntryId` (which Curated Canon entry the suggestion traces to), `readingAtGeneration` (provenance snapshot), `generatedAt`. The page renders the stored `suggestionText`; there is **no on-request generation endpoint** and no regeneration path.
- `suggestionSource` and `canonEntryId` are **never serialized to the client** — exposing the source would announce degradation, which ADR-0004 forbids.
- **Retention:** Check-in and pulse_day rows are retained after rollover but never surfaced (data fact, not product feature, per the grill). No delete-on-rollover job.
- **Mood and energy are small fixed enumerated vocabularies** (qualitative labels, stored as strings). The exact label sets are a copy deliverable authored together with the Curated Canon and frozen in code with the rule table. No numeric encoding is ever exposed.

### Pulse Day & time

- The Pulse Day for any request is computed **server-side** from a **deployment-configured timezone** (env var with a sane default). Single-tenant per ADR-0003 makes one timezone per deployment correct. Never compare a UTC-parsed date against local midnight (the BUG-05 lesson).
- "Editable until the day ends" is enforced server-side: the write endpoint only ever operates on the current Pulse Day, so past days are immutable by construction.

### Sync Score & Reading

- A **deterministic, pure, in-code rule table** maps the unordered pair of (mood, energy) Check-ins to a Reading — same house pattern as the anomaly service's feature-based verdict. The table is **total** (every combination maps to exactly one Reading) and **symmetric** (the Reading does not depend on which partner is which).
- The Reading shown on the surface is **computed live** from the current pair of Check-ins on every read, never persisted as the authoritative value. If a partner edits a Check-in after both landed, the Reading honestly recomputes; the stored suggestion stands (generated once per Pulse Day — regenerating would visibly swap content the couple may be acting on). `readingAtGeneration` records what the suggestion was keyed to. *(Derived decision — consistent with both grilled rules; see Further Notes.)*
- The LLM never computes or influences the Reading.

### API surface

- A new backend **Pulse module** exposing **REST only** (no GraphQL resolvers — keep the recently-guarded GraphQL surface from growing), guarded with the standard guard stack (auth + permissions) like every other controller.
- **`GET` today's Pulse state** returns, for the calling partner: their own Check-in (if any), the *fact* of the partner's Check-in (always), the partner's mood/energy *content only if the caller has checked in* — **Reveal-after-you-share is enforced in the service layer, not by UI hiding** — and, when both Check-ins exist, the Reading plus the stored suggestion text.
- **`PUT`/upsert today's Check-in** accepts `{ mood, energy }` validated against the fixed vocabularies (class-validator DTO, house pattern), creates or updates the caller's row for the current Pulse Day, and returns the same "today" view.
- The caller's identity comes from the authenticated request (Wave 1 identity wire) — never from the payload.

### Suggestion generation (LLM curated-picker)

- **Trigger:** generation runs server-side when the write that completes the day (the second Check-in) commits — asynchronously off the request path, with the bounded timeout of the existing Ollama client. The storage write is **conditional (only when no suggestion is stored for that Pulse Day)**, which makes generation idempotent and race-safe when both partners' Check-ins land simultaneously.
- **Curated Canon:** a static, hand-written set in code, keyed by Reading, ~6–10 entries per Reading. Entry rules (from the grill): doable tonight, at home or walkable, free or near-free, no purchases, no screens-by-default, phrased as an invitation, never an instruction. **The Canon is a first-class deliverable on the critical path** — on a deployment with no model pulled, it is all anyone ever sees.
- **Deterministic Canon pick:** the fallback selection is a stable function of (Pulse Day, Reading) — e.g. a date-keyed index into that Reading's entries — so the fallback and any repair path can never disagree about which entry today gets.
- **LLM job (the only one):** pick the best-fitting candidate from the Canon entries for the computed Reading and rephrase it warmly. Prompt inputs, exhaustively: both Check-ins, the Reading, both first names, local time-of-day and day-of-week, and the candidate entries for that Reading. **Nothing else — no task data, no chat data, no statistics, ever.** Prompt discipline mirrors the anomaly service: explicit rules, priority order, "respond ONLY with JSON".
- **Defensive validation of LLM output:** must parse as JSON, must reference a candidate from the supplied set (traceability), rephrased text under a hard length cap, and **no digits** (mechanical enforcement of the no-numerals surface boundary; Canon entries are written digit-free). Anything malformed → store the deterministic Canon pick directly.
- **Invisible degradation:** if the client reports unavailable, the call fails, times out, or fails validation → the Canon pick is stored as the suggestion. Same column, same rendering, no banner, no error state, no empty slot, no retry loop. If Ollama recovers later, today's stored suggestion stands.
- **Lazy repair:** if a read finds both Check-ins but no stored suggestion (e.g. crash between commit and generation), the read path stores the deterministic Canon pick (same conditional write) and returns it — the suggestion slot can never be empty on a completed day.
- **Ollama client extraction:** the existing injectable, health-checked, JSON-mode Ollama client moves out of the logging module into a shared AI module; the anomaly service and the Pulse module both inject it (ADR-0004 consequence). No new AI dependency, no cloud calls.

### Frontend

- The placeholder Pulse page (and its CR-05 "Gold challenge" copy) is replaced by the real surface, which renders exactly four states from the "today" view: (a) you haven't checked in, partner hasn't — Check-in form; (b) you haven't, partner has — Check-in form plus the *fact* of their Check-in, content hidden; (c) you have, partner hasn't — your editable Check-in plus the warm solo state ("Just you so far today"); (d) both — both Check-ins revealed, Reading leading, suggestion beneath.
- Mood/energy options render as large tappable choices (≥44px targets), brand tokens only, calm palette throughout — **no red→green semantic ramp, no error styling on divergent Readings, no numerals anywhere, and the word "Score" never appears next to anything countable** (the UI leads with the Reading text; "Sync Score" stays a product/code/doc term).
- No nudge affordances of any kind: no reminder button, no push, no waiting copy.
- Data flows over the existing authenticated REST client (cookies included). No new WebSocket events in v1; the view refetches after the user submits and on window focus. A partner's Check-in appearing on next focus is acceptable for a once-a-day ritual.
- Accessibility per the redesign baseline: visible focus, labelled controls, semantic headings, `prefers-reduced-motion` respected, 12px text floor.

### Boundaries (hard, from ADR-0004 — restated because they must survive implementation)

- No Pulse data in statistics or any analytics surface; the statistics module gains no dependency on Pulse storage.
- No task, chat, or statistics data in the Pulse LLM prompt.
- No numerals, trends, streaks, history, or counts on the Pulse surface.
- No nudge states anywhere in Pulse.
- Any history/trends/memories feature must reopen ADR-0004 first.

## Testing Decisions

Good tests here assert **external behavior at the highest existing seams** — API responses, rendered states, stored rows — never internals like which private method computed a Reading.

- **Service seam (primary):** Pulse service specs with mocked repositories, the house pattern from the existing tasks service specs. Covers: upsert semantics and the one-per-partner-per-Pulse-Day constraint, edit-until-rollover enforcement, Reveal-after-you-share (the partner's content absent from the view until the caller checks in; the *fact* always present), solo state (no Sync Score on one-sided days), and suggestion generation triggering exactly once.
- **Ollama client injection seam:** the client is injectable by design — mock it to drive every degradation path (unavailable, HTTP error, timeout, unparseable JSON, output that fails candidate-tracing/length/digit validation) and assert the stored suggestion falls back to the deterministic Canon pick with **no observable difference in the API response shape**. Also assert Check-in/reveal/Reading behavior is byte-identical with the client absent (the LLM-has-one-job rule).
- **Pure rule table:** exhaustive table tests — every (mood × energy)² combination yields exactly one Reading, and the mapping is symmetric under partner swap. Prior art: this is a pure function, like the validation logic already unit-tested in the frontend.
- **Deterministic Canon pick:** same (Pulse Day, Reading) → same entry, across repeated calls and across the fallback and lazy-repair paths.
- **Controller/guard seam:** every Pulse endpoint rejects unauthenticated callers — prior art: the resolver-security and generator-controller specs written for SEC-01/SEC-05.
- **Race test:** two "second Check-in" writes landing concurrently produce exactly one stored suggestion (conditional-write guard).
- **Frontend unit seam:** the four-state view derivation tested as pure logic, prior art the existing reducer/validation unit tests.
- **Frontend e2e (one happy path):** Playwright, prior art the existing tasks e2e spec — partner A checks in and sees the solo state; partner B checks in and both see the Reading and one suggestion; a reload shows the same suggestion.
- **Firewall guard:** a test asserting the statistics responses contain no Pulse-derived fields (the cheapest mechanical tripwire for the statistics firewall).

No new seams are proposed; the injectable Ollama client and the service/controller layers are the highest seams available and they cover everything above.

## Out of Scope

- **Wave 1–4 work** — this PRD does not start the build; tokens, identity wire, and the signature features precede it in the sequencing.
- **History, trends, calendars, streaks, memories** — banned; reopening requires ADR-0004, with product-owner sign-off.
- **Any statistics integration** — the firewall is absolute.
- **Nudges, reminders, notifications, push** — in any form.
- **Re-roll / regenerate / "try another suggestion"** — explicitly a pressure mechanic.
- **GraphQL exposure of Pulse** — REST only.
- **Realtime Pulse WebSocket events** — refetch-on-focus is enough for a daily ritual; revisit only if real usage demands it.
- **Multi-tenancy concerns** — single-tenant per ADR-0003.
- **Cloud or non-Ollama LLM providers** — on-box only.
- **Free-form text check-ins / journaling** — a Check-in is not a message or journal entry.

## Further Notes

- **Derived (not grilled) defaults in this PRD**, flagged for cheap veto rather than silent embedding: (1) Reading recomputes live if a Check-in is edited after both landed, while the day's stored suggestion stands; (2) LLM output validation rejects digits outright; (3) Pulse Day timezone is a per-deployment env setting; (4) the Reading rule table is symmetric under partner swap; (5) mood/energy vocabularies are finalized as a copy deliverable alongside the Curated Canon. All five follow the letter or spirit of ADR-0004; none contradict a grilled decision.
- **Critical-path content deliverables:** the Curated Canon (~6–10 hand-written entries per Reading), the Reading vocabulary, and the mood/energy label sets. These are product copy, not filler — schedule them like code.
- **Copy review:** every user-facing string on this surface should be checked against the no-pressure rules (invitation phrasing, no "Score" near countables, no waiting copy). CR-05 dies with the placeholder.
- The two pre-existing backend test failures are known and unrelated — do not chase them as regressions while building this.
