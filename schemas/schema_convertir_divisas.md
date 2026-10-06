# Schema — Convertir divisas

### Datos del formulario

| Campo | Valor |
|---|---|
| Formulario | Convertir divisas (`openConversionForm` en `views/transactionList.js`) |
| Proyecto / repo | mis-finanzas |
| Protocolo de referencia | PROTOCOLO_DE_VALIDACION_DE_FORMULARIOS_v1.1.md |
| Campos nuevos o modificados | Todos (formulario nuevo) |
| ¿Vive en un modal? | Sí |
| ¿Algún campo se pre-llena automáticamente (Extracción IA, información de BD, o ambos)? | Sí |
| Responsable (Desarrollador) | Desarrollador |
| Fecha de creación | 06/10/2026 |

### Tabla 1 — Validación de datos (Niveles 1, 3, 4, 5)

| Campo | Tipo de dato | Obligatorio | Rango/Límite | Valor por defecto | Único | Depende de | Regla de dependencia | Mensaje de error | Capas aplicables (Front/Back/BD) |
|---|---|---|---|---|---|---|---|---|---|
| dir | Selección (sell = USD a COP, buy = COP a USD) | Sí | Solo sell o buy | sell | No | — | — | — | Front |
| date | Fecha | Sí | — | Fecha de hoy | No | — | — | Mensaje nativo del navegador para campo requerido | Front |
| rate | Numérico decimal (COP por 1 USD) | Sí | Mín 0, paso 0.01; debe ser mayor a 0 | Tasa de venta guardada (dir sell) o de compra (dir buy); si no hay, la de valoración o vacío | No | dir | Se vuelve a pre-llenar al cambiar dir | Mensaje nativo del navegador para campo requerido o valor menor a 0; si es 0, alerta "Revisa los datos de la conversión." | Front |
| fromAccountId | Selección | Sí | Cuenta USD si dir es sell; cuenta COP si dir es buy | Primera cuenta de la lista filtrada | No | dir | La lista se filtra por la moneda que corresponde a dir | Mensaje nativo del navegador para campo requerido | Front |
| toAccountId | Selección | Sí | Cuenta COP si dir es sell; cuenta USD si dir es buy | Primera cuenta de la lista filtrada | No | dir, fromAccountId | Debe tener moneda distinta a la de fromAccountId | Mensaje nativo del navegador para campo requerido; si las monedas son iguales, alerta "Revisa los datos de la conversión." | Front |
| amountFrom | Numérico decimal (en la moneda de fromAccountId) | Sí | Mín 0, paso 0.01; debe ser mayor a 0 | Vacío | No | fromAccountId | Se expresa en la moneda de la cuenta de origen | Mensaje nativo del navegador para campo requerido o valor menor a 0; si es 0, alerta "Revisa los datos de la conversión." | Front |

### Tabla 2 — Interacción (Nivel 2)

| Campo | Orden de tabulación | Deshabilitado | Foco automático (cuándo, si aplica) |
|---|---|---|---|
| dir | 1 | No | — |
| date | 2 | No | — |
| rate | 3 | No | — |
| fromAccountId | 4 | No | — |
| toAccountId | 5 | No | — |
| amountFrom | 6 | No | — |

### Tabla 3 — Pre-llenado (omitir por completo si la pregunta 3 fue "No")

| Campo | ¿Tiene pre-llenado? | Origen del pre-llenado (única respuesta) | Editable manualmente por el usuario |
|---|---|---|---|
| dir | No | — | — |
| date | No | — | — |
| rate | Sí | Información de BD | Sí |
| fromAccountId | No | — | — |
| toAccountId | No | — | — |
| amountFrom | No | — | — |

### Notas y justificaciones

- **Back y BD:** la app es un sitio estático sin backend ni base de datos propia; los datos viven en un archivo JSON del Google Drive del usuario. No hay capas Back ni BD; el Nivel 4 y el Nivel 5 no aplican. La función `addConversion` en `state.js` revalida (monedas distintas, monto y tasa mayores a 0, cuentas existentes) y devuelve `false` si algo falla; entonces el formulario muestra la alerta "Revisa los datos de la conversión.".
- **Pre-llenado de `rate`:** viene de las tasas guardadas en los datos del usuario (Ajustes → Tasas de cambio), no de una fuente externa en este formulario.
- **Vista previa:** debajo del formulario se muestra "Recibirías ≈ ..." recalculado al cambiar monto o tasa; no es un campo.
- **Efecto al guardar:** crea dos movimientos espejo (uno por cuenta, cada uno en su moneda) con la tasa usada, ambos excluidos de los totales por categoría.
- **Disponibilidad:** el formulario solo se puede abrir si existe al menos una cuenta en USD y una en COP; si no, avisa con una alerta.

### Versión y revisión (del schema de ese formulario, no de esta plantilla)

| Campo | Valor |
|---|---|
| Versión del schema | v1.0 |
| Fecha de aprobación | 06/10/2026 |
| Aprobado por | Desarrollador |
| Próxima revisión | Cuando el formulario cambie de campos o de reglas |
