import { loadStations } from "@/server/data";

// Static: resolved at build time (see src/server/data.ts), served from cache afterwards.
export const dynamic = "force-static";

export async function GET() {
  return Response.json(await loadStations());
}
