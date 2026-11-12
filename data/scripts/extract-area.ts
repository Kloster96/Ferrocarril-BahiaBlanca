// Downloads the boundary of the study area (the two partidos) from OpenStreetMap and stores it, untouched,
// in data/raw/area-raw.json. Run with: pnpm data:extract-area
//
// Same policy as extract-osm.ts: no cleaning here, so the snapshot stays a faithful copy of what Overpass said.
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { AREA_RELATION_IDS, buildAreaQuery } from "./area.ts";

const ENDPOINT = "https://overpass-api.de/api/interpreter";
const USER_AGENT =
  "Ferrocarril-BahiaBlanca (+https://github.com/Kloster96/Ferrocarril-BahiaBlanca)";
const OUTPUT = resolve(dirname(fileURLToPath(import.meta.url)), "../raw/area-raw.json");

// Overpass answers 429/502/503/504 when it is busy: wait and retry a few times, then give up.
const RETRYABLE_STATUS = new Set([429, 502, 503, 504]);
const BACKOFF_SECONDS = [20, 45, 90];
const sleep = (seconds: number) => new Promise((done) => setTimeout(done, seconds * 1000));

async function fetchOverpass(query: string): Promise<Response> {
  for (let attempt = 0; ; attempt++) {
    const response = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "User-Agent": USER_AGENT, "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ data: query }),
    });
    if (response.ok) return response;
    const wait = BACKOFF_SECONDS[attempt];
    if (!RETRYABLE_STATUS.has(response.status) || wait === undefined) {
      throw new Error(`Overpass responded ${response.status} after ${attempt + 1} attempt(s).`);
    }
    console.log(`Overpass responded ${response.status}. Waiting ${wait}s...`);
    await sleep(wait);
  }
}

async function main(): Promise<void> {
  const query = buildAreaQuery(AREA_RELATION_IDS);
  const body = (await (await fetchOverpass(query)).json()) as {
    osm3s?: { timestamp_osm_base?: string };
    elements?: unknown;
  };
  if (!Array.isArray(body.elements)) {
    throw new Error("Unexpected Overpass response: `elements` is not an array.");
  }
  const snapshot = {
    meta: {
      fetchedAt: new Date().toISOString(),
      osmBaseTimestamp: body.osm3s?.timestamp_osm_base ?? null,
      license: "ODbL 1.0 — © OpenStreetMap contributors — https://www.openstreetmap.org/copyright",
      query,
    },
    elements: body.elements,
  };
  await mkdir(dirname(OUTPUT), { recursive: true });
  await writeFile(OUTPUT, `${JSON.stringify(snapshot)}\n`, "utf8");
  console.log(`Saved ${body.elements.length} relation(s) to ${OUTPUT}`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
