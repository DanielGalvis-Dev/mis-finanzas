# Schema — Agregar / editar categoría

### Datos del formulario

| Campo | Valor |
|---|---|
| Formulario | Agregar / editar categoría (`openCategoryForm` en `views/config.js`) |
| Proyecto / repo | mis-finanzas |
| Protocolo de referencia | PROTOCOLO_DE_VALIDACION_DE_FORMULARIOS_v1.1.md |
| Campos nuevos o modificados | `noBudget` (nuevo: marca la categoría como gasto libre); `name` y `kind` ya existían y se documentan aquí por primera vez |
| ¿Vive en un modal? | Sí |
| ¿Algún campo se pre-llena automáticamente (Extracción IA, información de BD, o ambos)? | No |
| Responsable (Desarrollador) | Desarrollador |
| Fecha de creación | 20/10/2026 |

### Tabla 1 — Validación de datos (Niveles 1, 3, 4, 5)

| Campo | Tipo de dato | Obligatorio | Rango/Límite | Valor por defecto | Único | Depende de | Regla de dependencia | Mensaje de error | Capas aplicables (Front/Back/BD) |
|---|---|---|---|---|---|---|---|---|---|
| name | Texto | Sí | — | Vacío (al crear) o el nombre actual (al editar) | No | — | — | Mensaje nativo del navegador para campo requerido | Front |
| kind | Selección (Entrada, Salida, Ahorro) | Sí | Solo Entrada, Salida o Ahorro | Salida (al crear) o el tipo actual (al editar) | No | — | — | Mensaje nativo del navegador para campo requerido | Front |
| noBudget | Casilla (sí/no) | No | — | Desmarcada (al crear) o el valor actual (al editar) | No | kind | Solo tiene efecto cuando kind es Salida: marca un gasto libre, que en Presupuesto solo muestra lo gastado y no tiene estimado fijo | — | Front |

### Tabla 2 — Interacción (Nivel 2)

| Campo | Orden de tabulación | Deshabilitado | Foco automático (cuándo, si aplica) |
|---|---|---|---|
| name | 1 | No | — |
| kind | 2 | No | — |
| noBudget | 3 | No | — |

### Notas y justificaciones

- **Back y BD:** la app es un sitio estático sin backend ni base de datos propia; los datos viven en un archivo JSON del Google Drive del usuario. No hay capas Back ni BD; el Nivel 4 y el Nivel 5 no aplican.
- **Mensajes de error:** el formulario usa la validación nativa de HTML5 (`required`); no define textos propios.
- **`name` sin límite ni unicidad:** el formulario no valida longitud máxima ni nombres repetidos; dos categorías pueden llamarse igual.
- **`noBudget` sin mensaje de error:** es una casilla, no puede quedar en un estado inválido. Si se marca en una categoría que no es de tipo Salida no pasa nada: Presupuesto solo muestra categorías de Salida.
- **Marca automática:** la migración de datos v1→v2 marca `noBudget` en las categorías cuyo nombre sea Comida Gatos, Gasolina, Otros o Pasajes (sin tildes ni mayúsculas); después se edita aquí.
- **Borrado:** al editar, el botón Borrar pide confirmación; los movimientos de la categoría borrada no se eliminan y quedan sin categoría.
- **Cierre del modal:** Con campos modificados, el clic fuera o Escape no cierran en silencio: abren una alerta SweetAlert2 «Si sales ahora se perderá lo que escribiste en este formulario. ¿Salir sin guardar?» (Seguir editando / Salir sin guardar). Sin cambios, cierran de inmediato; el botón Cancelar siempre cierra. Lo define `modal.js` y vale para todos los formularios de la app.
- **Avisos de resultado:** al agregar, actualizar o borrar una categoría se muestra un aviso breve (toast de SweetAlert2) y sin bloqueo; los borrados piden además confirmación previa.

### Versión y revisión (del schema de ese formulario, no de esta plantilla)

| Campo | Valor |
|---|---|
| Versión del schema | v1.0 |
| Fecha de aprobación | 20/10/2026 |
| Aprobado por | Desarrollador |
| Próxima revisión | Cuando el formulario cambie de campos o de reglas |
