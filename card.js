// Calculos del ciclo de la tarjeta de credito (sin DOM, para poder probarlos).
// Regla: el extracto cierra el dia de corte (inclusive) y se paga hasta payDay del mes
// siguiente al corte (o del mismo mes si payDay es posterior al dia de corte). Una compra
// tiene tantos dias para pagarse como separen su fecha de la fecha limite de SU extracto:
// la mejor compra es la del dia siguiente al corte (~49 dias), la peor la del dia de corte (~19).
// Fechas como "YYYY-MM-DD"; internamente dias enteros UTC para evitar problemas de zona horaria.
const DAY = 86400000;
export const DEFAULT_CUT_DAY = 30;
export const DEFAULT_PAY_DAY = 19;
export const GOOD_DAYS = 45; // financiacion que se considera "buena"
export const BAD_DAYS = 25; // por debajo de esto conviene esperar al siguiente ciclo
export const ALERT_DAYS = 5;

const toNum = (iso) => {
  const [y, m, d] = iso.split("-").map(Number);
  return Date.UTC(y, m - 1, d) / DAY;
};
export const fromNum = (n) => new Date(n * DAY).toISOString().slice(0, 10);
const parts = (n) => {
  const d = new Date(n * DAY);
  return [d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate()];
};
const lastDayOf = (y, m) => new Date(Date.UTC(y, m, 0)).getUTCDate();
const monthDate = (y, m, day) => Date.UTC(y, m - 1, Math.min(day, lastDayOf(y, m))) / DAY;
const shiftMonth = (y, m, k) => {
  const t = y * 12 + (m - 1) + k;
  return [Math.floor(t / 12), (t % 12) + 1];
};

