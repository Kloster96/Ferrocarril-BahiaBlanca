import { z } from "zod";
import { osmIdSchema } from "./geo";
import { TODO_VERIFY } from "./chapter";

const text = z.string().trim().min(1);

/**
 * The route of one chapter: which OSM ways make it up, in order along the route. Hand-curated, so it follows the
 * same rule as chapters: `verified` is a promise, and it cannot be true while a source is missing or pending.
 * The direction of each way is arbitrary in OSM, so the order matters but the orientation does not.
 */
export const curatedRouteSchema = z
  .strictObject({
    chapterId: z
      .string()
      .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "chapterId must be lowercase kebab-case"),
    label: text,
    source: text.nullable(),
    verified: z.boolean(),
    wayIds: z
      .array(osmIdSchema.refine((id) => id.startsWith("way/"), "a route is made of ways"))
      .min(1)
      .refine((ids) => new Set(ids).size === ids.length, { message: "Duplicated way in a route" }),
  })
  .refine((route) => !route.verified || route.source !== null, {
    message: "A verified route needs a source",
    path: ["source"],
  })
  .refine((route) => !route.verified || !route.label.includes(TODO_VERIFY), {
    message: `A verified route cannot contain ${TODO_VERIFY}`,
    path: ["verified"],
  });

export const curatedRoutesSchema = z.strictObject({
  routes: z
    .array(curatedRouteSchema)
    .min(1)
    .refine((routes) => new Set(routes.map((r) => r.chapterId)).size === routes.length, {
      message: "Only one route per chapter",
    }),
});

export type CuratedRoute = z.infer<typeof curatedRouteSchema>;
