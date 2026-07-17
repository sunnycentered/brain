# Packaging Instructions — Digital Nomad Tech Stack Starter Pack

**Date:** 2026-07-16  
**Author:** Sun Centgered  
**Purpose:** Step-by-step instructions for packaging the product and hosting on Gumroad.

---

## File Structure Overview

```
starter-pack/
├── PDF-GUIDE.md              # Complete 35-page guide content (source for PDF generation)
├── NOTION-TEMPLATE.md        # Notion template documentation with schema
├── sales-page.md             # Sales page copy for Gumroad product page
├── preview-sample.md         # Free preview (first 3 pages) for trust-building
└── packaging-instructions.md # This file — how to assemble and deploy
```

---

## Step 1: Generate the PDF Guide

### Option A: Using Pandoc (Recommended)

1. **Install Pandoc** (if not already installed):
   ```bash
   # Windows (chocolatey)
   choco install pandoc
   
   # macOS (brew)
   brew install pandoc
   ```

2. **Generate PDF from markdown:**
   ```bash
   pandoc PDF-GUIDE.md \
     -o "Digital-Nomad-Tech-Stack-Starter-Pack.pdf" \
     --pdf-engine=xelatex \
     -V geometry:margin=1in \
     -V documentclass=report \
     -V fontsize=12pt \
     --number-sections \
     -H header.tex \
     -B footer.tex
   ```

