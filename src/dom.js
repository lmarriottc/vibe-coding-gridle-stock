export const $ = (selector) => document.querySelector(selector);

export const elements = {
  total: $("#totalStock"), refs: $("#referenceCount"), sales: $("#todaySales"),
  salesAmount: $("#todaySalesAmount"), movements: $("#todayMovements"),
  monthlyChart: $("#monthlySalesChart"), sizeChart: $("#sizeSalesChart"),
  body: $("#inventoryBody"), empty: $("#inventoryEmpty"), history: $("#historyList"),
  form: $("#movementForm"), type: $("#movementType"), model: $("#modelSelect"),
  size: $("#sizeSelect"), qty: $("#quantityInput"), price: $("#unitPriceInput"),
  priceLabel: $("#unitPriceLabel"), preview: $("#stockPreview"), submit: $("#submitButton"),
  message: $("#formMessage"), saleDialog: $("#saleDialog"), saleForm: $("#saleForm"),
  saleModel: $("#saleModelSelect"), saleSize: $("#saleSizeSelect"),
  saleQty: $("#saleQuantityInput"), salePrice: $("#saleUnitPriceInput"),
  salePreview: $("#saleStockPreview"), saleSubmit: $("#saleSubmitButton"),
  saleMessage: $("#saleFormMessage"), search: $("#inventorySearch"), sync: $("#syncStatus"),
  settingsDialog: $("#settingsDialog"), url: $("#sheetUrlInput"),
  settingsMessage: $("#settingsMessage"), toast: $("#toast")
};
