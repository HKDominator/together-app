---
target: auth
total_score: 18
p0_count: 1
p1_count: 2
timestamp: 2026-06-09T15-12-36Z
slug: together-app-ui-app-login-page-tsx
---
## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 2 | Loading state on button only. No step progress in the 3-step login. |
| 2 | Match System / Real World | 2 | "Final step" implies 2 steps when there are 3. "Verification code" vs "6-digit code" inconsistency. |
| 3 | User Control and Freedom | 2 | Back from OTP to password. No back from PIN step — user is trapped. 1.5s auto-redirect on reset. |
| 4 | Consistency and Standards | 2 | Login/register use split layout; forgot/reset use centered layout. h3 on every page. Token Law violated on every button. |
| 5 | Error Prevention | 2 | Try/catch on all forms. Demo credentials always visible. devOtp/devCode no NODE_ENV guard. |
| 6 | Recognition Rather Than Recall | 2 | Fields labeled. 3-step flow requires mental model with no visual guide. No remember-device. |
| 7 | Flexibility and Efficiency | 1 | No shortcuts. No remember-me. Daily 3FA friction. PIN step is a dead end. |
| 8 | Aesthetic and Minimalist Design | 2 | Demo credentials block is noise. Empty rose-amber gradient panel. Emoji heading. |
| 9 | Error Recovery | 2 | Errors displayed. Raw Error.message may surface technical strings. No retry count for OTP. |
| 10 | Help and Documentation | 1 | Nothing. No OTP explanation. No step count. Demo credentials are ironically the only contextual info. |
| Total | | 18/40 | Poor — core experience needs significant work before shipping |

## Anti-Patterns Verdict

LLM: Login page is structurally identical to the register page — same empty rose-amber gradient left panel, same h3 font-display heading, same inline style button. Demo credentials block makes the login look like a public demo environment. The auth flow could belong to any SaaS product. Zero "Two of Us" north star presence.

Detector: 0 findings across all 3 auth pages. Problems are structural/strategic, not pattern-detectable.

## Priority Issues

[P0] Demo credentials visible in production UI — hardcoded email/password/PIN shown unconditionally to all visitors. Signals "demo environment" not "our private space." Any visitor can log in. Fix: gate behind process.env.NODE_ENV === 'development'. Same fix for devOtp/devCode banners.

[P1] No step progress in 3-step login — users navigate password → OTP → PIN with no step indicator, no context for why each step exists, no total step count shown. First-time users will think something is wrong after the password step triggers a new form.

[P1] PIN step has no back button — user is trapped. OTP step has "← Back" but PIN step does not. Only option from a wrong PIN is a hard page refresh.

[P2] Left panel rose-amber gradient — same dating-app anti-reference violation as the register page. Empty and purposeless on both login and register.

[P2] Layout inconsistency across auth flow — login/register use split two-column layout; forgot-password/reset-password use centered single-column. Clicking "Forgot password?" from login changes the visual language.

[P2] Token Law violations — style={{ background: '#C0392B' }} on all 4 auth page buttons. text-cr (undefined token) on all auth links — may render without color.

## Persona Red Flags

Jordan: Sees demo credentials block and is confused. Encounters OTP step with no context. Encounters PIN step without having set up a PIN during registration. Trapped with no back button. High abandonment risk at PIN.

Sam: h3 heading (no parent h1) — broken structure. Screen reader reads demo credentials block. No aria-live on step transitions — new form loads silently. focus:ring-cr-pale undefined — no visible focus ring. text-cr undefined — links have no color distinction.

The Couple (daily returning user): Full 3FA every morning with no remember-device. Login page with demo credentials every time. The app that should feel like coming home treats every login like the first one.
