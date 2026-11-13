import type mapboxgl from "mapbox-gl";
import { DIMMED_STATUS_OPACITY, emphasizedStatuses, type MapChapter } from "@/lib/chapter-map";
import type { ChapterProgress } from "@/lib/progress";
import type { Status } from "@/shared/schemas/geo";

type OpacityProperty = "line-opacity" | "circle-opacity" | "circle-stroke-opacity" | "text-opacity";

// Every layer that draws data by status, and the paint properties that carry its opacity.
const FADEABLE: { layer: string; properties: OpacityProperty[] }[] = [
  { layer: "lines-historic", properties: ["line-opacity"] },
  { layer: "lines-active", properties: ["line-opacity"] },
  { layer: "stations", properties: ["circle-opacity", "circle-stroke-opacity"] },
  { layer: "station-names", properties: ["text-opacity"] },
];

/** Full opacity for the chosen statuses, faded for the rest. */
const byStatus = (statuses: readonly Status[]): mapboxgl.ExpressionSpecification => [
  "case",
  ["in", ["get", "status"], ["literal", [...statuses]]],
  1,
  DIMMED_STATUS_OPACITY,
];

/**
 * In a `status` chapter, fades every line and station whose status is not the chosen one (which statuses is
 * decided by `emphasizedStatuses`). Outside those chapters everything goes back to full opacity. It only touches
 * the map when the set of statuses changes, and the change is an opacity transition, which reduced motion allows.
 */
export function createStatusUpdater(map: mapboxgl.Map, chapters: readonly MapChapter[]) {
  let current = "";
  return (state: ChapterProgress) => {
    const statuses = emphasizedStatuses(chapters, state.index);
    const key = statuses?.join(",") ?? "";
    if (key === current) return;
    current = key;
    const value = statuses ? byStatus(statuses) : 1;
    for (const { layer, properties } of FADEABLE) {
      for (const property of properties) map.setPaintProperty(layer, property, value);
    }
  };
}
