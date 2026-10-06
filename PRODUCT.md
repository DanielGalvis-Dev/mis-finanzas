# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Una sola persona: el dueño de la app (uso personal), que cobra parte de sus ingresos en dólares a través de ARQ y el resto en pesos colombianos, con cuenta, ahorros y tarjeta de crédito en Bancolombia. La usa sobre todo desde el celular, muchas veces con datos móviles y poca señal, mientras hace otras cosas: anota un gasto en segundos, revisa saldos, consulta antes de comprar con la tarjeta. No hay otros usuarios previstos; no se asume nada de otras personas ni de otros bancos.

Trabajos principales (confirmados):

- Registrar el día a día: ingresos y gastos, rápido.
- Saber cuánto tiene: saldos por cuenta y total en COP, incluyendo lo que está en USD.
- Controlar el presupuesto del mes: estimado contra real por categoría.
- Usar bien la tarjeta de crédito: cuándo comprar, cuánto pagar y hasta cuándo para no pagar intereses.

## Product Purpose

Reemplazar la hoja de cálculo de finanzas personales (`FINANZAS_PERSONALES.xlsx`) por una app que viva en el teléfono, entienda dos monedas (COP y USD) y avise a tiempo. Éxito: el usuario sabe en segundos cuánto tiene y qué debe pagar, y nunca paga intereses o mora por descuido.

## Positioning

Los datos viven en el Google Drive del propio usuario, sin servidor ni terceros con acceso, y aun así la app se instala como PWA, abre desde caché y trabaja con COP y USD y con las fechas reales de la tarjeta. Una app comercial no puede prometer esa privacidad ni modelar las tasas de ARQ y el ciclo de una tarjeta concreta.

## Operating Context

- Un archivo `finanzas-data.json` en el Drive del usuario (scope `drive.file`) es la fuente de verdad; la app es un sitio estático en GitHub Pages.
- Pagos en USD llegan por ARQ; el paso a COP se registra como conversión con la tasa realmente aplicada. ARQ no publica API: sus tasas de compra y venta se estiman con una tasa de mercado más un margen calibrado a mano.
- La tarjeta (Visa Bancolombia) corta el día 30 y se paga hasta el 19 del mes siguiente (valores provisionales hasta confirmar con un segundo extracto).
- Idioma: español de Colombia. Monedas: COP (sin decimales) y USD (con decimales).

## Capabilities and Constraints

Capacidades: cuentas con moneda propia, movimientos, transferencias y conversiones entre cuentas, categorías con presupuesto mensual, gráficas, tasa USD/COP automática, panel y avisos del ciclo de la tarjeta (incluye recordatorio de calendario `.ics`), instalación como PWA.

Restricciones que deben conservarse:

- Datos solo en el Drive del usuario; ningún backend propio.
- El repositorio es público: nunca contiene datos reales (montos, extractos, cuentas); `seed-data.json` es una plantilla vacía.
- Sin costo de infraestructura: sitio estático en GitHub Pages, sin servidor.
- Carga rápida con datos móviles: abre desde caché y nunca muestra HTML sin estilos.
- Una web estática no puede notificar con la app cerrada; para eso se usa el calendario del usuario.

Decisiones abiertas: confirmar con el segundo extracto que corte día 30 y pago día 19 se repiten cada mes.

## Evidence on Hand

- Un extracto real de la tarjeta (septiembre de 2026) que fijó las fechas de corte y pago; no está en el repo y no debe subirse.
- Datos reales solo en el Drive del usuario y en un respaldo local fuera del repo.
- Sin testimonios, métricas de uso ni otros usuarios: nada de eso debe inventarse.

## Product Principles

1. Lo que el usuario necesita decidir ahora va primero: cuánto tiene, qué debe pagar, si conviene comprar hoy.
2. Privacidad por arquitectura: lo que no se puede garantizar sin servidor no se promete; se resuelve con lo que el usuario ya controla (su Drive, su calendario).
3. Dos monedas sin confusión: cada monto muestra su moneda, y toda conversión usa una tasa visible.
4. Velocidad en el celular antes que adornos: una anotación debe tomar segundos, también con mala señal.
5. Nunca fingir precisión: las tasas de ARQ y las fechas de la tarjeta son estimaciones calibradas, y la app lo dice cuando importa.

## Accessibility & Inclusion

Cumplir WCAG AA: contraste, uso completo con teclado, etiquetas y nombres accesibles, botones táctiles de al menos 44 px en móvil, y respeto de `prefers-reduced-motion`.
