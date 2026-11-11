// Downloads railway data from OpenStreetMap (Overpass) and stores it, untouched, in data/raw/.
// Run with: pnpm data:extract
//
// This script does not clean or validate anything on purpose. Cleaning is a separate, reviewable
// step (see issue #13) so the raw snapshot stays a faithful copy of what Overpass returned.
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildQuery } from "./overpass-query.ts";

// OSM relation of the administrative boundary used as the search area (level 8, Q54108).
const AREA_RELATION_ID = 3302861;
const ENDPOINT = "https://overpass-api.de/api/interpreter";
const OUTPUT = resolve(dirname(fileURLToPath(import.meta.url)), "../raw/osm-raw.json");

type OverpassResponse = {
  osm3s?: { timestamp_osm_base?: string };
  elements?: unknown;
};

async function main(): Promise<void> {
  const query = buildQuery(AREA_RELATION_ID);
  console.log(`Querying Overpass for area relation ${AREA_RELATION_ID}...`);

  const response = await fetch(ENDPOINT, {
    method: "POST",
    // Overpass asks clients to identify themselves. A generic name is enough; no contact data is sent.
    headers: {
      "User-Agent": "osm-data-script/1.0",
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ data: query }),
  });

  // No automatic retry: on 429/504 the server is busy and hammering it is against its usage policy.
  if (!response.ok) {
    throw new Error(
      `Overpass responded ${response.status} ${response.statusText}. Try again in a few minutes.`,
    );
  }

  const body = (await response.json()) as OverpassResponse;
  if (!Array.isArray(body.elements)) {
    throw new Error("Unexpected Overpass response: `elements` is not an array.");
  }

  const snapshot = {
    meta: {
      fetchedAt: new Date().toISOString(),
      // When the OSM database copy used by Overpass was last updated: this is the real age of the data.
      osmBaseTimestamp: body.osm3s?.timestamp_osm_base ?? null,
      areaRelationId: AREA_RELATION_ID,
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
