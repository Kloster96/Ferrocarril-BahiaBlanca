export type LatLon = { lat: number; lon: number };

const EARTH_RADIUS_METERS = 6_371_000;
const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

/** Great-circle distance between two points, in metres (haversine formula). */
export function haversineMeters(a: LatLon, b: LatLon): number {
  const dLat = toRadians(b.lat - a.lat);
  const dLon = toRadians(b.lon - a.lon);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(a.lat)) * Math.cos(toRadians(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.sqrt(h));
}

/** Centre of the bounding box of a set of points. Precise enough for building-sized footprints. */
export function boundingBoxCenter(points: readonly LatLon[]): LatLon {
  if (points.length === 0) throw new Error("boundingBoxCenter needs at least one point.");
  const lats = points.map((point) => point.lat);
  const lons = points.map((point) => point.lon);
  return {
    lat: (Math.min(...lats) + Math.max(...lats)) / 2,
    lon: (Math.min(...lons) + Math.max(...lons)) / 2,
  };
}

const METERS_PER_DEGREE = 111_320;

/**
 * Douglas-Peucker: drops the vertices that stay within `toleranceMeters` of the straight line between the
 * ones kept. The first and last vertex are always kept (the Phase 3 merge chains lines by their end nodes).
 *
 * Distances are measured on a local flat projection (longitude scaled by cos(latitude)). At the size of one
 * partido the error against true great-circle distance is far below any tolerance we would choose.
 */
export function simplifyLine(
  points: readonly [number, number][],
  toleranceMeters: number,
): [number, number][] {
  if (points.length <= 2) return [...points];
  const lonScale = Math.cos(toRadians(points[0]![1]));
  const tolerance = toleranceMeters / METERS_PER_DEGREE;
  const flat = points.map(([lon, lat]) => [lon * lonScale, lat] as const);

  const keep = new Array<boolean>(points.length).fill(false);
  keep[0] = keep[points.length - 1] = true;
  // Explicit stack instead of recursion: a coastline can have thousands of vertices.
  const stack: [number, number][] = [[0, points.length - 1]];
  while (stack.length > 0) {
    const [from, to] = stack.pop()!;
    let farthest = -1;
    let farthestDistance = tolerance;
    for (let i = from + 1; i < to; i++) {
      const distance = distanceToSegment(flat[i]!, flat[from]!, flat[to]!);
      if (distance > farthestDistance) {
        farthest = i;
        farthestDistance = distance;
      }
    }
    if (farthest === -1) continue;
    keep[farthest] = true;
    stack.push([from, farthest], [farthest, to]);
  }
  return points.filter((_, index) => keep[index]);
}

function distanceToSegment(
  p: readonly [number, number],
  a: readonly [number, number],
  b: readonly [number, number],
): number {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const lengthSquared = dx * dx + dy * dy;
  // a === b (a closed ring's two ends): plain distance to that point.
  const t =
    lengthSquared === 0
      ? 0
      : Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / lengthSquared));
  return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy));
}
