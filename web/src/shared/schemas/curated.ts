import { z } from "zod";
import { TODO_VERIFY } from "./chapter";
import { osmIdSchema } from "./geo";

const text = z.string().trim().min(1);

/**
 * `verified` is a promise to the reader, for every curated entry: it cannot be true without a source or while a
 * pending marker is left in the label.
 */
function verifiedPromise<
  S extends z.ZodType<{ verified: boolean; source: string | null; label: string }>,
>(schema: S) {
  return schema
    .refine((entry) => !entry.verified || entry.source !== null, {
      message: "A verified entry needs a source",
      path: ["source"],
    })
    .refine((entry) => !entry.verified || !entry.label.includes(TODO_VERIFY), {
      message: `A verified entry cannot contain ${TODO_VERIFY}`,
      path: ["verified"],
    });
}

const entryBase = {
  chapterId: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "chapterId must be lowercase kebab-case"),
  label: text,
  source: text.nullable(),
  verified: z.boolean(),
};

/**
 * The route of one chapter: which OSM ways make it up, in order along the route. Hand-curated, so it follows the
 * same rule as chapters. The direction of each way is arbitrary in OSM, so the order matters but the orientation
 * does not.
 */
export const curatedRouteSchema = verifiedPromise(
  z.strictObject({
    ...entryBase,
    wayIds: z
      .array(osmIdSchema.refine((id) => id.startsWith("way/"), "a route is made of ways"))
      .min(1)
      .refine((ids) => new Set(ids).size === ids.length, { message: "Duplicated way in a route" }),
  }),
);

/** A place for a zone chapter: the stations to highlight. The camera is computed in data/ from them. */
export const curatedZoneSchema = verifiedPromise(
  z.strictObject({
    ...entryBase,
    stationIds: z
      .array(osmIdSchema)
      .min(1)
      .refine((ids) => new Set(ids).size === ids.length, {
        message: "Duplicated station in a zone",
      }),
  }),
);

export const curatedRoutesSchema = z.strictObject({
  routes: z
    .array(curatedRouteSchema)
    .min(1)
    .refine((routes) => new Set(routes.map((r) => r.chapterId)).size === routes.length, {
      message: "Only one route per chapter",
    }),
});

export const curatedZonesSchema = z.strictObject({
  zones: z
    .array(curatedZoneSchema)
    .min(1)
    .refine((zones) => new Set(zones.map((z) => z.chapterId)).size === zones.length, {
      message: "Only one zone per chapter",
    }),
});

export type CuratedRoute = z.infer<typeof curatedRouteSchema>;
export type CuratedZone = z.infer<typeof curatedZoneSchema>;
