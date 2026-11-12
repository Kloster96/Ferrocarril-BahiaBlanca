import { z } from "zod";

/** `node/123`, `way/456`, `relation/789`: the OSM element a feature comes from. */
export const osmIdSchema = z.string().regex(/^(node|way|relation)\/[1-9]\d*$/, "invalid OSM id");

export const statusSchema = z.enum(["active", "disused", "abandoned"]);

/** GeoJSON position, [longitude, latitude] (in that order). No altitude: the data has none. */
export const positionSchema = z.tuple([z.number().min(-180).max(180), z.number().min(-90).max(90)]);

export const pointSchema = z.strictObject({
  type: z.literal("Point"),
  coordinates: positionSchema,
});

/** A LineString needs two positions at least, otherwise it has no length to draw. */
export const lineStringSchema = z.strictObject({
  type: z.literal("LineString"),
  coordinates: z.array(positionSchema).min(2),
});

export const metadataSchema = z.strictObject({
  source: z.literal("OpenStreetMap"),
  // The licence travels with the data: ODbL requires attribution wherever it is used.
  license: z.string().includes("ODbL"),
  osmBaseTimestamp: z.iso.datetime().nullable(),
  fetchedAt: z.iso.datetime(),
});

/** Properties shared by lines and stations. Strict on purpose: a new field must be a conscious change. */
export const commonProperties = {
  id: osmIdSchema,
  status: statusSchema,
  osmTag: z.string().min(1),
  name: z.string().min(1).nullable(),
  operator: z.string().min(1).nullable(),
  network: z.string().min(1).nullable(),
  description: z.string().min(1).nullable(),
  companyTags: z.record(z.string(), z.string()),
  needsReview: z.boolean(),
  reviewReasons: z.array(z.string().min(1)),
};

type Reviewable = { needsReview: boolean; reviewReasons: string[] };

/** `needsReview` is derived from the reasons: they must never disagree. */
export const reviewIsConsistent = (properties: Reviewable) =>
  properties.needsReview === properties.reviewReasons.length > 0;

/** Ids are unique within a collection: the map and the API rely on them as keys. */
export const hasUniqueIds = (features: { properties: { id: string } }[]) =>
  new Set(features.map((feature) => feature.properties.id)).size === features.length;
