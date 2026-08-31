import { LOW_STOCK_LIMIT } from "./config.js";
import { elements as el } from "./dom.js";
import { state } from "./state.js";
import { escapeHtml, formatMoney, localDay } from "./utils.js";

export function setSyncStatus(mode, text) {
  el.sync.className = `sync-status ${mode}`;
  el.sync.innerHTML = `<i></i>${text}`;
}

export function showToast(text) {
  el.toast.textContent = text;
  el.toast.classList.add("show");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => el.toast.classList.remove("show"), 2200);
}

function populateSelect(select, values) {
  const previous = select.value;
  select.innerHTML = values.map((value) => `<option>${escapeHtml(value)}</option>`).join("");
  if (values.includes(previous)) select.value = previous;
}

export function populateMovementModels() {
  populateSelect(el.model, [...new Set(state.inventory.map((item) => item.model))]);
  populateMovementSizes();
}

export function populateMovementSizes() {
  populateSelect(el.size, state.inventory.filter((item) => item.model === el.model.value).map((item) => item.size));
  updateMovementPreview();
}

export function updateMovementPreview() {
  const item = state.inventory.find((entry) => entry.model === el.model.value && entry.size === el.size.value);
  el.preview.textContent = item ? `Currently available: ${item.stock} units` : "";
}

export function populateSaleModels() {
  populateSelect(el.saleModel, [...new Set(state.inventory.map((item) => item.model))]);
  populateSaleSizes();
}

export function populateSaleSizes() {
  populateSelect(el.saleSize, state.inventory.filter((item) => item.model === el.saleModel.value).map((item) => item.size));
  updateSalePreview();
}

export function updateSalePreview() {
  const item = state.inventory.find((entry) => entry.model === el.saleModel.value && entry.size === el.saleSize.value);
  el.salePreview.textContent = item ? `Currently available: ${item.stock} units` : "";
}

export function populateForms() {
  populateMovementModels();
  populateSaleModels();
}

function stockStatus(stock) {
  return stock === 0 ? ["Out of stock", "out"] : stock <= LOW_STOCK_LIMIT ? ["Low stock", "low"] : ["Available", ""];
}

