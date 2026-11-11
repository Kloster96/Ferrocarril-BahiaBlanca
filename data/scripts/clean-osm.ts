// Reads the raw OSM snapshot (data/raw) and writes clean GeoJSON to data/out/.
// Run with: pnpm data:clean
//
// Plain TypeScript with no validation library on purpose: data/ must not depend on web/. The shape of
// the output is validated by web/ against its Zod schemas in CI (see issue #16).
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { cleanSnapshot, type OsmElement } from "./clean.ts";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const INPUT = resolve(ROOT, "raw/osm-raw.json");
const OUT_DIR = resolve(ROOT, "out");

type RawSnapshot = {
  meta: { fetchedAt: string; osmBaseTimestamp: string | null; license: string };
  elements: OsmElement[];
};

/** One feature per line: diffs of regenerated data stay readable in Git. */
function serialize(features: readonly unknown[], metadata: object): string {
  const body = features.map((feature) => `    ${JSON.stringify(feature)}`).join(",\n");
  return `{\n  "type": "FeatureCollection",\n  "metadata": ${JSON.stringify(metadata)},\n  "features": [\n${body}\n  ]\n}\n`;
}

async function main(): Promise<void> {
  const snapshot = JSON.parse(await readFile(INPUT, "utf8")) as RawSnapshot;
  if (!Array.isArray(snapshot.elements)) {
    throw new Error(
      "data/raw/osm-raw.json has no `elements` array. Run `pnpm data:extract` first.",
    );
  }

  const { lines, stations } = cleanSnapshot(snapshot.elements);

  // The licence travels with the data: ODbL requires attribution wherever it is used.
  const metadata = {
    source: "OpenStreetMap",
    license: snapshot.meta.license,
    osmBaseTimestamp: snapshot.meta.osmBaseTimestamp,
    fetchedAt: snapshot.meta.fetchedAt,
  };

  await mkdir(OUT_DIR, { recursive: true });
  await writeFile(resolve(OUT_DIR, "lines.geojson"), serialize(lines, metadata), "utf8");
  await writeFile(resolve(OUT_DIR, "stations.geojson"), serialize(stations, metadata), "utf8");

  const count = <T>(items: readonly T[], key: (item: T) => string) => {
    const result: Record<string, number> = {};
    for (const item of items) result[key(item)] = (result[key(item)] ?? 0) + 1;
    return result;
  };
  console.log(
    `lines:    ${lines.length}`,
    count(lines, (l) => l.properties.status),
  );
  console.log(
    `stations: ${stations.length}`,
    count(stations, (s) => s.properties.status),
  );

  const review = stations.filter((s) => s.properties.needsReview);
  console.log(`\n${review.length} station(s) need review:`);
  for (const { properties } of review) {
    console.log(`- ${properties.id} ${properties.name ?? "(no name)"}`);
    for (const reason of properties.reviewReasons) console.log(`    · ${reason}`);
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
