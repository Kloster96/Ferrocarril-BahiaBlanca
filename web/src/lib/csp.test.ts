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

  it("does not open any third-party origin yet", () => {
    expect(prod).not.toMatch(/https?:|\*/);
  });
});

describe("createNonce", () => {
  it("returns a different value on every call", () => {
    expect(createNonce()).not.toEqual(createNonce());
  });
});
