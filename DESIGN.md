---
name: Together
description: Private shared workspace for two partners — plan, track, and build a shared life.
colors:
  cr: "#C0392B"
  cr-deep: "#9B2D22"
  cr-pale: "#FAF0EE"
  sl: "#1A2535"
  sl-muted: "#4D6A80"
  sl-dim: "#8FA5B8"
  cm: "#F2EAE3"
  cm-pale: "#FAF8F6"
  surface: "#FFFFFF"
  bg: "#F5F5F4"
  success: "#27AE60"
  success-pale: "#DCFCE7"
  info: "#2980B9"
  info-pale: "#DBEAFE"
  warning: "#E67E22"
  warning-pale: "#FEF3C6"
  danger: "#DC2626"
  danger-pale: "#FFE2E2"
typography:
  display:
    fontFamily: "Geist, var(--font-geist-sans), ui-sans-serif, sans-serif"
    fontSize: "clamp(1.875rem, 4vw, 2.25rem)"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "Geist, var(--font-geist-sans), ui-sans-serif, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 700
    lineHeight: 1.25
    letterSpacing: "-0.015em"
  title:
    fontFamily: "Geist, var(--font-geist-sans), ui-sans-serif, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 600
    lineHeight: 1.375
  body:
    fontFamily: "Geist, var(--font-geist-sans), ui-sans-serif, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.625
  label:
    fontFamily: "Geist, var(--font-geist-sans), ui-sans-serif, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 600
    lineHeight: 1
    letterSpacing: "0.025em"
  mono:
    fontFamily: "Geist Mono, var(--font-geist-mono), ui-monospace, monospace"
    fontSize: "0.8125rem"
    fontWeight: 400
    lineHeight: 1.5
rounded:
  sm: "4px"
  md: "8px"
  lg: "12px"
  xl: "16px"
  "2xl": "24px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "36px"
  "2xl": "64px"
components:
  button-primary:
    backgroundColor: "{colors.cr}"
    textColor: "{colors.surface}"
    rounded: "{rounded.md}"
    padding: "10px 20px"
  button-primary-hover:
    backgroundColor: "{colors.cr-deep}"
    textColor: "{colors.surface}"
    rounded: "{rounded.md}"
    padding: "10px 20px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.sl}"
    rounded: "{rounded.md}"
    padding: "10px 20px"
  button-ghost-hover:
    backgroundColor: "{colors.cm}"
    textColor: "{colors.sl}"
    rounded: "{rounded.md}"
    padding: "10px 20px"
  input-default:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.sl}"
    rounded: "{rounded.md}"
    padding: "12px 16px"
  chip-todo:
    backgroundColor: "{colors.bg}"
    textColor: "{colors.sl-muted}"
    rounded: "{rounded.full}"
    padding: "4px 12px"
  chip-done:
    backgroundColor: "{colors.success-pale}"
    textColor: "{colors.success}"
    rounded: "{rounded.full}"
    padding: "4px 12px"
  chip-active:
    backgroundColor: "{colors.info-pale}"
    textColor: "{colors.info}"
    rounded: "{rounded.full}"
    padding: "4px 12px"
  card:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.xl}"
    padding: "20px"
---

# Design System: Together

## 1. Overview

**Creative North Star: "The Two of Us"**

Together is designed for exactly two people who know each other. The relationship is not the theme of this app — it is a first-class object in the data model and in the design. Every surface asks: does this make the partnership more visible and more felt? Not "is this productive?" but "does this feel accompanied?" The app is for a shared life in progress, not a life being marketed.

The visual system is warm and certain. The primary red is committed and specific — it is the color of the heart in the logo, the color of an action that matters to both of you, never an error color. The dark foundation grounds the sidebar and frame, lending reliability without coldness. Core task surfaces stay calm; delight is concentrated into three bounded gesture categories (completion moments, presence transitions, considered empty states) and does not leak into ambient decoration. This system rejects productivity theater: no streaks, no confetti, no nagging push states, no gamified pressure. It rejects dating-app performative warmth: no gradients, no floating hearts, no pink, no swipe conventions. It rejects cold enterprise SaaS: no dense gray token walls, no impersonal "workspace" copy, no Jira/Linear/Notion aesthetic.

The signature gesture this system makes is structurally impossible to copy with a single-user app: the partner's online state and live actions are visible and felt across surfaces. That is the "two of us" — not a theme, not a color scheme, but a design primitive that shapes every interactive surface.

**Key Characteristics:**
- Warm and certain, never loud
- One Pompeii Crimson accent per view — its rarity is the signal
- Flat at rest; lift and shadow reserved for interactive or live-shared state
- Dual-presence as a first-class design element, not a feature badge
- Craft-delight bounded to three categories only; nothing else animates
- All color values are tokens; inline style attributes are a finding to eliminate

