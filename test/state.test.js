import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import {
  state,
  setData,
  setRates,
  currency,
  toBase,
  txBase,
  usdValuationRate,
  addAccount,
  addTransaction,
  addConversion,
  deleteConversion,
  accountBalance,
  totalBalance,
  budgetRowsForMonth,
  totalRowsAllTime,
  todayIso,
  nextMonth,
  pocketBalance,
  availableBalance,
  savingsSeries,
  addTransfer,
  deleteTransfer,
  setBudget,
  setBudgetDefault,
  getEstimate,
  addCategory,
  transferableBalance,
} from "../state.js";

function freshData() {
  return {
    meta: {},
    accounts: [
      { id: "cop", name: "Banco", type: "bank", initialBalance: 1000000 },
      { id: "usd", name: "ARQ", type: "bank", initialBalance: 0, currency: "USD" },
    ],
    categories: [{ id: "sal", name: "Salario", kind: "Entrada" }],
    transactions: [],
    budgets: [],
  };
}

beforeEach(() => {
  setData(freshData());
  setRates({ sell: 3900, buy: 3950 });
});

test("setData: cuentas sin moneda quedan en COP y se crean las tasas", () => {
  assert.equal(state.data.accounts[0].currency, "COP");
  assert.equal(state.data.accounts[1].currency, "USD");
  assert.equal(state.data.meta.baseCurrency, "COP");
  setData(freshData());
  assert.deepEqual(state.data.meta.rates.USD_COP, { buy: 0, sell: 0, marketRef: 0, updatedAt: null });
});

test("addAccount: moneda inválida cae a COP", () => {
  addAccount({ name: "X", type: "cash", initialBalance: 0, currency: "EUR" });
  assert.equal(state.data.accounts.at(-1).currency, "COP");
});

test("usdValuationRate: venta, luego compra, luego referencia de mercado", () => {
  assert.equal(usdValuationRate(), 3900);
  setRates({ sell: 0 });
  assert.equal(usdValuationRate(), 3950);
  setRates({ buy: 0, marketRef: 3286 });
  assert.equal(usdValuationRate(), 3286);
  setRates({ marketRef: 0 });
  assert.equal(usdValuationRate(), 0);
});

test("toBase / txBase convierten USD con la tasa de venta y no tocan COP", () => {
  assert.equal(toBase(100, "USD"), 390000);
  assert.equal(toBase(100, "COP"), 100);
  assert.equal(txBase({ amount: 50, accountId: "usd" }), 195000);
  assert.equal(txBase({ amount: 50, accountId: "cop" }), 50);
});

test("currency: COP sin decimales y USD con 2", () => {
  assert.match(currency(1500000), /1\.500\.000/);
  assert.match(currency(500.5, "USD"), /500,50/);
  assert.match(currency(500.5, "USD"), /USD/);
});

test("addConversion USD→COP crea dos movimientos espejo con tasa y bandera", () => {
  assert.equal(addConversion({ date: "2026-10-06", fromAccountId: "usd", toAccountId: "cop", amountFrom: 5, rate: 3900 }), true);
  const [a, b] = state.data.transactions;
  assert.equal(a.accountId, "usd");
  assert.equal(a.amount, -5);
  assert.equal(b.accountId, "cop");
  assert.equal(b.amount, 19500);
  for (const t of [a, b]) {
    assert.equal(t.excludeFromCategoryTotals, true);
    assert.equal(t.fxRate, 3900);
    assert.equal(t.categoryId, null);
  }
  assert.equal(a.conversionId, b.conversionId);
});

test("addConversion COP→USD divide por la tasa y redondea a centavos", () => {
  addConversion({ date: "2026-10-06", fromAccountId: "cop", toAccountId: "usd", amountFrom: 100000, rate: 3950 });
  const [a, b] = state.data.transactions;
  assert.equal(a.amount, -100000);
  assert.equal(b.amount, 25.32);
});

test("addConversion rechaza monedas iguales, montos o tasas inválidos y cuentas inexistentes", () => {
  addAccount({ name: "Otra COP", type: "cash", initialBalance: 0 });
  const otra = state.data.accounts.at(-1).id;
  const base = { date: "2026-10-06", fromAccountId: "usd", toAccountId: "cop", amountFrom: 5, rate: 3900 };
  assert.equal(addConversion({ ...base, fromAccountId: "cop", toAccountId: otra }), false);
  assert.equal(addConversion({ ...base, amountFrom: 0 }), false);
  assert.equal(addConversion({ ...base, rate: 0 }), false);
  assert.equal(addConversion({ ...base, toAccountId: "nope" }), false);
  assert.equal(state.data.transactions.length, 0);
});

