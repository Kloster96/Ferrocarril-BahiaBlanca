import { describe, expect, it } from "vitest";
import { buildCsp, createNonce } from "./csp";

describe("buildCsp", () => {
  const prod = buildCsp({ nonce: "abc123", isDev: false });
  const dev = buildCsp({ nonce: "abc123", isDev: true });

  it("embeds the nonce in script-src and style-src", () => {
    expect(prod).toContain("script-src 'self' 'nonce-abc123' 'strict-dynamic'");
    expect(prod).toContain("style-src 'self' 'nonce-abc123'");
  });

  it("never allows unsafe-eval or unsafe-inline in production", () => {
    expect(prod).not.toContain("unsafe-eval");
    expect(prod).not.toContain("unsafe-inline");
  });

  it("allows unsafe-eval and unsafe-inline styles only in development", () => {
    expect(dev).toContain("'unsafe-eval'");
    expect(dev).toContain("style-src 'self' 'unsafe-inline'");
  });

  it("forbids framing, plugins and base-tag injection", () => {
    expect(prod).toContain("frame-ancestors 'none'");
    expect(prod).toContain("object-src 'none'");
    expect(prod).toContain("base-uri 'self'");
  });

  it("opens only the Mapbox origins the browser reported, and no wildcard", () => {
    // Measured in Chromium and Firefox (issue #45): these two were the only violations.
    const origins = prod.match(/https?:\/\/[^\s;]+/g) ?? [];
    expect(origins.sort()).toEqual(["https://api.mapbox.com", "https://events.mapbox.com"]);
    expect(prod).not.toContain("*");
  });

  it("scopes those origins to connect-src only", () => {
    const connect = prod.split("; ").find((d) => d.startsWith("connect-src"));
    expect(connect).toBe("connect-src 'self' https://api.mapbox.com https://events.mapbox.com");
  });
});

describe("createNonce", () => {
  it("returns a different value on every call", () => {
    expect(createNonce()).not.toEqual(createNonce());
  });
});
