// Resolves the curated zone of each zone chapter into stations and a camera.
// Reads only data/out/stations.geojson and data/curated/zones.json (never data/raw/).
// Run with: pnpm data:zones
import { readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { StationFeature } from "./clean.ts";
import { buildZone, type ZoneInput } from "./zones.ts";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

async function main(): Promise<void> {
  const stations = JSON.parse(await readFile(resolve(ROOT, "out/stations.geojson"), "utf8")) as {
    metadata: Record<string, unknown>;
    features: StationFeature[];
  };
  const curated = JSON.parse(await readFile(resolve(ROOT, "curated/zones.json"), "utf8")) as {
    zones: ZoneInput[];
  };

  const index = new Map(stations.features.map((feature) => [feature.properties.id, feature]));
  const features = curated.zones.map((zone) => {
    const built = buildZone(zone, index);
    return {
      type: "Feature" as const,
      geometry: { type: "MultiPoint" as const, coordinates: built.coordinates },
      properties: {
        chapterId: built.chapterId,
        stationIds: built.stationIds,
        camera: built.camera,
      },
    };
  });

  const body = features.map((feature) => `    ${JSON.stringify(feature)}`).join(",\n");
  await writeFile(
    resolve(ROOT, "out/zones.geojson"),
    `{\n  "type": "FeatureCollection",\n  "metadata": ${JSON.stringify(stations.metadata)},\n  "features": [\n${body}\n  ]\n}\n`,
    "utf8",
  );
  for (const { properties } of features) {
    console.log(
      `${properties.chapterId}: ${properties.stationIds.length} station(s), camera ${JSON.stringify(properties.camera)}`,
    );
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
