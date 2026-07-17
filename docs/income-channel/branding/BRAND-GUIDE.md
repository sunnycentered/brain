# Brand Guide — @DigitalNomadTech Telegram Channel

**Version:** 1.0 | **Last Updated:** July 2026 | **Channel:** @DigitalNomadTech

This master document consolidates ALL branding decisions for the Digital Nomad Tech Stack channel. Use it as a single source of truth for anyone creating content, design assets, or copy for the channel.

---

## Table of Contents

1. [Brand Essence](#1-brand-essence)
2. [Color System](#2-color-system)
3. [Typography](#3-typography)
4. [Emoji Guidelines](#4-emoji-guidelines)
5. [Tone & Voice Rules](#5-tone--voice-rules)
6. [Post Format Templates](#6-post-format-templates)
7. [Formatting Standards (MarkdownV2)](#7-formatting-standards-markdownv2)
8. [Hashtag Strategy](#8-hashtag-strategy)
9. [Content Categories](#9-content-categories)
10. [File Reference Index](#10-file-reference-index)

---

## 1. Brand Essence

| Attribute | Value |
|-----------|-------|
| **Name** | Digital Nomad Tech Stack |
| **Handle** | @DigitalNomadTech |
| **Positioning** | Honest, no-nonsense tech tools and income systems for location-independent builders |
| **Anti-position** | Anti-guru, anti-fluff, anti-aspirational BS |
| **Audience** | Remote workers, developers, creators, entrepreneurs building passive income with technology |
| **Brand Personality** | Direct, technical, experienced, skeptical of hype, transparent about failures |
| **Tagline (implicit)** | Real math, not aspirational math |

---

## 2. Color System

### Primary Palette

| Role | Light Mode Hex | Dark Mode Hex | Name | Usage |
|------|---------------|--------------|------|-------|
| **Primary Accent** | `#0EA5E9` | `#38BDF8` | Sky Blue | Links, CTAs, bot highlights, @ mentions |
| **Secondary Accent** | `#6366F1` | `#818CF8` | Indigo | Tags, sub-headings, decorative elements |
| **Success / Action** | `#10B981` | `#34D399` | Emerald | Checkmarks, "go live", confirmations |
| **Warning** | `#F59E0B` | `#FBBF24` | Amber (Amber dot on "i" of Digital in branding) | ⚠️ sponsored content markers, warnings |

### Background Palette

| Role | Light Mode Hex | Dark Mode Hex | Usage |
|------|---------------|--------------|-------|
| **Canvas** | `#FFFFFF` | `#0F172A` | Message body background |
| **Surface** | `#F8FAFC` | `#1E293B` | Card containers, banners |
| **Overlay** | `#E2E8F0` | `#334155` | Dividers, borders, separators |

### Text Colors

| Role | Light Mode Hex | Dark Mode Hex | Usage |
|------|---------------|--------------|-------|
| **Heading** | `#0F172A` | `#F1F5F9` | Post titles, channel name |
| **Body** | `#334155` | `#CBD5E1` | Main message text |
| **Muted** | `#64748B` | `#94A3B8` | Secondary info, timestamps |

### Gradient

```
Linear gradient (135°): #0EA5E9 → #6366F1 → #8B5CF6
Labels: Sky Blue → Indigo → Purple
```

**Usage rules:**
- Use on **all** channel banners, bot profile images, and post cover cards
- Gradient must be 135° (top-left to bottom-right) — never horizontal or vertical
- Do NOT add secondary gradients or shadows to gradient elements
- For Telegram dark mode, the gradient remains the same — only text overlay colors adjust

### Emoji Color Mapping

| Emoji | Suggested Hex Match | Context |
|-------|-------------------|---------|
| 🌐 | `#0EA5E9` (Sky Blue) | Global, internet, connectivity |
| 🚀 | `#6366F1` (Indigo) | Launch, growth, opportunity |
| 💻 | `#10B981` (Emerald) | Tech, coding, development |
| ✈️ | `#F59E0B` (Amber) | Travel, nomad lifestyle |
| 🔗 | `#0EA5E9` (Sky Blue) | Links, integrations, bot commands |

---

## 3. Typography

### Font Recommendations

Since Telegram does not support custom fonts, these are recommendations for **banner images, post covers, and external design assets**:

| Asset Type | Recommended Font | Fallback | Weight |
|-----------|-----------------|----------|--------|
| Channel banner / icon text | Inter | Montserrat | Bold (700) |
| Post cover titles | Inter Tight | Roboto | SemiBold (600) |
| Body copy on images | Inter | Helvetica Neue | Regular (400) |
| Monospace elements | JetBrains Mono | Consolas | Regular |

### Telegram MarkdownV2 Formatting

Within channel messages, use these built-in formatting options:

| Effect | Syntax | Example |
|--------|--------|---------|
| **Bold** | `*text*` | `*passive income with tech tools*` |
| _Italic_ | `_text_` | `_step-by-step blueprints_` |
| [Link](url) | `[text](URL)` | `[nomadtech.io](https://nomadtech.io)` |
| ~Strikethrough~ | `~text~` | Use sparingly — for price comparisons |
| 📦 Monospace block | Triple backtick code block | For code snippets, setup commands |

### Text Sizing Rules for Images

| Element | Size on 320px canvas | Size on 640px canvas |
|---------|---------------------|----------------------|
| Header text | 36px | 72px |
| Sub-header / tagline | 20px | 40px |
| Body copy (if needed) | 14px | 28px |
| Caption / footer | 11px | 22px |

**Never embed channel name text inside the bot profile icon** — Telegram displays the bot name separately. Only include text in banner/icon designs for the channel profile picture, not the bot profile image.

---

## 4. Emoji Guidelines

### Approved Emoji Set

Only these emojis may be used on-brand:

| Emoji | Meaning | When to Use |
|-------|---------|-------------|
| 🌐 | Global / internet / connectivity | Channel identity, intro/outro lines |
| 🚀 | Launch / growth / opportunity | Section headers for new content types |
| 💻 | Tech / coding / development | Tool reviews, tech tips |
| ✈️ | Travel / nomad lifestyle | Logistics posts, location-independent topics |
| 🔗 | Links / integrations / bot commands | CTA lines with URLs |
| 💡 | Tip / idea / utility | Pro tips, quick wins |
| 📘 | Playbook / learning content | Playbook post headers, weekly schedule |
| 🤖 | Bot / AI / automation | Bot/tool review headers |
| 💼 | Remote job / career | Job listing headers |
| 🔥 | Hot take / experiment | Experiment and contrarian post headers |
| ✅ | Positive / verified / confirmed | Bullet points for "what you get" |
| ❌ | Negative / rejected / warning | Bullet points for "what you don't get" |
| ⚠️ | Sponsored / paid content disclosure | Mandatory on any sponsored post |

### Rules

1. **Maximum 2 emojis per line.** This is the hard rule. Section headers may use one emoji at the start of a line. Body text should not include emojis unless they serve as inline emphasis (max 1 per line in body text).
2. **Emojis as section headers only.** Use one emoji followed by a bold heading: `📘 *Playbook Preview*`. Never use emoji as bullet points replacing standard markdown bullets (`-` or numbers).
3. **Consistency matters.** Each content type gets its canonical emoji (📘 for playbooks, 🤖 for tool reviews, etc.). Never swap them arbitrarily.
4. **No emotional filler emojis.** No 👏 🎉 😍 💪 🙌 — these undermine the professional, technical tone.
5. **The globe (🌐) is the brand emoji.** Use it in channel intros, welcomes, and identity statements. It's your visual shorthand.

---

## 5. Tone & Voice Rules

### Core Principles

| Rule | Do | Don't |
|------|----|-------|
| **Be direct** | "Here's exactly how to build an affiliate site in 30 days" | "Today I want to share my amazing journey of building an affiliate site which is absolutely life-changing 🙌" |
| **Show failures** | "My AI wrapper died after OpenAI changed pricing. Here's what happened" | Only post wins and success screenshots |
| **Use real numbers with timestamps** | "$4,800/month in March 2026, after 3 months, minus $12 server costs" | Income screenshots without date context or revenue ranges without breakdowns |
| **Be skeptical of hype** | "Everyone says X is great. I tested it for 2 weeks. Here's why it won't work for you" | Parrot tool marketing copy verbatim |
| **Address the reader as a peer** | "You need to pick your niche first, not after you've built" | "Dear fellow travelers on the digital nomad adventure!" |

### Voice Spectrum

```
Too casual:          "Hey guys! 👋 Let me tell you something wild about affiliate marketing..."
✅ BRAND VOICE:     "Here's how to build an affiliate site in 30 days. No fluff."
Too formal:         "The present document elucidates the methodology requisite for establishing a monetizable content infrastructure..."
```

### What to Avoid (Anti-Guru Signals)

- ❌ FOMO urgency ("Don't miss out!", "Act now!")
- ❌ Fake scarcity ("Only 3 spots left!")
- ❌ Lifestyle flexing (beach photos, Lambos, yachts — unless directly relevant to income systems)
- ❌ Inspirational BS without actionable content
- ❌ Course upsells in every post
- ❌ Testimonials without verifiable context
- ❌ Exclamation points as punctuation style (use them sparingly for emphasis only)

---

## 6. Post Format Templates

### Template A: Tech Tip (Quick Value)

**Purpose:** Bite-sized actionable tip, high frequency content | **Length:** 100-250 words | **Cadence:** 2-3x/week

```
💻 *Tip #[number]: [What This Teaches]*

[One-line hook: What problem does this solve?]

[Body: The actual tip. Step-by-step if needed. Use code blocks for commands.]

---

*Why it works:* [Brief explanation of the mechanism]

*Next time we'll cover:* [Tease related content to keep readers engaged]

[nomadtech.io](https://nomadtech.io)
#DigitalNomad #TechTools #[niche-specific-tag]
```

**Emoji:** 💻 (always start with this emoji on the first line)
**Formatting:** Code blocks for any commands, URLs, or config snippets
**CTA:** None required unless teasing next post — subtle is fine

---

### Template B: Tool Review (In-Depth Analysis)

**Purpose:** Comprehensive evaluation of a tech tool | **Length:** 400-800 words | **Cadence:** 2x/week

```
🤖 *[Tool Name] Review: [Honest Verdict]*

[One-line summary: Should you use this or skip it? Be direct.]

*What It Does:* [2-3 sentence capability overview — no marketing copy]

*The Good:*
- [Strength 1 with real metric if possible]
- [Strength 2]
- [Strength 3]

*The Bad:*
- [Weakness 1 — be specific, include what you tried]
- [Weakness 2]

*Alternatives to Consider:*
- [Alternative 1 + why it's different]
- [Alternative 2]

*My Rating:* X/10 — [one-sentence justification]

*Best for:* [who should use this, who should skip]

[nomadtech.io](https://nomadtech.io)
#TechTools #RemoteWork #[tool-category] #[ToolName]
```

**Emoji:** 🤖 (always start with this emoji on the first line)
**Mandatory:** Include at least one weakness — never a 10/10 review without scrutiny
**CTA:** "Try it and let me know your experience" or "DM @[handle] if you want help setting it up"

---

### Template C: Deal Drop (Urgent Opportunity)

**Purpose:** Time-sensitive pricing or opportunity alert | **Length:** 50-150 words | **Cadence:** As-needed

```
🚀 *Deal Drop: [Product/Tool] — [Discount Amount/Type]*

[What's on sale, where, and for how long — right in the first line.]

*Regular price:* $X → *Now:* $Y ([Z]% off)
*Link:* [URL]
*Expires:* [Date/time or "no expiration"]

*[One sentence on whether this is genuinely worth it]*

[nomadtech.io](https://nomadtech.io)
#DealDrop #TechTools #PassiveIncome
```

**Emoji:** 🚀 (always start with this emoji)
**Mandatory fields:** Regular price, current price, expiry, honest assessment sentence
**CTA:** "Grab it while it lasts" or "Worth it if you need [specific use case]"

---

### Template D: Resource Roundup (Curated List)

**Purpose:** Collection of useful resources on a theme | **Length:** 300-600 words | **Cadence:** Bi-weekly / monthly

```
📦 *Resource Roundup: [Theme] — X Tools Worth Knowing*

[One-line hook. What problem does this collection solve?]

1️⃣ *[Tool/Resource #1]* — One-liner description. [Link]
   - Why: [Specific value, not generic]

2️⃣ *[Tool/Resource #2]* — One-liner description. [Link]
   - Why: [Specific value]

3️⃣ *[Tool/Resource #3]* — One-liner description. [Link]
   - Why: [Specific value]

[Add more as needed — 5-8 is ideal range]

*My pick for beginners:* #[number] — [one-line reason]
*Skip if you already use:* #[number] — [brief note]

[nomadtech.io](https://nomadtech.io)
#ResourceRoundup #TechTools #DigitalNomad #[theme-tag]
```

**Emoji:** 📦 (always start with this emoji on the first line)
**Format:** Numbered list, each item has one-liner + link + why-line
**CTA:** "Which one did you already know about? Reply below" or "Suggest additions via /feedback"

---

### Template E: Playbook (Deep-Dive Blueprint)

**Purpose:** Step-by-step income blueprint | **Length:** 800-1500 words | **Cadence:** 1x/week (Wednesdays)

```
📘 *Playbook #[number]: [Title] — Build [Result] in [Timeframe]*

[Hook: What you'll build + why it matters + realistic timeline. No hype.]

---

## Prerequisites

- [What you need before starting: skills, tools, capital]

## Step 1: [Action Name] ([Time Estimate])

[Detailed instructions. Use code blocks for commands/URLs/configs.]

*Expected result:* [What the reader should see/have after completing this step]

## Step 2: [Action Name] ([Time Estimate])

[Instructions...]

*Expected result:* [...]

[Continue for all steps — typically 5-8 steps per playbook]

---

## Timeline & Expectations

| Milestone | When to Expect It | What Success Looks Like |
|-----------|------------------|------------------------|
| [Milestone 1] | Week X | [Specific metric] |
| [Milestone 2] | Week X | [...] |

*Realistic note:* [Honest caveat about timelines, common pitfalls, or things that take longer than expected]

## Next Steps

What to do after completing this playbook:
1. [Step 1]
2. [Step 2]

*Next week's playbook:* [Teaser title + one-line what you'll learn]

[nomadtech.io](https://nomadtech.io)
#Playbook #PassiveIncome #DigitalNomad #[niche-tag] /subscribe to get all playbooks
```

**Emoji:** 📘 (always start with this emoji on the first line)
**Mandatory:** Realistic timeline table, honest caveats section, clear prerequisites
**CTA:** Subscribe CTA + tease next week's topic

---

### Template F: Hot Take / Position Statement

**Purpose:** Contrarian opinion or brand stance | **Length:** 300-700 words | **Cadence:** As-needed

```
🔥 *[Headline: A clear, debatable statement about the industry/niche]*

[Opening paragraph that states the contrarian position upfront — no hedging.]

*Why Everyone Gets It Wrong:*
- [Point 1 — what the common advice is and why it's flawed]
- [Point 2 — with reasoning]

*What Actually Works:*
- [Point 1 — your alternative approach]
- [Point 2 — with supporting evidence or experience]

*Bottom line:* [One-sentence summary that readers will remember and potentially quote]

[nomadtech.io](https://nomadtech.io)
#HotTake #DigitalNomad #RealTalk #[topic-tag]
```

**Emoji:** 🔥 (always start with this emoji on the first line)
**Mandatory:** Must include at least one piece of evidence or personal experience to ground the opinion
**CTA:** "Agree or disagree? Reply below" — designed to generate discussion and engagement

---

### Template G: Roadmap / What's Coming

**Purpose:** Content preview and community engagement | **Length:** 300-700 words | **Cadence:** As-needed (e.g., post-launch, quarterly refreshes)

```
🚀 *What's Next at @DigitalNomadTech*

[Opening: What phase the channel is in, what's changing.]

## Confirmed Content Queue

1. **[Topic #1]** — When it drops + one-line teaser
2. **[Topic #2]** — When it drops + one-line teaser
3. **[Topic #3]** — When it drops + one-line teaser

## What I Want Your Input On

- [Question 1 about upcoming content direction]
- [Question 2]

*Reply with your priorities or use /feedback to suggest topics.*

[nomadtech.io](https://nomadtech.io)
#Roadmap #DigitalNomadTech #Community #[phase-tag] /subscribe if you haven't already
```

**Emoji:** 🚀 (always start with this emoji on the first line)
**CTA:** Direct ask for community input — makes readers feel ownership over content direction

---

## 7. Formatting Standards (MarkdownV2)

### Telegram MarkdownV2 Quick Reference

| Element | Syntax | Notes |
|---------|--------|-------|
| Bold | `*text*` | Most common — use for emphasis, headings within text |
| Italic | `_text_` | Use sparingly — prefer bold for emphasis |
| Link | `[label](URL)` | Always include in every post's last line |
| Inline code | `` `code` `` | For single-word commands or variable names |
| Code block | Triple backtick (```) | For multi-line code, config, setup steps |
| Spoiler | `||text||` | Rare — use for hiding spoilers in deal posts if needed |

### Escape Characters in MarkdownV2

When text contains these characters, escape them with `\`:

`\`, `-`, `.`, `!`, `_`, `*`, `[`, `]`, `(`, `)`, `~`, `` ` ``, `>`, `#`, `+`, `-`, `=`, `|`, `{`, `}`, `,`

**Critical:** URLs and text within links (`[text](url)`) do NOT need additional escaping beyond what's required. However, if a link URL contains parentheses or brackets, they must be escaped: `[Name](https://example.com/path\?query\=value)`

### Post Structure Rules

1. **Every post ends with:** `[nomadtech.io](https://nomadtech.io)`
2. **Hashtags are the second-to-last line** (or alongside URL if space is tight)
3. **Separate content sections with `---` horizontal rules** — never with excessive blank lines
4. **Use numbered lists for steps, emoji-numbered lists for resource roundups only**
5. **Tables:** Use Telegram's markdown table syntax (`| col | col |`) for any data that needs tabular display — they render in HTML parse mode

### Character Count Limits to Respect

| Element | Limit |
|---------|-------|
| Bio | 160 characters (hard limit) |
| Message body | No hard limit, but aim for < 4000 chars for readability on mobile |
| Title / caption overlay text on images | Keep under 250 chars for legibility at small sizes |
| Hashtags per post | 3-5 recommended max — don't keyword-stuff |

---

## 8. Hashtag Strategy

### Permanent Hashtag Set (Always Available)

| Hashtag | Frequency of Use | Content Type |
|---------|-----------------|-------------|
| `#DigitalNomad` | Every post (if length permits) | Universal |
| `#RemoteWork` | Every post (if length permits) | Universal |
| `#PassiveIncome` | Every playbook and resource post | Income-focused content |
| `#TechTools` | Every tool review and tip post | Tech-focused content |
| `#SideHustle` | As needed, not every post | General income content |

### Rotational Hashtags (Use Based on Content)

| Hashtag | Use When |
|---------|----------|
| `#AItools` | AI tool reviews or tips |
| `#Playbook` | Playbook posts |
| `#DealDrop` | Deal drops |
| `#ResourceRoundup` | Resource roundups |
| `#HotTake` | Hot take / position posts |
| `#AffiliateMarketing` | Affiliate content deep-dives |
| `#SaaS` | SaaS tool reviews or builds |
| `#RealTalk` | Anti-guru, honest stance posts |
| `#Roadmap` | What's coming / roadmap posts |

### Rules for Hashtag Usage

1. **Maximum 5 hashtags per post** — the permanent set can be all used if relevant, but don't force irrelevant ones
2. **Hashtags go at the very end of the message**, after the URL line is acceptable for space-constrained posts
3. **Never hashtag words within body text** — only standalone hashtags at the end
4. **Channel-specific tags** (`#DigitalNomadTech`) are optional and reserved for roadmap/community-building posts

---

## 9. Content Categories (Quick Reference)

| Category | Emoji | Cadence | Template | Color Accent |
|----------|-------|---------|----------|-------------|
| Playbooks | 📘 | 1x/week (Wed) | Template E | `#10B981` Emerald |
| Bot & Tool Reviews | 🤖 | 2x/week (Mon, Thu) | Template B | `#6366F1` Indigo |
| Remote Job Drops | 💼 | Daily | Template A (condensed) | `#0EA5E9` Sky Blue |
| Nomad Logistics | ✈️ | Biweekly (Sun) | Template A or D | `#F59E0B` Amber |
| Hot Takes / Experiments | 🔥 | Monthly/As-needed | Template F | Varies by context |
| Deal Drops | 🚀 | As-needed | Template C | `#6366F1` Indigo |
| Resource Roundups | 📦 | Biweekly/Monthly | Template D | `#0EA5E9` Sky Blue |

---

## 10. File Reference Index

### Branding Files (Source of Truth)

| File | Purpose |
|------|---------|
| [COLOR-PALETTE.md](COLOR-PALETTE.md) | Full color palette with hex values, light/dark modes, gradient specs |
| [BANNER-CONCEPT.md](BANNER-CONCEPT.md) | Channel icon/banner visual concept description |
| [BANNER-IMAGE-SPEC.md](BANNER-IMAGE-SPEC.md) | Pixel-perfect AI image generation prompt + SVG coordinates |
| [BOT-ICON-CONCEPT.md](BOT-ICON-CONCEPT.md) | Bot profile image specification |
| [BOT-ICON-SVG.svg](BOT-ICON-SVG.svg) | Complete ready-to-export SVG code for bot icon |
| [BIO-VARIATIONS.md](BIO-VARIATIONS.md) | 8 Telegram bio options (all verified ≤160 chars) |
| PINNED-POST.md | Full pinned message text |
| WELCOME-MESSAGE.md | Bot /start welcome flow + command reference |

### Starter Series Posts (Channel Launch Content)

| File | Topic | Category |
|------|-------|----------|
| starter-series/post-1.md | Origin story — why this channel exists | 🔥 Experiment / Launch |
| starter-series/post-2.md | Income Stack framework (3 levels) | 📘 Playbook Preview |
| starter-series/post-3.md | Anti-guru stance | 🔥 Hot Take |
| starter-series/post-4.md | First playbook preview (affiliate site in 30 days) | 📘 Playbook Teaser |
| starter-series/post-5.md | Roadmap + engagement guide | 🚀 Roadmap / Invitation |

### Master Index

| File | Description |
|------|-------------|
| INDEX.md | Complete file tree and publishing order for all branding assets |

---

## Appendices

### Appendix A: Gradient Definition (Copy-Paste)

**SVG `<linearGradient>`:**
```xml
<linearGradient id="brand-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
  <stop offset="0%"   stop-color="#0EA5E9"/>
  <stop offset="50%"  stop-color="#6366F1"/>
  <stop offset="100%" stop-color="#8B5CF6"/>
</linearGradient>
```

**CSS:**
```css
background: linear-gradient(135deg, #0EA5E9 0%, #6366F1 50%, #8B5CF6 100%);
```

**Tailwind (closest equivalent):**
```
bg-gradient-to-br from-sky-400 via-indigo-500 to-purple-500
```

### Appendix B: SVG Bot Icon Coordinates Reference

| Element | Position (cx, cy) | Size |
|---------|-------------------|------|
| Globe center | 320, 320 | r=170 |
| North trace end | 308, 63 | r=7 node |
| South trace end | 308, 577 | r=7 node |
| East trace end | 577, 308 | r=7 node |
| West trace end | 63, 308 | r=7 node |

### Appendix C: Brand Dos & Don'ts Quick Card

**✅ ALWAYS:**
- Use exact hex values from COLOR-PALETTE.md
- Keep emojis ≤2 per line, as section headers only
- End every post with nomadtech.io link
- Include real numbers with timestamps in income-related content
- Show failures alongside successes
- Use MarkdownV2 formatting consistently

**❌ NEVER:**
- Add text to the bot profile icon
- Use emotional filler emojis (👏 🎉 😍 💪)
- Post aspirational screenshots without context
- Use more than 5 hashtags per post
- Embed code in backtick blocks unless it's actual code/config
- Write guru-style motivational content

---

*This document is the single source of truth for all @DigitalNomadTech branding. If any file conflicts with this guide, update the file to match.*

**Version history:**
- v1.0 (July 2026) — Initial creation, consolidating all existing branding docs
