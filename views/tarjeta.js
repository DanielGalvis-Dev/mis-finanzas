import { state, currency } from "../state.js";
import { cardConfig, cycleInfo, statementDue, alertLevel, todayIso, buildIcs, GOOD_DAYS, BAD_DAYS, financingDays, ALERT_DAYS } from "../card.js";
import { cx } from "../ui.js";
import { alertDialog } from "../modal.js";

const fmt = (iso) => new Date(iso + "T00:00:00Z").toLocaleDateString("es-CO", { day: "numeric", month: "short", timeZone: "UTC" });
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

// Franja del ciclo actual: un cuadro por dia, mas oscuro = mas dias para pagar.
function cycleStrip({ info, cfg, today }) {
  const days = [];
  const start = new Date(info.periodStart + "T00:00:00Z").getTime();
  const end = new Date(info.nextCut + "T00:00:00Z").getTime();
  for (let t = start; t <= end; t += 86400000) days.push(new Date(t).toISOString().slice(0, 10));
  return `<div class="flex gap-px mt-2" aria-hidden="true">${days
    .map((d) => {
      const f = financingDays(d, cfg);
      const cls = f >= GOOD_DAYS ? "bg-pos" : f < BAD_DAYS ? "bg-neg" : "bg-accent";
      const opacity = f >= GOOD_DAYS ? 1 : f < BAD_DAYS ? 0.85 : 0.45;
      return `<div class="flex-1 h-5 rounded-sm ${cls} ${d === today ? "ring-2 ring-ink" : ""}" style="opacity:${opacity}" title="${fmt(d)}: ${f} días"></div>`;
    })
    .join("")}</div>
    <div class="flex justify-between text-[11px] text-mute mt-1"><span>${fmt(info.periodStart)}</span><span>corte ${fmt(info.nextCut)}</span></div>`;
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

export function cardPanelsHTML() {
  const list = creditAccounts();
  if (!list.length) return "";
  const canNotify = "Notification" in window && Notification.permission === "default";
  return `<div class="${cx.sectionTitle}">Tarjeta de crédito</div>${list
    .map((acc) => {
      const s = summary(acc);
      const { info, due, cfg } = s;
      const good = info.goodWindow;
      return `<div class="${cx.card} mb-3" data-card="${acc.id}">
        <div class="font-medium mb-3">${acc.name}</div>
        <dl class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
          <dt class="text-mute">Por pagar</dt>
          <dd>${due > 0 ? `<b>${currency(due)}</b> antes del ${fmt(info.statementPayBy)} (${info.daysToPay < 0 ? "vencido" : plural(info.daysToPay, "día", "días")})` : "Nada pendiente del último extracto"}</dd>
          <dt class="text-mute">Si compras hoy</dt>
          <dd><b>${info.todayFinancingDays}</b> días para pagar (hasta el ${fmt(info.todayPayBy)})</dd>
          <dt class="text-mute">Próximo corte</dt>
          <dd>${fmt(info.nextCut)} (${info.daysToCut === 0 ? "hoy" : "en " + plural(info.daysToCut, "día", "días")})</dd>
          <dt class="text-mute">Mejor comprar</dt>
          <dd>${good.from <= good.to ? `del ${fmt(good.from)} al ${fmt(good.to)} (${GOOD_DAYS}+ días)${good.current ? " · es ahora" : ""}` : "—"}</dd>
          <dt class="text-mute">Evita</dt>
          <dd>del ${fmt(info.avoidFrom)} al ${fmt(info.avoidTo)} (menos de ${BAD_DAYS} días): mejor esperar al corte</dd>
        </dl>
        ${cycleStrip(s)}
        <div class="flex flex-wrap gap-2 mt-4">
          <button type="button" class="${cx.btn} ${cx.btnSmall}" data-ics="${acc.id}">Agregar recordatorio al calendario</button>
          ${canNotify ? `<button type="button" class="${cx.btn} ${cx.btnSmall}" data-notify="${acc.id}">Activar avisos en este dispositivo</button>` : ""}
        </div>
        <p class="text-[11px] text-mute mt-3 leading-relaxed">Corte día ${cfg.cutDay}, pago hasta el día ${cfg.payDay} (se cambian en Ajustes). Aviso cuando falten ${ALERT_DAYS} días o menos.</p>
      </div>`;
    })
    .join("")}`;
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
