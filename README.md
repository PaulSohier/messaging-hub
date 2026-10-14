# Messaging Hub V5.12.0.0

Internal dashboard mapping all customer-facing messages across brands, channels, intents and markets, plus the cost modeling behind them and a map of what is live today.

## What is this?

A single-file interactive dashboard that centralises messaging intelligence and cost modeling for Ria and Xe. Built for the CX team to understand what messages are sent, when, to whom, at what cost, and why the numbers say what they say.

## How the Hub is organised

Three switches at the top of the sidebar control what you see.

**Brand switcher: Ria or Xe.** Ria has the full toolkit. Xe currently has its live Iterable customer journeys only.

**Audience switcher: B&M or Digital.** For Ria this is a real structural split, B&M messaging is sheet-fed while Digital comes live from Iterable. The same switch is labelled Consumer and Corporate when Xe is selected, and is disabled for now because the Xe data has no such split in it.

**Mode switcher: Messaging, Costs or Activation.** Messaging holds the exploration pages. Costs holds the calculators. Activation holds the map of what is live today and the weekly activation roadmap. Costs and Activation are Ria B&M only, so the audience switch is hidden in those two modes, and Xe shows a short "Ria B&M only" message there.

## What is inside

### Messaging

**Message Flow Map**
Visual diagram of message routes. Filter by event and country to see which markets receive a message, through which channel, and to whom. Renders progressively as you scroll, so it only builds the routes currently in view. The URL updates as you filter, so you can copy the link to share an exact view.

**Messages Library**
The full message library, browsable by intent and audience. Click any card to read the full message. Every card has a share icon that copies a link straight to that specific message, so whoever opens it lands on that exact card already expanded.

Every SMS card also shows its character count, so you can see how close a message sits to the 160 character limit. The count is grey up to 140 characters, orange from 141 to 160 when little headroom is left, and red above 160 with the number of SMS units billed. Hover the count to see how many characters are left. WhatsApp cards have no count. The count follows the placeholder switch described below, so it shows the filled length when that switch is on.

Three controls sit above the list on the B&M side:

- Country filter, built from the 43 countries that actually appear in the sheet.
- Channel filter for SMS and WhatsApp.
- A "Fill placeholders with sample data" switch. Turned on, it replaces placeholders like `<Customer First Name>` with realistic sample values, so a message can be read the way a customer receives it. Sample values are chosen at roughly the real median character length for each field, so the SMS length warnings stay honest. WhatsApp placeholders are deliberately left untouched, since WhatsApp is not billed by length.

**Customer Journeys**
For Ria B&M this shows the six hand-built customer scenarios with the messaging attached to each step, cross-matched against the live sheet by title.

For Ria Digital and for Xe it shows the real Iterable journeys, pulled daily from Production. Each journey tile carries its live status, a plain count of what it sends per channel, and an "Open in Iterable" button that goes straight to that workflow. Campaigns show their own status badge, and expanding one renders the actual email, push or in-app message along with its real Iterable metrics (sent, delivered, open rate, click rate, unsubscribe rate). There is a search box that matches on journey or campaign name.

**Opt-in rates**
Daily opt-in figures captured from the Opt-in Power BI dashboard, global or by country. Email, SMS and WhatsApp are shown as trend charts with a hover readout, and up to 8 countries can be compared side by side.

### Costs

The Costs menu has three main pages: Full Opt-in Impact, Iterable Migration and FX Client Activations. Five older models sit in a collapsed group called **Older models** in the same menu (click the group title to open it). They are kept with all their code and data for future use, and their links still work. Iterable Migration and FX Client Activations both let you pick the carrier, markets and events, so they cover most of what the SMS Costs, Twilio and Global deployment pages did. The one thing SMS Costs had that they did not, changing the billing units of a message, is now in FX Client Activations.

All cost pages carry a "Ria sending countries only" checkbox. Turned on, it removes the Global Agent markets, leaving the markets where Ria itself owns the messaging. The United States stays included either way, because an agent manages the sending tooling there but Ria still owns the customer communication.

**SMS Costs** (Older models)
Country-level SMS cost projection based on 2025 order volumes and contracted Clickatell rates. Includes an opt-in scenario slider, using today's real opt-in rate of 64 percent as the baseline.

**Twilio SMS calculator** (Older models)
The same model using Twilio's contracted rates (contract rate schedule, effective Aug 1, 2025). Covers only the 57 countries priced in that contract. US and Canada rates exclude an additional, unquantified carrier-fee surcharge. 11 priced countries have no order-volume data on file and need manual entry.

