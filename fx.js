// Tasa de mercado USD/COP de referencia (open.er-api.com: sin API key, con CORS, se
// actualiza una vez al dia). ARQ no publica una API de compra/venta, asi que sus tasas
// se ingresan a mano en Ajustes; esta es solo la referencia para compararlas.
// Atribucion requerida por el proveedor: https://www.exchangerate-api.com
const URL = "https://open.er-api.com/v6/latest/USD";
const CACHE_KEY = "misFinanzasMarketRate";
const MAX_AGE_MS = 6 * 60 * 60 * 1000;

function readCache() {
  try {
    return JSON.parse(localStorage.getItem(CACHE_KEY) || "null");
  } catch {
    return null;
  }
}

// Devuelve { rate, updatedAt } o lanza si no hay red ni cache. force=true ignora la cache.
export async function fetchMarketRate({ force = false } = {}) {
  const cached = readCache();
  if (!force && cached && Date.now() - cached.fetchedAt < MAX_AGE_MS) return cached;
  try {
    const resp = await fetch(URL);
    if (!resp.ok) throw new Error("HTTP " + resp.status);
    const json = await resp.json();
    const rate = Number(json?.rates?.COP);
    if (json.result !== "success" || !(rate > 0)) throw new Error("Respuesta inválida");
    const out = { rate, updatedAt: new Date().toISOString(), fetchedAt: Date.now() };
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(out));
    } catch {}
    return out;
  } catch (err) {
    if (cached) return cached;
    throw err;
  }
}