function renderCharts() {
  const sales = state.history.filter((item) => item.type === "sale");
  const months = Array.from({ length: 6 }, (_, offset) => {
    const date = new Date(); date.setDate(1); date.setMonth(date.getMonth() - (5 - offset));
    return { key: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`, label: new Intl.DateTimeFormat("en", { month: "short" }).format(date), units: 0, dollars: 0 };
  });
  sales.forEach((sale) => {
    const date = new Date(sale.createdAt); if (Number.isNaN(date.getTime())) return;
    const month = months.find((item) => item.key === `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`);
    if (month) { month.units += Number(sale.quantity) || 0; month.dollars += Number(sale.total || Number(sale.quantity) * Number(sale.unitPrice)) || 0; }
  });
  const maxUnits = Math.max(...months.map((item) => item.units), 1);
  const maxDollars = Math.max(...months.map((item) => item.dollars), 1);
  el.monthlyChart.innerHTML = months.map((month) => `<div class="chart-group"><div class="chart-bar" style="height:${(month.units / maxUnits) * 82}%" title="${month.units} units"><span class="chart-value">${month.units || ""}</span></div><div class="chart-bar dollars" style="height:${(month.dollars / maxDollars) * 82}%" title="${formatMoney(month.dollars)}"><span class="chart-value">${month.dollars ? `$${Math.round(month.dollars)}` : ""}</span></div><span class="chart-label">${month.label}</span></div>`).join("");

  const sizes = [...new Set(state.inventory.map((item) => item.size))];
  const [frontModel, lateralModel, beltModel] = ["Front Closure", "Lateral Closure", "Belt"];
  const sizeData = sizes.map((size) => ({
    size,
    front: sales.filter((item) => item.size === size && item.model === frontModel).reduce((sum, item) => sum + Number(item.quantity), 0),
    lateral: sales.filter((item) => item.size === size && item.model === lateralModel).reduce((sum, item) => sum + Number(item.quantity), 0),
    belt: sales.filter((item) => item.size === size && item.model === beltModel).reduce((sum, item) => sum + Number(item.quantity), 0),
    stock: state.inventory.filter((item) => item.size === size).reduce((sum, item) => sum + Number(item.stock), 0)
  }));
  const maxSizeValue = Math.max(...sizeData.flatMap((item) => [item.front, item.lateral, item.belt, item.stock]), 1);
  el.sizeChart.innerHTML = sizeData.map((item) => `<div class="chart-group"><div class="chart-bar front" style="height:${(item.front / maxSizeValue) * 82}%" title="Front Closure: ${item.front} units"><span class="chart-value">${item.front || ""}</span></div><div class="chart-bar lateral" style="height:${(item.lateral / maxSizeValue) * 82}%" title="Lateral Closure: ${item.lateral} units"><span class="chart-value">${item.lateral || ""}</span></div><div class="chart-bar belt" style="height:${(item.belt / maxSizeValue) * 82}%" title="Belt: ${item.belt} units"><span class="chart-value">${item.belt || ""}</span></div><div class="chart-bar stock" style="height:${(item.stock / maxSizeValue) * 82}%" title="Current stock: ${item.stock} units"><span class="chart-value">${item.stock || ""}</span></div><span class="chart-label">${escapeHtml(item.size)}</span></div>`).join("");
}

export function render() {
  const today = state.history.filter((item) => item.day === localDay());
  const todaySales = today.filter((item) => item.type === "sale");
  el.total.textContent = state.inventory.reduce((sum, item) => sum + Number(item.stock), 0);
  el.refs.textContent = `${state.inventory.length} active references`;
  el.sales.textContent = todaySales.reduce((sum, item) => sum + Number(item.quantity), 0);
  el.salesAmount.textContent = formatMoney(todaySales.reduce((sum, item) => sum + Number(item.total || Number(item.quantity) * Number(item.unitPrice)), 0));
  el.movements.textContent = today.length ? `${today.length} movement${today.length === 1 ? "" : "s"} today` : "No movements today";

  const term = el.search.value.trim().toLowerCase();
  const filtered = state.inventory.filter((item) => `${item.model} ${item.size}`.toLowerCase().includes(term));
  el.body.innerHTML = filtered.map((item) => { const [label, cls] = stockStatus(item.stock); return `<tr><td data-label="Model">${escapeHtml(item.model)}</td><td data-label="Size">${escapeHtml(item.size)}</td><td data-label="Available" class="quantity">${item.stock}</td><td data-label="Status"><span class="badge ${cls}">${label}</span></td></tr>`; }).join("");
  el.empty.hidden = filtered.length > 0;
  el.history.innerHTML = state.history.length ? state.history.slice(0, 8).map((item) => {
    const purchase = item.type === "purchase";
    const date = new Intl.DateTimeFormat("en", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(item.createdAt));
    const price = Number(item.unitPrice) > 0 ? ` · ${formatMoney(item.unitPrice)} each · ${formatMoney(item.total)} total` : "";
    const customer = !purchase && item.customerName ? ` · ${escapeHtml(item.customerName)}` : "";
    return `<article class="history-item"><span class="history-symbol ${purchase ? "purchase" : ""}">${purchase ? "+" : "−"}</span><div class="history-description"><strong>${purchase ? "Purchase received" : "Sale recorded"}${customer} · ${escapeHtml(item.model)} ${escapeHtml(item.size)}</strong><small>${date}${price}</small></div><span class="history-quantity ${purchase ? "purchase" : ""}">${purchase ? "+" : "−"}${item.quantity}</span></article>`;
  }).join("") : '<p class="history-empty">No movements have been recorded yet.</p>';
  renderCharts();
  updateMovementPreview();
  updateSalePreview();
}
