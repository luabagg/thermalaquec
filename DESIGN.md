---
version: alpha
name: Thermal
description: >
  Industrial solar and central heating brand for Southern Brazil.
  Charcoal structure, heat-orange signal, technical sans typography.
  Trust-first B2B marketing, not consumer lifestyle or AI-startup aesthetics.
colors:
  primary: "#C2410C"
  ink: "#141414"
  ink-soft: "#1F1F1F"
  chalk: "#F4F4F5"
  paper: "#FAFAFA"
  white: "#FFFFFF"
  steel: "#71717A"
  steel-dark: "#3F3F46"
  heat: "#E86F00"
  heat-deep: "#C2410C"
  heat-soft: "#FFF7ED"
  line: "#E4E4E7"
  danger: "#DC2626"
typography:
  display:
    fontFamily: Outfit
    fontSize: 3.5rem
    fontWeight: 700
    lineHeight: 1.05
    letterSpacing: "-0.03em"
  h1:
    fontFamily: Outfit
    fontSize: 3rem
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: "-0.025em"
  h2:
    fontFamily: Outfit
    fontSize: 2.25rem
    fontWeight: 650
    lineHeight: 1.15
    letterSpacing: "-0.02em"
  h3:
    fontFamily: Outfit
    fontSize: 1.5rem
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "-0.015em"
  body-lg:
    fontFamily: IBM Plex Sans
    fontSize: 1.125rem
    fontWeight: 400
    lineHeight: 1.65
    letterSpacing: "0em"
  body-md:
    fontFamily: IBM Plex Sans
    fontSize: 1rem
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: "0em"
  body-sm:
    fontFamily: IBM Plex Sans
    fontSize: 0.875rem
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "0em"
  label:
    fontFamily: IBM Plex Sans
    fontSize: 0.8125rem
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: "0.04em"
  mono:
    fontFamily: IBM Plex Mono
    fontSize: 0.875rem
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: "0em"
rounded:
  none: 0px
  sm: 4px
  md: 8px
  lg: 12px
spacing:
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 40px
  2xl: 64px
  3xl: 96px
  section: 96px
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.white}"
    rounded: "{rounded.md}"
    padding: 12px
    typography: "{typography.body-md}"
  button-primary-hover:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.white}"
  button-secondary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.white}"
    rounded: "{rounded.md}"
    padding: 12px
  button-secondary-hover:
    backgroundColor: "{colors.steel-dark}"
    textColor: "{colors.white}"
  button-ghost:
    backgroundColor: "{colors.white}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: 12px
  button-ghost-hover:
    backgroundColor: "{colors.chalk}"
    textColor: "{colors.ink}"
  button-outline:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: 12px
  input:
    backgroundColor: "{colors.white}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
  input-placeholder:
    backgroundColor: "{colors.white}"
    textColor: "{colors.steel}"
  caption:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.steel}"
  icon-accent:
    backgroundColor: "{colors.heat-soft}"
    textColor: "{colors.heat-deep}"
  divider:
    backgroundColor: "{colors.line}"
    textColor: "{colors.steel-dark}"
  form-error:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.danger}"
  nav-bar:
    backgroundColor: "{colors.ink-soft}"
    textColor: "{colors.white}"
    height: 72px
  footer:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.chalk}"
  surface-muted:
    backgroundColor: "{colors.chalk}"
    textColor: "{colors.ink}"
  surface-paper:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
  link:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.heat-deep}"
---

## Overview

**Reading this as:** redesign (overhaul) of a regional B2B industrial marketing site for Thermal (energia solar + aquecimento central), audience = homeowners, commerces, and industry buyers in RS who need competence and clarity, vibe = industrial heat / technical trust, system = custom tokens on Remix + Tailwind v3 + existing Radix/shadcn primitives.

**Brand spine preserved from the live site**

- Logo mark: near-black wordmark + heat orange (`#F07000` family)
- Chrome: sticky charcoal header/footer (`#1F1F1F`)
- Accent: orange as the only interactive signal (solar + heat, not purple)
- Photography: real installation / solar farm assets already in `/public`
- IA and routes stay stable (`/`, `/sobre`, `/produtos`, `/calculadora-solar`, `/panorama-energetico`, `/contato`)

**Dials**

| Dial | Current site | Target |
|------|--------------|--------|
| DESIGN_VARIANCE | 3 (centered, equal cards) | 5 (split heroes, asymmetric product rows) |
| MOTION_INTENSITY | 3 (basic fade / count-up) | 5 (scroll reveal, press feedback, no scroll hijack) |
| VISUAL_DENSITY | 5 | 4 (more air, shorter copy blocks) |

**What this system is not**

- Not SaaS purple gradients, glassmorphism stacks, or neon glows
- Not cream/brass lifestyle craft palette
- Not badge soup, version stamps, or decorative eyebrows on every section
- Not Inter / Roboto / Arial defaults

## Colors

Evolve the existing CSS tokens; do not invent a second brand.

| Token | Hex | Role |
|-------|-----|------|
| `primary` | `#C2410C` | Canonical CTA / focus (alias of `heat-deep`) |
| `ink` | `#141414` | Page text, strong surfaces |
| `ink-soft` | `#1F1F1F` | Header / footer (current chrome) |
| `paper` | `#FAFAFA` | Default page ground (cool, not cream) |
| `chalk` | `#F4F4F5` | Alternating section ground (`secondary`) |
| `heat` | `#E86F00` | Brand signal: icons, rules (closer to logo `#F07000`) |
| `heat-deep` | `#C2410C` | Deep heat for text links and outlines |
| `heat-soft` | `#FFF7ED` | Soft tint behind product highlights |
| `steel` | `#71717A` | Secondary body / captions |
| `line` | `#E4E4E7` | Hairline borders |

