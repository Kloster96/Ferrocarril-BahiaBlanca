// Turns the raw Overpass snapshot into clean line and station features.
//
// Rules that come from the project, not from technical convenience:
//  - Nothing historical is dropped: disused, abandoned and razed things stay, with a normalized `status`.
//  - Stations are NEVER merged by name. Different companies had separate stations in the same town,
//    so "Bajo Hondo" and "Bajo Hondo (FCRPB)" may both be real. The only merge is a building footprint
//    with the station it belongs to, a few metres away.
//  - Doubtful cases stay separate and carry `needsReview` + `reviewReasons` for a human to verify.
//  - Company-related tags (operator, network...) are kept: they will probably organize the chapters.
//  - Missing data is `null`. Nothing is invented. A tagging this script does not understand throws
//    instead of being guessed.
import { boundingBoxCenter, haversineMeters, type LatLon } from "./geo.ts";

/** A footprint is only merged with a station closer than this. Observed distances were 4-18 m. */
export const MERGE_RADIUS_METERS = 30;

export type Status = "active" | "disused" | "abandoned";

export type OsmElement = {
  type: "node" | "way" | "relation";
  id: number;
  tags?: Record<string, string>;
  lat?: number;
  lon?: number;
  geometry?: LatLon[];
};

type Tags = Record<string, string>;

type Common = {
  id: string;
  status: Status;
  osmTag: string;
  name: string | null;
  operator: string | null;
  network: string | null;
  description: string | null;
  companyTags: Tags;
  needsReview: boolean;
  reviewReasons: string[];
};

export type LineProperties = Common & {
  ref: string | null;
  gauge: string | null;
  service: string | null;
  usage: string | null;
  bridge: string | null;
};

export type StationProperties = Common & {
  kind: "station" | "halt";
  altName: string | null;
  oldNames: { name: string; period: string }[];
  startDate: string | null;
  wikidata: string | null;
  wikipedia: string | null;
  /** Ids of building footprints merged into this station by proximity. */
  mergedFrom: string[];
};

export type LineFeature = {
  type: "Feature";
  geometry: { type: "LineString"; coordinates: [number, number][] };
  properties: LineProperties;
};

export type StationFeature = {
  type: "Feature";
  geometry: { type: "Point"; coordinates: [number, number] };
  properties: StationProperties;
};

const LIFECYCLE_KEY = /^(disused|abandoned|razed):railway$/;
const LIFECYCLE_STATUS = {
  disused: "disused",
  abandoned: "abandoned",
  razed: "abandoned",
} as const;
type LifecycleState = keyof typeof LIFECYCLE_STATUS;

// Keys that say which company ran or owned something. Kept verbatim beyond operator/network.
const COMPANY_KEY = /^(operator|network|owner|brand)(:|$)/;

const elementId = (element: OsmElement) => `${element.type}/${element.id}`;
const tagsOf = (element: OsmElement): Tags => element.tags ?? {};

function lifecycleOf(tags: Tags): { state: LifecycleState; key: string; value: string } | null {
  for (const [key, value] of Object.entries(tags)) {
    const match = LIFECYCLE_KEY.exec(key);
    if (match) return { state: match[1] as LifecycleState, key, value };
  }
  return null;
}

function common(element: OsmElement, status: Status, osmTag: string, reasons: string[]): Common {
  const tags = tagsOf(element);
  const companyTags: Tags = {};
  for (const [key, value] of Object.entries(tags)) {
    // operator and network have their own field; everything else about the company goes here.
    if (COMPANY_KEY.test(key) && key !== "operator" && key !== "network") companyTags[key] = value;
  }
  if (tags.fixme) reasons.push(`OSM fixme: ${tags.fixme}`);

  return {
    id: elementId(element),
    status,
    osmTag,
    name: tags.name ?? null,
    operator: tags.operator ?? null,
    network: tags.network ?? null,
    description: tags.description ?? null,
    companyTags,
    needsReview: false,
    reviewReasons: reasons,
  };
}

function trackStatus(element: OsmElement): { status: Status; osmTag: string; reasons: string[] } {
  const tags = tagsOf(element);
  const lifecycle = lifecycleOf(tags);
  const reasons: string[] = [];
  const railway = tags.railway;

  if (railway === "rail") {
    if (lifecycle)
      reasons.push(`conflicting tags: railway=rail and ${lifecycle.key}=${lifecycle.value}`);
    return { status: "active", osmTag: "railway=rail", reasons };
  }
  if (railway === "disused" || railway === "abandoned" || railway === "razed") {
    return { status: LIFECYCLE_STATUS[railway], osmTag: `railway=${railway}`, reasons };
  }
  if (lifecycle?.value === "rail") {
    return { status: LIFECYCLE_STATUS[lifecycle.state], osmTag: `${lifecycle.key}=rail`, reasons };
  }
  throw new Error(`Unsupported track tagging on ${elementId(element)}: ${JSON.stringify(tags)}`);
}

