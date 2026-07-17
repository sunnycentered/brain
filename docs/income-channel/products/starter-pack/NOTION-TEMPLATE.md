# Digital Nomad Tech Stack Starter Pack — Notion Template

**Version:** 1.0  
**Date:** 2026-07-16  
**Platform:** Notion (free account sufficient)

---

## How to Use This Template

This template gives you a complete workspace for managing your nomad life: track every tool you use, monitor your budget across currencies, and manage client workflow with timezone awareness.

### Getting the Template

1. Open this link on Gumroad after purchase
2. Click **"Duplicate to Notion"** (or "Get linked databases" for individual blocks)
3. The template copies into your Notion workspace
4. Customize page names, colors, and categories as needed

> 💡 You only need a **free** Notion account to use this template. No paid tier required.

---

## Template Structure Overview

```
📁 Digital Nomad Starter Pack/
 ├── 🏠 Dashboard (main overview page)
 ├── 🛠️ Tool Tracker/
 │   └── Databases + views
 ├── 💰 Budget Tracker/
 │   └── Databases + views
 ├── 🔀 Workflow Dashboard/
 │   └── Databases + views
 └── 📊 Analytics/
     └── Reports + summaries
```

---

## Page 1: Dashboard (Main Overview)

This is your command center. It shows everything at a glance from one page.

### Dashboard Layout

| Section | Content | Type |
|---------|---------|------|
| **Welcome Banner** | "Welcome to your nomad workspace! Set up your tools below." | Callout block |
| **Quick Stats** | Active tools count, Monthly spend this month, Active projects, Days until next visa expiry | Number properties (linked from databases) |
| **Upcoming Deadlines** | Next 7 days of task due dates | Linked view of Workflow Dashboard filtered by date |
| **Budget Summary** | This month's total spending per category | Rollup from Budget Tracker |
| **Tool Status Overview** | Tools recommended vs. testing vs. dropped | Linked view of Tool Tracker with groupings |
| **Daily Checklist** | Quick morning/evening routine items | Checkbox list |

### Daily Checklist (on Dashboard)
```markdown
- [ ] Check internet speed (run Speedtest)
- [ ] Verify VPN is connected
- [ ] Review today's tasks in Workflow Dashboard
- [ ] Update budget entry for any new expenses
- [ ] Backup files to cloud storage
- [ ] eSIM data remaining? (check Airalo app)
```

---

## Page 2: Tool Tracker Database

### Purpose
Track every tool you subscribe to or use as a nomad. Includes cost tracking, affiliate commission rates, and review dates so you always know what's working and what to replace.

### Full Database Schema

| Property Name | Type | Options / Format | Default Value | Purpose |
|--------------|------|------------------|---------------|---------|
| **Tool Name** | Title | Text input | — | Name of the tool/service |
| **Category** | Select | Connectivity, Hardware, Software, Finance, Security | — | Groups tools by function |
| **Status** | Status | Recommended, Trying, Testing, Dropped | Testing | Current evaluation state |
| **Monthly Cost (USD)** | Number | Decimal, 2 places | 0 | What you pay per month in USD |
| **Annual Cost (USD)** | Formula | `prop("Monthly Cost (USD)") * 12` | — | Auto-calculated yearly total |
| **Billing Cycle** | Select | Monthly, Quarterly, Annual, One-time | Monthly | How often you're charged |
| **Affiliate Rate (%)** | Percent | Percentage format | 0% | Commission rate you earn by sharing this link |
| **Review Date** | Date | Calendar picker | — | When to re-evaluate this tool (default: +90 days) |
| **Link** | URL | Web address | — | Official website or affiliate link |
| **Notes** | Text | Multi-line | — | Your personal review, pros/cons, alternatives |
| **Alternatives** | Relation | → Tool Tracker (self-reference) | — | Other tools you've tried that could replace this one |
| **Rating** | Select | ⭐⭐⭐⭐⭐ (5 options) | — | Your personal rating of the tool |

### Default Pre-loaded Tools

```markdown
| Tool Name | Category | Status | Monthly Cost | Affiliate Rate | Review Date | Link | Notes | Rating |
|-----------|----------|--------|-------------|---------------|-------------|------|-------|--------|
| Notion Pro | Software | Recommended | $8.00 | — | 2026-10-01 | https://notion.so | Core workspace, keep | ⭐⭐⭐⭐⭐ |
| ExpressVPN | Security | Recommended | $6.67 | 30% | 2026-09-15 | https://expressvpn.com | Annual plan, multi-device | ⭐⭐⭐⭐⭐ |
| Airalo (Asia) | Connectivity | Recommended | varies | 15% | 2026-08-01 | https://airalo.com | Regional pack, recharge when <1GB | ⭐⭐⭐⭐⭐ |
| Wise Card | Finance | Recommended | $0.00 | — | 2026-12-01 | https://wise.com | Primary bank for nomads | ⭐⭐⭐⭐⭐ |
| 1Password | Security | Recommended | $3.00 | 20% | 2027-01-01 | https://1password.com | One password for everything | ⭐⭐⭐⭐⭐ |
| Surfshark | Security | Testing | $2.91 | — | 2026-09-01 | https://surfshark.com | Backup VPN, compare speeds | ⭐⭐⭐⭐ |
| NomadX | Connectivity | Recommended | $29.00 | — | 2026-10-01 | https://nomadx.io | Coworking membership | ⭐⭐⭐⭐ |
```

