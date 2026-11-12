# Datos del proyecto

Todo lo que hay en `data/` se usa para **producir** los datos. Nada de esto va al cliente: la app lee los
resultados de `data/out/` a través de `/api/*`.

| Carpeta        | Qué contiene                                                                                                               |
| -------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `data/scripts` | Extracción desde OpenStreetMap, limpieza y sus tests                                                                       |
| `data/raw`     | Copia fiel, sin tocar, de lo que devolvió Overpass (`osm-raw.json`, `area-raw.json`), versionada                           |
| `data/out`     | GeoJSON limpio de vías y estaciones, `area.geojson` (área de estudio y máscara) y `stats.json` con estadísticas por estado |

## Cómo regenerar los datos

Requisitos: Node.js 22 o superior y `pnpm install` hecho en la raíz del repo.

```bash
pnpm data:extract   # descarga de Overpass → data/raw/osm-raw.json
pnpm data:clean     # data/raw → data/out/*.geojson
pnpm data:stats     # data/out/*.geojson → data/out/stats.json
pnpm data:extract-area  # descarga los límites de los dos partidos → data/raw/area-raw.json
pnpm data:routes    # data/out/lines.geojson + data/curated/routes.json → data/out/routes.geojson
pnpm data:area      # data/raw/area-raw.json → data/out/area.geojson
pnpm test           # incluye los tests de data/
```

- **`data:extract` consulta un servicio público** (Overpass). No lo corras en CI ni en bucle: si responde
  `429`, `502`, `503` o `504` el script espera y reintenta unas pocas veces y después se rinde, a propósito, para
  respetar su política de uso.
- **`data:clean` es determinista**: con el mismo `data/raw` produce el mismo `data/out`. Podés correrlo cuantas
  veces quieras.
- Después de regenerar, revisá `git diff data/`: un cambio inesperado en las vías o estaciones es información
  (OSM cambió o cambió una regla de limpieza), no ruido.

### Qué área cubre

La consulta busca vías y estaciones dentro de los partidos de **Bahía Blanca** y **Coronel de Marina Leonardo
Rosales** (relaciones de OSM `2582799` y `2584648`). Para cambiar la cobertura, editá la lista `AREAS` en
`data/scripts/extract-osm.ts`. Las vías que salen hacia otros partidos se cortan en el borde del área.

La consulta incluye lo que ya no funciona (`disused`, `abandoned`, `razed`): es un proyecto histórico.

### Reglas de la limpieza

Están explicadas en el encabezado de `data/scripts/clean.ts`. Las que importan al leer los datos:

- **No se descarta nada histórico.** El estado se normaliza a `active`, `disused` o `abandoned`.
- **Las estaciones nunca se fusionan por nombre.** Distintas compañías tuvieron estaciones separadas en el
  mismo pueblo. La única fusión es entre la huella de un edificio y la estación a menos de 30 m.
- **Los casos dudosos se conservan separados** y llevan `needsReview` y `reviewReasons`, para que una persona los
  verifique.
- **Lo que falta es `null`.** No se inventa nada. Un tagging que el script no entiende lanza un error.
- Las vías **no se agrupan en ramales**: eso vendrá de una capa curada (ver `CLAUDE.md`).
- **Cada vía trae `startNodeId` y `endNodeId`**: los IDs de OSM de su primer y último nodo. Solo los extremos,
  no todos los nodos. Sirven para encadenar vías que comparten un extremo, y quien los consuma lee `data/out/`,
  nunca el crudo. Si una vía del crudo no trae nodos, la limpieza falla en lugar de inventarlos.

### Estadísticas (`stats.json`)

`pnpm data:stats` lee `data/out/*.geojson` (no el crudo) y escribe `data/out/stats.json`: cantidad y km de vía,
y cantidad de estaciones, por estado (`active`, `disused`, `abandoned`) y en total. `/api/stats` solo valida y
sirve este archivo; no calcula nada.

