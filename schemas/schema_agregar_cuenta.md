# Schema — Agregar / editar cuenta

### Datos del formulario

| Campo | Valor |
|---|---|
| Formulario | Agregar / editar cuenta (`openAccountForm` en `views/config.js`) |
| Proyecto / repo | mis-finanzas |
| Protocolo de referencia | PROTOCOLO_DE_VALIDACION_DE_FORMULARIOS_v1.1.md |
| Campos nuevos o modificados | `cutDay` y `payDay` (nuevos, solo para tarjeta de crédito) |
| ¿Vive en un modal? | Sí |
| ¿Algún campo se pre-llena automáticamente (Extracción IA, información de BD, o ambos)? | No |
| Responsable (Desarrollador) | Desarrollador |
| Fecha de creación | 06/10/2026 |

### Tabla 1 — Validación de datos (Niveles 1, 3, 4, 5)

| Campo | Tipo de dato | Obligatorio | Rango/Límite | Valor por defecto | Único | Depende de | Regla de dependencia | Mensaje de error | Capas aplicables (Front/Back/BD) |
|---|---|---|---|---|---|---|---|---|---|
| name | Texto | Sí | — | Vacío (al crear) | No | — | — | Mensaje nativo del navegador para campo requerido | Front |
| type | Selección (cash, bank, savings, credit, custom) | Sí | Solo esos cinco valores | cash (al crear) | No | — | — | — | Front |
| currency | Selección (COP, USD) | Sí | Solo COP o USD | COP | No | — | Si llega otro valor, el estado lo normaliza a COP | — | Front |
| initialBalance | Numérico decimal | Sí | Paso 0.01, sin mínimo (puede ser negativo, p. ej. deuda de tarjeta) | 0 | No | currency | Se expresa en la moneda de la cuenta | Mensaje nativo del navegador para campo requerido | Front |
| creditLimit | Numérico entero | No | Paso 1 | 0 | No | type | Solo visible y guardado si type es credit | — | Front |
| cutDay | Numérico entero | No (si falta se usa 30) | Mín 1, Máx 31; si el mes tiene menos días se usa el último | 30 | No | type | Solo visible y guardado si type es credit | Mensaje nativo del navegador para valor fuera de rango | Front |
| payDay | Numérico entero | No (si falta se usa 19) | Mín 1, Máx 28 (para que exista todos los meses) | 19 | No | type | Solo visible y guardado si type es credit; el pago es el mes siguiente al corte, o el mismo mes si payDay es posterior al día de corte | Mensaje nativo del navegador para valor fuera de rango | Front |

### Tabla 2 — Interacción (Nivel 2)

| Campo | Orden de tabulación | Deshabilitado | Foco automático (cuándo, si aplica) |
|---|---|---|---|
| name | 1 | No | — |
| type | 2 | No | — |
| currency | 3 | No | — |
| initialBalance | 4 | No | — |
| creditLimit | 5 | No | — |
| cutDay | 6 | No | — |
| payDay | 7 | No | — |

### Notas y justificaciones

- **Back y BD:** la app es un sitio estático sin backend ni base de datos propia; los datos viven en un archivo JSON del Google Drive del usuario. No hay capas Back ni BD; el Nivel 4 y el Nivel 5 no aplican. `setData` y `addAccount` en `state.js` normalizan `currency` a COP si no es COP ni USD.
- **Mensajes de error:** el formulario usa la validación nativa de HTML5; no define textos propios.
- **`cutDay` y `payDay`:** con ellos la app calcula los días para pagar cada compra, el aviso a 5 días del pago y el evento de calendario (`card.js`). Si el valor falta o es 0 se usan 30 y 19.
- **`creditLimit`:** el campo se oculta salvo que `type` sea credit; es solo referencia y no suma al total. Al estar oculto no entra en la tabulación.
- **Único:** el nombre de cuenta no se valida como único; el sistema identifica cada cuenta por su `id` generado.
- **Cambiar la moneda de una cuenta con movimientos:** no se revisa ni se convierten los montos existentes; los movimientos pasan a interpretarse en la nueva moneda.

### Versión y revisión (del schema de ese formulario, no de esta plantilla)

| Campo | Valor |
|---|---|
| Versión del schema | v1.1 |
| Fecha de aprobación | 06/10/2026 |
| Aprobado por | Desarrollador |
| Próxima revisión | Cuando el formulario cambie de campos o de reglas |
