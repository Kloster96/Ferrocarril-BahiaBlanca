# El ferrocarril en Bahía Blanca

Una historia con scroll sobre el ferrocarril en Bahía Blanca: un mapa interactivo (Mapbox) que acompaña cada
capítulo, dibuja las vías a medida que avanzás y, al final, se libera para explorar estaciones y datos.

> **Estado:** en construcción (Fase 2 cerrada: mapa base con vías y estaciones). Se trabaja por fases; el plan
> completo está en [`CLAUDE.md`](./CLAUDE.md).

## Stack

| Tecnología                   | Para qué                                          |
| ---------------------------- | ------------------------------------------------- |
| Next.js (App Router) + React | App y Route Handlers (`/api/*`)                   |
| TypeScript (`strict`)        | Tipado; los tipos salen de los esquemas Zod       |
| Tailwind CSS v4              | Estilos, configuración por CSS                    |
| Mapbox GL JS                 | Mapa interactivo                                  |
| GSAP + ScrollTrigger         | Solo lo atado al scroll (cámara del mapa, dibujo) |
| Motion                       | Solo UI (tarjetas, popups, hover/tap)             |
| Zod                          | Validación de datos y variables de entorno        |
| Vitest + Playwright          | Tests unitarios y E2E                             |
| pnpm                         | Gestor de paquetes (workspace)                    |

El _por qué_ de cada elección y las alternativas descartadas se documentan en el README final.

## Requisitos

- Node.js 22 o superior
- pnpm
- Un token **público** de Mapbox (`pk.…`)

## Correrlo localmente

```bash
pnpm install
cp .env.example web/.env.local   # en PowerShell: Copy-Item .env.example web/.env.local
# editá web/.env.local y pegá tu token público de Mapbox
pnpm dev
```

### Token de Mapbox

1. Creá una cuenta en [mapbox.com](https://www.mapbox.com) y generá un token **público** (empieza con `pk.`).
2. Restringilo por URL a `http://localhost:3000` (desarrollo) y al dominio exacto de producción.
   **Nunca** uses `*.vercel.app`: es un dominio compartido y casi no restringe nada.
3. Recomendado: un token para desarrollo y otro para producción.
4. Nunca uses un token secreto (`sk.…`): la validación del entorno hace fallar el build y el CI lo rechaza.

Si falta el token, la app muestra un estado de error claro en lugar de romperse.

## Antes de hacer un push

`pnpm check` corre formato, lint, typecheck, tests y build, en el mismo orden que el CI (que usa ese mismo script).

## Seguridad

- Sin secretos en el repo: `.env*` ignorado, `.env.example` documentado y gitleaks en CI.
- CSP estricta con nonce por request, más `nosniff`, `Referrer-Policy`, `Permissions-Policy` y HSTS.
  Los orígenes de Mapbox se abrieron solo después de medir las violaciones reales del navegador:
  `api.mapbox.com` y `events.mapbox.com`, únicamente en `connect-src`, sin comodines. Verificado en Chromium y
  Firefox, en desarrollo y en producción (cero violaciones). Safari queda por verificar (#45).
- Dependencias con lockfile, `pnpm audit` en CI y Dependabot.

## Cómo uso la IA en este proyecto

Este proyecto se construye con un flujo AI-native, con revisión humana de cada cambio:

- **Claude Code trabaja como par senior**, no como generador: propone, explica las decisiones y sus alternativas
  y espera mi OK al cerrar cada fase.
- **Cada cambio es un PR chico** vinculado a un issue, con la plantilla Qué / Por qué / Cómo probarlo / Capturas /
  Decisiones y alternativas.
- **Yo reviso y mergeo**; la IA no mergea. Tengo que poder explicar cada línea que entra.
- **Los commits llevan el trailer `Co-Authored-By`** de Claude a propósito: deja constancia verificable en el
  historial de qué trabajo se hizo con asistencia.
- **Los hechos históricos no se inventan.** El contenido de cada capítulo tiene campos `source` y `verified`;
  lo dudoso queda como `TODO(verify)` hasta que yo lo confirme con fuentes.
- **Las versiones se justifican con evidencia.** Ejemplo: TypeScript 6.0 y ESLint 9 en lugar de las últimas
  mayores, porque `typescript-eslint` y los plugins de `eslint-config-next` todavía no las soportan.

## Licencia

[MIT](./LICENSE) © 2026 Luciano Kloster. Las dependencias conservan sus propias licencias
(Mapbox GL JS es propietaria y GSAP tiene la suya; se documentan cuando se incorporan).

## Atribuciones

- Mapas: © [Mapbox](https://www.mapbox.com/about/maps/)
- Datos: © [OpenStreetMap](https://www.openstreetmap.org/copyright) contributors (ODbL)
