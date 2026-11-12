import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { GET as getCatchAll } from "../app/api/[...slug]/route";
import { GET as getArea } from "../app/api/area/route";
import { GET as getLines } from "../app/api/lines/route";
import { GET as getRoutes } from "../app/api/routes/route";
import { GET as getStations } from "../app/api/stations/route";
import { GET as getStats } from "../app/api/stats/route";
import { apiError } from "./api-error";
import { loadLines } from "./data";

describe("apiError", () => {
  it("uses the single error shape with the given status", async () => {
    const response = apiError("nope", "No.", 418);
    expect(response.status).toBe(418);
    expect(await response.json()).toEqual({ error: { code: "nope", message: "No." } });
  });
});

describe("loaders", () => {
  it("fail the build, naming the file and the problem, when the data is invalid", async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "data-out-"));
    await writeFile(path.join(dir, "lines.geojson"), JSON.stringify({ type: "FeatureCollection" }));
    await expect(loadLines(dir)).rejects.toThrow(/data\/out\/lines\.geojson does not match/);
  });
});

describe("route handlers", () => {
  it("serve the validated data", async () => {
    const lines = await (await getLines()).json();
    expect(lines.type).toBe("FeatureCollection");
    expect(lines.features.length).toBeGreaterThan(0);
    expect((await (await getStations()).json()).features.length).toBeGreaterThan(0);
    const routes = await (await getRoutes()).json();
    expect(routes.features.length).toBeGreaterThan(0);
    expect(routes.features[0].properties.camera.zoom).toBeGreaterThan(0);
    const area = await (await getArea()).json();
    expect(area.features.map((f: { properties: { kind: string } }) => f.properties.kind)).toEqual([
      "area",
      "mask",
    ]);
    expect((await (await getStats()).json()).lines.total.count).toBe(lines.features.length);
  });

  it("answer an unknown /api route in the error format, with 404", async () => {
    const response = getCatchAll();
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({
      error: { code: "not_found", message: "This API route does not exist." },
    });
  });
});
