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
          (a) => `<button type="button" class="w-full text-left px-3 py-2.5 border border-line rounded-xl hover:bg-line/50 transition-colors" data-open-acc="${a.id}">
          <div class="font-medium">${a.name}</div>
          <div class="text-xs text-mute mt-0.5">saldo inicial: ${currency(a.initialBalance)}${a.type === "credit" ? ` · cupo: ${currency(a.creditLimit || 0)}` : ""}</div>
        </button>`
        )
        .join("")}
    </div>
    <button class="${cx.btn}" id="addAccBtn">+ Agregar cuenta</button>

    <div class="${cx.sectionTitle}">Categorías</div>
    <div class="flex flex-col gap-2 mb-3" id="categoriesList">
      ${state.data.categories
        .map(
          (c) => `<button type="button" class="w-full text-left flex items-center justify-between gap-2 px-3 py-2.5 border border-line rounded-xl hover:bg-line/50 transition-colors" data-open-cat="${c.id}">
          <span class="font-medium truncate">${c.name}</span>
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

  container.querySelector("#addCatBtn").addEventListener("click", () => openCategoryForm({ onSaved: markDirty, onRerender: rerender }));
  container.querySelectorAll("[data-open-cat]").forEach((btn) =>
    btn.addEventListener("click", () => {
      const cat = state.data.categories.find((c) => c.id === btn.dataset.openCat);
      openCategoryForm({ cat, onSaved: markDirty, onRerender: rerender });
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
    onDelete: acc
      ? (close) => {
          if (!confirmDialog("¿Borrar esta cuenta? Los movimientos asociados no se borran, pero quedarán sin cuenta.")) return;
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
    onDelete: cat
      ? (close) => {
          if (!confirmDialog("¿Borrar esta categoría? Los movimientos asociados no se borran, pero quedarán sin categoría.")) return;
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
