const INVENTORY_SHEET = 'Inventory';
const MOVEMENTS_SHEET = 'Movements';
const INVENTORY_REFERENCES = [
  ['Front Closure', 'Medium'], ['Front Closure', 'Large'],
  ['Front Closure', 'Extra Large'], ['Front Closure', '2XL'],
  ['Lateral Closure', 'Medium'], ['Lateral Closure', 'Large'],
  ['Lateral Closure', 'Extra Large'], ['Lateral Closure', '2XL'],
  ['Belt', 'Medium'], ['Belt', 'Large'],
  ['Belt', 'Extra Large'], ['Belt', '2XL']
];

function doGet() {
  try { return jsonResponse({ ok: true, ...readDatabase() }); }
  catch (error) { return jsonResponse({ ok: false, error: error.message }); }
}

function doPost(event) {
  try {
    const payload = JSON.parse(event.postData.contents || '{}');
    if (payload.action !== 'movement') throw new Error('Unsupported action.');
    recordMovement(payload);
    return jsonResponse({ ok: true, ...readDatabase() });
  } catch (error) { return jsonResponse({ ok: false, error: error.message }); }
}

function setupDatabase() {
  const spreadsheet = SpreadsheetApp.getActive();
  let inventory = spreadsheet.getSheetByName(INVENTORY_SHEET);
  let movements = spreadsheet.getSheetByName(MOVEMENTS_SHEET);
  if (!inventory) inventory = spreadsheet.insertSheet(INVENTORY_SHEET);
  if (!movements) movements = spreadsheet.insertSheet(MOVEMENTS_SHEET);
  updateInventoryCatalog();
  movements.clear().getRange(1, 1, 1, 10).setValues([['ID', 'Type', 'Model', 'Size', 'Quantity', 'Created At', 'Day', 'User', 'Unit Price', 'Total']]);
  inventory.setFrozenRows(1); movements.setFrozenRows(1);
}

// Updates models and sizes without deleting the movement history. Existing stock
// is retained when a model/size combination already exists; new items start at 0.
function updateInventoryCatalog() {
  const spreadsheet = SpreadsheetApp.getActive();
  let inventory = spreadsheet.getSheetByName(INVENTORY_SHEET);
  if (!inventory) inventory = spreadsheet.insertSheet(INVENTORY_SHEET);
  const previousStock = {};
  if (inventory.getLastRow() > 1) {
    inventory.getRange(2, 1, inventory.getLastRow() - 1, 4).getValues().forEach(row => {
      previousStock[`${row[1]}|${row[2]}`] = Number(row[3]) || 0;
    });
  }
  const catalogRows = [['ID', 'Model', 'Size', 'Stock'], ...INVENTORY_REFERENCES.map((item, index) => [index + 1, item[0], item[1], previousStock[`${item[0]}|${item[1]}`] || 0])];
  inventory.clear().getRange(1, 1, catalogRows.length, 4).setValues(catalogRows);
  inventory.setFrozenRows(1);
}

// Adds new catalog references to existing Sheets without rewriting current rows.
function ensureInventoryCatalog(inventory) {
  const existingRows = inventory.getDataRange().getValues();
  const existing = new Set(existingRows.slice(1).map(row => `${row[1]}|${row[2]}`));
  let nextId = Math.max(0, ...existingRows.slice(1).map(row => Number(row[0]) || 0)) + 1;
  const missing = INVENTORY_REFERENCES
    .filter(item => !existing.has(`${item[0]}|${item[1]}`))
    .map(item => [nextId++, item[0], item[1], 0]);
  if (missing.length) inventory.getRange(inventory.getLastRow() + 1, 1, missing.length, 4).setValues(missing);
}

function readDatabase() {
  const spreadsheet = SpreadsheetApp.getActive();
  const inventorySheet = spreadsheet.getSheetByName(INVENTORY_SHEET);
  const movementsSheet = spreadsheet.getSheetByName(MOVEMENTS_SHEET);
  if (!inventorySheet || !movementsSheet) throw new Error('Run setupDatabase() before connecting the app.');
  ensureInventoryCatalog(inventorySheet);
  const inventoryRows = inventorySheet.getDataRange().getValues().slice(1).filter(row => row[0] !== '');
  ensureMovementSchema(movementsSheet);
  const movementRows = movementsSheet.getDataRange().getValues().slice(1).filter(row => row[0] !== '');
  return {
    inventory: inventoryRows.map(row => ({ id: row[0], model: row[1], size: row[2], stock: Number(row[3]) })),
    history: movementRows.reverse().slice(0, 500).map(row => ({ id: row[0], type: row[1], model: row[2], size: row[3], quantity: Number(row[4]), createdAt: new Date(row[5]).toISOString(), day: row[6], unitPrice: Number(row[8]) || 0, total: Number(row[9]) || 0 }))
  };
}

function recordMovement(payload) {
  const lock = LockService.getDocumentLock();
  lock.waitLock(10000);
  try {
    const quantity = Number(payload.quantity);
    const unitPrice = Number(payload.unitPrice);
    if (!['sale', 'purchase'].includes(payload.type) || !Number.isInteger(quantity) || quantity < 1 || !Number.isFinite(unitPrice) || unitPrice <= 0) throw new Error('Invalid movement or unit price.');
    const spreadsheet = SpreadsheetApp.getActive();
    const inventory = spreadsheet.getSheetByName(INVENTORY_SHEET);
    const values = inventory.getDataRange().getValues();
    const rowIndex = values.findIndex((row, index) => index > 0 && row[1] === payload.model && row[2] === payload.size);
    if (rowIndex < 0) throw new Error('Inventory reference not found.');
    const currentStock = Number(values[rowIndex][3]);
    if (payload.type === 'sale' && quantity > currentStock) throw new Error(`Only ${currentStock} units are available.`);
    inventory.getRange(rowIndex + 1, 4).setValue(currentStock + (payload.type === 'sale' ? -quantity : quantity));
    const now = new Date();
    const movements = spreadsheet.getSheetByName(MOVEMENTS_SHEET);
    ensureMovementSchema(movements);
    movements.appendRow([Utilities.getUuid(), payload.type, payload.model, payload.size, quantity, now, Utilities.formatDate(now, Session.getScriptTimeZone(), 'yyyy-MM-dd'), Session.getActiveUser().getEmail(), unitPrice, quantity * unitPrice]);
  } finally { lock.releaseLock(); }
}

function ensureMovementSchema(sheet) {
  sheet.getRange(1, 1, 1, 10).setValues([['ID', 'Type', 'Model', 'Size', 'Quantity', 'Created At', 'Day', 'User', 'Unit Price', 'Total']]);
  sheet.setFrozenRows(1);
}

function jsonResponse(value) {
  return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON);
}
