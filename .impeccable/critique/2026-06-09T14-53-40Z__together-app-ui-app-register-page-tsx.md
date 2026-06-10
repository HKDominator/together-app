---
timestamp: 2026-06-09T14-53-40Z
slug: together-app-ui-app-register-page-tsx
---
## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Loading state on button; inline errors on submit. No real-time validation; no success state before redirect. |
| 2 | Match System / Real World | 3 | Natural language overall. "Security PIN (optional — enables 3FA)" is unexplained jargon. |
| 3 | User Control and Freedom | 3 | Can navigate to /login. No path back to landing or home. |
| 4 | Consistency and Standards | 2 | h3 for primary heading. Inline style= on button. cr and cr-pale are undefined tokens. |
| 5 | Error Prevention | 3 | Client-side validation; clears errors on change. No show/hide password toggle. Requirements hidden until error. |
| 6 | Recognition Rather Than Recall | 3 | Fields labeled and placeheld. No tooltip for PIN purpose or 3FA concept. |
| 7 | Flexibility and Efficiency | 2 | No keyboard shortcuts. autocomplete attributes not set. Optional PIN cannot be skipped visually. |
| 8 | Aesthetic and Minimalist Design | 2 | Rose-amber gradient panel is dating-app pink and off-brand. Zero brand personality. SaaS copy noise. |
| 9 | Error Recovery | 3 | Specific inline errors. role=alert. Server error in banner. Raw Error.message may be technical. |
| 10 | Help and Documentation | 1 | No contextual help. No PIN explanation. Password requirements invisible until error. |
| Total | | 25/40 | Acceptable — significant improvements needed |

## Anti-Patterns Verdict

LLM: The register page is the most AI-generated-looking surface in the app. Split-panel layout with gradient-left/form-right is the most common AI auth page template. The rose-to-amber gradient is dating-app pink — a direct PRODUCT.md anti-reference violation. "No credit card needed" is SaaS template copy that makes no sense for this product. Zero of the "Two of Us" north star is present.

Detector: 0 findings. Slop is structural/strategic, not pattern-level.

## Priority Issues

[P1] Left panel rose-amber gradient — dating-app pink, explicit PRODUCT.md anti-reference. Replace with brand-committed content: Slate Void background, heart logo, positioning line, partner context.

[P1] Zero brand identity — "Create your account" + "No credit card needed" is generic SaaS template. Needs heading that names the product premise and sub-copy that removes the pricing anxiety artifact.

[P1] h3 as page title (should be h1) + focus:ring-cr-pale and text-cr are undefined tokens, breaking focus rings and link color for keyboard/screen reader users.

[P2] Security PIN field: "3FA" jargon in label, wrong disclosure timing. Should be collapsed by default with helper text.

[P2] Token Law violations: style={{ background: '#C0392B' }} on button; cr, cr-pale, cr-deep, sl, cm, cm-pale, font-display all undefined in globals.css.

## Persona Red Flags

Jordan: No product name or context visible. "No credit card needed" creates pricing confusion. "3FA" jargon on optional PIN field creates abandonment risk.

Sam: h3 heading is semantically incorrect (no parent h1). text-cr undefined = link has no color distinction. focus:ring-cr-pale undefined = no visible focus ring.

The Couple (project-specific): Nothing on this page communicates Together is for two people. No mention of a partner, shared space, or what happens after registration. The relationship — the core product premise — is absent from the first conversion moment.
