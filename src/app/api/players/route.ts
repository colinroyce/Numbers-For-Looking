import type { NextRequest } from "next/server";
import { CACHE_HEADERS, getDataset } from "@/lib/nflverse";
import { isPosition, type PlayersResponse } from "@/lib/types";
import { dataUnavailable } from "@/lib/api-errors";

export async function GET(request: NextRequest) {
  const position = request.nextUrl.searchParams.get("position");
  if (!isPosition(position)) {
    return Response.json({ error: "position must be QB, RB, WR or TE" }, { status: 400 });
  }
  try {
    const { data } = await getDataset();
    const body: PlayersResponse = {
      players: data.players.filter((p) => p.position === position),
    };
    return Response.json(body, { headers: CACHE_HEADERS });
  } catch (err) {
    return dataUnavailable(err);
  }
}
