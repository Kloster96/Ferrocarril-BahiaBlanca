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
