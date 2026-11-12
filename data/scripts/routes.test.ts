import { describe, expect, it } from "vitest";
import type { LineFeature } from "./clean.ts";
import { cameraFor, mergeRoute } from "./routes.ts";

// Only the fields the merge reads; the rest of LineProperties is irrelevant here.
const way = (id: number, from: number, to: number, coordinates: [number, number][]) =>
  ({
    type: "Feature",
    geometry: { type: "LineString", coordinates },
    properties: { id: `way/${id}`, startNodeId: from, endNodeId: to },
  }) as unknown as LineFeature;

// Nodes 1..4 in a row. Way 10: 1→2, way 20: 2→3, way 30: 3→4.
const a = way(10, 1, 2, [
  [0, 0],
  [1, 0],
]);
const b = way(20, 2, 3, [
  [1, 0],
  [2, 0],
]);
const c = way(30, 3, 4, [
  [2, 0],
  [3, 0],
]);
const index = (...ways: LineFeature[]) => new Map(ways.map((w) => [w.properties.id, w]));
const all = ["way/10", "way/20", "way/30"];

describe("mergeRoute", () => {
  it("joins ways that connect into one continuous line, keeping each shared point once", () => {
    const merged = mergeRoute({ chapterId: "chapter-1", wayIds: all }, index(a, b, c));
    expect(merged.coordinates).toEqual([
      [0, 0],
      [1, 0],
      [2, 0],
      [3, 0],
    ]);
    expect(merged.wayIds).toEqual(all);
  });

  it("flips a reversed way: the result is continuous and starts and ends where the inputs do", () => {
    // Way 20 is stored the other way round (3→2).
    const reversed = way(20, 3, 2, [
      [2, 0],
      [1, 0],
    ]);
    const merged = mergeRoute({ chapterId: "chapter-1", wayIds: all }, index(a, reversed, c));
    expect(merged.coordinates).toEqual([
      [0, 0],
      [1, 0],
      [2, 0],
      [3, 0],
    ]);
  });

  it("flips the first way when it points away from the route", () => {
    const reversedFirst = way(10, 2, 1, [
      [1, 0],
      [0, 0],
    ]);
    const merged = mergeRoute(
      { chapterId: "chapter-1", wayIds: ["way/10", "way/20"] },
      index(reversedFirst, b),
    );
    expect(merged.coordinates).toEqual([
      [0, 0],
      [1, 0],
      [2, 0],
    ]);
  });

  it("returns a single way unchanged", () => {
    const merged = mergeRoute({ chapterId: "chapter-1", wayIds: ["way/10"] }, index(a));
    expect(merged.coordinates).toEqual(a.geometry.coordinates);
  });

  it("fails on a real gap, naming the chapter and both ways", () => {
    expect(() =>
      mergeRoute({ chapterId: "chapter-2", wayIds: ["way/10", "way/30"] }, index(a, c)),
    ).toThrow(/chapter-2: way\/10 and way\/30 do not share an end node/);

    const far = way(40, 9, 8, [
      [8, 0],
      [9, 0],
    ]);
    expect(() =>
      mergeRoute(
        { chapterId: "chapter-2", wayIds: ["way/10", "way/20", "way/40"] },
        index(a, b, far),
      ),
    ).toThrow(/way\/20 and way\/40/);
  });

  it("fails on an OSM id that does not exist", () => {
    expect(() =>
      mergeRoute({ chapterId: "chapter-3", wayIds: ["way/10", "way/999"] }, index(a)),
    ).toThrow(/chapter-3: way\/999 does not exist/);
  });

  it("fails on an empty route", () => {
    expect(() => mergeRoute({ chapterId: "chapter-1", wayIds: [] }, index(a))).toThrow(/no ways/);
  });
});

describe("cameraFor", () => {
  it("centres on the middle of the bounding box", () => {
    const { center } = cameraFor([
      [-62, -38],
      [-61, -37],
    ]);
    expect(center).toEqual([-61.5, -37.5]);
  });

  it("zooms out for a longer route and in for a shorter one", () => {
    const long = cameraFor([
      [-62.6, -38.9],
      [-61.7, -38.1],
    ]);
    const short = cameraFor([
      [-62.2, -38.5],
      [-62.15, -38.47],
    ]);
    expect(short.zoom).toBeGreaterThan(long.zoom);
  });

  it("fits the box: at the returned zoom it takes no more than the reference size on screen", () => {
    const { zoom } = cameraFor([
      [-62.6, -38.9],
      [-61.7, -38.9],
    ]);
    const widthPx = (0.9 / 360) * 512 * 2 ** zoom;
    expect(widthPx).toBeLessThanOrEqual(340);
    // ...and not by a lot: rounding to a tenth costs at most about 7% of the size.
    expect(widthPx).toBeGreaterThan(340 * 0.9);
  });

  it("measures latitude in Web Mercator: a tall box needs a lower zoom than the same degrees of longitude", () => {
    const wide = cameraFor([
      [-62, -38],
      [-61, -38],
    ]);
    const tall = cameraFor([
      [-62, -38],
      [-62, -37],
    ]);
    expect(tall.zoom).toBeLessThan(wide.zoom);
  });

  it("clamps a single point to the closest zoom instead of dividing by zero", () => {
    expect(cameraFor([[-62, -38]]).zoom).toBe(14);
  });

  it("fails on an empty route", () => {
    expect(() => cameraFor([])).toThrow(/at least one/);
  });
});
