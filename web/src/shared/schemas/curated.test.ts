import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { chapters } from "../../content/chapters";
import { curatedRouteSchema, curatedRoutesSchema } from "./curated";
import { linesCollectionSchema } from "./line";

const readOut = (path: string): unknown =>
  JSON.parse(readFileSync(new URL(`../../../../data/${path}`, import.meta.url), "utf8"));

const route = {
  chapterId: "chapter-1",
  label: "TODO(verify): recorrido",
  source: null,
  verified: false,
  wayIds: ["way/1", "way/2"],
};

describe("curatedRouteSchema", () => {
  it("accepts an unverified route with pending markers", () => {
    expect(curatedRouteSchema.safeParse(route).success).toBe(true);
  });

  it("refuses verified without a source, or verified with TODO(verify)", () => {
    expect(curatedRouteSchema.safeParse({ ...route, verified: true }).success).toBe(false);
    expect(
      curatedRouteSchema.safeParse({ ...route, verified: true, source: "Libro X" }).success,
    ).toBe(false);
    expect(
      curatedRouteSchema.safeParse({
        ...route,
        verified: true,
        source: "Libro X",
        label: "Recorrido",
      }).success,
    ).toBe(true);
  });

  it("refuses duplicated ways, non-way elements and empty routes", () => {
    expect(curatedRouteSchema.safeParse({ ...route, wayIds: ["way/1", "way/1"] }).success).toBe(
      false,
    );
    expect(curatedRouteSchema.safeParse({ ...route, wayIds: ["node/1"] }).success).toBe(false);
    expect(curatedRouteSchema.safeParse({ ...route, wayIds: [] }).success).toBe(false);
  });

  it("refuses two routes for the same chapter", () => {
    expect(curatedRoutesSchema.safeParse({ routes: [route, route] }).success).toBe(false);
  });
});

describe("data/curated/routes.json", () => {
  const parsed = curatedRoutesSchema.safeParse(readOut("curated/routes.json"));

  it("validates against the schema", () => {
    expect(parsed.error?.issues.slice(0, 5) ?? []).toEqual([]);
  });

  it("only uses OSM ways that exist in data/out/lines.geojson", () => {
    const known = new Set(
      linesCollectionSchema
        .parse(readOut("out/lines.geojson"))
        .features.map((f) => f.properties.id),
    );
    const missing = parsed.data?.routes.flatMap((r) =>
      r.wayIds.filter((id) => !known.has(id)).map((id) => `${r.chapterId}: ${id}`),
    );
    expect(missing).toEqual([]);
  });

  it("has a route for chapters that exist, and no more", () => {
    const chapterIds = new Set(chapters.map((c) => c.id));
    for (const r of parsed.data?.routes ?? []) expect(chapterIds.has(r.chapterId)).toBe(true);
  });
});
