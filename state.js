export const state = {
  data: null, // { meta, accounts, categories, transactions, budgets, transfers }
  dirty: false,
};

import { DEFAULT_CUT_DAY, DEFAULT_PAY_DAY, todayIso } from "./card.js";

export { todayIso };

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
    if (a.type === "credit") {
      a.cutDay = Number(a.cutDay) || DEFAULT_CUT_DAY;
      a.payDay = Number(a.payDay) || DEFAULT_PAY_DAY;
    }
  });
  data.budgetDefaults = data.budgetDefaults || [];
  migrateToV2(data);
  state.data = data;
}

// --- Migracion de esquema ---
export const SCHEMA_VERSION = 2;
export const POCKET_SAVINGS = "ahorro";
// Categorias de gasto libre (sin presupuesto fijo): solo se muestra lo gastado en el mes.
const FREE_CATEGORY_NAMES = ["comida gatos", "gasolina", "otros", "pasajes"];
const normName = (text) => String(text || "").normalize("NFD").replace(/[̀-ͯ]/g, "").trim().toLowerCase();

export function needsMigration(data) {
  return (data?.meta?.schemaVersion || 1) < SCHEMA_VERSION;
}

// v1 -> v2: la cuenta "Ahorros" pasa a ser un bolsillo de la cuenta bancaria (Bancolombia) y las
// categorias de gasto libre quedan marcadas. Idempotente: se guarda en meta.schemaVersion.
function migrateToV2(data) {
  if (!needsMigration(data)) return;
  data.categories.forEach((c) => {
    if (FREE_CATEGORY_NAMES.includes(normName(c.name))) c.noBudget = true;
  });
  const savingsAccount = data.accounts.find((a) => a.id === "acc_ahorros") || data.accounts.find((a) => a.type === "savings");
  const bank =
    data.accounts.find((a) => a.id === "acc_banco") ||
    data.accounts.find((a) => a.type === "bank" && a.currency === BASE_CURRENCY && a !== savingsAccount);
  if (savingsAccount && bank && savingsAccount !== bank && savingsAccount.currency === bank.currency) {
    const savingsInitial = Number(savingsAccount.initialBalance) || 0;
    bank.initialBalance = (Number(bank.initialBalance) || 0) + savingsInitial;
    bank.savingsInitialBalance = (Number(bank.savingsInitialBalance) || 0) + savingsInitial;
    bank.hasSavings = true;
    data.transactions.forEach((t) => {
      if (t.accountId === savingsAccount.id) {
        t.accountId = bank.id;
        t.pocket = POCKET_SAVINGS;
      }
    });
    data.accounts = data.accounts.filter((a) => a !== savingsAccount);
  }
  if (bank && normName(bank.name) === "cuenta bancaria") bank.name = "Bancolombia";
  data.meta.schemaVersion = SCHEMA_VERSION;
}