test("saldos: cada cuenta en su moneda y el total en COP no cambia por convertir a la misma tasa", () => {
  addTransaction({ date: "2026-10-01", accountId: "usd", categoryId: "sal", type: "Entrada", amount: 500 });
  const antes = totalBalance();
  assert.equal(antes, 1000000 + 500 * 3900);
  addConversion({ date: "2026-10-02", fromAccountId: "usd", toAccountId: "cop", amountFrom: 200, rate: 3900 });
  assert.equal(accountBalance("usd"), 300);
  assert.equal(accountBalance("cop"), 1780000);
  assert.equal(totalBalance(), antes);
});

test("Presupuesto y Total: el ingreso USD cuenta una vez, convertido, y la conversión no suma", () => {
  addTransaction({ date: "2026-10-01", accountId: "usd", categoryId: "sal", type: "Entrada", amount: 500 });
  addConversion({ date: "2026-10-02", fromAccountId: "usd", toAccountId: "cop", amountFrom: 200, rate: 3900 });
  assert.equal(budgetRowsForMonth("2026-10")[0].real, 1950000);
  assert.equal(totalRowsAllTime()[0].real, 1950000);
});

test("deleteConversion borra los dos lados y deja el resto", () => {
  addTransaction({ date: "2026-10-01", accountId: "usd", categoryId: "sal", type: "Entrada", amount: 500 });
  addConversion({ date: "2026-10-02", fromAccountId: "usd", toAccountId: "cop", amountFrom: 200, rate: 3900 });
  deleteConversion(state.data.transactions.find((t) => t.fxRate));
  assert.equal(state.data.transactions.length, 1);
  assert.equal(state.data.transactions[0].amount, 500);
});

// --- Fecha local, transferencias, Bancolombia y presupuesto por defecto ---

test("todayIso usa la hora local: a las 22:30 sigue siendo el mismo día", () => {
  assert.equal(todayIso(new Date(2026, 9, 20, 22, 30)), "2026-10-20");
  assert.equal(todayIso(new Date(2026, 11, 31, 23, 59)), "2026-12-31");
});

test("nextMonth cruza el cambio de año", () => {
  assert.equal(nextMonth("2026-10"), "2026-11");
  assert.equal(nextMonth("2026-12"), "2027-01");
});

function dataV1() {
  return {
    meta: { schemaVersion: 1 },
    accounts: [
      { id: "acc_efectivo", name: "Efectivo", type: "cash", initialBalance: 0 },
      { id: "acc_banco", name: "Cuenta bancaria", type: "bank", initialBalance: 1000 },
      { id: "acc_ahorros", name: "Ahorros", type: "savings", initialBalance: 300 },
      { id: "acc_credito", name: "Tarjeta de crédito", type: "credit", initialBalance: -500, creditLimit: 4000 },
    ],
    categories: [
      { id: "sal", name: "Salario", kind: "Entrada" },
      { id: "seg", name: "Seguridad Social", kind: "Salida" },
      { id: "gas", name: "Gasolina", kind: "Salida" },
      { id: "com", name: "Comida Gatos", kind: "Salida" },
      { id: "pas", name: "Pasajes", kind: "Salida" },
      { id: "otr", name: "Otros", kind: "Salida" },
      { id: "aho", name: "Ahorro", kind: "Ahorro" },
    ],
    transactions: [
      { id: "t1", date: "2026-09-01", accountId: "acc_banco", categoryId: "aho", type: "Salida", amount: -200 },
      { id: "t2", date: "2026-09-01", accountId: "acc_ahorros", categoryId: "aho", type: "Entrada", amount: 200, excludeFromCategoryTotals: true },
    ],
    budgets: [],
  };
}

