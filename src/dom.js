export const $ = (selector) => document.querySelector(selector);

export const elements = {
  total: $("#totalStock"), refs: $("#referenceCount"),
  monthSales: $("#monthSales"), monthSalesAmount: $("#monthSalesAmount"),
  monthlyChart: $("#monthlySalesChart"), sizeChart: $("#sizeSalesChart"),
  body: $("#inventoryBody"), empty: $("#inventoryEmpty"), history: $("#historyList"),
  form: $("#movementForm"), type: $("#movementType"), model: $("#modelSelect"),
  size: $("#sizeSelect"), qty: $("#quantityInput"), price: $("#unitPriceInput"),
  customer: $("#customerNameInput"), customerType: $("#customerTypeSelect"), customerInheritance: $("#customerInheritance"),
  inheritCustomer: $("#inheritCustomerName"),
  priceLabel: $("#unitPriceLabel"), preview: $("#stockPreview"), submit: $("#submitButton"),
  message: $("#formMessage"), saleDialog: $("#saleDialog"), saleForm: $("#saleForm"),
  saleModel: $("#saleModelSelect"), saleSize: $("#saleSizeSelect"),
  saleQty: $("#saleQuantityInput"), salePrice: $("#saleUnitPriceInput"),
  saleCustomer: $("#saleCustomerNameInput"), saleCustomerType: $("#saleCustomerTypeSelect"),
  salePreview: $("#saleStockPreview"), saleSubmit: $("#saleSubmitButton"),
  saleMessage: $("#saleFormMessage"), search: $("#inventorySearch"), sync: $("#syncStatus"),
  settingsDialog: $("#settingsDialog"), url: $("#sheetUrlInput"),
  settingsMessage: $("#settingsMessage"), toast: $("#toast")
};
