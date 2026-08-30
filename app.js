const SETTINGS_KEY = "formastock-sheet-url";
const LOW_STOCK_LIMIT = 5;
const demoInventory = [
  { id: 1, model: "Front Closure", size: "Medium", stock: 0 },
  { id: 2, model: "Front Closure", size: "Large", stock: 0 },
  { id: 3, model: "Front Closure", size: "Extra Large", stock: 0 },
  { id: 4, model: "Front Closure", size: "2XL", stock: 0 },
  { id: 5, model: "Lateral Closure", size: "Medium", stock: 0 },
  { id: 6, model: "Lateral Closure", size: "Large", stock: 0 },
  { id: 7, model: "Lateral Closure", size: "Extra Large", stock: 0 },
  { id: 8, model: "Lateral Closure", size: "2XL", stock: 0 }
];
const $ = (selector) => document.querySelector(selector);
const el = { total: $("#totalStock"), refs: $("#referenceCount"), sales: $("#todaySales"), salesAmount: $("#todaySalesAmount"), movements: $("#todayMovements"), monthlyChart: $("#monthlySalesChart"), sizeChart: $("#sizeSalesChart"), body: $("#inventoryBody"), empty: $("#inventoryEmpty"), history: $("#historyList"), form: $("#movementForm"), type: $("#movementType"), model: $("#modelSelect"), size: $("#sizeSelect"), qty: $("#quantityInput"), price: $("#unitPriceInput"), priceLabel: $("#unitPriceLabel"), preview: $("#stockPreview"), submit: $("#submitButton"), message: $("#formMessage"), search: $("#inventorySearch"), sync: $("#syncStatus"), dialog: $("#settingsDialog"), url: $("#sheetUrlInput"), settingsMessage: $("#settingsMessage"), toast: $("#toast") };
let state = { inventory: structuredClone(demoInventory), history: [] };
let sheetUrl = localStorage.getItem(SETTINGS_KEY) || "";

const localDay = (date = new Date()) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const selectedItem = () => state.inventory.find((item) => item.model === el.model.value && item.size === el.size.value);

function setSyncStatus(mode, text) { el.sync.className = `sync-status ${mode}`; el.sync.innerHTML = `<i></i>${text}`; }
function showToast(text) { el.toast.textContent = text; el.toast.classList.add("show"); clearTimeout(showToast.timer); showToast.timer = setTimeout(() => el.toast.classList.remove("show"), 2200); }
function escapeHtml(value) { const node = document.createElement("span"); node.textContent = String(value); return node.innerHTML; }

function populateModels() {
  const previous = el.model.value;
  const models = [...new Set(state.inventory.map((item) => item.model))];
  el.model.innerHTML = models.map((model) => `<option>${escapeHtml(model)}</option>`).join("");
  if (models.includes(previous)) el.model.value = previous;
  populateSizes();
}
function populateSizes() {
  const previous = el.size.value;
  const sizes = state.inventory.filter((item) => item.model === el.model.value).map((item) => item.size);
  el.size.innerHTML = sizes.map((size) => `<option>${escapeHtml(size)}</option>`).join("");
  if (sizes.includes(previous)) el.size.value = previous;
  updatePreview();
}
function updatePreview() { const item = selectedItem(); el.preview.textContent = item ? `Currently available: ${item.stock} units` : ""; }
function stockStatus(stock) { return stock === 0 ? ["Out of stock", "out"] : stock <= LOW_STOCK_LIMIT ? ["Low stock", "low"] : ["Available", ""]; }
function render() {
  const today = state.history.filter((item) => item.day === localDay());
  el.total.textContent = state.inventory.reduce((sum, item) => sum + Number(item.stock), 0);
  el.refs.textContent = `${state.inventory.length} active references`;
  el.sales.textContent = today.filter((item) => item.type === "sale").reduce((sum, item) => sum + Number(item.quantity), 0);
  el.salesAmount.textContent = formatMoney(today.filter((item) => item.type === "sale").reduce((sum, item) => sum + Number(item.total || (Number(item.quantity) * Number(item.unitPrice))), 0));
  el.movements.textContent = today.length ? `${today.length} movement${today.length === 1 ? "" : "s"} today` : "No movements today";
  const term = el.search.value.trim().toLowerCase();
  const filtered = state.inventory.filter((item) => `${item.model} ${item.size}`.toLowerCase().includes(term));
  el.body.innerHTML = filtered.map((item) => { const [label, cls] = stockStatus(item.stock); return `<tr><td>${escapeHtml(item.model)}</td><td>${escapeHtml(item.size)}</td><td class="quantity">${item.stock}</td><td><span class="badge ${cls}">${label}</span></td></tr>`; }).join("");
  el.empty.hidden = filtered.length > 0;
  el.history.innerHTML = state.history.length ? state.history.slice(0, 8).map((item) => { const purchase = item.type === "purchase"; const date = new Intl.DateTimeFormat("en", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(item.createdAt)); const hasPrice = Number(item.unitPrice) > 0; const price = hasPrice ? ` · ${formatMoney(item.unitPrice)} each · ${formatMoney(item.total)} total` : ""; return `<article class="history-item"><span class="history-symbol ${purchase ? "purchase" : ""}">${purchase ? "+" : "−"}</span><div class="history-description"><strong>${purchase ? "Purchase received" : "Sale recorded"} · ${escapeHtml(item.model)} ${escapeHtml(item.size)}</strong><small>${date}${price}</small></div><span class="history-quantity ${purchase ? "purchase" : ""}">${purchase ? "+" : "−"}${item.quantity}</span></article>`; }).join("") : '<p class="history-empty">No movements have been recorded yet.</p>';
  renderCharts();
  updatePreview();
}

