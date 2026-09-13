import { state, currency, accountBalance, totalBalance, transactionsSorted } from "../state.js";
import { openTransactionForm, renderTransactionList, bindTransactionList } from "./transactionList.js";
import { cx, amountClass } from "../ui.js";

export function renderDashboard(container, { markDirty }) {
  const rerender = () => renderDashboard(container, { markDirty });
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
      ${renderTransactionList(recent, { showActions: false })}
    </div>
  `;

  container.querySelector("#quickAddBtn").addEventListener("click", () => {
    openTransactionForm({ onSaved: markDirty, onRerender: rerender });
  });

  bindTransactionList(container, recent, { markDirty, onRerender: rerender });
}
