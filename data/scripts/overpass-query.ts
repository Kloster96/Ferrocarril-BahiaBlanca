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
 * Builds the Overpass QL query for every railway line and station inside the union of the given
 * administrative areas, including those that are disused, abandoned or razed (both
 * `railway=abandoned` and `abandoned:railway=rail` styles).
 *
 * Stations use `nwr` (node, way or relation) because OSM mappers draw them as points or as areas.
 * Old stations are not always tagged `railway=station`, so we also match `historic=railway_station`
 * and `building=train_station`. The latter returns building footprints that duplicate a station
 * node a few metres away: they are kept raw here and merged by proximity during cleaning.
 */
export function buildQuery(areaRelationIds: readonly number[], timeoutSeconds = 120): string {
  if (areaRelationIds.length === 0) {
    throw new Error("buildQuery needs at least one area relation id.");
  }
  // The ids are interpolated into the query text, so reject anything that is not a plain positive integer.
  for (const id of areaRelationIds) {
    if (!Number.isSafeInteger(id) || id <= 0) {
      throw new Error(`Invalid OSM relation id: ${String(id)}`);
    }
  }

  const areaSets = areaRelationIds.map(
    (id, index) => `area(id:${AREA_ID_OFFSET + id})->.a${index};`,
  );
  const union = `(${areaRelationIds.map((_, index) => `area.a${index};`).join(" ")})->.a;`;

  return [
    `[out:json][timeout:${timeoutSeconds}];`,
    ...areaSets,
    union,
    "(",
    `  way(area.a)["railway"~"${alternation(LINE_VALUES)}"];`,
    `  way(area.a)[~"${LIFECYCLE_KEY}"~"^rail$"];`,
    `  nwr(area.a)["railway"~"${alternation(STATION_VALUES)}"];`,
    `  nwr(area.a)[~"${LIFECYCLE_KEY}"~"${alternation(STATION_VALUES)}"];`,
    `  nwr(area.a)["historic"="railway_station"];`,
    `  nwr(area.a)["building"="train_station"];`,
    ");",
    // `geom` returns coordinates for every way, so no second request is needed to resolve nodes.
    "out geom;",
  ].join("\n");
}
