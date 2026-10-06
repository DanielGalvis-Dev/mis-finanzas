import { test } from "node:test";
import assert from "node:assert/strict";
import { financingDays, cycleInfo, statementDue, alertLevel, buildIcs, cardConfig } from "../card.js";

// Extracto real: periodo 02-sep a 30-sep-2026, pagar antes del 19-oct-2026. Corte 30, pago 19.
const cfg = { cutDay: 30, payDay: 19 };

test("financingDays: de 49 días el día siguiente al corte a 20 el día del corte", () => {
  assert.equal(financingDays("2026-10-01", cfg), 49);
  assert.equal(financingDays("2026-10-05", cfg), 45);
  assert.equal(financingDays("2026-10-06", cfg), 44);
  assert.equal(financingDays("2026-10-15", cfg), 35);
  assert.equal(financingDays("2026-10-30", cfg), 20);
  assert.equal(financingDays("2026-10-31", cfg), 49); // ya es del siguiente extracto
});

test("financingDays: el extracto de septiembre vence el 19 de octubre", () => {
  assert.equal(financingDays("2026-09-24", cfg), 25);
  assert.equal(financingDays("2026-09-30", cfg), 19);
});

test("febrero: el corte cae el último día del mes", () => {
  assert.equal(financingDays("2027-02-15", cfg), 32); // corte 28-feb, pago 19-mar
  assert.equal(financingDays("2027-03-01", cfg), 49);
});

test("pagar el mismo mes si payDay es posterior al corte", () => {
  assert.equal(financingDays("2026-10-06", { cutDay: 5, payDay: 25 }), 50); // corte 5-nov, pago 25-nov
  assert.equal(financingDays("2026-10-05", { cutDay: 5, payDay: 25 }), 20); // corte 5-oct, pago 25-oct
});

test("cycleInfo el 1 de octubre", () => {
  const i = cycleInfo(cfg, "2026-10-01");
  assert.equal(i.lastCut, "2026-09-30");
  assert.equal(i.statementPayBy, "2026-10-19");
  assert.equal(i.daysToPay, 18);
  assert.equal(i.nextCut, "2026-10-30");
  assert.equal(i.daysToCut, 29);
  assert.equal(i.todayFinancingDays, 49);
  assert.equal(i.todayPayBy, "2026-11-19");
  assert.deepEqual(i.goodWindow, { from: "2026-10-01", to: "2026-10-05", current: true });
  assert.equal(i.avoidFrom, "2026-10-26");
  assert.equal(i.avoidTo, "2026-10-30");
});

test("cycleInfo a mitad de ciclo: la ventana buena es la del siguiente ciclo", () => {
  const i = cycleInfo(cfg, "2026-10-15");
  assert.equal(i.todayFinancingDays, 35);
  assert.deepEqual(i.goodWindow, { from: "2026-10-31", to: "2026-11-04", current: false });
});

test("cycleInfo vencido: pasada la fecha límite daysToPay es negativo", () => {
  assert.equal(cycleInfo(cfg, "2026-10-20").daysToPay, -1);
  assert.equal(cycleInfo(cfg, "2026-10-19").daysToPay, 0);
});

test("statementDue: deuda al corte menos abonos posteriores", () => {
  const txs = [
    { date: "2026-09-24", amount: -10570 },
    { date: "2026-09-23", amount: -17700 },
    { date: "2026-09-22", amount: -9947 },
  ];
  assert.equal(statementDue(0, txs, "2026-09-30"), 38217);
  assert.equal(statementDue(0, [...txs, { date: "2026-10-05", amount: 20000 }], "2026-09-30"), 18217);
  assert.equal(statementDue(0, [...txs, { date: "2026-10-05", amount: 50000 }], "2026-09-30"), 0);
  // compras posteriores al corte no cuentan para este extracto
  assert.equal(statementDue(0, [...txs, { date: "2026-10-02", amount: -5000 }], "2026-09-30"), 38217);
  assert.equal(statementDue(100000, txs, "2026-09-30"), 0); // saldo a favor, sin deuda
});

test("alertLevel: aviso a 5 días o menos, vencido, y nada si no hay deuda", () => {
  const info = (daysToPay) => ({ daysToPay });
  assert.equal(alertLevel(info(6), 38217), null);
  assert.equal(alertLevel(info(5), 38217), "soon");
  assert.equal(alertLevel(info(0), 38217), "soon");
  assert.equal(alertLevel(info(-1), 38217), "overdue");
  assert.equal(alertLevel(info(3), 0), null);
});

test("cardConfig usa 30/19 por defecto", () => {
  assert.deepEqual(cardConfig({}), { cutDay: 30, payDay: 19 });
  assert.deepEqual(cardConfig({ cutDay: 15, payDay: 5 }), { cutDay: 15, payDay: 5 });
});

test("buildIcs: evento mensual con alarmas de 5 y 1 día", () => {
  const ics = buildIcs({ name: "Visa", payDay: 19, nextPayBy: "2026-10-19" });
  assert.match(ics, /DTSTART;VALUE=DATE:20261019/);
  assert.match(ics, /RRULE:FREQ=MONTHLY;BYMONTHDAY=19/);
  assert.match(ics, /TRIGGER:-P5D/);
  assert.match(ics, /TRIGGER:-P1D/);
  assert.ok(ics.startsWith("BEGIN:VCALENDAR") && ics.trimEnd().endsWith("END:VCALENDAR"));
  assert.ok(ics.includes("\r\n"));
});
