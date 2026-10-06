export const state = {
  data: null, // { meta, accounts, categories, transactions, budgets, transfers }
  dirty: false,
};

export const BASE_CURRENCY = "COP";
export const CURRENCIES = ["COP", "USD"];

export function setData(data) {
  data.transfers = data.transfers || [];
  // Archivos viejos de Drive no traen moneda: todo es COP y sin tasas.
  data.meta = data.meta || {};
  data.meta.baseCurrency = BASE_CURRENCY;
  data.meta.rates = data.meta.rates || {};
  data.meta.rates.USD_COP = { buy: 0, sell: 0, marketRef: 0, updatedAt: null, ...data.meta.rates.USD_COP };
  data.accounts.forEach((a) => {
    if (!CURRENCIES.includes(a.currency)) a.currency = BASE_CURRENCY;
  });
  state.data = data;
}

function uid(prefix) {
  return prefix + "_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

export function currency(n, cur = BASE_CURRENCY) {
  const v = Number(n) || 0;
  const digits = cur === "COP" ? 0 : 2;
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: cur, currencyDisplay: cur === "COP" ? "symbol" : "code", minimumFractionDigits: digits, maximumFractionDigits: digits }).format(v);
}

// --- Monedas / tasas ---
export function getRates() {
  return state.data.meta.rates.USD_COP;
}
export function setRates(patch) {
  Object.assign(getRates(), patch);
}
// COP por 1 USD usado para valorar saldos en USD: la tasa de venta (lo que recibes al
// convertir USD->COP). Si aun no hay tasa de ARQ, usa la compra o la referencia de mercado.
export function usdValuationRate() {
  const r = getRates();
  return Number(r.sell) || Number(r.buy) || Number(r.marketRef) || 0;
}
export function toBase(amount, cur) {
  const v = Number(amount) || 0;
  return cur === "USD" ? v * usdValuationRate() : v;
}
export function accountCurrency(accountId) {
  return accountById(accountId)?.currency || BASE_CURRENCY;
}
// Monto de un movimiento expresado en COP (para presupuesto, totales y graficas).
export function txBase(t) {
  return toBase(t.amount, accountCurrency(t.accountId));
}

export function categoryById(id) {
  return state.data.categories.find((c) => c.id === id);
}
export function accountById(id) {
  return state.data.accounts.find((a) => a.id === id);
}

// --- Accounts ---
export function addAccount({ name, type, initialBalance, creditLimit, currency: cur }) {
  const acc = { id: uid("acc"), name, type, initialBalance: Number(initialBalance) || 0, currency: CURRENCIES.includes(cur) ? cur : BASE_CURRENCY };
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

// Conversion entre cuentas propias de distinta moneda (p. ej. ARQ USD -> Bancolombia COP).
// Crea dos movimientos espejo, cada uno en la moneda de su cuenta, con la tasa usada.
// Ambos lados llevan excludeFromCategoryTotals: el ingreso real ya se registro al recibirlo.
// rate = COP por 1 USD.
export function addConversion({ date, fromAccountId, toAccountId, amountFrom, rate }) {
  const from = accountById(fromAccountId);
  const to = accountById(toAccountId);
  const amt = Math.abs(Number(amountFrom));
  const fx = Number(rate);
  if (!from || !to || from.currency === to.currency || !(amt > 0) || !(fx > 0)) return false;
  const amountTo = from.currency === "USD" ? amt * fx : amt / fx;
  const round = (n, cur) => (cur === "COP" ? Math.round(n) : Math.round(n * 100) / 100);
  const desc = `Conversión ${from.currency}→${to.currency} @ ${fx}`;
  const conversionId = uid("cv");
  const common = { date, categoryId: null, description: desc, type: "Transferencia", excludeFromCategoryTotals: true, fxRate: fx, conversionId };
  addTransaction({ ...common, accountId: from.id, amount: -round(amt, from.currency) });
  addTransaction({ ...common, accountId: to.id, amount: round(amountTo, to.currency) });
  return true;
}
export function deleteConversion(tx) {
  state.data.transactions = state.data.transactions.filter((t) => (tx.conversionId ? t.conversionId !== tx.conversionId : t.id !== tx.id));
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

// Saldo total expresado en COP (las cuentas en USD se valoran con usdValuationRate).
export function totalBalance() {
  return state.data.accounts.reduce((s, a) => s + toBase(accountBalance(a.id), a.currency), 0);
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
      .reduce((s, t) => s + txBase(t), 0);
    return { category: cat, estimated, real, balance: real - estimated };
  });
}

// Rows for the accumulated total view: one per category, summed across all transactions.
export function totalRowsAllTime() {
  return state.data.categories.map((cat) => {
    const real = state.data.transactions
      .filter((t) => t.categoryId === cat.id && !t.excludeFromCategoryTotals)
      .reduce((s, t) => s + txBase(t), 0);
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
