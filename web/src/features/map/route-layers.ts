import type mapboxgl from "mapbox-gl";
import { routeProgress, trimOffset, type ChapterProgress } from "@/lib/progress";
import type { RoutesCollection } from "@/shared/schemas/route";
import { OSM_ATTRIBUTION, ROUTE_COLOR } from "./constants";

export const routeLayerId = (chapterId: string) => `route-${chapterId}`;

/**
 * Adds the chapters' routes, drawn progressively with `line-trim-offset`.
 *
 * - The source needs `lineMetrics: true`: the trim is measured along the line.
 * - One layer per route: `line-trim-offset` is a layer property, so a single layer would trim every route
 *   by the same amount.
 * - Every layer starts fully hidden (`[0, 1]` hides the whole line, verified on mapbox-gl 3.34.2).
 * - They go below the stations, so a station is never covered by the line that reaches it.
 */
export function addRouteLayers(
  map: mapboxgl.Map,
  routes: RoutesCollection,
  beforeId: string,
): void {
  map.addSource("routes", {
    type: "geojson",
    data: routes,
    lineMetrics: true,
    attribution: OSM_ATTRIBUTION,
  });
  for (const { properties } of routes.features) {
    map.addLayer(
      {
        id: routeLayerId(properties.chapterId),
        type: "line",
        source: "routes",
        filter: ["==", ["get", "chapterId"], properties.chapterId],
        layout: { "line-cap": "round", "line-join": "round" },
        paint: {
          "line-color": ROUTE_COLOR,
          "line-width": ["interpolate", ["linear"], ["zoom"], 8, 3, 13, 7],
          "line-trim-offset": trimOffset(0),
        },
      },
      beforeId,
    );
  }
}

/**
 * Applies the story state to the routes: earlier chapters stay drawn, the active one follows the scroll and
 * later ones are hidden. Returns a function to call on every state change; it touches the map only for the
 * layers whose value actually changed, because every setPaintProperty makes Mapbox redraw.
 */
export function createRouteUpdater(
  map: mapboxgl.Map,
  chapterIds: readonly string[],
  routeChapterIds: readonly string[],
) {
  const drawn = new Map<string, number>();
  return (state: ChapterProgress) => {
    for (const chapterId of routeChapterIds) {
      const progress = routeProgress(chapterIds.indexOf(chapterId), state);
      if (drawn.get(chapterId) === progress) continue;
      drawn.set(chapterId, progress);
      map.setPaintProperty(routeLayerId(chapterId), "line-trim-offset", trimOffset(progress));
    }
  };
}
