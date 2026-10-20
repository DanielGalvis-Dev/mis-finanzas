import {
  state,
  currency,
  addAccount,
  updateAccount,
  deleteAccount,
  addCategory,
  updateCategory,
  deleteCategory,
  CURRENCIES,
  getRates,
  getBudgetDefault,
  setBudgetDefault,
  currentMonth,
  nextMonth,
} from "../state.js";
import { openModal, confirmDialog, alertDialog } from "../modal.js";
import { signOut, saveData } from "../drive.js";
import { cx, pillClass } from "../ui.js";

export function renderConfig(container, { markDirty, onSignOut, lastSaved, onReloadFromSeed }) {
  const rerender = () => renderConfig(container, { markDirty, onSignOut, lastSaved, onReloadFromSeed });
  const rates = getRates();

  container.innerHTML = `
    <div class="${cx.sectionTitle}">Cuentas</div>
    <div class="flex flex-col gap-2 mb-3" id="accountsList">
      ${state.data.accounts
        .map(
          (a) => `<button type="button" class="w-full text-left px-3 py-2.5 border border-line rounded-xl hover:bg-line/50 transition-colors" data-open-acc="${a.id}">
          <div class="font-medium">${a.name}</div>
          <div class="text-[13px] text-mute mt-0.5">${a.currency} · saldo inicial: ${currency(a.initialBalance, a.currency)}${a.type === "credit" ? ` · cupo: ${currency(a.creditLimit || 0)}` : ""}${a.hasSavings ? ` · con bolsillo de ahorro (inicial ${currency(a.savingsInitialBalance || 0, a.currency)})` : ""}</div>
        </button>`
        )
        .join("")}
    </div>
    <button class="${cx.btn}" id="addAccBtn">+ Agregar cuenta</button>

    <div class="${cx.sectionTitle}">Tasa de cambio USD/COP</div>
    <div class="${cx.card} max-w-md grid grid-cols-2 gap-3" id="ratesCard">
      <div><div class="${cx.label}">Venta</div><div class="text-xl font-light" id="rateSellVal">${rates.sell ? currency(rates.sell, "COP", 2) : "—"}</div></div>
      <div><div class="${cx.label}">Compra</div><div class="text-xl font-light" id="rateBuyVal">${rates.buy ? currency(rates.buy, "COP", 2) : "—"}</div></div>
    </div>

    <div class="${cx.sectionTitle}">Presupuesto por defecto</div>
    <div class="${cx.card} max-w-md">
      <p class="mt-0 mb-4 text-mute text-sm leading-relaxed">Estimado mensual que se repite todos los meses. Al cambiarlo aplica desde <strong>${monthLabel(nextMonth(currentMonth()))}</strong>: el mes actual y los anteriores conservan lo que ya tenían. Para un mes puntual, edítalo en Presupuesto.</p>
      <div class="flex flex-col gap-3" id="budgetDefaults">
        ${budgetedCategories().length ? budgetedCategories().map((c) => defaultRow(c)).join("") : `<div class="text-mute text-sm">No hay categorías de gasto con presupuesto fijo.</div>`}
      </div>
    </div>

    <div class="${cx.sectionTitle}">Categorías</div>
    <div class="flex flex-col gap-2 mb-3" id="categoriesList">
      ${state.data.categories
        .map(
          (c) => `<button type="button" class="w-full text-left flex items-center justify-between gap-2 px-3 py-2.5 border border-line rounded-xl hover:bg-line/50 transition-colors" data-open-cat="${c.id}">
          <span class="font-medium truncate">${c.name}${c.noBudget ? ` <span class="text-[13px] font-normal text-mute">· gasto libre</span>` : ""}</span>
          <span class="${pillClass(c.kind)} shrink-0">${c.kind}</span>
        </button>`
        )
        .join("")}
    </div>
    <button class="${cx.btn}" id="addCatBtn">+ Agregar categoría</button>

    <div class="${cx.sectionTitle}">Cuenta de Google</div>
    <div class="${cx.card} max-w-md">
      <p class="mt-0 mb-4 text-mute">Última sincronización: ${lastSaved || "—"}</p>
      <button class="${cx.btnDanger} w-full sm:w-auto" id="signOutBtn">Cerrar sesión</button>
    </div>

    <div class="${cx.sectionTitle}">Zona de datos</div>
    <div class="${cx.card} max-w-md">
      <p class="mt-0 mb-4 text-mute text-sm leading-relaxed">Reinicia tu archivo de Drive a la plantilla vacía (<code>seed-data.json</code>: tus cuentas y categorías, sin movimientos). Borra TODOS tus movimientos actuales. Úsalo solo si quieres empezar de cero.</p>
      <button class="${cx.btnDanger} w-full sm:w-auto" id="reloadSeedBtn">Reiniciar a plantilla vacía</button>
    </div>
  `;

  container.querySelector("#addAccBtn").addEventListener("click", () => openAccountForm({ onSaved: markDirty, onRerender: rerender }));
  container.querySelectorAll("[data-open-acc]").forEach((btn) =>
    btn.addEventListener("click", () => {
      const acc = state.data.accounts.find((a) => a.id === btn.dataset.openAcc);
      openAccountForm({ acc, onSaved: markDirty, onRerender: rerender });
    })
  );

  container.querySelectorAll(".default-input").forEach((input) =>
    input.addEventListener("change", () => {
      setBudgetDefault(input.dataset.cat, input.value);
      markDirty();
      rerender();
    })
  );

  container.querySelector("#addCatBtn").addEventListener("click", () => openCategoryForm({ onSaved: markDirty, onRerender: rerender }));
  container.querySelectorAll("[data-open-cat]").forEach((btn) =>
    btn.addEventListener("click", () => {
      const cat = state.data.categories.find((c) => c.id === btn.dataset.openCat);
      openCategoryForm({ cat, onSaved: markDirty, onRerender: rerender });
    })
  );

  container.querySelector("#signOutBtn").addEventListener("click", async () => {
    if (await confirmDialog("¿Cerrar sesión? Tus datos ya están guardados en Drive.", { confirmText: "Cerrar sesión", danger: false })) {
      signOut();
      onSignOut();
    }
  });

  container.querySelector("#reloadSeedBtn").addEventListener("click", async () => {
    if (!(await confirmDialog("Esto BORRA todos tus movimientos y deja Drive como una plantilla vacía. No se puede deshacer. ¿Continuar?", { confirmText: "Borrar todo" }))) return;
    const btn = container.querySelector("#reloadSeedBtn");
    btn.disabled = true;
    btn.textContent = "Reiniciando...";
    try {
      await onReloadFromSeed();
    } catch (err) {
      await alertDialog("No se pudo reiniciar: " + (err?.message || err), "error");
      btn.disabled = false;
      btn.textContent = "Reiniciar a plantilla vacía";
    }
  });
}

