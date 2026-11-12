# Changelog

Todos los cambios relevantes de este proyecto se documentan en este archivo.

El formato sigue [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) y el proyecto usa
[versionado semántico](https://semver.org/lang/es/). Cada fase cierra con una versión: `v0.1.0` = Fase 0 … `v0.7.0` = Fase 7.

## [0.3.0] - 2026-11-12

Fase 2 — Mapa base + API.

### Agregado

- API con Route Handlers estáticos: `/api/lines`, `/api/stations`, `/api/stats` y `/api/area`. Leen `data/out/`
  en el build y lo validan con Zod: datos inválidos rompen el build, no la UI. Cualquier otra ruta `/api/*`
  responde 404 con el formato único `{ error: { code, message } }`.
- Mapa base de Mapbox (solo cliente, sin SSR) que lee de `/api/*`: vías (las que no están activas, punteadas),
  estaciones y nombres desde el zoom 11. Estados de carga (skeleton), falta de token, WebGL no disponible y error
  de datos con "Reintentar"; un aviso aparte si fallan algunos tiles.
- Atribuciones visibles de Mapbox y de OpenStreetMap.
- Máscara del área de estudio: lo que queda fuera de los partidos de Bahía Blanca y Coronel Rosales se desatura
  y oscurece con un borde suave, para que las vías cortadas se lean como el límite de la historia. El polígono
  sale de OSM (`pnpm data:extract-area` y `pnpm data:area`) y se sirve por `/api/area`.
- CSP real: `connect-src` abre solo `api.mapbox.com` y `events.mapbox.com`, los dos orígenes que el navegador
  reportó. Verificada en Chromium y Firefox, en desarrollo y en producción: cero violaciones.
- Página de laboratorio `/dev/line-trim` (solo desarrollo) con la prueba de `line-trim-offset`.
- `pnpm check`: formato, lint, typecheck, tests y build, en el orden del CI. El CI corre ese mismo script.

### Decisiones

- `line-trim-offset` (verificado en mapbox-gl 3.34.2): exige `lineMetrics: true`, recorta cada LineString por
  separado y `[inicio, fin]` es la parte **oculta**, así que el dibujo progresivo es `[progreso, 1]`.
- La máscara va **encima** de las vías y **debajo** de las estaciones: debajo no atenuaría los tramos que salen del
  área. Los colores son provisorios hasta la paleta de la Fase 4.
- Douglas-Peucker a 50 m solo para el área (1,4 MB → 184 KB); los islotes menores desaparecen. La función sirve
  para #29, que sigue sin aplicarse a las vías.
- Zod corre con `jitless: true`: su sonda de `eval` aparecía como violación de CSP en producción aunque cayera a
  un camino seguro.
- Vista inicial fija, sin `fitBounds`: calcular límites en runtime pondría geometría en `web/`.
- `agentRules: false`: Next no genera un `AGENTS.md` propio; las reglas viven en `CLAUDE.md`.
- `--force-with-lease` está permitido solo en ramas de PR, en un rebase que pidió el dueño del repo.

### Deuda conocida

- **Safari/WebKit sin verificar** (#45, Fase 7): el WebKit de Playwright no conectó en esta máquina. Se prueba en un
  iPhone cuando el sitio esté en Vercel.
- **Capa curada pendiente**: sin ella no hay ramales ni recorridos por capítulo (#24, requisito de la Fase 3).
- **Contenido sin verificar**: todos los capítulos siguen siendo `TODO(verify)`.
- **Costa más gruesa al acercar**: con 50 m de tolerancia, el borde del área pierde detalle desde el zoom ~13.

## [0.2.0] - 2026-11-12

Fase 1 — Datos.

### Agregado

- Extracción de vías y estaciones desde OpenStreetMap (Overpass) para los partidos de Bahía Blanca y Coronel
  de Marina Leonardo Rosales: `pnpm data:extract` guarda una copia fiel en `data/raw/`.
- Limpieza determinista (`pnpm data:clean`) hacia `data/out/lines.geojson` y `data/out/stations.geojson`:
  313 vías y 29 estaciones. Nada histórico se descarta: el estado se normaliza a `active`, `disused` o
  `abandoned`, y los casos dudosos quedan marcados con `needsReview` y sus motivos.
- `startNodeId` y `endNodeId` en cada vía: los IDs de OSM de sus nodos extremos, para encadenar vías en la Fase 3.
- Estadísticas (`pnpm data:stats`) en `data/out/stats.json`: cantidad y km de vía, y cantidad de estaciones,
  por estado y en total (579,9 km de vía mapeada).
- Esquemas Zod de vías, estaciones, colecciones GeoJSON y estadísticas en `web/src/shared/schemas/`, estrictos y
  con reglas más allá de la forma (rangos de coordenadas, estados, ids únicos, totales coherentes).
- Un test en CI valida `data/out/` contra esos esquemas: datos inválidos rompen el CI, no el mapa.
- Archivo de capítulos con esquema Zod (`web/src/content/chapters.ts`): `source` y `verified` por capítulo, y
  `verified: true` exige fuente y ningún `TODO(verify)`. Todo el contenido es un placeholder.
- `data/README.md`: cómo regenerar los datos, qué cubre la consulta, reglas de limpieza y obligaciones de la ODbL.
- El CI lista los archivos de test (reporter `verbose`), incluidos los de `data/`.

### Decisiones

- Las estaciones nunca se fusionan por nombre: solo la huella de un edificio se une a la estación que tiene a
  menos de 30 m. El caso ambiguo (huella a menos de 30 m de dos estaciones) se marca para revisión.
- Las vías no se agrupan en ramales desde los tags de OSM, que se contradicen. La agrupación y la compañía
  histórica vendrán de una capa curada (`data/curated/`) con fuente por dato.
- Toda la geometría (haversine) y las estadísticas viven en `data/`; `/api/stats` solo validará y servirá
  `stats.json`. No se comparte código geométrico con `web/`.
- El dibujo progresivo de vías usará `line-trim-offset` de Mapbox, con un recorrido continuo por capítulo
  precalculado en `data/`. La capa curada es requisito de la Fase 3.
- `trackKm` es la suma de todas las vías mapeadas, no el largo del recorrido: la doble vía cuenta dos veces.
- ESLint 9.x y `@types/node` 22.x (alineado con el mínimo de Node 22): Dependabot ignora las versiones mayores
  de `eslint`, `typescript` y `@types/node`; `CLAUDE.md` registra la evidencia y cuándo sacar la regla.
- Douglas-Peucker queda fuera: con 3.376 vértices (209 KB) no se justifica todavía (#29).

### Deuda conocida

- **Contenido sin verificar**: todos los capítulos son `TODO(verify)` y la cantidad de capítulos es un placeholder.
- **Capa curada pendiente**: sin ella no hay ramales, stats por ramal ni recorridos por capítulo (#24).
- **Vías cortadas en el borde del área**: sigue como pregunta abierta en `CLAUDE.md`.
- **Resumen de la ODbL**: es una lectura del proyecto, no una revisión legal.
- **`line-trim-offset`**: falta confirmar si exige `lineMetrics: true` y si recorta cada LineString por separado (#23).

## [0.1.0] - 2026-11-11

Fase 0 — Setup.

### Agregado

- `CLAUDE.md` con el plan aprobado, las reglas de trabajo y la excepción documentada de `Co-Authored-By`.
- Workspace pnpm con Next.js 16 (App Router), React 19, TypeScript 6.0 en modo `strict` y Tailwind CSS v4.
- ESLint 9 (flat config) y Prettier con orden automático de clases de Tailwind.
- Validación de `NEXT_PUBLIC_MAPBOX_TOKEN` con Zod: un token secreto (`sk.`) o malformado rompe `dev` y `build`;
  un token ausente es un estado válido. Los mensajes de error nunca incluyen el valor recibido.
- Vitest con tests de la validación de entorno y de la política CSP.
- Headers de seguridad: CSP por request con nonce y `strict-dynamic`, `X-Content-Type-Options`,
  `Referrer-Policy`, `Permissions-Policy`, HSTS y `frame-ancestors 'none'`.
- CI en GitHub Actions: formato, lint, typecheck, tests, build, `pnpm audit` y rechazo de tokens `sk.`.
- Escaneo de secretos con gitleaks, Dependabot con enfriamiento de 7 días y plantilla de pull request.
- Licencia MIT.
- `.env.example` y README inicial con cómo usar la IA en el flujo de trabajo.

### Decisiones

- TypeScript 6.0.3 y no 7.x: `typescript-eslint@8.72.2` solo soporta `typescript <6.1.0`.
- ESLint 9 y no 10: los plugins de `eslint-config-next@16.4.6` solo declaran soporte hasta ESLint 9.
  npm marca ESLint 9 como "no longer supported"; hay que revisarlo cuando esos plugins soporten la versión 10.
- Prettier 3.9.10 y no 3.10.0: la 3.10.0 se publicó el mismo día y pnpm la rechazó por su espera mínima de
  publicación. Se mantuvo esa protección en lugar de excluir el paquete.
- CSP con nonce: exige render dinámico de las páginas. La alternativa (SRI) sigue siendo experimental en Next 16.4.

### Deuda conocida

- **ESLint 9 sin soporte**: npm lo marca como "no longer supported". No se puede subir a ESLint 10 mientras
  `eslint-plugin-react`, `-import` y `-jsx-a11y` no lo soporten. Revisar en cada actualización de `eslint-config-next`.
- **`minimatch` (ReDoS, severidad moderada)** en el árbol de ESLint: solo desarrollo, corrige `>=11.0.1` upstream.
  El gate de `pnpm audit` queda en `high` hasta que `typescript-eslint` lo actualice.
- **Costo de la CSP con nonce**: obliga a render dinámico. Se mide con Lighthouse en la Fase 7 y se documenta
  la decisión con números.

[0.1.0]: https://github.com/Kloster96/Ferrocarril-BahiaBlanca/releases/tag/v0.1.0
