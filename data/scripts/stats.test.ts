import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { LineFeature, StationFeature, Status } from "./clean.ts";
import { computeStats, lineLengthMeters } from "./stats.ts";

const line = (status: Status, coordinates: [number, number][]): LineFeature =>
  ({
    type: "Feature",
    geometry: { type: "LineString", coordinates },
    properties: { status },
  }) as LineFeature;

const station = (status: Status): StationFeature =>
  ({
    type: "Feature",
    geometry: { type: "Point", coordinates: [0, 0] },
    properties: { status },
  }) as StationFeature;

// One degree of latitude along a meridian is ~111.2 km.
const ONE_DEGREE: [number, number][] = [
  [0, 0],
  [0, 1],
];

describe("lineLengthMeters", () => {
  it("measures a known distance", () => {
    expect(lineLengthMeters(ONE_DEGREE)).toBeCloseTo(111_195, -2);
  });

  it("sums every segment of a line", () => {
    const twoSegments: [number, number][] = [
      [0, 0],
      [0, 1],
      [0, 2],
    ];
    expect(lineLengthMeters(twoSegments)).toBeCloseTo(2 * lineLengthMeters(ONE_DEGREE), 6);
  });

  it("is zero for a line with fewer than two points", () => {
    expect(lineLengthMeters([])).toBe(0);
    expect(lineLengthMeters([[1, 1]])).toBe(0);
  });
});

describe("computeStats", () => {
  it("counts and measures lines and stations by status", () => {
    const stats = computeStats(
      [line("active", ONE_DEGREE), line("active", ONE_DEGREE), line("disused", ONE_DEGREE)],
      [station("active"), station("abandoned"), station("abandoned")],
    );
    expect(stats.lines.byStatus.active.count).toBe(2);
    expect(stats.lines.byStatus.active.trackKm).toBeCloseTo(222.39, 1);
    expect(stats.lines.byStatus.disused.count).toBe(1);
    expect(stats.lines.byStatus.abandoned).toEqual({ count: 0, trackKm: 0 });
    expect(stats.lines.total.count).toBe(3);
    expect(stats.lines.total.trackKm).toBeCloseTo(333.585, 1);
    expect(stats.stations.byStatus).toEqual({ active: 1, disused: 0, abandoned: 2 });
    expect(stats.stations.total).toBe(3);
  });

  it("returns zeros, with every status present, when there is no data", () => {
    const stats = computeStats([], []);
    expect(stats.lines.total).toEqual({ count: 0, trackKm: 0 });
    expect(Object.keys(stats.lines.byStatus)).toEqual(["active", "disused", "abandoned"]);
    expect(stats.stations.total).toBe(0);
  });
});

// stats.json is versioned: it must not drift from the GeoJSON it was computed from.
describe("data/out/stats.json", () => {
  const read = (file: string) =>
    JSON.parse(readFileSync(new URL(`../out/${file}`, import.meta.url), "utf8")) as {
      features: never[];
    };
  const lines = read("lines.geojson").features as LineFeature[];
  const stations = read("stations.geojson").features as StationFeature[];
  const committed = JSON.parse(
    readFileSync(new URL("../out/stats.json", import.meta.url), "utf8"),
  ) as Record<string, unknown>;

  it("matches what computeStats returns for the committed GeoJSON (run `pnpm data:stats`)", () => {
    const { metadata: _metadata, ...numbers } = committed;
    expect(numbers).toEqual(computeStats(lines, stations));
  });

  it("accounts for every line and station exactly once", () => {
    const stats = computeStats(lines, stations);
    const countByStatus = Object.values(stats.lines.byStatus).reduce((n, s) => n + s.count, 0);
    expect(countByStatus).toBe(lines.length);
    expect(Object.values(stats.stations.byStatus).reduce((n, c) => n + c, 0)).toBe(stations.length);
  });
});
