import { recordMovement, loadData } from "./api.js?v=5";
import { $, elements as el } from "./dom.js?v=5";
import { getSheetUrl, state } from "./state.js?v=5";
import { escapeHtml } from "./utils.js?v=5";
import { populateForms, populateMovementSizes, populateSaleModels, populateSaleSizes, render, showToast, updateMovementPreview, updateSalePreview } from "./ui.js?v=5";

const CUSTOMER_TYPES = ["Maribi", "Otro"];

async function submitMovement({ type, model, size, quantityInput, priceInput, customerInput, customerTypeInput, submitButton, message }) {
  message.textContent = "";
  const quantity = Number(quantityInput.value); const unitPrice = Number(priceInput.value);
  const customerName = type === "sale" ? customerInput.value.trim() : "";
  const customerType = type === "sale" ? customerTypeInput.value : "";
  if (type === "sale" && !customerName) { message.textContent = "Enter the customer name."; return false; }
  if (type === "sale" && !CUSTOMER_TYPES.includes(customerType)) { message.textContent = "Select a valid customer type."; return false; }
  if (!Number.isInteger(quantity) || quantity < 1) { message.textContent = "Enter a valid quantity."; return false; }
  if (!Number.isFinite(unitPrice) || unitPrice <= 0) { message.textContent = "Enter a valid unit price."; return false; }
  submitButton.disabled = true;
  try {
    await recordMovement({ type, model: model.value, size: size.value, quantity, unitPrice, customerName, customerType });
    if (getSheetUrl()) await loadData(); else { populateForms(); render(); }
    quantityInput.value = 1; priceInput.value = ""; if (customerInput) customerInput.value = ""; if (customerTypeInput) customerTypeInput.value = "";
    showToast(type === "sale" ? "Sale recorded" : "Purchase added");
    return true;
  } catch (error) { message.textContent = error.message; return false; }
  finally { submitButton.disabled = false; }
}

function options(values) {
  return values.map((value) => `<option>${escapeHtml(value)}</option>`).join("");
}

function updateAdditionalSizes(item) {
  const model = item.querySelector(".movement-model");
  const size = item.querySelector(".movement-size");
  const previous = size.value;
  const sizes = state.inventory.filter((entry) => entry.model === model.value).map((entry) => entry.size);
  size.innerHTML = options(sizes);
  if (sizes.includes(previous)) size.value = previous;
  updateAdditionalPreview(item);
}

function updateAdditionalPreview(item) {
  const model = item.querySelector(".movement-model").value;
  const size = item.querySelector(".movement-size").value;
  const inventory = state.inventory.find((entry) => entry.model === model && entry.size === size);
  item.querySelector(".stock-preview").textContent = inventory ? `Currently available: ${inventory.stock} units` : "";
}

function addMovementItem() {
  const item = document.createElement("div");
  item.className = "movement-item";
  item.innerHTML = `<div class="movement-item-heading"><span>Additional item</span><button class="remove-movement-button" type="button">Remove</button></div><div class="movement-customer-field movement-customer-fields"><label>Customer name<input class="movement-customer" type="text" maxlength="120" autocomplete="name" placeholder="Enter customer name"></label><label>Customer type<select class="movement-customer-type"><option value="" selected disabled>Select customer type</option><option value="Maribi">Maribi</option><option value="Otro">Otro</option></select></label></div><p class="inherited-customer-preview" hidden></p><label>Model<select class="movement-model" required>${options([...new Set(state.inventory.map((entry) => entry.model))])}</select></label><div class="form-row"><label>Size<select class="movement-size" required></select></label><label>Quantity<input class="movement-quantity" type="number" min="1" step="1" value="1" required></label></div><label class="price-field"><span class="movement-price-label">${el.type.value === "sale" ? "Unit sale price (USD)" : "Unit purchase cost (USD)"}</span><input class="movement-price" type="number" min="0.01" step="0.01" placeholder="0.00" required></label><p class="stock-preview"></p>`;
  $("#movementItems").append(item);
  item.querySelector(".movement-model").addEventListener("change", () => updateAdditionalSizes(item));
  item.querySelector(".movement-size").addEventListener("change", () => updateAdditionalPreview(item));
  item.querySelector(".remove-movement-button").addEventListener("click", () => item.remove());
  updateAdditionalSizes(item);
  updateCustomerFields();
}

function updateCustomerFields() {
  const sale = el.type.value === "sale";
  const inherit = el.inheritCustomer.checked;
  const firstCustomer = el.customer.value.trim();
  const firstCustomerType = el.customerType.value;
  el.customerInheritance.hidden = !sale;
  [...document.querySelectorAll("#movementItems .movement-item")].forEach((item, index) => {
    const field = item.querySelector(".movement-customer-field");
    const input = item.querySelector(".movement-customer");
    const typeInput = item.querySelector(".movement-customer-type");
    const inheritedPreview = item.querySelector(".inherited-customer-preview");
    if (sale && inherit && index > 0) {
      input.value = firstCustomer;
      typeInput.value = firstCustomerType;
    }
    const active = sale && (index === 0 || !inherit);
    field.hidden = !active; input.disabled = !active; input.required = active; typeInput.disabled = !active; typeInput.required = active;
    if (inheritedPreview) {
      inheritedPreview.hidden = !(sale && inherit && index > 0);
      inheritedPreview.textContent = firstCustomer || firstCustomerType
        ? `Customer inherited: ${firstCustomer || "No name"}${firstCustomerType ? ` (${firstCustomerType})` : ""}`
        : "Complete the first customer's name and type.";
    }
  });
}

