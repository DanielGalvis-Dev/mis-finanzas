# Schema — Tasas de cambio USD/COP

### Datos del formulario

| Campo | Valor |
|---|---|
| Formulario | Tasas de cambio USD/COP (sección en `views/config.js`; se guarda al cambiar cada campo, sin botón de envío) |
| Proyecto / repo | mis-finanzas |
| Protocolo de referencia | PROTOCOLO_DE_VALIDACION_DE_FORMULARIOS_v1.1.md |
| Campos nuevos o modificados | Todos (formulario nuevo) |
| ¿Vive en un modal? | No |
| ¿Algún campo se pre-llena automáticamente (Extracción IA, información de BD, o ambos)? | Sí |
| Responsable (Desarrollador) | Desarrollador |
| Fecha de creación | 06/10/2026 |

### Tabla 1 — Validación de datos (Niveles 1, 3, 4, 5)

| Campo | Tipo de dato | Obligatorio | Rango/Límite | Valor por defecto | Único | Depende de | Regla de dependencia | Mensaje de error | Capas aplicables (Front/Back/BD) |
|---|---|---|---|---|---|---|---|---|---|
| rateSell | Numérico decimal (COP por 1 USD, venta ARQ) | No | Mín 0, paso 0.01 | Vacío (equivale a 0) | No | — | Con valor 0 o vacío no se usa para valorar | — | Front |
| rateBuy | Numérico decimal (COP por 1 USD, compra ARQ) | No | Mín 0, paso 0.01 | Vacío (equivale a 0) | No | — | Con valor 0 o vacío no se usa | — | Front |

### Tabla 2 — Interacción (Nivel 2)

| Campo | Orden de tabulación | Deshabilitado | Foco automático (cuándo, si aplica) |
|---|---|---|---|
| rateSell | 1 | No | — |
| rateBuy | 2 | No | — |

### Tabla 3 — Pre-llenado (omitir por completo si la pregunta 3 fue "No")

| Campo | ¿Tiene pre-llenado? | Origen del pre-llenado (única respuesta) | Editable manualmente por el usuario |
|---|---|---|---|
| rateSell | Sí | Información de BD | Sí |
| rateBuy | Sí | Información de BD | Sí |

### Notas y justificaciones

- **Back y BD:** la app es un sitio estático sin backend ni base de datos propia; los datos viven en un archivo JSON del Google Drive del usuario. No hay capas Back ni BD; el Nivel 4 y el Nivel 5 no aplican.
- **Pre-llenado:** los campos se llenan con las tasas guardadas en los datos del usuario. Los botones "Usar como venta" y "Usar como compra" copian la referencia de mercado (open.er-api.com) al campo; el usuario puede editarla.
- **Mensajes de error:** los campos no son obligatorios y el formulario no define textos propios; un valor vacío o no numérico se guarda como 0.
- **Guardado:** ocurre en el evento `change` de cada campo; no hay botón de envío.
- **Valores negativos o no numéricos:** al cambiar el campo se corrigen a 0 (vacío) y el campo se reescribe con el valor guardado, porque aquí no hay envío de formulario que active el mínimo nativo.

### Versión y revisión (del schema de ese formulario, no de esta plantilla)

| Campo | Valor |
|---|---|
| Versión del schema | v1.0 |
| Fecha de aprobación | 06/10/2026 |
| Aprobado por | Desarrollador |
| Próxima revisión | Cuando el formulario cambie de campos o de reglas |
