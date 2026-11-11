import { describe, expect, it } from "vitest";
import { buildQuery } from "./overpass-query.ts";

// The areas the project actually extracts: partidos de Bahía Blanca and Coronel Rosales.
// Pinned here because 3302861 (level 8) is only the city and silently dropped most stations.
const PROJECT_AREAS = [2582799, 2584648];

describe("buildQuery", () => {
  const query = buildQuery(PROJECT_AREAS);

  it("builds one area per relation and unions them", () => {
    expect(query).toContain("area(id:3602582799)->.a0;");
    expect(query).toContain("area(id:3602584648)->.a1;");
    expect(query).toContain("(area.a0; area.a1;)->.a;");
  });

  it("does not use the city-only relation that missed most stations", () => {
    expect(query).not.toContain("3603302861");
  });

  it("works with a single area", () => {
    const single = buildQuery([2582799]);
    expect(single).toContain("(area.a0;)->.a;");
    expect(single).not.toContain("area.a1");
  });

  it("keeps active, disused, abandoned and razed track", () => {
    expect(query).toContain('["railway"~"^(rail|disused|abandoned|razed)$"]');
  });

  it("also matches the lifecycle-prefix style for track and stations", () => {
    const key = '[~"^(disused|abandoned|razed):railway$"';
    expect(query).toContain(`${key}~"^rail$"]`);
    expect(query).toContain(`${key}~"^(station|halt)$"]`);
  });

  it("searches stations as nodes, ways and relations, including old-style tags", () => {
    expect(query).toContain('nwr(area.a)["railway"~"^(station|halt)$"]');
    expect(query).toContain('nwr(area.a)["historic"="railway_station"]');
    expect(query).toContain('nwr(area.a)["building"="train_station"]');
  });

  it("asks for full geometry and applies the timeout", () => {
    expect(query).toContain("out geom;");
    expect(query).toContain("[timeout:120]");
    expect(buildQuery([1], 30)).toContain("[timeout:30]");
  });

  it("rejects an empty area list and ids that are not positive integers", () => {
    expect(() => buildQuery([])).toThrow(/at least one/);
    expect(() => buildQuery([0])).toThrow(/Invalid OSM relation id/);
    expect(() => buildQuery([-5])).toThrow(/Invalid OSM relation id/);
    expect(() => buildQuery([1.5])).toThrow(/Invalid OSM relation id/);
    expect(() => buildQuery([Number.NaN])).toThrow(/Invalid OSM relation id/);
  });
});
