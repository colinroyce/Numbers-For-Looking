import type { NextRequest } from "next/server";
import { CACHE_HEADERS, getDataset } from "@/lib/nflverse";
import type { StatsResponse } from "@/lib/types";
import { dataUnavailable } from "@/lib/api-errors";

const MAX_PLAYERS = 3;

export async function GET(request: NextRequest) {
  const ids = (request.nextUrl.searchParams.get("ids") ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
  if (ids.length === 0 || ids.length > MAX_PLAYERS) {
    return Response.json({ error: `ids must list 1–${MAX_PLAYERS} player ids` }, { status: 400 });
  }
  try {
    const { data } = await getDataset();
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
    return Response.json(body, { headers: CACHE_HEADERS });
  } catch (err) {
    return dataUnavailable(err);
  }
}
