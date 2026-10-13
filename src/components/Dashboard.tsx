"use client";

import { useEffect, useRef, useState } from "react";
import { RotateCcw, X } from "lucide-react";
import { PLAYER_COLORS } from "@/lib/colors";
import { METRICS_BY_POSITION, defaultMetricKeys } from "@/lib/metrics";
import type { MetaResponse, PlayerSummary, PlayersResponse, Position, StatsResponse } from "@/lib/types";
import type { ComparedPlayer } from "@/lib/weeks";
import ComparisonTable from "./ComparisonTable";
import MetricSelector from "./MetricSelector";
import PlayerSearch from "./PlayerSearch";
import PositionSelector from "./PositionSelector";
import TrendCharts from "./TrendCharts";

const MAX_PLAYERS = 3;

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  const body = await res.json();
  if (!res.ok) throw new Error(body?.error ?? `Request failed (${res.status})`);
  return body as T;
}

export default function Dashboard() {
  const [meta, setMeta] = useState<MetaResponse | null>(null);
  const [position, setPosition] = useState<Position | null>(null);
  const [roster, setRoster] = useState<PlayerSummary[]>([]);
  const [rosterLoading, setRosterLoading] = useState(false);
  const [selected, setSelected] = useState<ComparedPlayer[]>([]);
  const [pending, setPending] = useState(0);
  const [metricKeys, setMetricKeys] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  // Guards against a slow response landing after the user switched position.
  const positionRef = useRef<Position | null>(null);

  useEffect(() => {
    getJson<MetaResponse>("/api/meta").then(setMeta, (e: Error) => setError(e.message));
  }, []);

  function choosePosition(next: Position) {
    if (next === position) return;
    positionRef.current = next;
    setPosition(next);
    setSelected([]);
    setMetricKeys(defaultMetricKeys(next));
    setRoster([]);
    setRosterLoading(true);
    setError(null);
    getJson<PlayersResponse>(`/api/players?position=${next}`)
      .then((r) => positionRef.current === next && setRoster(r.players))
      .catch((e: Error) => setError(e.message))
      .finally(() => positionRef.current === next && setRosterLoading(false));
  }

  function addPlayer(player: PlayerSummary) {
    const forPosition = position;
    setPending((n) => n + 1);
    setError(null);
    getJson<StatsResponse>(`/api/stats?ids=${encodeURIComponent(player.id)}`)
      .then(({ players }) => {
        const stats = players[0];
        if (!stats || positionRef.current !== forPosition) return;
        setSelected((cur) => {
          // Lowest free color slot; a player keeps their color until removed.
          const used = new Set(cur.map((p) => p.slot));
          const slot = PLAYER_COLORS.findIndex((_, s) => !used.has(s));
          if (slot === -1 || cur.some((p) => p.id === stats.id)) return cur;
          return [...cur, { ...stats, slot }];
        });
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setPending((n) => n - 1));
  }

  function clearAll() {
    setSelected([]);
    if (position) setMetricKeys(defaultMetricKeys(position));
  }

  const metrics = position ? METRICS_BY_POSITION[position] : [];
  const checkedMetrics = metrics.filter((m) => metricKeys.includes(m.key));
  const latestWeek = meta?.latestWeek ?? 0;

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 py-6 sm:px-6 lg:py-10">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Numbers For Looking</h1>
          <p className="mt-1 text-sm text-ink-2">See the trends. Compare the stats. Trust your eyes.</p>
        </div>
        <p className="text-xs text-muted">
          {meta ? `${meta.season} regular season · through Week ${meta.latestWeek}` : "Loading season data…"}
        </p>
      </header>

      <section aria-label="Controls" className="flex flex-col gap-4 rounded-xl border border-line bg-surface p-4">
        <div className="flex flex-wrap items-center gap-3">
          <PositionSelector value={position} onChange={choosePosition} />
          <PlayerSearch
            players={roster}
            selectedIds={selected.map((p) => p.id)}
            maxReached={selected.length + pending >= MAX_PLAYERS}
            loading={rosterLoading}
            disabled={!position}
            onAdd={addPlayer}
          />
          <button
            type="button"
            onClick={clearAll}
            disabled={selected.length === 0}
            className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-2 text-sm text-ink-2 hover:bg-surface-2 hover:text-ink disabled:pointer-events-none disabled:opacity-40"
          >
            <RotateCcw className="size-4" aria-hidden />
            Clear
          </button>
        </div>

        {selected.length > 0 && (
          <ul className="flex flex-wrap gap-2" aria-label="Selected players">
            {selected.map((p) => (
              <li
                key={p.id}
                className="flex items-center gap-2 rounded-full border border-line bg-surface-2 py-1 pl-3 pr-1 text-sm"
              >
                <span className="h-0.5 w-4 rounded" style={{ background: PLAYER_COLORS[p.slot] }} aria-hidden />
                <span className="text-ink">{p.name}</span>
                <span className="text-xs text-muted">{p.team}</span>
                <button
                  type="button"
                  aria-label={`Remove ${p.name}`}
                  onClick={() => setSelected((cur) => cur.filter((c) => c.id !== p.id))}
                  className="rounded-full p-1 text-muted hover:bg-white/10 hover:text-ink"
                >
                  <X className="size-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}

        {position && (
          <MetricSelector
            metrics={metrics}
            selected={metricKeys}
            onToggle={(key) =>
              setMetricKeys((cur) => (cur.includes(key) ? cur.filter((k) => k !== key) : [...cur, key]))
            }
          />
        )}
      </section>

      {error && (
        <p role="alert" className="rounded-lg border border-[#d03b3b]/50 bg-[#d03b3b]/10 px-4 py-3 text-sm text-ink">
          {error}
        </p>
      )}

      {selected.length === 0 ? (
        <EmptyState hasPosition={!!position} />
      ) : checkedMetrics.length === 0 ? (
        <EmptyState message="Check at least one stat to chart." />
      ) : (
        <>
          <TrendCharts metrics={checkedMetrics} players={selected} latestWeek={latestWeek} />
          <ComparisonTable metrics={checkedMetrics} players={selected} latestWeek={latestWeek} />
        </>
      )}

      <footer className="mt-auto pt-4 text-xs text-muted">
        Stats: <a className="underline hover:text-ink-2" href="https://github.com/nflverse/nflverse-data">nflverse</a>{" "}
        weekly player stats (regular season).
        {meta && ` Last fetched ${new Date(meta.fetchedAt).toLocaleString()}.`}
        {meta?.stale && " Showing cached data — the latest refresh failed."}
      </footer>
    </div>
  );
}

function EmptyState({ hasPosition, message }: { hasPosition?: boolean; message?: string }) {
  return (
    <div className="flex min-h-64 items-center justify-center rounded-xl border border-dashed border-line px-6 text-center text-sm text-muted">
      {message ??
        (hasPosition
          ? "Search or browse the list to add up to 3 players."
          : "Pick a position, then add up to 3 players to compare.")}
    </div>
  );
}
