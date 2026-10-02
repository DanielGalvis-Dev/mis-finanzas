export function openModal({ title, bodyHTML, onMount, onSubmit, submitLabel = "Guardar", danger = false, onDelete, deleteLabel = "Borrar" }) {
  const root = document.getElementById("modalRoot");
  root.innerHTML = `
    <div class="fixed inset-0 bg-ink/40 backdrop-blur-sm flex items-end sm:items-center justify-center z-[100] sm:p-4" id="modalBackdrop">
      <div class="bg-surface border border-line rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 pb-[max(1.25rem,env(safe-area-inset-bottom))] w-full max-w-md max-h-[92vh] overflow-y-auto" role="dialog" aria-modal="true">
        <h2 class="text-lg font-medium mb-5">${title}</h2>
        <form id="modalForm">
          ${bodyHTML}
          <div class="flex flex-col-reverse sm:flex-row sm:justify-between sm:items-center gap-3 mt-6">
            <div class="[&>button]:w-full sm:[&>button]:w-auto">
              ${
                onDelete
                  ? `<button type="button" class="border border-neg/50 bg-transparent text-neg px-4 py-2 rounded-full text-sm font-medium cursor-pointer hover:bg-neg/10 transition-colors" id="modalDelete">${deleteLabel}</button>`
                  : ""
              }
            </div>
            <div class="flex gap-2 [&>button]:flex-1 sm:[&>button]:flex-none">
              <button type="button" class="border border-line bg-transparent text-ink px-4 py-2 rounded-full text-sm font-medium cursor-pointer hover:bg-line/50 transition-colors" id="modalCancel">Cancelar</button>
              <button type="submit" class="${
                danger
                  ? "border border-neg bg-neg text-surface px-4 py-2 rounded-full text-sm font-medium cursor-pointer hover:opacity-90 transition-opacity"
                  : "border border-accent bg-accent text-surface px-4 py-2 rounded-full text-sm font-medium cursor-pointer hover:opacity-90 transition-opacity"
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
