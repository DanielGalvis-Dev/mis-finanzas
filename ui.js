// Shared Tailwind class strings. Colors are semantic tokens (bg, surface, ink, mute, line,
// accent, pos, neg) defined in style.css and mapped in index.html; they switch with the
// system light/dark preference.
export const cx = {
  card: "bg-surface border border-line rounded-2xl p-5",
  sectionTitle: "text-sm font-medium text-mute mt-10 mb-3 first:mt-0",
  btn: "border border-line bg-transparent text-ink px-4 py-2 rounded-full text-sm font-medium cursor-pointer hover:bg-line/50 transition-colors",
  btnPrimary: "border border-accent bg-accent text-surface px-4 py-2 rounded-full text-sm font-medium cursor-pointer hover:opacity-90 transition-opacity",
  btnDanger: "border border-neg/50 bg-transparent text-neg px-4 py-2 rounded-full text-sm font-medium cursor-pointer hover:bg-neg/10 transition-colors",
  btnSmall: "px-3 py-1 text-xs",
  input: "w-full px-3 py-2 rounded-xl border border-line bg-surface text-ink placeholder-mute/70 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent",
  label: "block text-xs text-mute mb-1.5",
  tableWrap: "",
  th: "text-left px-2.5 py-2 text-xs font-medium text-mute",
  td: "text-left px-2.5 py-3 border-t border-line",
  positive: "text-pos",
  negative: "text-neg",
  emptyState: "text-mute py-8 text-center",
  pillBase: "inline-block px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap",
  pill: {
    entrada: "bg-pos/10 text-pos",
    salida: "bg-neg/10 text-neg",
    ahorro: "bg-accent/10 text-accent",
  },
};

export function pillClass(kind) {
  return `${cx.pillBase} ${cx.pill[(kind || "").toLowerCase()] || "bg-line text-mute"}`;
}

export function amountClass(n) {
  return Number(n) < 0 ? cx.negative : cx.positive;
}