test("migración v1→v2: Ahorros pasa a bolsillo de Bancolombia sin cambiar el saldo total", () => {
  const legacyData = dataV1();
  const totalAntes = legacyData.accounts.reduce((s, a) => s + a.initialBalance, 0) + legacyData.transactions.reduce((s, t) => s + t.amount, 0);
  setData(legacyData);
  assert.equal(state.data.meta.schemaVersion, 2);
  assert.equal(state.data.accounts.find((a) => a.id === "acc_ahorros"), undefined);
  const banco = state.data.accounts.find((a) => a.id === "acc_banco");
  assert.equal(banco.name, "Bancolombia");
  assert.equal(banco.hasSavings, true);
  assert.equal(accountBalance("acc_banco"), 1000 + 300 - 200 + 200);
  assert.equal(pocketBalance("acc_banco"), 300 + 200);
  assert.equal(availableBalance("acc_banco"), 1000 - 200);
  assert.equal(totalBalance(), totalAntes);
  assert.equal(state.data.transactions.find((t) => t.id === "t2").pocket, "ahorro");
  assert.equal(state.data.transactions.find((t) => t.id === "t1").pocket, undefined);
});

test("migración v1→v2 es idempotente y marca las categorías de gasto libre", () => {
  setData(dataV1());
  const firstPass = JSON.stringify(state.data);
  setData(JSON.parse(firstPass));
  assert.equal(JSON.stringify(state.data), firstPass);
  const libres = state.data.categories.filter((c) => c.noBudget).map((c) => c.name).sort();
  assert.deepEqual(libres, ["Comida Gatos", "Gasolina", "Otros", "Pasajes"]);
});

test("savingsSeries sigue el saldo del bolsillo de ahorro", () => {
  setData(dataV1());
  const series = savingsSeries();
  assert.equal(series.at(-1).cumulative, 500);
});

test("addTransfer: efectivo ⇄ banco es UN registro con dos movimientos espejo, fuera de las categorías", () => {
  setData(dataV1());
  assert.equal(addTransfer({ date: "2026-10-05", fromAccountId: "acc_banco", toAccountId: "acc_efectivo", amount: 100 }), true);
  const [outgoing, incoming] = state.data.transactions.slice(-2);
  assert.equal(outgoing.amount, -100);
  assert.equal(incoming.amount, 100);
  assert.equal(outgoing.transferId, incoming.transferId);
  for (const t of [outgoing, incoming]) {
    assert.equal(t.categoryId, null);
    assert.equal(t.excludeFromCategoryTotals, true);
  }
  assert.equal(accountBalance("acc_efectivo"), 100);
  assert.equal(accountBalance("acc_banco"), 1000 + 300 - 200 + 200 - 100);
  assert.ok(budgetRowsForMonth("2026-10").every((r) => r.real === 0));
});

test("addTransfer: pago de tarjeta reduce la deuda y Disponible → Ahorro mueve el bolsillo", () => {
  setData(dataV1());
  addTransfer({ date: "2026-10-05", fromAccountId: "acc_banco", toAccountId: "acc_credito", amount: 500 });
  assert.equal(accountBalance("acc_credito"), 0);
  const antes = accountBalance("acc_banco");
  const bolsilloAntes = pocketBalance("acc_banco");
  addTransfer({ date: "2026-10-06", fromAccountId: "acc_banco", toAccountId: "acc_banco", toPocket: "ahorro", amount: 50 });
  assert.equal(accountBalance("acc_banco"), antes);
  assert.equal(pocketBalance("acc_banco"), bolsilloAntes + 50);
});

test("addTransfer rechaza origen = destino, montos inválidos, monedas distintas y bolsillo inexistente", () => {
  setData(dataV1());
  const base = { date: "2026-10-05", fromAccountId: "acc_banco", toAccountId: "acc_efectivo", amount: 10 };
  assert.equal(addTransfer({ ...base, toAccountId: "acc_banco" }), false);
  assert.equal(addTransfer({ ...base, amount: 0 }), false);
  assert.equal(addTransfer({ ...base, toAccountId: "nope" }), false);
  assert.equal(addTransfer({ ...base, toAccountId: "acc_efectivo", toPocket: "ahorro" }), false);
  addAccount({ name: "ARQ", type: "bank", initialBalance: 0, currency: "USD" });
  assert.equal(addTransfer({ ...base, toAccountId: state.data.accounts.at(-1).id }), false);
  assert.equal(state.data.transactions.length, 2);
});

test("deleteTransfer borra los dos lados de una transferencia", () => {
  setData(dataV1());
  addTransfer({ date: "2026-10-05", fromAccountId: "acc_banco", toAccountId: "acc_efectivo", amount: 100 });
  deleteTransfer(state.data.transactions.find((t) => t.transferId));
  assert.equal(state.data.transactions.length, 2);
});

