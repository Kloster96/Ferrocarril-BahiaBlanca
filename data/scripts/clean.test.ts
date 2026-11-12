import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  cleanLine,
  cleanSnapshot,
  cleanStations,
  MERGE_RADIUS_METERS,
  nameKey,
  type OsmElement,
} from "./clean.ts";
import { boundingBoxCenter, haversineMeters } from "./geo.ts";

const BB = { lat: -38.7, lon: -62.27 };
// 0.0001 degrees of latitude is about 11 m.
const north = (metres: number) => ({ lat: BB.lat + metres / 111_000, lon: BB.lon });

const node = (id: number, tags: Record<string, string>, at = BB): OsmElement => ({
  type: "node",
  id,
  tags,
  ...at,
});
const building = (
  id: number,
  at = BB,
  tags: Record<string, string> = { building: "train_station" },
): OsmElement => ({
  type: "way",
  id,
  tags,
  geometry: [
    { lat: at.lat - 0.00001, lon: at.lon - 0.00001 },
    { lat: at.lat + 0.00001, lon: at.lon + 0.00001 },
  ],
});
const way = (id: number, tags: Record<string, string>): OsmElement => ({
  type: "way",
  id,
  tags,
  geometry: [
    { lat: -38.7, lon: -62.2 },
    { lat: -38.71, lon: -62.21 },
  ],
  nodes: [1001, 1002],
});

describe("geo", () => {
  it("measures a known distance", () => {
    // One degree of latitude is ~111.2 km.
    expect(haversineMeters({ lat: 0, lon: 0 }, { lat: 1, lon: 0 })).toBeCloseTo(111_195, -2);
    expect(haversineMeters(BB, BB)).toBe(0);
  });

  it("finds the centre of a bounding box", () => {
    expect(
      boundingBoxCenter([
        { lat: 0, lon: 0 },
        { lat: 2, lon: 4 },
      ]),
    ).toEqual({ lat: 1, lon: 2 });
    expect(() => boundingBoxCenter([])).toThrow();
  });
});

describe("cleanLine", () => {
  it("keeps active, disused, abandoned and razed track with a normalized status", () => {
    const status = (tags: Record<string, string>) => cleanLine(way(1, tags)).properties.status;
    expect(status({ railway: "rail" })).toBe("active");
    expect(status({ railway: "disused" })).toBe("disused");
    expect(status({ railway: "abandoned" })).toBe("abandoned");
    expect(status({ railway: "razed" })).toBe("abandoned");
    expect(status({ "disused:railway": "rail" })).toBe("disused");
  });

  it("keeps the original OSM tag so razed is not lost behind 'abandoned'", () => {
    expect(cleanLine(way(1, { railway: "razed" })).properties.osmTag).toBe("railway=razed");
  });

  it("keeps operator, network and other company tags, and leaves missing data as null", () => {
    const { properties } = cleanLine(
      way(1, {
        railway: "rail",
        operator: "FEPSA",
        network: "Roca",
        "operator:wikidata": "Q1",
        owner: "Estado",
        ref: "R-15",
      }),
    );
    expect(properties).toMatchObject({
      operator: "FEPSA",
      network: "Roca",
      ref: "R-15",
      name: null,
      gauge: null,
    });
    expect(properties.companyTags).toEqual({ "operator:wikidata": "Q1", owner: "Estado" });
  });

  it("outputs GeoJSON order: longitude first", () => {
    expect(cleanLine(way(1, { railway: "rail" })).geometry.coordinates[0]).toEqual([-62.2, -38.7]);
  });

  it("flags contradictory lifecycle tags instead of silently choosing", () => {
    const { properties } = cleanLine(way(1, { railway: "rail", "disused:railway": "rail" }));
    expect(properties.reviewReasons.join()).toContain("conflicting tags");
  });

  it("throws on a tagging it does not understand", () => {
    expect(() => cleanLine(way(1, { railway: "tram" }))).toThrow(/Unsupported track tagging/);
  });
});

