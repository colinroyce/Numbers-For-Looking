import type { StatsResponse, WeeklyStat } from "./types";

/** A player on the charts: `slot` orders them, `color` is their line color everywhere. */
export type ComparedPlayer = StatsResponse["players"][number] & { slot: number; color: string };

/** What happened for a player in a given week. */
export type WeekCell =
  | { kind: "game"; stat: WeeklyStat }
  | { kind: "bye" } // their team had no game
  | { kind: "upcoming" } // their team's game hasn't been played (or posted) yet
  | { kind: "dnp" }; // team played, player has no stat line

export function weekRange(latestWeek: number): number[] {
  return Array.from({ length: latestWeek }, (_, i) => i + 1);
}

export function weekCell(player: ComparedPlayer, week: number): WeekCell {
  const stat = player.weeks.find((w) => w.week === week);
  if (stat) return { kind: "game", stat };
  if (player.teamWeeks.includes(week)) return { kind: "dnp" };
  // `upcomingWeeks` can be missing from responses cached before it existed.
  return player.upcomingWeeks?.includes(week) ? { kind: "upcoming" } : { kind: "bye" };
}
