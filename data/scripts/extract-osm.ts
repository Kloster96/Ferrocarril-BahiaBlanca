// Downloads railway data from OpenStreetMap (Overpass) and stores it, untouched, in data/raw/.
// Run with: pnpm data:extract
//
// This script does not clean or validate anything on purpose. Cleaning is a separate, reviewable
// step (see issue #13) so the raw snapshot stays a faithful copy of what Overpass returned.
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildQuery } from "./overpass-query.ts";

// Administrative areas to search (OSM relation ids). Add or remove ids here to change the coverage.
// Both are level-5 partidos: the railway history of the zone crosses the border between them.
const AREAS = [
  { relationId: 2582799, name: "Partido de Bahía Blanca" },
  { relationId: 2584648, name: "Partido de Coronel de Marina Leonardo Rosales" },
] as const;

const ENDPOINT = "https://overpass-api.de/api/interpreter";
const OUTPUT = resolve(dirname(fileURLToPath(import.meta.url)), "../raw/osm-raw.json");

// Overpass answers 429/502/503/504 when it is busy. We wait and retry a few times, then give up:
// insisting would go against its usage policy.
const RETRYABLE_STATUS = new Set([429, 502, 503, 504]);
const BACKOFF_SECONDS = [20, 45, 90];

type OverpassResponse = {
  osm3s?: { timestamp_osm_base?: string };
  elements?: unknown;
};

const sleep = (seconds: number) => new Promise((done) => setTimeout(done, seconds * 1000));

async function fetchOverpass(query: string): Promise<Response> {
  for (let attempt = 0; ; attempt++) {
    const response = await fetch(ENDPOINT, {
      method: "POST",
      // Overpass asks clients to identify themselves. A generic name is enough; no contact data is sent.
      headers: {
        "User-Agent": "osm-data-script/1.0",
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ data: query }),
    });

    if (response.ok) return response;

    const wait = BACKOFF_SECONDS[attempt];
    if (!RETRYABLE_STATUS.has(response.status) || wait === undefined) {
      throw new Error(
        `Overpass responded ${response.status} ${response.statusText} after ${attempt + 1} attempt(s). Try again later.`,
      );
    }
    console.log(
      `Overpass responded ${response.status}. Waiting ${wait}s (retry ${attempt + 1}/${BACKOFF_SECONDS.length})...`,
    );
    await sleep(wait);
  }
}

async function main(): Promise<void> {
  const relationIds = AREAS.map((area) => area.relationId);
  const query = buildQuery(relationIds);
  console.log(`Querying Overpass for: ${AREAS.map((area) => area.name).join(" + ")}...`);

  const response = await fetchOverpass(query);
  const body = (await response.json()) as OverpassResponse;
  if (!Array.isArray(body.elements)) {
    throw new Error("Unexpected Overpass response: `elements` is not an array.");
  }

  const snapshot = {
    meta: {
      fetchedAt: new Date().toISOString(),
      // When the OSM database copy used by Overpass was last updated: this is the real age of the data.
      osmBaseTimestamp: body.osm3s?.timestamp_osm_base ?? null,
      areas: AREAS,
      endpoint: ENDPOINT,
      query,
      license: "ODbL 1.0 — © OpenStreetMap contributors — https://www.openstreetmap.org/copyright",
    },
    elements: body.elements,
  };

  await mkdir(dirname(OUTPUT), { recursive: true });
  await writeFile(OUTPUT, `${JSON.stringify(snapshot, null, 2)}\n`, "utf8");
  console.log(`Saved ${body.elements.length} elements to data/raw/osm-raw.json`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
