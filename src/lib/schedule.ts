import "server-only";
import Papa from "papaparse";
import { SEASON } from "./nflverse";

/** nflverse's game schedule (all seasons); only used to word the Refresh message. */
const SCHEDULE_URL = "https://github.com/nflverse/nfldata/raw/master/data/games.csv";
const TTL_MS = 12 * 60 * 60 * 1000;

type Game = { week: number; gameday: string; played: boolean; teams: [string, string] };

let cached: { games: Game[]; expiresAt: number } | null = null;

async function getSchedule(): Promise<Game[]> {
  if (cached && Date.now() < cached.expiresAt) return cached.games;
  const res = await fetch(SCHEDULE_URL, { cache: "no-store" });
  if (!res.ok) throw new Error(`nflverse schedule responded ${res.status}`);
  const { data } = Papa.parse<Record<string, string>>(await res.text(), { header: true, skipEmptyLines: true });
  const games = data
    .filter((g) => g.season === String(SEASON) && g.game_type === "REG")
    .map((g) => ({
      week: Number(g.week),
      gameday: g.gameday,
      played: g.result !== "" && g.result !== "NA",
      teams: [g.away_team, g.home_team] as [string, string],
    }));
  cached = { games, expiresAt: Date.now() + TTL_MS };
  return games;
}

/** "2026-10-15" → "Thu, Oct 15" (the date as scheduled, not shifted by time zone). */
function formatDay(gameday: string): string {
  return new Date(`${gameday}T12:00:00Z`).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

/**
 * One sentence on what to expect next, given the latest week with stats and how many
 * of that week's games have stats posted. Null when the schedule can't be loaded.
 */
export async function nextUpdateNote(latestWeek: number, gamesPosted: number): Promise<string | null> {
  let games: Game[];
  try {
    games = await getSchedule();
  } catch (err) {
    console.error(err);
    return null;
  }

  const current = games.filter((g) => g.week === latestWeek);
  if (gamesPosted < current.length) {
    const playedNotPosted = current.filter((g) => g.played).length - gamesPosted;
    if (playedNotPosted > 0) {
      return `${playedNotPosted} more Week ${latestWeek} ${playedNotPosted === 1 ? "game has" : "games have"} been played; nflverse usually posts stats within a day.`;
    }
    const nextDay = current.filter((g) => !g.played).map((g) => g.gameday).sort()[0];
    return nextDay ? `More Week ${latestWeek} games on ${formatDay(nextDay)}.` : null;
  }

  const next = games.filter((g) => g.week === latestWeek + 1);
  if (next.length === 0) return "That's the end of the regular season.";
  if (next.some((g) => g.played)) {
    return `Week ${latestWeek + 1} games have been played; nflverse usually posts stats within a day.`;
  }
  const kickoff = next.map((g) => g.gameday).sort()[0];
  return `Week ${latestWeek + 1} kicks off ${formatDay(kickoff)}.`;
}

/** Games in this week's schedule (for "1 of 14 games so far"). */
export async function gamesInWeek(week: number): Promise<number | null> {
  try {
    return (await getSchedule()).filter((g) => g.week === week).length;
  } catch {
    return null;
  }
}

/**
 * Weeks (up to `latestWeek`) in which `team` has a game scheduled but no stats posted
 * yet, so the UI can say "not played yet" instead of "BYE" in a partly played week.
 * Empty if the schedule can't be loaded (the UI then falls back to "BYE").
 */
export async function upcomingWeeks(team: string, teamWeeks: number[], latestWeek: number): Promise<number[]> {
  let games: Game[];
  try {
    games = await getSchedule();
  } catch {
    return [];
  }
  const scheduled = new Set(games.filter((g) => g.teams.includes(team)).map((g) => g.week));
  const weeks: number[] = [];
  for (let w = 1; w <= latestWeek; w++) if (scheduled.has(w) && !teamWeeks.includes(w)) weeks.push(w);
  return weeks;
}
