type CspOptions = {
  nonce: string;
  isDev: boolean;
};

/**
 * Builds the Content-Security-Policy for one request.
 *
 * Phase 0 baseline: nothing third-party is allowed. Mapbox domains are NOT listed yet on purpose;
 * they get added in Phase 2 only for the violations the browser actually reports.
 */
export function buildCsp({ nonce, isDev }: CspOptions): string {
  const directives = [
    // Anything not covered below falls back to same-origin only.
    "default-src 'self'",
    // 'strict-dynamic' trusts scripts loaded by a nonced script, so we need no host allow-list.
    // 'unsafe-eval' is dev-only: React uses eval to rebuild stack traces and never needs it in production.
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""}`,
    // Dev-only 'unsafe-inline': the HMR overlay injects styles without a nonce.
    `style-src 'self' ${isDev ? "'unsafe-inline'" : `'nonce-${nonce}'`}`,
    "img-src 'self' blob: data:",
    "font-src 'self'",
    // Blocks <object>/<embed>/<applet>, a classic script-injection vector.
    "object-src 'none'",
    // Stops an injected <base> tag from redirecting every relative URL.
    "base-uri 'self'",
    "form-action 'self'",
    // Clickjacking protection. Supersedes X-Frame-Options in every current browser.
    "frame-ancestors 'none'",
    "upgrade-insecure-requests",
  ];

  return directives.join("; ");
}

export function createNonce(): string {
  return btoa(crypto.randomUUID());
}
