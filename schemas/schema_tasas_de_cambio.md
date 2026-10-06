# Schema — Tasa de cambio USD/COP

### Datos del formulario

| Campo | Valor |
|---|---|
| Formulario | Tasa de cambio USD/COP (sección en `views/config.js`; solo muestra valores, no tiene campos editables ni botón de envío) |
| Proyecto / repo | mis-finanzas |
| Protocolo de referencia | PROTOCOLO_DE_VALIDACION_DE_FORMULARIOS_v1.1.md |
| Campos nuevos o modificados | Todos (los campos pasaron de editables a solo lectura con actualización automática) |
| ¿Vive en un modal? | No |
| ¿Algún campo se pre-llena automáticamente (Extracción IA, información de BD, o ambos)? | Sí |
| Responsable (Desarrollador) | Desarrollador |
| Fecha de creación | 06/10/2026 |

### Tabla 1 — Validación de datos (Niveles 1, 3, 4, 5)

| Campo | Tipo de dato | Obligatorio | Rango/Límite | Valor por defecto | Único | Depende de | Regla de dependencia | Mensaje de error | Capas aplicables (Front/Back/BD) |
|---|---|---|---|---|---|---|---|---|---|
| Venta | Numérico decimal de solo lectura (COP por 1 USD) | No | Mayor a 0 cuando existe; 2 decimales | — (se muestra un guion hasta tener tasa) | No | — | Se calcula como la tasa de mercado menos 0,4348 %; se actualiza cada minuto | — | Front |
| Compra | Numérico decimal de solo lectura (COP por 1 USD) | No | Mayor a 0 cuando existe; 2 decimales | — (se muestra un guion hasta tener tasa) | No | — | Se calcula como la tasa de mercado más 0,4348 %; se actualiza cada minuto | — | Front |

### Tabla 2 — Interacción (Nivel 2)

| Campo | Orden de tabulación | Deshabilitado | Foco automático (cuándo, si aplica) |
|---|---|---|---|
| Venta | — | Sí | — |
| Compra | — | Sí | — |

### Tabla 3 — Pre-llenado (omitir por completo si la pregunta 3 fue "No")

| Campo | ¿Tiene pre-llenado? | Origen del pre-llenado (única respuesta) | Editable manualmente por el usuario |
|---|---|---|---|
| Venta | Sí | Información de BD | No |
| Compra | Sí | Información de BD | No |

### Notas y justificaciones

- **Back y BD:** la app es un sitio estático sin backend ni base de datos propia; los datos viven en un archivo JSON del Google Drive del usuario. No hay capas Back ni BD; el Nivel 4 y el Nivel 5 no aplican.
- **Origen de las tasas:** se consulta cada minuto, mientras la app está visible, la tasa de mercado de fawazahmed0/currency-api (currency-api.pages.dev, con respaldo en jsDelivr) y se aplica el spread de ARQ (0,4348 % a cada lado, calibrado con compra 3201,43 y venta 3173,71 del 06/10/2026). La fuente se actualiza una vez al día.
- **Sin campos editables:** al ser solo lectura no hay entrada del usuario que validar; si no hay conexión se conserva la última tasa guardada y si nunca hubo tasa se muestra un guion.
- **Persistencia:** las tasas se actualizan en memoria y se guardan en Drive con el siguiente guardado normal; no se guarda cada minuto por este motivo.
- **Uso:** los saldos en USD se valoran con la tasa de venta, y el formulario "Convertir divisas" las usa como valor inicial de su campo de tasa (editable allí).

### Versión y revisión (del schema de ese formulario, no de esta plantilla)

| Campo | Valor |
|---|---|
| Versión del schema | v1.1 |
| Fecha de aprobación | 06/10/2026 |
| Aprobado por | Desarrollador |
| Próxima revisión | Cuando el formulario cambie de campos o de reglas |
