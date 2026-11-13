import { cameraFor, type Camera } from "./camera.ts";
import type { StationFeature } from "./clean.ts";

export type ZoneInput = { chapterId: string; stationIds: readonly string[] };

export type BuiltZone = {
  chapterId: string;
  stationIds: string[];
  coordinates: [number, number][];
  camera: Camera;
};

/**
 * A zone chapter shows a place and its surroundings, so the camera never gets closer than this even when the
 * zone is a single station. At 12.5 the station names (they appear from zoom 11) are all readable.
 */
export const ZONE_MAX_ZOOM = 12.5;

/**
 * Resolves the stations of a zone and works out where the camera goes. Fails, naming the chapter and the OSM id,
 * on an empty zone, a repeated station or a station that is not in data/out/stations.geojson: a typo in a
 * curated file must break the build, not show an empty map.
 */
export function buildZone(
  zone: ZoneInput,
  stations: ReadonlyMap<string, StationFeature>,
): BuiltZone {
  if (zone.stationIds.length === 0) throw new Error(`${zone.chapterId}: the zone has no stations.`);
  if (new Set(zone.stationIds).size !== zone.stationIds.length) {
    throw new Error(`${zone.chapterId}: the zone repeats a station.`);
  }

  const coordinates = zone.stationIds.map((id) => {
    const station = stations.get(id);
    if (!station) {
      throw new Error(`${zone.chapterId}: ${id} does not exist in data/out/stations.geojson.`);
    }
    return station.geometry.coordinates;
  });

  return {
    chapterId: zone.chapterId,
    stationIds: [...zone.stationIds],
    coordinates,
    camera: cameraFor(coordinates, ZONE_MAX_ZOOM),
  };
}
