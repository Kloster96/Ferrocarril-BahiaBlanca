import { z } from "zod";
import { metadataSchema, positionSchema } from "./geo";

/** A closed ring: at least 4 positions, the last equal to the first. */
const ringSchema = z
  .array(positionSchema)
  .min(4)
  .refine(
    (ring) => {
      const first = ring[0];
      const last = ring.at(-1);
      return (
        first !== undefined && last !== undefined && first[0] === last[0] && first[1] === last[1]
      );
    },
    { message: "Ring is not closed" },
  );

const polygonCoordinates = z.array(ringSchema).min(1);

export const areaFeatureSchema = z.strictObject({
  type: z.literal("Feature"),
  geometry: z.strictObject({
    type: z.literal("MultiPolygon"),
    coordinates: z.array(polygonCoordinates).min(1),
  }),
  properties: z.strictObject({ kind: z.literal("area") }),
});

/** The world with the area cut out as holes: one exterior ring plus one hole per area ring. */
export const maskFeatureSchema = z.strictObject({
  type: z.literal("Feature"),
  geometry: z.strictObject({ type: z.literal("Polygon"), coordinates: polygonCoordinates }),
  properties: z.strictObject({ kind: z.literal("mask") }),
});

/** Exactly two features, in this order: the layers pick them by position, so the shape is pinned. */
export const areaCollectionSchema = z
  .strictObject({
    type: z.literal("FeatureCollection"),
    metadata: metadataSchema,
    features: z.tuple([areaFeatureSchema, maskFeatureSchema]),
  })
  .refine(
    ({ features: [area, mask] }) =>
      mask.geometry.coordinates.length === area.geometry.coordinates.length + 1,
    { message: "The mask must have one hole per area ring" },
  );

export type AreaCollection = z.infer<typeof areaCollectionSchema>;
