# Mis Finanzas

App de finanzas personales del usuario (Daniel). Sitio estático (sin backend propio),
publicado en GitHub Pages, que guarda todos los datos en **el Google Drive del propio
usuario** (scope `drive.file`, solo archivos creados por la app). Nadie más — ni un
servidor propio, ni Claude, ni GitHub — tiene acceso a los datos reales.

Origen: reemplaza un Google Sheet (`FINANZAS_PERSONALES.xlsx`, en la carpeta padre
`D:\MIS_FINANZAS\`) donde el usuario llevaba sus finanzas manualmente.

## Stack

- Vanilla JS (ES modules, sin bundler/build step), Google Identity Services (OAuth token
  client) + Drive API v3 (fetch directo). Chart.js y SweetAlert2 (diálogos de confirmación/alerta vía `confirmDialog`/`alertDialog` en `modal.js`, asíncronos) van locales en `vendor/`.
- **Tailwind compilado, no por CDN**: `tailwind.css` está commiteado. Si agregas o cambias
  clases Tailwind en el HTML/JS, regéneralo y súbelo:
  `npx tailwindcss@3.4.17 -c tailwind.config.cjs -i tailwind.input.css -o tailwind.css --minify`
  (el config replica los tokens de color de `style.css`). Sin esto, las clases nuevas no tendrán estilo.
- Sin build de producción — se edita y se sube tal cual. `package.json` solo existe para que
  Node trate los `.js` como ESM (`"type": "module"`).
- Tema: sigue `prefers-color-scheme` del sistema (claro/oscuro), definido en `style.css`.
- **PWA**: `manifest.json` + `sw.js` + `icons/`. El service worker precachea el shell;
  **sube `VERSION` en `sw.js` y agrega a `SHELL` cualquier archivo nuevo** cada vez que
  publiques cambios. `index.html` oculta la app (muestra un splash) hasta que
  `tailwind.css`/`style.css` aplican (clase `ready` en `<html>`, con tope de 4 s).

## Estructura

- `index.html`, `style.css` — shell + los pocos estilos que Tailwind CDN no cubre.
- `config.js` — `GOOGLE_CLIENT_ID` (público, es normal que un cliente OAuth de SPA sea
  visible — nunca pongas aquí un `client_secret`).
- `drive.js` — login (Google Identity Services) + leer/crear/actualizar el archivo
  `finanzas-data.json` en el Drive del usuario.
- `fx.js` — tasa USD/COP automática: toma la tasa de mercado de fawazahmed0/currency-api (currency-api.pages.dev, respaldo
  jsDelivr que puede venir con 1 día de atraso; gratis, CORS, 1 actualización/día) y aplica el spread de ARQ (±0,4348 %, calibrado el 06/10/2026 con compra 3201,43 /
  venta 3173,71; si ARQ cambia su margen, ajusta `ARQ_SPREAD`). `app.js` la consulta al abrir y cada minuto.
  ARQ no tiene API pública.
- `state.js` — modelo de datos en memoria + todos los cálculos (balances, presupuesto,
  totales, serie de ahorro).
- `ui.js` — constantes de clases Tailwind reutilizables (`cx.card`, `cx.btn`, etc.) y
  helpers de color por signo/pill.
- `modal.js` — modal genérico reutilizado por los formularios.
- `app.js` — boot, router de pestañas (Inicio/Diario/Presupuesto/Total/Gráficas/Config),
  autosave con debounce (~1.2s) contra Drive.
- `views/*.js` — una función `renderX(container, ctx)` por pestaña.
- `seed-data.json` — **plantilla pública, sin datos reales** (ver más abajo).

## Modelo de datos (el archivo que vive en Drive)

```
{ meta, accounts[], categories[], transactions[], budgets[], budgetDefaults[], transfers[] }
```

`meta.schemaVersion` = **2**. Los archivos viejos (v1) se migran en `setData` (`migrateToV2`, idempotente) y, antes de
migrar, `app.js` guarda una copia `finanzas-data-backup-v1.json` en el Drive del usuario (`backupDataFile` en
`drive.js`); si el respaldo falla se aborta la carga. Cualquier cambio de modelo futuro: sube la versión y migra ahí.

- **meta**: `{ ..., baseCurrency: "COP", rates (se refrescan solas): { USD_COP: { buy, sell, marketRef, updatedAt } } }`.
  `sell` = COP que recibes al convertir 1 USD (venta ARQ); `buy` = COP que pagas por 1 USD.
  Los saldos USD se valoran en COP con `sell` (`usdValuationRate()`).
- **accounts**: `{ id, name, type, currency, initialBalance, creditLimit? }`. `currency` ∈ COP/USD
  (cuentas viejas sin campo = COP, normalizado en `setData`; los movimientos heredan la moneda de la cuenta). `type` ∈
  cash/bank/savings/credit/custom. El balance mostrado = `initialBalance + suma de las
  transacciones de esa cuenta`. Cuentas actuales del usuario: Efectivo, **Bancolombia**
  (antes «Cuenta bancaria» + «Ahorros», unificadas en la v2: `hasSavings: true` y
  `savingsInitialBalance`; el ahorro es un **bolsillo** dentro de la cuenta, **no es Nequi**),
  Tarjeta de crédito (`creditLimit` es solo referencia, nunca suma al total) y las cuentas
  en USD (ARQ). El saldo del bolsillo (`pocketBalance`) ya está incluido en `accountBalance`;
  `availableBalance` = total − bolsillo. No se suma el bolsillo aparte en `totalBalance`.
- **categories**: `{ id, name, kind, noBudget? }`, `kind` ∈ Entrada/Salida/Ahorro. Son las del
  Excel original del usuario (Salario, Pasajes, Seguridad Social, Servicios, Niña,
  Margui, Otros, Ahorro) — "Otros" es el cajón de sastre heredado del Excel.
  `noBudget: true` = **gasto libre** (Comida Gatos, Gasolina, Otros, Pasajes): sin presupuesto fijo,
  Presupuesto solo muestra lo gastado. Se marca en la migración por nombre y se edita en Ajustes.
- **transactions**: `{ id, date, accountId, categoryId, description, type, amount,
  excludeFromCategoryTotals?, pocket?, transferId?, conversionId?, fxRate? }`. `amount` ya trae el signo
  (Entrada positivo, Salida negativo) — el `type` es solo para mostrar el pill. `pocket: "ahorro"` =
  el movimiento ocurre dentro del bolsillo de ahorro de la cuenta.
- **budgets**: `{ month, categoryId, estimated }` — el estimado **editado a mano en un mes concreto**
  (gana sobre el valor por defecto). Los gastos se guardan en negativo, la UI muestra magnitudes.
- **budgetDefaults**: `[{ categoryId, amount, from: "YYYY-MM" }]` — historial del estimado fijo de cada
  categoría con presupuesto. Estimado de un mes (`getEstimate`) = override en `budgets` → último default con
  `from <= mes` → 0. Cambiar el default en Ajustes (`setBudgetDefault`) escribe una entrada con
  `from` = **mes siguiente**, así el mes en curso y los anteriores no cambian. Limitación: el mes en
  curso no toma un default nuevo hasta que se edite a mano o llegue el mes siguiente.
  La pestaña Presupuesto muestra solo categorías `Salida` (sin Salario ni Ahorro); el ahorro se ve
  como bloque «Bancolombia › Ahorro».

### Tarjeta de crédito: ciclo, 45 días y avisos

Las cuentas `credit` guardan `cutDay` (corte, def. 30) y `payDay` (límite de pago, def. 19, máx 28). `card.js` (puro, con
pruebas) calcula: días para pagar una compra según su fecha (de ~49 el día después del corte a ~20 el día del corte),
próxima fecha de corte/pago, valor del extracto por pagar (`statementDue`: deuda al corte menos abonos posteriores) y
ventana recomendada de compra. `views/tarjeta.js` lo pinta en Inicio (panel + banner a ≤5 días o vencido).
Una web estática no puede notificar con la app cerrada: por eso hay (a) notificación del sistema al abrir la app
(una vez al día, requiere activar permiso) y (b) un `.ics` mensual con alarmas -5 y -1 días para el calendario del celular.
Calibrado con el extracto de sep-2026 (periodo 02-30 sep, pagar antes del 19-oct). **Confirmar con el 2.º extracto** que
corte 30 / pago 19 se mantienen todos los meses.

### Multimoneda y conversiones

`accountBalance` devuelve el saldo en la moneda de la cuenta; `totalBalance`, Presupuesto, Total y
Gráficas convierten a COP con `toBase`/`txBase`. Una **conversión** (Diario → "Transferir" entre cuentas de
distinta moneda, `addConversion`) crea dos movimientos espejo (uno por cuenta, cada uno en su moneda) con `fxRate` y
`conversionId`, `categoryId: null`, y **ambos** con `excludeFromCategoryTotals: true` (el ingreso real ya
se registró como Entrada cuando llegó el pago). Se borran juntos (`deleteTransfer`), no se editan.

### Transferencias entre cuentas propias — la parte no obvia

Mover dinero entre cuentas propias (banco → efectivo, pago de la tarjeta de crédito, Disponible ↔ Ahorro de
Bancolombia) es **un solo registro** para el usuario: Diario/Inicio → botón **«Transferir»**
(`openTransferForm` → `addTransfer` en `state.js`). En los datos siguen siendo **dos movimientos espejo**
(signo opuesto, misma fecha) con el mismo `transferId`, `type: "Transferencia"`, `categoryId: null` y
`excludeFromCategoryTotals: true` en **ambos** lados: así los saldos de cada cuenta quedan bien y la
transferencia no entra en Presupuesto/Total/«Gasto por categoría». El pago de la tarjeta es una
transferencia hacia la cuenta `credit` (el `+` cuenta como abono en `card.js`). Si las monedas difieren,
el mismo formulario crea una conversión (`addConversion`). Se borran juntos (`deleteTransfer`), no se editan.

`budgetRowsForMonth` y `totalRowsAllTime` suman "real" por categoría **sin filtrar por cuenta**, por eso toda vista
nueva que agrupe por categoría debe filtrar `!t.excludeFromCategoryTotals`.

**Transferencias legadas (antes de la v2):** 13–15 pares espejo Cuenta bancaria ↔ Ahorros / Efectivo registrados
a mano con la regla antigua «un lado cuenta con su categoría, el otro lleva la bandera». No tienen `transferId`
y se dejan tal cual (no se re-emparejan): siguen cuadrando porque la bandera ya estaba en el lado que no cuenta.

El gráfico "Evolución del ahorro" (`savingsSeries` en `state.js`) **no** usa la categoría — suma los
movimientos con `pocket: "ahorro"` de las cuentas con bolsillo, más su `savingsInitialBalance`.

### Fechas

Siempre en **hora local**: usa `todayIso()` (`card.js`, reexportada por `state.js`) y `currentMonth()`. Nunca
`new Date().toISOString()` para «hoy»: es UTC y en Colombia, después de las 19:00, ya devuelve el día siguiente.

## seed-data.json es una plantilla vacía — NUNCA subir datos reales aquí

El repo es **público** (necesario para que GitHub Pages gratis funcione). Por eso
`seed-data.json` en este repo solo tiene la estructura de cuentas/categorías con
saldos en $0 y sin transacciones — es lo que se usa para crear el archivo en Drive
la primera vez que alguien (léase: el usuario) conecta una cuenta de Google que no
tenga ya un `finanzas-data.json`.

Los datos reales del usuario (migrados de su Excel + extractos bancarios reales +
reconciliaciones hechas a mano con Claude) viven **solo** en:
1. Su Google Drive (`finanzas-data.json`, autoritativo, lo que la app realmente usa).
2. Un respaldo local en `D:\MIS_FINANZAS\seed-data-REAL-BACKUP.json` — **fuera** de
   esta carpeta/repo a propósito, no debe copiarse aquí ni comitearse.

Si en algún momento hay que reconstruir o ajustar los datos reales del usuario, se
edita el backup local o directamente el archivo en su Drive vía la Drive API — nunca
el `seed-data.json` de este repo con montos reales.

El botón **Config → "Reiniciar a plantilla vacía"** llama a `reloadFromSeed()` en
`app.js`, que hace `fetch('./seed-data.json')` del sitio ya publicado y **sobrescribe
por completo** el archivo de Drive del usuario con la plantilla vacía. Es
intencionalmente destructivo (borra todos sus movimientos) — no lo dispares sin que
el usuario lo pida explícitamente.

## Cómo se llegó a los datos reales actuales (para contexto, no para repetir)

1. Migración inicial desde `FINANZAS_PERSONALES.xlsx` (hoja CONTROL DIARIO + hojas
   mensuales de presupuesto).
2. El usuario compartió el historial real del bolsillo de Ahorros (captura de
   pantalla) — se reemplazaron las 3 entradas mensuales estimadas de categoría
   "Ahorro" del Excel por el detalle real, y se creó la cuenta Ahorros.
3. El usuario compartió un extracto bancario real (Bancolombia, abril-junio) — se usó
   y luego se **revirtió** a pedido del usuario (quedó documentado el proceso pero
   los datos de ese extracto específico ya no están en el dataset final).
4. Se construyeron 13 transferencias espejo Cuenta bancaria ↔ Ahorros, más una
   reconciliación detallada de un retiro en efectivo (con gastos itemizados: repuestos
   de moto, mano de obra, gasolina, pasajes, notaría, etc.) que deja el balance de
   Efectivo cuadrado con el real al 2026-09-10. Los montos exactos están solo en el
   backup local (`D:\MIS_FINANZAS\seed-data-REAL-BACKUP.json`) y en el Drive del
   usuario — no en este repo.
5. **Julio-agosto-septiembre de Cuenta bancaria siguen basados en las estimaciones
   del Excel original** (no hay extracto bancario real de ese periodo todavía) — el
   `initialBalance` de esa cuenta es un número de ajuste ("plug") que compensa lo que
   no está verificado, para que el balance de HOY sea exacto. Si el usuario comparte
   un extracto real de esos meses, hay que repetir el mismo proceso que con
   abril-junio: reemplazar las transacciones de ese rango de fechas y recalcular el
   plug.
6. Hay un archivo `DetalleDeTransacciones10sept2026.pdf` en `D:\MIS_FINANZAS\` (fuera
   del repo) que aún no se ha revisado/incorporado — pendiente para una próxima
   sesión si el usuario lo pide.

## Despliegue

- **GitHub**: repo público `DanielGalvis-Dev/mis-finanzas` (cuenta personal del
  usuario, separada de su cuenta de trabajo). Ojo con las credenciales de git
  guardadas en este equipo — puede haber más de una cuenta de GitHub cacheada.
- **GitHub Pages**: activado, rama `main`, carpeta raíz. URL:
  `https://danielgalvis-dev.github.io/mis-finanzas/`.
- **Google Cloud**: proyecto `finanzas-personales-508217`, OAuth consent screen en
  modo Testing (usuario agregado como test user — no hace falta verificar/publicar
  la app). Client ID en `config.js`. **Authorized JavaScript origins** debe incluir
  tanto `http://localhost:8081` (pruebas locales) como
  `https://danielgalvis-dev.github.io` (producción) — si el dominio cambia, hay que
  actualizar esto en Google Cloud Console.
- No hay CI/CD — cada push a `main` se refleja solo si GitHub Pages está sirviendo
  desde esa rama (no hay Actions custom, usa el deploy automático de Pages).

## Probar localmente

No hay servidor de desarrollo dedicado. Cualquier servidor estático sirve, ej.:
```
node static-server.js <carpeta> <puerto>
```
(script ad-hoc usado durante el desarrollo, no forma parte del repo). Para que el
login de Google funcione en local, el puerto usado debe estar en Authorized
JavaScript origins de Google Cloud (ya está `http://localhost:8081`).
