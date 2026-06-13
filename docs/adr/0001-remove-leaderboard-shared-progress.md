# ADR-0001: Remove the contribution leaderboard; statistics become a shared-progress view

- **Status:** Accepted
- **Date:** 2026-06-10
- **Backlog:** FD-03, FD-04 (also resolves CR-01 fabricated KPIs, CR-07 hardcoded legend names)

## Context

The statistics page ships a Contribution Ranking leaderboard (medals, stars, per-partner ranking) and hero-metric stat cards with fabricated analytics ("+12%", "Balanced"). PRODUCT.md names gamification and competitive framing as anti-references; DESIGN.md bans streaks, progress rings, and completion-percentage banners. A leaderboard between two partners turns coordination into scorekeeping — the opposite of "does this feel accompanied?".

## Decision

Remove the Contribution Ranking leaderboard outright. No replacement ranking, medal, score, or per-person comparison of any kind.

Replace the hero-metric stat cards with a **shared-progress view**: a 2-person-aware summary framed as "what we moved together" — shared completions, what's in motion, what's waiting — never as a comparison of one partner against the other. All numbers come from real data; fabricated placeholder analytics are removed, and partner names come from the actual users.

## Consequences

- The statistics surface is rebuilt, not patched (sequenced in Wave 4 of REDESIGN-PLAN.md).
- Any future metric proposal must pass the test: does it read as *ours*, or does it rank one partner? Ranked framing is rejected by default.
- CR-01 and CR-07 are subsumed by the rebuild and need no standalone fix.
