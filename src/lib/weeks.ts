import type { StatsResponse, WeeklyStat } from "./types";

export type ComparedPlayer = StatsResponse["players"][number] & { slot: number };

/** What happened for a player in a given week. */
export type WeekCell =
  | { kind: "game"; stat: WeeklyStat }
  | { kind: "bye" } // their team had no game
  | { kind: "dnp" }; // team played, player has no stat line

export function weekRange(latestWeek: number): number[] {
  return Array.from({ length: latestWeek }, (_, i) => i + 1);
}

export function weekCell(player: ComparedPlayer, week: number): WeekCell {
  const stat = player.weeks.find((w) => w.week === week);
  if (stat) return { kind: "game", stat };
  return player.teamWeeks.includes(week) ? { kind: "dnp" } : { kind: "bye" };
}
