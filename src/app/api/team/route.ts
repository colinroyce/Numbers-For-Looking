import type { NextRequest } from "next/server";
import { dataUnavailable } from "@/lib/api-errors";
import { getDatasetFor } from "@/lib/nflverse";
import { upcomingWeeks } from "@/lib/schedule";
import { TEAMS } from "@/lib/teams";
import { isPosition, type TeamResponse, type WeeklyStat } from "@/lib/types";

/** Season usage for sorting: plays involving the player (kickers: kicks attempted). */
const touches = (weeks: WeeklyStat[]) =>
  weeks.reduce(
    (sum, w) =>
      sum + (w.targets ?? 0) + (w.carries ?? 0) + (w.attempts ?? 0) + (w.fg_att ?? 0) + (w.pat_att ?? 0),
    0,
  );

/**
 * Every player at a position whose current team is `team`, busiest first. Players keep
 * their whole season, including weeks with a previous team.
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const team = params.get("team") ?? "";
  const position = params.get("position");
  if (!TEAMS[team]) return Response.json({ error: "unknown team" }, { status: 400 });
  if (!isPosition(position)) {
    return Response.json({ error: "position must be QB, RB, WR, TE or K" }, { status: 400 });
  }
  try {
    const { data, headers } = await getDatasetFor(request);
    const teamWeeks = data.teamWeeks[team] ?? [];
    const upcoming = await upcomingWeeks(team, teamWeeks, data.latestWeek);
    const body: TeamResponse = {
      team,
      players: data.players
        .filter((p) => p.team === team && p.position === position)
        .map((p) => {
          const weeks = data.stats[p.id] ?? [];
          return { ...p, weeks, teamWeeks, upcomingWeeks: upcoming, touches: touches(weeks) };
        })
        .sort((a, b) => b.touches - a.touches || a.name.localeCompare(b.name)),
    };
    return Response.json(body, { headers });
  } catch (err) {
    return dataUnavailable(err);
  }
}
