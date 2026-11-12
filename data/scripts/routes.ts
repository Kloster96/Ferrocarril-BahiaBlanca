import type { LineFeature } from "./clean.ts";

type Position = [number, number];

export type RouteInput = { chapterId: string; wayIds: readonly string[] };

export type MergedRoute = {
  chapterId: string;
  wayIds: string[];
  coordinates: Position[];
};

/**
 * Joins the ways of one chapter into a single continuous line.
 *
 * Two consecutive ways connect when they share the OSM node at one end (`startNodeId`/`endNodeId` in
 * data/out/lines.geojson). No distance tolerance is used: every line carries its end node ids, so a match
 * by node is exact and a near miss is a real gap that someone must look at.
 *
 * The direction of a way in OSM is arbitrary, so a reversed way is not an error: it is flipped to continue the
 * route. The only failures are an unknown way and a real gap, and both name the chapter and the OSM ids.
 */
export function mergeRoute(
  route: RouteInput,
  lines: ReadonlyMap<string, LineFeature>,
): MergedRoute {
  if (route.wayIds.length === 0) throw new Error(`${route.chapterId}: the route has no ways.`);

  const ways = route.wayIds.map((id) => {
    const line = lines.get(id);
    if (!line) {
      throw new Error(`${route.chapterId}: ${id} does not exist in data/out/lines.geojson.`);
    }
    return line;
  });

  const first = ways[0]!;
  let coordinates: Position[] = [...first.geometry.coordinates];
  let tail = first.properties.endNodeId;

  if (ways.length > 1) {
    // The first way has no predecessor: its orientation is the one that leaves its end facing the next way.
    const next = ways[1]!.properties;
    const touches = (node: number) => node === next.startNodeId || node === next.endNodeId;
    if (!touches(first.properties.endNodeId)) {
      if (!touches(first.properties.startNodeId)) {
        throw gap(route.chapterId, first.properties.id, next.id);
      }
      coordinates.reverse();
      tail = first.properties.startNodeId;
    }
  }

  for (let i = 1; i < ways.length; i++) {
    const way = ways[i]!;
    let part: Position[];
    if (way.properties.startNodeId === tail) {
      part = way.geometry.coordinates;
      tail = way.properties.endNodeId;
    } else if (way.properties.endNodeId === tail) {
      part = [...way.geometry.coordinates].reverse();
      tail = way.properties.startNodeId;
    } else {
      throw gap(route.chapterId, ways[i - 1]!.properties.id, way.properties.id);
    }
    // Both ways meet on the same node, so that point repeats: keep it once.
    coordinates = [...coordinates, ...part.slice(1)];
  }

  return { chapterId: route.chapterId, wayIds: [...route.wayIds], coordinates };
}

const gap = (chapterId: string, from: string, to: string) =>
  new Error(`${chapterId}: ${from} and ${to} do not share an end node (gap in the route).`);

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
 * Where the camera goes for a chapter: the centre of the route's bounding box and the zoom that fits the
 * whole box in FIT_PIXELS. Computed here so that web/ only has to call flyTo with two numbers, instead of
 * measuring geometry at runtime (see CLAUDE.md, "Decisiones de diseño").
 *
 * Latitude is measured in Web Mercator, which is how the map is drawn: a degree of latitude is taller than a
 * degree of longitude is wide, more so the farther from the equator.
 */
export function cameraFor(coordinates: readonly Position[]): Camera {
  if (coordinates.length === 0) throw new Error("cameraFor needs at least one coordinate.");
  const lons = coordinates.map(([lon]) => lon);
  const lats = coordinates.map(([, lat]) => lat);
  const [west, east] = [Math.min(...lons), Math.max(...lons)];
  const [south, north] = [Math.min(...lats), Math.max(...lats)];

  const spanX = (east - west) / 360;
  const spanY = (mercatorY(north) - mercatorY(south)) / (2 * Math.PI);
  const span = Math.max(spanX, spanY);

  // A single point has no extent: use the closest zoom instead of dividing by zero.
  const fit = span === 0 ? MAX_ZOOM : Math.log2(FIT_PIXELS / (TILE_SIZE * span));
  // Rounded down to a tenth: round up and the route would poke out of the frame.
  const zoom = Math.floor(Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, fit)) * 10) / 10;
  // Six decimals are about 10 cm: the rest is noise in a committed file.
  const round = (value: number) => Math.round(value * 1e6) / 1e6;
  return { center: [round((west + east) / 2), round((south + north) / 2)], zoom };
}
