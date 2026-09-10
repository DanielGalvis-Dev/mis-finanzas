import {
  state,
  currency,
  addAccount,
  updateAccount,
  deleteAccount,
  addCategory,
  updateCategory,
  deleteCategory,
} from "../state.js";
import { openModal, confirmDialog } from "../modal.js";
import { signOut, saveData } from "../drive.js";
import { cx, pillClass } from "../ui.js";

export function renderConfig(container, { markDirty, onSignOut, lastSaved, onReloadFromSeed }) {
  const rerender = () => renderConfig(container, { markDirty, onSignOut, lastSaved, onReloadFromSeed });

  container.innerHTML = `
    <div class="${cx.sectionTitle}">Cuentas</div>
    <div class="flex flex-col gap-2 mb-3" id="accountsList">
      ${state.data.accounts
        .map(
          (a) => `<div class="flex items-center gap-2.5 px-2.5 py-2 border border-slate-700 rounded-lg flex-wrap">
          <span class="flex-1 font-medium">${a.name}</span>
          <span class="text-xs text-slate-400">saldo inicial: ${currency(a.initialBalance)}</span>
          ${a.type === "credit" ? `<span class="text-xs text-slate-400">cupo: ${currency(a.creditLimit || 0)}</span>` : ""}
          <button class="${cx.btn} ${cx.btnSmall}" data-edit-acc="${a.id}">Editar</button>
          <button class="${cx.btnDanger} ${cx.btnSmall}" data-del-acc="${a.id}">Borrar</button>
        </div>`
        )
        .join("")}
    </div>
    <button class="${cx.btn}" id="addAccBtn">+ Agregar cuenta</button>

    <div class="${cx.sectionTitle}">Categorías</div>
    <div class="flex flex-col gap-2 mb-3" id="categoriesList">
      ${state.data.categories
        .map(
          (c) => `<div class="flex items-center gap-2.5 px-2.5 py-2 border border-slate-700 rounded-lg">
          <span class="flex-1 font-medium">${c.name}</span>
          <span class="${pillClass(c.kind)}">${c.kind}</span>
          <button class="${cx.btn} ${cx.btnSmall}" data-edit-cat="${c.id}">Editar</button>
          <button class="${cx.btnDanger} ${cx.btnSmall}" data-del-cat="${c.id}">Borrar</button>
        </div>`
        )
        .join("")}
    </div>
    <button class="${cx.btn}" id="addCatBtn">+ Agregar categoría</button>

    <div class="${cx.sectionTitle}">Cuenta de Google</div>
    <div class="${cx.card} max-w-md">
      <p class="mt-0 text-slate-300">Última sincronización: ${lastSaved || "—"}</p>
      <button class="${cx.btnDanger}" id="signOutBtn">Cerrar sesión</button>
    </div>

    <div class="${cx.sectionTitle}">Zona de datos</div>
    <div class="${cx.card} max-w-md">
      <p class="mt-0 text-slate-300 text-sm">Reinicia tu archivo de Drive a la plantilla vacía (<code>seed-data.json</code>: tus cuentas y categorías, sin movimientos). Borra TODOS tus movimientos actuales. Úsalo solo si quieres empezar de cero.</p>
      <button class="${cx.btnDanger}" id="reloadSeedBtn">Reiniciar a plantilla vacía</button>
    </div>
  `;

  container.querySelector("#addAccBtn").addEventListener("click", () => openAccountForm({ onSaved: markDirty, onRerender: rerender }));
  container.querySelectorAll("[data-edit-acc]").forEach((btn) =>
    btn.addEventListener("click", () => {
      const acc = state.data.accounts.find((a) => a.id === btn.dataset.editAcc);
      openAccountForm({ acc, onSaved: markDirty, onRerender: rerender });
    })
  );
  container.querySelectorAll("[data-del-acc]").forEach((btn) =>
    btn.addEventListener("click", () => {
      if (confirmDialog("¿Borrar esta cuenta? Los movimientos asociados no se borran, pero quedarán sin cuenta.")) {
        deleteAccount(btn.dataset.delAcc);
        markDirty();
        rerender();
      }
    })
  );

  container.querySelector("#addCatBtn").addEventListener("click", () => openCategoryForm({ onSaved: markDirty, onRerender: rerender }));
  container.querySelectorAll("[data-edit-cat]").forEach((btn) =>
    btn.addEventListener("click", () => {
      const cat = state.data.categories.find((c) => c.id === btn.dataset.editCat);
      openCategoryForm({ cat, onSaved: markDirty, onRerender: rerender });
    })
  );
  container.querySelectorAll("[data-del-cat]").forEach((btn) =>
    btn.addEventListener("click", () => {
      if (confirmDialog("¿Borrar esta categoría? Los movimientos asociados no se borran, pero quedarán sin categoría.")) {
        deleteCategory(btn.dataset.delCat);
        markDirty();
        rerender();
      }
    })
  );

  container.querySelector("#signOutBtn").addEventListener("click", () => {
    if (confirmDialog("¿Cerrar sesión? Tus datos ya están guardados en Drive.")) {
      signOut();
      onSignOut();
    }
  });

  container.querySelector("#reloadSeedBtn").addEventListener("click", async () => {
    if (!confirmDialog("Esto BORRA todos tus movimientos y deja Drive como una plantilla vacía. No se puede deshacer. ¿Continuar?")) return;
    const btn = container.querySelector("#reloadSeedBtn");
    btn.disabled = true;
    btn.textContent = "Reiniciando...";
    try {
      await onReloadFromSeed();
    } catch (err) {
      alert("No se pudo reiniciar: " + (err?.message || err));
      btn.disabled = false;
      btn.textContent = "Reiniciar a plantilla vacía";
    }
  });
}

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
    bodyHTML: `
      <div class="mb-3"><label class="${cx.label}">Nombre</label>
        <input type="text" name="name" class="${cx.input}" value="${acc ? acc.name.replace(/"/g, "&quot;") : ""}" required />
      </div>
      <div class="mb-3"><label class="${cx.label}">Tipo</label>
        <select name="type" id="accTypeSelect" class="${cx.input}">
          ${ACCOUNT_TYPES.map((t) => `<option value="${t.value}" ${(acc?.type || "cash") === t.value ? "selected" : ""}>${t.label}</option>`).join("")}
        </select>
      </div>
      <div class="mb-3"><label class="${cx.label}">Saldo inicial (deuda actual si es tarjeta de crédito)</label>
        <input type="number" step="1" name="initialBalance" class="${cx.input}" value="${acc ? acc.initialBalance : 0}" required />
      </div>
      <div id="creditLimitField" ${acc?.type === "credit" ? "" : "hidden"}>
        <label class="${cx.label}">Cupo de la tarjeta (referencia, no suma al total)</label>
        <input type="number" step="1" name="creditLimit" class="${cx.input}" value="${acc?.creditLimit || 0}" />
      </div>
    `,
    onMount: (form) => {
      const typeSelect = form.querySelector("#accTypeSelect");
      const creditField = form.querySelector("#creditLimitField");
      typeSelect.addEventListener("change", () => {
        creditField.hidden = typeSelect.value !== "credit";
      });
    },
    onSubmit: (values, close) => {
      if (acc) updateAccount(acc.id, { name: values.name, type: values.type, initialBalance: Number(values.initialBalance), creditLimit: values.type === "credit" ? Number(values.creditLimit) || 0 : undefined });
      else addAccount({ name: values.name, type: values.type, initialBalance: Number(values.initialBalance), creditLimit: values.creditLimit });
      onSaved();
      close();
      onRerender();
    },
  });
}

function openCategoryForm({ cat, onSaved, onRerender }) {
  openModal({
    title: cat ? "Editar categoría" : "Agregar categoría",
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
    `,
    onSubmit: (values, close) => {
      if (cat) updateCategory(cat.id, { name: values.name, kind: values.kind });
      else addCategory({ name: values.name, kind: values.kind });
      onSaved();
      close();
      onRerender();
    },
  });
}
