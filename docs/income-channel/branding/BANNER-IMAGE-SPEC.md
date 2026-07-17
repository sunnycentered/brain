# Banner Image — Pixel-Perfect Generation Specs

**Purpose:** Ready-to-hand-off specifications for generating the @DigitalNomadTech channel banner/icon image via any AI image generator (Midjourney, DALL-E, Stable Diffusion, etc.) or vector design tool.

---

## Canvas Setup

| Property | Value |
|----------|-------|
| Dimensions | 320×320 px (Telegram standard icon size) |
| Background | Transparent at final stage — gradient fills entire square |
| Color profile | sRGB IEC61966-2.1 |
| DPI/PPI | 72 (screen-only; export as PNG for Telegram) |
| File format (source) | SVG → export to PNG 320×320 @ 2x (640×640 px) for crisp rendering |

---

## AI Image Generator Prompt (DALL-E / Midjourney / SDXL)

### Primary Prompt

```
A square icon at 320x320 pixels. Minimalist wireframe globe centered on the canvas, approximately 180px in diameter. The globe is drawn with thin white lines (stroke width: 3px on a 640px canvas), showing latitude and longitude meridian lines crossing through a hollow center — not filled. Four circuit-board-style traces extend outward from the globe edges toward the corners of the image, each ending in a small solid white dot node (8px diameter on 640px canvas). The entire background is a smooth linear gradient running from top-left to bottom-right at 135 degrees: #0EA5E9 (sky blue) → #6366F1 (indigo) → #8B5CF6 (purple). No text, no drop shadows, no gradients on the icon elements themselves — pure flat vector style. Clean tech aesthetic, high contrast white-on-color, suitable for display at very small sizes.
```

### Alternative Prompt (more descriptive for DALL-E 3)

```
Create a professional technology-themed icon that is exactly 320x320 pixels with these exact specifications:

BACKGROUND: A full-square gradient from #0EA5E9 (a bright sky blue) in the upper-left corner, transitioning through #6366F1 (a vivid indigo) in the center, to #8B5CF6 (a rich purple) in the lower-right corner. The gradient angle is 135 degrees (top-left to bottom-right).

CENTER ELEMENT: A wireframe globe (not a filled/solid sphere) drawn with thin white lines. The globe should be approximately 170px in diameter, perfectly centered on the canvas. It should show horizontal and vertical meridian lines crossing through its center like an old-world map projection, plus two diagonal lines forming an X shape through the center — giving it a tech/circuit-board feel. The globe outline itself is a simple circle with these internal cross-lines only — no shading, no 3D effects.

CIRCUIT TRACES: Four white circuit-board traces extending from each cardinal point (N, S, E, W) of the globe outward toward the edges of the image. Each trace follows a right-angle path (like PCB routing), is 2px wide on the source canvas, and terminates in a small filled white circle node (6-8px diameter at full resolution).

STYLE: Pure flat vector, no shadows, no glows, no text, no gradients on any element other than the background. High contrast white-on-color for maximum readability at tiny sizes like 48x48px or smaller.

APPEARANCE: Professional, modern, tech-forward. Think "system icon" meets "tech startup logo." Clean enough to work as both a Telegram channel icon and a brand mark on dark backgrounds.
```

---

## Vector (SVG) Layout Coordinates — Reference for Manual Design

> Use these coordinates when designing in Figma, Illustrator, or Inkscape. Canvas is 640×640 px; scale down to 320×320 for Telegram upload.

### Globe
- **Center:** cx=320, cy=320
- **Radius:** 170px (diameter 340px)
- **Stroke:** #FFFFFF, width: 3px (source), round linecaps/linejoins
- **Meridian lines:** horizontal at cy=320 spanning cx±170; vertical at cx=320 spanning cy±170
- **Diagonal X:** from corner to corner within the globe boundary

### Circuit Traces (4 total)
| Trace | Path (on 640px canvas) | Node position |
|-------|----------------------|---------------|
| North | M 320,150 L 320,80 L 310,70 | Circle at cx=310, cy=70, r=4 |
| South | M 320,490 L 320,560 L 310,570 | Circle at cx=310, cy=570, r=4 |
| East | M 490,320 L 560,320 L 570,310 | Circle at cx=570, cy=310, r=4 |
| West | M 150,320 L 80,320 L 70,310 | Circle at cx=70, cy=310, r=4 |

### Gradient Definition (SVG `<linearGradient>`)
```xml
<linearGradient id="brand-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
  <stop offset="0%"   stop-color="#0EA5E9"/>
  <stop offset="50%"  stop-color="#6366F1"/>
  <stop offset="100%" stop-color="#8B5CF6"/>
</linearGradient>
```

---

## Quality Checklist Before Publishing to Telegram

- [ ] Image is exactly 320×320 px at final upload size
- [ ] File size ≤ 500 KB (Telegram bot icon limit: 1 MB; channel icon recommended < 200 KB)
- [ ] All edges are clean — no anti-aliasing artifacts on globe wireframe
- [ ] Colors match hex codes EXACTLY (verified in design tool)
- [ ] Globe is centered with ≤2px tolerance
- [ ] No text present on bot icon version
- [ ] Tested at 96×96 px display size — globe wireframe still legible
- [ ] Tested at 48×48 px — gradient and circle are distinguishable

---

## Export Settings

| Tool | Format | Size | Quality | Notes |
|------|--------|------|---------|-------|
| Figma / Illustrator | PNG | 640×640 (2x) | Lossless | Upload 320×320 equivalent to Telegram |
| Midjourney | PNG | 1024×1024 → crop center 320×320 | Default | Use `--v 6 --style raw` for precision |
| DALL-E 3 | PNG | Request custom size via API or post-process | Lossless | May require manual cropping to exact square |
| Inkscape | SVG + PNG | SVG source → export PNG at 320×320 @72 | Lossless | Best quality — vector-based, infinite scaling |

---

## Bot Icon Variant — SVG Code Location

See file: `BOT-ICON-SVG.svg` in this directory for the complete ready-to-export SVG source code.

---

*Last updated: July 2026 | Generated from BANNER-CONCEPT.md + BOT-ICON-CONCEPT.md specs*
