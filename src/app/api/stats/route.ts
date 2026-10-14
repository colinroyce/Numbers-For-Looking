import type { NextRequest } from "next/server";
import { MAX_PLAYERS } from "@/lib/colors";
import { getDatasetFor } from "@/lib/nflverse";
import type { StatsResponse } from "@/lib/types";
import { dataUnavailable } from "@/lib/api-errors";

export async function GET(request: NextRequest) {
  const ids = (request.nextUrl.searchParams.get("ids") ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
  if (ids.length === 0 || ids.length > MAX_PLAYERS) {
    return Response.json({ error: `ids must list 1–${MAX_PLAYERS} player ids` }, { status: 400 });
  }
  try {
    const { data, headers } = await getDatasetFor(request);
    const players: StatsResponse["players"] = [];
    for (const id of ids) {
      const player = data.players.find((p) => p.id === id);
      if (!player) continue;
      players.push({
        ...player,
        weeks: data.stats[id] ?? [],
        teamWeeks: data.teamWeeks[player.team] ?? [],
      });
    }
    const body: StatsResponse = { latestWeek: data.latestWeek, players };
    return Response.json(body, { headers });
  } catch (err) {
    return dataUnavailable(err);
  }
}
