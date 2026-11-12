import { z } from "zod";
import {
  commonProperties,
  hasUniqueIds,
  metadataSchema,
  osmIdSchema,
  pointSchema,
  reviewIsConsistent,
} from "./geo";

export const stationPropertiesSchema = z
  .strictObject({
    ...commonProperties,
    kind: z.enum(["station", "halt"]),
    altName: z.string().min(1).nullable(),
    // `period` is free text on purpose: OSM stores historical periods as written ("-1899-07-07").
    oldNames: z.array(z.strictObject({ name: z.string().min(1), period: z.string().min(1) })),
    startDate: z.string().min(1).nullable(),
    wikidata: z
      .string()
      .regex(/^Q[1-9]\d*$/)
      .nullable(),
    wikipedia: z.string().min(1).nullable(),
    /** Building footprints merged into this station by proximity. */
    mergedFrom: z.array(osmIdSchema),
  })
  .refine(reviewIsConsistent, { message: "needsReview must match reviewReasons" });

export const stationFeatureSchema = z.strictObject({
  type: z.literal("Feature"),
  geometry: pointSchema,
  properties: stationPropertiesSchema,
});

export const stationsCollectionSchema = z.strictObject({
  type: z.literal("FeatureCollection"),
  metadata: metadataSchema,
  features: z
    .array(stationFeatureSchema)
    .refine(hasUniqueIds, { message: "Duplicated station ids" }),
});

export type StationProperties = z.infer<typeof stationPropertiesSchema>;
export type StationFeature = z.infer<typeof stationFeatureSchema>;
export type StationsCollection = z.infer<typeof stationsCollectionSchema>;
