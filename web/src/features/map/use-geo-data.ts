"use client";

import { useEffect, useState } from "react";
import { areaCollectionSchema, type AreaCollection } from "@/shared/schemas/area";
import { linesCollectionSchema, type LinesCollection } from "@/shared/schemas/line";
import { routesCollectionSchema, type RoutesCollection } from "@/shared/schemas/route";
import { zonesCollectionSchema, type ZonesCollection } from "@/shared/schemas/zone";
import { stationsCollectionSchema, type StationsCollection } from "@/shared/schemas/station";

export type GeoData = {
  lines: LinesCollection;
  stations: StationsCollection;
  area: AreaCollection;
  routes: RoutesCollection;
  zones: ZonesCollection;
};
export type GeoDataState =
  { status: "loading" } | { status: "ready"; data: GeoData } | { status: "error" };

type Settled = Exclude<GeoDataState, { status: "loading" }>;

async function getJson(url: string, signal: AbortSignal): Promise<unknown> {
  const response = await fetch(url, { signal });
  if (!response.ok) throw new Error(`${url} answered ${response.status}`);
  return response.json();
}

/**
 * Loads the map data (lines, stations, area, routes, zones) from /api/*. The response is parsed again with the same schemas the server used: a
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
      getJson("/api/area", controller.signal),
      getJson("/api/routes", controller.signal),
      getJson("/api/zones", controller.signal),
    ])
      .then(([lines, stations, area, routes, zones]) => {
        setResult({
          attempt,
          state: {
            status: "ready",
            data: {
              lines: linesCollectionSchema.parse(lines),
              stations: stationsCollectionSchema.parse(stations),
              area: areaCollectionSchema.parse(area),
              routes: routesCollectionSchema.parse(routes),
              zones: zonesCollectionSchema.parse(zones),
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
