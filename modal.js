export function openModal({ title, bodyHTML, onMount, onSubmit, submitLabel = "Guardar", danger = false, onDelete, deleteLabel = "Borrar" }) {
  const root = document.getElementById("modalRoot");
  root.innerHTML = `
    <div class="fixed inset-0 bg-black/60 flex items-center justify-center z-[100] p-4" id="modalBackdrop">
      <div class="bg-slate-800 border border-slate-700 rounded-xl p-5 w-full max-w-md max-h-[90vh] overflow-y-auto" role="dialog" aria-modal="true">
        <h2 class="text-base font-bold mb-4">${title}</h2>
        <form id="modalForm">
          ${bodyHTML}
          <div class="flex justify-between items-center gap-2 mt-5">
            <div>
              ${
                onDelete
                  ? `<button type="button" class="border border-red-500 bg-transparent text-red-400 px-3.5 py-2 rounded-lg font-medium cursor-pointer hover:bg-red-950/40 transition-colors" id="modalDelete">${deleteLabel}</button>`
                  : ""
              }
            </div>
            <div class="flex gap-2">
              <button type="button" class="border border-slate-600 bg-slate-800 text-slate-100 px-3.5 py-2 rounded-lg font-medium cursor-pointer hover:bg-slate-700 transition-colors" id="modalCancel">Cancelar</button>
              <button type="submit" class="${
                danger
                  ? "border border-red-500 bg-red-600 text-white px-3.5 py-2 rounded-lg font-medium cursor-pointer hover:bg-red-500 transition-colors"
                  : "border border-blue-600 bg-blue-600 text-white px-3.5 py-2 rounded-lg font-medium cursor-pointer hover:bg-blue-500 transition-colors"
              }">${submitLabel}</button>
            </div>
          </div>
        </form>
      </div>
    </div>
  `;
  const backdrop = document.getElementById("modalBackdrop");
  const form = document.getElementById("modalForm");
  const close = () => { root.innerHTML = ""; };

  backdrop.addEventListener("click", (e) => { if (e.target === backdrop) close(); });
  document.getElementById("modalCancel").addEventListener("click", close);
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const formData = new FormData(form);
    const values = Object.fromEntries(formData.entries());
    onSubmit(values, close);
  });
  if (onDelete) {
    document.getElementById("modalDelete").addEventListener("click", () => onDelete(close));
  }

  if (onMount) onMount(form);
}

export function confirmDialog(message) {
  return window.confirm(message);
}