export function cleanLine(element: OsmElement): LineFeature {
  if (element.type !== "way" || !element.geometry || element.geometry.length < 2) {
    throw new Error(`Track ${elementId(element)} is not a way with at least two points.`);
  }
  const tags = tagsOf(element);
  const { status, osmTag, reasons } = trackStatus(element);

  return {
    type: "Feature",
    geometry: {
      type: "LineString",
      coordinates: element.geometry.map((point) => [point.lon, point.lat]),
    },
    properties: {
      ...common(element, status, osmTag, reasons),
      ref: tags.ref ?? null,
      gauge: tags.gauge ?? null,
      service: tags.service ?? null,
      usage: tags.usage ?? null,
      bridge: tags.bridge ?? null,
    },
  };
}

function positionOf(element: OsmElement): LatLon {
  if (element.type === "node" && element.lat !== undefined && element.lon !== undefined) {
    return { lat: element.lat, lon: element.lon };
  }
  if (element.type === "way" && element.geometry && element.geometry.length > 0) {
    return boundingBoxCenter(element.geometry);
  }
  throw new Error(`Cannot locate ${elementId(element)}.`);
}

type StationCandidate = { element: OsmElement; position: LatLon; feature: StationFeature };

function stationStatus(element: OsmElement): {
  status: Status;
  osmTag: string;
  kind: "station" | "halt";
  reasons: string[];
} {
  const tags = tagsOf(element);
  const lifecycle = lifecycleOf(tags);
  const reasons: string[] = [];
  const isStop = (value: string | undefined): value is "station" | "halt" =>
    value === "station" || value === "halt";

  if (isStop(tags.railway)) {
    if (lifecycle)
      reasons.push(
        `conflicting tags: railway=${tags.railway} and ${lifecycle.key}=${lifecycle.value}`,
      );
    return { status: "active", osmTag: `railway=${tags.railway}`, kind: tags.railway, reasons };
  }
  if (lifecycle && isStop(lifecycle.value)) {
    return {
      status: LIFECYCLE_STATUS[lifecycle.state],
      osmTag: `${lifecycle.key}=${lifecycle.value}`,
      kind: lifecycle.value,
      reasons,
    };
  }
  // e.g. historic=railway_station alone: we cannot tell whether it still operates, so we refuse to guess.
  throw new Error(`Unsupported station tagging on ${elementId(element)}: ${JSON.stringify(tags)}`);
}

function toStation(element: OsmElement): StationCandidate {
  const tags = tagsOf(element);
  const { status, osmTag, kind, reasons } = stationStatus(element);
  const position = positionOf(element);

  // A way tagged as a former station that is just "a building" is probably a reused building.
  if (element.type === "way" && tags.building && tags.building !== "train_station") {
    reasons.push("reused building tagged as a former station: verify it really was one");
  }

  const oldNames = Object.entries(tags)
    .filter(([key]) => key.startsWith("old_name:"))
    .map(([key, name]) => ({ name, period: key.slice("old_name:".length) }));

  const feature: StationFeature = {
    type: "Feature",
    geometry: { type: "Point", coordinates: [position.lon, position.lat] },
    properties: {
      ...common(element, status, osmTag, reasons),
      kind,
      altName: tags.alt_name ?? null,
      oldNames,
      startDate: tags.start_date ?? null,
      wikidata: tags.wikidata ?? null,
      wikipedia: tags.wikipedia ?? null,
      mergedFrom: [],
    },
  };
  return { element, position, feature };
}

/** Lower-case, no accents, no "(company)" suffix, no leading "Empalme": a loose "same name?" key. */
export function nameKey(name: string): string {
  return name
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/\(.*?\)/g, "")
    .replace(/^empalme\s+/, "")
    .replace(/\s+/g, " ")
    .trim();
}

const meters = (value: number) => `${Math.round(value)} m`;

function flag(candidate: StationCandidate, reason: string) {
  if (!candidate.feature.properties.reviewReasons.includes(reason)) {
    candidate.feature.properties.reviewReasons.push(reason);
  }
}

