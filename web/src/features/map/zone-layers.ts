import type mapboxgl from "mapbox-gl";
import { highlightedStations, type MapChapter } from "@/lib/chapter-map";
import type { ChapterProgress } from "@/lib/progress";
import { ROUTE_COLOR } from "./constants";

export const ZONE_LAYER_ID = "stations-zone";

/**
 * A halo around the stations of the active zone chapter. It reuses the `stations` source and picks stations by
 * their OSM id. It starts invisible and matching nothing; `createZoneUpdater` shows it.
 */
export function addZoneLayer(map: mapboxgl.Map, beforeId: string): void {
  map.addLayer(
    {
      id: ZONE_LAYER_ID,
      type: "circle",
      source: "stations",
      filter: ["in", ["get", "id"], ["literal", []]],
      paint: {
        "circle-color": ROUTE_COLOR,
        "circle-radius": ["interpolate", ["linear"], ["zoom"], 8, 10, 12, 16, 14, 22],
        "circle-opacity": 0,
        "circle-stroke-color": ROUTE_COLOR,
        "circle-stroke-width": 2,
        "circle-stroke-opacity": 0,
      },
    },
    beforeId,
  );
}

/**
 * Highlights the stations of the active chapter's zone (which stations is decided by `highlightedStations`).
 * It fades in and out through opacity, which Mapbox transitions and which reduced motion allows. On the way out
 * the filter is left as it was, so the halo fades where it was and does not blink onto other stations.
 */
export function createZoneUpdater(
  map: mapboxgl.Map,
  chapters: readonly MapChapter[],
  zones: ReadonlyMap<string, readonly string[]>,
) {
  let current = "";
  return (state: ChapterProgress) => {
    const ids = highlightedStations(chapters, state.index, zones);
    const key = ids.join(",");
    if (key === current) return;
    current = key;
    const visible = ids.length > 0;
    if (visible) map.setFilter(ZONE_LAYER_ID, ["in", ["get", "id"], ["literal", [...ids]]]);
    map.setPaintProperty(ZONE_LAYER_ID, "circle-opacity", visible ? 0.25 : 0);
    map.setPaintProperty(ZONE_LAYER_ID, "circle-stroke-opacity", visible ? 1 : 0);
  };
}
