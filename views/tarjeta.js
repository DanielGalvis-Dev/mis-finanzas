import { state, currency } from "../state.js";
import { cardConfig, cycleInfo, statementDue, alertLevel, todayIso, buildIcs, GOOD_DAYS, BAD_DAYS, purchaseVerdict, cycleZones, ALERT_DAYS } from "../card.js";
import { cx, pillClass } from "../ui.js";
import { alertDialog } from "../modal.js";

const fmt = (iso) => new Date(iso + "T00:00:00Z").toLocaleDateString("es-CO", { day: "numeric", month: "short", timeZone: "UTC" }).replace(" de ", " ").replace(".", "");
const plural = (n, one, many) => `${n} ${Math.abs(n) === 1 ? one : many}`;

function creditAccounts() {
  return state.data.accounts.filter((a) => a.type === "credit");
}

function summary(acc, today = todayIso()) {
  const cfg = cardConfig(acc);
  const info = cycleInfo(cfg, today);
  const txs = state.data.transactions.filter((t) => t.accountId === acc.id);
  const due = statementDue(acc.initialBalance, txs, info.lastCut);
  return { acc, cfg, info, due, level: alertLevel(info, due), today };
}

function alertText({ info, due, level }) {
  if (level === "overdue") return `Pago vencido: debes ${currency(due)} (límite era el ${fmt(info.statementPayBy)}). Paga cuanto antes para frenar intereses y mora.`;
  return `Pagar ${currency(due)} antes del ${fmt(info.statementPayBy)}: ${info.daysToPay === 0 ? "vence hoy" : `faltan ${plural(info.daysToPay, "día", "días")}`}.`;
}

export function cardAlertBannerHTML() {
  return creditAccounts()
    .map((a) => summary(a))
    .filter((s) => s.level)
    .map(
      (s) => `<div class="mb-6 px-4 py-3 rounded-2xl border ${s.level === "overdue" ? "border-neg/50 bg-neg/10 text-neg" : "border-accent/50 bg-accent/10 text-ink"} text-sm leading-relaxed" role="alert"><b>${s.acc.name}:</b> ${alertText(s)}</div>`
    )
    .join("");
}

// Linea de tiempo del ciclo: tres tramos (mejor / regular / evita) con su proporcion real de dias
// y una marca en el dia de hoy. El significado va en texto, no solo en color.
function cycleTimeline(s) {
  const z = cycleZones(s.cfg, s.today);
  const { info } = s;
  const pos = ((z.todayIndex + 0.5) / z.total) * 100;
  const seg = (n, cls) => (n ? `<div class="h-3 ${cls}" style="flex:${n} 1 0"></div>` : "");
  const label = `Ciclo del ${fmt(info.periodStart)} al ${fmt(info.nextCut)}. Hoy es el día ${z.todayIndex + 1} de ${z.total}. Mejores días: ${z.good}; regulares: ${z.regular}; evitar: ${z.bad}.`;
  return `<div class="py-5">
    <div class="flex items-baseline justify-between text-sm mb-3"><span class="font-medium">Ciclo actual</span><span class="text-mute">${fmt(info.periodStart)} – ${fmt(info.nextCut)}</span></div>
    <div class="relative" role="img" aria-label="${label}">
      <div class="flex gap-0.5 rounded-full overflow-hidden">${seg(z.good, "bg-pos")}${seg(z.regular, "bg-mute/35")}${seg(z.bad, "bg-neg/70")}</div>
      <div class="absolute -top-1.5 -bottom-1.5 w-0.5 bg-ink rounded-full" style="left:${pos.toFixed(2)}%" title="Hoy"></div>
    </div>
    <ul class="mt-4 grid gap-2 text-sm">
      <li class="flex items-center gap-2"><span class="size-2.5 rounded-sm bg-pos shrink-0"></span><span><b class="font-medium">Mejor comprar</b> ${z.good ? `${fmt(z.goodFrom)} – ${fmt(z.goodTo)}` : "—"} · ${GOOD_DAYS}+ días${z.goodPast ? " · ya pasó" : s.today <= z.goodTo ? " · ahora" : ""}</span></li>
      <li class="flex items-center gap-2"><span class="size-2.5 rounded-sm bg-mute/35 shrink-0"></span><span><b class="font-medium">Regular</b> · entre ${BAD_DAYS} y ${GOOD_DAYS - 1} días</span></li>
      <li class="flex items-center gap-2"><span class="size-2.5 rounded-sm bg-neg/70 shrink-0"></span><span><b class="font-medium">Evita</b> ${z.bad ? `${fmt(z.badFrom)} – ${fmt(z.badTo)}` : "—"} · menos de ${BAD_DAYS} días</span></li>
    </ul>
  </div>`;
}

const VERDICT_TEXT = {
  good: { pill: "entrada", title: "Buen momento para comprar" },
  regular: { pill: "", title: "Puedes comprar" },
  bad: { pill: "salida", title: "Mejor espera al corte" },
};

