import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { linesCollectionSchema } from "./line";
import { statsSchema } from "./stats";
import { stationsCollectionSchema } from "./station";

// data/ has no Zod on purpose: it must not depend on web/. The check runs here, so CI fails when the
// versioned GeoJSON does not fit the schemas (invalid data breaks the build, not the UI).
const read = (file: string): unknown =>
  JSON.parse(readFileSync(new URL(`../../../../data/out/${file}`, import.meta.url), "utf8"));

describe("data/out validates against the schemas of web/", () => {
  it("lines.geojson", () => {
    const result = linesCollectionSchema.safeParse(read("lines.geojson"));
    // Print the first issues: a bare `false` says nothing about which feature broke.
    expect(result.error?.issues.slice(0, 5) ?? []).toEqual([]);
    expect(result.data?.features.length).toBeGreaterThan(0);
  });

  it("stations.geojson", () => {
    const result = stationsCollectionSchema.safeParse(read("stations.geojson"));
    expect(result.error?.issues.slice(0, 5) ?? []).toEqual([]);
    expect(result.data?.features.length).toBeGreaterThan(0);
  });

  it("shares one extraction between lines and stations", () => {
    const lines = linesCollectionSchema.parse(read("lines.geojson"));
    const stations = stationsCollectionSchema.parse(read("stations.geojson"));
    expect(stations.metadata).toEqual(lines.metadata);
  });

  it("stats.json, with totals that match the GeoJSON it was computed from", () => {
    const result = statsSchema.safeParse(read("stats.json"));
    expect(result.error?.issues.slice(0, 5) ?? []).toEqual([]);
    const lines = linesCollectionSchema.parse(read("lines.geojson"));
    const stations = stationsCollectionSchema.parse(read("stations.geojson"));
    expect(result.data?.lines.total.count).toBe(lines.features.length);
    expect(result.data?.stations.total).toBe(stations.features.length);
    expect(result.data?.metadata).toEqual(lines.metadata);
  });
});
