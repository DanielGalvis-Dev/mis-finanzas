# Checklist de prueba manual — formularios del cambio del 20/10/2026

Se recorre en `http://localhost:8081` con teclado y navegador (Ctrl+Shift+R antes de empezar, por el caché del service worker). El dev marca PASS o FAIL en cada ítem. Los Niveles 4 y 5 no aplican (sin backend ni BD propia).

Estado: **sin marcar**, salvo lo que el dev ya reportó (ver «Transferir»).

## Transferir entre cuentas (`schema_transferir.md`)

El dev reportó haber probado el formulario nuevo y que funciona; falta marcar cada ítem.

- [ ] Nivel 1: escribir `abc` en Monto → no aparece nada.
- [ ] Nivel 2: Tab recorre Fecha → Desde → Hacia → Monto → Todo → (Tasa) → Descripción; Escape cierra.
- [ ] Nivel 2: el clic en el texto «Todo» marca la casilla (no enfoca el monto).
- [ ] Nivel 3: Desde = Hacia → alerta «Elige cuentas distintas para el origen y el destino.»
- [ ] Nivel 3: Monto 0 → alerta «Revisa los datos de la transferencia.»
- [ ] Nivel 3: marcar «Todo» con Desde = Bancolombia › Disponible → el monto es el disponible y se actualiza al cambiar Desde.
- [ ] Nivel 3: «Todo» con origen sin saldo (p. ej. la tarjeta) → alerta «No hay saldo disponible en el origen para transferir.»
- [ ] Nivel 3: Desde ARQ (USD) → Hacia Bancolombia (COP) → aparece Tasa y la vista previa «Recibirías ≈ …».
- [ ] Efecto: banco → efectivo crea un solo registro visible como dos filas «Transferencia»; borrar una borra las dos.

## Agregar / editar categoría (`schema_agregar_categoria.md`)

- [ ] Nivel 1/3: Nombre vacío → mensaje nativo de campo requerido.
- [ ] Nivel 2: Tab recorre Nombre → Tipo → Gasto libre; Escape cierra.
- [ ] Nivel 2: el clic en el texto «Gasto libre» marca la casilla (no enfoca el nombre).
- [ ] Efecto: marcar «Gasto libre» en una categoría de Salida → en Presupuesto solo muestra «Gastado»; desmarcarla → vuelve a tener Estimado.
- [ ] Efecto: Borrar pide confirmación.

## Presupuesto por defecto (`schema_presupuesto_por_defecto.md`)

- [ ] Nivel 1: escribir `abc` en un monto → no aparece nada.
- [ ] Nivel 2: escribir un valor y pulsar Tab → se guarda y el foco pasa al campo de la siguiente categoría.
- [ ] Nivel 3: dejar el campo vacío → se guarda como 0; escribir `-5000` → se guarda como 5000.
- [ ] Efecto: cambiar el valor → el texto indica el mes siguiente; en Presupuesto el mes actual y los anteriores NO cambian y el mes siguiente sí.
- [ ] Efecto: editar el Estimado de un mes concreto en Presupuesto → ese mes cambia y los demás siguen con el valor por defecto.

## Agregar / editar movimiento y cuenta (campos nuevos)

- [ ] Movimiento: elegir Bancolombia muestra «Bolsillo» (Disponible / Ahorro); elegir Efectivo lo oculta.
- [ ] Cuenta: marcar «Tiene bolsillo de ahorro» muestra el saldo inicial del bolsillo; el clic en su texto marca la casilla.
