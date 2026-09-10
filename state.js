export const state = {
  data: null, // { meta, accounts, categories, transactions, budgets, transfers }
  dirty: false,
};

export function setData(data) {
  data.transfers = data.transfers || [];
  state.data = data;
}

function uid(prefix) {
  return prefix + "_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

export function currency(n) {
  const v = Number(n) || 0;
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(v);
}

export function categoryById(id) {
  return state.data.categories.find((c) => c.id === id);
}
export function accountById(id) {
  return state.data.accounts.find((a) => a.id === id);
}

// --- Accounts ---
export function addAccount({ name, type, initialBalance, creditLimit }) {
  const acc = { id: uid("acc"), name, type, initialBalance: Number(initialBalance) || 0 };
  if (type === "credit") acc.creditLimit = Number(creditLimit) || 0;
  state.data.accounts.push(acc);
}
export function updateAccount(id, patch) {
  const acc = accountById(id);
  if (acc) Object.assign(acc, patch);
}
export function deleteAccount(id) {
  state.data.accounts = state.data.accounts.filter((a) => a.id !== id);
}

// --- Categories ---
export function addCategory({ name, kind }) {
  state.data.categories.push({ id: uid("cat"), name, kind });
}
export function updateCategory(id, patch) {
  const cat = categoryById(id);
  if (cat) Object.assign(cat, patch);
}
export function deleteCategory(id) {
  state.data.categories = state.data.categories.filter((c) => c.id !== id);
}

// --- Transactions ---
export function addTransaction(tx) {
  state.data.transactions.push({ id: uid("t"), ...tx });
}
export function updateTransaction(id, patch) {
  const idx = state.data.transactions.findIndex((t) => t.id === id);
  if (idx >= 0) state.data.transactions[idx] = { ...state.data.transactions[idx], ...patch };
}
export function deleteTransaction(id) {
  state.data.transactions = state.data.transactions.filter((t) => t.id !== id);
}

// --- Budgets ---
export function getBudget(month, categoryId) {
  return state.data.budgets.find((b) => b.month === month && b.categoryId === categoryId);
}
export function setBudget(month, categoryId, estimated) {
  const existing = getBudget(month, categoryId);
  if (existing) existing.estimated = Number(estimated) || 0;
  else state.data.budgets.push({ month, categoryId, estimated: Number(estimated) || 0 });
}

// --- Computations ---
export function accountBalance(accountId) {
  const acc = accountById(accountId);
  const base = acc ? Number(acc.initialBalance) || 0 : 0;
  const sum = state.data.transactions
    .filter((t) => t.accountId === accountId)
    .reduce((s, t) => s + Number(t.amount), 0);
  return base + sum;
}

export function totalBalance() {
  return state.data.accounts.reduce((s, a) => s + accountBalance(a.id), 0);
}

export function monthsWithData() {
  const set = new Set();
  state.data.transactions.forEach((t) => set.add(t.date.slice(0, 7)));
  state.data.budgets.forEach((b) => set.add(b.month));
  const months = [...set].sort();
  return months;
}

export function currentMonth() {
  return new Date().toISOString().slice(0, 7);
}

// Rows for the monthly budget view: one per category, with estimado/real/balance.
// Transactions flagged excludeFromCategoryTotals (the "other side" of an inter-account
// transfer, e.g. the Ahorros-account leg of a transfer to/from Cuenta bancaria) are left
// out so a transfer isn't counted twice under the same category.
export function budgetRowsForMonth(month) {
  return state.data.categories.map((cat) => {
    const budget = getBudget(month, cat.id);
    const estimated = budget ? budget.estimated : 0;
    const real = state.data.transactions
      .filter((t) => t.categoryId === cat.id && t.date.slice(0, 7) === month && !t.excludeFromCategoryTotals)
      .reduce((s, t) => s + Number(t.amount), 0);
    return { category: cat, estimated, real, balance: real - estimated };
  });
}

// Rows for the accumulated total view: one per category, summed across all transactions.
export function totalRowsAllTime() {
  return state.data.categories.map((cat) => {
    const real = state.data.transactions
      .filter((t) => t.categoryId === cat.id && !t.excludeFromCategoryTotals)
      .reduce((s, t) => s + Number(t.amount), 0);
    return { category: cat, real };
  });
}

export function transactionsSorted() {
  return [...state.data.transactions].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
}

// Real balance of the Ahorros account over time, one point per month with data.
export function savingsSeries() {
  const months = monthsWithData();
  const ahorros = state.data.accounts.find((a) => a.id === "acc_ahorros");
  let running = ahorros ? Number(ahorros.initialBalance) || 0 : 0;
  return months.map((month) => {
    const monthSum = state.data.transactions
      .filter((t) => t.accountId === "acc_ahorros" && t.date.slice(0, 7) === month)
      .reduce((s, t) => s + Number(t.amount), 0);
    running += monthSum;
    return { month, cumulative: running };
  });
}