export function todayIso(now = new Date()) {
  const p = (n) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}`;
}

export function cardConfig(acc) {
  return { cutDay: Number(acc?.cutDay) || DEFAULT_CUT_DAY, payDay: Number(acc?.payDay) || DEFAULT_PAY_DAY };
}

// Primer corte en o despues de la fecha (dias enteros).
function cutOnOrAfter(dayNum, cutDay) {
  const [y, m] = parts(dayNum);
  const c = monthDate(y, m, cutDay);
  if (c >= dayNum) return c;
  const [y2, m2] = shiftMonth(y, m, 1);
  return monthDate(y2, m2, cutDay);
}
function previousCut(cutNum, cutDay) {
  const [y, m] = parts(cutNum);
  const [y2, m2] = shiftMonth(y, m, -1);
  return monthDate(y2, m2, cutDay);
}
function payDateFor(cutNum, payDay) {
  const [y, m, d] = parts(cutNum);
  if (payDay > d) return monthDate(y, m, payDay);
  const [y2, m2] = shiftMonth(y, m, 1);
  return monthDate(y2, m2, payDay);
}

// Dias que tendria una compra hecha en purchaseIso para pagarse sin intereses.
export function financingDays(purchaseIso, { cutDay, payDay }) {
  const p = toNum(purchaseIso);
  return payDateFor(cutOnOrAfter(p, cutDay), payDay) - p;
}

// Foto del ciclo en una fecha: proximo corte, extracto por pagar, ventana de compra recomendada.
export function cycleInfo(cfg, todayStr) {
  const today = toNum(todayStr);
  const nextCut = cutOnOrAfter(today, cfg.cutDay);
  const lastCut = previousCut(nextCut, cfg.cutDay);
  const statementPayBy = payDateFor(lastCut, cfg.payDay);
  const periodStart = lastCut + 1;
  const payByThisPeriod = payDateFor(nextCut, cfg.payDay);

  // Dentro de un periodo la financiacion baja un dia por dia: buenos dias al inicio, malos al final.
  const goodUntil = payByThisPeriod - GOOD_DAYS; // ultimo dia del periodo con >= GOOD_DAYS
  const badFrom = payByThisPeriod - BAD_DAYS + 1; // primer dia con <= BAD_DAYS
  const goodWindowActive = today <= Math.min(goodUntil, nextCut);
  const nextStart = nextCut + 1;
  const nextPayBy = payDateFor(cutOnOrAfter(nextStart, cfg.cutDay), cfg.payDay);

  return {
    todayFinancingDays: payByThisPeriod - today,
    todayPayBy: fromNum(payByThisPeriod),
    nextCut: fromNum(nextCut),
    daysToCut: nextCut - today,
    lastCut: fromNum(lastCut),
    statementPayBy: fromNum(statementPayBy),
    daysToPay: statementPayBy - today, // negativo = vencido
    periodStart: fromNum(periodStart),
    goodWindow: goodWindowActive
      ? { from: fromNum(Math.max(periodStart, today)), to: fromNum(Math.min(goodUntil, nextCut)), current: true }
      : { from: fromNum(nextStart), to: fromNum(Math.min(nextPayBy - GOOD_DAYS, cutOnOrAfter(nextStart, cfg.cutDay))), current: false },
    avoidFrom: fromNum(Math.min(badFrom, nextCut)),
    avoidTo: fromNum(nextCut),
  };
}

// Lo que falta por pagar del ultimo extracto cerrado. La deuda es saldo negativo:
// deuda al corte = -(saldo inicial + movimientos hasta el corte); se descuentan los abonos posteriores.
export function statementDue(initialBalance, transactions, lastCutIso) {
  let atCut = Number(initialBalance) || 0;
  let paidAfter = 0;
  for (const t of transactions) {
    const amount = Number(t.amount) || 0;
    if (t.date <= lastCutIso) atCut += amount;
    else if (amount > 0) paidAfter += amount;
  }
  return Math.max(0, -atCut - paidAfter);
}

// Aviso: hay algo por pagar y faltan ALERT_DAYS dias o menos (o ya vencio).
export function alertLevel(info, due) {
  if (!(due > 0)) return null;
  if (info.daysToPay < 0) return "overdue";
  if (info.daysToPay <= ALERT_DAYS) return "soon";
  return null;
}

// Evento mensual (.ics) en el dia limite de pago con alarmas 5 y 1 dia antes.
export function buildIcs({ name, payDay, nextPayBy }) {
  const stamp = new Date().toISOString().replace(/[-:]/g, "").slice(0, 15) + "Z";
  const date = nextPayBy.replace(/-/g, "");
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Mis Finanzas//Tarjeta//ES",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:pago-tarjeta-${payDay}@mis-finanzas`,
    `DTSTAMP:${stamp}`,
    `DTSTART;VALUE=DATE:${date}`,
    `RRULE:FREQ=MONTHLY;BYMONTHDAY=${payDay}`,
    `SUMMARY:Pagar tarjeta ${name} (último día sin intereses)`,
    "DESCRIPTION:Paga el total del extracto antes de esta fecha para evitar intereses y mora.",
    "TRANSP:TRANSPARENT",
    "BEGIN:VALARM",
    "ACTION:DISPLAY",
    "DESCRIPTION:Faltan 5 días para pagar la tarjeta",
    "TRIGGER:-P5D",
    "END:VALARM",
    "BEGIN:VALARM",
    "ACTION:DISPLAY",
    "DESCRIPTION:Mañana vence el pago de la tarjeta",
    "TRIGGER:-P1D",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
    "",
  ].join("\r\n");
}

// "good" (>= GOOD_DAYS), "bad" (< BAD_DAYS) o "regular" para una cantidad de dias de financiacion.
export function purchaseVerdict(days) {
  if (days >= GOOD_DAYS) return "good";
  if (days < BAD_DAYS) return "bad";
  return "regular";
}

// Cuenta los dias buenos / regulares / malos del ciclo actual (desde el dia siguiente al corte
// hasta el corte) y en que posicion cae hoy, para dibujar la linea de tiempo.
export function cycleZones(cfg, todayStr) {
  const info = cycleInfo(cfg, todayStr);
  const start = toNum(info.periodStart);
  const end = toNum(info.nextCut);
  const zones = { good: 0, regular: 0, bad: 0 };
  for (let d = start; d <= end; d++) zones[purchaseVerdict(financingDays(fromNum(d), cfg))]++;
  const total = end - start + 1;
  const today = toNum(todayStr);
  return {
    ...zones,
    total,
    todayIndex: today - start,
    // Rangos de ESTE ciclo (la ventana buena puede haber pasado ya: ver goodWindow para la siguiente).
    goodFrom: zones.good ? fromNum(start) : null,
    goodTo: zones.good ? fromNum(start + zones.good - 1) : null,
    goodPast: zones.good > 0 && today > start + zones.good - 1,
    badFrom: zones.bad ? fromNum(end - zones.bad + 1) : null,
    badTo: zones.bad ? fromNum(end) : null,
  };
}
