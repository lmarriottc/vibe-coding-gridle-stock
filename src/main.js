import { loadData } from "./api.js";
import { $, elements as el } from "./dom.js";
import { initializeForms } from "./forms.js";
import { clearSheetUrl, getSheetUrl, saveSheetUrl } from "./state.js";
import { render, showToast } from "./ui.js";

function initializeTabs() {
  const tabs = [...document.querySelectorAll(".tab")];
  const activateTab = (tab) => tabs.forEach((item) => {
    const active = item === tab;
    item.classList.toggle("active", active); item.setAttribute("aria-selected", String(active));
    $(`#${item.dataset.panel}`).hidden = !active;
  });
  tabs.forEach((tab, index) => {
    tab.addEventListener("click", () => activateTab(tab));
    tab.addEventListener("keydown", (event) => {
      if (!["ArrowLeft", "ArrowRight"].includes(event.key)) return;
      event.preventDefault();
      const next = tabs[(index + (event.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length];
      activateTab(next); next.focus();
    });
  });
}

function initializeSettings() {
  $("#settingsButton").addEventListener("click", () => { el.url.value = getSheetUrl(); el.settingsMessage.textContent = ""; el.settingsDialog.showModal(); });
  $("#saveSettingsButton").addEventListener("click", async () => {
    const value = el.url.value.trim();
    if (!/^https:\/\/script\.google\.com\//.test(value)) { el.settingsMessage.textContent = "Enter a valid Google Apps Script URL."; return; }
    saveSheetUrl(value); el.settingsDialog.close(); await loadData();
  });
  $("#disconnectButton").addEventListener("click", async () => {
    clearSheetUrl(); el.settingsDialog.close(); await loadData(); showToast("Switched to local demo data");
  });
  $("#refreshButton").addEventListener("click", loadData);
}

function initializeLiveSync() {
  const refreshStock = () => {
    if (getSheetUrl() && document.visibilityState === "visible" && navigator.onLine) loadData();
  };
  window.setInterval(refreshStock, 30000);
  window.addEventListener("focus", refreshStock);
  window.addEventListener("online", refreshStock);
  document.addEventListener("visibilitychange", refreshStock);
}

initializeTabs();
initializeForms();
initializeSettings();
initializeLiveSync();
el.search.addEventListener("input", render);
$("#currentDate").textContent = new Intl.DateTimeFormat("en", { weekday: "long", month: "long", day: "numeric" }).format(new Date());
loadData();
