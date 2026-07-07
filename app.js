const storageKey = "fiverr-finance-kartiko-afief-v1";
const scriptUrlKey = "fiverr-finance-google-script-url-v1";
const defaultScriptUrl = "";
const months = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

const defaultState = {
  selectedYear: new Date().getFullYear(),
  projects: [],
  ads: [],
  withdrawals: [],
  savingsExpenses: [],
};

let state = loadState();
let remoteSaveTimer = null;

const rupiahLikeUsd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

const el = {
  yearSelect: document.querySelector("#yearSelect"),
  tabs: document.querySelectorAll(".tab-button"),
  panels: document.querySelectorAll(".tab-panel"),
  projectRows: document.querySelector("#projectRows"),
  adRows: document.querySelector("#adRows"),
  withdrawalRows: document.querySelector("#withdrawalRows"),
  monthlyRows: document.querySelector("#monthlyRows"),
  savingsRows: document.querySelector("#savingsRows"),
  savingsExpenseRows: document.querySelector("#savingsExpenseRows"),
  summaryFixed: document.querySelector("#summaryFixed"),
  summaryAds: document.querySelector("#summaryAds"),
  summaryWithdrawals: document.querySelector("#summaryWithdrawals"),
  summarySavingsExpenses: document.querySelector("#summarySavingsExpenses"),
  summarySavings: document.querySelector("#summarySavings"),
  scriptUrlInput: document.querySelector("#scriptUrlInput"),
  syncStatus: document.querySelector("#syncStatus"),
  saveScriptUrl: document.querySelector("#saveScriptUrl"),
  loadFromSheets: document.querySelector("#loadFromSheets"),
  saveToSheets: document.querySelector("#saveToSheets"),
  addProject: document.querySelector("#addProject"),
  addAd: document.querySelector("#addAd"),
  addWithdrawal: document.querySelector("#addWithdrawal"),
  addSavingsExpense: document.querySelector("#addSavingsExpense"),
};

function loadState() {
  const saved = localStorage.getItem(storageKey);
  if (!saved) return structuredClone(defaultState);

  try {
    return { ...structuredClone(defaultState), ...JSON.parse(saved) };
  } catch {
    return structuredClone(defaultState);
  }
}

function saveState() {
  localStorage.setItem(storageKey, JSON.stringify(state));
  queueRemoteSave();
}

function saveStateLocalOnly() {
  localStorage.setItem(storageKey, JSON.stringify(state));
}

function getScriptUrl() {
  return localStorage.getItem(scriptUrlKey) || defaultScriptUrl;
}

function setScriptUrl(url) {
  const cleanUrl = url.trim();
  localStorage.setItem(scriptUrlKey, cleanUrl);
  el.scriptUrlInput.value = cleanUrl;
  setSyncStatus(cleanUrl ? "Google Sheets siap dipakai." : "Mode lokal. Pasang URL Apps Script agar data tersimpan online.");
}

function setSyncStatus(message) {
  el.syncStatus.textContent = message;
}

function queueRemoteSave() {
  const scriptUrl = getScriptUrl();
  if (!scriptUrl) return;

  window.clearTimeout(remoteSaveTimer);
  remoteSaveTimer = window.setTimeout(() => {
    saveToGoogleSheets(false);
  }, 900);
}

async function saveToGoogleSheets(showStatus = true) {
  const scriptUrl = getScriptUrl();
  if (!scriptUrl) {
    setSyncStatus("Tempel dan simpan URL Apps Script dulu.");
    return;
  }

  if (showStatus) setSyncStatus("Menyimpan data ke Google Sheets...");

  try {
    await fetch(scriptUrl, {
      method: "POST",
      mode: "no-cors",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
      },
      body: new URLSearchParams({ payload: JSON.stringify(state) }),
    });
    setSyncStatus(`Tersimpan ke Google Sheets ${formatSyncTime()}.`);
  } catch {
    setSyncStatus("Gagal menyimpan. Cek URL Apps Script dan koneksi internet.");
  }
}

