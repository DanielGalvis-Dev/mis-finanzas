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
  setRates,
} from "../state.js";
import { fetchMarketRate } from "../fx.js";
import { openModal, confirmDialog } from "../modal.js";
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
          <div class="text-xs text-mute mt-0.5">${a.currency} · saldo inicial: ${currency(a.initialBalance, a.currency)}${a.type === "credit" ? ` · cupo: ${currency(a.creditLimit || 0)}` : ""}</div>
        </button>`
        )
        .join("")}
    </div>
    <button class="${cx.btn}" id="addAccBtn">+ Agregar cuenta</button>

    <div class="${cx.sectionTitle}">Tasas de cambio USD/COP</div>
    <div class="${cx.card} max-w-md" id="ratesCard">
      <p class="mt-0 mb-4 text-mute text-sm leading-relaxed">Ingresa las tasas que ves en ARQ (COP por 1 USD). Los saldos en USD se valoran con la tasa de <b>venta</b>.</p>
      <div class="grid grid-cols-2 gap-3">
        <div><label class="${cx.label}">Venta ARQ (USD→COP)</label><input type="number" step="0.01" min="0" id="rateSell" class="${cx.input}" value="${rates.sell || ""}" /></div>
        <div><label class="${cx.label}">Compra ARQ (COP→USD)</label><input type="number" step="0.01" min="0" id="rateBuy" class="${cx.input}" value="${rates.buy || ""}" /></div>
      </div>
      <div class="text-xs text-mute mt-4 leading-relaxed" id="marketRef">Referencia de mercado: ${rates.marketRef ? currency(rates.marketRef) + " por USD" : "—"}${rates.updatedAt ? " · " + new Date(rates.updatedAt).toLocaleString("es-CO") : ""}</div>
      <div class="flex flex-wrap gap-2 mt-3">
        <button type="button" class="${cx.btn} ${cx.btnSmall}" id="refreshRate">Actualizar referencia</button>
        <button type="button" class="${cx.btn} ${cx.btnSmall}" id="useRefSell">Usar como venta</button>
        <button type="button" class="${cx.btn} ${cx.btnSmall}" id="useRefBuy">Usar como compra</button>
      </div>
      <p class="text-xs text-mute mt-3" id="rateMsg"></p>
      <p class="text-[11px] text-mute mt-2">Referencia: <a class="underline" href="https://www.exchangerate-api.com" target="_blank" rel="noopener">ExchangeRate-API</a></p>
    </div>

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

  const q = (id) => container.querySelector(id);
  const msg = (t) => (q("#rateMsg").textContent = t);
  const saveManual = () => {
    setRates({ sell: Number(q("#rateSell").value) || 0, buy: Number(q("#rateBuy").value) || 0 });
    markDirty();
  };
  q("#rateSell").addEventListener("change", saveManual);
  q("#rateBuy").addEventListener("change", saveManual);
  const refresh = async (force) => {
    try {
      const m = await fetchMarketRate({ force });
      setRates({ marketRef: m.rate, updatedAt: m.updatedAt });
      markDirty();
      q("#marketRef").textContent = `Referencia de mercado: ${currency(m.rate)} por USD · ${new Date(m.updatedAt).toLocaleString("es-CO")}`;
      msg("");
      return m.rate;
    } catch {
      msg("No se pudo consultar la tasa de mercado (sin conexión). Usa la última guardada o escribe la de ARQ.");
      return 0;
    }
  };
  q("#refreshRate").addEventListener("click", () => refresh(true));
  const useRef = (field, input) => async () => {
    const r = getRates().marketRef || (await refresh(false));
    if (!r) return;
    setRates({ [field]: r });
    q(input).value = r;
    markDirty();
  };
  q("#useRefSell").addEventListener("click", useRef("sell", "#rateSell"));
  q("#useRefBuy").addEventListener("click", useRef("buy", "#rateBuy"));

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
      <div class="mb-3"><label class="${cx.label}">Moneda</label>
        <select name="currency" class="${cx.input}">
          ${CURRENCIES.map((c) => `<option value="${c}" ${(acc?.currency || "COP") === c ? "selected" : ""}>${c}</option>`).join("")}
        </select>
      </div>
      <div class="mb-3"><label class="${cx.label}">Saldo inicial (deuda actual si es tarjeta de crédito)</label>
        <input type="number" step="0.01" name="initialBalance" class="${cx.input}" value="${acc ? acc.initialBalance : 0}" required />
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
      if (acc) updateAccount(acc.id, { name: values.name, type: values.type, currency: values.currency, initialBalance: Number(values.initialBalance), creditLimit: values.type === "credit" ? Number(values.creditLimit) || 0 : undefined });
      else addAccount({ name: values.name, type: values.type, currency: values.currency, initialBalance: Number(values.initialBalance), creditLimit: values.creditLimit });
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
