import { elements as el } from "./dom.js?v=6";
import { state } from "./state.js?v=6";
import { escapeHtml, formatMoney, localDay } from "./utils.js?v=6";

let filteredSales = [];

function movementDay(item) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(String(item.day || ""))) return item.day;
  const date = new Date(item.createdAt);
  return Number.isNaN(date.getTime()) ? "" : localDay(date);
}

function displayDate(day) {
  if (!day) return "";
  const [year, month, date] = day.split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", { year: "numeric", month: "short", day: "numeric" }).format(new Date(year, month - 1, date));
}

function saleTotal(item) {
  const storedTotal = Number(item.total);
  return Number.isFinite(storedTotal) && storedTotal !== 0
    ? storedTotal
    : (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0);
}

function reportRows() {
  const start = el.reportStart.value;
  const end = el.reportEnd.value;
  const customerType = el.reportCustomerType.value;
  return state.history
    .filter((item) => String(item.type || "").trim().toLowerCase() === "sale")
    .filter((item) => {
      const day = movementDay(item);
      return day && day >= start && day <= end && (!customerType || item.customerType === customerType);
    })
    .sort((a, b) => movementDay(a).localeCompare(movementDay(b)) || String(a.createdAt).localeCompare(String(b.createdAt)));
}

export function renderSalesReport() {
  el.reportMessage.textContent = "";
  if (!el.reportStart.value || !el.reportEnd.value) return;
  if (el.reportStart.value > el.reportEnd.value) {
    filteredSales = [];
    el.reportMessage.textContent = "The start date cannot be after the end date.";
  } else {
    filteredSales = reportRows();
  }

  el.reportBody.innerHTML = filteredSales.map((item) => {
    const day = movementDay(item);
    return `<tr><td data-label="Date">${escapeHtml(displayDate(day))}</td><td data-label="Customer type">${escapeHtml(item.customerType || "Not specified")}</td><td data-label="Customer name">${escapeHtml(item.customerName || "Not specified")}</td><td data-label="Model">${escapeHtml(item.model)}</td><td data-label="Size">${escapeHtml(item.size)}</td><td data-label="Quantity" class="quantity">${Number(item.quantity) || 0}</td><td data-label="Total sale" class="report-money">${formatMoney(saleTotal(item))}</td></tr>`;
  }).join("");
  const total = filteredSales.reduce((sum, item) => sum + saleTotal(item), 0);
  const units = filteredSales.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
  el.reportCount.textContent = `${filteredSales.length} ${filteredSales.length === 1 ? "sale" : "sales"} · ${units} units`;
  el.reportTotal.textContent = formatMoney(total);
  el.reportEmpty.hidden = filteredSales.length > 0;
  el.reportEmpty.textContent = el.reportMessage.textContent ? "" : "No sales match the selected filters.";
  el.reportDownload.disabled = filteredSales.length === 0;
}

function xmlEscape(value) {
  return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&apos;");
}

function excelCell(value, type = "String", style = "") {
  return `<Cell${style ? ` ss:StyleID="${style}"` : ""}><Data ss:Type="${type}">${xmlEscape(value)}</Data></Cell>`;
}

function downloadExcel() {
  if (!filteredSales.length) return;
  const headers = ["Date", "Customer Type", "Customer Name", "Model", "Size", "Quantity", "Total Sale"];
  const rows = filteredSales.map((item) => `<Row>${excelCell(movementDay(item))}${excelCell(item.customerType || "Not specified")}${excelCell(item.customerName || "Not specified")}${excelCell(item.model)}${excelCell(item.size)}${excelCell(Number(item.quantity) || 0, "Number")}${excelCell(saleTotal(item), "Number", "Money")}</Row>`).join("");
  const total = filteredSales.reduce((sum, item) => sum + saleTotal(item), 0);
  const workbook = `<?xml version="1.0"?><Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"><Styles><Style ss:ID="Default" ss:Name="Normal"><Alignment ss:Vertical="Bottom"/><Borders/><Font/><Interior/><NumberFormat/><Protection/></Style><Style ss:ID="Header"><Font ss:Bold="1" ss:Color="#FFFFFF"/><Interior ss:Color="#1D604C" ss:Pattern="Solid"/></Style><Style ss:ID="Money"><NumberFormat ss:Format="Currency"/></Style></Styles><Worksheet ss:Name="Sales Report"><Table><Column ss:Width="85"/><Column ss:Width="100"/><Column ss:Width="150"/><Column ss:Width="110"/><Column ss:Width="85"/><Column ss:Width="65"/><Column ss:Width="90"/><Row>${headers.map((header) => excelCell(header, "String", "Header")).join("")}</Row>${rows}<Row>${excelCell("")}${excelCell("")}${excelCell("")}${excelCell("")}${excelCell("TOTAL", "String", "Header")}${excelCell(filteredSales.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0), "Number")}${excelCell(total, "Number", "Money")}</Row></Table></Worksheet></Workbook>`;
  const blob = new Blob([workbook], { type: "application/vnd.ms-excel;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `sales-report-${el.reportStart.value}-to-${el.reportEnd.value}.xls`;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function initializeReports() {
  const today = new Date();
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  el.reportStart.value = localDay(monthStart);
  el.reportEnd.value = localDay(today);
  el.reportForm.addEventListener("submit", (event) => { event.preventDefault(); renderSalesReport(); });
  el.reportDownload.addEventListener("click", downloadExcel);
}
