import { z } from "zod";
import { lineStringSchema, metadataSchema, osmIdSchema } from "./geo";

/** One continuous line per chapter, precomputed in data/ from the curated layer (see data/curated/README.md). */
export const routeFeatureSchema = z.strictObject({
  type: z.literal("Feature"),
  geometry: lineStringSchema,
  properties: z.strictObject({
    chapterId: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/),
    wayIds: z.array(osmIdSchema).min(1),
  }),
});

export const routesCollectionSchema = z.strictObject({
  type: z.literal("FeatureCollection"),
  metadata: metadataSchema,
  features: z
    .array(routeFeatureSchema)
    .min(1)
    .refine(
      (features) => new Set(features.map((f) => f.properties.chapterId)).size === features.length,
      {
        message: "Only one route per chapter",
      },
    ),
});

export type RouteFeature = z.infer<typeof routeFeatureSchema>;
export type RoutesCollection = z.infer<typeof routesCollectionSchema>;
