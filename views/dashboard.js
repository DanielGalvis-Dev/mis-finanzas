import { state, currency, accountBalance, totalBalance, transactionsSorted } from "../state.js";
import { openTransactionForm, renderTransactionList, bindTransactionList } from "./transactionList.js";
import { cx, amountClass } from "../ui.js";

export function renderDashboard(container, { markDirty }) {
  const rerender = () => renderDashboard(container, { markDirty });
  const accounts = state.data.accounts;
  const recent = transactionsSorted().slice(0, 8);

  container.innerHTML = `
    <section class="pt-2 pb-10">
      <div class="text-sm text-mute">Total general</div>
      <div class="text-[2.6rem] leading-none sm:text-7xl font-light tracking-tight mt-2 ${amountClass(totalBalance())}">${currency(totalBalance())}</div>
    </section>

    <div class="${cx.sectionTitle}">Cuentas</div>
    <div class="divide-y divide-line border-y border-line">
      ${accounts
        .map((a) => {
          const bal = accountBalance(a.id);
          return `
          <div class="flex items-baseline justify-between gap-4 py-4">
            <div>
              <div class="font-medium">${a.name}</div>
              ${a.type === "credit" ? `<div class="text-xs text-mute mt-0.5">Cupo ${currency(a.creditLimit || 0)}</div>` : ""}
            </div>
            <div class="text-xl font-light ${amountClass(bal)}">${currency(bal)}</div>
          </div>`;
        })
        .join("")}
    </div>

    <div class="flex items-center justify-between mt-12 mb-3">
      <div class="text-sm font-medium text-mute">Movimientos recientes</div>
      <button class="${cx.btnPrimary} ${cx.btnSmall}" id="quickAddBtn">Agregar movimiento</button>
    </div>
    <div>
      ${renderTransactionList(recent, { showActions: false })}
    </div>
  `;

  container.querySelector("#quickAddBtn").addEventListener("click", () => {
    openTransactionForm({ onSaved: markDirty, onRerender: rerender });
  });

  bindTransactionList(container, recent, { markDirty, onRerender: rerender });
}
