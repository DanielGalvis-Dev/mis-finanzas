import { state, transactionsSorted } from "../state.js";
import { cx } from "../ui.js";
import { renderTransactionList, bindTransactionList, openTransactionForm } from "./transactionList.js";

export { openTransactionForm };

let currentFilters = { month: "", accountId: "", categoryId: "" };

export function renderDiario(container, { markDirty }) {
  const rerender = () => renderDiario(container, { markDirty });
  const rows = transactionsSorted().filter((t) => {
    if (currentFilters.month && !t.date.startsWith(currentFilters.month)) return false;
    if (currentFilters.accountId && t.accountId !== currentFilters.accountId) return false;
    if (currentFilters.categoryId && t.categoryId !== currentFilters.categoryId) return false;
    return true;
  });

  const accounts = state.data.accounts;
  const categories = state.data.categories;

  container.innerHTML = `
    <div class="grid grid-cols-2 gap-2 mb-6 md:flex md:flex-wrap md:items-center md:gap-3">
      <button class="${cx.btnPrimary} order-first col-span-2 py-3 md:order-last md:col-span-1 md:ml-auto md:py-2" id="addTxBtn">Agregar movimiento</button>
      <input type="month" id="filterMonth" class="${cx.input} w-full md:w-auto" value="${currentFilters.month}" aria-label="Mes" />
      <select id="filterAccount" class="${cx.input} w-full md:w-auto" aria-label="Cuenta">
        <option value="">Cuentas</option>
        ${accounts.map((a) => `<option value="${a.id}" ${currentFilters.accountId === a.id ? "selected" : ""}>${a.name}</option>`).join("")}
      </select>
      <select id="filterCategory" class="${cx.input} col-span-2 w-full md:col-span-1 md:w-auto" aria-label="Categoría">
        <option value="">Categorías</option>
        ${categories.map((c) => `<option value="${c.id}" ${currentFilters.categoryId === c.id ? "selected" : ""}>${c.name}</option>`).join("")}
      </select>
    </div>
    <div>
      ${rows.length === 0 ? `<div class="${cx.emptyState}">No hay movimientos con estos filtros.</div>` : renderTransactionList(rows)}
    </div>
  `;

  container.querySelector("#filterMonth").addEventListener("change", (e) => {
    currentFilters.month = e.target.value;
    rerender();
  });
  container.querySelector("#filterAccount").addEventListener("change", (e) => {
    currentFilters.accountId = e.target.value;
    rerender();
  });
  container.querySelector("#filterCategory").addEventListener("change", (e) => {
    currentFilters.categoryId = e.target.value;
    rerender();
  });
  container.querySelector("#addTxBtn").addEventListener("click", () => {
    openTransactionForm({ onSaved: markDirty, onRerender: rerender });
  });

  bindTransactionList(container, rows, { markDirty, onRerender: rerender });
}
