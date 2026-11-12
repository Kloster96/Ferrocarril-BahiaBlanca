import { simplifyLine } from "./geo.ts";

/** The two partidos the story covers (OSM relation ids). Must match the areas in extract-osm.ts. */
export const AREA_RELATION_IDS = [2582799, 2584648] as const;

export type Position = [number, number];
type Member = {
  type: string;
  ref: number;
  role: string;
  geometry?: { lat: number; lon: number }[];
};
export type AreaRelation = { type: "relation"; id: number; members: Member[] };

export function buildAreaQuery(relationIds: readonly number[], timeoutSeconds = 90): string {
  for (const id of relationIds) {
    if (!Number.isSafeInteger(id) || id <= 0)
      throw new Error(`Invalid OSM relation id: ${String(id)}`);
  }
  // `out geom` puts the coordinates inside each member way: no second request to resolve nodes.
  return `[out:json][timeout:${timeoutSeconds}];\nrel(id:${relationIds.join(",")});\nout geom;`;
}

const key = ([lon, lat]: Position) => `${lon},${lat}`;

/**
 * Builds the outline of the union of the partidos as closed rings (GeoJSON exterior rings).
 *
 * A relation's boundary is a set of ways. The border the two partidos share is the same way in both
 * relations, so a way that appears twice is interior to the union and is dropped; what is left is the
 * outer outline. The remaining ways are then chained end to end into closed rings.
 */
export function buildOuterRings(relations: readonly AreaRelation[]): Position[][] {
  const ways = new Map<number, { count: number; line: Position[] }>();
  for (const relation of relations) {
    for (const member of relation.members) {
      if (member.type !== "way" || member.role !== "outer") continue;
      if (!member.geometry || member.geometry.length < 2) {
        throw new Error(`Relation ${relation.id}: way ${member.ref} has no geometry.`);
      }
      const known = ways.get(member.ref);
      if (known) known.count++;
      else {
        ways.set(member.ref, {
          count: 1,
          line: member.geometry.map((p): Position => [p.lon, p.lat]),
        });
      }
    }
  }

  // Index the loose ends so each step finds the way that continues the chain.
  const pending = [...ways.values()].filter((w) => w.count === 1).map((w) => w.line);
  const byEnd = new Map<string, number[]>();
  pending.forEach((line, index) => {
    for (const end of [line[0]!, line.at(-1)!]) {
      byEnd.set(key(end), [...(byEnd.get(key(end)) ?? []), index]);
    }
  });

  const used = new Set<number>();
  const rings: Position[][] = [];
  for (let start = 0; start < pending.length; start++) {
    if (used.has(start)) continue;
    used.add(start);
    const ring = [...pending[start]!];
    while (key(ring[0]!) !== key(ring.at(-1)!)) {
      const tail = key(ring.at(-1)!);
      const next = (byEnd.get(tail) ?? []).find((index) => !used.has(index));
      if (next === undefined) throw new Error(`Boundary does not close near ${tail}.`);
      used.add(next);
      const line = pending[next]!;
      // A way may be stored in either direction: flip it when its far end is the one that connects.
      ring.push(...(key(line[0]!) === tail ? line : [...line].reverse()).slice(1));
    }
    rings.push(ring);
  }
  return rings;
}

/** Shoelace formula on lon/lat degrees. Only the sign (winding) matters, not the magnitude. */
export function signedArea(ring: readonly Position[]): number {
  let sum = 0;
  for (let i = 0; i < ring.length - 1; i++) {
    sum += ring[i]![0] * ring[i + 1]![1] - ring[i + 1]![0] * ring[i]![1];
  }
  return sum / 2;
}

/** RFC 7946: exterior rings counter-clockwise. */
export const counterClockwise = (ring: Position[]): Position[] =>
  signedArea(ring) < 0 ? [...ring].reverse() : ring;

// The Web Mercator limit: Mapbox cannot draw beyond ±85.05° of latitude.
const WORLD: Position[] = [
  [-180, -85],
  [180, -85],
  [180, 85],
  [-180, 85],
  [-180, -85],
];

/**
 * The two shapes the map needs, precomputed here so web/ does no geometry (see CLAUDE.md):
 * - `area`: the study area, to draw its border.
 * - `mask`: the whole world with the area cut out as holes, to dim everything outside it.
 */
export function buildAreaFeatures(rings: readonly Position[][]) {
  const exterior = rings.map(counterClockwise);
  // RFC 7946: holes run clockwise, the opposite of the exterior ring.
  const holes = exterior.map((ring) => [...ring].reverse());
  return [
    {
      type: "Feature" as const,
      geometry: { type: "MultiPolygon" as const, coordinates: exterior.map((ring) => [ring]) },
      properties: { kind: "area" as const },
    },
    {
      type: "Feature" as const,
      geometry: { type: "Polygon" as const, coordinates: [WORLD, ...holes] },
      properties: { kind: "mask" as const },
    },
  ];
}

/**
 * Simplifies closed rings and drops the ones that collapse. A ring is split in two at its farthest vertex
 * before simplifying: Douglas-Peucker needs two distinct ends and a ring's ends are the same point.
 * Islets smaller than the tolerance disappear, which is the intent: at the zoom of this map they are noise.
 */
export function simplifyRings(rings: readonly Position[][], toleranceMeters: number): Position[][] {
  const result: Position[][] = [];
  for (const ring of rings) {
    const open = ring.slice(0, -1);
    const first = open[0]!;
    let split = 0;
    let best = -1;
    open.forEach(([lon, lat], index) => {
      const distance = Math.hypot(lon - first[0], lat - first[1]);
      if (distance > best) {
        best = distance;
        split = index;
      }
    });
    const a = simplifyLine(open.slice(0, split + 1), toleranceMeters);
    const b = simplifyLine([...open.slice(split), first], toleranceMeters);
    const simplified = [...a, ...b.slice(1)];
    if (simplified.length >= 4) result.push(simplified);
  }
  return result;
}
