"use client";

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { PLAYER_COLORS } from "@/lib/colors";
import type { Metric } from "@/lib/metrics";
import { weekCell, weekRange, type ComparedPlayer } from "@/lib/weeks";

type Props = {
  metrics: Metric[];
  players: ComparedPlayer[];
  latestWeek: number;
};

type Row = { week: number } & Record<string, number | null>;

export default function TrendCharts({ metrics, players, latestWeek }: Props) {
  const weeks = weekRange(latestWeek);

  return (
    <section aria-label="Week-over-week trends" className="space-y-4">
      <ul className="flex flex-wrap gap-x-5 gap-y-2" aria-label="Legend">
        {players.map((p) => (
          <li key={p.id} className="flex items-center gap-2 text-sm text-ink-2">
            <svg width="18" height="8" aria-hidden>
              <line x1="0" y1="4" x2="18" y2="4" stroke={PLAYER_COLORS[p.slot]} strokeWidth="2" strokeLinecap="round" />
            </svg>
            {p.name}
          </li>
        ))}
      </ul>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {metrics.map((metric) => {
          const data: Row[] = weeks.map((week) => {
            const row: Row = { week };
            for (const p of players) {
              const cell = weekCell(p, week);
              row[p.id] = cell.kind === "game" ? metric.value(cell.stat) : null;
            }
            return row;
          });

          return (
            <figure key={metric.key} className="rounded-xl border border-line bg-surface p-4">
              <figcaption className="mb-3 text-sm font-medium text-ink">{metric.label}</figcaption>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -8 }}>
                    <CartesianGrid stroke="var(--grid)" vertical={false} />
                    <XAxis
                      dataKey="week"
                      tickFormatter={(w) => `W${w}`}
                      stroke="var(--axis)"
                      tick={{ fill: "var(--muted)", fontSize: 12 }}
                      tickLine={false}
                      padding={{ left: 12, right: 12 }}
                    />
                    <YAxis
                      stroke="var(--axis)"
                      tick={{ fill: "var(--muted)", fontSize: 12 }}
                      tickLine={false}
                      axisLine={false}
                      width={48}
                      allowDecimals={false}
                      tickFormatter={(v: number) => metric.format(v)}
                    />
                    <Tooltip
                      cursor={{ stroke: "var(--ink-2)", strokeWidth: 1, strokeOpacity: 0.4 }}
                      content={({ active, label }) =>
                        active ? <ChartTooltip week={Number(label)} metric={metric} players={players} /> : null
                      }
                    />
                    {players.map((p) => (
                      <Line
                        key={p.id}
                        dataKey={p.id}
                        name={p.name}
                        type="linear"
                        stroke={PLAYER_COLORS[p.slot]}
                        strokeWidth={2}
                        connectNulls={false}
                        dot={{ r: 4, fill: PLAYER_COLORS[p.slot], stroke: "var(--surface)", strokeWidth: 2 }}
                        activeDot={{ r: 5, stroke: "var(--surface)", strokeWidth: 2 }}
                        isAnimationActive={false}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </figure>
          );
        })}
      </div>
    </section>
  );
}

function ChartTooltip({ week, metric, players }: { week: number; metric: Metric; players: ComparedPlayer[] }) {
  return (
    <div className="min-w-44 rounded-lg border border-line bg-surface-2 px-3 py-2 text-xs shadow-xl shadow-black/40">
      <p className="mb-1.5 font-medium text-ink-2">Week {week}</p>
      <ul className="space-y-1">
        {players.map((p) => {
          const cell = weekCell(p, week);
          const value = cell.kind === "game" ? metric.value(cell.stat) : null;
          return (
            <li key={p.id} className="flex items-center gap-2">
              <svg width="12" height="6" aria-hidden className="shrink-0">
                <line x1="0" y1="3" x2="12" y2="3" stroke={PLAYER_COLORS[p.slot]} strokeWidth="2" strokeLinecap="round" />
              </svg>
              <span className="font-semibold tabular-nums text-ink">
                {cell.kind === "bye" ? "BYE" : value === null ? "—" : metric.format(value)}
              </span>
              <span className="truncate text-muted">
                {p.name}
                {cell.kind === "game" && cell.stat.opponent ? ` vs ${cell.stat.opponent}` : ""}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
