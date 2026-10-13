import type { NextRequest } from "next/server";
import { getDatasetFor } from "@/lib/nflverse";
import { isPosition, type FieldResponse } from "@/lib/types";
import { dataUnavailable } from "@/lib/api-errors";

/** Every player's weekly lines for one position — the gray "field" behind the picks. */
export async function GET(request: NextRequest) {
  const position = request.nextUrl.searchParams.get("position");
  if (!isPosition(position)) {
    return Response.json({ error: "position must be QB, RB, WR or TE" }, { status: 400 });
  }
  try {
    const { data, headers } = await getDatasetFor(request);
    const body: FieldResponse = {
      players: data.players
        .filter((p) => p.position === position)
        .map((p) => ({ id: p.id, name: p.name, team: p.team, weeks: data.stats[p.id] ?? [] })),
    };
    return Response.json(body, { headers });
  } catch (err) {
    return dataUnavailable(err);
  }
}
