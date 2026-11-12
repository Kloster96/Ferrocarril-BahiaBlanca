# data/curated — capa curada a mano

Datos que **no salen de OpenStreetMap tal cual** sino de una decisión editorial, siempre con su fuente.
Hoy tiene un solo archivo.

## `routes.json` (provisorio)

El recorrido de cada capítulo: la lista ordenada de vías de OSM (`wayIds`) que lo forman. El merge de la Fase 3
(#24) las une en una sola línea continua, que es lo que dibuja `line-trim-offset`.

**Estos tres recorridos son de prueba.** Son tramos reales de `data/out/lines.geojson` que se encadenan de punta
a punta (se verificó que no tienen huecos), elegidos para desarrollar la mecánica (scroll, `flyTo`, dibujo), no
porque cuenten una historia:

| Capítulo    | Vías | Para qué sirve                                     |
| ----------- | ---- | -------------------------------------------------- |
| `chapter-1` | 5    | Recorrido largo (~83 km), activo, casi recto       |
| `chapter-2` | 21   | Muchos segmentos cortos (~29 km): estresa el merge |
| `chapter-3` | 8    | Vías en desuso (~43 km): se dibuja con otro estilo |

Todos tienen `verified: false`, `source: null` y `TODO(verify)` en la etiqueta. **No contienen ningún dato
histórico**: ni fechas, ni nombres de ramales o compañías, ni relato. Cuando exista la investigación se
reemplaza este archivo, sin tocar código.

## Reglas

- `verified: true` exige `source` y ninguna marca `TODO(verify)` (lo valida el esquema Zod).
- Una vía por ID de OSM (`way/…`); el orden importa, la orientación no (en OSM es arbitraria).
- Un test valida el archivo contra el esquema y comprueba que cada vía exista en `data/out/lines.geojson`.
