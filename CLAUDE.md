# Proyecto: "El ferrocarril en Bahía Blanca" — Scrollytelling con mapa

> Plan completo y aprobado. Todas las decisiones de abajo ya están tomadas.
> Fuente original: `docs/PLAN.md`. Este archivo existe para que el plan no se pierda entre sesiones.

## Contexto

Luciano es desarrollador frontend. Este proyecto es una pieza de portfolio para puestos frontend con
mapas interactivos, visualización de datos y flujo AI-native. Busca demostrar: TypeScript + React + Next.js,
Tailwind con atención obsesiva al detalle visual, micro-interacciones y animaciones, librerías de mapas y de
animación (Framer Motion / GSAP), nociones de Figma, comunicación asíncrona clara, y usar IA **con criterio**:
tiene que poder entender y explicar cada línea que se sube a un PR.

El rol de Claude es el de un **senior que trabaja en pareja con Luciano**, no el de un generador de código.
Se construye de a poco, con PRs chicos, y se explican las decisiones.

## El producto

Una historia que avanza con el scroll sobre el ferrocarril en Bahía Blanca:

1. **Hero**: título, bajada y una indicación sutil de scroll.
2. **Capítulos (scrollytelling)**: el mapa queda fijo (sticky) de fondo. Cada capítulo es una tarjeta de texto.
   Al avanzar, el mapa hace `flyTo` a la estación/zona del capítulo y **dibuja progresivamente las vías**
   ligado al progreso del scroll (scrub), no como animación disparada.
3. **Modo explorar**: al final, el mapa se libera (pan/zoom), se muestran todas las estaciones y las vías,
   y cada estación tiene un popup con información.
4. **Panel de datos**: dentro del modo explorar, un panel con un gráfico sincronizado con el mapa
   (hover en el gráfico resalta en el mapa y viceversa).

En desktop, el texto va en una columna lateral sobre el mapa. En mobile, las tarjetas van superpuestas abajo
y el mapa ocupa toda la pantalla.

## Stack (verificá la última versión estable en npm antes de instalar)

- Next.js (App Router) + TypeScript en modo `strict`
- Tailwind CSS (v4, configuración por CSS)
- **Mapbox GL JS** (licencia propietaria de Mapbox, requiere token público; documentarlo en el README)
- GSAP + ScrollTrigger → **solo** para lo que esté atado al scroll (cámara del mapa, dibujo de vías)
- Motion (paquete `motion`, ex Framer Motion) → **solo** para UI: tarjetas, popups, transiciones, hover/tap
- Zod para validar datos y variables de entorno
- Recharts para el gráfico (se confirma al llegar a la fase del panel)
- Vitest + Playwright para tests
- ESLint + Prettier (con `prettier-plugin-tailwindcss`)
- Gestor de paquetes: **pnpm** (workspace)
- Deploy: Vercel

Si una versión muy nueva (por ejemplo de TypeScript o ESLint) no es compatible con Next o typescript-eslint,
bajá a la última compatible **con evidencia** y explicá por qué.

### Decisiones de versión (con evidencia, verificadas el 2026-11-11)

- **TypeScript 6.0.x, no 7.x**: `typescript-eslint@8.72.2` declara el peer `typescript: ">=4.8.4 <6.1.0"`.
  `latest` de `typescript` en npm es 7.0.2, que queda fuera del rango.
- **ESLint 9.x, no 10.x**: `eslint-config-next@16.4.6` depende de `eslint-plugin-react@7.37.5`,
  `eslint-plugin-import@2.32.0` y `eslint-plugin-jsx-a11y@6.10.2`, cuyos peers de `eslint` llegan hasta `^9`.
  ESLint 10 queda fuera del rango.
- **`@types/node` 22.x, no 26.x**: el proyecto declara `engines.node >=22` y el CI corre Node 22. Los tipos de una
  versión mayor pueden declarar APIs que Node 22 no tiene, y el compilador no lo avisaría. La versión de
  `@types/node` acompaña a la versión mínima de Node.
- **Dependabot ignora las versiones mayores de `eslint`, `typescript` y `@types/node`** (`.github/dependabot.yml`),
  porque esas tres quedaron fuera de lo soportado por las razones de arriba. Ignorar la mayor no es olvidarla:
  revisar los puntos cuando salgan versiones nuevas de `eslint-plugin-react`, `-import`, `-jsx-a11y` y
  `typescript-eslint`, o cuando se suba el mínimo de Node, y recién ahí sacar la regla `ignore`.

## Estructura del repo (aprobada)