function isFootprint(element: OsmElement): boolean {
  const tags = tagsOf(element);
  return tags.building === "train_station" && !tags.railway && lifecycleOf(tags) === null;
}

export function cleanStations(elements: readonly OsmElement[]): StationFeature[] {
  const footprints = elements.filter(isFootprint);
  const candidates = elements.filter((element) => !isFootprint(element)).map(toStation);

  // 1. Merge each building footprint into the nearest station within MERGE_RADIUS_METERS. Nothing else merges.
  for (const footprint of footprints) {
    const position = positionOf(footprint);
    const ranked = candidates
      .map((candidate) => ({ candidate, distance: haversineMeters(position, candidate.position) }))
      .sort((a, b) => a.distance - b.distance);
    const [nearest, second] = ranked;

    if (nearest && nearest.distance <= MERGE_RADIUS_METERS) {
      nearest.candidate.feature.properties.mergedFrom.push(elementId(footprint));
      if (second && second.distance <= MERGE_RADIUS_METERS) {
        flag(
          nearest.candidate,
          `building ${elementId(footprint)} is also within ${MERGE_RADIUS_METERS} m of ${second.candidate.feature.properties.id}`,
        );
      }
    } else {
      // No station to attach it to: keep it as its own feature rather than losing it.
      const orphan = toOrphanFootprint(footprint, position);
      orphan.feature.properties.reviewReasons.push(
        `building without a station within ${MERGE_RADIUS_METERS} m: verify it is a station`,
      );
      candidates.push(orphan);
    }
  }

  // 2. Flag suspicious pairs. They stay separate: a human decides.
  for (const [i, a] of candidates.entries()) {
    const pa = a.feature.properties;
    if (pa.name === null) flag(a, "no name");

    for (const b of candidates.slice(i + 1)) {
      const pb = b.feature.properties;
      const distance = meters(haversineMeters(a.position, b.position));
      if (pa.wikidata && pa.wikidata === pb.wikidata) {
        flag(a, `shares wikidata ${pa.wikidata} with ${pb.id} (${distance})`);
        flag(b, `shares wikidata ${pb.wikidata} with ${pa.id} (${distance})`);
      }
      if (pa.name && pb.name && nameKey(pa.name) === nameKey(pb.name)) {
        flag(a, `name matches "${pb.name}" (${pb.id}) once normalized, ${distance} away`);
        flag(b, `name matches "${pa.name}" (${pa.id}) once normalized, ${distance} away`);
      }
    }
  }

  return candidates
    .map((candidate) => {
      const properties = candidate.feature.properties;
      properties.needsReview = properties.reviewReasons.length > 0;
      return candidate.feature;
    })
    .sort((a, b) => a.properties.id.localeCompare(b.properties.id, "en", { numeric: true }));
}

function toOrphanFootprint(element: OsmElement, position: LatLon): StationCandidate {
  const tags = tagsOf(element);
  const feature: StationFeature = {
    type: "Feature",
    geometry: { type: "Point", coordinates: [position.lon, position.lat] },
    properties: {
      ...common(element, "active", "building=train_station", []),
      // The footprint does not say whether it still operates: that is exactly what the review asks.
      kind: "station",
      altName: tags.alt_name ?? null,
      oldNames: [],
      startDate: tags.start_date ?? null,
      wikidata: tags.wikidata ?? null,
      wikipedia: tags.wikipedia ?? null,
      mergedFrom: [],
    },
  };
  return { element, position, feature };
}

export type CleanResult = { lines: LineFeature[]; stations: StationFeature[] };

const isTrack = (element: OsmElement): boolean => {
  const tags = tagsOf(element);
  if (element.type !== "way") return false;
  if (
    tags.railway === "rail" ||
    tags.railway === "disused" ||
    tags.railway === "abandoned" ||
    tags.railway === "razed"
  ) {
    return true;
  }
  return lifecycleOf(tags)?.value === "rail";
};

export function cleanSnapshot(elements: readonly OsmElement[]): CleanResult {
  for (const element of elements) {
    if (element.type === "relation") {
      throw new Error(
        `Relation ${element.id} is not supported yet: station areas mapped as relations need their own handling.`,
      );
    }
  }
  const lines = elements
    .filter(isTrack)
    .map(cleanLine)
    .map((line) => ({
      ...line,
      properties: { ...line.properties, needsReview: line.properties.reviewReasons.length > 0 },
    }))
    .sort((a, b) => a.properties.id.localeCompare(b.properties.id, "en", { numeric: true }));
  const stations = cleanStations(elements.filter((element) => !isTrack(element)));
  return { lines, stations };
}
