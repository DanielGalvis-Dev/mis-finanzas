// Service worker: guarda el "shell" de la app para que cargue al instante y sin estilos
// rotos aun con datos moviles lentos. Los datos NO se cachean aqui: viven en Drive.
// Sube VERSION cada vez que cambies cualquier archivo de la lista para forzar la actualizacion.
const VERSION = "v3";
const CACHE = "mis-finanzas-" + VERSION;
const SHELL = [
  "./",
  "./index.html",
  "./tailwind.css",
  "./style.css",
  "./manifest.json",
  "./config.js",
  "./app.js",
  "./drive.js",
  "./state.js",
  "./fx.js",
  "./ui.js",
  "./modal.js",
  "./views/dashboard.js",
  "./views/diario.js",
  "./views/presupuesto.js",
  "./views/total.js",
  "./views/graficas.js",
  "./views/config.js",
  "./views/transactionList.js",
  "./vendor/chart.umd.min.js",
  "./vendor/sweetalert2.all.min.js",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/apple-touch-icon.png",
  "./seed-data.json",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith("mis-finanzas-") && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  const url = new URL(req.url);
  // Solo archivos propios; Google (login/Drive), la API de tasas y fuentes pasan directo a la red.
  if (req.method !== "GET" || url.origin !== self.location.origin) return;

  // Navegacion: se abre desde cache al instante (sin esperar la red) y se refresca en segundo plano.
  if (req.mode === "navigate") {
    e.respondWith(
      caches.match("./index.html").then((cached) => {
        const net = fetch(req)
          .then((resp) => {
            if (resp.ok) caches.open(CACHE).then((c) => c.put("./index.html", resp.clone()));
            return resp;
          })
          .catch(() => cached);
        return cached || net;
      })
    );
    return;
  }
  // Resto: stale-while-revalidate (sirve de cache y refresca en segundo plano).
  e.respondWith(
    caches.match(req).then((cached) => {
      const net = fetch(req)
        .then((resp) => {
          if (resp.ok) caches.open(CACHE).then((c) => c.put(req, resp.clone()));
          return resp;
        })
        .catch(() => cached);
      return cached || net;
    })
  );
});
