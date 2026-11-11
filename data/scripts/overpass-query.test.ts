import { describe, expect, it } from "vitest";
import { buildQuery } from "./overpass-query.ts";

describe("buildQuery", () => {
  const query = buildQuery(3302861);

  it("targets the area derived from the relation id", () => {
    expect(query).toContain("area(id:3603302861)->.a;");
  });

  it("keeps active, disused, abandoned and razed track", () => {
    expect(query).toContain('["railway"~"^(rail|disused|abandoned|razed)$"]');
  });

  it("also matches the lifecycle-prefix style for track and stations", () => {
    const key = '[~"^(disused|abandoned|razed):railway$"';
    expect(query).toContain(`${key}~"^rail$"]`);
    expect(query).toContain(`${key}~"^(station|halt)$"]`);
  });

  it("searches stations as nodes, ways and relations", () => {
    expect(query).toContain('nwr(area.a)["railway"~"^(station|halt)$"]');
  });

  it("asks for full geometry and applies the timeout", () => {
    expect(query).toContain("out geom;");
    expect(query).toContain("[timeout:120]");
    expect(buildQuery(1, 30)).toContain("[timeout:30]");
  });
});
