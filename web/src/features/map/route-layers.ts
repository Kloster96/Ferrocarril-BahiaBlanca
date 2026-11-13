import type mapboxgl from "mapbox-gl";
import { routeLooks, type MapChapter } from "@/lib/chapter-map";
import { trimOffset, type ChapterProgress } from "@/lib/progress";
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
 * Applies the story state to the routes. Returns a function to call on every state change; it touches the map
 * only for the values that actually changed, because every setPaintProperty makes Mapbox redraw.
 *
 * What each route looks like for each chapter type is decided in `routeLooks` (pure, tested). This only
 * carries it to Mapbox: how much of the line is drawn (`line-trim-offset`) and how opaque it is.
 * `prefersReducedMotion` is asked on every call, so it follows the setting if it changes while the page is open.
 */
export function createRouteUpdater(
  map: mapboxgl.Map,
  chapters: readonly MapChapter[],
  prefersReducedMotion: () => boolean,
) {
  const drawn = new Map<string, number>();
  const opacities = new Map<string, number>();

  return (state: ChapterProgress) => {
    for (const [chapterId, look] of routeLooks(chapters, state, prefersReducedMotion())) {
      const layer = routeLayerId(chapterId);
      if (drawn.get(chapterId) !== look.drawn) {
        drawn.set(chapterId, look.drawn);
        map.setPaintProperty(layer, "line-trim-offset", trimOffset(look.drawn));
      }
      if (opacities.get(chapterId) !== look.opacity) {
        opacities.set(chapterId, look.opacity);
        map.setPaintProperty(layer, "line-opacity", look.opacity);
      }
    }
  };
}
