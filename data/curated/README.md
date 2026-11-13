# data/curated — capa curada a mano

Datos que **no salen de OpenStreetMap tal cual** sino de una decisión editorial, siempre con su fuente.
Hoy tiene un solo archivo.

## `routes.json` (provisorio)

El recorrido de cada capítulo: la lista ordenada de vías de OSM (`wayIds`) que lo forman. El merge de la Fase 3
(#24) las une en una sola línea continua, que es lo que dibuja `line-trim-offset`.

**Este recorrido es de prueba.** Es un tramo real de `data/out/lines.geojson` que se encadena de punta a punta (se
verificó que no tiene huecos), elegido para desarrollar la mecánica (scroll, `flyTo`, dibujo), no porque cuente una
historia. Es el del capítulo 1 (`chapter-1`, 5 vías, ~83 km, activo, casi recto). Hay uno solo porque solo el capítulo 1 es de tipo `route`: un recorrido para un capítulo `zone`, `network` o
`status` nunca se dibujaría, y un test lo impide.

Tiene `verified: false`, `source: null` y `TODO(verify)` en la etiqueta. **No contiene ningún dato
histórico**: ni fechas, ni nombres de ramales o compañías, ni relato. Cuando exista la investigación se
reemplaza este archivo, sin tocar código.

## Reglas

- `verified: true` exige `source` y ninguna marca `TODO(verify)` (lo valida el esquema Zod).
- Una vía por ID de OSM (`way/…`); el orden importa, la orientación no (en OSM es arbitraria).
- Un test valida el archivo contra el esquema y comprueba que cada vía exista en `data/out/lines.geojson`.
