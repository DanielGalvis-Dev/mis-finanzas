import { currency, budgetRowsForMonth, setBudget, currentMonth, monthsWithData } from "../state.js";
import { cx, amountClass, pillClass } from "../ui.js";

let selectedMonth = null;

export function renderPresupuesto(container, { markDirty }) {
  if (!selectedMonth) {
    const months = monthsWithData();
    selectedMonth = months.length ? months[months.length - 1] : currentMonth();
  }
  const rows = budgetRowsForMonth(selectedMonth);
  const totals = rows.reduce(
    (acc, r) => ({ estimated: acc.estimated + r.estimated, real: acc.real + r.real, balance: acc.balance + r.balance }),
    { estimated: 0, real: 0, balance: 0 }
  );

  container.innerHTML = `
    <div class="mb-6">
      <input type="month" id="monthPicker" aria-label="Mes" class="${cx.input} w-full sm:w-auto" value="${selectedMonth}" />
    </div>
    <div >
      <div class="hidden md:block">${renderDesktopTable(rows, totals)}</div>
      <div class="md:hidden divide-y divide-line">${renderMobileCards(rows, totals)}</div>
    </div>
  `;

  container.querySelector("#monthPicker").addEventListener("change", (e) => {
    selectedMonth = e.target.value;
    renderPresupuesto(container, { markDirty });
  });

  container.querySelectorAll(".budget-input").forEach((input) => {
    input.addEventListener("change", (e) => {
      setBudget(selectedMonth, e.target.dataset.cat, e.target.value);
      markDirty();
      // Al re-dibujar se pierde el foco: se devuelve al campo que tenia (el siguiente al pulsar Tab).
      const next = document.activeElement?.classList?.contains("budget-input") ? document.activeElement.dataset.cat : null;
      renderPresupuesto(container, { markDirty });
      if (next) [...container.querySelectorAll(`.budget-input[data-cat="${next}"]`)].find((el) => el.offsetParent !== null)?.focus();
    });
  });
}

function renderDesktopTable(rows, totals) {
  return `
    <div class="${cx.tableWrap}">
    <table class="w-full text-sm">
      <thead><tr>
        <th scope="col" class="${cx.th}">Categoría</th><th scope="col" class="${cx.th}">Tipo</th><th scope="col" class="${cx.th}">Estimado</th><th scope="col" class="${cx.th}">Real</th><th scope="col" class="${cx.th}">Balance</th>
      </tr></thead>
      <tbody>
        ${rows
          .map(
            (r) => `<tr>
            <td class="${cx.td}">${r.category.name}</td>
            <td class="${cx.td}"><span class="${pillClass(r.category.kind)}">${r.category.kind}</span></td>
            <td class="${cx.td}"><input type="number" step="1" aria-label="Estimado de ${r.category.name}" class="budget-input ${cx.input} w-28" data-cat="${r.category.id}" value="${r.estimated}" /></td>
            <td class="${cx.td} ${amountClass(r.real)}">${currency(r.real)}</td>
            <td class="${cx.td} ${amountClass(r.balance)}">${currency(r.balance)}</td>
          </tr>`
          )
          .join("")}
      </tbody>
      <tfoot>
        <tr class="font-bold">
          <td class="${cx.td} border-t-2 border-ink/30">TOTALES</td><td class="${cx.td} border-t-2 border-ink/30"></td>
          <td class="${cx.td} border-t-2 border-ink/30">${currency(totals.estimated)}</td>
          <td class="${cx.td} border-t-2 border-ink/30 ${amountClass(totals.real)}">${currency(totals.real)}</td>
          <td class="${cx.td} border-t-2 border-ink/30 ${amountClass(totals.balance)}">${currency(totals.balance)}</td>
        </tr>
      </tfoot>
    </table>
    </div>
  `;
}

function renderMobileCards(rows, totals) {
  const rowsHtml = rows
    .map(
      (r) => `
    <div class="py-3">
      <div class="flex items-center justify-between mb-2 gap-2">
        <span class="font-medium truncate">${r.category.name}</span>
        <span class="${pillClass(r.category.kind)} shrink-0">${r.category.kind}</span>
      </div>
      <div class="grid grid-cols-3 gap-2">
        <div>
          <div class="text-xs text-mute mb-1">Estimado</div>
          <input type="number" step="1" aria-label="Estimado de ${r.category.name}" class="budget-input ${cx.input} px-2 py-1.5" data-cat="${r.category.id}" value="${r.estimated}" />
        </div>
        <div>
          <div class="text-xs text-mute mb-1">Real</div>
          <div class="font-medium ${amountClass(r.real)}">${currency(r.real)}</div>
        </div>
        <div>
          <div class="text-xs text-mute mb-1">Balance</div>
          <div class="font-medium ${amountClass(r.balance)}">${currency(r.balance)}</div>
        </div>
      </div>
    </div>
  `
    )
    .join("");

  return `
    ${rowsHtml}
    <div class="py-3">
      <div class="font-bold mb-2">TOTALES</div>
      <div class="grid grid-cols-3 gap-2 text-sm">
        <div><div class="text-xs text-mute mb-1">Estimado</div><div class="font-medium">${currency(totals.estimated)}</div></div>
        <div><div class="text-xs text-mute mb-1">Real</div><div class="font-medium ${amountClass(totals.real)}">${currency(totals.real)}</div></div>
        <div><div class="text-xs text-mute mb-1">Balance</div><div class="font-medium ${amountClass(totals.balance)}">${currency(totals.balance)}</div></div>
      </div>
    </div>
  `;
}
