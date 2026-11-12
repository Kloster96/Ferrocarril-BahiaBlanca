// Statistics computed from the cleaned GeoJSON. They live in data/ (not in web/) on purpose: /api/stats
// only validates and serves data/out/stats.json, so no geometry code is shared with the client.
import type { LineFeature, StationFeature, Status } from "./clean.ts";
import { haversineMeters } from "./geo.ts";

export const STATUSES: readonly Status[] = ["active", "disused", "abandoned"];

export type StatusStats<T> = Record<Status, T>;

export type Stats = {
  lines: {
    total: { count: number; trackKm: number };
    byStatus: StatusStats<{ count: number; trackKm: number }>;
  };
  stations: {
    total: number;
    byStatus: StatusStats<number>;
  };
};

/** Length of a LineString in metres, summing the great-circle distance between consecutive vertices. */
export function lineLengthMeters(coordinates: readonly [number, number][]): number {
  let total = 0;
  for (let i = 1; i < coordinates.length; i++) {
    const [lonA, latA] = coordinates[i - 1] as [number, number];
    const [lonB, latB] = coordinates[i] as [number, number];
    total += haversineMeters({ lat: latA, lon: lonA }, { lat: latB, lon: lonB });
  }
  return total;
}

// Metres kept with 3 decimals of km: precision far below what OSM geometry supports, and stable in diffs.
const toKm = (metres: number) => Math.round(metres) / 1000;

/**
 * `trackKm` is the sum of the length of every mapped way. It is NOT the length of the route: where OSM maps
 * double track or sidings as separate ways, each one counts.
 */
export function computeStats(
  lines: readonly LineFeature[],
  stations: readonly StationFeature[],
): Stats {
  const lineMetres = Object.fromEntries(STATUSES.map((s) => [s, 0])) as StatusStats<number>;
  const lineCount = Object.fromEntries(STATUSES.map((s) => [s, 0])) as StatusStats<number>;
  const stationCount = Object.fromEntries(STATUSES.map((s) => [s, 0])) as StatusStats<number>;

  for (const line of lines) {
    const status = line.properties.status;
    lineCount[status] += 1;
    lineMetres[status] += lineLengthMeters(line.geometry.coordinates);
  }
  for (const station of stations) {
    stationCount[station.properties.status] += 1;
  }

  const byStatus = Object.fromEntries(
    STATUSES.map((s) => [s, { count: lineCount[s], trackKm: toKm(lineMetres[s]) }]),
  ) as StatusStats<{ count: number; trackKm: number }>;

  return {
    lines: {
      total: {
        count: lines.length,
        trackKm: toKm(STATUSES.reduce((sum, s) => sum + lineMetres[s], 0)),
      },
      byStatus,
    },
    stations: { total: stations.length, byStatus: stationCount },
  };
}
