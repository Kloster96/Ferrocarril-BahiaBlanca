import type { Status } from "@/shared/schemas/geo";

// A fixed starting view over the study area, on purpose: computing bounds from the data at runtime would put
// geometry code in web/ (see CLAUDE.md, "Decisiones de diseño"). The extent of data/out is about
// lon -62.63..-61.72, lat -38.95..-38.08; this view shows all of it on a desktop screen.
export const INITIAL_VIEW = { center: [-62.17, -38.51] as [number, number], zoom: 8.8 };

// Sober, label-light basemap, so the railway data is what stands out.
export const MAP_STYLE = "mapbox://styles/mapbox/light-v11";

export const MAP_LABEL = "Mapa del ferrocarril en Bahía Blanca";

// Placeholder palette: the final one comes with the Figma mockup in Phase 4.
export const STATUS_COLOR: Record<Status, string> = {
  active: "#1d3557",
  disused: "#c2410c",
  abandoned: "#8d99ae",
};

// The data comes from OpenStreetMap: the ODbL requires crediting it wherever the data is shown.
export const OSM_ATTRIBUTION = "© OpenStreetMap contributors";
