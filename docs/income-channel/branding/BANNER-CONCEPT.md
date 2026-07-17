# Banner Concept — @DigitalNomadTech

## Specifications

- **Dimensions:** 320×320 px (square, Telegram channel icon standard)
- **Format:** PNG with transparency support
- **Background:** Gradient overlay on a subtle grid/world-map pattern
- **Resolution:** 72 DPI sufficient for Telegram's display size

## Color Specifications

| Element | Color |
|---------|-------|
| Background gradient | `#0EA5E9` (Sky Blue) → `#6366F1` (Indigo) → `#8B5CF6` (Purple), 135° angle |
| Grid pattern overlay | `#FFFFFF` at 8% opacity |
| Globe / world icon | `#FFFFFF` solid, 60% opacity |
| Accent bar | `#10B981` (Emerald) — thin horizontal line under text |
| Text (channel name) | `#FFFFFF` bold, with `#F59E0B` (Amber) dot on the "i" of Digital |

## Layout Description

```
┌───────────────────── 320px ─────────────────────┐
│                                                 │
│   ░░░░░░░░░░░░░░░░░░░░░░  GRADIENT BACKGROUND  │
│   ░░░░░░░░░░░░░░░░░░░░░░  Sky→Indigo→Purple    │
│                                                 │
│           ╭─────────────╮                        │
│           │             │                        │
│           │   🌐       │   ← Globe icon centered│
│           │   (wired)   │     with subtle circuit│
│           │             │     lines radiating out│
│           ╰─────────────╯                        │
│                                                 │
│        D I G I T A L  N O M A D                │
│              T E C H                              │
│         ────────────                            │
│         🟢 Emerald accent bar                    │
│                                                 │
└─────────────────────────────────────────────────┘
               320px height
```

## Design Principles

1. **Minimalism over decoration.** The icon will be displayed at ~96×96 px on most screens — every detail must survive downscaling.
2. **Gradient as the hero.** The gradient carries the brand identity; no additional images needed.
3. **World/globe motif.** Represents the nomad lifestyle — universal, instantly recognizable.
4. **Circuit lines inside globe.** Bridges the tech angle subtly without overcrowding.
5. **Channel name in clean sans-serif (Inter / Montserrat).** Two-line layout: "DIGITAL NOMAD" on top, "TECH" below in a heavier weight.

## Iconography Details

- **Globe:** Wireframe style (not filled), 120 px diameter, centered
- **Circuit traces:** 3–4 lines radiating from globe edges, styled as thin white strokes (2 px wide)
- **Emerald accent bar:** 60 px wide, 4 px tall, centered below text

## Accessibility

- White-on-gradient provides ≥ 7:1 contrast ratio across the full gradient range
- No fine details smaller than 8 px at final display size
- All symbolic meaning conveyed through color + one icon — no text dependency beyond channel name
