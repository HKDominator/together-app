# Context: Together

Glossary of domain terms as the project uses them. Terms are added when they get resolved in a grilling session — absence means "not yet defined", not "doesn't exist".

## Couple Pulse

- **Check-in** — one partner's recorded mood/energy reading. Exactly one per partner per Pulse Day; editable until the day ends, then immutable. Not a message, not a journal entry.
- **Pulse Day** — the unit Couple Pulse operates on: one local calendar day. Check-ins belong to a Pulse Day; there is no free-form check-in stream. The Pulse surface shows the current Pulse Day only — past Pulse Days are never surfaced (no history, trends, or streaks), and Pulse data never feeds statistics.
- **Reveal-after-you-share** — the visibility rule for check-ins: the *fact* that your partner checked in is always visible; the *content* of their check-in is revealed only after you complete your own for that Pulse Day. Prevents anchoring and reactive mood-matching. There is no nudge, reminder, or "partner is waiting" pressure state.
- **Sync Score** — the shared mood reading produced by combining both partners' check-ins for a Pulse Day. Exists only when both check-ins exist; a one-sided day has *no* Sync Score (absence, never a zero or partial score). It is **never a numeral**: it renders as a Reading. "Sync Score" is the product/code term; the UI leads with the Reading text.
- **Reading** — one of a small fixed vocabulary of qualitative states (e.g. "In step", "Different speeds today", "Quiet day for both") that a Sync Score renders as. Weather-report language: a Reading describes the day, it cannot be improved, and a divergent Reading is not a problem state.
- **Suggested shared activity** — the single activity suggestion that accompanies a Sync Score. Generated once per Pulse Day when the second check-in lands, then fixed (no re-roll). Drawn from the Curated Canon — optionally tailored by the local LLM, which picks and phrases but never invents — and never informed by tasks, chat, or statistics.
- **Curated Canon** — the hand-written, in-code set of shared activities, keyed by Reading, that suggestions draw from. It is the guaranteed quality floor of Couple Pulse: with no LLM available, the Canon is what the couple sees.
