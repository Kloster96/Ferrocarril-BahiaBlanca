# Proyecto: "El ferrocarril en Bahía Blanca" — Scrollytelling con mapa

> Este documento es el plan completo y aprobado. Todas las decisiones de abajo ya están tomadas.
> **Tu primera tarea es volcar todo esto en un `CLAUDE.md`** en la raíz del repo, para que no se pierda entre sesiones.

## Contexto

Soy Luciano, desarrollador frontend. Este proyecto es una pieza de portfolio para puestos frontend con
mapas interactivos, visualización de datos y flujo AI-native. Busca demostrar: TypeScript + React + Next.js,
Tailwind con atención obsesiva al detalle visual, micro-interacciones y animaciones, librerías de mapas y de
animación (Framer Motion / GSAP), nociones de Figma, comunicación asíncrona clara, y usar IA **con criterio**:
tengo que poder entender y explicar cada línea que se sube a un PR.

Tu rol es el de un **senior que trabaja en pareja conmigo**, no el de un generador de código.
Construimos de a poco, con PRs chicos, y me explicás las decisiones.

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
bajá a la última compatible **con evidencia** y explicame por qué.

## Estructura del repo (aprobada)

```
/
├─ CLAUDE.md  README.md  CHANGELOG.md  LICENSE  .gitignore  .env.example
├─ pnpm-workspace.yaml
├─ .github/  workflows/ci.yml · dependabot.yml · PULL_REQUEST_TEMPLATE.md
├─ data/                      # extracción, nada de esto va al cliente
│  ├─ scripts/                # Overpass → limpieza → simplificación
│  └─ out/                    # GeoJSON procesado (versionado)
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
   │  ├─ lib/                 # lógica pura testeable (progreso, recorte de líneas, haversine)
   │  └─ components/ui/       # átomos reutilizables
   └─ e2e/                    # Playwright
```

Sin backend separado: los datos son estáticos y versionados; la API son Route Handlers de Next dentro de `web/`.

## Reglas de trabajo

1. **Trabajá por fases** (plan abajo). Al terminar cada fase: **frená**, mostrame un resumen de lo que hiciste,
   las decisiones y sus alternativas, y esperá mi OK antes de seguir.
2. **Código, nombres y commits en inglés. README, CHANGELOG y contenido de la historia en español.**
3. **No inventes hechos históricos.** El contenido de cada capítulo va en un archivo de datos tipado con campos
   `source` y `verified: boolean`. Si no estás seguro de un dato (fechas, nombres de estaciones, empresas
   ferroviarias), dejalo como placeholder `TODO(verify)`. Yo verifico y completo las fuentes.
4. **Explicá lo no obvio.** Comentarios solo donde el código no se explica solo (por qué, no qué). Si escribís algo
   complejo (sincronización scroll ↔ cámara, interpolación de líneas, `setFeatureState`), explicámelo en el resumen.
5. **Nada de dependencias innecesarias.** Antes de agregar un paquete, justificá por qué no alcanza con lo que ya hay
   (por ejemplo: haversine propia y testeada en vez de `@turf/length`).
6. Si algo te bloquea o hay una ambigüedad, preguntá en vez de suponer.
7. **Entorno**: estoy en Windows (PowerShell, Node con nvm-windows). No hay brew; usá herramientas nativas o winget.

## Git y GitHub (cada cambio tiene que quedar registrado)

Mi usuario de GitHub es **Kloster96**. El historial del repo es parte del portfolio.

**Estado actual (ya resuelto):**
- El repo existe y está clonado: `origin` = `https://github.com/Kloster96/Ferrocarril-BahiaBlanca.git`.
- Tiene un "Initial commit" con un README de una línea: podés reemplazarlo.
- Email local ya configurado: `98564734+Kloster96@users.noreply.github.com` (noreply de GitHub, a propósito,
  para no exponer mi email en un repo público). No lo cambies.
- `.atl/` es un registro de skills de mi tooling, con rutas absolutas de mi máquina: va al `.gitignore`, no se commitea.

**Antes de empezar:** verificá con `gh auth status` que esté autenticado. Si no lo está, pedime que corra
`gh auth login` y esperá. **Nunca** me pidas un token ni lo pegues en un archivo o comando.

**Flujo por cada cambio:**
1. Partí de `main` actualizado: `git switch main && git pull`.
2. Rama descriptiva: `feat/scroll-camera-sync`, `fix/popup-focus`, `chore/ci-setup`, etc.
3. **Un commit por cambio lógico**, con Conventional Commits en inglés y, cuando haga falta, un cuerpo con el *por qué*.
4. **Antes de cada commit**: `git status` y `git diff --staged`; confirmá que no entren secretos, `.env*`,
   `node_modules`, builds ni archivos temporales, y que pasen lint, typecheck y tests.
