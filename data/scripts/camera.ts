type Position = [number, number];

export type Camera = { center: [number, number]; zoom: number };

// Mapbox GL JS draws the world on 512 px tiles: at zoom z it is 512 * 2^z pixels wide.
const TILE_SIZE = 512;
// The route must fit in a square this big, whatever the screen: it is the part of a phone that stays free
// (390 px wide minus about 25 px of margin per side), and a desktop has more room, so there the route simply has margin.
const FIT_PIXELS = 340;
const MIN_ZOOM = 6;
const MAX_ZOOM = 14;

const mercatorY = (latitude: number) =>
  Math.log(Math.tan(Math.PI / 4 + (latitude * Math.PI) / 360));

/**
 * Where the camera goes for a chapter (a route or a zone): the centre of the route's bounding box and the zoom that fits the
 * whole box in FIT_PIXELS. Computed here so that web/ only has to call flyTo with two numbers, instead of
 * measuring geometry at runtime (see CLAUDE.md, "Decisiones de diseño").
 *
 * `maxZoom` caps how close it gets: a lone station has no extent, and a zone should show its surroundings.
 *
 * Latitude is measured in Web Mercator, which is how the map is drawn: a degree of latitude is taller than a
 * degree of longitude is wide, more so the farther from the equator.
 */
export function cameraFor(coordinates: readonly Position[], maxZoom = MAX_ZOOM): Camera {
  if (coordinates.length === 0) throw new Error("cameraFor needs at least one coordinate.");
  const lons = coordinates.map(([lon]) => lon);
  const lats = coordinates.map(([, lat]) => lat);
  const [west, east] = [Math.min(...lons), Math.max(...lons)];
  const [south, north] = [Math.min(...lats), Math.max(...lats)];

  const spanX = (east - west) / 360;
  const spanY = (mercatorY(north) - mercatorY(south)) / (2 * Math.PI);
  const span = Math.max(spanX, spanY);

  // A single point has no extent: use the closest zoom instead of dividing by zero.
  const fit = span === 0 ? maxZoom : Math.log2(FIT_PIXELS / (TILE_SIZE * span));
  // Rounded down to a tenth: round up and the route would poke out of the frame.
  const zoom = Math.floor(Math.min(maxZoom, Math.max(MIN_ZOOM, fit)) * 10) / 10;
  // Six decimals are about 10 cm: the rest is noise in a committed file.
  const round = (value: number) => Math.round(value * 1e6) / 1e6;
  return { center: [round((west + east) / 2), round((south + north) / 2)], zoom };
}