describe("cleanStations", () => {
  it("never merges stations by name, even when the name is identical", () => {
    const stations = cleanStations([
      node(1, { railway: "station", name: "Bajo Hondo" }),
      node(2, { "abandoned:railway": "station", name: "Bajo Hondo" }, north(5000)),
    ]);
    expect(stations).toHaveLength(2);
  });

  it("keeps same-named stations of different companies separate and flags both", () => {
    const stations = cleanStations([
      node(1, { railway: "station", name: "Bajo Hondo" }),
      node(2, { "abandoned:railway": "station", name: "Bajo Hondo (FCRPB)" }, north(1285)),
    ]);
    expect(stations).toHaveLength(2);
    expect(stations.every((s) => s.properties.needsReview)).toBe(true);
    expect(stations[0]?.properties.reviewReasons.join()).toMatch(/name matches/);
  });

  it("merges a building footprint into the station a few metres away", () => {
    const stations = cleanStations([
      node(1, { railway: "station", name: "Cabildo" }),
      building(10, north(15)),
    ]);
    expect(stations).toHaveLength(1);
    expect(stations[0]?.properties.mergedFrom).toEqual(["way/10"]);
    expect(stations[0]?.properties.needsReview).toBe(false);
  });

  it("does not merge a building that is beyond the merge radius", () => {
    const stations = cleanStations([
      node(1, { railway: "station", name: "Cabildo" }),
      building(10, north(MERGE_RADIUS_METERS + 20)),
    ]);
    expect(stations).toHaveLength(2);
    const orphan = stations.find((s) => s.properties.id === "way/10");
    expect(orphan?.properties.needsReview).toBe(true);
  });

  it("merges a footprint into the nearest station and flags the ambiguity", () => {
    const stations = cleanStations([
      node(1, { railway: "station", name: "A" }, north(0)),
      node(2, { railway: "station", name: "B" }, north(20)),
      building(10, north(8)),
    ]);
    const a = stations.find((s) => s.properties.id === "node/1");
    expect(a?.properties.mergedFrom).toEqual(["way/10"]);
    expect(a?.properties.reviewReasons.join()).toContain("also within");
  });

  it("flags stations that share a wikidata id without merging them", () => {
    const stations = cleanStations([
      node(1, { railway: "station", name: "Spurr", wikidata: "Q5845001" }),
      node(2, { "disused:railway": "station", name: "Spurr", wikidata: "Q5845001" }, north(122)),
    ]);
    expect(stations).toHaveLength(2);
    expect(stations[0]?.properties.reviewReasons.join()).toContain("shares wikidata Q5845001");
  });

  it("flags a station without a name and carries the OSM fixme", () => {
    const [station] = cleanStations([
      node(1, { "abandoned:railway": "station", fixme: "falta nombre" }),
    ]);
    expect(station?.properties.name).toBeNull();
    expect(station?.properties.reviewReasons).toEqual(
      expect.arrayContaining(["no name", "OSM fixme: falta nombre"]),
    );
  });

  it("flags a reused building tagged as a former station", () => {
    const [station] = cleanStations([
      {
        ...building(5, BB, {
          building: "yes",
          "disused:railway": "station",
          name: "Oficina municipal",
        }),
      },
    ]);
    expect(station?.geometry.type).toBe("Point");
    expect(station?.properties.reviewReasons.join()).toContain("reused building");
  });

  it("normalizes status from the tag style and keeps kind, dates and old names", () => {
    const [station] = cleanStations([
      node(1, {
        "disused:railway": "halt",
        name: "Corti",
        start_date: "1900",
        "old_name:-1899-07-07": "El Puerto",
        operator: "X",
      }),
    ]);
    expect(station?.properties).toMatchObject({
      status: "disused",
      kind: "halt",
      osmTag: "disused:railway=halt",
      startDate: "1900",
      operator: "X",
      oldNames: [{ name: "El Puerto", period: "-1899-07-07" }],
    });
  });

  it("refuses to guess the status of a station tagged only as historic", () => {
    expect(() => cleanStations([node(1, { historic: "railway_station", name: "X" })])).toThrow(
      /Unsupported station tagging/,
    );
  });

  it("does not flag stations that merely look alike across towns", () => {
    const stations = cleanStations([
      node(1, { railway: "station", name: "Bahía Blanca" }),
      node(2, { "disused:railway": "station", name: "Bahía Blanca Noroeste" }, north(2500)),
    ]);
    expect(stations.some((s) => s.properties.needsReview)).toBe(false);
  });
});