function readMovementItems() {
  const firstCustomer = el.customer.value.trim();
  const firstCustomerType = el.customerType.value;
  return [...document.querySelectorAll("#movementItems .movement-item")].map((item, index) => ({
    type: el.type.value,
    model: item.querySelector(".movement-model").value,
    size: item.querySelector(".movement-size").value,
    quantity: Number(item.querySelector(".movement-quantity").value),
    unitPrice: Number(item.querySelector(".movement-price").value),
    customerName: el.type.value === "sale" ? (index > 0 && el.inheritCustomer.checked ? firstCustomer : item.querySelector(".movement-customer").value.trim()) : "",
    customerType: el.type.value === "sale" ? (index > 0 && el.inheritCustomer.checked ? firstCustomerType : item.querySelector(".movement-customer-type").value) : ""
  }));
}

function validateMovementItems(items) {
  if (el.type.value === "sale" && items.some((item) => !item.customerName)) return "Enter the customer name for every sale.";
  if (el.type.value === "sale" && items.some((item) => !CUSTOMER_TYPES.includes(item.customerType))) return "Select a valid customer type for every sale.";
  if (items.some((item) => !Number.isInteger(item.quantity) || item.quantity < 1)) return "Enter a valid quantity for every item.";
  if (items.some((item) => !Number.isFinite(item.unitPrice) || item.unitPrice <= 0)) return "Enter a valid unit price for every item.";
  if (el.type.value === "sale") {
    const requested = new Map();
    items.forEach((item) => { const key = `${item.model}\u0000${item.size}`; requested.set(key, (requested.get(key) || 0) + item.quantity); });
    for (const [key, quantity] of requested) {
      const [model, size] = key.split("\u0000");
      const inventory = state.inventory.find((item) => item.model === model && item.size === size);
      if (!inventory || quantity > inventory.stock) return `Only ${inventory?.stock || 0} units are available for ${model} ${size}.`;
    }
  }
  return "";
}

async function submitMovementBatch() {
  el.message.textContent = "";
  const items = readMovementItems();
  const validationError = validateMovementItems(items);
  if (validationError) { el.message.textContent = validationError; return; }
  el.submit.disabled = true; $("#addMovementButton").disabled = true;
  let saved = 0;
  try {
    for (const item of items) { await recordMovement(item); saved += 1; }
    if (getSheetUrl()) await loadData(); else { populateForms(); render(); }
    [...document.querySelectorAll("#movementItems .movement-item")].slice(1).forEach((item) => item.remove());
    el.qty.value = 1; el.price.value = "";
    document.querySelectorAll("#movementItems .movement-customer").forEach((input) => { input.value = ""; });
    document.querySelectorAll("#movementItems .movement-customer-type").forEach((input) => { input.value = ""; });
    showToast(`${items.length} ${items.length === 1 ? "movement" : "movements"} recorded`);
  } catch (error) {
    el.message.textContent = saved ? `${saved} item(s) saved before the error: ${error.message}` : error.message;
    if (saved && getSheetUrl()) await loadData(); else if (saved) { populateForms(); render(); }
  } finally { el.submit.disabled = false; $("#addMovementButton").disabled = false; }
}

export function initializeForms() {
  document.querySelectorAll(".segment").forEach((button) => button.addEventListener("click", () => {
    const sale = button.dataset.type === "sale";
    document.querySelectorAll(".segment").forEach((item) => item.classList.toggle("active", item === button));
    el.type.value = button.dataset.type; el.submit.textContent = sale ? "Record sale" : "Add to inventory";
    updateCustomerFields();
    document.querySelectorAll(".movement-price-label").forEach((label) => { label.textContent = sale ? "Unit sale price (USD)" : "Unit purchase cost (USD)"; });
    el.message.textContent = "";
  }));
  el.model.addEventListener("change", populateMovementSizes); el.size.addEventListener("change", updateMovementPreview);
  el.inheritCustomer.addEventListener("change", updateCustomerFields);
  el.customer.addEventListener("input", updateCustomerFields);
  el.customerType.addEventListener("change", updateCustomerFields);
  el.saleModel.addEventListener("change", populateSaleSizes); el.saleSize.addEventListener("change", updateSalePreview);
  el.form.addEventListener("submit", async (event) => {
    event.preventDefault(); await submitMovementBatch();
  });
  $("#addMovementButton").addEventListener("click", addMovementItem);
  $("#newSaleButton").addEventListener("click", () => { populateSaleModels(); el.saleMessage.textContent = ""; el.saleDialog.showModal(); el.saleCustomer.focus(); });
  $("#closeSaleButton").addEventListener("click", () => el.saleDialog.close());
  el.saleForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const saved = await submitMovement({ type: "sale", model: el.saleModel, size: el.saleSize, quantityInput: el.saleQty, priceInput: el.salePrice, customerInput: el.saleCustomer, customerTypeInput: el.saleCustomerType, submitButton: el.saleSubmit, message: el.saleMessage });
    if (saved) el.saleDialog.close();
  });
}