function verdictRow(s) {
  const { info } = s;
  const v = purchaseVerdict(info.todayFinancingDays);
  const next = info.goodWindow.current ? null : info.goodWindow.from;
  const hint = v === "good" ? "" : next ? ` Desde el ${fmt(next)} tendrías ${GOOD_DAYS}+ días.` : "";
  return `<div class="flex items-start justify-between gap-4 py-4">
    <div class="min-w-0">
      <div class="font-medium">${VERDICT_TEXT[v].title}</div>
      <div class="text-sm text-mute mt-0.5">Una compra hoy se paga hasta el ${fmt(info.todayPayBy)}.${hint}</div>
    </div>
    <div class="shrink-0 text-right"><span class="${pillClass(VERDICT_TEXT[v].pill)}">${info.todayFinancingDays} días</span></div>
  </div>`;
}

function dueRow(s) {
  const { info, due, level } = s;
  const tone = level ? "text-neg" : "";
  if (!(due > 0)) {
    return `<div class="flex items-baseline justify-between gap-4 py-4"><div><div class="font-medium">Extracto al día</div><div class="text-sm text-mute mt-0.5">Próximo corte ${fmt(info.nextCut)} (${info.daysToCut === 0 ? "hoy" : "en " + plural(info.daysToCut, "día", "días")})</div></div></div>`;
  }
  const when = info.daysToPay < 0 ? `Vencido hace ${plural(-info.daysToPay, "día", "días")}` : info.daysToPay === 0 ? "Vence hoy" : `Faltan ${plural(info.daysToPay, "día", "días")}`;
  return `<div class="flex items-baseline justify-between gap-4 py-4">
    <div><div class="font-medium">Pagar antes del ${fmt(info.statementPayBy)}</div><div class="text-sm ${level ? "text-neg" : "text-mute"} mt-0.5">${when} · corte ${fmt(info.nextCut)} en ${plural(info.daysToCut, "día", "días")}</div></div>
    <div class="text-xl font-light ${tone}">${currency(due)}</div>
  </div>`;
}

export function cardPanelsHTML() {
  const list = creditAccounts();
  if (!list.length) return "";
  const perm = "Notification" in window ? Notification.permission : "unsupported";
  return list
    .map((acc) => {
      const s = summary(acc);
      return `<div class="${cx.sectionTitle}">Tarjeta · ${acc.name}</div>
      <div data-card="${acc.id}">
        <div class="divide-y divide-line border-y border-line">${dueRow(s)}${verdictRow(s)}</div>
        ${cycleTimeline(s)}
        <div class="flex flex-wrap items-center gap-2 border-t border-line pt-4">
          <button type="button" class="${cx.btn} min-h-11 md:min-h-0" data-ics="${acc.id}">Agregar al calendario</button>
          ${perm === "default" ? `<button type="button" class="${cx.btn} min-h-11 md:min-h-0" data-notify="${acc.id}">Activar avisos</button>` : perm === "granted" ? `<span class="text-sm text-mute">Avisos activados</span>` : ""}
        </div>
        <p class="text-sm text-mute mt-3 leading-relaxed">Corte el ${s.cfg.cutDay}, pago hasta el ${s.cfg.payDay}. Te avisamos ${ALERT_DAYS} días antes. Cambia las fechas en Ajustes → cuenta.</p>
      </div>`;
    })
    .join("");
}

export function bindCardPanels(container, rerender) {
  container.querySelectorAll("[data-ics]").forEach((btn) =>
    btn.addEventListener("click", () => {
      const acc = state.data.accounts.find((a) => a.id === btn.dataset.ics);
      const s = summary(acc);
      const ics = buildIcs({ name: acc.name, payDay: s.cfg.payDay, nextPayBy: s.info.statementPayBy >= s.today ? s.info.statementPayBy : s.info.todayPayBy });
      const url = URL.createObjectURL(new Blob([ics], { type: "text/calendar;charset=utf-8" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = "pago-tarjeta.ics";
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      alertDialog("Se descargó pago-tarjeta.ics. Ábrelo para agregarlo a tu calendario: se repite cada mes y te avisa 5 días y 1 día antes.", "success");
    })
  );
  container.querySelectorAll("[data-notify]").forEach((btn) =>
    btn.addEventListener("click", async () => {
      const perm = await Notification.requestPermission();
      if (perm === "granted") checkCardNotifications({ force: true });
      rerender();
    })
  );
}

// Notificacion del sistema cuando abres la app y el pago esta cerca (una vez al dia por extracto).
// Una web estatica no puede avisar con la app cerrada: para eso esta el evento de calendario.
export async function checkCardNotifications({ force = false } = {}) {
  if (!("Notification" in window) || Notification.permission !== "granted" || !state.data) return;
  for (const s of creditAccounts().map((a) => summary(a))) {
    if (!s.level) continue;
    const key = `misFinanzasCardAlert:${s.acc.id}`;
    const stamp = `${s.today}|${s.info.statementPayBy}`;
    try {
      if (!force && localStorage.getItem(key) === stamp) continue;
      localStorage.setItem(key, stamp);
    } catch {}
    const title = s.level === "overdue" ? "Pago de tarjeta vencido" : "Pago de tarjeta por vencer";
    const options = { body: `${s.acc.name}: ${alertText(s)}`, icon: "icons/icon-192.png", tag: key };
    try {
      const reg = await navigator.serviceWorker?.ready;
      if (reg?.showNotification) await reg.showNotification(title, options);
      else new Notification(title, options);
    } catch {}
  }
}
