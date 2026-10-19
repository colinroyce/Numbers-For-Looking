"use client";

import { memo, useMemo, useState } from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { Metric } from "@/lib/metrics";
import type { FieldPlayer } from "@/lib/types";
import { weekCell, weekRange, type ComparedPlayer } from "@/lib/weeks";
import { Headshot, TeamLogo } from "./PlayerBadge";

type Props = {
  metrics: Metric[];
  players: ComparedPlayer[];
  /** Every player at the position, drawn as faint gray context lines. Null when the toggle is off. */
  field: FieldPlayer[] | null;
  fieldLabel: string;
  latestWeek: number;
  /** Whether another pick fits (see MAX_PLAYERS); clicking a gray line adds that player. */
  canAdd: boolean;
  onAddPlayer: (id: string) => void;
  /** Team view: tooltips list players highest value first (there can be up to 9). */
  sortTooltip?: boolean;
};

/** Opacity of the other players' lines while one player is focused. */
const DIMMED = 0.15;

const FIELD_STROKE = "rgba(195, 194, 183, 0.11)";
const FIELD_HOVER_STROKE = "#c3c2b7";
/** Field series keys are prefixed so they can never collide with a pick's key. */
const fieldKey = (id: string) => `f:${id}`;

type Row = { week: number } & Record<string, number | null>;

/** Smallest step of 1, 2, 2.5 or 5 × 10ⁿ (never below 1) that is at least `raw`. */
function niceStep(raw: number): number {
  if (raw <= 1) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  return [1, 2, 2.5, 5, 10].map((m) => m * magnitude).find((step) => step >= raw)!;
}

/**
 * Evenly spaced round ticks from 0 to just above the max. A rare negative value (e.g. -4
 * receiving yards) stretches the axis only as far as the data needs, without an extra tick.
 */
function yScale(rows: Row[]): { domain: [number, number]; ticks: number[] } {
  let min = 0;
  let max = 0;
  for (const row of rows) {
    for (const [key, v] of Object.entries(row)) {
      if (key === "week" || v === null) continue;
      min = Math.min(min, v);
      max = Math.max(max, v);
    }
  }
  const step = niceStep(max / 5);
  const top = Math.max(step, Math.ceil(max / step) * step);
  const ticks = Array.from({ length: Math.round(top / step) + 1 }, (_, i) => i * step);
  return { domain: [min, top], ticks };
}

export default function TrendCharts({
  metrics,
  players,
  field,
  fieldLabel,
  latestWeek,
  canAdd,
  onAddPlayer,
  sortTooltip = false,
}: Props) {
  // Hovering a legend entry or a colored line brings that player forward on every chart.
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const focused = players.some((p) => p.id === focusedId) ? focusedId : null;

  // Picks are drawn in color, so leave them out of the gray field.
  const fieldPlayers = useMemo(
    () => field?.filter((f) => !players.some((p) => p.id === f.id)) ?? [],
    [field, players],
  );

  return (
    <section aria-label="Week-over-week trends" className="space-y-4">
      <ul className="flex flex-wrap items-center gap-x-6 gap-y-2" aria-label="Legend">
        {players.map((p) => (
          <li
            key={p.id}
            tabIndex={0}
            onMouseEnter={() => setFocusedId(p.id)}
            onMouseLeave={() => setFocusedId(null)}
            onFocus={() => setFocusedId(p.id)}
            onBlur={() => setFocusedId(null)}
            className={`flex cursor-default items-center gap-2 rounded-md text-sm text-ink-2 outline-none transition-opacity focus-visible:ring-2 focus-visible:ring-accent ${
              focused && focused !== p.id ? "opacity-40" : ""
            }`}
          >
            <svg width="18" height="8" aria-hidden>
              <line x1="0" y1="4" x2="18" y2="4" stroke={p.color} strokeWidth="2" strokeLinecap="round" />
            </svg>
            <Headshot name={p.name} url={p.headshot} size={28} />
            <span className="text-ink">{p.name}</span>
            <TeamLogo team={p.team} size={20} />
          </li>
        ))}
        {field && (
          <li className="flex items-center gap-2 text-sm text-muted">
            <svg width="18" height="8" aria-hidden>
              <line x1="0" y1="4" x2="18" y2="4" stroke={FIELD_HOVER_STROKE} strokeOpacity="0.5" strokeWidth="1" />
            </svg>
            {fieldLabel} · hover a gray line to see who it is, click to add them
          </li>
        )}
      </ul>

      {/* A single chart takes the full width; two or more sit side by side on wide screens. */}
      <div className={`grid grid-cols-1 gap-4 ${metrics.length > 1 ? "lg:grid-cols-2" : ""}`}>
        {metrics.map((metric) => (
          <MetricChart
            key={metric.key}
            metric={metric}
            players={players}
            fieldPlayers={fieldPlayers}
            latestWeek={latestWeek}
            canAdd={canAdd}
            onAddPlayer={onAddPlayer}
            focusedId={focused}
            onFocusPlayer={setFocusedId}
            sortTooltip={sortTooltip}
          />
        ))}
      </div>
    </section>
  );
}

