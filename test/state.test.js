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
