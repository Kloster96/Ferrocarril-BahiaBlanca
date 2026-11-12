// Merges the curated route of each chapter into one continuous line.
// Reads only data/out/lines.geojson and data/curated/routes.json (never data/raw/).
// Run with: pnpm data:routes
import { readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { LineFeature } from "./clean.ts";
import { mergeRoute, type RouteInput } from "./routes.ts";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

async function main(): Promise<void> {
  const lines = JSON.parse(await readFile(resolve(ROOT, "out/lines.geojson"), "utf8")) as {
    metadata: Record<string, unknown>;
    features: LineFeature[];
  };
  const curated = JSON.parse(await readFile(resolve(ROOT, "curated/routes.json"), "utf8")) as {
    routes: RouteInput[];
  };

  const index = new Map(lines.features.map((feature) => [feature.properties.id, feature]));
  const features = curated.routes.map((route) => {
    const merged = mergeRoute(route, index);
    return {
      type: "Feature" as const,
      geometry: { type: "LineString" as const, coordinates: merged.coordinates },
      properties: { chapterId: merged.chapterId, wayIds: merged.wayIds },
    };
  });

  const body = features.map((feature) => `    ${JSON.stringify(feature)}`).join(",\n");
  await writeFile(
    resolve(ROOT, "out/routes.geojson"),
    `{\n  "type": "FeatureCollection",\n  "metadata": ${JSON.stringify(lines.metadata)},\n  "features": [\n${body}\n  ]\n}\n`,
    "utf8",
  );
  for (const { properties, geometry } of features) {
    console.log(
      `${properties.chapterId}: ${properties.wayIds.length} ways -> ${geometry.coordinates.length} vertices`,
    );
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