## 2. Colors: The Pompeii Palette

A palette of committed warmth and reliable depth. The crimson is the only saturated color; everything else is a dark grounding neutral or a deliberate warm-tinted surface. Warmth is carried by hue, not by defaulting to cream.

### Primary
- **Pompeii Crimson** (`#C0392B`): The heart of the brand. Used for the primary action button, active nav indicator, focus rings, interactive links, and the logo SVG. One instance per view. Never used for error states — that is `danger` (`#DC2626`).
- **Pompeii Deep** (`#9B2D22`): Hover and active state of primary elements. Not used standalone; appears only on `:hover`/`:active` of crimson surfaces.
- **Crimson Haze** (`#FAF0EE`): Crimson at near-zero saturation, lightness ~96%. Focus ring glow, active table-row tint, chip selected-state backgrounds.

### Foundation
- **Slate Void** (`#1A2535`): Sidebar background, primary ink for dense surfaces, and the modal overlay anchor. **Replaces the current `#2C3E50` (Flat UI "wet asphalt")** — deeper and more distinctive. Also sets the `sl` token.
- **Slate Muted** (`#4D6A80`): Secondary body text, supporting copy, timestamps, breadcrumbs.
- **Slate Dim** (`#8FA5B8`): Tertiary text, placeholder copy in inputs, disabled states, decorative table column headers. Contrast against white is 2.8:1 — use only at label scale (0.75rem) or larger; never for body reading copy.

### Warm Surface
- **Cardamom** (`#F2EAE3`): A deliberate warm-tinted neutral derived from the crimson hue family. Used as hover-row background, comment bubble fill, and sidebar workspace section tint. **Replaces `#E8D5B7`**, which sits squarely in the AI-default warm-neutral band (OKLCH L ~87%, C ~0.04, H 75) — that color reads as "cream" regardless of name and must not survive into production.
- **Cardamom Pale** (`#FAF8F6`): Barely perceptible warm surface. App-shell background on deeply nested surfaces, empty-state accent backgrounds.
- **Surface** (`#FFFFFF`): Cards, modals, inputs.
- **Background** (`#F5F5F4`): App shell (stone-100). Neutral, unobtrusive.

### Semantic
- **Go Green** (`#27AE60`) / **Go Green Pale** (`#DCFCE7`): Done state chips, partner online indicator.
- **Info Blue** (`#2980B9`) / **Info Blue Pale** (`#DBEAFE`): In Progress state chips. Informational only — not brand.
- **Caution** (`#E67E22`) / **Caution Pale** (`#FEF3C6`): Pending sync, overdue flags, warnings.
- **Danger** (`#DC2626`) / **Danger Pale** (`#FFE2E2`): Destructive actions, error messages. Never confused with brand crimson.

### Named Rules
**The Token Law.** Every color in the codebase is a token class: `bg-cr`, `text-sl`, `bg-cm-pale`. Inline `style={{ background: '#C0392B' }}` is forbidden. Every existing inline color attribute in the codebase is a finding to replace. The `globals.css` `@theme inline` block is the single source of truth. Define it:

```css
@theme inline {
  --color-cr: #C0392B;
  --color-cr-deep: #9B2D22;
  --color-cr-pale: #FAF0EE;
  --color-sl: #1A2535;
  --color-sl-muted: #4D6A80;
  --color-sl-dim: #8FA5B8;
  --color-cm: #F2EAE3;
  --color-cm-pale: #FAF8F6;
  --font-display: var(--font-geist-sans);
}
```

**The One Crimson Rule.** Pompeii Crimson (`cr`) marks exactly one primary action per view. If two elements compete for crimson, one of them is wrong. The glow shadow (`0 3px 12px rgba(192,57,43,0.3)`) goes only on the primary button.

## 3. Typography

**Display Font:** Geist (via `var(--font-geist-sans)`, with `ui-sans-serif, sans-serif` fallback)
**Body Font:** Geist (same family, differentiated by weight and scale)
**Mono Font:** Geist Mono (via `var(--font-geist-mono)`, with `ui-monospace, monospace` fallback)

**Character:** Geist is geometric with humanist proportions — clear at small sizes, authoritative at display scale. One family across display, body, and UI avoids false richness through font mixing. Hierarchy is entirely through weight contrast (700 → 600 → 400) and scale. Future consideration: upgrading `--font-display` to a warmer humanist alternative (DM Sans, Instrument Sans, Plus Jakarta Sans) would shift the personality slightly more intimate without touching body copy — worth revisiting once the token system is clean.