3. **Install a TeX distribution** (required for PDF generation):
   - Windows: [MiKTeX](https://miktex.org/download) — lightweight installer
   - macOS: `brew install --cask mactex`
   - Ubuntu/Debian: `sudo apt-get install texlive-xetex texlive-fonts-recommended`

### Option B: Using Markdown to PDF Online

If you don't want to install TeX/Pandoc:

1. Go to [md2pdf.com](https://md2pdf.com) or [dillinger.io](https://dilliner.io)
2. Copy the entire content of `PDF-GUIDE.md`
3. Click "Export as PDF"
4. Review the output for formatting accuracy

### Option C: Using a Design Tool (For Best Visuals)

1. Create a new document in **Canva** or **Figma**
2. Use a clean, modern template (search "ebook template")
3. Copy content from `PDF-GUIDE.md` page by page
4. Add cover design, section dividers, tool screenshots, tables
5. Export as PDF

> 💡 For the best visual result, use Option C. The marketing quality matters on Gumroad — a well-designed PDF converts significantly better than a plain text export.

---

## Step 2: Create the Notion Template File

The Notion template is delivered as an HTML file (`.html`) that Notion can import.

1. **Create `notion-template.html`:**
   - Use [Notion's official HTML export format](https://developers.notion.com/docs/working-with-files-and-media)
   - Structure the HTML with the linked databases defined in `NOTION-TEMPLATE.md`
   - Include all pre-loaded data rows from the sample tables

2. **Host the template file:**
   ```bash
   # Upload to your hosting (or Gumroad files section)
   # The file will be delivered as a download after purchase
   ```

3. **Alternative: Create a live Notion template link**
   - Build the template directly in your Notion workspace
   - Share as a "template link" (Notion → Share → "Share as template link")
   - Include this link on your Gumroad product page and in delivery emails

> 🎯 **Recommended approach:** Create the live Notion template link. It's simpler, always up-to-date, and customers get instant access without downloading files. Put the live link on Gumroad's product description + in an automated Gumroad delivery email.

---

## Step 3: Package for Gumroad Upload

### Required Files for Gumroad Product Page:

| File | Format | Size Estimate | Purpose |
|------|--------|--------------|---------|
| `Digital-Nomad-Tech-Stack-Starter-Pack.pdf` | PDF | 5–10 MB | Primary product — the guide |
| `notion-template.html` or template link | HTML / URL | — | Notion workspace template (Premium + Bundle) |
| `preview-sample.md` rendered as PDF | PDF | ~1 MB | Free sample for Gumroad preview section |

### Gumroad Upload Steps:

1. **Go to [Gumroad.com](https://gumroad.com)** and log in (or create account)

2. **Click "New Product"**

3. **Fill in product details:**
   - **Product name:** Digital Nomad Tech Stack Starter Pack
   - **Subtitle:** The complete guide to setting up your nomad tech stack — VPN, internet, banking, productivity, security
   - **Description:** Paste the full sales page copy from `sales-page.md`
   - **Price set your own price** → set minimum at $19 (Basic tier)

4. **Upload files:**
   - Primary file: `Digital-Nomad-Tech-Stack-Starter-Pack.pdf`
   - Secondary file (Premium + Bundle): Notion template HTML or link
   - Preview sample PDF (for Gumroad's preview feature)

5. **Set up tiers using Gumroad's "Variants" feature:**
   ```
   Variant 1: Basic ($19) — PDF guide only
   Variant 2: Premium ($39) — PDF + Notion template
   Variant 3: Bundle ($59) — All above + Discord invite link + future updates
   ```

6. **Configure delivery message:**
   ```markdown
   Thank you for purchasing the Digital Nomad Tech Stack Starter Pack! 🎉

   Here's what you get:
   
   ✅ PDF Guide (download below)
   ✅ Notion Template [click here to duplicate](LINK_HERE)
   ✅ Preview sample of the full guide
   
   To get started:
   1. Read pages 1–3 of the PDF first
   2. Follow the Quick Setup Checklist on page 4
   3. Watch the setup walkthrough videos (links in Chapter 1)
   
   Questions? Reply to this email or join our Discord (Bundle tier).
   
   — Sun, creator of the Digital Nomad Tech Stack Starter Pack
   ```

7. **Set up Gumroad analytics:**
   - Enable product page views tracking (built into Gumroad)
   - Track conversion rate (visitors → buyers)
   - Monitor refund requests in the dashboard
   - Set up email automation for delivery confirmations

---

## Step 4: Preview/Sample Setup on Gumroad

1. In your Gumroad product editor, scroll to the **"Preview"** section
2. Upload `preview-sample.pdf` (rendered from `preview-sample.md`)
3. Enable "Allow preview" — this shows potential buyers the first 3 pages
4. The preview should include:
   - Cover page with full title
   - "Why This Guide Exists" introduction
   - Quick Start Checklist with specific time estimates
   - Sneak peek table of contents for the remaining sections
   - Savings calculator showing real dollar amounts
   - Call to action at the bottom

> 🎯 The preview is your #1 conversion tool. It should be compelling enough that buyers want the rest immediately. Include specific tool names, prices, and savings — not vague descriptions.

---

## Step 5: Affiliate Links Integration

### Where to Place Affiliate Links:

| Location | Tool | Link Format |
|----------|------|-------------|
| PDF Guide Chapter 1.2 | Airalo eSIM | `https://www.airalo.com/?referral=YOUR_CODE` |
| PDF Guide Chapter 3.6 | ExpressVPN | `https://www.expressvpn.com/?r=coupon&cs=YOUR_CODE` |
| PDF Guide Section 4 | Wise | `https://wise.com/invite/u/suncentgered` |
| PDF Guide Section 2.1 (Hardware) | Anker PowerCore | Amazon Associates link with tag |
| PDF Guide Section 3.4 | 1Password | `https://lp.1password.com/affiliates?a=YOUR_CODE` |
| PDF Guide Section 5.1 | Surfshark | Affiliate partner network link |
| Gumroad sales page footer | All tools | Summary table with all discount links |

### How to Get Affiliate Links:

| Program | Signup URL | Approval Time | Commission Rate |
|---------|-----------|---------------|-----------------|
| **ExpressVPN** | expressvpn.com/affiliates | Instant | Up to 30% recurring |
| **Airalo** | affiliates.airalo.com | 1–3 days | 5–15% per sale |
| **Wise** | wise.com/referral-program | Instant | $15–$25 per referral |
| **Amazon Associates** | affiliate-program.amazon.com | 1 day | 3–10% on hardware |
| **1Password** | lp.1password.com/affiliates | Instant | Up to 20% recurring |
| **Surfshark** | partners.surfshark.com | 1–5 days | Up to 30% |
| **Notion** | notion.so/affiliate-program | Instant | Up to 30% recurring |

---

## Step 6: Final Checklist Before Launching on Gumroad

- [ ] PDF guide fully reviewed for accuracy (tool prices, links, setup steps current as of July 2026)
- [ ] Notion template tested end-to-end (duplicate works correctly, all databases load with data)
- [ ] Preview sample renders properly in Gumroad's preview player
- [ ] Sales page copy pasted into Gumroad product description
- [ ] Three pricing tiers configured as variants
- [ ] Affiliate links verified and working (test each one)
- [ ] Delivery email drafted and set up in Gumroad settings
- [ ] Refund policy stated clearly (30-day full refund)
- [ ] All images/screenshot descriptions in PDF are clear for non-rendered formats
- [ ] Social proof/testimonial placeholders ready for first customer reviews
- [ ] Analytics integration confirmed (Gumroad dashboard + custom tracking via productAnalytics.js)

---

## Hosting Links Summary

| Asset | Where It Lives | How Customer Accesses |
|-------|---------------|----------------------|
| PDF Guide | Gumroad file upload (primary product file) | Download after purchase on Gumroad |
| Notion Template | Live link in Gumroad delivery email + product description | Click duplicate link from Gumroad page |
| Preview Sample | Gumroad preview section (uploaded as separate file) | Free preview before purchase |
| Sales Page Copy | Written content — pasted into Gumroad product description | Read on the Gumroad product page |
| Pricing Config | `config/product-pricing.yaml` (internal reference) | Maps to Gumroad variant prices |

---

## Post-Launch Monitoring

After launching on Gumroad:

1. **Day 1–3:** Monitor first purchases, check delivery emails arrive correctly
2. **Week 1:** Request first customer reviews/testimonials from early buyers
3. **Week 2:** Update affiliate link performance dashboard (track which links get most clicks)
4. **Month 1:** Review Gumroad analytics — conversion rate, refund rate, revenue per tier
5. **Ongoing:** Add new tool recommendations quarterly; update pricing annually

---

*© 2026 Digital Nomad Tech Stack Starter Pack by Sun Centgered.*