5. Push de la rama y PR con `gh pr create`, plantilla: **Qué / Por qué / Cómo probarlo / Capturas /
   Decisiones y alternativas**. Vinculá el issue (`Closes #N`).
6. **No mergees vos.** Avisame que el PR está listo; yo lo reviso y lo mergeo (squash merge).
   Después borrá la rama local y seguí desde `main`.

**Issues:** al empezar cada fase, creá issues con `gh issue create` por tarea, con criterios de aceptación,
labels (`feature`, `bug`, `chore`, `docs`, `a11y`, `security`) y un milestone por fase.

**Protección de `main`:** después del primer commit de setup, proponeme exigir PR y CI verde, y configuralo si te doy el OK.

**Prohibido sin mi confirmación explícita:** `git push --force` (cualquier variante), `git reset --hard` sobre
trabajo pusheado, reescribir historial de `main`, borrar ramas remotas o el repo, cambiar visibilidad o settings
de seguridad del repo.

**Co-Authored-By:** mantené el trailer de Claude en los commits de **este repo**. Es una excepción deliberada a mi
regla global: muestra de forma verificable que trabajo AI-native con revisión humana. Dejalo escrito en CLAUDE.md
y explicá en el README cómo uso la IA en el flujo de trabajo.

**Releases:** al cerrar cada fase, después de que yo mergee, tag (`v0.1.0` = Fase 0 … `v0.7.0` = Fase 7) y
`gh release create` con el resumen.

**CHANGELOG.md:** formato Keep a Changelog; la entrada de cada fase va dentro del PR de cierre de esa fase.

## Seguridad (tratalo como un proyecto de producción)

- **Sin secretos en el repo.** `.env.local` en `.gitignore`, `.env.example` documentado.
- **Token de Mapbox:**
  - `NEXT_PUBLIC_MAPBOX_TOKEN`, solo tokens públicos (`pk.`). Validado con Zod: si empieza con `sk.`, el build falla.
    Chequeo extra en CI que rechace cualquier `sk.` en el repo.
  - Restricción por URL: **solo `localhost` y el dominio de producción exacto. Nunca `*.vercel.app`**, porque es un
    dominio compartido por todos los usuarios de Vercel y equivale a casi no restringir. Para previews, verificá si
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
  (`api.mapbox.com`, `*.tiles.mapbox.com`, `events.mapbox.com`, `worker-src blob:`, etc.): verificala en la Fase 2
  con las violaciones reales del navegador en vez de abrir dominios por las dudas. Explicame cada directiva.
- **Dependencias**: lockfile commiteado, `pnpm audit` en CI, Dependabot.
- **Escaneo de secretos** en CI (gitleaks).
- **Licencias y atribución**: atribución visible de Mapbox y de OpenStreetMap (ODbL); licencia de GSAP documentada.

## API propia (Route Handlers en `web/src/app/api/`)

- `GET /api/stations`, `/api/lines`, `/api/stats`.
- Esquemas Zod en `web/src/shared/schemas`; tipos con `z.infer`, compartidos entre API y front.
- Formato de error único: `{ error: { code, message } }` con el status HTTP correcto.
- Cache adecuado para datos estáticos (verificá la semántica de caché en la documentación de la versión de Next instalada).
- **El mapa lee de `/api/*` desde la Fase 2**: una sola fuente de verdad, con estados de carga y error reales.
- Stats verificables, calculadas desde el GeoJSON de OSM (km de vía por ramal, estaciones por línea).

## Calidad

- ESLint, Prettier, `tsc --noEmit` y build en CI (GitHub Actions) en cada PR.
- Vitest para la lógica pura (progreso, recorte de líneas, haversine, validación). Playwright E2E básico:
  carga, scroll y cambio de capítulo activo.
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
  Primero que funcione, después que se vea bien.
- **Fase 4 — UI y micro-interacciones**: tarjetas con Motion, indicador de progreso, estados activos, tipografía y
  paleta finales (voy a tener un mockup de Figma para esta fase).
- **Fase 5 — Modo explorar**: liberar el mapa, popups accesibles, leyenda o filtro.
- **Fase 6 — Panel de datos**: panel que consume `/api/stats` con estados de carga, error y vacío; gráfico
  sincronizado con el mapa en ambas direcciones.
- **Fase 7 — Pulido**: reduced motion, mobile, Lighthouse, tests, revisión de seguridad final, README final.

## README final (en español)

Demo, GIF, stack y **por qué** de cada elección, decisiones técnicas y alternativas descartadas, cómo usé la IA
y qué revisé o cambié yo, medidas de seguridad (incluido el manejo del token de Mapbox), accesibilidad, fuentes de
los datos históricos, cómo correrlo localmente (incluido cómo obtener un token propio de Mapbox) y próximos pasos.

---

**Arrancá así:** verificá `gh auth status`; si está bien, creá el `CLAUDE.md` con todo este documento y empezá la
Fase 0. Si no está autenticado, pedime el login y esperá.
