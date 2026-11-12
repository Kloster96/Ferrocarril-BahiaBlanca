import { describe, expect, it } from "vitest";
import type { LineFeature } from "./clean.ts";
import { mergeRoute } from "./routes.ts";

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
