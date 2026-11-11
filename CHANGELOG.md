# Changelog

Todos los cambios relevantes de este proyecto se documentan en este archivo.

El formato sigue [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) y el proyecto usa
[versionado semántico](https://semver.org/lang/es/). Cada fase cierra con una versión: `v0.1.0` = Fase 0 … `v0.7.0` = Fase 7.

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
- `.env.example` y README inicial con cómo usar la IA en el flujo de trabajo.

### Decisiones

- TypeScript 6.0.3 y no 7.x: `typescript-eslint@8.72.2` solo soporta `typescript <6.1.0`.
- ESLint 9 y no 10: los plugins de `eslint-config-next@16.4.6` solo declaran soporte hasta ESLint 9.
  npm marca ESLint 9 como "no longer supported"; hay que revisarlo cuando esos plugins soporten la versión 10.
- Prettier 3.9.10 y no 3.10.0: la 3.10.0 se publicó el mismo día y pnpm la rechazó por su espera mínima de
  publicación. Se mantuvo esa protección en lugar de excluir el paquete.
- CSP con nonce: exige render dinámico de las páginas. La alternativa (SRI) sigue siendo experimental en Next 16.4.

### Conocido

- Advisory moderado de `minimatch` (ReDoS) en el árbol de ESLint: solo desarrollo, corrige `>=11.0.1` upstream.

[0.1.0]: https://github.com/Kloster96/Ferrocarril-BahiaBlanca/releases/tag/v0.1.0