describe("nameKey", () => {
  it("ignores case, accents, company suffix and a leading 'Empalme'", () => {
    expect(nameKey("La Vitícola")).toBe(nameKey("La Viticola"));
    expect(nameKey("Bajo Hondo (FCRPB)")).toBe(nameKey("Bajo Hondo"));
    expect(nameKey("Empalme Grünbein")).toBe(nameKey("Grünbein"));
    expect(nameKey("Bahía Blanca")).not.toBe(nameKey("Bahía Blanca Noroeste"));
  });
});

describe("cleanSnapshot", () => {
  it("keeps only the first and last node id of a way", () => {
    const { properties } = cleanLine({
      ...way(1, { railway: "rail" }),
      geometry: [
        { lat: -38.7, lon: -62.2 },
        { lat: -38.705, lon: -62.205 },
        { lat: -38.71, lon: -62.21 },
      ],
      nodes: [10, 20, 30],
    });
    expect(properties.startNodeId).toBe(10);
    expect(properties.endNodeId).toBe(30);
    expect(properties).not.toHaveProperty("nodes");
  });

  it("fails on a track without node ids instead of inventing them", () => {
    const { nodes: _nodes, ...withoutNodes } = way(1, { railway: "rail" });
    expect(() => cleanLine(withoutNodes)).toThrow(/no node ids/);
  });

  it("rejects relations instead of dropping them silently", () => {
    expect(() => cleanSnapshot([{ type: "relation", id: 1 }])).toThrow(/Relation 1/);
  });
});

// Invariants over the real snapshot: they hold however many elements a regeneration returns.
describe("real snapshot (data/raw/osm-raw.json)", () => {
  const raw = JSON.parse(readFileSync(new URL("../raw/osm-raw.json", import.meta.url), "utf8")) as {
    elements: OsmElement[];
  };
  const { lines, stations } = cleanSnapshot(raw.elements);

  it("drops no track: every raw track way becomes a line", () => {
    const rawTracks = raw.elements.filter(
      (e) =>
        e.type === "way" &&
        ["rail", "disused", "abandoned", "razed"].includes(e.tags?.railway ?? ""),
    );
    expect(lines.length).toBeGreaterThanOrEqual(rawTracks.length);
    expect(lines.length).toBeGreaterThan(0);
  });

  it("accounts for every station element exactly once", () => {
    const stationIds = stations.flatMap((s) => [s.properties.id, ...s.properties.mergedFrom]);
    expect(new Set(stationIds).size).toBe(stationIds.length);
    const lineIds = new Set(lines.map((l) => l.properties.id));
    for (const element of raw.elements) {
      const id = `${element.type}/${element.id}`;
      expect(lineIds.has(id) || stationIds.includes(id)).toBe(true);
    }
  });

  it("gives every line start and end node ids that match the raw first and last node", () => {
    const rawWays = new Map(raw.elements.map((e) => [`${e.type}/${e.id}`, e]));
    for (const { properties } of lines) {
      const nodes = rawWays.get(properties.id)?.nodes;
      expect(nodes, properties.id).toBeDefined();
      expect(properties.startNodeId, properties.id).toBe(nodes?.[0]);
      expect(properties.endNodeId, properties.id).toBe(nodes?.at(-1));
    }
  });

  it("only uses the three normalized statuses", () => {
    for (const feature of [...lines, ...stations]) {
      expect(["active", "disused", "abandoned"]).toContain(feature.properties.status);
    }
  });

  it("gives every line at least two coordinates and every station one position", () => {
    expect(lines.every((l) => l.geometry.coordinates.length >= 2)).toBe(true);
    expect(stations.every((s) => s.geometry.coordinates.length === 2)).toBe(true);
  });

  it("marks needsReview consistently with its reasons", () => {
    for (const { properties } of [...lines, ...stations]) {
      expect(properties.needsReview).toBe(properties.reviewReasons.length > 0);
    }
  });
});
