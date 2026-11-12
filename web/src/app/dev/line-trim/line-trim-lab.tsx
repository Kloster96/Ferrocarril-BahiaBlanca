"use client";

// Isolated experiment for issue #23: how does Mapbox's `line-trim-offset` behave?
//   (a) does it need `lineMetrics: true` on the source?
//   (b) does it trim every LineString on its own, or all of them as one line?
// Two parallel LineStrings of the same length, one red and one blue. The coverage readout counts rendered
// pixels of each colour against the untrimmed baseline, so the answer comes from a measurement.
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { useCallback, useEffect, useRef, useState } from "react";
import { mapboxToken } from "@/lib/env";

type Coverage = { red: number; blue: number };
type Lab = {
  setLineMetrics: (on: boolean) => Promise<void>;
  setOffset: (start: number, end: number) => Promise<Coverage>;
};
declare global {
  interface Window {
    __lineTrimLab?: Lab;
  }
}

const A: [number, number][] = [
  [-62.3, -38.7],
  [-62.2, -38.7],
];
const B: [number, number][] = [
  [-62.3, -38.72],
  [-62.2, -38.72],
];
const data: mapboxgl.GeoJSONSourceSpecification["data"] = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: { color: "#ff0000" },
      geometry: { type: "LineString", coordinates: A },
    },
    {
      type: "Feature",
      properties: { color: "#0000ff" },
      geometry: { type: "LineString", coordinates: B },
    },
  ],
};

// A style with no sources: the experiment must not depend on tiles.
const EMPTY_STYLE: mapboxgl.StyleSpecification = {
  version: 8,
  sources: {},
  layers: [{ id: "bg", type: "background", paint: { "background-color": "#ffffff" } }],
};

function countColours(canvas: HTMLCanvasElement): { red: number; blue: number } {
  const copy = document.createElement("canvas");
  copy.width = canvas.width;
  copy.height = canvas.height;
  const context = copy.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("2D canvas unavailable");
  context.drawImage(canvas, 0, 0);
  const { data: pixels } = context.getImageData(0, 0, copy.width, copy.height);
  let red = 0;
  let blue = 0;
  for (let i = 0; i < pixels.length; i += 4) {
    const [r = 0, g = 0, b = 0] = [pixels[i], pixels[i + 1], pixels[i + 2]];
    if (r > 200 && g < 60 && b < 60) red++;
    else if (b > 200 && r < 60 && g < 60) blue++;
  }
  return { red, blue };
}

export function LineTrimLab() {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const baseline = useRef<Coverage | null>(null);
  const [lineMetrics, setLineMetrics] = useState(false);
  const [start, setStart] = useState(0);
  const [end, setEnd] = useState(0);
  const [coverage, setCoverage] = useState<Coverage | null>(null);
  const [messages, setMessages] = useState<string[]>([]);

  // `lineMetrics` is a source option that cannot change in place: remove and re-add the source.
  const mountSource = useCallback((map: mapboxgl.Map, withMetrics: boolean) => {
    if (map.getLayer("lines")) map.removeLayer("lines");
    if (map.getSource("lines")) map.removeSource("lines");
    map.addSource("lines", { type: "geojson", data, lineMetrics: withMetrics });
    map.addLayer({
      id: "lines",
      type: "line",
      source: "lines",
      layout: { "line-cap": "butt" },
      paint: { "line-width": 10, "line-color": ["get", "color"], "line-trim-offset": [0, 0] },
    });
  }, []);

  const measure = useCallback(async (map: mapboxgl.Map): Promise<Coverage> => {
    await new Promise<void>((resolve) => map.once("idle", () => resolve()));
    const counts = countColours(map.getCanvas());
    if (!baseline.current && (counts.red > 0 || counts.blue > 0)) baseline.current = counts;
    const base = baseline.current;
    const result = {
      red: base && base.red > 0 ? counts.red / base.red : 0,
      blue: base && base.blue > 0 ? counts.blue / base.blue : 0,
    };
    setCoverage(result);
    return result;
  }, []);

  useEffect(() => {
    if (mapboxToken.status !== "ok" || !container.current) return;
    mapboxgl.accessToken = mapboxToken.token;
    const map = new mapboxgl.Map({
      container: container.current,
      style: EMPTY_STYLE,
      center: [-62.25, -38.71],
      zoom: 11.5,
      interactive: false,
      // Needed to read the pixels back. Experiment only: it costs performance.
      preserveDrawingBuffer: true,
    });
    mapRef.current = map;
    map.on("error", (event) => setMessages((m) => [...m, `map error: ${event.error.message}`]));
    map.on("load", () => {
      mountSource(map, false);
      void measure(map);
    });

    window.__lineTrimLab = {
      setLineMetrics: async (on) => {
        baseline.current = null;
        setLineMetrics(on);
        mountSource(map, on);
        await measure(map);
      },
      setOffset: async (from, to) => {
        map.setPaintProperty("lines", "line-trim-offset", [from, to]);
        setStart(from);
        setEnd(to);
        return measure(map);
      },
    };

    return () => {
      delete window.__lineTrimLab;
      map.remove();
      mapRef.current = null;
    };
  }, [mountSource, measure]);

  if (mapboxToken.status !== "ok") {
    return <p className="p-6">Missing NEXT_PUBLIC_MAPBOX_TOKEN: the experiment needs a map.</p>;
  }

  const apply = (from: number, to: number) => {
    const map = mapRef.current;
    if (!map?.getLayer("lines")) return;
    map.setPaintProperty("lines", "line-trim-offset", [from, to]);
    setStart(from);
    setEnd(to);
    void measure(map);
  };
  const percent = (value: number) => `${Math.round(value * 100)}%`;

  return (
    <main className="flex min-h-screen flex-col gap-4 p-6">
      <h1 className="text-xl font-semibold">line-trim-offset lab (issue #23)</h1>
      <div className="flex flex-wrap items-center gap-6">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={lineMetrics}
            onChange={(event) => void window.__lineTrimLab?.setLineMetrics(event.target.checked)}
          />
          lineMetrics: true
        </label>
        <label className="flex items-center gap-2">
          start {start.toFixed(2)}
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={start}
            onChange={(e) => apply(Number(e.target.value), end)}
          />
        </label>
        <label className="flex items-center gap-2">
          end {end.toFixed(2)}
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={end}
            onChange={(e) => apply(start, Number(e.target.value))}
          />
        </label>
      </div>
      <p aria-live="polite">
        Visible part — red line: {coverage ? percent(coverage.red) : "…"} · blue line:{" "}
        {coverage ? percent(coverage.blue) : "…"}
      </p>
      {messages.map((message) => (
        <p key={message} className="text-red-700">
          {message}
        </p>
      ))}
      <div ref={container} className="h-[480px] w-full max-w-4xl border" />
    </main>
  );
}