function formatMoney(value) { return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(value) || 0); }

function renderCharts() {
  const sales = state.history.filter((item) => item.type === "sale");
  const months = Array.from({ length: 6 }, (_, offset) => {
    const date = new Date(); date.setDate(1); date.setMonth(date.getMonth() - (5 - offset));
    return { key: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`, label: new Intl.DateTimeFormat("en", { month: "short" }).format(date), units: 0, dollars: 0 };
  });
  sales.forEach((sale) => {
    const date = new Date(sale.createdAt); if (Number.isNaN(date.getTime())) return;
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    const month = months.find((item) => item.key === key);
    if (month) { month.units += Number(sale.quantity) || 0; month.dollars += Number(sale.total || (Number(sale.quantity) * Number(sale.unitPrice))) || 0; }
  });
  const maxUnits = Math.max(...months.map((item) => item.units), 1);
  const maxDollars = Math.max(...months.map((item) => item.dollars), 1);
  el.monthlyChart.innerHTML = months.map((month) => `<div class="chart-group"><div class="chart-bar" style="height:${(month.units / maxUnits) * 82}%" title="${month.units} units"><span class="chart-value">${month.units || ""}</span></div><div class="chart-bar dollars" style="height:${(month.dollars / maxDollars) * 82}%" title="${formatMoney(month.dollars)}"><span class="chart-value">${month.dollars ? `$${Math.round(month.dollars)}` : ""}</span></div><span class="chart-label">${month.label}</span></div>`).join("");

  const sizes = [...new Set(state.inventory.map((item) => item.size))];
  const modelNames = ["Front Closure", "Lateral Closure"];
  const sizeData = sizes.map((size) => ({
    size,
    front: sales.filter((item) => item.size === size && item.model === modelNames[0]).reduce((sum, item) => sum + Number(item.quantity), 0),
    lateral: sales.filter((item) => item.size === size && item.model === modelNames[1]).reduce((sum, item) => sum + Number(item.quantity), 0),
    stock: state.inventory.filter((item) => item.size === size).reduce((sum, item) => sum + Number(item.stock), 0)
  }));
  const maxSizeValue = Math.max(...sizeData.flatMap((item) => [item.front, item.lateral, item.stock]), 1);
  el.sizeChart.innerHTML = sizeData.map((item) => `<div class="chart-group"><div class="chart-bar front" style="height:${(item.front / maxSizeValue) * 82}%" title="Front Closure: ${item.front} units"><span class="chart-value">${item.front || ""}</span></div><div class="chart-bar lateral" style="height:${(item.lateral / maxSizeValue) * 82}%" title="Lateral Closure: ${item.lateral} units"><span class="chart-value">${item.lateral || ""}</span></div><div class="chart-bar stock" style="height:${(item.stock / maxSizeValue) * 82}%" title="Current stock: ${item.stock} units"><span class="chart-value">${item.stock || ""}</span></div><span class="chart-label">${escapeHtml(item.size)}</span></div>`).join("");
}

async function loadSheet() {
  if (!sheetUrl) { state = { inventory: structuredClone(demoInventory), history: [] }; setSyncStatus("", "Local demo"); populateModels(); render(); return; }
  setSyncStatus("", "Syncing…");
  try {
    const response = await fetch(`${sheetUrl}?action=read&t=${Date.now()}`);
    if (!response.ok) throw new Error("Could not reach the Sheet database.");
    const data = await response.json();
    if (!data.ok || !Array.isArray(data.inventory)) throw new Error(data.error || "Invalid response from Apps Script.");
    state = { inventory: data.inventory, history: data.history || [] };
    setSyncStatus("connected", "Google Sheet synced"); populateModels(); render();
  } catch (error) { setSyncStatus("", "Sync error"); showToast(error.message); }
}

async function recordMovement(payload) {
  if (!sheetUrl) {
    const item = selectedItem();
    if (payload.type === "sale" && payload.quantity > item.stock) throw new Error(`Only ${item.stock} units are available.`);
    item.stock += payload.type === "sale" ? -payload.quantity : payload.quantity;
    state.history.unshift({ ...payload, total: payload.quantity * payload.unitPrice, id: Date.now(), createdAt: new Date().toISOString(), day: localDay() });
    return;
  }
  const response = await fetch(sheetUrl, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify({ action: "movement", ...payload }) });
  const data = await response.json();
  if (!data.ok) throw new Error(data.error || "The movement could not be saved.");
  state = { inventory: data.inventory, history: data.history || [] };
}

document.querySelectorAll(".segment").forEach((button) => button.addEventListener("click", () => { const sale = button.dataset.type === "sale"; document.querySelectorAll(".segment").forEach((item) => item.classList.toggle("active", item === button)); el.type.value = button.dataset.type; el.submit.textContent = sale ? "Record sale" : "Add to inventory"; el.priceLabel.textContent = sale ? "Unit sale price (USD)" : "Unit purchase cost (USD)"; el.message.textContent = ""; }));
const tabs = [...document.querySelectorAll(".tab")];
function activateTab(tab) {
  tabs.forEach((item) => {
    const active = item === tab;
    item.classList.toggle("active", active);
    item.setAttribute("aria-selected", String(active));
    $(`#${item.dataset.panel}`).hidden = !active;
  });
}
tabs.forEach((tab, index) => {
  tab.addEventListener("click", () => activateTab(tab));
  tab.addEventListener("keydown", (event) => {
    if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
    event.preventDefault();
    const offset = event.key === 'ArrowRight' ? 1 : -1;
    const next = tabs[(index + offset + tabs.length) % tabs.length];
    activateTab(next); next.focus();
  });
});
el.model.addEventListener("change", populateSizes); el.size.addEventListener("change", updatePreview); el.search.addEventListener("input", render);
el.form.addEventListener("submit", async (event) => {
  event.preventDefault(); el.message.textContent = ""; const quantity = Number(el.qty.value); const unitPrice = Number(el.price.value);
  if (!Number.isInteger(quantity) || quantity < 1) { el.message.textContent = "Enter a valid quantity."; return; }
  if (!Number.isFinite(unitPrice) || unitPrice <= 0) { el.message.textContent = "Enter a valid unit price."; return; }
  el.submit.disabled = true;
  try { await recordMovement({ type: el.type.value, model: el.model.value, size: el.size.value, quantity, unitPrice }); populateModels(); render(); el.qty.value = 1; el.price.value = ""; showToast(el.type.value === "sale" ? "Sale recorded" : "Purchase added"); }
  catch (error) { el.message.textContent = error.message; }
  finally { el.submit.disabled = false; }
});
$("#settingsButton").addEventListener("click", () => { el.url.value = sheetUrl; el.settingsMessage.textContent = ""; el.dialog.showModal(); });
$("#saveSettingsButton").addEventListener("click", async () => { const value = el.url.value.trim(); if (!/^https:\/\/script\.google\.com\//.test(value)) { el.settingsMessage.textContent = "Enter a valid Google Apps Script URL."; return; } sheetUrl = value; localStorage.setItem(SETTINGS_KEY, sheetUrl); el.dialog.close(); await loadSheet(); });
$("#disconnectButton").addEventListener("click", () => { sheetUrl = ""; localStorage.removeItem(SETTINGS_KEY); el.dialog.close(); loadSheet(); showToast("Switched to local demo data"); });
$("#refreshButton").addEventListener("click", loadSheet);
$("#currentDate").textContent = new Intl.DateTimeFormat("en", { weekday: "long", month: "long", day: "numeric" }).format(new Date());
loadSheet();
