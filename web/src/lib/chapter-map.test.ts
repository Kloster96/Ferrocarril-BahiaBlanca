import { describe, expect, it } from "vitest";
import {
  DIMMED_OPACITY,
  emphasizedStatuses,
  highlightedStations,
  routeLooks,
  type MapChapter,
  type RouteLook,
} from "./chapter-map";

// route, zone, route, network, status: enough to cover every pair of (route chapter, active type).
const chapters: MapChapter[] = [
  { id: "a", map: { type: "route" } },
  { id: "b", map: { type: "zone" } },
  { id: "c", map: { type: "route" } },
  { id: "d", map: { type: "network" } },
  { id: "e", map: { type: "status", statuses: ["active"] } },
];
const at = (index: number, progress = 0) => ({ index, progress });
// The two route chapters of the fixture, typed so the tests can read them without non-null assertions.
const looks = (index: number, progress = 0, reduced = false) =>
  Object.fromEntries(routeLooks(chapters, at(index, progress), reduced)) as Record<
    "a" | "c",
    RouteLook
  >;

describe("routeLooks", () => {
  it("only knows the routes of `route` chapters", () => {
    expect(Object.keys(looks(0))).toEqual(["a", "c"]);
  });

  it("hides every route on the hero", () => {
    expect(looks(-1)).toEqual({ a: { drawn: 0, opacity: 1 }, c: { drawn: 0, opacity: 1 } });
  });

  it("draws the active route along the scroll and keeps later ones hidden", () => {
    expect(looks(0, 0.4)).toEqual({ a: { drawn: 0.4, opacity: 1 }, c: { drawn: 0, opacity: 1 } });
  });

  it("keeps a finished route at full strength while the next chapter is also a route", () => {
    expect(looks(2, 0.25)).toEqual({ a: { drawn: 1, opacity: 1 }, c: { drawn: 0.25, opacity: 1 } });
  });

  it("dims earlier routes in zone and network chapters", () => {
    expect(looks(1).a).toEqual({ drawn: 1, opacity: DIMMED_OPACITY });
    expect(looks(3)).toEqual({
      a: { drawn: 1, opacity: DIMMED_OPACITY },
      c: { drawn: 1, opacity: DIMMED_OPACITY },
    });
  });

  it("does not draw a route that comes after a zone chapter until its own chapter", () => {
    expect(looks(1).c).toEqual({ drawn: 0, opacity: 1 });
  });

  it("fades earlier routes out in status chapters, keeping them whole", () => {
    expect(looks(4)).toEqual({ a: { drawn: 1, opacity: 0 }, c: { drawn: 1, opacity: 0 } });
  });

  it("clamps a bad progress", () => {
    expect(looks(0, 7).a.drawn).toBe(1);
    expect(looks(0, NaN).a.drawn).toBe(0);
  });

  describe("with reduced motion", () => {
    it("never draws along the scroll: the active route is whole", () => {
      expect(looks(0, 0.2, true).a).toEqual({ drawn: 1, opacity: 1 });
    });

    it("hides routes not reached by their opacity, not by trimming them", () => {
      expect(looks(0, 0.2, true).c).toEqual({ drawn: 1, opacity: 0 });
      expect(looks(-1, 0, true).a).toEqual({ drawn: 1, opacity: 0 });
    });

    it("applies the same attenuation and hiding rules", () => {
      expect(looks(3, 0, true).a).toEqual({ drawn: 1, opacity: DIMMED_OPACITY });
      expect(looks(4, 0, true).a).toEqual({ drawn: 1, opacity: 0 });
    });
  });
});

describe("highlightedStations", () => {
  const zones = new Map([["b", ["node/1", "node/2"]]]);

  it("returns the stations of the zone chapter that is active", () => {
    expect(highlightedStations(chapters, 1, zones)).toEqual(["node/1", "node/2"]);
  });

  it("returns none in any other chapter type, or on the hero", () => {
    for (const index of [-1, 0, 2, 3, 4])
      expect(highlightedStations(chapters, index, zones)).toEqual([]);
  });

  it("returns none for a zone chapter that has no zone data", () => {
    expect(highlightedStations(chapters, 1, new Map())).toEqual([]);
  });
});

describe("emphasizedStatuses", () => {
  it("returns the statuses of the status chapter that is active", () => {
    expect(emphasizedStatuses(chapters, 4)).toEqual(["active"]);
  });

  it("returns null in any other chapter type and on the hero: nothing is faded", () => {
    for (const index of [-1, 0, 1, 2, 3]) expect(emphasizedStatuses(chapters, index)).toBeNull();
  });
});