function loadFromGoogleSheets() {
  const scriptUrl = getScriptUrl();
  if (!scriptUrl) {
    setSyncStatus("Tempel dan simpan URL Apps Script dulu.");
    return;
  }

  setSyncStatus("Mengambil data dari Google Sheets...");
  jsonp(`${scriptUrl}${scriptUrl.includes("?") ? "&" : "?"}action=load`)
    .then((remoteState) => {
      if (!hasRemoteData(remoteState)) {
        setSyncStatus("Google Sheets masih kosong. Data lokal tetap dipakai.");
        return;
      }

      state = { ...structuredClone(defaultState), ...remoteState, selectedYear: state.selectedYear };
      saveStateLocalOnly();
      renderAll();
      setSyncStatus(`Data terbaru dari Google Sheets sudah dimuat ${formatSyncTime()}.`);
    })
    .catch(() => {
      setSyncStatus("Gagal mengambil data. Pastikan deployment Apps Script aksesnya Anyone.");
    });
}

function jsonp(url) {
  return new Promise((resolve, reject) => {
    const callbackName = `sheetCallback_${Date.now()}_${Math.round(Math.random() * 100000)}`;
    const script = document.createElement("script");
    const separator = url.includes("?") ? "&" : "?";
    const timeout = window.setTimeout(() => {
      cleanup();
      reject(new Error("timeout"));
    }, 15000);

    window[callbackName] = (data) => {
      cleanup();
      resolve(data);
    };

    script.onerror = () => {
      cleanup();
      reject(new Error("load"));
    };

    script.src = `${url}${separator}callback=${callbackName}`;
    document.body.appendChild(script);

    function cleanup() {
      window.clearTimeout(timeout);
      delete window[callbackName];
      script.remove();
    }
  });
}

function hasRemoteData(remoteState) {
  return ["projects", "ads", "withdrawals", "savingsExpenses"].some((key) => Array.isArray(remoteState?.[key]) && remoteState[key].length > 0);
}

function formatSyncTime() {
  return new Intl.DateTimeFormat("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date());
}

function uid() {
  return crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random());
}

function money(value) {
  return rupiahLikeUsd.format(Number(value) || 0);
}

function numberValue(value) {
  return Number.parseFloat(value) || 0;
}

function rowYear(dateValue) {
  if (!dateValue) return state.selectedYear;
  const date = new Date(`${dateValue}T00:00:00`);
  return date.getFullYear();
}

function rowMonth(dateValue) {
  if (!dateValue) return null;
  const date = new Date(`${dateValue}T00:00:00`);
  return date.getMonth();
}

function itemDate(item) {
  return item.date || item.entryDate || item.withdrawalDate || item.expenseDate;
}

function currentYearItems(items) {
  return items.filter((item) => rowYear(itemDate(item)) === state.selectedYear);
}

function renderYearOptions() {
  const thisYear = new Date().getFullYear();
  const knownYears = new Set([thisYear, state.selectedYear]);
  [...state.projects, ...state.ads, ...state.withdrawals, ...state.savingsExpenses].forEach((item) => {
    knownYears.add(rowYear(itemDate(item)));
  });

  for (let year = thisYear - 2; year <= thisYear + 2; year += 1) knownYears.add(year);

  el.yearSelect.innerHTML = [...knownYears]
    .sort((a, b) => b - a)
    .map((year) => `<option value="${year}">${year}</option>`)
    .join("");
  el.yearSelect.value = String(state.selectedYear);
}

function renderProjects() {
  const projects = currentYearItems(state.projects);
  el.projectRows.innerHTML = "";

  projects.forEach((project) => {
    const fee = numberValue(project.value) * 0.2;
    const fixed = numberValue(project.value) - fee;
    const releaseDate = project.deadline ? addDays(project.deadline, 14) : "";
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><input type="date" value="${project.entryDate || ""}" data-field="entryDate"></td>
      <td><input type="text" value="${escapeAttr(project.orderNumber)}" data-field="orderNumber" placeholder="FO..."></td>
      <td><input type="text" value="${escapeAttr(project.clientName)}" data-field="clientName" placeholder="Nama klien"></td>
      <td><input type="date" value="${project.deadline || ""}" data-field="deadline"></td>
      <td><input class="money" type="number" min="0" step="0.01" value="${project.value || ""}" data-field="value" placeholder="0.00"></td>
      <td class="readonly-money">${money(fee)}</td>
      <td class="readonly-money">${money(fixed)}</td>
      <td><input type="checkbox" ${project.done ? "checked" : ""} data-field="done"></td>
      <td>
        <input type="checkbox" ${project.paidOut ? "checked" : ""} data-field="paidOut">
        ${releaseDate ? `<span class="status-note">Estimasi ${formatDate(releaseDate)}</span>` : ""}
      </td>
      <td></td>
    `;
    bindRow(tr, project);
    appendDeleteButton(tr.lastElementChild, "projects", project.id);
    el.projectRows.appendChild(tr);
  });
}

function renderAds() {
  const ads = currentYearItems(state.ads);
  el.adRows.innerHTML = "";

  ads.forEach((ad, index) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${index + 1}</td>
      <td><input type="date" value="${ad.date || ""}" data-field="date"></td>
      <td><input class="money" type="number" min="0" step="0.01" value="${ad.amount || ""}" data-field="amount" placeholder="0.00"></td>
      <td></td>
    `;
    bindRow(tr, ad);
    appendDeleteButton(tr.lastElementChild, "ads", ad.id);
    el.adRows.appendChild(tr);
  });
}

