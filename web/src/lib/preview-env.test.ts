import { afterEach, describe, expect, it, vi } from "vitest";

// The module acts on import, so each case resets the module registry and re-imports it.
async function run(vercelEnv: string | undefined) {
  vi.resetModules();
  vi.stubEnv("NEXT_PUBLIC_MAPBOX_TOKEN", "pk.aaa.bbb");
  if (vercelEnv === undefined) vi.stubEnv("VERCEL_ENV", "");
  else vi.stubEnv("VERCEL_ENV", vercelEnv);
  await import("./preview-env");
  return process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
}

afterEach(() => vi.unstubAllEnvs());

describe("preview-env", () => {
  it("drops the Mapbox token in Vercel previews", async () => {
    expect(await run("preview")).toBeUndefined();
  });

  it("keeps it in production, in development and outside Vercel", async () => {
    expect(await run("production")).toBe("pk.aaa.bbb");
    expect(await run("development")).toBe("pk.aaa.bbb");
    expect(await run(undefined)).toBe("pk.aaa.bbb");
  });
});