```
/
├─ CLAUDE.md  README.md  CHANGELOG.md  LICENSE  .gitignore  .env.example
├─ pnpm-workspace.yaml
├─ .github/  workflows/ci.yml · dependabot.yml · PULL_REQUEST_TEMPLATE.md
├─ data/                      # extracción, nada de esto va al cliente
│  ├─ scripts/                # Overpass → limpieza → simplificación → stats; toda la geometría (haversine, Douglas-Peucker) y sus tests
│  ├─ curated/                # capa curada a mano (ramales, compañía histórica); cada dato con fuente e IDs de OSM
│  └─ out/                    # GeoJSON procesado y stats.json (versionados)
└─ web/
   ├─ next.config.ts          # headers de seguridad / CSP
   ├─ src/
   │  ├─ app/                 # layout, page, globals.css, api/ (Route Handlers)
   │  ├─ features/
   │  │  ├─ story/            # capítulos, ScrollTrigger, tarjetas
   │  │  ├─ map/              # Mapbox (client-only), capas, popups
   │  │  └─ dashboard/        # panel de datos y gráfico
   │  ├─ content/             # chapters.ts (source, verified, TODO(verify))
   │  ├─ shared/schemas/      # esquemas Zod; tipos con z.infer, compartidos entre API y front
   │  ├─ lib/                 # lógica pura testeable (progreso; sin geometría de datos ni recorte de líneas, ver "Decisiones de diseño")
   │  ├─ server/              # lectura y validación de data/out (solo servidor, se resuelve en el build)
   │  └─ components/ui/       # átomos reutilizables
   └─ e2e/                    # Playwright
```

Sin backend separado: los datos son estáticos y versionados; la API son Route Handlers de Next dentro de `web/`.

## Reglas de trabajo

1. **Trabajá por fases** (plan abajo). Al terminar cada fase: **frená**, mostrá un resumen de lo que hiciste,
   las decisiones y sus alternativas, y esperá el OK antes de seguir.
2. **Código, nombres y commits en inglés. README, CHANGELOG y contenido de la historia en español.**
3. **No inventes hechos históricos.** El contenido de cada capítulo va en un archivo de datos tipado con campos
   `source` y `verified: boolean`. Si no estás seguro de un dato (fechas, nombres de estaciones, empresas
   ferroviarias), dejalo como placeholder `TODO(verify)`. Luciano verifica y completa las fuentes.
4. **Explicá lo no obvio.** Comentarios solo donde el código no se explica solo (por qué, no qué). Si escribís algo
   complejo (sincronización scroll ↔ cámara, interpolación de líneas, `setFeatureState`), explicalo en el resumen.
5. **Nada de dependencias innecesarias.** Antes de agregar un paquete, justificá por qué no alcanza con lo que ya hay
   (por ejemplo: haversine propia y testeada, en `data/scripts/`, en vez de `@turf/length`).
6. Si algo te bloquea o hay una ambigüedad, preguntá en vez de suponer.
7. **Entorno**: Windows (PowerShell, Node con nvm-windows). No hay brew; usá herramientas nativas o winget.

## Git y GitHub (cada cambio tiene que quedar registrado)

El usuario de GitHub es **Kloster96**. El historial del repo es parte del portfolio.

**Estado base:**

- `origin` = `https://github.com/Kloster96/Ferrocarril-BahiaBlanca.git` (repo público).
- Email local configurado: `98564734+Kloster96@users.noreply.github.com` (noreply de GitHub, a propósito,
  para no exponer el email personal en un repo público). No lo cambies.
- `.atl/` es un registro de skills del tooling, con rutas absolutas de la máquina: va al `.gitignore`, no se commitea.

**Antes de empezar cualquier sesión:** verificá con `gh auth status` que esté autenticado. Si no lo está, pedí que
corra `gh auth login` y esperá. **Nunca** pidas un token ni lo pegues en un archivo o comando.

**Flujo por cada cambio:**

1. Partí de `main` actualizado: `git switch main && git pull`.
2. Rama descriptiva: `feat/scroll-camera-sync`, `fix/popup-focus`, `chore/ci-setup`, etc.
3. **Un commit por cambio lógico**, con Conventional Commits en inglés y, cuando haga falta, un cuerpo con el _por qué_.
4. **Antes de cada commit**: `git status` y `git diff --staged`; confirmá que no entren secretos, `.env*`,
   `node_modules`, builds ni archivos temporales, y que pasen lint, typecheck y tests.
   **Antes de cada push**: `pnpm check` (formato, lint, typecheck, tests y build, en el mismo orden que el CI,
   que corre ese mismo script). Si falla en local, va a fallar en el CI.
