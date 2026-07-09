/* =========================================================
   KANAKKU — Personal Expense Ledger
   Vanilla JS, localStorage-backed, no dependencies.
   ========================================================= */

(function () {
  "use strict";

  /* ---------------- 25 CATEGORIES ---------------- */
  const CATEGORIES = [
    { id: "travel",      name: "Travel",              icon: "✈️" },
    { id: "food",        name: "Food & Dining",       icon: "🍛" },
    { id: "shopping",    name: "Shopping",            icon: "🛍️" },
    { id: "function",    name: "Function / Events",   icon: "🎉" },
    { id: "bills",       name: "Bills & Utilities",   icon: "💡" },
    { id: "groceries",   name: "Groceries",           icon: "🧺" },
    { id: "fuel",        name: "Fuel & Transport",    icon: "⛽" },
    { id: "health",      name: "Health & Medical",    icon: "💊" },
    { id: "education",   name: "Education",           icon: "📚" },
    { id: "rent",        name: "Rent",                icon: "🏠" },
    { id: "mobile",      name: "Mobile & Internet",   icon: "📱" },
    { id: "subs",        name: "Subscriptions",       icon: "🔁" },
    { id: "entertainment", name: "Entertainment",     icon: "🎬" },
    { id: "gifts",       name: "Gifts",               icon: "🎁" },
    { id: "insurance",   name: "Insurance",           icon: "🛡️" },
    { id: "investment",  name: "Investment / Savings",icon: "📈" },
    { id: "personalcare",name: "Personal Care",       icon: "💇" },
    { id: "pets",        name: "Pets",                icon: "🐾" },
    { id: "kids",        name: "Kids",                icon: "🧸" },
    { id: "homedecor",   name: "Home & Décor",        icon: "🛋️" },
    { id: "electronics", name: "Electronics",         icon: "🔌" },
    { id: "fitness",     name: "Fitness",             icon: "🏋️" },
    { id: "charity",     name: "Charity / Donation",  icon: "🤝" },
    { id: "repairs",     name: "Repairs & Maintenance", icon: "🔧" },
    { id: "misc",        name: "Miscellaneous",       icon: "🧾" }
  ];

  const STORAGE_KEY = "kanakku_transactions_v1";

  /* ---------------- STATE ---------------- */
  let transactions = loadTransactions();
  let activePeriod = "today";
  let activeCategoryId = null;
  let ledgerFilterId = "all";

  /* ---------------- DOM REFS ---------------- */
  const categoryGrid   = document.getElementById("categoryGrid");
  const totalAmountEl  = document.getElementById("totalAmount");
  const entryCountEl   = document.getElementById("entryCount");
  const periodTabs     = document.getElementById("periodTabs");
  const breakdownList  = document.getElementById("breakdownList");
  const ledgerEl       = document.getElementById("ledger");
  const ledgerEmpty    = document.getElementById("ledgerEmpty");
  const ledgerFilter   = document.getElementById("ledgerFilter");

  const modalOverlay   = document.getElementById("modalOverlay");
  const slipForm       = document.getElementById("slipForm");
  const slipIcon       = document.getElementById("slipIcon");
  const slipCategoryName = document.getElementById("slipCategoryName");
  const amountInput    = document.getElementById("amountInput");
  const noteInput      = document.getElementById("noteInput");
  const dateInput      = document.getElementById("dateInput");
  const slipClose      = document.getElementById("slipClose");
  const toastEl        = document.getElementById("toast");

  /* ---------------- STORAGE HELPERS ---------------- */
  function loadTransactions() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      console.warn("Could not read saved data, starting fresh.", e);
      return [];
    }
  }

  function saveTransactions() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
    } catch (e) {
      console.warn("Could not save data.", e);
    }
  }

  /* ---------------- DATE HELPERS ---------------- */
  function toDateOnly(d) {
    const nd = new Date(d);
    nd.setHours(0, 0, 0, 0);
    return nd;
  }

  function isToday(dateStr) {
    return toDateOnly(dateStr).getTime() === toDateOnly(new Date()).getTime();
  }

  function isThisWeek(dateStr) {
    const now = toDateOnly(new Date());
    const day = now.getDay(); // 0 = Sunday
    const monday = new Date(now);
    monday.setDate(now.getDate() - ((day + 6) % 7));
    const d = toDateOnly(dateStr);
    return d >= monday && d <= now;
  }

  function isThisMonth(dateStr) {
    const now = new Date();
    const d = new Date(dateStr);
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  }

  function matchesPeriod(tx, period) {
    if (period === "today") return isToday(tx.date);
    if (period === "week") return isThisWeek(tx.date);
    if (period === "month") return isThisMonth(tx.date);
    return true; // all
  }

  function formatMoney(n) {
    return n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function formatDateDisplay(dateStr) {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  }

  function getCategory(id) {
    return CATEGORIES.find((c) => c.id === id) || { name: "Unknown", icon: "🧾" };
  }

  /* ---------------- RENDER: CATEGORY GRID ---------------- */
  function renderCategoryGrid() {
    categoryGrid.innerHTML = "";
    CATEGORIES.forEach((cat) => {
      const total = transactions
        .filter((t) => t.categoryId === cat.id)
        .reduce((sum, t) => sum + t.amount, 0);

      const card = document.createElement("button");
      card.type = "button";
      card.className = "cat-card";
      card.setAttribute("aria-label", `Add expense to ${cat.name}`);
      card.innerHTML = `
        <div class="cat-icon">${cat.icon}</div>
        <div class="cat-name">${cat.name}</div>
        <div class="cat-total ${total > 0 ? "has-spend" : ""}">₹${formatMoney(total)}</div>
      `;
      card.addEventListener("click", () => openSlip(cat.id));
      categoryGrid.appendChild(card);
    });
  }

  /* ---------------- RENDER: LEDGER FILTER OPTIONS ---------------- */
  function renderLedgerFilterOptions() {
    ledgerFilter.innerHTML = '<option value="all">All categories</option>';
    CATEGORIES.forEach((cat) => {
      const opt = document.createElement("option");
      opt.value = cat.id;
      opt.textContent = `${cat.icon} ${cat.name}`;
      ledgerFilter.appendChild(opt);
    });
  }

  /* ---------------- RENDER: TOTAL / RECEIPT ---------------- */
  function renderTotals() {
    const filtered = transactions.filter((t) => matchesPeriod(t, activePeriod));
    const total = filtered.reduce((sum, t) => sum + t.amount, 0);
    totalAmountEl.textContent = formatMoney(total);
    entryCountEl.textContent = `${filtered.length} ${filtered.length === 1 ? "entry" : "entries"} stamped`;
  }

  /* ---------------- RENDER: BREAKDOWN ---------------- */
  function renderBreakdown() {
    const filtered = transactions.filter((t) => matchesPeriod(t, activePeriod));

    if (filtered.length === 0) {
      breakdownList.innerHTML = '<p class="empty-note">No entries yet for this period. Click a category to get started.</p>';
      return;
    }

    const totalsByCategory = {};
    filtered.forEach((t) => {
      totalsByCategory[t.categoryId] = (totalsByCategory[t.categoryId] || 0) + t.amount;
    });

    const sorted = Object.entries(totalsByCategory)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6);

    const max = sorted[0][1];

    breakdownList.innerHTML = "";
    sorted.forEach(([catId, amount]) => {
      const cat = getCategory(catId);
      const pct = Math.max(6, Math.round((amount / max) * 100));
      const row = document.createElement("div");
      row.className = "breakdown-row";
      row.innerHTML = `
        <div class="breakdown-icon">${cat.icon}</div>
        <div class="breakdown-name">${cat.name}</div>
        <div class="breakdown-bar-track"><div class="breakdown-bar-fill" style="width:${pct}%"></div></div>
        <div class="breakdown-amount">₹${formatMoney(amount)}</div>
      `;
      breakdownList.appendChild(row);
    });
  }

  /* ---------------- RENDER: LEDGER LIST ---------------- */
  function renderLedger() {
    let list = transactions.filter((t) => matchesPeriod(t, activePeriod));

    if (ledgerFilterId !== "all") {
      list = list.filter((t) => t.categoryId === ledgerFilterId);
    }

    list = list.slice().sort((a, b) => new Date(b.date) - new Date(a.date) || b.createdAt - a.createdAt);

    ledgerEl.innerHTML = "";

    if (list.length === 0) {
      ledgerEl.appendChild(ledgerEmpty);
      ledgerEmpty.style.display = "block";
      return;
    }

    list.forEach((tx) => {
      const cat = getCategory(tx.categoryId);
      const row = document.createElement("div");
      row.className = "ledger-row";
      row.innerHTML = `
        <div class="ledger-icon">${cat.icon}</div>
        <div class="ledger-main">
          <div class="ledger-cat">${cat.name}</div>
          ${tx.note ? `<div class="ledger-note">${escapeHtml(tx.note)}</div>` : ""}
          <div class="ledger-date">${formatDateDisplay(tx.date)}</div>
        </div>
        <div class="ledger-amount">−₹${formatMoney(tx.amount)}</div>
        <button class="ledger-delete" aria-label="Delete entry" data-id="${tx.id}">✕</button>
      `;
      ledgerEl.appendChild(row);
    });

    ledgerEl.querySelectorAll(".ledger-delete").forEach((btn) => {
      btn.addEventListener("click", () => deleteTransaction(btn.dataset.id));
    });
  }

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  /* ---------------- FULL RE-RENDER ---------------- */
  function renderAll() {
    renderCategoryGrid();
    renderTotals();
    renderBreakdown();
    renderLedger();
  }

  /* ---------------- MODAL / SLIP ---------------- */
  function openSlip(categoryId) {
    activeCategoryId = categoryId;
    const cat = getCategory(categoryId);
    slipIcon.textContent = cat.icon;
    slipCategoryName.textContent = cat.name;
    amountInput.value = "";
    noteInput.value = "";
    dateInput.value = new Date().toISOString().slice(0, 10);
    modalOverlay.classList.add("open");
    setTimeout(() => amountInput.focus(), 150);
  }

  function closeSlip() {
    modalOverlay.classList.remove("open");
    activeCategoryId = null;
  }

  slipClose.addEventListener("click", closeSlip);
  modalOverlay.addEventListener("click", (e) => {
    if (e.target === modalOverlay) closeSlip();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && modalOverlay.classList.contains("open")) closeSlip();
  });

  slipForm.addEventListener("submit", (e) => {
    e.preventDefault();
    if (!activeCategoryId) return;

    const amount = parseFloat(amountInput.value);
    if (isNaN(amount) || amount <= 0) {
      amountInput.focus();
      return;
    }

    const tx = {
      id: `tx_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      categoryId: activeCategoryId,
      amount: Math.round(amount * 100) / 100,
      note: noteInput.value.trim().slice(0, 60),
      date: dateInput.value || new Date().toISOString().slice(0, 10),
      createdAt: Date.now()
    };

    transactions.push(tx);
    saveTransactions();
    closeSlip();
    renderAll();
    showToast(`₹${formatMoney(tx.amount)} stamped to ${getCategory(tx.categoryId).name}`);
  });

  /* ---------------- DELETE ---------------- */
  function deleteTransaction(id) {
    transactions = transactions.filter((t) => t.id !== id);
    saveTransactions();
    renderAll();
    showToast("Entry deleted");
  }

  /* ---------------- PERIOD TABS ---------------- */
  periodTabs.addEventListener("click", (e) => {
    const btn = e.target.closest(".period-tab");
    if (!btn) return;
    activePeriod = btn.dataset.period;
    periodTabs.querySelectorAll(".period-tab").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    renderTotals();
    renderBreakdown();
    renderLedger();
  });

  /* ---------------- LEDGER FILTER ---------------- */
  ledgerFilter.addEventListener("change", () => {
    ledgerFilterId = ledgerFilter.value;
    renderLedger();
  });

  /* ---------------- TOAST ---------------- */
  let toastTimer = null;
  function showToast(msg) {
    clearTimeout(toastTimer);
    toastEl.textContent = msg;
    toastEl.classList.add("show");
    toastTimer = setTimeout(() => toastEl.classList.remove("show"), 2200);
  }

  /* ---------------- INIT ---------------- */
  function init() {
    renderLedgerFilterOptions();
    renderAll();
  }

  init();
})();