- **`trackKm` no es el largo del recorrido**: es la suma del largo de todas las vías mapeadas. Si OSM dibuja
  una doble vía o un desvío como vías aparte, cada una suma.
- El archivo no lleva fecha de generación, para que sea reproducible: las mismas entradas dan el mismo archivo.
- Si regenerás las vías, regenerá también las stats. Un test falla si `stats.json` no coincide con el GeoJSON.

## Licencia y atribución de los datos

Los datos de `data/raw` y `data/out` vienen de **OpenStreetMap** y están bajo la
[Open Database License (ODbL) 1.0](https://opendatacommons.org/licenses/odbl/1-0/),
**no** bajo la licencia MIT del código del repo.

Cada GeoJSON lleva la licencia y la fecha de extracción en su campo `metadata`, para que la atribución viaje
con los datos.

### Qué obliga la licencia (resumen, no asesoramiento legal)

1. **Atribuir.** Dondequiera que se muestren estos datos tiene que haber una atribución visible:
   `© OpenStreetMap contributors`, con enlace a <https://www.openstreetmap.org/copyright>. En el mapa, esa
   atribución va junto con la de Mapbox.
2. **Compartir igual (share-alike) para las bases de datos derivadas.** Los GeoJSON de `data/out` son una base de
   datos derivada de OSM: si se distribuyen, tienen que ofrecerse bajo ODbL. Por eso este directorio no se
   relicencia como MIT.
3. **El mapa renderizado es otra cosa.** Un mapa o imagen producida a partir de los datos (un _Produced Work_) no
   obliga a compartir igual, pero sí a la atribución del punto 1.

La fuente de verdad es el texto de la licencia y la
[guía de OSM](https://wiki.osmfoundation.org/wiki/Licence/Attribution_Guidelines). Ante la duda, consultá ahí.

### Calidad de los datos

OSM es colaborativo: puede haber vías sin nombre, etiquetas contradictorias o estaciones mal ubicadas. Los datos
históricos de las vías **no son una fuente verificada**. Lo que se afirma en la historia sale de las fuentes de
cada capítulo (`web/src/content/chapters.ts`, campos `source` y `verified`), no de OSM.

### Área de estudio (`area.geojson`)

Dos features, en este orden: `area` (MultiPolygon: la unión de los partidos de Bahía Blanca y Coronel Rosales, para
dibujar el borde) y `mask` (Polygon: el mundo con el área recortada como agujeros, para atenuar lo que queda afuera).
El mapa solo las dibuja; no calcula geometría.

- La frontera que comparten los dos partidos es la misma vía OSM en ambas relaciones: se descarta (aparece dos veces) y el resto se encadena en anillos cerrados.
- Los anillos se simplifican con Douglas-Peucker a **50 m**. Sin eso son 28.484 vértices y 1,4 MB; con eso, ~184 KB.
  Los islotes menores que la tolerancia desaparecen, a propósito.

### Recorridos por capítulo (`routes.geojson`)

`pnpm data:routes` une las vías de cada capítulo (`data/curated/routes.json`) en **una sola LineString continua**, que
es lo que dibuja `line-trim-offset`. Lee solo `data/out/lines.geojson` y la capa curada, nunca `data/raw/`.

- **Empalmar**: dos vías consecutivas empalman si **comparten el nodo de OSM de un extremo** (`startNodeId` /
  `endNodeId`). No hay tolerancia de distancia: con IDs de nodo, un casi-empalme es un hueco real.
- **Dirección**: la de las vías en OSM es arbitraria, así que una vía invertida no es un error: se invierte para
  continuar el recorrido.
- **Falla** solo ante un hueco real o un ID de OSM inexistente, con un mensaje que nombra el capítulo y las vías.
- Si cambiás `routes.json`, regenerá con `pnpm data:routes`: un test falla si `routes.geojson` quedó desactualizado.
