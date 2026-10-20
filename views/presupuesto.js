import { currency, budgetRowsForMonth, setBudget, currentMonth, monthsWithData, pocketAccounts, pocketBalance, savingsContribution } from "../state.js";
import { cx, amountClass } from "../ui.js";

let selectedMonth = null;

// Solo los gastos: Salario (Entrada) y Ahorro (bolsillo de Bancolombia) no van en la tabla.
const isExpenseRow = (r) => r.category.kind === "Salida";

export function renderPresupuesto(container, { markDirty }) {
  if (!selectedMonth) {
    const months = monthsWithData();
    selectedMonth = months.length ? months[months.length - 1] : currentMonth();
  }
  const rows = budgetRowsForMonth(selectedMonth).filter(isExpenseRow);
  // Los gastos libres (sin presupuesto fijo) solo muestran lo gastado y no entran en los totales.
  const budgeted = rows.filter((r) => !r.category.noBudget);
  const totals = budgeted.reduce(
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
    ${renderSavingsBlock(selectedMonth)}
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

// Gasto en positivo: "Estimado" y "Gastado" son magnitudes; el balance es lo que sobra (+) o se pasó (−).
const money = (n) => currency(Math.abs(n));
const noBudgetCell = `<span class="text-mute">—</span>`;

function renderDesktopTable(rows, totals) {
  return `
    <div class="${cx.tableWrap}">
    <table class="w-full text-sm">
      <thead><tr>
        <th scope="col" class="${cx.th}">Categoría</th><th scope="col" class="${cx.th}">Estimado</th><th scope="col" class="${cx.th}">Gastado</th><th scope="col" class="${cx.th}">Balance</th>
      </tr></thead>
      <tbody>
        ${rows
          .map((r) =>
            r.category.noBudget
              ? `<tr>
            <td class="${cx.td}">${r.category.name} <span class="text-[13px] text-mute">· gasto libre</span></td>
            <td class="${cx.td}">${noBudgetCell}</td>
            <td class="${cx.td}">${money(r.real)}</td>
            <td class="${cx.td}">${noBudgetCell}</td>
          </tr>`
              : `<tr>
            <td class="${cx.td}">${r.category.name}</td>
            <td class="${cx.td}"><input type="number" step="1" min="0" aria-label="Estimado de ${r.category.name}" class="budget-input ${cx.input} w-28" data-cat="${r.category.id}" value="${Math.abs(r.estimated)}" /></td>
            <td class="${cx.td}">${money(r.real)}</td>
            <td class="${cx.td} ${amountClass(r.balance)}">${currency(r.balance)}</td>
          </tr>`
          )
          .join("")}
      </tbody>
      <tfoot>
        <tr class="font-semibold">
          <td class="${cx.td} border-t-2 border-ink/30">Totales</td>
          <td class="${cx.td} border-t-2 border-ink/30">${money(totals.estimated)}</td>
          <td class="${cx.td} border-t-2 border-ink/30">${money(totals.real)}</td>
          <td class="${cx.td} border-t-2 border-ink/30 ${amountClass(totals.balance)}">${currency(totals.balance)}</td>
        </tr>
      </tfoot>
    </table>
    </div>
  `;
}

function renderMobileCards(rows, totals) {
  const rowsHtml = rows
    .map((r) =>
      r.category.noBudget
        ? `
    <div class="px-4 py-3">
      <div class="flex items-center justify-between gap-2">
        <span class="font-medium truncate">${r.category.name} <span class="text-[13px] font-normal text-mute">· gasto libre</span></span>
        <span class="font-medium shrink-0">${money(r.real)}</span>
      </div>
      <div class="text-[13px] text-mute mt-0.5">Gastado en el mes</div>
    </div>`
        : `
    <div class="px-4 py-3">
      <div class="flex items-center justify-between mb-2 gap-2">
        <span class="font-medium truncate">${r.category.name}</span>
      </div>
      <div class="grid grid-cols-3 gap-2">
        <div>
          <div class="text-[13px] text-mute mb-1">Estimado</div>
          <input type="number" step="1" min="0" aria-label="Estimado de ${r.category.name}" class="budget-input ${cx.input} px-2 py-1.5" data-cat="${r.category.id}" value="${Math.abs(r.estimated)}" />
        </div>
        <div>
          <div class="text-[13px] text-mute mb-1">Gastado</div>
          <div class="font-medium">${money(r.real)}</div>
        </div>
        <div>
          <div class="text-[13px] text-mute mb-1">Balance</div>
          <div class="font-medium ${amountClass(r.balance)}">${currency(r.balance)}</div>
        </div>
      </div>
    </div>
  `
    )
    .join("");

  return `
    ${rowsHtml}
    <div class="px-4 py-3">
      <div class="font-semibold mb-2">Totales</div>
      <div class="grid grid-cols-3 gap-2 text-sm">
        <div><div class="text-[13px] text-mute mb-1">Estimado</div><div class="font-medium">${money(totals.estimated)}</div></div>
        <div><div class="text-[13px] text-mute mb-1">Gastado</div><div class="font-medium">${money(totals.real)}</div></div>
        <div><div class="text-[13px] text-mute mb-1">Balance</div><div class="font-medium ${amountClass(totals.balance)}">${currency(totals.balance)}</div></div>
      </div>
    </div>
  `;
}

// "Ahorro" ya no es una categoria del presupuesto: es el bolsillo de Bancolombia.
function renderSavingsBlock(month) {
  const accs = pocketAccounts();
  if (!accs.length) return "";
  return `
    <div class="${cx.sectionTitle}">Ahorro</div>
    <div class="divide-y divide-line border-y border-line">
      ${accs
        .map((a) => {
          const saved = savingsContribution(month, a.id);
          return `
        <div class="flex items-baseline justify-between gap-4 px-4 py-4">
          <div>
            <div class="font-medium">${a.name} › Ahorro</div>
            <div class="text-[13px] text-mute mt-0.5">Aportado este mes: <span class="${amountClass(saved)}">${currency(saved, a.currency)}</span></div>
          </div>
          <div class="text-right">
            <div class="text-xl font-light ${amountClass(pocketBalance(a.id))}">${currency(pocketBalance(a.id), a.currency)}</div>
            <div class="text-[13px] text-mute mt-0.5">Saldo actual</div>
          </div>
        </div>`;
        })
        .join("")}
    </div>
  `;
}
