import type { NextRequest } from "next/server";
import { getDatasetFor } from "@/lib/nflverse";
import { isPosition, type PlayersResponse } from "@/lib/types";
import { dataUnavailable } from "@/lib/api-errors";

export async function GET(request: NextRequest) {
  const position = request.nextUrl.searchParams.get("position");
  if (!isPosition(position)) {
    return Response.json({ error: "position must be QB, RB, WR or TE" }, { status: 400 });
  }
  try {
    const { data, headers } = await getDatasetFor(request);
    const body: PlayersResponse = {
      players: data.players.filter((p) => p.position === position),
    };
    return Response.json(body, { headers });
  } catch (err) {
    return dataUnavailable(err);
  }
}
