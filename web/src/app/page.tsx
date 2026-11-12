import { MapLoader } from "@/features/map/map-loader";

export default function HomePage() {
  return (
    <main className="relative h-dvh w-full overflow-hidden">
      <MapLoader />
      <h1 className="pointer-events-none absolute top-4 left-4 z-20 max-w-xs rounded bg-white/90 px-4 py-2 text-lg font-semibold shadow">
        El ferrocarril en Bahía Blanca
      </h1>
    </main>
  );
}
