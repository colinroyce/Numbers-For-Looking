import { META_CACHE_HEADERS, getDataset } from "@/lib/nflverse";
import type { MetaResponse } from "@/lib/types";
import { dataUnavailable } from "@/lib/api-errors";

export async function GET() {
  try {
    const { data, stale } = await getDataset();
    const body: MetaResponse = {
      season: data.season,
      latestWeek: data.latestWeek,
      fetchedAt: data.fetchedAt,
      version: data.version,
      stale,
    };
    return Response.json(body, { headers: META_CACHE_HEADERS });
  } catch (err) {
    return dataUnavailable(err);
  }
}
