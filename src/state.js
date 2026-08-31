import { demoInventory, SETTINGS_KEY } from "./config.js";

export const state = {
  inventory: structuredClone(demoInventory),
  history: []
};

let sheetUrl = localStorage.getItem(SETTINGS_KEY) || "";

export function replaceState(data) {
  state.inventory = data.inventory;
  state.history = data.history || [];
}

export function resetDemoState() {
  replaceState({ inventory: structuredClone(demoInventory), history: [] });
}

export function getSheetUrl() { return sheetUrl; }

export function saveSheetUrl(value) {
  sheetUrl = value;
  localStorage.setItem(SETTINGS_KEY, value);
}

export function clearSheetUrl() {
  sheetUrl = "";
  localStorage.removeItem(SETTINGS_KEY);
}