test("presupuesto por defecto: un cambio solo aplica a los meses siguientes", () => {
  setData(dataV1());
  setBudgetDefault("seg", 200000, "2026-10");
  assert.equal(getEstimate("2026-09", "seg"), 0);
  assert.equal(getEstimate("2026-10", "seg"), -200000);
  assert.equal(getEstimate("2027-03", "seg"), -200000);
  setBudgetDefault("seg", 250000, "2026-12"); // nuevo valor desde diciembre
  assert.equal(getEstimate("2026-10", "seg"), -200000);
  assert.equal(getEstimate("2026-11", "seg"), -200000);
  assert.equal(getEstimate("2026-12", "seg"), -250000);
  assert.equal(getEstimate("2027-01", "seg"), -250000);
});

test("presupuesto: lo editado en un mes gana al valor por defecto y no cambia los demás", () => {
  setData(dataV1());
  setBudgetDefault("seg", 200000, "2026-10");
  setBudget("2026-11", "seg", 300000);
  assert.equal(getEstimate("2026-11", "seg"), -300000);
  assert.equal(getEstimate("2026-10", "seg"), -200000);
  assert.equal(getEstimate("2026-12", "seg"), -200000);
  assert.equal(budgetRowsForMonth("2026-11").find((r) => r.category.id === "seg").estimated, -300000);
});

test("addAccount con hasSavings guarda el saldo inicial del bolsillo dentro del saldo total", () => {
  addAccount({ name: "Bancolombia", type: "bank", initialBalance: 1000, hasSavings: true, savingsInitialBalance: 300 });
  const acc = state.data.accounts.at(-1);
  assert.equal(acc.hasSavings, true);
  assert.equal(pocketBalance(acc.id), 300);
  assert.equal(availableBalance(acc.id), 700);
  assert.equal(accountBalance(acc.id), 1000);
});

test("addAccount sin hasSavings no crea bolsillo", () => {
  addAccount({ name: "Caja", type: "cash", initialBalance: 50, savingsInitialBalance: 20 });
  const acc = state.data.accounts.at(-1);
  assert.equal(acc.hasSavings, undefined);
  assert.equal(pocketBalance(acc.id), 0);
});

test("addCategory con noBudget queda como gasto libre y sin él no lleva la marca", () => {
  addCategory({ name: "Mercado", kind: "Salida", noBudget: true });
  addCategory({ name: "Servicios", kind: "Salida" });
  const [free, fixed] = state.data.categories.slice(-2);
  assert.equal(free.noBudget, true);
  assert.equal(fixed.noBudget, undefined);
});

test("addTransaction con pocket mueve el bolsillo y deja intacto el disponible del resto", () => {
  setData(dataV1());
  addTransaction({ date: "2026-10-05", accountId: "acc_banco", categoryId: "aho", type: "Entrada", amount: 40, pocket: "ahorro" });
  assert.equal(pocketBalance("acc_banco"), 540);
  assert.equal(availableBalance("acc_banco"), 800);
});

test("transferableBalance (opción «Todo»): bolsillo, disponible y cuenta simple", () => {
  setData(dataV1());
  assert.equal(transferableBalance("acc_banco", "ahorro"), 500);
  assert.equal(transferableBalance("acc_banco"), 800);
  assert.equal(transferableBalance("acc_efectivo"), 0);
  assert.equal(transferableBalance("no-existe"), 0);
});

test("transferableBalance redondea COP a enteros y USD a centavos", () => {
  addAccount({ name: "Pesos", type: "cash", initialBalance: 1000.6 });
  addAccount({ name: "Dolares", type: "bank", initialBalance: 12.345, currency: "USD" });
  const [cop, usd] = state.data.accounts.slice(-2);
  assert.equal(transferableBalance(cop.id), 1001);
  assert.equal(transferableBalance(usd.id), 12.35);
});

test("«Todo» + addTransfer deja el origen en cero sin tocar el total", () => {
  setData(dataV1());
  const total = totalBalance();
  addTransfer({ date: "2026-10-05", fromAccountId: "acc_banco", toAccountId: "acc_efectivo", amount: transferableBalance("acc_banco") });
  assert.equal(availableBalance("acc_banco"), 0);
  assert.equal(accountBalance("acc_efectivo"), 800);
  assert.equal(totalBalance(), total);
});
