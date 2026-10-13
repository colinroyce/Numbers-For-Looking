import { NO_STORE_HEADERS, refreshDataset } from "@/lib/nflverse";
import { dataUnavailable } from "@/lib/api-errors";
import { gamesInWeek, nextUpdateNote } from "@/lib/schedule";
import type { Dataset, RefreshResponse } from "@/lib/types";

/** Games with stats posted in a week: each game puts two teams in `teamWeeks`. */
function gamesPosted(data: Dataset, week: number): number {
  return Object.values(data.teamWeeks).filter((weeks) => weeks.includes(week)).length / 2;
}

/**
 * Re-checks nflverse right now and reports, in plain words, what changed compared with
 * what the client is showing (it posts its current `version` and `latestWeek`).
 */
export async function POST(request: Request) {
  const shown = (await request.json().catch(() => ({}))) as { version?: string; latestWeek?: number };
  try {
    const after = await refreshDataset();
    const week = after.latestWeek;
    const posted = gamesPosted(after, week);
    const total = await gamesInWeek(week);
    const partial = total && posted < total ? ` (${posted} of ${total} games so far)` : "";
    const note = await nextUpdateNote(week, posted);

    let status: RefreshResponse["status"];
    let message: string;
    if (typeof shown.latestWeek === "number" && week > shown.latestWeek) {
      status = "new-week";
      message = `Pulled Week ${week} stats${partial}.`;
    } else if (shown.version && after.version !== shown.version) {
      status = "updated";
      message = `Updated stats through Week ${week}${partial}. nflverse posted new numbers.`;
    } else {
      status = "unchanged";
      message = `Up to date through Week ${week}${partial}.`;
    }
    if (note && status !== "updated") message += ` ${note}`;

    const body: RefreshResponse = {
      status,
      message,
      meta: {
        season: after.season,
        latestWeek: after.latestWeek,
        fetchedAt: after.fetchedAt,
        version: after.version,
        stale: false,
      },
    };
    return Response.json(body, { headers: NO_STORE_HEADERS });
  } catch (err) {
    return dataUnavailable(err);
  }
}
