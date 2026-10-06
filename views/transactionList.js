import {
  state,
  currency,
  addTransaction,
  updateTransaction,
  deleteTransaction,
  categoryById,
  accountById,
  accountCurrency,
  addConversion,
  deleteConversion,
  getRates,
  usdValuationRate,
} from "../state.js";
import { openModal, confirmDialog, alertDialog } from "../modal.js";
import { cx, amountClass, pillClass, fmtDate } from "../ui.js";

// Compact rows at every width (no horizontal scrolling). Tapping a row opens the edit
// modal, which has full detail plus a Borrar button.
export function renderTransactionList(rows) {
  if (rows.length === 0) return `<div class="${cx.emptyState}">No hay movimientos.</div>`;
  return `<div class="divide-y divide-line border-y border-line">${renderRows(rows)}</div>`;
}

// Call this right after setting the innerHTML that renderTransactionList produced,
// passing the same rows.
export function bindTransactionList(container, rows, { markDirty, onRerender }) {
  const byId = Object.fromEntries(rows.map((t) => [t.id, t]));

  container.querySelectorAll("[data-open]").forEach((row) => {
    row.addEventListener("click", async () => {
      const tx = byId[row.dataset.open];
      // Las conversiones son un par espejo: se borran juntas, no se editan.
      if (tx.fxRate) {
        if (!(await confirmDialog("Este movimiento es parte de una conversión de divisas. ¿Borrar la conversión completa (ambos lados)?", { confirmText: "Borrar conversión" }))) return;
        deleteConversion(tx);
        markDirty();
        onRerender();
        return;
      }
      openTransactionForm({ tx, onSaved: markDirty, onRerender });
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
          <div class="text-[13px] text-mute truncate">${fmtDate(t.date)} · ${acc ? acc.name : "—"}</div>
        </div>
        <div class="text-right shrink-0">
          <div class="font-semibold ${amountClass(t.amount)}">${currency(t.amount, acc?.currency)}</div>
          ${cat ? `<div class="${pillClass(t.type)} mt-0.5">${cat.name}</div>` : t.fxRate ? `<div class="${pillClass()} mt-0.5">Conversión</div>` : ""}
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
      ? async (close) => {
          if (!(await confirmDialog("¿Borrar este movimiento?", { confirmText: "Borrar" }))) return;
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
        <div class="col-span-2"><label class="${cx.label}">Monto en <span id="amountCur">COP</span> (positivo, el tipo define el signo)</label>
          <input type="number" name="amount" step="0.01" min="0" class="${cx.input}" value="${tx ? Math.abs(tx.amount) : ""}" required />
        </div>
      </div>
    `,
    onMount: (form) => {
      const sel = form.querySelector('[name="accountId"]');
      const label = form.querySelector("#amountCur");
      const sync = () => (label.textContent = accountCurrency(sel.value));
      sel.addEventListener("change", sync);
      sync();
    },
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

// Convierte entre dos cuentas de distinta moneda (p. ej. ARQ USD -> Bancolombia COP) con la
// tasa realmente aplicada. Se precarga con la tasa de venta (USD->COP) o compra (COP->USD).
export function openConversionForm({ onSaved, onRerender }) {
  const accounts = state.data.accounts;
  const today = new Date().toISOString().slice(0, 10);
  const usd = accounts.filter((a) => a.currency === "USD");
  const cop = accounts.filter((a) => a.currency !== "USD");
  if (!usd.length || !cop.length) {
    alertDialog("Necesitas al menos una cuenta en USD y una en COP (créalas en Ajustes).", "info");
    return;
  }
  const opt = (list) => list.map((a) => `<option value="${a.id}">${a.name} (${a.currency})</option>`).join("");

  openModal({
    title: "Convertir divisas",
    submitLabel: "Convertir",
    bodyHTML: `
      <div class="grid grid-cols-2 gap-3">
        <div class="col-span-2"><label class="${cx.label}">Dirección</label>
          <select name="dir" class="${cx.input}">
            <option value="sell">USD → COP (vender dólares)</option>
            <option value="buy">COP → USD (comprar dólares)</option>
          </select>
        </div>
        <div><label class="${cx.label}">Fecha</label><input type="date" name="date" class="${cx.input}" value="${today}" required /></div>
        <div><label class="${cx.label}">Tasa (COP por 1 USD)</label><input type="number" name="rate" step="0.01" min="0" class="${cx.input}" required /></div>
        <div><label class="${cx.label}">Desde</label><select name="fromAccountId" class="${cx.input}"></select></div>
        <div><label class="${cx.label}">Hacia</label><select name="toAccountId" class="${cx.input}"></select></div>
        <div class="col-span-2"><label class="${cx.label}">Monto a convertir (<span id="cvCur">USD</span>)</label>
          <input type="number" name="amountFrom" step="0.01" min="0" class="${cx.input}" required /></div>
        <div class="col-span-2 text-sm text-mute" id="cvPreview"></div>
      </div>
    `,
    onMount: (form) => {
      const f = (n) => form.querySelector(`[name="${n}"]`);
      const fill = () => {
        const sell = f("dir").value === "sell";
        f("fromAccountId").innerHTML = opt(sell ? usd : cop);
        f("toAccountId").innerHTML = opt(sell ? cop : usd);
        form.querySelector("#cvCur").textContent = sell ? "USD" : "COP";
        const r = getRates();
        f("rate").value = (sell ? r.sell : r.buy) || usdValuationRate() || "";
        preview();
      };
      const preview = () => {
        const sell = f("dir").value === "sell";
        const amt = Number(f("amountFrom").value), fx = Number(f("rate").value);
        form.querySelector("#cvPreview").textContent =
          amt > 0 && fx > 0 ? `Recibirías ≈ ${sell ? currency(amt * fx) : currency(amt / fx, "USD")}` : "";
      };
      f("dir").addEventListener("change", fill);
      f("amountFrom").addEventListener("input", preview);
      f("rate").addEventListener("input", preview);
      fill();
    },
    onSubmit: (values, close) => {
      if (!addConversion(values)) return alertDialog("Revisa los datos de la conversión.", "error");
      onSaved();
      close();
      onRerender();
    },
  });
}
