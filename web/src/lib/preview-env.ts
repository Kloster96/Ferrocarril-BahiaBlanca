// Imported first by next.config.ts, for its side effect.
//
// Vercel preview URLs (`project-<hash>-team.vercel.app`) cannot be allow-listed in a Mapbox token: URL
// restrictions accept no wildcards. So previews run WITHOUT a token and show the "missing token" state
// (CLAUDE.md, "Seguridad"). Dropping the variable here makes that true even if it was added to Vercel for
// "All environments" by mistake: it never reaches the preview bundle, which Next builds from process.env.
if (process.env.VERCEL_ENV === "preview") {
  delete process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
}

// Makes this file a module for TypeScript; there is nothing to export.
export {};