The `font-display` token is currently undefined in the codebase (a silent Tailwind failure). It must be added to `globals.css` as `--font-display: var(--font-geist-sans)`.

### Hierarchy
- **Display** (700, clamp(1.875rem → 2.25rem), lh 1.2, ls −0.02em): Page titles and modal headings. Two per view maximum.
- **Headline** (700, 1.5rem, lh 1.25, ls −0.015em): Section headings, major card titles.
- **Title** (600, 1.125rem, lh 1.375): Sub-section labels, named group headings.
- **Body** (400, 0.875rem, lh 1.625): All body copy and data content. Apply `text-wrap: pretty` on multi-line blocks. Cap reading-surface line length at 65–75ch.
- **Label** (600, 0.75rem, lh 1, ls 0.025em): Form labels, table column headers, nav section labels. Uppercase is the only permitted use of all-caps; apply sparingly and only at label scale.
- **Mono** (400, 0.8125rem, lh 1.5): OTP codes, PIN inputs, dev-mode hints, code values.

### Named Rules
**The Weight-Contrast Rule.** Hierarchy is weight and scale, not color. Never use colored text to indicate heading level. Never bold body copy to simulate a heading.

## 4. Elevation

This system is flat by default. Surfaces at rest carry no shadow — they sit flush against the app shell. Elevation appears only in response to state: hover signals "this is actionable"; a modal's heavy blur-backdrop signals "both of you are paused here." The rationale is relational, not decorative. Lift means something is happening or about to happen between the two of you.

### Shadow Vocabulary
- **Ambient** (`0 1px 3px rgba(26,37,51,0.08), 0 1px 2px rgba(26,37,51,0.06)`): Cards that contain actionable content, resting state for stat cards. Barely perceptible; separates surface from background.
- **Lifted** (`0 8px 24px rgba(26,37,51,0.12)` + `translateY(-3px)`): Card hover state. 250ms ease-out. Communicates "this card is inviting action."
- **Dominant** (`0 20px 60px rgba(26,37,51,0.18), 0 4px 16px rgba(26,37,51,0.10)`): Modals only. Paired with `backdrop-filter: blur(4px)` on the backdrop. Communicates "the shared flow is paused; focus here."

### Named Rules
**The Flat-By-Default Rule.** New components ship without shadow. Shadow is added when a specific interactive state demands it. Never add ambient shadow "for polish."

**The One Modal Rule.** At most one element carries the Dominant shadow at a time. Nested modals are prohibited. Destructive confirmations within a modal use inline confirmation patterns, not a second modal.

## 5. Components

### Buttons
Warm and certain, never loud. One primary per view; everything else is secondary.

- **Shape:** 8px radius
- **Primary:** Pompeii Crimson background, white text, 10px 20px padding. Glow shadow (`0 3px 12px rgba(192,57,43,0.3)`). Hover: Pompeii Deep background, lifts 2px (`translateY(-2px)`), 150ms ease-out. Active: scales down 3%.
- **Ghost / Secondary:** Transparent background, Slate Void text, 1px gray-200 border. Hover: Cardamom background, gray-300 border. No glow. This is the variant for cancel, back, and supplementary actions.
- **Destructive:** Red-600 (`#DC2626`) background, white text, same shape. Used only for confirmed irreversible actions.

**The One-Glow Rule.** One primary button means one glow on any view. A second glow is a signal that the primary action hierarchy needs rethinking.

### State Chips and Priority Badges
Rounded-full pill shapes, 4px 12px padding, 0.75rem semibold text. Color pairs are semantic and non-interactive: they read state, they do not take action. No hover glow, no active state.

### Cards
- **Corner style:** 16px radius (`rounded-xl`)
- **Background:** Surface white
- **Border:** 1px gray-100 at rest
- **Shadow:** None at rest; Ambient on hover if the card is interactive; Dominant for modals
- **Padding:** 20px standard; 16px for dense data contexts

Nested cards are prohibited. A card inside a card is always a refactoring signal.

### Inputs and Fields
- **Style:** White background, 1px gray-200 border, 8px radius, 12px 16px padding
- **Focus:** Border shifts to `cr` (Pompeii Crimson), 2px ring in `cr-pale` (Crimson Haze). The focus ring is the one place `cr` appears outside the primary button.
- **Error:** Red-400 border, red-50 background, red-600 message text below the field
- **Disabled:** gray-50 background, gray-400 text, no interactive states
- **Label:** Label scale (0.75rem, semibold, tracked), gray-700

