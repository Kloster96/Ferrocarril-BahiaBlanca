import { describe, expect, it } from "vitest";
import type { StationFeature } from "./clean.ts";
import { buildZone, ZONE_MAX_ZOOM } from "./zones.ts";

// Only the fields the zone reads; the rest of StationProperties is irrelevant here.
const station = (id: string, lon: number, lat: number) =>
  ({
    type: "Feature",
    geometry: { type: "Point", coordinates: [lon, lat] },
    properties: { id },
  }) as unknown as StationFeature;
const index = (...list: StationFeature[]) => new Map(list.map((s) => [s.properties.id, s]));

const a = station("node/1", -62.1, -38.88);
const b = station("node/2", -62.09, -38.89);
const far = station("node/3", -61.7, -38.1);

describe("buildZone", () => {
  it("returns the stations' coordinates in order and a camera centred on them", () => {
    const zone = buildZone(
      { chapterId: "chapter-4", stationIds: ["node/1", "node/2"] },
      index(a, b),
    );
    expect(zone.coordinates).toEqual([
      [-62.1, -38.88],
      [-62.09, -38.89],
    ]);
    expect(zone.camera.center).toEqual([-62.095, -38.885]);
  });

  it("never zooms in closer than a zone should, not even on a single station", () => {
    expect(
      buildZone({ chapterId: "chapter-2", stationIds: ["node/1"] }, index(a)).camera.zoom,
    ).toBe(ZONE_MAX_ZOOM);
    expect(
      buildZone({ chapterId: "chapter-4", stationIds: ["node/1", "node/2"] }, index(a, b)).camera
        .zoom,
    ).toBe(ZONE_MAX_ZOOM);
  });

  it("zooms out to fit stations that are far apart", () => {
    const zone = buildZone(
      { chapterId: "chapter-4", stationIds: ["node/1", "node/3"] },
      index(a, far),
    );
    expect(zone.camera.zoom).toBeLessThan(ZONE_MAX_ZOOM);
  });

  it("fails on a station that does not exist, naming the chapter and the id", () => {
    expect(() => buildZone({ chapterId: "chapter-2", stationIds: ["node/99"] }, index(a))).toThrow(
      /chapter-2: node\/99 does not exist/,
    );
  });

  it("fails on an empty zone and on a repeated station", () => {
    expect(() => buildZone({ chapterId: "chapter-2", stationIds: [] }, index(a))).toThrow(
      /no stations/,
    );
    expect(() =>
      buildZone({ chapterId: "chapter-2", stationIds: ["node/1", "node/1"] }, index(a)),
    ).toThrow(/repeats/);
  });
});