// Categorias de gasto con presupuesto fijo (las de gasto libre solo muestran lo gastado).
function budgetedCategories() {
  return state.data.categories.filter((c) => c.kind === "Salida" && !c.noBudget);
}

function monthLabel(month) {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("es-CO", { month: "long", year: "numeric", timeZone: "UTC" });
}

function defaultRow(c) {
  const next = nextMonth(currentMonth());
  const currentDefault = getBudgetDefault(next, c.id);
  return `<div class="flex items-center justify-between gap-3">
    <label class="text-sm" for="def_${c.id}">${c.name}</label>
    <input type="number" step="1" min="0" id="def_${c.id}" aria-label="Estimado por defecto de ${c.name}" class="default-input ${cx.input} w-32" data-cat="${c.id}" value="${currentDefault ? Math.abs(currentDefault.amount) : 0}" />
  </div>`;
}

// "Ahorros" ya no se ofrece al crear cuentas (es un bolsillo de la cuenta bancaria); se conserva
// solo si la cuenta que se edita ya tiene ese tipo.
const ACCOUNT_TYPES = [
  { value: "cash", label: "Efectivo" },
  { value: "bank", label: "Cuenta bancaria" },
  { value: "savings", label: "Ahorros" },
  { value: "credit", label: "Tarjeta de crédito" },
  { value: "custom", label: "Otro" },
];

