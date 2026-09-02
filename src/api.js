import { getSheetUrl, replaceState, resetDemoState, state } from "./state.js?v=5";
import { localDay } from "./utils.js?v=5";
import { populateForms, render, setSyncStatus, showToast } from "./ui.js?v=5";

let activeLoad = null;

async function performLoad() {
  const sheetUrl = getSheetUrl();
  if (!sheetUrl) {
    resetDemoState(); setSyncStatus("", "Local demo"); populateForms(); render();
    return true;
  }
  setSyncStatus("", "Syncing…");
  try {
    const response = await fetch(`${sheetUrl}?action=read&t=${Date.now()}`);
    if (!response.ok) throw new Error("Could not reach the Sheet database.");
    const data = await response.json();
    if (!data.ok || !Array.isArray(data.inventory)) throw new Error(data.error || "Invalid response from Apps Script.");
    const time = new Intl.DateTimeFormat("en", { hour: "numeric", minute: "2-digit" }).format(new Date());
    replaceState(data); setSyncStatus("connected", `Live · ${time}`); populateForms(); render();
    return true;
  } catch (error) {
    setSyncStatus("", "Sync error"); showToast(error.message);
    return false;
  }
}

export function loadData() {
  if (activeLoad) return activeLoad;
  activeLoad = performLoad().finally(() => { activeLoad = null; });
  return activeLoad;
}

export async function recordMovement(payload) {
  const sheetUrl = getSheetUrl();
  if (!sheetUrl) {
    const item = state.inventory.find((entry) => entry.model === payload.model && entry.size === payload.size);
    if (!item) throw new Error("The selected inventory reference is unavailable.");
    if (payload.type === "sale" && payload.quantity > item.stock) throw new Error(`Only ${item.stock} units are available.`);
    item.stock += payload.type === "sale" ? -payload.quantity : payload.quantity;
    state.history.unshift({ ...payload, total: payload.quantity * payload.unitPrice, id: Date.now(), createdAt: new Date().toISOString(), day: localDay() });
    return;
  }
  const response = await fetch(sheetUrl, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify({ action: "movement", ...payload }) });
  const data = await response.json();
  if (!data.ok) throw new Error(data.error || "The movement could not be saved.");
  replaceState(data);
}
