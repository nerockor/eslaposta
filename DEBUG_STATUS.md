# Reporte de Estado: Error Filtro Rubro Mobile

## Estado Actual
- **Problema:** El botón "RUBRO: TODOS" en la barra inferior (versión móvil) no despliega el menú, a pesar de que el botón "BARRIO" (con lógica idéntica) sí funciona.
- **Rama:** `debug-filtro-rubro-mobile`

## Ajustes Realizados (Ya implementados en el código)
1.  **Animaciones de Escala:** Se implementó `scale-100` / `opacity-100` con `origin-top-left` para los menús.
2.  **Menú Universal:** Se sacaron los menús del bloque `!isMobile` para que existan en la versión smartphone.
3.  **Posicionamiento Mobile:** En móviles, el menú se posiciona en el centro de la pantalla (`inset-0 items-center justify-center`) con un fondo borroso (`backdrop-blur-md`).
4.  **Blindaje de Datos:** Se añadió `Array.isArray(ads)` y `Array.isArray(categories)` en todo `PublicView.jsx` para evitar el error "filter is not a function".
5.  **Fix Hostinger:** Se añadió `app.set('trust proxy', 1)` en `server/index.js` para corregir errores de Rate Limit en producción.
6.  **Eventos Touch:** Se añadieron manejadores `onTouchEnd` y `e.preventDefault()` en los botones inferiores para asegurar que el móvil capture el toque.

## Hallazgos de Consola
- El clic llega a React (se verificó con logs), pero el estado `filterOpen` parece no mantenerse en `true` o el componente no se renderiza visualmente como se espera.
- Se añadió un log de respaldo en `PublicView.jsx` dentro del renderizado del menú para monitorear el estado.

## Pendiente
- Verificar por qué `filterOpen: true` no se refleja visualmente en el menú de Rubros mientras que en Barrios sí.
- Probar en la nueva PC si el comportamiento persiste.
