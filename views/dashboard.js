import { state, currency, accountBalance, totalBalance, categoryById, accountById, transactionsSorted } from "../state.js";
import { openTransactionForm } from "./diario.js";
import { cx, amountClass } from "../ui.js";

export function renderDashboard(container, { markDirty }) {
  const accounts = state.data.accounts;
  const recent = transactionsSorted().slice(0, 8);

  container.innerHTML = `
    <div class="${cx.sectionTitle}">Balances</div>
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
      ${accounts
        .map((a) => {
          const bal = accountBalance(a.id);
          return `
          <div class="${cx.card}">
            <div class="text-xs text-slate-400 uppercase tracking-wide">${a.name}</div>
            <div class="text-2xl font-bold mt-1 ${amountClass(bal)}">${currency(bal)}</div>
            ${a.type === "credit" ? `<div class="text-xs text-slate-500 mt-1">Cupo: ${currency(a.creditLimit || 0)}</div>` : ""}
          </div>`;
        })
        .join("")}
      <div class="${cx.card}">
        <div class="text-xs text-slate-400 uppercase tracking-wide">Total general</div>
        <div class="text-2xl font-bold mt-1 text-blue-400">${currency(totalBalance())}</div>
      </div>
    </div>

    <div class="flex items-center justify-between mt-6 mb-2.5">
      <div class="text-sm font-bold text-slate-100">Movimientos recientes</div>
      <button class="${cx.btn} ${cx.btnPrimary} ${cx.btnSmall}" id="quickAddBtn">+ Agregar movimiento</button>
    </div>
    <div class="${cx.card}">
      ${recent.length === 0 ? `<div class="${cx.emptyState}">Aún no hay movimientos.</div>` : renderRecentTable(recent)}
    </div>
  `;

  container.querySelector("#quickAddBtn").addEventListener("click", () => {
    openTransactionForm({ onSaved: markDirty, onRerender: () => renderDashboard(container, { markDirty }) });
  });
}

function renderRecentTable(rows) {
  return `
    <div class="${cx.tableWrap}">
    <table class="w-full text-sm">
      <thead><tr>
        <th class="${cx.th}">Fecha</th><th class="${cx.th}">Cuenta</th><th class="${cx.th}">Categoría</th><th class="${cx.th}">Descripción</th><th class="${cx.th}">Monto</th>
      </tr></thead>
      <tbody>
        ${rows
          .map((t) => {
            const cat = categoryById(t.categoryId);
            const acc = accountById(t.accountId);
            return `<tr>
              <td class="${cx.td}">${t.date}</td>
              <td class="${cx.td}">${acc ? acc.name : "—"}</td>
              <td class="${cx.td}">${cat ? cat.name : "—"}</td>
              <td class="${cx.td}">${t.description || ""}</td>
              <td class="${cx.td} ${amountClass(t.amount)}">${currency(t.amount)}</td>
            </tr>`;
          })
          .join("")}
      </tbody>
    </table>
    </div>
  `;
}
