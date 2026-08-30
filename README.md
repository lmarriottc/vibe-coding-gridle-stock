# FormaStock

FormaStock is a lightweight sales and inventory tracker for a shapewear distribution team. Salespeople can record sales and purchases, and the whole team can see current stock by model and size.

## Features

- Record sales and inventory purchases with their unit price and transaction total.
- Update stock immediately and prevent sales above available stock.
- Show daily sales, total units, and low-stock references.
- Navigate between dedicated Dashboard, New Movements, and Current Stock tabs.
- Show today's sales as both quantity and gross dollar value.
- Visualize six-month sales trends with independent unit and dollar scales.
- Compare unit sales by size and model against current stock levels.
- Search inventory by model or size.
- Keep a shared movement history in Google Sheets.
- Fall back to local demo data when no Sheet is connected.
- Responsive English interface for desktop and mobile.

## Run the app

Open `index.html` in a browser. No build or package installation is required.

## Connect a Google Sheet

1. Create a blank Google Sheet.
2. In the Sheet, open **Extensions → Apps Script**.
3. Copy the contents of `google-apps-script/Code.gs` into the Apps Script editor and save.
4. Select `setupDatabase` in the function menu, click **Run**, and approve access. This creates the `Inventory` and `Movements` tabs with starter data.
5. Click **Deploy → New deployment**, choose **Web app**, set **Execute as** to yourself, and choose the access level appropriate for your team. Deploy it.
6. Copy the deployment URL ending in `/exec`.
7. Open FormaStock, click **Sheet settings**, paste the URL, and click **Connect**.

The web app URL is saved only in that browser. Inventory and movements are stored in the Sheet. Redeploy the Apps Script after changing `Code.gs`.

If the Sheet was already configured before a catalog change, run `updateInventoryCatalog` from Apps Script. It updates the available models and sizes without deleting movement history.

## Data model

The `Inventory` tab stores ID, model, size, and stock. The `Movements` tab is an append-only log containing the movement type, reference, quantity, time, Google account when available, unit price, and transaction total. Monetary values currently use USD. A document lock prevents simultaneous sales from corrupting stock counts.

## Current scope

No application-level login or payment features are included. Access to the shared data is controlled by the Google Apps Script deployment settings.

## Technology

HTML, CSS, vanilla JavaScript, Google Sheets, and Google Apps Script.
