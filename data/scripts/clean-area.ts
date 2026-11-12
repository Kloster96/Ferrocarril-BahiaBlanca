// Reads the raw area snapshot (data/raw/area-raw.json) and writes data/out/area.geojson.
// Run with: pnpm data:area
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  AREA_RELATION_IDS,
  buildAreaFeatures,
  buildOuterRings,
  simplifyRings,
  type AreaRelation,
} from "./area.ts";

// The border is a soft visual cue, not a survey. At the opening zoom (8.8, ~140 m per pixel) 50 m is a third of a
// pixel; zoomed in to 13 (~4 m per pixel) coastline detail is visibly coarser, which is acceptable for a faint
// edge. Without simplifying, the area weighs 1.4 MB.
const SIMPLIFY_TOLERANCE_METERS = 50;

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

type RawSnapshot = {
  meta: { fetchedAt: string; osmBaseTimestamp: string | null; license: string };
  elements: AreaRelation[];
};

async function main(): Promise<void> {
  const snapshot = JSON.parse(
    await readFile(resolve(ROOT, "raw/area-raw.json"), "utf8"),
  ) as RawSnapshot;
  const found = snapshot.elements.map((element) => element.id).sort();
  if (found.join() !== [...AREA_RELATION_IDS].sort().join()) {
    throw new Error(`Expected relations ${AREA_RELATION_IDS.join(", ")}, got ${found.join(", ")}.`);
  }

  const features = buildAreaFeatures(
    simplifyRings(buildOuterRings(snapshot.elements), SIMPLIFY_TOLERANCE_METERS),
  );
  const metadata = {
    source: "OpenStreetMap",
    license: snapshot.meta.license,
    osmBaseTimestamp: snapshot.meta.osmBaseTimestamp,
    fetchedAt: snapshot.meta.fetchedAt,
  };
  const body = features.map((feature) => `    ${JSON.stringify(feature)}`).join(",\n");
  await mkdir(resolve(ROOT, "out"), { recursive: true });
  await writeFile(
    resolve(ROOT, "out/area.geojson"),
    `{\n  "type": "FeatureCollection",\n  "metadata": ${JSON.stringify(metadata)},\n  "features": [\n${body}\n  ]\n}\n`,
    "utf8",
  );
  console.log(`area.geojson: ${features[0]!.geometry.coordinates.length} ring(s)`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
