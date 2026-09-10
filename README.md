# Mis Finanzas

App de finanzas personales, 100% estática (HTML/CSS/JS, sin backend). Tus datos se
guardan en un archivo `finanzas-data.json` dentro de **tu propio Google Drive** —
la app solo tiene permiso para ver/editar los archivos que ella misma crea
(scope `drive.file`), nunca el resto de tu Drive.

Tu historial de `FINANZAS_PERSONALES.xlsx` (118 movimientos, mayo-septiembre 2026)
ya viene migrado en `seed-data.json` y se sube automáticamente a tu Drive la
primera vez que inicias sesión. Todos los movimientos históricos quedaron
asignados a la cuenta "Cuenta bancaria" por defecto — revísalos y reasígnalos
si alguno en realidad fue en efectivo o tarjeta.

## Paso 1 — Crear el OAuth Client ID de Google (una sola vez, ~10 min)

**Importante:** usa la cuenta de Google que quieres usar para esta app (no la de
tu día a día), ya que ahí es donde vivirán tus datos.

1. Ve a https://console.cloud.google.com/ e inicia sesión con esa cuenta.
2. Crea un proyecto nuevo (cualquier nombre, ej. "Mis Finanzas").
3. Ve a **APIs & Services > Library**, busca "Google Drive API" y haz clic en **Enable**.
4. Ve a **APIs & Services > OAuth consent screen**:
   - User type: **External**
   - Nombre de la app: "Mis Finanzas", tu correo en soporte y contacto
   - Publishing status: déjalo en **Testing** (no necesitas publicarla)
   - En **Test users**, agrega tu propio correo de Google
5. Ve a **APIs & Services > Credentials > Create Credentials > OAuth client ID**:
   - Application type: **Web application**
   - Authorized JavaScript origins: agrega la URL donde vas a publicar la app
     (la de GitHub Pages del paso 2, ej. `https://tu-usuario.github.io`) y
     también `http://localhost:8081` si quieres poder probarla en tu PC primero
   - Crea y copia el **Client ID** (termina en `.apps.googleusercontent.com`)
6. Pega ese Client ID en `config.js`, reemplazando `TU_CLIENT_ID.apps.googleusercontent.com`.

## Paso 2 — Publicar en GitHub Pages (una sola vez)

**Importante:** usa la cuenta de GitHub que quieres para esta app.

1. Crea un repositorio nuevo en GitHub (puede ser privado).
2. Sube el contenido de esta carpeta (`app/`) a la raíz del repositorio.
3. Ve a **Settings > Pages** del repo, y en "Build and deployment" elige
   **Deploy from a branch**, rama `main`, carpeta `/ (root)`.
4. Espera 1-2 minutos y GitHub te dará la URL pública, ej.
   `https://tu-usuario.github.io/nombre-repo/`.
5. Si esa URL final es distinta a la que usaste en el paso 1, vuelve a
   **Credentials** en Google Cloud y agrega la URL real a "Authorized JavaScript
   origins" (los subpaths tipo `/nombre-repo/` no hace falta declararlos, solo
   el origen `https://tu-usuario.github.io`).

## Paso 3 — Usarla

Abre la URL de GitHub Pages desde tu PC o tu celular (necesitas conexión a
internet), haz clic en **Conectar con Google Drive**, acepta el permiso, y
listo — la primera vez se crea el archivo con tu historial migrado, las
siguientes veces carga lo que ya tengas guardado.

## Estructura del proyecto

- `index.html`, `style.css` — shell de la app
- `config.js` — tu Client ID de Google (edítalo)
- `drive.js` — autenticación y lectura/escritura del archivo en Drive
- `state.js` — modelo de datos y cálculos (balances, presupuesto, totales)
- `app.js` — enrutador y guardado automático
- `views/*.js` — cada pestaña (Inicio, Diario, Presupuesto, Total, Gráficas, Config)
- `seed-data.json` — tu historial migrado, se usa solo la primera vez que no existe
  el archivo en tu Drive

## Notas

- El guardado es automático (~1.2s después de cada cambio); el indicador arriba
  a la derecha muestra "Guardando...", "Guardado" o un error si falla.
- Puedes editar cuentas y categorías desde la pestaña **Config**.
- Como es una app estática sin build step, para desarrollar localmente basta con
  servir esta carpeta con cualquier servidor estático (necesitas `http://localhost`
  registrado como origen autorizado en el paso 1 si quieres probar el login ahí).
