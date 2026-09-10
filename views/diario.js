import {
  state,
  currency,
  addTransaction,
  updateTransaction,
  deleteTransaction,
  categoryById,
  accountById,
  transactionsSorted,
} from "../state.js";
import { openModal, confirmDialog } from "../modal.js";
import { cx, amountClass, pillClass } from "../ui.js";

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
    <div class="flex gap-2.5 items-center flex-wrap mb-3.5">
      <input type="month" id="filterMonth" class="${cx.input} w-auto" value="${currentFilters.month}" />
      <select id="filterAccount" class="${cx.input} w-auto">
        <option value="">Todas las cuentas</option>
        ${accounts.map((a) => `<option value="${a.id}" ${currentFilters.accountId === a.id ? "selected" : ""}>${a.name}</option>`).join("")}
      </select>
      <select id="filterCategory" class="${cx.input} w-auto">
        <option value="">Todas las categorías</option>
        ${categories.map((c) => `<option value="${c.id}" ${currentFilters.categoryId === c.id ? "selected" : ""}>${c.name}</option>`).join("")}
      </select>
      <div class="flex-1"></div>
      <button class="${cx.btn} ${cx.btnPrimary}" id="addTxBtn">+ Agregar movimiento</button>
    </div>
    <div class="${cx.card}">
      ${rows.length === 0 ? `<div class="${cx.emptyState}">No hay movimientos con estos filtros.</div>` : renderTable(rows)}
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

  container.querySelectorAll("[data-edit]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const tx = state.data.transactions.find((t) => t.id === btn.dataset.edit);
      openTransactionForm({ tx, onSaved: markDirty, onRerender: rerender });
    });
  });
  container.querySelectorAll("[data-delete]").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (confirmDialog("¿Borrar este movimiento?")) {
        deleteTransaction(btn.dataset.delete);
        markDirty();
        rerender();
      }
    });
  });
}

function renderTable(rows) {
  return `
    <div class="${cx.tableWrap}">
    <table class="w-full text-sm">
      <thead><tr>
        <th class="${cx.th}">Fecha</th><th class="${cx.th}">Cuenta</th><th class="${cx.th}">Categoría</th><th class="${cx.th}">Descripción</th><th class="${cx.th}">Tipo</th><th class="${cx.th}">Monto</th><th class="${cx.th}"></th>
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
              <td class="${cx.td}"><span class="${pillClass(t.type)}">${t.type}</span></td>
              <td class="${cx.td} ${amountClass(t.amount)}">${currency(t.amount)}</td>
              <td class="${cx.td}">
                <div class="flex gap-1.5">
                  <button class="${cx.btn} ${cx.btnSmall}" data-edit="${t.id}">Editar</button>
                  <button class="${cx.btnDanger} ${cx.btnSmall}" data-delete="${t.id}">Borrar</button>
                </div>
              </td>
            </tr>`;
          })
          .join("")}
      </tbody>
    </table>
    </div>
  `;
}

export function openTransactionForm({ tx, onSaved, onRerender }) {
  const accounts = state.data.accounts;
  const categories = state.data.categories;
  const isEdit = !!tx;
  const today = new Date().toISOString().slice(0, 10);

  openModal({
    title: isEdit ? "Editar movimiento" : "Agregar movimiento",
    submitLabel: isEdit ? "Guardar cambios" : "Agregar",
    bodyHTML: `
      <div class="grid grid-cols-2 gap-3">
        <div><label class="${cx.label}">Fecha</label>
          <input type="date" name="date" class="${cx.input}" value="${tx ? tx.date : today}" required />
        </div>
        <div><label class="${cx.label}">Tipo</label>
          <select name="type" class="${cx.input}" required>
            <option value="Entrada" ${tx?.type === "Entrada" ? "selected" : ""}>Entrada</option>
            <option value="Salida" ${!tx || tx?.type === "Salida" ? "selected" : ""}>Salida</option>
          </select>
        </div>
        <div><label class="${cx.label}">Cuenta</label>
          <select name="accountId" class="${cx.input}" required>
            ${accounts.map((a) => `<option value="${a.id}" ${tx?.accountId === a.id ? "selected" : ""}>${a.name}</option>`).join("")}
          </select>
        </div>
        <div><label class="${cx.label}">Categoría</label>
          <select name="categoryId" class="${cx.input}" required>
            ${categories.map((c) => `<option value="${c.id}" ${tx?.categoryId === c.id ? "selected" : ""}>${c.name}</option>`).join("")}
          </select>
        </div>
        <div class="col-span-2"><label class="${cx.label}">Descripción</label>
          <input type="text" name="description" class="${cx.input}" value="${tx ? (tx.description || "").replace(/"/g, "&quot;") : ""}" />
        </div>
        <div class="col-span-2"><label class="${cx.label}">Monto (positivo, el tipo define el signo)</label>
          <input type="number" name="amount" step="1" min="0" class="${cx.input}" value="${tx ? Math.abs(tx.amount) : ""}" required />
        </div>
      </div>
    `,
    onSubmit: (values, close) => {
      const signedAmount = values.type === "Salida" ? -Math.abs(Number(values.amount)) : Math.abs(Number(values.amount));
      const payload = {
        date: values.date,
        type: values.type,
        accountId: values.accountId,
        categoryId: values.categoryId,
        description: values.description || "",
        amount: signedAmount,
      };
      if (isEdit) updateTransaction(tx.id, payload);
      else addTransaction(payload);
      onSaved();
      close();
      onRerender();
    },
  });
}
