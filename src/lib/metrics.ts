import type { Position, WeeklyStat } from "./types";

export type Metric = {
  key: string;
  label: string;
  /** Short label for dense table headers. */
  short: string;
  value: (w: WeeklyStat) => number | null;
  format: (v: number) => string;
  defaultChecked?: boolean;
};

const int = (v: number) => Math.round(v).toLocaleString("en-US");
const pct = (v: number) => `${v.toFixed(1)}%`;

const field =
  (name: keyof WeeklyStat) =>
  (w: WeeklyStat): number | null => {
    const v = w[name];
    return typeof v === "number" ? v : null;
  };

const M = {
  passYds: { key: "passYds", label: "Passing Yards", short: "Pass Yds", value: field("passing_yards"), format: int },
  passTd: { key: "passTd", label: "Passing TDs", short: "Pass TD", value: field("passing_tds"), format: int },
  int: { key: "int", label: "Interceptions", short: "INT", value: field("passing_interceptions"), format: int },
  compPct: {
    key: "compPct",
    label: "Completion %",
    short: "Comp %",
    value: (w) => (w.attempts ? ((w.completions ?? 0) / w.attempts) * 100 : null),
    format: pct,
  },
  attempts: { key: "attempts", label: "Pass Attempts", short: "Att", value: field("attempts"), format: int },
  rushYds: { key: "rushYds", label: "Rushing Yards", short: "Rush Yds", value: field("rushing_yards"), format: int },
  carries: { key: "carries", label: "Carries", short: "Car", value: field("carries"), format: int },
  rushTd: { key: "rushTd", label: "Rushing TDs", short: "Rush TD", value: field("rushing_tds"), format: int },
  targets: { key: "targets", label: "Targets", short: "Tgt", value: field("targets"), format: int },
  receptions: { key: "receptions", label: "Receptions", short: "Rec", value: field("receptions"), format: int },
  recYds: { key: "recYds", label: "Receiving Yards", short: "Rec Yds", value: field("receiving_yards"), format: int },
  recTd: { key: "recTd", label: "Receiving TDs", short: "Rec TD", value: field("receiving_tds"), format: int },
  tgtShare: {
    key: "tgtShare",
    label: "Target Share",
    short: "Tgt %",
    value: (w) => (w.target_share === null ? null : w.target_share * 100),
    format: pct,
  },
  airYds: { key: "airYds", label: "Air Yards", short: "Air Yds", value: field("receiving_air_yards"), format: int },
  yac: { key: "yac", label: "Yards After Catch", short: "YAC", value: field("receiving_yards_after_catch"), format: int },
} satisfies Record<string, Metric>;

const checked = (m: Metric): Metric => ({ ...m, defaultChecked: true });

const RECEIVER: Metric[] = [checked(M.recYds), checked(M.targets), checked(M.receptions), M.recTd, M.tgtShare, M.airYds, M.yac];

export const METRICS_BY_POSITION: Record<Position, Metric[]> = {
  QB: [checked(M.passYds), checked(M.passTd), checked(M.int), M.compPct, M.attempts, M.rushYds],
  RB: [checked(M.rushYds), checked(M.carries), M.rushTd, M.targets, M.receptions, checked(M.recYds), M.yac],
  WR: RECEIVER,
  TE: RECEIVER,
};

export function defaultMetricKeys(position: Position): string[] {
  return METRICS_BY_POSITION[position].filter((m) => m.defaultChecked).map((m) => m.key);
}
