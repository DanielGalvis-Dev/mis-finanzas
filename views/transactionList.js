import {
  state,
  currency,
  addTransaction,
  updateTransaction,
  deleteTransaction,
  categoryById,
  accountById,
} from "../state.js";
import { openModal, confirmDialog } from "../modal.js";
import { cx, amountClass, pillClass } from "../ui.js";

// Compact rows at every width (no horizontal scrolling). Tapping a row opens the edit
// modal, which has full detail plus a Borrar button.
export function renderTransactionList(rows, { showActions = true } = {}) {
  if (rows.length === 0) return `<div class="${cx.emptyState}">No hay movimientos.</div>`;
  return `<div class="divide-y divide-line border-y border-line">${renderRows(rows)}</div>`;
}

// Call this right after setting the innerHTML that renderTransactionList produced,
// passing the same rows.
export function bindTransactionList(container, rows, { markDirty, onRerender }) {
  const byId = Object.fromEntries(rows.map((t) => [t.id, t]));

  container.querySelectorAll("[data-edit]").forEach((btn) => {
    btn.addEventListener("click", () => {
      openTransactionForm({ tx: byId[btn.dataset.edit], onSaved: markDirty, onRerender });
    });
  });
  container.querySelectorAll("[data-delete]").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (confirmDialog("¿Borrar este movimiento?")) {
        deleteTransaction(btn.dataset.delete);
        markDirty();
        onRerender();
      }
    });
  });
  container.querySelectorAll("[data-open]").forEach((row) => {
    row.addEventListener("click", () => {
      openTransactionForm({ tx: byId[row.dataset.open], onSaved: markDirty, onRerender });
    });
  });
}

function renderRows(rows) {
  return rows
    .map((t) => {
      const cat = categoryById(t.categoryId);
      const acc = accountById(t.accountId);
      return `
      <button type="button" class="w-full text-left py-3.5 flex items-center hover:bg-line/30 transition-colors cursor-pointer justify-between gap-3" data-open="${t.id}">
        <div class="min-w-0">
          <div class="font-medium truncate">${t.description || (cat ? cat.name : "Movimiento")}</div>
          <div class="text-xs text-mute truncate">${t.date} · ${acc ? acc.name : "—"}</div>
        </div>
        <div class="text-right shrink-0">
          <div class="font-semibold ${amountClass(t.amount)}">${currency(t.amount)}</div>
          ${cat ? `<div class="${pillClass(t.type)} mt-0.5">${cat.name}</div>` : ""}
        </div>
      </button>
    `;
    })
    .join("");
}

export function openTransactionForm({ tx, onSaved, onRerender }) {
  const accounts = state.data.accounts;
  const categories = state.data.categories;
  const isEdit = !!tx;
  const today = new Date().toISOString().slice(0, 10);

  openModal({
    title: isEdit ? "Editar movimiento" : "Agregar movimiento",
    submitLabel: isEdit ? "Guardar cambios" : "Agregar",
    onDelete: isEdit
      ? (close) => {
          if (!confirmDialog("¿Borrar este movimiento?")) return;
          deleteTransaction(tx.id);
          onSaved();
          close();
          onRerender();
        }
      : undefined,
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
