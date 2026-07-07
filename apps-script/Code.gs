const SHEETS = {
  projects: {
    name: "Projects",
    headers: ["id", "entryDate", "orderNumber", "clientName", "deadline", "value", "done", "paidOut"],
  },
  ads: {
    name: "Fiverr Ads",
    headers: ["id", "date", "amount"],
  },
  withdrawals: {
    name: "Withdrawals",
    headers: ["id", "withdrawalDate", "amount"],
  },
  savingsExpenses: {
    name: "Savings Expenses",
    headers: ["id", "expenseDate", "category", "description", "amount"],
  },
};

function doGet(event) {
  const action = event.parameter.action || "load";
  const callback = event.parameter.callback || "callback";
  const payload = action === "setup" ? setupSpreadsheet() : loadState();

  return ContentService.createTextOutput(`${callback}(${JSON.stringify(payload)})`).setMimeType(
    ContentService.MimeType.JAVASCRIPT
  );
}

function doPost(event) {
  const payload = event.parameter.payload || "{}";
  const state = JSON.parse(payload);
  saveState(state);

  return ContentService.createTextOutput(JSON.stringify({ ok: true })).setMimeType(ContentService.MimeType.JSON);
}

function setupSpreadsheet() {
  Object.keys(SHEETS).forEach((key) => getSheet(key));
  return { ok: true, state: loadState() };
}

function loadState() {
  return {
    selectedYear: new Date().getFullYear(),
    projects: readRows("projects"),
    ads: readRows("ads"),
    withdrawals: readRows("withdrawals"),
    savingsExpenses: readRows("savingsExpenses"),
  };
}

function saveState(state) {
  writeRows("projects", state.projects || []);
  writeRows("ads", state.ads || []);
  writeRows("withdrawals", state.withdrawals || []);
  writeRows("savingsExpenses", state.savingsExpenses || []);
}

function readRows(key) {
  const config = SHEETS[key];
  const sheet = getSheet(key);
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];

  return sheet
    .getRange(2, 1, lastRow - 1, config.headers.length)
    .getValues()
    .filter((row) => row.some((value) => value !== ""))
    .map((row) => {
      const item = {};
      config.headers.forEach((header, index) => {
        item[header] = normalizeValue(row[index]);
      });
      return item;
    });
}

function writeRows(key, rows) {
  const config = SHEETS[key];
  const sheet = getSheet(key);
  sheet.clearContents();
  sheet.getRange(1, 1, 1, config.headers.length).setValues([config.headers]);

  if (!rows.length) return;

  const values = rows.map((row) => config.headers.map((header) => row[header] ?? ""));
  sheet.getRange(2, 1, values.length, config.headers.length).setValues(values);
}

function getSheet(key) {
  const config = SHEETS[key];
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = spreadsheet.getSheetByName(config.name);

  if (!sheet) sheet = spreadsheet.insertSheet(config.name);

  const headerRange = sheet.getRange(1, 1, 1, config.headers.length);
  const currentHeaders = headerRange.getValues()[0];
  const needsHeaders = config.headers.some((header, index) => currentHeaders[index] !== header);

  if (needsHeaders) headerRange.setValues([config.headers]);

  return sheet;
}

function normalizeValue(value) {
  if (value instanceof Date) return Utilities.formatDate(value, Session.getScriptTimeZone(), "yyyy-MM-dd");
  if (value === "TRUE") return true;
  if (value === "FALSE") return false;
  return value;
}
