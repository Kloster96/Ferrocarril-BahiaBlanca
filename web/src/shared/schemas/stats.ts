import { z } from "zod";
import { metadataSchema } from "./geo";

const count = z.number().int().nonnegative();

const lineStats = z.strictObject({
  count,
  /** Sum of the length of every mapped way. It is NOT the route length: double track counts twice. */
  trackKm: z.number().nonnegative(),
});

const byStatus = <T extends z.ZodType>(value: T) =>
  z.strictObject({ active: value, disused: value, abandoned: value });

// Each figure is rounded to 3 decimals of km on its own, so the total can differ from the sum by rounding.
const ROUNDING_TOLERANCE_KM = 0.002;

export const statsSchema = z
  .strictObject({
    metadata: metadataSchema,
    lines: z.strictObject({ total: lineStats, byStatus: byStatus(lineStats) }),
    stations: z.strictObject({ total: count, byStatus: byStatus(count) }),
  })
  .refine(
    ({ lines }) =>
      lines.total.count ===
        lines.byStatus.active.count +
          lines.byStatus.disused.count +
          lines.byStatus.abandoned.count &&
      Math.abs(
        lines.total.trackKm -
          (lines.byStatus.active.trackKm +
            lines.byStatus.disused.trackKm +
            lines.byStatus.abandoned.trackKm),
      ) <= ROUNDING_TOLERANCE_KM,
    { message: "Line totals must match the sum by status", path: ["lines", "total"] },
  )
  .refine(
    ({ stations }) =>
      stations.total ===
      stations.byStatus.active + stations.byStatus.disused + stations.byStatus.abandoned,
    { message: "Station total must match the sum by status", path: ["stations", "total"] },
  );

export type Stats = z.infer<typeof statsSchema>;
