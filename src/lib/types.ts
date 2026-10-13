export const POSITIONS = ["QB", "RB", "WR", "TE"] as const;
export type Position = (typeof POSITIONS)[number];

export function isPosition(value: unknown): value is Position {
  return typeof value === "string" && (POSITIONS as readonly string[]).includes(value);
}

/** Raw numeric stat fields we keep from the nflverse weekly file. */
export const STAT_FIELDS = [
  "completions",
  "attempts",
  "passing_yards",
  "passing_tds",
  "passing_interceptions",
  "carries",
  "rushing_yards",
  "rushing_tds",
  "targets",
  "receptions",
  "receiving_yards",
  "receiving_tds",
  "receiving_air_yards",
  "receiving_yards_after_catch",
  "target_share",
] as const;
export type StatField = (typeof STAT_FIELDS)[number];

/** One player's line for one regular-season week. */
export type WeeklyStat = {
  week: number;
  team: string;
  opponent: string;
} & Record<StatField, number | null>;

export type PlayerSummary = {
  id: string;
  name: string;
  position: Position;
  team: string;
  headshot: string | null;
  games: number;
};

export type Dataset = {
  season: number;
  latestWeek: number;
  fetchedAt: string;
  players: PlayerSummary[];
  stats: Record<string, WeeklyStat[]>;
  /** Weeks in which each team has at least one stat row, i.e. played a game. */
  teamWeeks: Record<string, number[]>;
};

export type MetaResponse = Pick<Dataset, "season" | "latestWeek" | "fetchedAt"> & {
  stale: boolean;
};

export type PlayersResponse = { players: PlayerSummary[] };

export type StatsResponse = {
  latestWeek: number;
  players: (PlayerSummary & { weeks: WeeklyStat[]; teamWeeks: number[] })[];
};
