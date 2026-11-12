// Reads the cleaned GeoJSON in data/out/ (never the raw snapshot) and writes data/out/stats.json.
// Run with: pnpm data:stats
import { readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { LineFeature, StationFeature } from "./clean.ts";
import { computeStats } from "./stats.ts";

const OUT_DIR = resolve(dirname(fileURLToPath(import.meta.url)), "../out");

type Collection<T> = { metadata: Record<string, unknown>; features: T[] };

async function read<T>(file: string): Promise<Collection<T>> {
  const data = JSON.parse(await readFile(resolve(OUT_DIR, file), "utf8")) as Collection<T>;
  if (!Array.isArray(data.features)) {
    throw new Error(`data/out/${file} has no features array. Run \`pnpm data:clean\` first.`);
  }
  return data;
}

async function main(): Promise<void> {
  const lines = await read<LineFeature>("lines.geojson");
  const stations = await read<StationFeature>("stations.geojson");

  // The licence and extraction date travel with the numbers. No generation timestamp: the output must be
  // reproducible, so the same inputs always produce the same file.
  const output = {
    metadata: lines.metadata,
    ...computeStats(lines.features, stations.features),
  };

  await writeFile(resolve(OUT_DIR, "stats.json"), `${JSON.stringify(output, null, 2)}\n`, "utf8");
  console.log(
    `stats.json: ${output.lines.total.count} lines (${output.lines.total.trackKm} km), ${output.stations.total} stations`,
  );
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
