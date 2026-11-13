import type mapboxgl from "mapbox-gl";
import { routeProgress, routeRevealed, trimOffset, type ChapterProgress } from "@/lib/progress";
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
 * - Animated: earlier chapters stay drawn, the active one follows the scroll (`line-trim-offset`), later ones
 *   are hidden.
 * - Reduced motion: no scrub. A route is hidden until its chapter is reached and then fades in whole (opacity,
 *   not movement). `prefersReducedMotion` is asked on every call, so it follows the setting if it changes
 *   while the page is open.
 */
export function createRouteUpdater(
  map: mapboxgl.Map,
  chapterIds: readonly string[],
  routeChapterIds: readonly string[],
  prefersReducedMotion: () => boolean,
) {
  const trims = new Map<string, number>();
  const opacities = new Map<string, number>();
  const setIfChanged = (
    cache: Map<string, number>,
    id: string,
    value: number,
    apply: () => void,
  ) => {
    if (cache.get(id) === value) return;
    cache.set(id, value);
    apply();
  };

  return (state: ChapterProgress) => {
    const reduced = prefersReducedMotion();
    for (const chapterId of routeChapterIds) {
      const layer = routeLayerId(chapterId);
      const index = chapterIds.indexOf(chapterId);
      // Reduced motion: the line is always whole and only its opacity changes.
      const trim = reduced ? 1 : routeProgress(index, state);
      const opacity = reduced && !routeRevealed(index, state.index) ? 0 : 1;
      setIfChanged(trims, chapterId, trim, () =>
        map.setPaintProperty(layer, "line-trim-offset", trimOffset(trim)),
      );
      setIfChanged(opacities, chapterId, opacity, () =>
        map.setPaintProperty(layer, "line-opacity", opacity),
      );
    }
  };
}
