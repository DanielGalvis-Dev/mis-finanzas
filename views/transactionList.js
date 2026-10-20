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
  addTransfer,
  validateTransferInput,
  deleteTransfer,
  isPairedTransfer,
  accountHasPocket,
  transferableBalance,
  todayIso,
  POCKET_SAVINGS,
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
      // Las transferencias y conversiones son un par espejo: se borran juntas, no se editan.
      if (isPairedTransfer(tx)) {
        const what = tx.fxRate ? "una conversión de divisas" : "una transferencia entre cuentas";
        if (!(await confirmDialog(`Este movimiento es parte de ${what}. ¿Borrarla completa (ambos lados)?`, { confirmText: "Borrar" }))) return;
        deleteTransfer(tx);
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
      const accLabel = acc ? (t.pocket ? `${acc.name} › Ahorro` : acc.name) : "—";
      return `
      <button type="button" class="w-full text-left px-4 py-3.5 flex items-center hover:bg-line/30 transition-colors cursor-pointer justify-between gap-3" data-open="${t.id}">
        <div class="min-w-0">
          <div class="font-medium truncate">${t.description || (cat ? cat.name : "Movimiento")}</div>
          <div class="text-[13px] text-mute truncate">${fmtDate(t.date)} · ${accLabel}</div>
        </div>
        <div class="text-right shrink-0">
          <div class="font-semibold ${amountClass(t.amount)}">${currency(t.amount, acc?.currency)}</div>
          ${cat ? `<div class="${pillClass(t.type)} mt-0.5">${cat.name}</div>` : t.fxRate ? `<div class="${pillClass()} mt-0.5">Conversión</div>` : t.transferId ? `<div class="${pillClass()} mt-0.5">Transferencia</div>` : ""}
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
  const today = todayIso();

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
        <div id="pocketField" class="col-span-2" hidden><label class="${cx.label}">Bolsillo</label>
          <select name="pocket" class="${cx.input}">
            <option value="">Disponible</option>
            <option value="${POCKET_SAVINGS}" ${tx?.pocket === POCKET_SAVINGS ? "selected" : ""}>Ahorro</option>
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
      const pocketField = form.querySelector("#pocketField");
      const sync = () => {
        label.textContent = accountCurrency(sel.value);
        // El bolsillo solo aplica a cuentas que lo tienen (Bancolombia › Ahorro).
        const has = accountHasPocket(accountById(sel.value));
        pocketField.hidden = !has;
        if (!has) form.querySelector('[name="pocket"]').value = "";
      };
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
        pocket: values.pocket || undefined,
      };
      if (isEdit) updateTransaction(tx.id, payload);
      else addTransaction(payload);
      onSaved();
      close();
      onRerender();
    },
  });
}

// Mueve plata entre cuentas propias en UN solo paso (el par de movimientos espejo lo crea la app):
// efectivo <-> banco, banco -> tarjeta de credito (pago), disponible <-> ahorro de Bancolombia.
// Si las dos cuentas tienen distinta moneda (p. ej. ARQ USD -> Bancolombia COP) pide la tasa
// realmente aplicada y crea una conversion; se precarga con la venta (USD->COP) o compra (COP->USD).
export function openTransferForm({ onSaved, onRerender }) {
  const accounts = state.data.accounts;
  if (accounts.length < 2 && !accounts.some(accountHasPocket)) {
    alertDialog("Necesitas al menos dos cuentas para transferir (créalas en Ajustes).", "info");
    return;
  }
  const today = todayIso();
  // Cada opcion es "idCuenta" o "idCuenta|ahorro" (bolsillo de ahorro de esa cuenta).
  const options = accounts
    .flatMap((a) =>
      accountHasPocket(a)
        ? [
            { value: a.id, label: `${a.name} › Disponible (${a.currency})` },
            { value: `${a.id}|${POCKET_SAVINGS}`, label: `${a.name} › Ahorro (${a.currency})` },
          ]
        : [{ value: a.id, label: `${a.name} (${a.currency})` }]
    )
    .map((option) => `<option value="${option.value}">${option.label}</option>`)
    .join("");
  const parse = (value) => {
    const [accountId, pocket] = String(value).split("|");
    return { accountId, pocket: pocket || undefined };
  };

  openModal({
    title: "Transferir entre cuentas",
    submitLabel: "Transferir",
    bodyHTML: `
      <div class="grid grid-cols-2 gap-3">
        <div class="col-span-2"><label class="${cx.label}">Fecha</label><input type="date" name="date" class="${cx.input}" value="${today}" required /></div>
        <div class="col-span-2"><label class="${cx.label}">Desde</label><select name="from" class="${cx.input}" required>${options}</select></div>
        <div class="col-span-2"><label class="${cx.label}">Hacia</label><select name="to" class="${cx.input}" required>${options}</select></div>
        <div class="col-span-2"><label class="${cx.label}">Monto a transferir (<span id="trCur">COP</span>)</label>
          <input type="number" name="amount" step="0.01" min="0" class="${cx.input}" required />
          <label class="flex items-center gap-2 text-sm cursor-pointer mt-2"><input type="checkbox" name="all" id="trAll" /> Todo <span class="text-mute" id="trAllHint"></span></label></div>
        <div class="col-span-2" id="trRateField" hidden><label class="${cx.label}">Tasa (COP por 1 USD)</label>
          <input type="number" name="rate" step="0.01" min="0" class="${cx.input}" /></div>
        <div class="col-span-2" id="trDescField"><label class="${cx.label}">Descripción (opcional)</label>
          <input type="text" name="description" class="${cx.input}" /></div>
        <div class="col-span-2 text-sm text-mute" id="trPreview"></div>
      </div>
    `,
    onMount: (form) => {
      const field = (fieldName) => form.querySelector(`[name="${fieldName}"]`);
      // Por defecto "Hacia" es la segunda opcion para que origen y destino no coincidan.
      if (field("to").options.length > 1) field("to").selectedIndex = 1;
      // Saldo que hay hoy en el origen elegido (cuenta, su parte Disponible o su bolsillo de Ahorro).
      const originBalance = () => {
        const origin = parse(field("from").value);
        return transferableBalance(origin.accountId, origin.pocket);
      };
      const sync = () => {
        const from = accountById(parse(field("from").value).accountId);
        const to = accountById(parse(field("to").value).accountId);
        const cross = !!from && !!to && from.currency !== to.currency;
        form.querySelector("#trCur").textContent = from?.currency || "COP";
        // "Todo": el monto sigue al saldo del origen (solo lectura) hasta que se desmarca.
        const all = form.querySelector("#trAll");
        const bal = originBalance();
        form.querySelector("#trAllHint").textContent = `(${currency(bal, from?.currency)})`;
        field("amount").readOnly = all.checked;
        if (all.checked) field("amount").value = bal > 0 ? bal : "";
        form.querySelector("#trRateField").hidden = !cross;
        form.querySelector("#trDescField").hidden = cross;
        field("rate").required = cross;
        if (cross && !Number(field("rate").value)) {
          const rates = getRates();
          field("rate").value = (from.currency === "USD" ? rates.sell : rates.buy) || usdValuationRate() || "";
        }
        const amt = Number(field("amount").value);
        const fx = Number(field("rate").value);
        form.querySelector("#trPreview").textContent =
          cross && amt > 0 && fx > 0
            ? `Recibirías ≈ ${from.currency === "USD" ? currency(amt * fx) : currency(amt / fx, "USD")}`
            : "";
      };
      form.querySelector("#trAll").addEventListener("change", sync);
      ["from", "to"].forEach((fieldName) => field(fieldName).addEventListener("change", sync));
      ["amount", "rate"].forEach((fieldName) => field(fieldName).addEventListener("input", sync));
      sync();
    },
    onSubmit: (values, close) => {
      const from = parse(values.from);
      const to = parse(values.to);
      const check = validateTransferInput({ from, to, amount: values.amount, rate: values.rate, all: !!values.all });
      if (!check.ok) return alertDialog(check.message, "error");
      const saved =
        check.kind === "conversion"
          ? addConversion({ date: values.date, fromAccountId: from.accountId, toAccountId: to.accountId, amountFrom: values.amount, rate: values.rate })
          : addTransfer({
              date: values.date,
              fromAccountId: from.accountId,
              fromPocket: from.pocket,
              toAccountId: to.accountId,
              toPocket: to.pocket,
              amount: values.amount,
              description: values.description,
            });
      if (!saved) return alertDialog(check.kind === "conversion" ? "Revisa los datos de la conversión." : "Revisa los datos de la transferencia.", "error");
      onSaved();
      close();
      onRerender();
    },
  });
}
