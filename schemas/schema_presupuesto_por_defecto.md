# Schema — Presupuesto por defecto

### Datos del formulario

| Campo | Valor |
|---|---|
| Formulario | Presupuesto por defecto (sección de Ajustes en `views/config.js`; estimado fijo mensual por categoría de gasto) |
| Proyecto / repo | mis-finanzas |
| Protocolo de referencia | PROTOCOLO_DE_VALIDACION_DE_FORMULARIOS_v1.1.md |
| Campos nuevos o modificados | Todos (formulario nuevo) |
| ¿Vive en un modal? | No |
| ¿Algún campo se pre-llena automáticamente (Extracción IA, información de BD, o ambos)? | Sí |
| Responsable (Desarrollador) | Desarrollador |
| Fecha de creación | 20/10/2026 |

### Tabla 1 — Validación de datos (Niveles 1, 3, 4, 5)

Hay un campo `amount` por cada categoría de tipo Salida que no sea de gasto libre (`default-input`, uno por fila de la sección).

| Campo | Tipo de dato | Obligatorio | Rango/Límite | Valor por defecto | Único | Depende de | Regla de dependencia | Mensaje de error | Capas aplicables (Front/Back/BD) |
|---|---|---|---|---|---|---|---|---|---|
| amount | Numérico entero (COP) | No | Mín 0, paso 1, sin máximo | El valor vigente desde el mes siguiente, o 0 si no hay | No | Categoría de la fila | Solo se listan categorías de tipo Salida sin `noBudget`; se guarda en negativo (gasto) con vigencia desde el mes siguiente al actual; el mes actual y los anteriores no cambian | Sin mensaje: un valor vacío se toma como 0 y un valor negativo como su valor absoluto | Front |

### Tabla 2 — Interacción (Nivel 2)

| Campo | Orden de tabulación | Deshabilitado | Foco automático (cuándo, si aplica) |
|---|---|---|---|
| amount | Una posición por categoría, en el orden de la lista | No | Al guardar un valor con Tab, el foco pasa al campo de la siguiente categoría |

### Tabla 3 — Pre-llenado

| Campo | ¿Tiene pre-llenado? | Origen del pre-llenado (única respuesta) | Editable manualmente por el usuario |
|---|---|---|---|
| amount | Sí | Información de BD | Sí |

### Notas y justificaciones

- **Back y BD:** la app es un sitio estático sin backend ni base de datos propia; los datos viven en un archivo JSON del Google Drive del usuario. No hay capas Back ni BD; el Nivel 4 y el Nivel 5 no aplican. `setBudgetDefault` en `state.js` normaliza el valor (vacío a 0, negativo a absoluto) y lo guarda como entrada nueva del historial `budgetDefaults` (`categoryId`, `amount`, `from`).
- **Sin botón Guardar y sin mensaje de error:** cada campo guarda al confirmar el valor (Enter o al salir del campo). Como no hay envío de formulario, no se muestran mensajes nativos del navegador; la normalización de la fila de arriba cubre los valores inválidos.
- **Vigencia:** el cambio aplica desde el mes siguiente (`from`); el mes en curso y los anteriores conservan su valor. Un estimado editado a mano en un mes concreto desde Presupuesto gana sobre el valor por defecto. El mes en curso no toma un valor nuevo hasta que se edite a mano o llegue el mes siguiente.
- **Mismo criterio en Presupuesto:** el campo "Estimado" de cada mes en la pestaña Presupuesto sigue las mismas reglas (entero, mínimo 0, gasto guardado en negativo) pero escribe solo ese mes.
- **Pre-llenado:** el valor mostrado sale del historial guardado en el archivo de Drive; es editable y no hay otra fuente que pueda discrepar.

### Versión y revisión (del schema de ese formulario, no de esta plantilla)

| Campo | Valor |
|---|---|
| Versión del schema | v1.0 |
| Fecha de aprobación | 20/10/2026 |
| Aprobado por | Desarrollador |
| Próxima revisión | Cuando el formulario cambie de campos o de reglas |
