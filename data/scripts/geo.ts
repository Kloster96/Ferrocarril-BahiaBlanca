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
