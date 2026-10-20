# Checklist de prueba manual — formularios del cambio del 20/10/2026

Se recorre en `http://localhost:8081` con teclado y navegador (Ctrl+Shift+R antes de empezar, por el caché del service worker). El dev marca PASS o FAIL en cada ítem. Los Niveles 4 y 5 no aplican (sin backend ni BD propia).

Estado: los ítems del 20/10/2026 están en PASS (el dev los recorrió y reportó que todo está bien). La sección «Cierre del modal y avisos (todos los formularios)» se agregó después y está **pendiente de marcar**.

## Transferir entre cuentas (`schema_transferir.md`)

El dev reportó el resultado de todos los ítems como PASS.

- [x] Nivel 1: escribir `abc` en Monto → no aparece nada.
- [x] Nivel 2: Tab recorre Fecha → Desde → Hacia → Monto → Todo → (Tasa) → Descripción; Escape cierra.
- [x] Nivel 2: el clic en el texto «Todo» marca la casilla (no enfoca el monto).
- [x] Nivel 3: Desde = Hacia → alerta «Elige cuentas distintas para el origen y el destino.»
- [x] Nivel 3: Monto 0 → alerta «Revisa los datos de la transferencia.»
- [x] Nivel 3: marcar «Todo» con Desde = Bancolombia › Disponible → el monto es el disponible y se actualiza al cambiar Desde.
- [x] Nivel 3: «Todo» con origen sin saldo (p. ej. la tarjeta) → alerta «No hay saldo disponible en el origen para transferir.»
- [x] Nivel 3: Desde ARQ (USD) → Hacia Bancolombia (COP) → aparece Tasa y la vista previa «Recibirías ≈ …».
- [x] Efecto: banco → efectivo crea un solo registro visible como dos filas «Transferencia»; borrar una borra las dos.

## Agregar / editar categoría (`schema_agregar_categoria.md`)

- [x] Nivel 1/3: Nombre vacío → mensaje nativo de campo requerido.
- [x] Nivel 2: Tab recorre Nombre → Tipo → Gasto libre; Escape cierra.
- [x] Nivel 2: el clic en el texto «Gasto libre» marca la casilla (no enfoca el nombre).
- [x] Efecto: marcar «Gasto libre» en una categoría de Salida → en Presupuesto solo muestra «Gastado»; desmarcarla → vuelve a tener Estimado.
- [x] Efecto: Borrar pide confirmación.

## Presupuesto por defecto (`schema_presupuesto_por_defecto.md`)

- [x] Nivel 1: escribir `abc` en un monto → no aparece nada.
- [x] Nivel 2: escribir un valor y pulsar Tab → se guarda y el foco pasa al campo de la siguiente categoría.
- [x] Nivel 3: dejar el campo vacío → se guarda como 0; escribir `-5000` → se guarda como 5000.
- [x] Efecto: cambiar el valor → el texto indica el mes siguiente; en Presupuesto el mes actual y los anteriores NO cambian y el mes siguiente sí.
- [x] Efecto: editar el Estimado de un mes concreto en Presupuesto → ese mes cambia y los demás siguen con el valor por defecto.

## Agregar / editar movimiento y cuenta (campos nuevos)

- [x] Movimiento: elegir Bancolombia muestra «Bolsillo» (Disponible / Ahorro); elegir Efectivo lo oculta.
- [x] Cuenta: marcar «Tiene bolsillo de ahorro» muestra el saldo inicial del bolsillo; el clic en su texto marca la casilla.

## Cierre del modal y avisos (todos los formularios) — pendiente de marcar

Probar en Transferir, Agregar movimiento y Agregar categoría.

- [ ] Abrir el formulario, no escribir nada, clic fuera del diálogo → se cierra.
- [ ] Escribir algo y hacer clic fuera → aparece la alerta «Si sales ahora se perderá lo que escribiste…»; «Seguir editando» conserva todo, «Salir sin guardar» cierra.
- [ ] Con algo escrito, pulsar Escape → aparece la misma alerta.
- [ ] Sin escribir nada, pulsar Escape → se cierra de inmediato.
- [ ] El botón Cancelar siempre cierra.
- [ ] Registrar un movimiento → aviso «Movimiento registrado»; editarlo → «Movimiento actualizado»; borrarlo (con confirmación) → «Movimiento eliminado».
- [ ] Registrar una transferencia → «Transferencia registrada»; borrarla (con confirmación) → «Transferencia eliminada».
- [ ] Agregar, editar y borrar una cuenta y una categoría → avisos «Cuenta/Categoría agregada/actualizada/eliminada».
- [ ] Ajustes › Presupuesto por defecto: guardar un valor → aviso con el mes desde el que aplica, y Tab sigue pasando al siguiente campo.
- [ ] Los avisos desaparecen solos (~2,5 s) y no bloquean la pantalla.
