// Shared Tailwind class strings, dark theme only (the app has one fixed look, no toggle).
export const cx = {
  card: "bg-slate-800 border border-slate-700 rounded-xl p-4 shadow-sm",
  sectionTitle: "text-sm font-bold text-slate-100 mt-6 mb-2.5 first:mt-0",
  btn: "border border-slate-600 bg-slate-800 text-slate-100 px-3.5 py-2 rounded-lg font-medium cursor-pointer hover:bg-slate-700 transition-colors",
  btnPrimary: "border border-blue-600 bg-blue-600 text-white px-3.5 py-2 rounded-lg font-medium cursor-pointer hover:bg-blue-500 transition-colors",
  btnDanger: "border border-red-500 bg-transparent text-red-400 px-3.5 py-2 rounded-lg font-medium cursor-pointer hover:bg-red-950/40 transition-colors",
  btnSmall: "px-2.5 py-1 text-xs rounded-md",
  input: "w-full px-2.5 py-2 rounded-lg border border-slate-600 bg-slate-900 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 [color-scheme:dark]",
  label: "block text-xs text-slate-400 mb-1",
  tableWrap: "overflow-x-auto -mx-1",
  th: "text-left px-2.5 py-2 text-xs font-semibold uppercase tracking-wide text-slate-400 whitespace-nowrap",
  td: "text-left px-2.5 py-2 border-t border-slate-700 whitespace-nowrap",
  positive: "text-emerald-400",
  negative: "text-red-400",
  emptyState: "text-slate-500 italic py-6 text-center",
  pillBase: "inline-block px-2 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap",
  pill: {
    entrada: "bg-emerald-900/50 text-emerald-300",
    salida: "bg-red-900/50 text-red-300",
    ahorro: "bg-blue-900/50 text-blue-300",
  },
};

export function pillClass(kind) {
  return `${cx.pillBase} ${cx.pill[(kind || "").toLowerCase()] || "bg-slate-700 text-slate-300"}`;
}

export function amountClass(n) {
  return Number(n) < 0 ? cx.negative : cx.positive;
}