### Navigation (Sidebar)
- **Frame:** Slate Void (`#1A2535`), 240px, full height
- **Logo area:** Pompeii Crimson heart SVG + "Together" wordmark in white, font-display xl bold. Bottom border at `rgba(255,255,255,0.06)`.
- **Nav item default:** `rgba(255,255,255,0.55)` text, transparent background, 2px transparent left border
- **Nav item hover:** `rgba(255,255,255,0.75)` text, `rgba(255,255,255,0.04)` background
- **Nav item active:** white text, `rgba(192,57,43,0.15)` background, 2px Pompeii Crimson left border
- **Section label:** `rgba(255,255,255,0.3)` text, label scale. Used sparingly — "Main" and "Administration" are justified; not every group needs a label.
- **Partner presence cards:** Avatar with partner-specific color, name + role, presence dot (Go Green `#27AE60` pulsing = online; gray-500 = offline). The dot pulse is a bounded delight moment; it belongs here.

### Signature Component: Dual-Presence Indicator

The partner's live state is visible and felt across the app — this is what makes Together structurally different from every single-user task tool.

- **Sidebar:** Presence dot pulses softly when the partner is online. Green + pulse = online now. Gray = offline. 2s ease-in-out animation, no reduce-motion fallback needed as long as the state change itself is communicated through color.
- **Task rows:** A small partner avatar or initials bubble appears inline when they are viewing or editing the same task in real time.
- **Modals:** Optional quiet indicator ("Your partner is looking at this too") for co-presence on the same record.
- **Completion moment:** When a task moves to Done while the partner is online, the state-chip transition gets a warm-colored brief flash — slightly richer than the solo experience, never intrusive.

The indicator is deliberately understated. It signals presence without demanding acknowledgment.

### Delight Inventory (bounded, no additions without deliberate review)

1. **Warm completion moment:** When a task moves to Done: a 300–400ms warm-tinted scale on the state chip. If the partner is online, add a faint warm flash on the row. No confetti. No sound. No escalation.
2. **Presence transitions:** Partner online/offline state changes at 300ms ease-out (opacity + scale). The dot's appearance is itself a micro-delight; it needs nothing added.
3. **Considered empty states:** Empty task lists, first views, and offline states have personal copy. Not "No items found" — text that acknowledges the pair and the moment.

## 6. Do's and Don'ts

### Do:
- **Do** define every color in `globals.css` `@theme inline`. Use `bg-cr`, `text-sl-muted`, `bg-cm-pale` everywhere. The token is the only source of truth.
- **Do** use Pompeii Crimson for exactly one primary action per view. Ration it; its rarity is what makes it mean something.
- **Do** show partner presence on every interactive surface where it is meaningful. Dual-presence is the signature; it should be felt.
- **Do** keep the delight inventory to three categories: completion moments, presence transitions, considered empty states. New delight outside these three requires deliberate review.
- **Do** write empty states that feel personal — acknowledge the partnership and the situation, not the empty database row.
- **Do** provide `@media (prefers-reduced-motion: reduce)` alternatives for every animation. Crossfade or instant; no flash.
- **Do** verify contrast before every ship: body text ≥4.5:1 against background, large text ≥3:1. Slate Dim (`#8FA5B8`) on white is ~2.8:1 — permitted only at label scale or as decorative, never for reading copy.

### Don't:
- **Don't** use inline `style={{ background: '#C0392B' }}` or any inline color value. Audit the codebase: every inline color is a violation. Replace with the token class.
- **Don't** use `#E8D5B7` or any warm cream/sand/parchment as a surface or body background tint. It lives in the AI-default warm-neutral band. Use `cm` (`#F2EAE3`) or `cm-pale` (`#FAF8F6`) where a warm tint is needed, or white/bg for neutral surfaces.
- **Don't** place two primary buttons (two glows) on the same screen. If you are reaching for a second crimson, the hierarchy is broken.
- **Don't** add gamification: no streaks, no confetti on task completion (solo or together), no progress rings in the sidebar, no "You're on a roll!" copy, no completion percentage banners, no daily reminders.
- **Don't** use dating-app warmth conventions: no floating hearts, no rose or pink washes, no gradient fills that read as Valentine's Day, no swipe gestures or card-flip animations.
- **Don't** use cold enterprise SaaS patterns: not Jira blue (`#155dfc`) as a brand color, not information-dense tables with no breathing room, not "workspace" copy that implies an impersonal office, not the Notion/Linear/Asana aesthetic.
- **Don't** place a nested card (a card inside a card). Refactor: flat row list, section divider, or inline content block.
- **Don't** add a shadow to a new component without a named reason tied to an interactive state. Flat is the default.
- **Don't** use `border-left` greater than 1px as a colored accent stripe on cards or list items. Use a background tint, a leading avatar/icon, or nothing.
