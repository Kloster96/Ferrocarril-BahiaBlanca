// Overpass adds 3_600_000_000 to a relation id to get the id of the area derived from it.
const AREA_ID_OFFSET = 3_600_000_000;

// Lifecycle prefixes OSM uses for things that no longer operate: `disused:railway=rail`, etc.
const LIFECYCLE_PREFIXES = ["disused", "abandoned", "razed"] as const;

// Values of the `railway` key that describe track. `abandoned`/`disused`/`razed` are the lifecycle
// states OSM stores directly in `railway=*`. This is a historical project: we keep all of them.
const LINE_VALUES = ["rail", ...LIFECYCLE_PREFIXES] as const;

const STATION_VALUES = ["station", "halt"] as const;

// Matches `disused:railway`, `abandoned:railway` and `razed:railway` keys.
const LIFECYCLE_KEY = `^(${LIFECYCLE_PREFIXES.join("|")}):railway$`;

const alternation = (values: readonly string[]) => `^(${values.join("|")})$`;

/**
 * Builds the Overpass QL query for every railway line and station in an administrative area,
 * including those that are disused, abandoned or razed (both `railway=abandoned` and
 * `abandoned:railway=rail` styles).
 *
 * Stations use `nwr` (node, way or relation) because OSM mappers draw them as points or as areas.
 */
export function buildQuery(areaRelationId: number, timeoutSeconds = 120): string {
  const area = AREA_ID_OFFSET + areaRelationId;

  return [
    `[out:json][timeout:${timeoutSeconds}];`,
    `area(id:${area})->.a;`,
    "(",
    `  way(area.a)["railway"~"${alternation(LINE_VALUES)}"];`,
    `  way(area.a)[~"${LIFECYCLE_KEY}"~"^rail$"];`,
    `  nwr(area.a)["railway"~"${alternation(STATION_VALUES)}"];`,
    `  nwr(area.a)[~"${LIFECYCLE_KEY}"~"${alternation(STATION_VALUES)}"];`,
    ");",
    // `geom` returns coordinates for every way, so no second request is needed to resolve nodes.
    "out geom;",
  ].join("\n");
}
