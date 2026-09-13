import { currency, totalRowsAllTime } from "../state.js";
import { cx, amountClass, pillClass } from "../ui.js";

export function renderTotal(container) {
  const rows = totalRowsAllTime();
  const total = rows.reduce((s, r) => s + r.real, 0);

  container.innerHTML = `
    <div class="${cx.card}">
      <div class="hidden sm:block">${renderDesktopTable(rows, total)}</div>
      <div class="sm:hidden divide-y divide-slate-700">${renderMobileCards(rows, total)}</div>
    </div>
  `;
}

function renderDesktopTable(rows, total) {
  return `
    <div class="${cx.tableWrap}">
    <table class="w-full text-sm">
      <thead><tr>
        <th class="${cx.th}">Categoría</th><th class="${cx.th}">Tipo</th><th class="${cx.th}">Real acumulado</th>
      </tr></thead>
      <tbody>
        ${rows
          .map(
            (r) => `<tr>
            <td class="${cx.td}">${r.category.name}</td>
            <td class="${cx.td}"><span class="${pillClass(r.category.kind)}">${r.category.kind}</span></td>
            <td class="${cx.td} ${amountClass(r.real)}">${currency(r.real)}</td>
          </tr>`
          )
          .join("")}
      </tbody>
      <tfoot>
        <tr class="font-bold">
          <td class="${cx.td} border-t-2 border-slate-600">TOTALES</td><td class="${cx.td} border-t-2 border-slate-600"></td>
          <td class="${cx.td} border-t-2 border-slate-600 ${amountClass(total)}">${currency(total)}</td>
        </tr>
      </tfoot>
    </table>
    </div>
  `;
}

function renderMobileCards(rows, total) {
  const rowsHtml = rows
    .map(
      (r) => `
    <div class="py-2.5 flex items-center justify-between gap-2">
      <div class="flex items-center gap-2 min-w-0">
        <span class="font-medium truncate">${r.category.name}</span>
        <span class="${pillClass(r.category.kind)} shrink-0">${r.category.kind}</span>
      </div>
      <div class="font-semibold shrink-0 ${amountClass(r.real)}">${currency(r.real)}</div>
    </div>
  `
    )
    .join("");

  return `
    ${rowsHtml}
    <div class="py-2.5 flex items-center justify-between font-bold">
      <span>TOTALES</span>
      <span class="${amountClass(total)}">${currency(total)}</span>
    </div>
  `;
}
