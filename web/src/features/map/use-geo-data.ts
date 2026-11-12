"use client";

import { useEffect, useState } from "react";
import { linesCollectionSchema, type LinesCollection } from "@/shared/schemas/line";
import { stationsCollectionSchema, type StationsCollection } from "@/shared/schemas/station";

export type GeoData = { lines: LinesCollection; stations: StationsCollection };
export type GeoDataState =
  { status: "loading" } | { status: "ready"; data: GeoData } | { status: "error" };

type Settled = Exclude<GeoDataState, { status: "loading" }>;

async function getJson(url: string, signal: AbortSignal): Promise<unknown> {
  const response = await fetch(url, { signal });
  if (!response.ok) throw new Error(`${url} answered ${response.status}`);
  return response.json();
}

/**
 * Loads the map data from /api/*. The response is parsed again with the same schemas the server used: a
 * network boundary is untrusted, and it gives the rest of the code real types instead of casts.
 * `attempt` lets the UI retry: a new value starts a new request.
 *
 * "Loading" is derived (no result stored for the current attempt), not stored: it avoids setting state
 * synchronously inside the effect, which would render twice for nothing.
 */
export function useGeoData(attempt: number): GeoDataState {
  const [result, setResult] = useState<{ attempt: number; state: Settled } | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    Promise.all([
      getJson("/api/lines", controller.signal),
      getJson("/api/stations", controller.signal),
    ])
      .then(([lines, stations]) => {
        setResult({
          attempt,
          state: {
            status: "ready",
            data: {
              lines: linesCollectionSchema.parse(lines),
              stations: stationsCollectionSchema.parse(stations),
            },
          },
        });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return; // unmounted, or a newer attempt replaced this one
        console.error("Could not load the map data", error);
        setResult({ attempt, state: { status: "error" } });
      });
    return () => controller.abort();
  }, [attempt]);

  return result?.attempt === attempt ? result.state : { status: "loading" };
}
