# Schema — Agregar / editar movimiento

### Datos del formulario

| Campo | Valor |
|---|---|
| Formulario | Agregar / editar movimiento (`openTransactionForm` en `views/transactionList.js`) |
| Proyecto / repo | mis-finanzas |
| Protocolo de referencia | PROTOCOLO_DE_VALIDACION_DE_FORMULARIOS_v1.1.md |
| Campos nuevos o modificados | `accountId` (ahora define la moneda del monto) y `amount` (admite decimales y muestra la moneda de la cuenta) |
| ¿Vive en un modal? | Sí |
| ¿Algún campo se pre-llena automáticamente (Extracción IA, información de BD, o ambos)? | No |
| Responsable (Desarrollador) | Desarrollador |
| Fecha de creación | 06/10/2026 |

### Tabla 1 — Validación de datos (Niveles 1, 3, 4, 5)

| Campo | Tipo de dato | Obligatorio | Rango/Límite | Valor por defecto | Único | Depende de | Regla de dependencia | Mensaje de error | Capas aplicables (Front/Back/BD) |
|---|---|---|---|---|---|---|---|---|---|
| date | Fecha | Sí | — | Fecha de hoy (al crear) o la del movimiento (al editar) | No | — | — | Mensaje nativo del navegador para campo requerido | Front |
| type | Selección (Entrada, Salida) | Sí | Solo Entrada o Salida | Salida (al crear) | No | — | — | Mensaje nativo del navegador para campo requerido | Front |
| accountId | Selección | Sí | Una cuenta existente | Primera cuenta de la lista (al crear) | No | — | La moneda del monto es la moneda de la cuenta elegida | Mensaje nativo del navegador para campo requerido | Front |
| categoryId | Selección | Sí | Una categoría existente | Primera categoría de la lista (al crear) | No | — | — | Mensaje nativo del navegador para campo requerido | Front |
| description | Texto | No | — | Vacío | No | — | — | — | Front |
| amount | Numérico decimal | Sí | Mín 0, paso 0.01 | Vacío (al crear) | No | accountId, type | Se guarda positivo para Entrada y negativo para Salida; se expresa en la moneda de la cuenta | Mensaje nativo del navegador para campo requerido o valor menor a 0 | Front |

### Tabla 2 — Interacción (Nivel 2)

| Campo | Orden de tabulación | Deshabilitado | Foco automático (cuándo, si aplica) |
|---|---|---|---|
| date | 1 | No | — |
| type | 2 | No | — |
| accountId | 3 | No | — |
| categoryId | 4 | No | — |
| description | 5 | No | — |
| amount | 6 | No | — |

### Notas y justificaciones

- **Back y BD:** la app es un sitio estático sin backend ni base de datos propia; los datos viven en un archivo JSON del Google Drive del usuario. Por eso no hay capas Back ni BD, y el Nivel 4 y el Nivel 5 no aplican.
- **Mensajes de error:** el formulario usa la validación nativa de HTML5 (`required`, `min`, `step`); no define textos propios.
- **Orden de tabulación:** es el orden natural del DOM; no hay `tabindex`.
- **Movimientos de conversión:** los creados por "Convertir divisas" no se editan con este formulario; al tocarlos se ofrece borrar la conversión completa.

### Versión y revisión (del schema de ese formulario, no de esta plantilla)

| Campo | Valor |
|---|---|
| Versión del schema | v1.0 |
| Fecha de aprobación | 06/10/2026 |
| Aprobado por | Desarrollador |
| Próxima revisión | Cuando el formulario cambie de campos o de reglas |
