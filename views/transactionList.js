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

// Desktop: full table, all columns, inline Editar/Borrar. Mobile: compact tappable
// rows (fecha + descripción + monto only, no side-scrolling) - tap opens the same
// edit modal, which also has a Borrar button, so the modal covers full detail + edit
// + delete in one place.
export function renderTransactionList(rows, { showActions = true } = {}) {
  if (rows.length === 0) return `<div class="${cx.emptyState}">No hay movimientos.</div>`;
  return `
    <div class="hidden sm:block">${renderDesktopTable(rows, showActions)}</div>
    <div class="sm:hidden divide-y divide-slate-700">${renderMobileCards(rows)}</div>
  `;
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

function renderDesktopTable(rows, showActions) {
  return `
    <div class="${cx.tableWrap}">
    <table class="w-full text-sm">
      <thead><tr>
        <th class="${cx.th}">Fecha</th><th class="${cx.th}">Cuenta</th><th class="${cx.th}">Categoría</th><th class="${cx.th}">Descripción</th><th class="${cx.th}">Tipo</th><th class="${cx.th}">Monto</th>${showActions ? `<th class="${cx.th}"></th>` : ""}
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
              ${
                showActions
                  ? `<td class="${cx.td}">
                <div class="flex gap-1.5">
                  <button class="${cx.btn} ${cx.btnSmall}" data-edit="${t.id}">Editar</button>
                  <button class="${cx.btnDanger} ${cx.btnSmall}" data-delete="${t.id}">Borrar</button>
                </div>
              </td>`
                  : ""
              }
            </tr>`;
          })
          .join("")}
      </tbody>
    </table>
    </div>
  `;
}

function renderMobileCards(rows) {
  return rows
    .map((t) => {
      const cat = categoryById(t.categoryId);
      const acc = accountById(t.accountId);
      return `
      <button type="button" class="w-full text-left py-3 flex items-center justify-between gap-3" data-open="${t.id}">
        <div class="min-w-0">
          <div class="font-medium truncate">${t.description || (cat ? cat.name : "Movimiento")}</div>
          <div class="text-xs text-slate-400 truncate">${t.date} · ${acc ? acc.name : "—"}</div>
        </div>
        <div class="text-right shrink-0">
          <div class="font-semibold ${amountClass(t.amount)}">${currency(t.amount)}</div>
          ${cat ? `<div class="${pillClass(cat.kind)} mt-0.5">${cat.name}</div>` : ""}
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