function uid(prefix) {
  return prefix + "_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

export function currency(n, cur = BASE_CURRENCY, digits = cur === "COP" ? 0 : 2) {
  const v = Number(n) || 0;
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: cur, currencyDisplay: "code", minimumFractionDigits: digits, maximumFractionDigits: digits }).format(v);
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
export function addAccount({ name, type, initialBalance, creditLimit, cutDay, payDay, currency: cur, hasSavings, savingsInitialBalance }) {
  const acc = { id: uid("acc"), name, type, initialBalance: Number(initialBalance) || 0, currency: CURRENCIES.includes(cur) ? cur : BASE_CURRENCY };
  if (hasSavings) {
    acc.hasSavings = true;
    acc.savingsInitialBalance = Number(savingsInitialBalance) || 0;
  }
  if (type === "credit") {
    acc.creditLimit = Number(creditLimit) || 0;
    acc.cutDay = Number(cutDay) || DEFAULT_CUT_DAY;
    acc.payDay = Number(payDay) || DEFAULT_PAY_DAY;
  }
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
export function addCategory({ name, kind, noBudget }) {
  state.data.categories.push({ id: uid("cat"), name, kind, ...(noBudget ? { noBudget: true } : {}) });
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

// Transferencia entre cuentas propias de la misma moneda (o entre la cuenta y su bolsillo de ahorro):
// un solo registro para el usuario, dos movimientos espejo para los saldos. Ninguno cuenta en
// Presupuesto/Total/Graficas por categoria (categoryId null + excludeFromCategoryTotals).
// El pago de la tarjeta de credito es una transferencia hacia la cuenta `credit`.
// Descripcion por defecto de una transferencia: «Transferencia Origen → Destino» (con «› Ahorro» si es el bolsillo).
export function transferDescription(from, to) {
  const label = ({ accountId, pocket } = {}) => {
    const account = accountById(accountId);
    return account ? (pocket ? `${account.name} › Ahorro` : account.name) : "—";
  };
  return `Transferencia ${label(from)} → ${label(to)}`;
}
// Valores por defecto del formulario Transferir: fecha de hoy (hora local) y descripcion si el usuario no escribe una.
export function transferDefaults({ from, to, description, now = new Date() }) {
  return { date: todayIso(now), description: (description || "").trim() || transferDescription(from, to) };
}

export function addTransfer({ date, fromAccountId, fromPocket, toAccountId, toPocket, amount, description }) {
  const from = accountById(fromAccountId);
  const to = accountById(toAccountId);
  const amt = Math.abs(Number(amount));
  const sourcePocket = fromPocket || undefined;
  const targetPocket = toPocket || undefined;
  if (!from || !to || from.currency !== to.currency || !(amt > 0) || !date) return false;
  if (from.id === to.id && sourcePocket === targetPocket) return false;
  if ((sourcePocket && !accountHasPocket(from)) || (targetPocket && !accountHasPocket(to))) return false;
  const desc = transferDefaults({ from: { accountId: from.id, pocket: sourcePocket }, to: { accountId: to.id, pocket: targetPocket }, description }).description;
  const transferId = uid("tr");
  const common = { date, categoryId: null, description: desc, type: "Transferencia", excludeFromCategoryTotals: true, transferId };
  addTransaction({ ...common, accountId: from.id, amount: -amt, ...(sourcePocket ? { pocket: sourcePocket } : {}) });
  addTransaction({ ...common, accountId: to.id, amount: amt, ...(targetPocket ? { pocket: targetPocket } : {}) });
  return true;
}
// Reglas del formulario "Transferir" (Nivel 3), sin DOM para poder probarlas. `from` y `to` son
// { accountId, pocket }; `all` es la casilla «Todo». Devuelve { ok: true, kind: "transfer" | "conversion" }
// o { ok: false, message } con el texto exacto del schema_transferir.md.
export function validateTransferInput({ from, to, amount, rate, all }) {
  const value = Number(amount);
  if (all && !(value > 0)) return { ok: false, message: "No hay saldo disponible en el origen para transferir." };
  if (from.accountId === to.accountId && (from.pocket || undefined) === (to.pocket || undefined)) {
    return { ok: false, message: "Elige cuentas distintas para el origen y el destino." };
  }
  const fromAccount = accountById(from.accountId);
  const toAccount = accountById(to.accountId);
  if (!fromAccount || !toAccount) return { ok: false, message: "Revisa los datos de la transferencia." };
  if (fromAccount.currency !== toAccount.currency) {
    if (from.pocket || to.pocket) return { ok: false, message: "Entre monedas distintas no se puede usar el bolsillo de ahorro." };
    if (!(value > 0) || !(Number(rate) > 0)) return { ok: false, message: "Revisa los datos de la conversión." };
    return { ok: true, kind: "conversion" };
  }
  if (!(value > 0)) return { ok: false, message: "Revisa los datos de la transferencia." };
  return { ok: true, kind: "transfer" };
}

// Borra una transferencia o conversion completa (ambos lados).
export function deleteTransfer(tx) {
  const key = tx.transferId ? "transferId" : tx.conversionId ? "conversionId" : null;
  state.data.transactions = state.data.transactions.filter((t) => (key ? t[key] !== tx[key] : t.id !== tx.id));
}
export const deleteConversion = deleteTransfer;
export const isPairedTransfer = (tx) => !!(tx && (tx.transferId || tx.conversionId));

// --- Budgets ---
export function getBudget(month, categoryId) {
  return state.data.budgets.find((b) => b.month === month && b.categoryId === categoryId);
}
// Los gastos se guardan en negativo (igual que sus movimientos); el usuario escribe el monto en positivo.
function signedBudget(categoryId, value) {
  const amount = Number(value) || 0;
  return categoryById(categoryId)?.kind === "Salida" ? -Math.abs(amount) || 0 : amount; // "|| 0" evita -0
}
export function setBudget(month, categoryId, estimated) {
  const value = signedBudget(categoryId, estimated);
  const existing = getBudget(month, categoryId);
  if (existing) existing.estimated = value;
  else state.data.budgets.push({ month, categoryId, estimated: value });
}
// Valor por defecto vigente en un mes: el ultimo con `from <= mes` (historial, solo se agregan).
export function getBudgetDefault(month, categoryId) {
  const list = state.data.budgetDefaults
    .filter((d) => d.categoryId === categoryId && d.from <= month)
    .sort((a, b) => (a.from < b.from ? -1 : a.from > b.from ? 1 : 0));
  return list.length ? list[list.length - 1] : undefined;
}
// Estimado efectivo: el que se haya editado a mano en ese mes y, si no, el valor por defecto vigente.
export function getEstimate(month, categoryId) {
  const own = getBudget(month, categoryId);
  if (own) return own.estimated;
  return getBudgetDefault(month, categoryId)?.amount ?? 0;
}
export function nextMonth(month) {
  const [year, monthNumber] = month.split("-").map(Number);
  const monthIndex = year * 12 + monthNumber; // (monthNumber - 1) + 1
  return `${Math.floor(monthIndex / 12)}-${String((monthIndex % 12) + 1).padStart(2, "0")}`;
}
// Cambia el valor por defecto SOLO para los meses siguientes al actual: el mes en curso y los
// anteriores conservan lo que ya tenian. `from` es inyectable para las pruebas.
export function setBudgetDefault(categoryId, amount, from = nextMonth(currentMonth())) {
  const value = signedBudget(categoryId, amount);
  const existing = state.data.budgetDefaults.find((d) => d.categoryId === categoryId && d.from === from);
  if (existing) existing.amount = value;
  else state.data.budgetDefaults.push({ categoryId, amount: value, from });
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

// Una cuenta puede tener un bolsillo "Ahorro" (Bancolombia): su saldo ya esta incluido en accountBalance.
export function accountHasPocket(acc) {
  return !!acc?.hasSavings;
}
// Saldo del bolsillo de ahorro de una cuenta (parte del saldo total de la cuenta).
export function pocketBalance(accountId, pocket = POCKET_SAVINGS) {
  const acc = accountById(accountId);
  const base = acc ? Number(acc.savingsInitialBalance) || 0 : 0;
  const sum = state.data.transactions
    .filter((t) => t.accountId === accountId && t.pocket === pocket)
    .reduce((sum, t) => sum + Number(t.amount), 0);
  return base + sum;
}
// Lo que queda fuera del bolsillo: saldo total menos ahorro.
export function availableBalance(accountId) {
  return accountBalance(accountId) - pocketBalance(accountId);
}
// Saldo que se puede transferir "Todo" desde un origen: el bolsillo de ahorro, la parte disponible de una
// cuenta con bolsillo, o el saldo total de las demas. Redondeado a la precision de la moneda.
export function transferableBalance(accountId, pocket) {
  const acc = accountById(accountId);
  if (!acc) return 0;
  const bal = pocket ? pocketBalance(accountId) : accountHasPocket(acc) ? availableBalance(accountId) : accountBalance(accountId);
  return acc.currency === BASE_CURRENCY ? Math.round(bal) : Math.round(bal * 100) / 100;
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

// Mes actual en hora local (toISOString da UTC: de noche en Colombia ya es el mes/dia siguiente).
export function currentMonth(now = new Date()) {
  return todayIso(now).slice(0, 7);
}

// Rows for the monthly budget view: one per category, with estimado/real/balance.
// Transactions flagged excludeFromCategoryTotals (the "other side" of an inter-account
// transfer, e.g. the Ahorros-account leg of a transfer to/from Cuenta bancaria) are left
// out so a transfer isn't counted twice under the same category.
export function budgetRowsForMonth(month) {
  return state.data.categories.map((cat) => {
    const estimated = getEstimate(month, cat.id);
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

// Saldo real del bolsillo de ahorro (Bancolombia › Ahorro) en el tiempo, un punto por mes con datos.
export function savingsSeries() {
  const months = monthsWithData();
  const pockets = state.data.accounts.filter((a) => a.currency === BASE_CURRENCY && (accountHasPocket(a) || state.data.transactions.some((t) => t.accountId === a.id && t.pocket === POCKET_SAVINGS)));
  const ids = new Set(pockets.map((a) => a.id));
  let running = pockets.reduce((sum, account) => sum + (Number(account.savingsInitialBalance) || 0), 0);
  return months.map((month) => {
    const monthSum = state.data.transactions
      .filter((t) => ids.has(t.accountId) && t.pocket === POCKET_SAVINGS && t.date.slice(0, 7) === month)
      .reduce((sum, t) => sum + Number(t.amount), 0);
    running += monthSum;
    return { month, cumulative: running };
  });
}
// Lo aportado (neto) al bolsillo de ahorro en un mes.
export function savingsContribution(month, accountId) {
  return state.data.transactions
    .filter((t) => t.pocket === POCKET_SAVINGS && (!accountId || t.accountId === accountId) && t.date.slice(0, 7) === month)
    .reduce((sum, t) => sum + Number(t.amount), 0);
}
// Cuentas con bolsillo de ahorro y su saldo total (para mostrar "Bancolombia › Ahorro").
export function pocketAccounts() {
  return state.data.accounts.filter(accountHasPocket);
}