**Global deployment cost** and **Global deployment Twilio** (Older models)
Executive views of projected spend across all markets, sortable and filterable by region or country. The Twilio version covers the 46 markets that are both Twilio-priced and have order data.

**Full Opt-in Impact**
Answers one question: what would SMS cost if every customer opted in. It builds an average messages-per-order figure from the real 2025 US event rates, each weighted by how often it fires and by its real SMS segment count, then scales that from today's opt-in rate up to 100 percent. Headline figures and charts sit at the top, with the full editable event table collapsed underneath. Entered values are saved in the browser.

**Opt-in cost impact (by journey)** (Older models)
The same question modelled a different way, grouped by delivery path rather than by individual event. Cash pickup counts as one journey sending two messages, for example. Kept alongside the event version rather than replacing it, so the two approaches can be compared.

**Iterable Migration**
Shows how much B&M SMS would cost per year in the markets and for the events you choose. The headline reads like "Sending X in these markets costs about $X per year in SMS". Below it, a table gives the SMS per year and the cost per year for each market.

The Iterable contract is already paid, so the page shows no platform, contract, allowance or overage cost. Only the SMS cost is modelled, because that is paid to a carrier and changes with the market.

Controls cover which markets to include (multi-select, so a phased plan can be modelled), Clickatell or Twilio as the carrier, today's opt-in rate or full opt-in, and which events are in scope. The event scope defaults to what is actually live in each market today, since the US runs 25 live SMS events while most other markets run only one to four. Switching to a custom event set shows how much activating new events would add. When the chosen events cost more than what is live today, the headline adds "That is $X more than today".

A small Profiles box lets you check whether adding B&M customers would go above the 52,000,000 profile allowance of the Iterable contract (current contract). A fee only appears when the total goes above the allowance. Left blank, no profile fee is shown.

**FX Client Activations**
Answers a different question: what would it cost if we turn on more messages in FX Client, sending with Clickatell, with no Iterable at all. It is built to work like the simulator, but with a list.