type ChartProps = {
  metric: Metric;
  players: ComparedPlayer[];
  fieldPlayers: FieldPlayer[];
  latestWeek: number;
  canAdd: boolean;
  onAddPlayer: (id: string) => void;
  focusedId: string | null;
  onFocusPlayer: (id: string | null) => void;
  sortTooltip: boolean;
};

// Memoized with hover state kept per chart, so hovering one chart doesn't re-render the rest.
const MetricChart = memo(function MetricChart({
  metric,
  players,
  fieldPlayers,
  latestWeek,
  canAdd,
  onAddPlayer,
  focusedId,
  onFocusPlayer,
  sortTooltip,
}: ChartProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const hovered = fieldPlayers.find((f) => f.id === hoveredId) ?? null;

  const data = useMemo(
    () =>
      weekRange(latestWeek).map((week) => {
        const row: Row = { week };
        for (const f of fieldPlayers) {
          const stat = f.weeks.find((w) => w.week === week);
          row[fieldKey(f.id)] = stat ? metric.value(stat) : null;
        }
        for (const p of players) {
          const cell = weekCell(p, week);
          row[p.id] = cell.kind === "game" ? metric.value(cell.stat) : null;
        }
        return row;
      }),
    [metric, players, fieldPlayers, latestWeek],
  );
  const y = useMemo(() => yScale(data), [data]);

  return (
    <figure className="rounded-xl border border-line bg-surface p-4">
      <figcaption className="mb-3 flex items-baseline justify-between gap-3 text-sm">
        <span className="font-medium text-ink">{metric.label}</span>
        {hovered && (
          <span className="truncate text-xs text-ink-2">
            {hovered.name} <span className="text-muted">{hovered.team}</span>
            <span className="text-muted"> · {canAdd ? "click to add" : "remove a pick to add"}</span>
          </span>
        )}
      </figcaption>
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
              domain={y.domain}
              ticks={y.ticks}
              interval={0}
              tickFormatter={(v: number) => (metric.tick ?? metric.format)(v)}
            />
            <Tooltip
              cursor={{ stroke: "var(--ink-2)", strokeWidth: 1, strokeOpacity: 0.4 }}
              content={({ active, label }) =>
                active && (players.length > 0 || hovered) ? (
                  <ChartTooltip
                    week={Number(label)}
                    metric={metric}
                    players={players}
                    hovered={hovered}
                    focusedId={focusedId}
                    sort={sortTooltip}
                  />
                ) : null
              }
            />

            {fieldPlayers.map((f) => (
              <Line
                key={f.id}
                dataKey={fieldKey(f.id)}
                stroke={FIELD_STROKE}
                strokeWidth={1}
                dot={false}
                activeDot={false}
                connectNulls={false}
                isAnimationActive={false}
              />
            ))}
            {/* Wide invisible copies give each thin gray line a usable hover target. */}
            {fieldPlayers.map((f) => (
              <Line
                key={`hit-${f.id}`}
                dataKey={fieldKey(f.id)}
                stroke="transparent"
                strokeWidth={10}
                dot={false}
                activeDot={false}
                connectNulls={false}
                isAnimationActive={false}
                onMouseEnter={() => setHoveredId(f.id)}
                onMouseLeave={() => setHoveredId((cur) => (cur === f.id ? null : cur))}
                onClick={() => canAdd && onAddPlayer(f.id)}
                style={{ cursor: canAdd ? "pointer" : "not-allowed" }}
              />
            ))}
            {hovered && (
              <Line
                dataKey={fieldKey(hovered.id)}
                stroke={FIELD_HOVER_STROKE}
                strokeWidth={1.5}
                dot={{ r: 3, fill: FIELD_HOVER_STROKE, stroke: "var(--surface)", strokeWidth: 1 }}
                activeDot={false}
                connectNulls={false}
                isAnimationActive={false}
                style={{ pointerEvents: "none" }}
              />
            )}

            {/* The focused player is drawn last so their line sits on top. */}
            {[...players]
              .sort((a, b) => Number(a.id === focusedId) - Number(b.id === focusedId))
              .map((p) => {
                const opacity = focusedId && focusedId !== p.id ? DIMMED : 1;
                return (
                  <Line
                    key={p.id}
                    dataKey={p.id}
                    name={p.name}
                    type="linear"
                    stroke={p.color}
                    strokeOpacity={opacity}
                    strokeWidth={p.id === focusedId ? 2.5 : 2}
                    connectNulls={false}
                    dot={{ r: 4, fill: p.color, fillOpacity: opacity, stroke: "var(--surface)", strokeWidth: 2 }}
                    activeDot={focusedId && focusedId !== p.id ? false : { r: 5, stroke: "var(--surface)", strokeWidth: 2 }}
                    isAnimationActive={false}
                  />
                );
              })}
            {/* Wide invisible copies: hovering near a colored line focuses that player. */}
            {players.map((p) => (
              <Line
                key={`focus-${p.id}`}
                dataKey={p.id}
                stroke="transparent"
                strokeWidth={10}
                dot={false}
                activeDot={false}
                connectNulls={false}
                isAnimationActive={false}
                onMouseEnter={() => onFocusPlayer(p.id)}
                onMouseLeave={() => onFocusPlayer(null)}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </figure>
  );
});

type TooltipProps = {
  week: number;
  metric: Metric;
  players: ComparedPlayer[];
  hovered: FieldPlayer | null;
  focusedId: string | null;
  sort: boolean;
};

function ChartTooltip({ week, metric, players, hovered, focusedId, sort }: TooltipProps) {
  const hoveredStat = hovered?.weeks.find((w) => w.week === week);
  const hoveredValue = hoveredStat ? metric.value(hoveredStat) : null;
  const rows = players.map((p) => {
    const cell = weekCell(p, week);
    return { p, cell, value: cell.kind === "game" ? metric.value(cell.stat) : null };
  });
  // Highest first; players without a value that week go last.
  if (sort) rows.sort((a, b) => (b.value ?? -Infinity) - (a.value ?? -Infinity));

  return (
    <div className="min-w-44 rounded-lg border border-line bg-surface-2 px-3 py-2 text-xs shadow-xl shadow-black/40">
      <p className="mb-1.5 font-medium text-ink-2">Week {week}</p>
      <ul className="space-y-1">
        {rows.map(({ p, cell, value }) => (
          <TooltipRow
            key={p.id}
            color={p.color}
            value={cell.kind === "bye" ? "BYE" : value === null ? "—" : metric.format(value)}
            label={`${p.name}${cell.kind === "game" && cell.stat.opponent ? ` vs ${cell.stat.opponent}` : ""}`}
            dim={focusedId !== null && focusedId !== p.id}
          />
        ))}
        {hovered && (
          <TooltipRow
            color={FIELD_HOVER_STROKE}
            value={hoveredValue === null ? "—" : metric.format(hoveredValue)}
            label={`${hovered.name}${hoveredStat?.opponent ? ` vs ${hoveredStat.opponent}` : ""}`}
          />
        )}
      </ul>
    </div>
  );
}

function TooltipRow({ color, value, label, dim = false }: { color: string; value: string; label: string; dim?: boolean }) {
  return (
    <li className={`flex items-center gap-2 ${dim ? "opacity-40" : ""}`}>
      <svg width="12" height="6" aria-hidden className="shrink-0">
        <line x1="0" y1="3" x2="12" y2="3" stroke={color} strokeWidth="2" strokeLinecap="round" />
      </svg>
      <span className="font-semibold tabular-nums text-ink">{value}</span>
      <span className="truncate text-muted">{label}</span>
    </li>
  );
}
