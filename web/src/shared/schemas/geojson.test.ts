import { describe, expect, it } from "vitest";
import { lineFeatureSchema, linesCollectionSchema } from "./line";
import { stationFeatureSchema, stationsCollectionSchema } from "./station";

const common = {
  status: "active",
  osmTag: "railway=rail",
  name: null,
  operator: null,
  network: null,
  description: null,
  companyTags: {},
  needsReview: false,
  reviewReasons: [],
};

const line = (overrides: Record<string, unknown> = {}) => ({
  type: "Feature",
  geometry: {
    type: "LineString",
    coordinates: [
      [-62.2, -38.7],
      [-62.21, -38.71],
    ],
  },
  properties: {
    ...common,
    id: "way/1",
    startNodeId: 10,
    endNodeId: 20,
    ref: null,
    gauge: null,
    service: null,
    usage: null,
    bridge: null,
    ...overrides,
  },
});

const station = (overrides: Record<string, unknown> = {}) => ({
  type: "Feature",
  geometry: { type: "Point", coordinates: [-62.27, -38.7] },
  properties: {
    ...common,
    osmTag: "railway=station",
    id: "node/1",
    kind: "station",
    altName: null,
    oldNames: [{ name: "El Puerto", period: "-1899-07-07" }],
    startDate: null,
    wikidata: "Q5845001",
    wikipedia: null,
    mergedFrom: ["way/10"],
    ...overrides,
  },
});

const metadata = {
  source: "OpenStreetMap",
  license: "ODbL 1.0 — © OpenStreetMap contributors — https://www.openstreetmap.org/copyright",
  osmBaseTimestamp: "2026-11-11T20:26:43Z",
  fetchedAt: "2026-11-11T20:28:01.232Z",
};
const collection = (features: unknown[]) => ({ type: "FeatureCollection", metadata, features });

describe("lineFeatureSchema", () => {
  it("accepts a valid line", () => {
    expect(lineFeatureSchema.safeParse(line()).success).toBe(true);
  });

  it("rejects invalid coordinates and degenerate geometry", () => {
    const bad = (coordinates: unknown) =>
      lineFeatureSchema.safeParse({ ...line(), geometry: { type: "LineString", coordinates } });
    expect(bad([[0, 0]]).success).toBe(false); // one position is not a line
    expect(
      bad([
        [0, 91],
        [0, 0],
      ]).success,
    ).toBe(false); // latitude out of range
    expect(
      bad([
        [-181, 0],
        [0, 0],
      ]).success,
    ).toBe(false); // longitude out of range
    expect(
      bad([
        [0, 0],
        [0, 0, 5],
      ]).success,
    ).toBe(false); // altitude is not part of the contract
    expect(
      bad([
        [0, 0],
        [Number.NaN, 0],
      ]).success,
    ).toBe(false);
  });

  it("rejects a status outside the three normalized ones", () => {
    expect(lineFeatureSchema.safeParse(line({ status: "razed" })).success).toBe(false);
  });

  it("requires both endpoint node ids", () => {
    expect(lineFeatureSchema.safeParse(line({ startNodeId: undefined })).success).toBe(false);
    expect(lineFeatureSchema.safeParse(line({ endNodeId: 1.5 })).success).toBe(false);
    expect(lineFeatureSchema.safeParse(line({ endNodeId: 0 })).success).toBe(false);
  });

  it("rejects unknown properties, so a new field is a conscious change", () => {
    expect(lineFeatureSchema.safeParse(line({ surprise: 1 })).success).toBe(false);
  });

  it("rejects needsReview that disagrees with its reasons", () => {
    expect(lineFeatureSchema.safeParse(line({ needsReview: true })).success).toBe(false);
    expect(lineFeatureSchema.safeParse(line({ reviewReasons: ["no name"] })).success).toBe(false);
    expect(
      lineFeatureSchema.safeParse(line({ needsReview: true, reviewReasons: ["no name"] })).success,
    ).toBe(true);
  });

  it("rejects malformed OSM ids", () => {
    expect(lineFeatureSchema.safeParse(line({ id: "way/0" })).success).toBe(false);
    expect(lineFeatureSchema.safeParse(line({ id: "street/1" })).success).toBe(false);
  });
});

describe("stationFeatureSchema", () => {
  it("accepts a valid station", () => {
    expect(stationFeatureSchema.safeParse(station()).success).toBe(true);
  });

  it("rejects a point out of range and a LineString", () => {
    expect(
      stationFeatureSchema.safeParse({
        ...station(),
        geometry: { type: "Point", coordinates: [200, 0] },
      }).success,
    ).toBe(false);
    expect(
      stationFeatureSchema.safeParse({ ...station(), geometry: line().geometry }).success,
    ).toBe(false);
  });

  it("rejects bad kind, wikidata and merged ids", () => {
    expect(stationFeatureSchema.safeParse(station({ kind: "stop" })).success).toBe(false);
    expect(stationFeatureSchema.safeParse(station({ wikidata: "5845001" })).success).toBe(false);
    expect(stationFeatureSchema.safeParse(station({ mergedFrom: ["x"] })).success).toBe(false);
  });
});

describe("collections", () => {
  it("rejects duplicated ids", () => {
    expect(linesCollectionSchema.safeParse(collection([line(), line()])).success).toBe(false);
    expect(stationsCollectionSchema.safeParse(collection([station(), station()])).success).toBe(
      false,
    );
  });

  it("requires the ODbL licence and an ISO extraction date in the metadata", () => {
    const withMetadata = (overrides: object) => ({
      ...collection([line()]),
      metadata: { ...metadata, ...overrides },
    });
    expect(linesCollectionSchema.safeParse(collection([line()])).success).toBe(true);
    expect(linesCollectionSchema.safeParse(withMetadata({ license: "MIT" })).success).toBe(false);
    expect(linesCollectionSchema.safeParse(withMetadata({ fetchedAt: "ayer" })).success).toBe(
      false,
    );
  });
});
