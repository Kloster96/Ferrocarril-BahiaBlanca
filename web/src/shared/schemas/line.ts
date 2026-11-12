import { z } from "zod";
import {
  commonProperties,
  hasUniqueIds,
  lineStringSchema,
  metadataSchema,
  reviewIsConsistent,
} from "./geo";

export const linePropertiesSchema = z
  .strictObject({
    ...commonProperties,
    /** OSM ids of the first and last node: the Phase 3 route merge chains ways by shared endpoint. */
    startNodeId: z.number().int().positive(),
    endNodeId: z.number().int().positive(),
    ref: z.string().min(1).nullable(),
    gauge: z.string().min(1).nullable(),
    service: z.string().min(1).nullable(),
    usage: z.string().min(1).nullable(),
    bridge: z.string().min(1).nullable(),
  })
  .refine(reviewIsConsistent, { message: "needsReview must match reviewReasons" });

export const lineFeatureSchema = z.strictObject({
  type: z.literal("Feature"),
  geometry: lineStringSchema,
  properties: linePropertiesSchema,
});

export const linesCollectionSchema = z.strictObject({
  type: z.literal("FeatureCollection"),
  metadata: metadataSchema,
  features: z.array(lineFeatureSchema).refine(hasUniqueIds, { message: "Duplicated line ids" }),
});

export type LineProperties = z.infer<typeof linePropertiesSchema>;
export type LineFeature = z.infer<typeof lineFeatureSchema>;
export type LinesCollection = z.infer<typeof linesCollectionSchema>;
