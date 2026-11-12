"use client";

import dynamic from "next/dynamic";
import { MapSkeleton } from "./map-message";

// Mapbox needs `window` and WebGL, and it is heavy: it loads only in the browser and in its own chunk.
// `ssr: false` is only allowed inside a Client Component, which is why this wrapper exists.
export const MapLoader = dynamic(() => import("./map-view"), {
  ssr: false,
  loading: () => <MapSkeleton />,
});
