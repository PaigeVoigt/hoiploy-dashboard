# Hoi P'loy — Business Intelligence Dashboard

A local, interactive dashboard for Hoi P'loy sales & margin analysis, built from the
Cin7 sales data (Cin7 → n8n → Google Drive → Apps Script → **"Hoi P'loy GP Margins"** Google Sheet).

## Run it
- **Double-click `start.command`** — it serves the folder on `http://localhost:8756` and opens your browser.
- Or, in Terminal: `cd hoiploy-dashboard && python3 -m http.server 8756` then open the URL.

(A tiny local server is needed because the page loads a data file; opening `index.html` directly won't work.)

## What it shows
- **YTD KPIs** (default: 1 Mar 2026 – 31 May 2026): Sales, Cost of Sales, Gross Profit (R), GP %, and customer count — each with **year-on-year growth**.
- **Monthly** Revenue / Cost of Sales / Gross Profit (R) plus **GP %** line, with prior-year overlay.
- **Gross profit in Rand and %** broken down by **Product, Category, Price Tier, Sale Type** and **Customer**.
- **Financial-year selector** (Mar–Feb) to view or compare prior years.
- **Click any chart** (category, tier, sale type, customer, month) to drill in — filters cascade across every card and the detail table.

## Refreshing the data
Change the sheet, then refresh, and the dashboard follows. The dashboard reads
`data/sales_data.csv` (the sheet's **Sales Data** tab); refreshing just re-pulls that file.

**One click:** double-click **`Refresh.command`**. It pulls the latest Sales Data from the
sheet, rewrites `data/sales_data.csv`, and rebuilds `dashboard.html`. Then reload the browser
(or re-open `dashboard.html`).

**One-time setup** (needed once, in an interactive session, so the refresh can read the sheet
without a sign-in each time):
1. Create a Google Cloud **service account** and download its JSON key.
2. Save the key at `credentials/service-account.json` in this folder.
3. Share the Google Sheet with the service account's email address (Viewer is enough).

`credentials/` holds a private key and the data is the company's financials, so **never commit
`credentials/` or `data/` to a public repo.**

**Manual fallback** (no setup): in the sheet, File → Download → CSV of the Sales Data tab, save
it over `data/sales_data.csv`, run `python3 build_standalone.py`, and reload.

Later, once the dashboard is hosted, this refresh can run on a schedule (weekly, then daily).

## Financial year
Runs **March → February**. "YTD" = 1 March of the current FY through the latest month with data.
Prior-year comparisons use the same month span one year earlier.

## Note on Gross Profit
GP and GP% come from the sheet's own `Gross Profit (ZAR)` / per-line margin (from Cin7),
which is treated as authoritative. In this data the GP column does **not** equal
`Sales − COGS` line-by-line — confirm the intended definition before publishing externally.
