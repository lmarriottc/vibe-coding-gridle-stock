# FormaStock AI Context

## Project overview

FormaStock is a mobile-first sales and stock-control web application for La Nueva Diosa. It tracks shapewear inventory, sales, purchases, customers, dashboard metrics, movement history, and downloadable sales reports.

The user interface is written in English. Monetary values use USD. The app has no application-level authentication, payment processing, invoicing, or accounting integration.

## Technology and execution

- HTML5, CSS, and native browser ES modules.
- Vanilla JavaScript with no build step or package dependencies.
- Google Sheets as the shared production database.
- Google Apps Script as the JSON web API.
- Local demo mode backed by in-memory state when no Apps Script URL is configured.
- Start locally from the repository root with `python -m http.server 8000`, then open `http://localhost:8000`.
- JavaScript module URLs include a version query such as `?v=6` to prevent stale browser caches. Increment the version consistently across the entire import graph whenever cached frontend code could cause deployment issues.

## Repository structure

- `index.html`: application shell, navigation tabs, forms, dialogs, report filters, and tables.
- `styles.css`: responsive styling, dashboard charts, mobile layouts, dialogs, tables, and reports.
- `assets/la-nueva-diosa-logo.png`: white La Nueva Diosa logo used in the top bar.
- `src/main.js`: browser entry point; initializes tabs, forms, settings, live synchronization, reports, and the initial data load.
- `src/config.js`: local-storage key, low-stock limit, and demo inventory catalog.
- `src/dom.js`: centralized DOM element references.
- `src/state.js`: shared client state and saved Apps Script URL.
- `src/api.js`: local-demo and Google Apps Script data access.
- `src/forms.js`: single and multiple movement forms, customer inheritance, validation, and submissions.
- `src/ui.js`: dashboard, charts, inventory table, movement history, and form option rendering.
- `src/reports.js`: sales filtering, report table, totals, and Excel `.xls` download.
- `src/utils.js`: date, money, and HTML-escaping utilities.
- `google-apps-script/Code.gs`: Google Sheets schema, API endpoints, validation, inventory updates, and movement persistence.
- `docs/scope.md`: concise product scope.

## Main application sections

### Dashboard

- A `New Sale` button opens the Record Sale modal.
- Displays total available units.
- Displays sales for the current calendar month in units and USD.
- Shows a six-month sales trend for units and dollars.
- Shows all-time units sold by size and model alongside current stock.
- Sales categories are Front Closure, Lateral Closure, Belt, and Other.

### New Movements

- Supports `Record sale` and `Add purchase` modes.
- Users can add multiple movement lines before submission.
- Every sale requires a customer name and a customer type.
- Valid customer types are exactly `Maribi` and `Otro`.
- The customer inheritance checkbox copies and synchronizes both name and type from the first sale line to all additional lines.
- When inheritance is disabled, each additional sale keeps its copied values and can be edited independently.
- Purchases do not require customer information.
- Sales cannot exceed current stock, including the combined quantity of repeated references within one batch.
- Each movement requires a positive integer quantity and a positive unit price.

### Current Stock

- Displays inventory by model and size.
- Supports searching by model or size.
- Shows Available, Low stock, or Out of stock status.
- The low-stock threshold is configured by `LOW_STOCK_LIMIT` in `src/config.js`.

### Reports

- The first report is the sales report.
- Filters by inclusive start date, inclusive end date, and customer type.
- Customer type can be All, Maribi, or Otro.
- Displays Date, Customer type, Customer name, Model, Size, Quantity, and Total sale.
- Displays the number of sales, total units, and total USD amount.
- Downloads the current filtered result as an Excel-compatible SpreadsheetML `.xls` file without external libraries.
- Historical sales without a customer type appear as `Not specified` and are included only when all customer types are selected.

## Product catalog

Models:

- Front Closure
- Lateral Closure
- Belt

Sizes for every model:

- Medium
- Large
- Extra Large
- 2XL

Model and size normalization in `Code.gs` recognizes common historic variants so charts and reports can use older rows reliably.

## Client data flow

1. `main.js` calls `loadData()` from `api.js`.
2. Without a configured Apps Script URL, `state.js` resets to the demo catalog and empty history.
3. With a configured URL, `api.js` performs a GET request and replaces client state with `inventory`, `history`, and `salesBySizeModel`.
4. A movement is submitted as a text/plain JSON POST with `action: "movement"` to avoid browser preflight issues with Apps Script.
5. Apps Script validates and records the movement, then returns the complete refreshed database payload.
6. The frontend replaces state and rerenders stock, dashboard metrics, charts, forms, and movement history.
7. Live data refresh runs every 30 seconds while the connected application is visible and also on focus, reconnect, and visibility changes.

The Apps Script deployment URL is stored in the browser under the local-storage key `formastock-sheet-url`.

## Google Sheets data model

### `Inventory`

Columns, in order:

1. ID
2. Model
3. Size
4. Stock

### `Movements`

Append-only columns, in order:

1. ID
2. Type (`sale` or `purchase`)
3. Model
4. Size
5. Quantity
6. Created At
7. Day (`yyyy-MM-dd` in the Apps Script timezone)
8. User
9. Unit Price
10. Total
11. Customer Name
12. Customer Type (`Maribi` or `Otro` for new sales)

Old movement rows may have blank customer name or customer type cells. Reading historical data must remain backward-compatible.

## Apps Script behavior and safety

- `doGet()` returns `{ ok, inventory, history, salesBySizeModel }`.
- `doPost()` accepts only `action: "movement"`.
- `recordMovement()` uses a document lock to prevent concurrent stock corruption.
- A sale reduces stock; a purchase increases stock.
- `ensureInventoryCatalog()` adds missing catalog references without deleting existing stock or movement history.
- `ensureMovementSchema()` updates the movement header without deleting rows.
- `setupDatabase()` is intended only for initial setup. It clears the `Movements` sheet and must not be run against a production database containing history.
- `updateInventoryCatalog()` rebuilds the catalog while preserving stock for matching model/size combinations.

After changing `google-apps-script/Code.gs`, copy it into the Sheet-bound Apps Script project, save it, and deploy a new web-app version. Merely editing the repository does not update the live Apps Script deployment.

## Development conventions

- Keep browser code modular under `src/`; do not rebuild a monolithic `app.js`.
- Add new DOM references to `src/dom.js` instead of repeatedly querying from unrelated modules.
- Preserve local-demo behavior and Google Sheets behavior when adding features.
- Escape user-provided values before inserting them into HTML.
- Keep date comparisons based on the stored `Day` value where possible to avoid timezone shifts.
- Preserve exact inventory model and size names when submitting movements because Apps Script matches them to inventory rows.
- Maintain mobile usability as a primary requirement, especially sale entry and real-time stock visibility.
- Do not introduce a package manager or build tool unless explicitly required.
- Before committing, run syntax checks for every `src/*.js`, check `Code.gs` with Node syntax parsing, and run `git diff --check`.

## Git and deployment state

- Primary branch: `main`.
- Remote: `origin` on GitHub repository `lmarriottc/vibe-coding-gridle-stock`.
- Frontend deployment and Google Apps Script deployment are separate concerns. Pushing to GitHub does not automatically redeploy Apps Script unless an external deployment workflow is configured.
