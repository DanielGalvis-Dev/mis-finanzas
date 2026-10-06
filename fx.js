// Tasas USD/COP automaticas. ARQ no publica API, asi que se parte de una tasa de mercado
// (fawazahmed0/currency-api: gratis, sin key, con CORS, dominio publico) y se le
// aplica el spread que ARQ muestra a cada lado. Calibrado el 06/10/2026 con ARQ:
// compra 3201,43 / venta 3173,71 -> medio 3187,57, +-0,4348 %.
// Orden importa: pages.dev trae el dato del dia; el @latest de jsDelivr se cachea y puede venir
// con el dia anterior (se vio 3280 vs 3198 el 06/10/2026), por eso solo es respaldo.
const SOURCES = [
  "https://latest.currency-api.pages.dev/v1/currencies/usd.json",
  "https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.json",
];
export const ARQ_SPREAD = 0.004348;
export const REFRESH_MS = 60 * 1000;

const round2 = (n) => Math.round(n * 100) / 100;

// COP por 1 USD: compra (lo que pagas) y venta (lo que recibes).
export function ratesFromMid(mid) {
  return { marketRef: round2(mid), buy: round2(mid * (1 + ARQ_SPREAD)), sell: round2(mid * (1 - ARQ_SPREAD)) };
}

// Devuelve { marketRef, buy, sell, updatedAt } o lanza si ninguna fuente responde.
export async function fetchRates() {
  let lastErr;
  for (const url of SOURCES) {
    try {
      const resp = await fetch(url, { cache: "no-store" });
      if (!resp.ok) throw new Error("HTTP " + resp.status);
      const mid = Number((await resp.json())?.usd?.cop);
      if (!(mid > 0)) throw new Error("Respuesta inválida");
      return { ...ratesFromMid(mid), updatedAt: new Date().toISOString() };
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr;
}
