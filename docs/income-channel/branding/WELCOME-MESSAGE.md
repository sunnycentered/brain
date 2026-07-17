# Welcome Message — @DigitalNomadTech Bot /start Flow

**Purpose:** Auto-sent when a user triggers `/start` or joins the channel via the bot. Sets expectations, introduces the brand voice, and guides new readers to their first action.

---

## Full Welcome Text (Copy-Paste Ready)

```
🌐 _Welcome to @DigitalNomadTech!_

You just joined the home base for location-independent builders who are done trading time for money. Here we automate income, not grind hours.

—

*What's inside this channel:*

📘 Weekly playbooks — step-by-step blueprints for building passive income with tech tools

🤖 Bot & tool reviews — honest takes on no-code builders, AI agents, and automation frameworks that actually work

💼 Remote job drops — vetted listings from 20+ sources, updated daily

✈️ Nomad logistics — visas, co-working cities, tax tips for location-independent earners

—

*Get started right now:*

/start_help — See every command available
/subscribe — Choose your content feed
/pricing — View membership tiers (free + premium)
/contact — DM the team directly

—

*Pro tip:* Hit /help after you subscribe so you never miss a playbook drop. We post 3-5 times per week and never spam.

💡 Questions or topic ideas? Just type them here. We read everything.

[nomadtech.io](https://nomadtech.io)
```

---

## Command Breakdown for /start Flow

| Trigger | Action |
|---------|--------|
| `/start` | Sends welcome message above + channel intro card (image with gradient background and "Digital Nomad Tech" text overlay) |
| `/start_help` or `/help` | Sends command reference table (below) |
| `/subscribe` | Sends content feed selector with inline buttons: `📘 Playbooks`, `🤖 Bots & Tools`, `💼 Remote Jobs`, `✈️ Logistics`, `🔥 Experiments` |
| `/pricing` | Sends membership tiers card (Free → Premium → Founder) |
| `/contact` | Opens DM thread with admin @DigitalNomadTech_Bot |

---

## Command Reference Table (Sent via /help)

```
📖 *Command List — @DigitalNomadTech*

*Content Commands:*
/subscribe — Pick your content feed
/unsubscribe — Mute a category (keep the rest)
/rate [1-5] — Rate a playbook or review
/report — Flag broken links or outdated info

*Utility:*
/help — Show this command list
/pricing — View membership tiers
/contact — DM an admin
/feedback — Suggest a topic or tool to review
/suggest_bot — Recommend a bot for review

*Premium (paywall):*
/premium — Upgrade to Premium
/invites — Your invite credits (share the channel)
/referral — Get your referral link
```

---

## Brand Voice Notes

- **Tone:** Confident but not salesy. Like a senior dev explaining something over Slack — direct, useful, zero fluff.
- **Formatting:** Use Telegram MarkdownV2 (`_italics_`, `*bold*`, `[links](url)`). Avoid excessive emoji in body text; use them as visual anchors (one per section header).
- **Length:** Welcome message ≤ 1500 characters to avoid Telegram's truncation on some clients.
- **Emoji ratio:** Maximum 2 emojis per line. Never use emoji as bullet points — they should be section headers only.