Rules:

1. One accent family: heat orange. No blue, purple, or teal CTAs.
2. Neutrals stay cool zinc, not warm beige.
3. Dark photo bands (stats, team) keep charcoal scrim + white type; do not flip random mid-page themes without a photo reason.
4. Replace raw `bg-gray-800` / `bg-primary` scatter with these tokens.

Mapped HSL for Tailwind/`tailwind.css` (approx):

```css
--background: 0 0% 98%;           /* paper */
--foreground: 0 0% 8%;            /* ink */
--primary: 24 96% 40%;            /* heat-deep CTAs */
--primary-foreground: 0 0% 100%;
--secondary: 240 5% 96%;          /* chalk */
--muted-foreground: 240 4% 46%;   /* steel */
--ring: 24 96% 40%;
--radius: 0.5rem;                 /* 8px = rounded.md */
```

Keep a separate utility `text-heat` / `bg-heat` for the brighter brand orange on icons and underlines where large text contrast is not required.

## Typography

Current site uses the browser default stack. That is the biggest visual gap.

| Role | Family | Why |
|------|--------|-----|
| Display / H1–H3 | **Outfit** | Geometric industrial sans; strong at large sizes; not Inter |
| Body / UI | **IBM Plex Sans** | Engineered, readable, fits engineering firm |
| Specs / phone / CRT | **IBM Plex Mono** | Tabular technical data only |

Load via `@fontsource` (self-hosted). Do not hot-link Google Fonts in production.

Rules:

- Headlines: sentence case preferred over ALL CAPS. Current hero ALL CAPS stays optional only for one short line; prefer weight + tracking over shouting.
- Body max measure: ~65ch.
- Display tracking: tight (`-0.02em` to `-0.03em`). Labels: slight positive tracking, sentence case (not all-caps eyebrows by default).
- Max **1** small uppercase micro-label per 3 sections.
- No em-dash (`—`) in UI copy. Use hyphen or restructure.
- No serif. No Fraunces / Instrument Serif.

## Layout

- Container: `max-w-screen-xl` (already in use) + horizontal `px-4 md:px-6`
- Section vertical rhythm: `py-16 md:py-24` baseline; hero uses `min-h-[100dvh]` (never `h-screen`)
- Nav height: **72px** max (today 96px / `h-24` is too tall)
- Prefer CSS Grid over flex percentage math
- Homepage section layout families (no two adjacent sections share the same family):
  1. Asymmetric split hero (copy left, photo full-bleed)
  2. Full-width solid CTA band (calculadora)
  3. Split about (image + text, no 3-card expertise row as equal siblings)
  4. Stats on photo (keep, tighten copy)
  5. Horizontal mission strip (not 4 equal icon columns forever)
  6. Product feature row (asymmetric / 2+1, not 3 identical cards only)
  7. Differentials as list or 2-col, not Lucide-icon card trinity

## Elevation & Depth

- Default: flat surfaces + spacing. Cards only when the product or form needs a contained interactive surface.
- Shadows: rare, tinted toward ink (`rgba(20,20,20,0.12)`), never pure black glow.
- Photo sections: real image + dark gradient scrim (`from-black/80`). No mesh gradient blobs.
- Optional fixed grain overlay at ~3% opacity for photo bands only if it does not hurt mobile FPS.

## Shapes

- Global radius: **8px** (`rounded.md`). Buttons, inputs, images share this.
- No pill CTAs. No `rounded-full` badges.
- Product images: same 8–12px radius, consistent aspect ratio per listing.

## Components

**Button**

- Primary: `heat-deep` fill, white label, one-line label, press `scale-[0.98]`
- Secondary: `ink` fill for dark-band CTAs when orange would clash with photo orange
- Ghost / outline: ink border on paper; white border on dark photo
- Never purple. Never `bg-primary` without checking contrast of the resolved token

**Header**

- Sticky `ink-soft`, logo left, single-line nav, active link = white + underline offset
- Mobile: existing Sheet pattern, keep

**Footer**

- `ink` ground, fewer columns of noise, keep Absolar cert + contact + responsible engineer
- Social icons steel → white on hover

**Forms**

- Labels above inputs, IBM Plex Sans, focus ring `heat-deep`
- Placeholders steel, never used as labels

**WhatsApp FAB**

- Keep; color is product green (platform), not brand accent

## Do's and Don'ts

**Do**

- Lead with concrete claims (anos, placas, NRs, engenharia própria)
- Use existing photography from `/public`
- Shorten corporate fluff; rewrite grammar issues in About copy
- One primary CTA intent per viewport ("Calcular economia" vs "Falar no WhatsApp" are different intents)

**Don't**

- Purple / violet buttons or gradients
- Decorative badges, "New", version chips, scroll cues
- Three equal feature cards as the default section
- Eyebrow labels on every heading
- Em-dashes, fake-precise stats, "elevate / seamless / next-gen" copy
- Inter, system-ui as the design face
- Mid-page random light↔dark flips without photo justification