### Suggested Views for Tool Tracker

| View Name | Type | Filter / Sort | Purpose |
|-----------|------|--------------|---------|
| **All Tools** | Table | Sorted by Status, then Category | Master list of everything |
| **Recommended** | Board | Filter: Status = Recommended | Your current toolkit at a glance |
| **Trying / Testing** | Board | Filter: Status = Trying or Testing | Tools you're evaluating |
| **Dropped** | Table | Sorted by Review Date (descending) | Tools to consider removing from budget |
| **By Category** | Gallery | Grouped by Category property | Visual browsing by tool type |
| **High Affiliate Rate** | Table | Filter: Affiliate Rate > 0% | Focus on tools that earn you commissions |

---

## Page 3: Budget Tracker Database

### Purpose
Track every expense across all currencies with automatic USD conversion. Know exactly how much your nomad lifestyle costs per month and identify spending leaks.

### Full Database Schema

| Property Name | Type | Options / Format | Default Value | Purpose |
|--------------|------|------------------|---------------|---------|
| **Expense Name** | Title | Text input | — | What was the expense for? |
| **Amount (local currency)** | Number | Decimal, 2 places | — | Amount in local currency |
| **Currency** | Select | USD, EUR, GBP, THB, VND, IDR, COP, PHP, MXN, JPY, SGD, AUD, NZD, AED, TRY | USD | What currency was the expense in? |
| **Amount (USD equivalent)** | Formula | Uses exchange rate data from Wise API or manual entry | — | Auto-calculated: `prop("Amount (local currency)") * exchange_rate` |
| **Category** | Relation | → Tool Tracker categories | — | Links to a tool's category for grouping |
| **Date** | Date | Calendar picker | Today | When the expense was incurred |
| **Recurring?** | Checkbox | True / false | false | Is this a monthly subscription or one-time? |
| **Payment Method** | Select | Wise Card, Revolut Card, Credit Card, Cash, Bank Transfer — — | — | How was it paid for? |
| **Receipt Link** | URL | Web address | — | Screenshot or receipt URL (Airbnb confirmation, booking invoice) |
| **Notes** | Text | Multi-line | — | Context: "Monthly Airbnb in Bangkok near BTS" |

### Exchange Rate Reference (Manual Lookup — update monthly)

```markdown
| Currency | USD Rate (2026-Jul estimate) | Example Conversion |
|----------|-----------------------------|--------------------|
| THB (Thai Baht) | 35.0 | 1,050 THB = $30 |
| EUR (Euro) | 1.08 | €100 = $108 |
| GBP (British Pound) | 1.27 | £100 = $127 |
| VND (Vietnamese Dong) | 25,400 | 300,000 VND = ~$11.80 |
| IDR (Indonesian Rupiah) | 16,800 | 150,000 IDR = ~$9 |
| COP (Colombian Peso) | 4,100 | 50,000 COP = ~$12.20 |
| PHP (Philippine Peso) | 57.5 | 3,000 PHP = ~$52 |
| MXN (Mexican Peso) | 18.0 | 2,000 MXN = ~$111 |
```

> 💡 **Pro tip:** Use Wise's real-time exchange rates for the most accurate conversion. Enter your local amount and Wise's shown USD equivalent for precision.

### Suggested Views for Budget Tracker

| View Name | Type | Filter / Sort | Purpose |
|-----------|------|--------------|---------|
| **All Expenses** | Table | Sorted by Date (descending) | Complete spending history |
| **This Month** | Table | Filter: Date is this month | Current month's expenses only |
| **By Category** | Board | Grouped by Category relation | See how much you spend per category |
| **Recurring** | List | Filter: Recurring? = true | Your monthly subscriptions at a glance |
| **Over $50** | Table | Filter: Amount (USD) > 50 | High-value expenses to review |

### Monthly Budget Summary Formula (on Dashboard)

```markdown
Total Monthly Spending = Sum of all Budget Tracker entries where Date is this month

Budget categories breakdown:
├── Connectivity: Sum of Airalo, hotspot, coworking
├── Housing: Sum of Airbnb, hotels, co-living
├── Food & Drinks: Sum of restaurants, groceries
├── Software Subscriptions: Sum from Tool Tracker monthly costs
├── Transportation: Sum of buses, trains, flights
├── Insurance: Sum of health/travel insurance premiums
└── Miscellaneous: Everything else
```

---

## Page 4: Workflow Dashboard

### Purpose
Kanban-style project management for your freelance/remote work. Built with timezone awareness so you always know what's due and when your clients are available.

### Full Database Schema

