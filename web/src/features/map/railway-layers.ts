import type mapboxgl from "mapbox-gl";
import { OSM_ATTRIBUTION, STATUS_COLOR } from "./constants";
import type { GeoData } from "./use-geo-data";

const statusColor: mapboxgl.ExpressionSpecification = [
  "match",
  ["get", "status"],
  "active",
  STATUS_COLOR.active,
  "disused",
  STATUS_COLOR.disused,
  STATUS_COLOR.abandoned,
];

const lineWidth: mapboxgl.ExpressionSpecification = [
  "interpolate",
  ["linear"],
  ["zoom"],
  8,
  1,
  13,
  3.5,
];

/**
 * One source per resource. Lines that are not active are dashed, drawn in their own layer because
 * `line-dasharray` cannot depend on feature data. Features flagged `needsReview` are drawn like the rest:
 * hiding them would hide history.
 */
export function addRailwayLayers(map: mapboxgl.Map, { lines, stations }: GeoData): void {
  map.addSource("lines", { type: "geojson", data: lines, attribution: OSM_ATTRIBUTION });
  map.addSource("stations", { type: "geojson", data: stations, attribution: OSM_ATTRIBUTION });

  map.addLayer({
    id: "lines-historic",
    type: "line",
    source: "lines",
    filter: ["!=", ["get", "status"], "active"],
    layout: { "line-cap": "butt", "line-join": "round" },
    paint: { "line-color": statusColor, "line-width": lineWidth, "line-dasharray": [2, 2] },
  });
  map.addLayer({
    id: "lines-active",
    type: "line",
    source: "lines",
    filter: ["==", ["get", "status"], "active"],
    layout: { "line-cap": "round", "line-join": "round" },
    paint: { "line-color": statusColor, "line-width": lineWidth },
  });
  map.addLayer({
    id: "stations",
    type: "circle",
    source: "stations",
    paint: {
      "circle-color": statusColor,
      "circle-radius": ["interpolate", ["linear"], ["zoom"], 8, 3, 13, 6],
      "circle-stroke-color": "#ffffff",
      "circle-stroke-width": 1.5,
    },
  });
  map.addLayer({
    id: "station-names",
    type: "symbol",
    source: "stations",
    minzoom: 11,
    layout: {
      "text-field": ["coalesce", ["get", "name"], ""],
      "text-size": 12,
      "text-offset": [0, 1],
      "text-anchor": "top",
    },
    paint: { "text-color": "#1f2937", "text-halo-color": "#ffffff", "text-halo-width": 1.5 },
  });
}