- Pick any markets and any events, then press "Add to list". You can add several times, so each market can have its own events.
- Events already live in a market are shown as "(live)" and are not counted. Only new activations add cost.
- Each event chip shows its own yearly cost, and has an x to remove it. Each market has an x too.
- The headline gives the extra SMS cost per year, with three tiles: extra cost, extra SMS and number of activations.
- Each message has a small box with its billing units (SMS segments). Change it to 1 to test a shorter text and see the saving. The edited units are used in the cost, the picture and the CSV, and are saved in the browser.
- Opt-in scenario works like the other pages (today's rate or full opt-in).
- "Export picture (PNG)" builds an image with the totals and one row per market (events turned on, share bar, SMS per year, cost per year), with a preview and a download. "Export CSV" gives one line per market and event.
- The list is saved in the browser.

### Methodology

**How We Calculate This**
Plain-language breakdown of the cost concepts used throughout, the participation-rate proxy model, what "Live" means and how it is enforced, and every data source behind the numbers.

### Activation

**SMS activation map**
A world map of what is activated today as B&M SMS in FX Client, for Ria only. Each market is coloured by how many events it has live, compared with the United States (25 events live). Markets with nothing live are grey.

Click a market on the map, or in the ranking list, to zoom in. The side panel then shows the events live and not live, with an estimate of the SMS per year and the cost per year for each. For events not live yet, it shows what they would cost, and the total if all of them were turned on. Orders are 2025 orders and rates are Clickatell rates, with the same US proxy method as the cost pages. The live events come from the Messages Library, so the map changes when the library changes. Scroll to zoom, drag to move, Escape to go back to the world view.

This page shows FX Client only. There is no Iterable view, and no WhatsApp yet.

**Activation roadmap** (since V5.12.0.0)
A roadmap of the weekly activations of B&M SMS messages in FX Client, for Ria only. Each column is one activation week (a Tuesday), each row is a region (Europe, Australia, other markets), and each box is a group of events with the markets that go live that week. A box is Planned (dashed), Confirmed (blue) or Live (green) and can show its Jira ticket. A week without a box is still open. The page shows no costs, it is only there to help the team see and decide the order of events and markets.

The page reads `data/activation-roadmap.json` when it loads, so it is changed by editing that file on GitHub, with no code change. The file has four parts: `subtitle`, `weeks` (label and date), `rows` (id, label, sub label, colour) and `items`. An item has a `week` number, a `row` id, a list of `events`, the `markets` text, a `status` (`planned`, `confirmed` or `live`) and an optional `ticket`. Epic: CGD-6667. Week 1: CGD-6668. Week 2: CGD-6669.

## A note on estimates

The United States is the only market with real behavioural telemetry. Event participation rates and message lengths from the US are applied as a proxy to every other market. Pages that rely on this say so on screen rather than presenting modelled figures as measured ones.

## Data sources

- B&M messaging templates: Clickatell
- Digital messaging templates: Ria Iterable and the MY Wallet platform (Malaysia)
- Xe messaging: Xe Digital Iterable Production
- Order volumes: Power BI, all B&M markets, 2025
- SMS costs (Clickatell): current contracted telco rates
- SMS costs (Twilio): Twilio contract rate schedule, effective Aug 1, 2025
- Clickatell billing: 2025 invoices
- Opt-in data: current rate of 64 percent
- Activation roadmap: `data/activation-roadmap.json`, edited by hand
- Global Agent markets: Global Agents file, used for the Ria sending countries filter
- Iterable contract: current quote, Mar 2026 to Mar 2027 renewal

## Live data connection

Message templates live in a Google Sheet across two tabs, **B&M** and **Digital**, following the same column structure as the Ria transactional message library plus two extra columns, **Intent** and **Live**.

Only rows marked **Live = Yes** are pulled in. That filter runs server-side through a Google Sheets query, so non-live rows are never downloaded at all, not just hidden afterwards. This applies to Message Flow Map, Messages Library and, by title cross-match, the Ria B&M Customer Journeys.

To add a message, copy the row into the relevant tab, fill in Intent, mark Live, and the dashboard picks it up on next refresh. No file replacement needed.

Sheet structure:

`Product type | Channel | Event that triggers the message send | Message template title | Message | Subject | Language | Send system | Message recipient | From address | Format type | Service | Payment method | Country to | B&M email message incl. HTML | MessageID | Event ID | Agent Company | Intent | Live`

**Cost pages and the Messages Library (since V5.11.0.0):** the cost pages and the Activation map now follow the live B&M rows of the sheet. Each time the Hub loads, it builds two things from the library:

- **Live SMS events per market:** every row with Channel = SMS, a market and an event counts as live there. This feeds the Activation map, FX Client Activations, Iterable Migration and the "what is live today" scope.
- **Billing units per event:** for each event, the Hub takes every live US SMS message, counts its units (160 characters = 1 unit, whole numbers, from the real text length) and uses the most common value (a tie takes the lower value). This is the same method as the original model. So if a message is made shorter in the library, its cost drops on the next load. This feeds Full Opt-in Impact, Iterable Migration, FX Client Activations and the default billing units of the older SMS calculators.

Each of these pages shows a status box at the top: "Synced with the Messages Library" with the time, the number of live SMS messages and markets, what changed compared with the built-in snapshot, and how many live library events are not costed because the cost model has no participation rate for them. If the sheet cannot load, the pages use the values written in the code and say so.

**Still hardcoded in `index.html`:** country rates, order volumes, participation rates (from the real 2025 US notification counts), Iterable contract figures, the Global Agent country list, and the world map shapes (simplified). Changing any of them means a code edit and a new push. The Opt-in cost impact (by journey) and the Global deployment pages are older models and do not follow the library: the first has its own fixed message counts per journey, and the second use the measured 2025 SMS per order.

**Message links:** the sheet's `MessageID` column is blank on every row, so per-message share links are built from a mix of title, country, channel, event, recipient, agent and service. That is unique for almost every message. A small number of genuine duplicate rows share a link, which is harmless since they show identical content. Filling in `MessageID` would make this exact.

## Iterable journey data

Three data files, all produced by `scripts/pull-iterable-journeys.js` through the **Pull Iterable journey data** workflow:

| File | Environment | How it runs |
|---|---|---|
| `data/iterable-journeys-ria-prod.json` | Ria Digital Prod | Daily, 08:15 UTC |
| `data/iterable-journeys-xe-prod.json` | Xe Digital Prod | Daily, 08:18 UTC |
| `data/iterable-journeys.json` | Sandbox | Manual only |

The two Production pulls are automatic. They run three minutes apart so their commits do not collide. The Hub reads the Ria file for Ria Digital and the Xe file for Xe. The Sandbox file is kept for testing and is not read by the Hub.

Ria Prod uses the same defaults as a manual run (enabled journeys, Transactional and Transaction status categories). Xe Prod uses a fixed hand-picked list of journey IDs, because Xe's campaigns do not use a Transactional label the way Ria's do, so a category filter would not work. That list lives in `XE_JOURNEY_IDS` in the workflow file.

Repo secrets: `ITERABLE_SANDBOX_API_KEY`, `ITERABLE_RIA_PROD_API_KEY` and `ITERABLE_XE_PROD_API_KEY`. All accounts are on the same Iterable data centre (`api.iterable.com`), confirmed Sep 2026.

**Important:** journey IDs are specific to one Iterable account. An ID that means one journey in Sandbox can be a different or nonexistent journey in Production. Never reuse one environment's ID list for another. Always inspect the committed output after a run before relying on it.

The script header carries the full safety model (read-only, allowlisted fields, no PII). It applies equally to Sandbox and Production.

## Opt-in rates data

The Opt-in rates tab reads `data/optin-daily.json`, one entry per day, with global figures plus a per-country breakdown. Two ways to fill it:

1. **Automated (goal state):** `scripts/pull-optin-data.js`, run daily by `.github/workflows/pull-optin-data.yml`, calls the Power BI Execute Queries REST API and appends a snapshot. **Not live yet.** It needs Power BI access set up first and has never been tested against the real API.
2. **Manual fallback:** screenshot the Opt-in Power BI dashboard, paste it into a Claude chat, and ask for a new entry appended to `data/optin-daily.json` following the existing shape.

### Setup checklist to go live with the automated pull

Needs Power BI tenant-admin rights, so likely IT or the data team rather than CX:

- [ ] Register a Microsoft Entra app, note its App ID
- [ ] Create an Entra security group and add the app to it
- [ ] Add the app as a Viewer on the Power BI workspace holding the Opt-in dataset
- [ ] In Admin Portal, Tenant settings, Integration settings, enable "Dataset Execute Queries REST API" scoped to that group
- [ ] Get the Dataset ID behind the Opt-in report
- [ ] Confirm the real table and measure names and update `POWERBI_DAX_QUERY` if the placeholder does not match. The current one is a best guess from a screenshot, not confirmed against the model
- [ ] Add repo secrets: `POWERBI_TENANT_ID`, `POWERBI_CLIENT_ID`, `POWERBI_CLIENT_SECRET`, `POWERBI_DATASET_ID`, optionally `POWERBI_DAX_QUERY`
- [ ] Run the workflow manually and check the committed file before trusting the schedule

**Note:** this is the same technical shape as **CGD-5905** ("PowerBI | B&M Messaging Cost, Delivery & Activation Tracking"), which was scoped then cancelled. Worth checking why before assuming this smaller version clears the same bar.

## Known open items

- **Three Flow Map elements are still hidden.** The Message Library column, the Who Gets It column and the route-count summary line were hidden for a presentation and never restored. They are marked with `TEMP: hidden for CEO presentation` comments in the CSS. Remove the `display:none` on each to bring them back.
- **Activation map is SMS only.** The live events come from the SMS rows of the Messages Library. WhatsApp events are not shown as activated yet.
- **Some markets have no estimate on the Activation map.** Colombia has live events but no order volume or Clickatell rate on file, so its panel shows no cost. French overseas territories with live events (French Guiana, Guadeloupe, Martinique, Mayotte, Reunion) are not drawn on the map.
- **Xe has no Consumer and Corporate split.** The audience switch is disabled for Xe because the Xe pull is a single list. Splitting it would mean two separate pulls.
- **The placeholder preview uses one tracking URL per language.** English messages get the `en-us` tracking page and Spanish ones get `es-us`, detected from the message text (CGD-6561, done). The real link carries a per-customer token, so the live message is longer than the preview shows.
- **Ria PayID has no sample value**, because its format is unknown. It stays visible as a raw placeholder rather than being filled with something invented.

## How to update the dashboard

Replace `index.html` in this repository. The URL stays the same. GitHub Pages serves the `main` branch directly.

Each new `index.html` gets a version number (format VX.X.X.X: major, minor, patch, build), which is also shown in the title of this README. Update the number here when you upload a new version.

## Owner

CX Team, Ria Money Transfer
Built and maintained by Paul