| Property Name | Type | Options / Format | Default Value | Purpose |
|--------------|------|------------------|---------------|---------|
| **Task Name** | Title | Text input | — | What needs to be done? |
| **Client / Project** | Relation | → Projects database (or text) | — | Which project does this task belong to? |
| **Status** | Status | Not Started, In Progress, Review, Done, Archived | Not Started | Current workflow stage |
| **Due Date** | Date | Calendar picker | — | When is this due? |
| **Priority** | Select | 🔴 High, 🟡 Medium, 🟢 Low | Medium | How urgent is this task? |
| **Time Zone (Working From)** | Text | Free text | — | Where are you working from when doing this? |
| **Related Tools** | Multi-select | Connectivity, Software, Finance, Security, Hardware | — | Which tools does this task need? |
| **Estimated Hours** | Number | Decimal | — | How many hours will this take? |
| **Billable?** | Checkbox | True / false | false | Does this generate revenue? |
| **Hourly Rate (USD)** | Number | Decimal | — | Your rate for billable work |
| **Notes** | Text | Multi-line | — | Additional context or client instructions |

### Kanban Board View (Primary View)

```
┌─────────────┬──────────────┬──────────┬─────────┬────────┐
│ Not Started │  In Progress │  Review  │   Done  │ Archived│
├─────────────┼──────────────┼──────────┼─────────┼────────┤
│ Draft blog  │ Design logo  │ Client A │ Send     │ Old     │
│ post for    │ for client B │ invoice  │ Project  │ project │
│ Client C    │              │          │ X files  │ tasks   │
│             │              │          │          │         │
│ Research    │ Dev sprint   │ Finalize │ Monthly  │         │
│ keyword     │ for SaaS app │ deliver- │ invoices │         │
│ strategy    │              │ ables    │ sent     │         │
└─────────────┴──────────────┴──────────┴─────────┴────────┘
```

### Timeline / Calendar View
See all deadlines across your project portfolio at a glance. Especially useful for knowing when deliverables overlap and which clients need attention.

### "This Week" Filtered View
Shows only tasks due within the next 7 days, sorted by Priority → Due Date. This is your daily morning view before you start working.

---

## Page 5: Analytics & Reports

### Purpose
Monthly summaries of your nomad business health: spending trends, tool ROI, project pipeline, and savings achieved.

### Monthly Summary Template

```markdown
## Nomad Business Monthly Report — {{Month Year}}

### Financial Overview
- Total income: $______
- Total expenses: $______
- Net profit: $______ (income minus expenses)
- Average monthly cost of nomad life: $______

### Tool Spending
- Software subscriptions total: $______
- Top 3 tools by cost: 1. ___ ($__), 2. ___ ($__), 3. ___ ($__)
- Tools to drop this month: ______ (no longer used, consider canceling)

### Project Pipeline
- Active projects: #______
- Completed this month: #______
- Overdue deliverables: #______

### Savings Achieved
- Compared to traditional banking fees: ~$______ saved via Wise
- VPN discount savings vs. standalone pricing: ~$______
- Coworking membership vs. daily passes: ~$______ saved

### Goals for Next Month
- [ ] _______________________________________
- [ ] _______________________________________
- [ ] _______________________________________
```

---

## Import Instructions

### If Duplicating from a Notion Template Link:
1. Click the template link provided on your Gumroad purchase page
2. In Notion, click **"Duplicate"** in the top-right of the template page
3. Choose which workspace to duplicate into (if you have multiple workspaces)
4. Verify all databases are populated with pre-loaded data
5. Customize category colors and names as needed

### If Building Manually (for reference):
1. Create a new Notion page called **"Digital Nomad Starter Pack"**
2. Add 4 sub-pages: Tool Tracker, Budget Tracker, Workflow Dashboard, Analytics
3. For each sub-page, click "Add a database" → Full Page Database
4. Add properties using the schemas above (exact property names and types)
5. Populate pre-loaded data from the sample tables in this document

---

## Customization Tips

### Colors & Branding
- Set page icons to match categories: 🔌 for Connectivity, 💻 for Hardware, ⚙️ for Software, 💰 for Finance, 🛡️ for Security
- Use Notion's built-in cover images — choose a travel/nomad aesthetic (mountains, beaches, city skylines)

### Automations
- Set up **calendar reminders** on each "Review Date" in Tool Tracker to re-evaluate tools
- Use **date formulas** to auto-flag expenses older than 30 days as "Overdue Review"
- Create a **"Monthly Close"** checklist that runs on the 1st of each month

### Sharing with Team/Clients
- Share individual project pages (not the full template) via Notion's share feature
- Use password protection for sensitive pages (client contracts, financial data)
- Export to PDF using Notion's export function when a client needs offline access

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "Database is empty" after duplicating | Check that the template link was from the Gumroad purchase page (not this markdown file) |
| Properties not showing correct types | Delete and re-add the property — Notion sometimes defaults incorrectly |
| Linked databases not updating | Click on the database view → ensure the linked database is selected correctly in settings |
| Cannot edit the template | Make sure you clicked "Duplicate" — copied templates are owned by your account |

---

## Template Credits

Built as part of the **Digital Nomad Tech Stack Starter Pack** by Sun Centgered. 
Template designed to work with Notion's free tier. All data stays in your Notion workspace — nothing is stored externally.

For updates and new template versions, visit your Gumroad purchase page or join our Discord community (Bundle tier).
