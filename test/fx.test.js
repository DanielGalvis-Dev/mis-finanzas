import { test, afterEach } from "node:test";
import assert from "node:assert/strict";
import { ratesFromMid, fetchRates, ARQ_SPREAD } from "../fx.js";

const realFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = realFetch;
});

test("ratesFromMid: aplica el spread de ARQ a cada lado y redondea a centavos", () => {
  const r = ratesFromMid(3187.57);
  assert.equal(r.marketRef, 3187.57);
  assert.equal(r.buy, 3201.43);
  assert.equal(r.sell, 3173.71);
  assert.ok(r.buy > r.marketRef && r.sell < r.marketRef);
  assert.equal(ARQ_SPREAD, 0.004348);
});

test("fetchRates: lee usd.cop de la primera fuente", async () => {
  globalThis.fetch = async () => ({ ok: true, json: async () => ({ usd: { cop: 3198.64 } }) });
  const r = await fetchRates();
  assert.equal(r.marketRef, 3198.64);
  assert.equal(r.buy, 3212.55);
  assert.equal(r.sell, 3184.73);
  assert.ok(!Number.isNaN(Date.parse(r.updatedAt)));
});

test("fetchRates: si la primera fuente falla usa la segunda", async () => {
  const urls = [];
  globalThis.fetch = async (url) => {
    urls.push(url);
    if (urls.length === 1) throw new Error("sin red");
    return { ok: true, json: async () => ({ usd: { cop: 3200 } }) };
  };
  const r = await fetchRates();
  assert.equal(urls.length, 2);
  assert.equal(r.marketRef, 3200);
});

test("fetchRates: lanza si todas las fuentes fallan o devuelven datos inválidos", async () => {
  globalThis.fetch = async () => ({ ok: false, status: 500 });
  await assert.rejects(fetchRates());
  globalThis.fetch = async () => ({ ok: true, json: async () => ({ usd: { cop: 0 } }) });
  await assert.rejects(fetchRates());
  globalThis.fetch = async () => ({ ok: true, json: async () => ({}) });
  await assert.rejects(fetchRates());
});
