import { z } from "zod";
import { metadataSchema, osmIdSchema, positionSchema } from "./geo";
import { cameraSchema } from "./route";

/** The stations of a zone chapter and where the camera goes, precomputed in data/ from the curated layer. */
export const zoneFeatureSchema = z.strictObject({
  type: z.literal("Feature"),
  geometry: z.strictObject({
    type: z.literal("MultiPoint"),
    coordinates: z.array(positionSchema).min(1),
  }),
  properties: z.strictObject({
    chapterId: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/),
    stationIds: z.array(osmIdSchema).min(1),
    camera: cameraSchema,
  }),
});

export const zonesCollectionSchema = z.strictObject({
  type: z.literal("FeatureCollection"),
  metadata: metadataSchema,
  features: z
    .array(zoneFeatureSchema)
    .min(1)
    .refine(
      (features) => new Set(features.map((f) => f.properties.chapterId)).size === features.length,
      { message: "Only one zone per chapter" },
    )
    .refine(
      (features) =>
        features.every((f) => f.geometry.coordinates.length === f.properties.stationIds.length),
      { message: "Every station of a zone needs its coordinates" },
    ),
});

export type ZonesCollection = z.infer<typeof zonesCollectionSchema>;