function renderWithdrawals() {
  const withdrawals = currentYearItems(state.withdrawals);
  el.withdrawalRows.innerHTML = "";

  withdrawals.forEach((withdrawal) => {
    const total = numberValue(withdrawal.amount);
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><input type="date" value="${withdrawal.withdrawalDate || ""}" data-field="withdrawalDate"></td>
      <td><input class="money" type="number" min="0" step="0.01" value="${withdrawal.amount || ""}" data-field="amount" placeholder="0.00"></td>
      <td class="readonly-money">${money(total * 0.3)}</td>
      <td class="readonly-money">${money(total * 0.35)}</td>
      <td class="readonly-money">${money(total * 0.35)}</td>
      <td></td>
    `;
    bindRow(tr, withdrawal);
    appendDeleteButton(tr.lastElementChild, "withdrawals", withdrawal.id);
    el.withdrawalRows.appendChild(tr);
  });
}

function renderSavingsExpenses() {
  const savingsExpenses = currentYearItems(state.savingsExpenses);
  el.savingsExpenseRows.innerHTML = "";

  savingsExpenses.forEach((expense, index) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${index + 1}</td>
      <td><input type="date" value="${expense.expenseDate || ""}" data-field="expenseDate"></td>
      <td>
        <select data-field="category">
          ${expenseCategoryOptions(expense.category)}
        </select>
      </td>
      <td><input type="text" value="${escapeAttr(expense.description)}" data-field="description" placeholder="Contoh: Adobe, laptop, servis"></td>
      <td><input class="money" type="number" min="0" step="0.01" value="${expense.amount || ""}" data-field="amount" placeholder="0.00"></td>
      <td></td>
    `;
    bindRow(tr, expense);
    appendDeleteButton(tr.lastElementChild, "savingsExpenses", expense.id);
    el.savingsExpenseRows.appendChild(tr);
  });
}

function renderMonthly() {
  const totals = monthlyWithdrawalTotals();
  el.monthlyRows.innerHTML = "";

  months.forEach((month, index) => {
    const total = totals[index];
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${month}</td>
      <td class="readonly-money">${money(total)}</td>
      <td class="readonly-money">${money(total * 0.3)}</td>
      <td class="readonly-money">${money(total * 0.35)}</td>
      <td class="readonly-money">${money(total * 0.35)}</td>
    `;
    el.monthlyRows.appendChild(tr);
  });
}

function renderSavings() {
  const totals = monthlyWithdrawalTotals();
  const expenseTotals = monthlySavingsExpenseTotals();
  let running = 0;
  el.savingsRows.innerHTML = "";

  months.forEach((month, index) => {
    const savings = totals[index] * 0.3;
    const expense = expenseTotals[index];
    const balance = savings - expense;
    running += balance;
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${month}</td>
      <td class="readonly-money">${money(savings)}</td>
      <td class="readonly-money">${money(expense)}</td>
      <td class="readonly-money">${money(balance)}</td>
      <td class="readonly-money">${money(running)}</td>
    `;
    el.savingsRows.appendChild(tr);
  });
}

function renderSummary() {
  const fixedTotal = currentYearItems(state.projects).reduce((sum, item) => sum + numberValue(item.value) * 0.8, 0);
  const adsTotal = currentYearItems(state.ads).reduce((sum, item) => sum + numberValue(item.amount), 0);
  const withdrawalTotal = currentYearItems(state.withdrawals).reduce((sum, item) => sum + numberValue(item.amount), 0);
  const savingsExpenseTotal = currentYearItems(state.savingsExpenses).reduce((sum, item) => sum + numberValue(item.amount), 0);
  const savingsIn = withdrawalTotal * 0.3;

  el.summaryFixed.textContent = money(fixedTotal);
  el.summaryAds.textContent = money(adsTotal);
  el.summaryWithdrawals.textContent = money(withdrawalTotal);
  el.summarySavingsExpenses.textContent = money(savingsExpenseTotal);
  el.summarySavings.textContent = money(savingsIn - savingsExpenseTotal);
}

