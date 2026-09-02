import { LOW_STOCK_LIMIT } from "./config.js?v=5";
import { elements as el } from "./dom.js?v=5";
import { state } from "./state.js?v=5";
import { escapeHtml, formatMoney } from "./utils.js?v=5";

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
  const sales = state.history.filter((item) => String(item.type || "").trim().toLowerCase() === "sale");
  const months = Array.from({ length: 6 }, (_, offset) => {
    const date = new Date(); date.setDate(1); date.setMonth(date.getMonth() - (5 - offset));
    return { key: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`, label: new Intl.DateTimeFormat("en", { month: "short" }).format(date), units: 0, dollars: 0 };
  });
  sales.forEach((sale) => {
    const date = new Date(sale.createdAt); if (Number.isNaN(date.getTime())) return;
    const month = months.find((item) => item.key === `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`);
    if (month) { month.units += Number(sale.quantity) || 0; month.dollars += Number(sale.total || Number(sale.quantity) * Number(sale.unitPrice)) || 0; }
  });
  const currentMonth = months[months.length - 1];
  el.monthSales.textContent = currentMonth.units;
  el.monthSalesAmount.textContent = formatMoney(currentMonth.dollars);
  const maxUnits = Math.max(...months.map((item) => item.units), 1);
  const maxDollars = Math.max(...months.map((item) => item.dollars), 1);
  el.monthlyChart.innerHTML = months.map((month) => `<div class="chart-group"><div class="chart-bar" style="height:${(month.units / maxUnits) * 82}%" title="${month.units} units"><span class="chart-value">${month.units || ""}</span></div><div class="chart-bar dollars" style="height:${(month.dollars / maxDollars) * 82}%" title="${formatMoney(month.dollars)}"><span class="chart-value">${month.dollars ? `$${Math.round(month.dollars)}` : ""}</span></div><span class="chart-label">${month.label}</span></div>`).join("");

  const [frontModel, lateralModel, beltModel] = ["Front Closure", "Lateral Closure", "Belt"];
  const normalizeModel = (value) => {
    const model = String(value || "").trim().toLowerCase();
    if (!model) return "Unassigned";
    if (model.includes("front") || model.includes("frontal")) return frontModel;
    if (model.includes("lateral") || model.includes("side")) return lateralModel;
    if (model.includes("belt") || model.includes("faja")) return beltModel;
    return String(value || "").trim();
  };
  const normalizeSize = (value) => {
    const size = String(value || "").trim().toLowerCase().replace(/[\s-]/g, "");
    if (!size) return "Unassigned";
    if (["m", "medium", "mediana", "mediano"].includes(size)) return "Medium";
    if (["l", "large", "grande"].includes(size)) return "Large";
    if (["xl", "extralarge"].includes(size)) return "Extra Large";
    if (["2xl", "xxl", "2extralarge"].includes(size)) return "2XL";
    return String(value || "").trim();
  };
  // Both charts use the same movement rows so their unit totals cannot diverge.
  const sourceSales = sales;
  const allTimeSales = [...sourceSales.reduce((totals, sale) => {
    const key = `${normalizeModel(sale.model)}\u0000${normalizeSize(sale.size)}`;
    totals.set(key, (totals.get(key) || 0) + (Number(sale.quantity) || 0));
    return totals;
  }, new Map())].map(([key, quantity]) => {
    const [model, size] = key.split("\u0000");
    return { model, size, quantity };
  });
  const sizes = [...new Set([
    ...state.inventory.map((item) => normalizeSize(item.size)),
    ...allTimeSales.map((item) => item.size)
  ])];
  const sold = (model, size) => allTimeSales
    .filter((item) => item.model === model && item.size === size)
    .reduce((sum, item) => sum + Number(item.quantity), 0);
  const sizeData = sizes.map((size) => ({
    size,
    front: sold(frontModel, size),
    lateral: sold(lateralModel, size),
    belt: sold(beltModel, size),
    other: allTimeSales
      .filter((item) => ![frontModel, lateralModel, beltModel].includes(item.model) && item.size === size)
      .reduce((sum, item) => sum + Number(item.quantity), 0),
    stock: state.inventory.filter((item) => normalizeSize(item.size) === size).reduce((sum, item) => sum + Number(item.stock), 0)
  }));
  const maxSizeValue = Math.max(...sizeData.flatMap((item) => [item.front, item.lateral, item.belt, item.other, item.stock]), 1);
  el.sizeChart.innerHTML = sizeData.map((item) => `<div class="chart-group"><div class="chart-bar front" style="height:${(item.front / maxSizeValue) * 82}%" title="Front Closure: ${item.front} units"><span class="chart-value">${item.front || ""}</span></div><div class="chart-bar lateral" style="height:${(item.lateral / maxSizeValue) * 82}%" title="Lateral Closure: ${item.lateral} units"><span class="chart-value">${item.lateral || ""}</span></div><div class="chart-bar belt" style="height:${(item.belt / maxSizeValue) * 82}%" title="Belt: ${item.belt} units"><span class="chart-value">${item.belt || ""}</span></div><div class="chart-bar other" style="height:${(item.other / maxSizeValue) * 82}%" title="Other / Unassigned: ${item.other} units"><span class="chart-value">${item.other || ""}</span></div><div class="chart-bar stock" style="height:${(item.stock / maxSizeValue) * 82}%" title="Current stock: ${item.stock} units"><span class="chart-value">${item.stock || ""}</span></div><span class="chart-label">${escapeHtml(item.size)}</span></div>`).join("");
}

export function render() {
  el.total.textContent = state.inventory.reduce((sum, item) => sum + Number(item.stock), 0);
  el.refs.textContent = `${state.inventory.length} active references`;

  const term = el.search.value.trim().toLowerCase();
  const filtered = state.inventory.filter((item) => `${item.model} ${item.size}`.toLowerCase().includes(term));
  el.body.innerHTML = filtered.map((item) => { const [label, cls] = stockStatus(item.stock); return `<tr><td data-label="Model">${escapeHtml(item.model)}</td><td data-label="Size">${escapeHtml(item.size)}</td><td data-label="Available" class="quantity">${item.stock}</td><td data-label="Status"><span class="badge ${cls}">${label}</span></td></tr>`; }).join("");
  el.empty.hidden = filtered.length > 0;
  el.history.innerHTML = state.history.length ? state.history.slice(0, 8).map((item) => {
    const purchase = item.type === "purchase";
    const date = new Intl.DateTimeFormat("en", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(item.createdAt));
    const price = Number(item.unitPrice) > 0 ? ` · ${formatMoney(item.unitPrice)} each · ${formatMoney(item.total)} total` : "";
    const customerType = !purchase && item.customerType ? ` (${escapeHtml(item.customerType)})` : "";
    const customer = !purchase && item.customerName ? ` · ${escapeHtml(item.customerName)}${customerType}` : "";
    return `<article class="history-item"><span class="history-symbol ${purchase ? "purchase" : ""}">${purchase ? "+" : "−"}</span><div class="history-description"><strong>${purchase ? "Purchase received" : "Sale recorded"}${customer} · ${escapeHtml(item.model)} ${escapeHtml(item.size)}</strong><small>${date}${price}</small></div><span class="history-quantity ${purchase ? "purchase" : ""}">${purchase ? "+" : "−"}${item.quantity}</span></article>`;
  }).join("") : '<p class="history-empty">No movements have been recorded yet.</p>';
  renderCharts();
  updateMovementPreview();
  updateSalePreview();
}
