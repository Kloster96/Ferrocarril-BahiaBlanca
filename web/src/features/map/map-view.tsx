"use client";

import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { chapters } from "@/content/chapters";
import { cameraPadding, pickCamera } from "@/lib/camera";
import { mapboxToken } from "@/lib/env";
import { useStoryStore } from "@/features/story/story-provider";
import { INITIAL_VIEW, MAP_LABEL, MAP_STYLE } from "./constants";
import { MapMessage, MapSkeleton } from "./map-message";
import { addRailwayLayers } from "./railway-layers";
import { createRouteUpdater } from "./route-layers";
import { useGeoData } from "./use-geo-data";

let webglSupport: boolean | undefined;
function hasWebGL(): boolean {
  webglSupport ??= (() => {
    try {
      const canvas = document.createElement("canvas");
      return Boolean(canvas.getContext("webgl2") ?? canvas.getContext("webgl"));
    } catch {
      return false;
    }
  })();
  return webglSupport;
}

// The answer never changes while the page lives, so there is nothing to subscribe to.
const subscribeNever = () => () => {};

export default function MapView() {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [tileProblem, setTileProblem] = useState(false);
  const geo = useGeoData(attempt);
  const story = useStoryStore();

  // `null` on the server (it cannot know); the real answer in the browser.
  const webgl = useSyncExternalStore(subscribeNever, hasWebGL, () => null);

  useEffect(() => {
    if (mapboxToken.status !== "ok" || webgl !== true || !container.current) return;
    mapboxgl.accessToken = mapboxToken.token;
    const map = new mapboxgl.Map({
      container: container.current,
      style: MAP_STYLE,
      center: INITIAL_VIEW.center,
      zoom: INITIAL_VIEW.zoom,
      // Story mode: the page scrolls, the map does not take gestures (a swipe must not pan it, the wheel must
      // not zoom it). Explore mode (Phase 5) turns this on and brings the zoom control back.
      interactive: false,
    });
    mapRef.current = map;
    map.on("load", () => setMapLoaded(true));
    // Non-fatal: the map stays usable, so this is a notice and not a blocking state.
    map.on("error", (event) => {
      console.error("Map error", event.error);
      setTileProblem(true);
    });

    // Strict Mode mounts twice in development: without remove() the first map would leak its WebGL context.
    return () => {
      map.remove();
      mapRef.current = null;
      setMapLoaded(false);
    };
  }, [webgl]);

  // The layers need both the loaded style and the data, in whichever order they arrive.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded || geo.status !== "ready") return;
    if (map.getSource("lines")) return;
    addRailwayLayers(map, geo.data);
  }, [mapLoaded, geo]);

  // The camera follows the active chapter. It reads the store imperatively: the chapter changes a few times per
  // read, and nothing here should re-render React. Each flyTo cancels the one before it, so when the reader
  // scrolls fast the last chapter wins.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded || geo.status !== "ready") return;
    const cameras = new Map(
      geo.data.routes.features.map((f) => [f.properties.chapterId, f.properties.camera]),
    );
    const chapterIds = chapters.map((chapter) => chapter.id);
    const opening = { center: INITIAL_VIEW.center, zoom: INITIAL_VIEW.zoom };
    let applied = -1; // the map opens on the hero
    const follow = (animate: boolean) => {
      const { index } = story.get();
      if (index === applied) return;
      applied = index;
      const target = pickCamera(index, chapterIds, cameras, opening);
      // Padding is always explicit: it persists on the map, so going back to the hero must clear it.
      const padding =
        index < 0
          ? { top: 0, right: 0, bottom: 0, left: 0 }
          : cameraPadding(window.innerWidth, window.innerHeight);
      if (animate) map.flyTo({ ...target, padding, duration: 2200, essential: false });
      else map.jumpTo({ ...target, padding });
    };
    follow(false); // opened mid-story (a reload keeps the scroll): go straight there
    return story.subscribe(() => follow(true));
  }, [mapLoaded, geo, story]);

  // The routes are drawn as the story advances. Same approach as the camera: read the store imperatively, so
  // scrolling never re-renders React.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded || geo.status !== "ready") return;
    const update = createRouteUpdater(
      map,
      chapters.map((chapter) => chapter.id),
      geo.data.routes.features.map((f) => f.properties.chapterId),
    );
    update(story.get()); // opened mid-story: draw what the reader has already gone through
    return story.subscribe(() => update(story.get()));
  }, [mapLoaded, geo, story]);

  if (mapboxToken.status !== "ok") {
    return (
      <MapMessage title="Falta el token de Mapbox">
        Sin el token público no se puede mostrar el mapa. La historia sigue disponible en el texto.
      </MapMessage>
    );
  }
  if (webgl === false) {
    return (
      <MapMessage title="Tu navegador no puede mostrar el mapa">
        El mapa necesita WebGL, que no está disponible. La historia sigue disponible en el texto.
      </MapMessage>
    );
  }

  const ready = mapLoaded && geo.status === "ready";

  return (
    <>
      {/* mapbox-gl.css sets `position: relative` on the map container, which would undo an `absolute` here and
          collapse it to height 0. The wrapper carries the size; the container just fills it. */}
      <div className="absolute inset-0">
        <div
          ref={container}
          role="region"
          aria-label={MAP_LABEL}
          aria-busy={!ready}
          className="h-full w-full"
        />
      </div>
      {!ready && geo.status !== "error" ? <MapSkeleton /> : null}
      {geo.status === "error" ? (
        <MapMessage
          title="No se pudieron cargar las vías y estaciones"
          action={
            <button
              type="button"
              onClick={() => setAttempt((n) => n + 1)}
              className="rounded border border-neutral-900 px-4 py-2 font-medium hover:bg-neutral-900 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2"
            >
              Reintentar
            </button>
          }
        >
          Revisá tu conexión y probá de nuevo.
        </MapMessage>
      ) : null}
      {tileProblem ? (
        <p
          role="status"
          className="absolute bottom-8 left-1/2 z-10 -translate-x-1/2 rounded bg-neutral-900 px-3 py-2 text-sm text-white"
        >
          Parte del mapa no se pudo cargar.
        </p>
      ) : null}
    </>
  );
}