function monthlyWithdrawalTotals() {
  const totals = Array(12).fill(0);
  currentYearItems(state.withdrawals).forEach((withdrawal) => {
    const month = rowMonth(withdrawal.withdrawalDate);
    if (month !== null) totals[month] += numberValue(withdrawal.amount);
  });
  return totals;
}

function monthlySavingsExpenseTotals() {
  const totals = Array(12).fill(0);
  currentYearItems(state.savingsExpenses).forEach((expense) => {
    const month = rowMonth(expense.expenseDate);
    if (month !== null) totals[month] += numberValue(expense.amount);
  });
  return totals;
}

function expenseCategoryOptions(selected = "Software") {
  return ["Software", "Pembelian Barang", "Servis", "Lainnya"]
    .map((category) => `<option value="${category}" ${category === selected ? "selected" : ""}>${category}</option>`)
    .join("");
}

function bindRow(row, item) {
  row.querySelectorAll("[data-field]").forEach((input) => {
    input.addEventListener("input", () => updateItem(item, input));
    input.addEventListener("change", () => {
      updateItem(item, input);
      renderAll();
    });
  });
}

function updateItem(item, input) {
  const value = input.type === "checkbox" ? input.checked : input.value;
  item[input.dataset.field] = value;
  saveState();
}

function appendDeleteButton(cell, collection, id) {
  const button = document.querySelector("#deleteButtonTemplate").content.firstElementChild.cloneNode(true);
  button.addEventListener("click", () => {
    state[collection] = state[collection].filter((item) => item.id !== id);
    saveState();
    renderAll();
  });
  cell.appendChild(button);
}

function addDays(dateString, days) {
  const date = new Date(`${dateString}T00:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function formatDate(dateString) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(`${dateString}T00:00:00`));
}

function escapeAttr(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function renderAll() {
  renderYearOptions();
  renderProjects();
  renderAds();
  renderWithdrawals();
  renderSavingsExpenses();
  renderMonthly();
  renderSavings();
  renderSummary();
}

el.tabs.forEach((button) => {
  button.addEventListener("click", () => {
    el.tabs.forEach((tab) => tab.classList.toggle("active", tab === button));
    el.panels.forEach((panel) => panel.classList.toggle("active", panel.id === button.dataset.tab));
    renderAll();
  });
});

el.yearSelect.addEventListener("change", () => {
  state.selectedYear = Number(el.yearSelect.value);
  saveState();
  renderAll();
});

el.saveScriptUrl.addEventListener("click", () => {
  setScriptUrl(el.scriptUrlInput.value);
});

el.loadFromSheets.addEventListener("click", () => {
  loadFromGoogleSheets();
});

el.saveToSheets.addEventListener("click", () => {
  saveToGoogleSheets(true);
});

el.addProject.addEventListener("click", () => {
  state.projects.push({
    id: uid(),
    entryDate: `${state.selectedYear}-01-01`,
    orderNumber: "",
    clientName: "",
    deadline: "",
    value: "",
    done: false,
    paidOut: false,
  });
  saveState();
  renderAll();
});

el.addAd.addEventListener("click", () => {
  state.ads.push({
    id: uid(),
    date: `${state.selectedYear}-01-01`,
    amount: "",
  });
  saveState();
  renderAll();
});

el.addWithdrawal.addEventListener("click", () => {
  state.withdrawals.push({
    id: uid(),
    withdrawalDate: `${state.selectedYear}-01-01`,
    amount: "",
  });
  saveState();
  renderAll();
});

el.addSavingsExpense.addEventListener("click", () => {
  state.savingsExpenses.push({
    id: uid(),
    expenseDate: `${state.selectedYear}-01-01`,
    category: "Software",
    description: "",
    amount: "",
  });
  saveState();
  renderAll();
});

el.scriptUrlInput.value = getScriptUrl();
setSyncStatus(getScriptUrl() ? "Google Sheets siap dipakai." : "Mode lokal. Pasang URL Apps Script agar data tersimpan online.");
renderAll();
if (getScriptUrl()) loadFromGoogleSheets();
