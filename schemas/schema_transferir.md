# Schema — Transferir entre cuentas

### Datos del formulario

| Campo | Valor |
|---|---|
| Formulario | Transferir entre cuentas (`openTransferForm` en `views/transactionList.js`); reemplaza a "Convertir divisas" (`schema_convertir_divisas.md`, ahora cubierto por este formulario cuando las monedas difieren) |
| Proyecto / repo | mis-finanzas |
| Protocolo de referencia | PROTOCOLO_DE_VALIDACION_DE_FORMULARIOS_v1.1.md |
| Campos nuevos o modificados | Todos (formulario nuevo) |
| ¿Vive en un modal? | Sí |
| ¿Algún campo se pre-llena automáticamente (Extracción IA, información de BD, o ambos)? | Sí |
| Responsable (Desarrollador) | Desarrollador |
| Fecha de creación | 20/10/2026 |

### Tabla 1 — Validación de datos (Niveles 1, 3, 4, 5)

| Campo | Tipo de dato | Obligatorio | Rango/Límite | Valor por defecto | Único | Depende de | Regla de dependencia | Mensaje de error | Capas aplicables (Front/Back/BD) |
|---|---|---|---|---|---|---|---|---|---|
| date | Fecha | Sí | — | Fecha de hoy (hora local) | No | — | — | Mensaje nativo del navegador para campo requerido | Front |
| from | Selección (`idCuenta` o `idCuenta\|ahorro`) | Sí | Una cuenta existente o el bolsillo de ahorro de una cuenta que lo tenga | Primera opción de la lista | No | — | — | Mensaje nativo del navegador para campo requerido | Front |
| to | Selección (`idCuenta` o `idCuenta\|ahorro`) | Sí | Igual que `from`, pero distinto de `from` | Segunda opción de la lista | No | from | Origen y destino no pueden ser la misma cuenta y bolsillo | Alerta "Elige cuentas distintas para el origen y el destino." | Front |
| amount | Numérico decimal (en la moneda de la cuenta de origen) | Sí | Mín 0, paso 0.01; debe ser mayor a 0 | Vacío (o el saldo transferible del origen si «Todo» está marcada) | No | from, all | Se expresa en la moneda de la cuenta de origen; con «Todo» marcada es de solo lectura y sigue al saldo del origen | Mensaje nativo del navegador para campo requerido o valor menor a 0; si es 0, alerta "Revisa los datos de la transferencia." | Front |
| all | Casilla («Todo») | No | — | Desmarcada | No | from | Al marcarla, `amount` toma el saldo transferible del origen (bolsillo de ahorro, parte disponible de una cuenta con bolsillo, o saldo de la cuenta) y se actualiza si cambia `from`; si ese saldo no es mayor a 0, alerta «No hay saldo disponible en el origen para transferir.» | Alerta «No hay saldo disponible en el origen para transferir.» | Front |
| rate | Numérico decimal (COP por 1 USD) | Sí, solo si las monedas de `from` y `to` difieren | Mín 0, paso 0.01; debe ser mayor a 0 | Tasa de venta (USD→COP) o de compra (COP→USD) guardada; si no hay, la de valoración o vacío | No | from, to | Solo se muestra si las monedas difieren; entre monedas distintas no se permite el bolsillo de ahorro | Mensaje nativo del navegador para campo requerido; alerta "Revisa los datos de la conversión." | Front |
| description | Texto | No | — | Vacío (se genera «Transferencia A → B») | No | from, to | Se oculta si las monedas difieren (la conversión genera su propia descripción) | — | Front |

### Tabla 2 — Interacción (Nivel 2)

| Campo | Orden de tabulación | Deshabilitado | Foco automático (cuándo, si aplica) |
|---|---|---|---|
| date | 1 | No | — |
| from | 2 | No | — |
| to | 3 | No | — |
| amount | 4 | No (solo lectura si «Todo» está marcada) | — |
| all | 5 | No | — |
| rate | 6 | No (oculto si las monedas son iguales) | — |
| description | 7 | No (oculto si las monedas difieren) | — |

### Tabla 3 — Pre-llenado

| Campo | ¿Tiene pre-llenado? | Origen del pre-llenado (única respuesta) | Editable manualmente por el usuario |
|---|---|---|---|
| date | No | — | — |
| from | No | — | — |
| to | No | — | — |
| amount | No | — | — |
| all | No | — | — |
| rate | Sí | Información de BD | Sí |
| description | No | — | — |

### Notas y justificaciones

- **Back y BD:** la app es un sitio estático sin backend ni base de datos propia; los datos viven en un archivo JSON del Google Drive del usuario. No hay capas Back ni BD; el Nivel 4 y el Nivel 5 no aplican. `addTransfer` y `addConversion` en `state.js` revalidan (cuentas existentes, monto mayor a 0, origen distinto de destino, monedas, bolsillo disponible) y devuelven `false` si algo falla.
- **Efecto al guardar:** un solo registro para el usuario; en los datos son dos movimientos espejo con `transferId` (o `conversionId` y `fxRate` si hay conversión), `categoryId: null` y `excludeFromCategoryTotals: true` en ambos, así que no cuentan en Presupuesto, Total ni Gráficas por categoría.
- **Casos de uso:** efectivo ⇄ banco, pago de la tarjeta de crédito (banco → tarjeta), Disponible ⇄ Ahorro de Bancolombia, y conversión USD ⇄ COP.
- **Edición:** una transferencia no se edita; al tocarla en la lista se ofrece borrarla completa (ambos lados).
- **Reglas de validación:** `validateTransferInput` en `state.js` concentra las reglas del Nivel 3 (monto mayor a 0, origen distinto de destino, «Todo» con saldo, tasa mayor a 0 y sin bolsillo entre monedas distintas) y tiene pruebas unitarias; el formulario solo muestra su mensaje.
- **Cierre del modal:** Con campos modificados, el clic fuera o Escape no cierran en silencio: abren una alerta SweetAlert2 «Si sales ahora se perderá lo que escribiste en este formulario. ¿Salir sin guardar?» (Seguir editando / Salir sin guardar). Sin cambios, cierran de inmediato; el botón Cancelar siempre cierra. Lo define `modal.js` y vale para todos los formularios de la app.
- **Avisos de resultado:** al registrar se muestra el aviso «Transferencia registrada» o «Conversión registrada»; al borrar el par, «Transferencia eliminada» o «Conversión eliminada» (con confirmación previa).
- **Vista previa:** si hay conversión, debajo se muestra «Recibirías ≈ …», recalculado al cambiar monto o tasa; no es un campo.

### Versión y revisión (del schema de ese formulario, no de esta plantilla)

| Campo | Valor |
|---|---|
| Versión del schema | v1.0 |
| Fecha de aprobación | 20/10/2026 |
| Aprobado por | Desarrollador (probó el formulario) |
| Próxima revisión | Cuando el formulario cambie de campos o de reglas |