5. Push de la rama y PR con `gh pr create`, plantilla: **Qué / Por qué / Cómo probarlo / Capturas /
   Decisiones y alternativas**. Vinculá el issue (`Closes #N`).
6. **No mergees vos.** Avisá que el PR está listo; Luciano lo revisa y lo mergea (squash merge).
   Después borrá la rama local y seguí desde `main`.

**Issues:** al empezar cada fase, creá issues con `gh issue create` por tarea, con criterios de aceptación,
labels (`feature`, `bug`, `chore`, `docs`, `a11y`, `security`) y un milestone por fase.

**Protección de `main`:** después del primer commit de setup, proponer exigir PR y CI verde, y configurarlo solo con el OK.

**Force-push:** `git push --force-with-lease` está permitido **solo en ramas de PR**, como parte de un rebase que
Luciano pidió. Nunca en `main`, y cualquier otro force-push requiere confirmación explícita.

**Prohibido sin confirmación explícita:** `git push --force` (cualquier variante, salvo la excepción de arriba), `git reset --hard` sobre
trabajo pusheado, reescribir historial de `main`, borrar ramas remotas o el repo, cambiar visibilidad o settings
de seguridad del repo.

**Co-Authored-By (excepción a la regla global):** en los commits de **este repo** se mantiene el trailer
`Co-Authored-By` de Claude. Es una excepción deliberada a la regla global de Luciano ("nunca agregar
Co-Authored-By ni atribución de IA"): muestra de forma verificable que trabaja AI-native con revisión humana.
Esta regla de proyecto prevalece sobre la global solo dentro de este repo. El README explica cómo se usa la IA
en el flujo de trabajo.

**Releases:** al cerrar cada fase, después de que Luciano mergee, tag (`v0.1.0` = Fase 0 … `v0.7.0` = Fase 7) y
`gh release create` con el resumen.

**CHANGELOG.md:** formato Keep a Changelog; la entrada de cada fase va dentro del PR de cierre de esa fase.

## Seguridad (tratalo como un proyecto de producción)

- **Sin secretos en el repo.** `.env.local` en `.gitignore`, `.env.example` documentado.
- **Token de Mapbox:**
  - `NEXT_PUBLIC_MAPBOX_TOKEN`, solo tokens públicos (`pk.`). Validado con Zod: si empieza con `sk.`, el build falla.
    Chequeo extra en CI que rechace cualquier `sk.` en el repo.
  - Restricción por URL: **solo `localhost` y el dominio de producción exacto. Nunca `*.vercel.app`**, porque es un
    dominio compartido por todos los usuarios de Vercel y equivale a casi no restringir. Para previews, verificar si
    Mapbox acepta un patrón específico del proyecto; si no, las previews muestran el estado "falta token".
  - Recomendado: un token para desarrollo y otro para producción. Todo documentado en el README.
  - Si falta el token, la app muestra un estado de error claro, sin romperse.
- **Datos estáticos, no consultas externas en runtime**: vías y estaciones se descargan una vez (OSM/Overpass)
  con un script en `data/scripts/`, se limpian, se simplifican y se versionan como GeoJSON.
- **Validá los datos** con Zod (GeoJSON y capítulos). Datos inválidos rompen el build, no la UI en producción.
- **Nada de HTML crudo**: ni `dangerouslySetInnerHTML` ni `Popup.setHTML`. Popups con componentes React (portal)
  o `setDOMContent` con nodos creados de forma segura.
- **Headers de seguridad** en `next.config`: CSP estricta, `X-Content-Type-Options`, `Referrer-Policy`,
  `Permissions-Policy`, `frame-ancestors 'none'`. La CSP de Mapbox es una hipótesis inicial
  (`api.mapbox.com`, `*.tiles.mapbox.com`, `events.mapbox.com`, `worker-src blob:`, etc.): verificarla en la Fase 2
  con las violaciones reales del navegador en vez de abrir dominios por las dudas. Explicar cada directiva.
- **Dependencias**: lockfile commiteado, `pnpm audit` en CI, Dependabot.
- **Escaneo de secretos** en CI (gitleaks).
- **Licencias y atribución**: atribución visible de Mapbox y de OpenStreetMap (ODbL); licencia de GSAP documentada.

## API propia (Route Handlers en `web/src/app/api/`)

- `GET /api/stations`, `/api/lines`, `/api/stats`.
- Esquemas Zod en `web/src/shared/schemas`; tipos con `z.infer`, compartidos entre API y front.
- Formato de error único: `{ error: { code, message } }` con el status HTTP correcto.
- Cache adecuado para datos estáticos (verificar la semántica de caché en la documentación de la versión de Next instalada).
- **El mapa lee de `/api/*` desde la Fase 2**: una sola fuente de verdad, con estados de carga y error reales.
- Stats verificables, calculadas desde el GeoJSON de OSM (km de vía por ramal, estaciones por línea) **en `data/`**
  y escritas en `data/out/stats.json`. `/api/stats` solo las valida con Zod y las sirve: no calcula nada.
  Si algo parece necesitar cálculo geométrico en runtime, frená y discutilo antes de implementarlo.

## Calidad

- ESLint, Prettier, `tsc --noEmit` y build en CI (GitHub Actions) en cada PR.
- Vitest para la lógica pura: en `web/` (progreso, validación) y en `data/` (haversine,
  Douglas-Peucker, limpieza, stats). Playwright E2E básico: carga, scroll y cambio de capítulo activo.
- **Accesibilidad**: `prefers-reduced-motion` (sin flyTo ni scrub: saltos directos y fades), contenido legible sin
  el mapa, foco visible, contraste AA, `aria-label` en el mapa, el texto como fuente principal de información.
- **Performance**: mapa con import dinámico y sin SSR, GeoJSON simplificado, resaltado con `setFeatureState`
  (sin re-render de React por hover). Objetivo: Lighthouse ≥ 90 en mobile, sin layout shift, scroll a 60 fps.
  Limpiar listeners, ScrollTriggers e instancias del mapa al desmontar (ojo con el doble montaje de Strict Mode).
- **Estados**: carga del mapa (skeleton), error de tiles, falta de token, WebGL no disponible.

## Plan por fases (aprobado)

- **Fase 0 — Setup**: CLAUDE.md, workspace pnpm, Next + TS strict + Tailwind en `web/`, lint/format, CI,
  Dependabot, gitleaks, plantilla de PR, headers de seguridad, `.env.example` y validación de env, CHANGELOG,
  README inicial, `.atl/` en `.gitignore`.
- **Fase 1 — Datos**: script de extracción desde OSM en `data/scripts/`, limpieza, simplificación, esquemas Zod.
  Capítulos con placeholders `TODO(verify)`.
- **Fase 2 — Mapa base + API**: Route Handlers, componente Mapbox client-only que lee de `/api/*`, estilo sobrio,
  capas de vías y estaciones, atribuciones, verificación real de la CSP.
- **Fase 3 — Scrollytelling**: layout sticky, ScrollTrigger por capítulo, flyTo sincronizado, dibujo de vías con scrub.
  Primero que funcione, después que se vea bien. **Requisito previo: la capa curada (`data/curated/`) con el
  recorrido de cada capítulo**; sin ella no hay línea continua que dibujar.
- **Fase 4 — UI y micro-interacciones**: tarjetas con Motion, indicador de progreso, estados activos, tipografía y
  paleta finales (habrá un mockup de Figma para esta fase).
- **Fase 5 — Modo explorar**: liberar el mapa, popups accesibles, leyenda o filtro.
- **Fase 6 — Panel de datos**: panel que consume `/api/stats` con estados de carga, error y vacío; gráfico
  sincronizado con el mapa en ambas direcciones.
- **Fase 7 — Pulido**: reduced motion, mobile, Lighthouse, tests, revisión de seguridad final, README final.
  Incluye medir con Lighthouse el costo real del render dinámico que impone la CSP con nonce y documentar
  la decisión con números (mantener nonce vs. SRI experimental).

## Decisiones de diseño

- **Ramales y compañía histórica vienen de una capa curada, no de los tags de OSM (decisión de Luciano)**: la
  limpieza NO agrupa las vías en ramales (141 de 313 vías no tienen `description` ni `ref`, y los que sí tienen se
  contradicen: `R-26` figura como "Ingeniero White" y como "Ramal Empalme Grünbein - Bahía Blanca"; además
  `description` mezcla nombres de ramal con nombres de compañía). Agrupar automáticamente sería adivinar.
  La agrupación y la compañía histórica van a vivir en `data/curated/`, con **fuente por dato** y referenciando
  **IDs de OSM**. Se implementa cuando Luciano tenga la investigación; hasta entonces se conservan `ref`,
  `description`, `operator` y `network` tal cual vienen de OSM.
- **Toda la geometría vive en `data/`, nada se comparte con `web/` (decisión de Luciano)**: haversine y
  Douglas-Peucker se implementan y testean en `data/scripts/`. Las stats se calculan ahí y se escriben en
  `data/out/stats.json`; `/api/stats` solo las valida con Zod y las sirve. Evitar la necesidad de código
  geométrico compartido, no resolverla. Si algo exige calcularse en runtime: frenar y discutir.
- **Dibujo progresivo de vías con `line-trim-offset` de Mapbox, sin código de recorte propio en `web/`
  (decisión de Luciano)**: la source GeoJSON de las vías va con `lineMetrics: true` y el scrub de GSAP actualiza
  `line-trim-offset`. Esa propiedad recorta cada LineString por separado: con segmentos sueltos, todos se
  dibujarían a la vez. Por eso cada capítulo necesita **un recorrido continuo** (segmentos unidos y ordenados en
  una sola línea). Ese merge se **precalcula en `data/`** a partir de la capa curada (qué IDs de OSM forman el
  recorrido de cada capítulo) y se escribe en `data/out/`. **La capa curada es requisito de la Fase 3.**
- **Las vías cortadas en el borde del área se leen como el límite de la historia, con una máscara (decisión de
  Luciano, #47)**: lo que queda fuera de los partidos de Bahía Blanca y Coronel Rosales se desatura y oscurece con un
  borde suave. La capa va **encima de las vías y debajo de las estaciones** (si fuera debajo, no atenuaría los
  tramos que salen del área). El polígono sale de las relaciones OSM 2582799 y 2584648, se precalcula en `data/`
  (`pnpm data:extract-area` + `pnpm data:area`, simplificado con Douglas-Peucker a 50 m: sin eso pesa 1,4 MB) y se
  sirve por `/api/area`, validado con Zod. Los colores son provisorios: la paleta final se define en la Fase 4.
  - **Verificado (issue #23, `mapbox-gl` 3.34.2, 2026-11-12)** con una página de prueba en Chromium: dos
    LineStrings del mismo largo y un conteo de píxeles visibles de cada una.
    - `lineMetrics: true` **es obligatorio**: sin él, Mapbox rechaza la capa con un error explícito
      (`line-trim-offset requires the GeoJSON source to have lineMetrics enabled`).
    - **Recorta cada LineString por separado**: con `[0.5, 1]` las dos muestran 50 %, con `[0.8, 1]` las dos 80 %.
    - **`[inicio, fin]` es la parte oculta**, no la visible: `[0, 1]` oculta todo y `[0.8, 1]` deja ver el primer
      80 %. Para dibujar de a poco desde el inicio del recorrido, el offset es `[progreso, 1]`.
    - Es una propiedad de la **capa** y no admite datos por feature: un solo valor afecta a todas las líneas de la
      capa a la vez. **Una capa por recorrido de capítulo**, no una capa única con todos los recorridos.
    - La dirección de dibujo es la de las coordenadas: el merge de `data/` tiene que dejar cada recorrido
      orientado en el sentido de la historia.
    - Límites de la doc: `feature-state` y expresiones de datos no figuran como soportados para esta propiedad,
      y `line-trim-color` y `line-trim-fade-range` son experimentales (3.6.0+).

- **Cada capítulo declara qué hace el mapa: cuatro tipos (decisión de Luciano, #75)**: `route` (vuela al recorrido y lo
  dibuja con el scroll; es el único tipo que usa `line-trim-offset`, #60), `zone` (vuela a un lugar y resalta sus
  estaciones), `network` (vista general del área) y `status` (vista general que atenúa todo salvo las vías y
  estaciones del estado elegido). Los recorridos ya dibujados quedan **atenuados** en `zone` y `network`, y
  **ocultos** en `status`. Un recorrido curado solo puede existir para un capítulo `route` (lo valida un test).
  **La asignación de tipos sigue lo que el mapa puede mostrar hoy, no la historia, y la corrige Luciano cuando
  tenga la investigación. La del capítulo 3 ("Las compañías que competían") es PROVISORIA**: hoy es `network`;
  probablemente pase a resaltar las estaciones de compañías distintas, y eso necesita la capa curada con la
  compañía por vía o estación (`data/curated/`), que todavía no existe. No inventar compañías en el medio.

## Preguntas abiertas

_(ninguna por ahora)_

## README final (en español)

Demo, GIF, stack y **por qué** de cada elección, decisiones técnicas y alternativas descartadas, cómo se usó la IA
y qué revisó o cambió Luciano, medidas de seguridad (incluido el manejo del token de Mapbox), accesibilidad, fuentes de
los datos históricos, cómo correrlo localmente (incluido cómo obtener un token propio de Mapbox) y próximos pasos.
