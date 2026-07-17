# Bot Icon Concept — @DigitalNomadTech Bot

**Purpose:** Visual concept description for the Telegram bot's profile image. Must match channel branding gradient, globe/circuit motif, and professional aesthetic.

---

## Specifications

| Property | Value |
|----------|-------|
| **Dimensions** | 640×640 px (Telegram minimum display is 200×200) |
| **Format** | PNG with transparency support |
| **Background** | Gradient: `#0EA5E9` → `#6366F1` → `#8B5CF6` (135°) |
| **Foreground** | White (`#FFFFFF`) globe + circuit icon, 70% opacity |
| **Style** | Flat/minimalist, no shadows or gradients on the icon itself |
| **File size target** | < 500 KB for fast Telegram loading |

---

## Design Description

### Background
Full-square gradient overlay (`#0EA5E9` → `#6366F1` → `#8B5CF6`) at 135° angle. This matches the channel banner exactly for brand consistency across all touchpoints.

### Central Icon — Globe with Circuit Traces

```
          ╭──────────╮
         │   ╱  ╲    │
         │  ╱ ○ ╲   │     ← Wireframe globe (not filled)
         │ ╱  ╳  ╲  │       Hollow center, circle outline only
         │ ╱ ╱│╲ ╲ │       Horizontal + vertical meridian lines
         │ ╱  ╳  ╲  │       Inner X cross-hatch for "tech" feel
         │  ╲ ○ ╱   │
         │   ╲__╱    │
         ╰──────────╯
```

**Globe details:**
- Wireframe style: circle outline + horizontal equator line + vertical meridian line + inner diagonal cross (X)
- Not a filled/solid globe — wireframe communicates "tech" over "travel"
- Diameter: ~400 px at full resolution (~70% of canvas width)

**Circuit traces radiating from globe:**
- 4 thin lines extending outward from globe edges (N, S, E, W directions)
- Line style: `#FFFFFF` at 70% opacity, 3 px wide at source tapering to 2 px at endpoints
- Each trace ends with a small circle "node" (`#FFFFFF`, 8 px diameter)
- Total of 4 traces + 4 nodes = subtle tech motif without overwhelming the globe

### Text Overlay (Optional — for non-bot contexts)
For contexts outside Telegram bot profile (banner, covers, etc.): Add channel name below the globe. For the **bot icon specifically**, NO text — Telegram displays bot names separately. The icon should be readable at 200×200 px and even 96×96 px without any text dependency.

---

## Variants for Different Use Cases

| Variant | When to Use | Differences |
|---------|------------|-------------|
| **Primary Bot Icon** | Telegram bot profile image | Gradient BG + globe only, no text overlay |
| **Banner Icon** | Channel banner/icon replacement | Same globe but with "DIGITAL NOMAD TECH" text below |
| **Minimal** | Tiny display contexts (< 48 px) | Globe simplified to single circle outline, remove circuit traces |

---

## Accessibility & Legibility

- White-on-gradient provides ≥ 7:1 contrast ratio across all gradient zones
- Globe wireframe has minimum 12 px stroke width at final bot display size
- Circuit nodes (end circles) are large enough to be visible even at Telegram's smallest icon renderings
- No text dependency — the globe + circuit motif is sufficient for brand recognition

---

## Implementation Notes

- **Vector source recommended:** SVG → export to PNG at 640×640 px ensures crisp scaling across all display sizes
- **Color consistency:** Use exact hex values from COLOR-PALETTE.md for gradient stops
- **File naming:** `bot-icon-primary.png`, `bot-icon-minimal.png` (for the variant table above)
