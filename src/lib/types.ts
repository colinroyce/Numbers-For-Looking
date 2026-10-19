export const POSITIONS = ["QB", "RB", "WR", "TE", "K"] as const;
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
  "fg_made",
  "fg_att",
  "fg_long",
  "fg_made_50_59",
  "fg_made_60_",
  "pat_made",
  "pat_att",
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
  /** Short fingerprint of the source file; changes whenever nflverse publishes new numbers. */
  version: string;
  players: PlayerSummary[];
  stats: Record<string, WeeklyStat[]>;
  /** Weeks in which each team has at least one stat row, i.e. played a game. */
  teamWeeks: Record<string, number[]>;
};

export type MetaResponse = Pick<Dataset, "season" | "latestWeek" | "fetchedAt" | "version"> & {
  stale: boolean;
};

export type PlayersResponse = { players: PlayerSummary[] };

export type StatsResponse = {
  latestWeek: number;
  players: (PlayerSummary & {
    weeks: WeeklyStat[];
    teamWeeks: number[];
    /** Weeks where the team's game hasn't been played (or posted) yet: not a bye. */
    upcomingWeeks: number[];
  })[];
};

export type FieldPlayer = Pick<PlayerSummary, "id" | "name" | "team"> & { weeks: WeeklyStat[] };

export type FieldResponse = { players: FieldPlayer[] };

export type RefreshResponse = {
  /** new-week: a later week arrived · updated: same week, numbers changed · unchanged: nothing new */
  status: "new-week" | "updated" | "unchanged";
  message: string;
  meta: MetaResponse;
};

/** A player's season on one team, for team view, with usage for sorting and filtering. */
export type TeamPlayer = PlayerSummary & {
  weeks: WeeklyStat[];
  teamWeeks: number[];
  upcomingWeeks: number[];
  /** Targets + carries + pass attempts (kickers: FG + PAT attempts) on the season. */
  touches: number;
};

export type TeamResponse = { team: string; players: TeamPlayer[] };
