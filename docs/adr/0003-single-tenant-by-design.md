# ADR-0003: Single-tenant, permission-based authorization is deliberate

- **Status:** Accepted
- **Date:** 2026-06-10
- **Backlog:** SEC-18

## Context

The security review noted that authorization is permission-based, not ownership-scoped: any authenticated user with the right permission can act on any task/comment. There is no tenancy boundary. For a multi-tenant product this would be a critical flaw; for one couple sharing one workspace it matches the product exactly — both partners share everything by design.

## Decision

Together is **single-tenant: one couple per deployment**. Authorization stays permission-based (RBAC via guards), with no workspace/ownership scoping layer. This is a recorded product constraint, not an oversight.

## Consequences

- No tenancy-scoping work is scheduled; SEC-18 is closed as "by design".
- **Hard guardrail:** if the product ever hosts more than one couple, every read/write path becomes a cross-tenant leak. Any multi-tenant move requires a new ADR that supersedes this one *before* any code, covering workspace scoping of tasks, comments, chat rooms, presence, stats, and admin surfaces.
- Features may assume exactly two users (e.g. Couple Pulse, dual-presence, shared-progress) without generalizing for N.
- The partner connection/invite flow is deferred (FD-17, approved 2026-06-10): the couple is seeded at deployment. A self-serve invite/pairing flow implies onboarding new couples and reopens this ADR first.