function openAccountForm({ acc, onSaved, onRerender }) {
  openModal({
    title: acc ? "Editar cuenta" : "Agregar cuenta",
    onDelete: acc
      ? async (close) => {
          if (!(await confirmDialog("¿Borrar esta cuenta? Los movimientos asociados no se borran, pero quedarán sin cuenta.", { confirmText: "Borrar" }))) return;
          deleteAccount(acc.id);
          onSaved();
          close();
          onRerender();
        }
      : undefined,
    bodyHTML: `
      <div class="mb-3"><label class="${cx.label}">Nombre</label>
        <input type="text" name="name" class="${cx.input}" value="${acc ? acc.name.replace(/"/g, "&quot;") : ""}" required />
      </div>
      <div class="mb-3"><label class="${cx.label}">Tipo</label>
        <select name="type" id="accTypeSelect" class="${cx.input}">
          ${ACCOUNT_TYPES.filter((t) => t.value !== "savings" || acc?.type === "savings").map((t) => `<option value="${t.value}" ${(acc?.type || "cash") === t.value ? "selected" : ""}>${t.label}</option>`).join("")}
        </select>
      </div>
      <div class="mb-3"><label class="${cx.label}">Moneda</label>
        <select name="currency" class="${cx.input}">
          ${CURRENCIES.map((c) => `<option value="${c}" ${(acc?.currency || "COP") === c ? "selected" : ""}>${c}</option>`).join("")}
        </select>
      </div>
      <div class="mb-3"><label class="${cx.label}">Saldo inicial (deuda actual si es tarjeta de crédito)</label>
        <input type="number" step="0.01" name="initialBalance" class="${cx.input}" value="${acc ? acc.initialBalance : 0}" required />
      </div>
      <div class="mb-3">
        <label class="flex items-center gap-2 text-sm cursor-pointer"><input type="checkbox" name="hasSavings" id="hasSavingsChk" ${acc?.hasSavings ? "checked" : ""} /> Tiene bolsillo de ahorro (se muestra como «${acc ? acc.name.replace(/"/g, "&quot;") : "cuenta"} › Ahorro»)</label>
        <div id="savingsInitialField" class="mt-2" ${acc?.hasSavings ? "" : "hidden"}>
          <label class="${cx.label}">Parte del saldo inicial que ya está en el bolsillo de ahorro</label>
          <input type="number" step="0.01" name="savingsInitialBalance" class="${cx.input}" value="${acc?.savingsInitialBalance || 0}" />
        </div>
      </div>
      <div id="creditLimitField" ${acc?.type === "credit" ? "" : "hidden"}>
        <label class="${cx.label}">Cupo de la tarjeta (referencia, no suma al total)</label>
        <input type="number" step="1" name="creditLimit" class="${cx.input} mb-3" value="${acc?.creditLimit || 0}" />
        <div class="grid grid-cols-2 gap-3">
          <div><label class="${cx.label}">Día de corte</label>
            <input type="number" step="1" min="1" max="31" name="cutDay" class="${cx.input}" value="${acc?.cutDay || 30}" /></div>
          <div><label class="${cx.label}">Pagar hasta el día</label>
            <input type="number" step="1" min="1" max="28" name="payDay" class="${cx.input}" value="${acc?.payDay || 19}" /></div>
        </div>
      </div>
    `,
    onMount: (form) => {
      const typeSelect = form.querySelector("#accTypeSelect");
      const creditField = form.querySelector("#creditLimitField");
      typeSelect.addEventListener("change", () => {
        creditField.hidden = typeSelect.value !== "credit";
      });
      const chk = form.querySelector("#hasSavingsChk");
      const savField = form.querySelector("#savingsInitialField");
      chk.addEventListener("change", () => (savField.hidden = !chk.checked));
    },
    onSubmit: (values, close) => {
      const hasSavings = values.hasSavings === "on";
      const savingsInitialBalance = hasSavings ? Number(values.savingsInitialBalance) || 0 : undefined;
      if (acc) updateAccount(acc.id, { name: values.name, type: values.type, currency: values.currency, initialBalance: Number(values.initialBalance), hasSavings: hasSavings || undefined, savingsInitialBalance, creditLimit: values.type === "credit" ? Number(values.creditLimit) || 0 : undefined, cutDay: values.type === "credit" ? Number(values.cutDay) || 30 : undefined, payDay: values.type === "credit" ? Number(values.payDay) || 19 : undefined });
      else addAccount({ name: values.name, type: values.type, currency: values.currency, initialBalance: Number(values.initialBalance), creditLimit: values.creditLimit, cutDay: values.cutDay, payDay: values.payDay, hasSavings, savingsInitialBalance });
      onSaved();
      close();
      onRerender();
    },
  });
}

function openCategoryForm({ cat, onSaved, onRerender }) {
  openModal({
    title: cat ? "Editar categoría" : "Agregar categoría",
    onDelete: cat
      ? async (close) => {
          if (!(await confirmDialog("¿Borrar esta categoría? Los movimientos asociados no se borran, pero quedarán sin categoría.", { confirmText: "Borrar" }))) return;
          deleteCategory(cat.id);
          onSaved();
          close();
          onRerender();
        }
      : undefined,
    bodyHTML: `
      <div class="mb-3"><label class="${cx.label}">Nombre</label>
        <input type="text" name="name" class="${cx.input}" value="${cat ? cat.name.replace(/"/g, "&quot;") : ""}" required />
      </div>
      <div><label class="${cx.label}">Tipo</label>
        <select name="kind" class="${cx.input}" required>
          <option value="Entrada" ${cat?.kind === "Entrada" ? "selected" : ""}>Entrada</option>
          <option value="Salida" ${!cat || cat?.kind === "Salida" ? "selected" : ""}>Salida</option>
          <option value="Ahorro" ${cat?.kind === "Ahorro" ? "selected" : ""}>Ahorro</option>
        </select>
      </div>
      <label class="flex items-center gap-2 text-sm cursor-pointer mt-3"><input type="checkbox" name="noBudget" ${cat?.noBudget ? "checked" : ""} /> Gasto libre: sin presupuesto fijo, solo mostrar lo gastado en el mes</label>
    `,
    onSubmit: (values, close) => {
      const noBudget = values.noBudget === "on";
      if (cat) updateCategory(cat.id, { name: values.name, kind: values.kind, noBudget: noBudget || undefined });
      else addCategory({ name: values.name, kind: values.kind, noBudget });
      onSaved();
      close();
      onRerender();
    },
  });
}
