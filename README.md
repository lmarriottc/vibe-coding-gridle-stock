# FormaStock

FormaStock is a lightweight sales and inventory tracker for a shapewear distribution team. Salespeople can record sales and purchases, and the whole team can see current stock by model and size.

## Features

- Record one or multiple sales or inventory purchases with their unit price and transaction total.
- Require a customer name and customer type (`Maribi` or `Otro`) for every sale.
- Update stock immediately and prevent sales above available stock.
- Show daily sales, total units, and low-stock references.
- Navigate between dedicated Dashboard, New Movements, and Current Stock tabs.
- Show today's sales as both quantity and gross dollar value.
- Visualize six-month sales trends with independent unit and dollar scales.
- Compare unit sales by size and model against current stock levels.
- Search inventory by model or size.
- Filter sales reports by date range and customer type, then download the results as an Excel file.
- Keep a shared movement history in Google Sheets.
- Fall back to local demo data when no Sheet is connected.
- Responsive English interface for desktop and mobile.

## Objetivos SMART

Los siguientes objetivos definen los criterios de aceptación para la entrega final del módulo. Son alcanzables con HTML, CSS, JavaScript y Google Sheets dentro del alcance del proyecto.

- **Registrar movimientos:** para la entrega final del módulo, permitir registrar ventas y compras para las 12 combinaciones de los 3 modelos y las 4 tallas del catálogo. Verificar con una venta y una compra por combinación (24 movimientos) que el stock y el historial se actualicen correctamente, para centralizar el control del inventario.
- **Evitar inconsistencias de stock:** para la entrega final del módulo, rechazar el 100 % de los casos de prueba con cantidades no enteras, cantidades menores o iguales a cero o ventas superiores al stock disponible, incluyendo referencias repetidas en un mismo lote, para prevenir registros inválidos.
- **Compartir la información:** para la entrega final del módulo, persistir los movimientos en Google Sheets y comprobar, en dos sesiones conectadas y visibles, que un movimiento registrado en una se refleje en la otra en un máximo de 35 segundos con conexión estable, para mantener al equipo informado.
- **Consultar y exportar ventas:** para la entrega final del módulo, ofrecer filtros por rango de fechas y tipo de cliente y una descarga compatible con Excel. Validar tres escenarios (todos los clientes, Maribi y Otro) y comprobar que las filas, unidades e importes exportados coincidan con los resultados en pantalla, para facilitar el seguimiento comercial.

## Documentación

- [Alcance del proyecto](docs/alcance.md).
- [Contexto para asistentes de IA](ai-context.md).

## Run the app

Serve the project directory with any local HTTP server, then open the displayed URL. For example:

```powershell
python -m http.server 8000
```

Open `http://localhost:8000`. No build or package installation is required; the HTTP server is needed because the JavaScript is organized as native ES modules.

## JavaScript structure

The browser entry point is `src/main.js`. Configuration, DOM references, state, Google Sheets access, rendering, form behavior, and shared utilities live in separate modules under `src/`.

## Connect a Google Sheet

1. Create a blank Google Sheet.
2. In the Sheet, open **Extensions → Apps Script**.
3. Copy the contents of `google-apps-script/Code.gs` into the Apps Script editor and save.
4. Select `setupDatabase` in the function menu, click **Run**, and approve access. This creates the `Inventory` and `Movements` tabs with starter data.
5. Click **Deploy → New deployment**, choose **Web app**, set **Execute as** to yourself, and choose the access level appropriate for your team. Deploy it.
6. Copy the deployment URL ending in `/exec`.
7. Open FormaStock, click **Sheet settings**, paste the URL, and click **Connect**.

The web app URL is saved only in that browser. Inventory and movements are stored in the Sheet. Redeploy the Apps Script after changing `Code.gs`.

After redeploying Apps Script, new catalog references are added automatically the next time the app reads the Sheet. You can also run `updateInventoryCatalog` manually; it rebuilds the catalog while preserving stock for existing model/size combinations and does not delete movement history.

## Data model

The `Inventory` tab stores ID, model, size, and stock. The `Movements` tab is an append-only log containing the movement type, reference, quantity, time, Google account when available, unit price, transaction total, customer name, and customer type. Monetary values currently use USD. A document lock prevents simultaneous sales from corrupting stock counts.

## Current scope

No application-level login or payment features are included. Access to the shared data is controlled by the Google Apps Script deployment settings.

## Technology

HTML, CSS, vanilla JavaScript, Google Sheets, and Google Apps Script.

**Vibe Coding** forma parte de la metodología de desarrollo: uso de asistentes de inteligencia artificial para construir y mejorar el proyecto mediante instrucciones en lenguaje natural, revisión del código generado y validación de los resultados.
