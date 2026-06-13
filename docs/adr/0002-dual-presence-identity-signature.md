# ADR-0002: Dual-presence + the mine/theirs identity layer are the signature build

- **Status:** Accepted
- **Date:** 2026-06-10
- **Backlog:** FD-05, FD-06 (depends on the Wave 1 identity wire: BUG-02/03/17/18/19; and on SEC-04 authenticated WebSockets, already fixed)

## Context

DESIGN.md's north star is "The Two of Us": the partner's live state visible and felt across surfaces is the one gesture a single-user tool cannot copy. Today it is a stub — the presence dot is always offline, `currentUser` is `users[0]` rather than the authenticated user, and tasks/comments cannot tell "mine" from "theirs". The app currently reads as a generic workspace with two seats.

## Decision

Build dual-presence and the mine/theirs identity layer **together, as one feature** — presence without identity (or identity without presence) is half a feature and neither delivers the signature.

- **Dual-presence (FD-06):** real server-side presence over the authenticated sockets; sidebar presence dot, inline partner bubble on task rows being viewed/edited live, quiet co-presence indicator in modals, the chat header (partner's name + presence dot, per approved FD-12), and the warm completion moment when the partner is online — per DESIGN.md §5 (Signature Component) and the bounded delight inventory.
- **Mine/theirs (FD-05):** tasks and comments are framed by the authenticated relationship — partner awareness in lists, correct authorship, edit/delete affordances keyed to the real user.

Prerequisite: the Wave 1 identity wire (thread the authenticated user from AuthContext/JWT into creation paths and "mine" checks), which resolves BUG-02, BUG-03, BUG-17, BUG-18, BUG-19 in one fix.

## Consequences

- Sequenced as Wave 4 in REDESIGN-PLAN.md; Wave 1 must land first.
- Presence is understated by design — it signals without demanding acknowledgment; no notification or nag states may be attached to it.
- Server-side presence state becomes a new backend concern on the existing authenticated gateways (no new transport).
