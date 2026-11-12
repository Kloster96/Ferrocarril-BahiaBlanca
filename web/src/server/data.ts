import { readFile } from "node:fs/promises";
import path from "node:path";
import type { z } from "zod";
import { linesCollectionSchema } from "@/shared/schemas/line";
import { stationsCollectionSchema } from "@/shared/schemas/station";
import { statsSchema } from "@/shared/schemas/stats";

// data/ lives next to web/, outside the Next.js project root. The handlers that call this are static
// (`force-static`), so the file is read once at build time: no file tracing is needed at runtime, and
// invalid data throws during `next build` instead of reaching a user.
const DATA_DIR = path.resolve(process.cwd(), "../data/out");

async function loadJson<S extends z.ZodType>(
  file: string,
  schema: S,
  dir = DATA_DIR,
): Promise<z.output<S>> {
  // turbopackIgnore: this runs only while `next build` prerenders the static handlers. Without the hint
  // Turbopack would trace the whole project into the server bundle for a read that never happens at runtime.
  const location = path.join(/*turbopackIgnore: true*/ dir, file);
  const raw: unknown = JSON.parse(await readFile(/*turbopackIgnore: true*/ location, "utf8"));
  const result = schema.safeParse(raw);
  if (!result.success) {
    // Name the file and the first issues: a bare "invalid" says nothing about what broke the build.
    const issues = result.error.issues
      .slice(0, 3)
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("; ");
    throw new Error(`data/out/${file} does not match its schema. ${issues}`);
  }
  return result.data;
}

export const loadLines = (dir?: string) => loadJson("lines.geojson", linesCollectionSchema, dir);
export const loadStations = (dir?: string) =>
  loadJson("stations.geojson", stationsCollectionSchema, dir);
export const loadStats = (dir?: string) => loadJson("stats.json", statsSchema, dir);
