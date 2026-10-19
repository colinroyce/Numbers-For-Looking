"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { RefreshCw, RotateCcw, Shield, User, Users, X } from "lucide-react";
import { MAX_PLAYERS, PLAYER_COLORS, teamColor } from "@/lib/colors";
import { METRICS_BY_POSITION, defaultMetricKeys } from "@/lib/metrics";
import { CONTRIBUTOR_MIN_TOUCHES, TEAMS } from "@/lib/teams";
import type {
  FieldPlayer,
  FieldResponse,
  MetaResponse,
  PlayerSummary,
  PlayersResponse,
  Position,
  RefreshResponse,
  StatsResponse,
  TeamResponse,
} from "@/lib/types";
import type { ComparedPlayer } from "@/lib/weeks";
import ComparisonTable from "./ComparisonTable";
import MetricSelector from "./MetricSelector";
import PlayerSearch from "./PlayerSearch";
import PositionSelector from "./PositionSelector";
import TeamSelector from "./TeamSelector";
import TrendCharts from "./TrendCharts";

async function getJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const body = await res.json();
  if (!res.ok) throw new Error(body?.error ?? `Request failed (${res.status})`);
  return body as T;
}

type Mode = "players" | "team";
type TeamMember = ComparedPlayer & { touches: number };

export default function Dashboard() {
  const [meta, setMeta] = useState<MetaResponse | null>(null);
  const [position, setPosition] = useState<Position | null>(null);
  const [roster, setRoster] = useState<PlayerSummary[]>([]);
  const [rosterLoading, setRosterLoading] = useState(false);
  const [selected, setSelected] = useState<ComparedPlayer[]>([]);
  const [pending, setPending] = useState(0);
  const [metricKeys, setMetricKeys] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showField, setShowField] = useState(false);
  const [field, setField] = useState<FieldPlayer[] | null>(null);
  const fieldCache = useRef(new Map<Position, FieldPlayer[]>());
  const [refreshing, setRefreshing] = useState(false);
  const [refreshNote, setRefreshNote] = useState<string | null>(null);
  // Data version from /api/meta, sent with every data request so caches can't mix versions.
  const versionRef = useRef<string | null>(null);
  // Guards against a slow response landing after the user switched position.
  const positionRef = useRef<Position | null>(null);
  // Team view: a separate mode, so the player picks above are kept while it's on.
  const [mode, setMode] = useState<Mode>("players");
  const [team, setTeam] = useState<string | null>(null);
  const [teamPlayers, setTeamPlayers] = useState<TeamMember[] | null>(null);
  const [showAllTeam, setShowAllTeam] = useState(false);
  const teamRequest = useRef("");

  useEffect(() => {
    getJson<MetaResponse>("/api/meta").then((m) => {
      versionRef.current = m.version;
      setMeta(m);
    }, (e: Error) => setError(e.message));
  }, []);

  // Hide the refresh message after a few seconds.
  useEffect(() => {
    if (!refreshNote) return;
    const timer = setTimeout(() => setRefreshNote(null), 8000);
    return () => clearTimeout(timer);
  }, [refreshNote]);

  function api(path: string) {
    const v = versionRef.current;
    return v ? `${path}${path.includes("?") ? "&" : "?"}v=${v}` : path;
  }

  function loadField(pos: Position) {
    const cached = fieldCache.current.get(pos);
    if (cached) {
      setField(cached);
      return;
    }
    setField(null);
    getJson<FieldResponse>(api(`/api/field?position=${pos}`))
      .then(({ players }) => {
        fieldCache.current.set(pos, players);
        if (positionRef.current === pos) setField(players);
      })
      .catch((e: Error) => setError(e.message));
  }

  function toggleField() {
    const next = !showField;
    setShowField(next);
    if (next && position) loadField(position);
  }

  function choosePosition(next: Position) {
    if (next === position) return;
    positionRef.current = next;
    setPosition(next);
    setSelected([]);
    setMetricKeys(defaultMetricKeys(next));
    setRoster([]);
    setError(null);
    if (showField) loadField(next);
    loadRoster(next);
    if (team) loadTeam(team, next);
  }

  function loadTeam(abbr: string, pos: Position) {
    const key = `${abbr}:${pos}`;
    teamRequest.current = key;
    setTeamPlayers(null);
    getJson<TeamResponse>(api(`/api/team?team=${abbr}&position=${pos}`))
      .then(({ players }) => {
        if (teamRequest.current !== key) return;
        // Colors go busiest-first over the whole list, so "show everyone" only adds
        // colors and never repaints the players already on screen.
        setTeamPlayers(players.map((p, i) => ({ ...p, slot: i, color: teamColor(i) })));
      })
      .catch((e: Error) => setError(e.message));
  }

  function chooseTeam(abbr: string) {
    setTeam(abbr);
    setShowAllTeam(false);
    setError(null);
    if (position) loadTeam(abbr, position);
  }

  function loadRoster(pos: Position) {
    setRosterLoading(true);
    getJson<PlayersResponse>(api(`/api/players?position=${pos}`))
      .then((r) => positionRef.current === pos && setRoster(r.players))
      .catch((e: Error) => setError(e.message))
      .finally(() => positionRef.current === pos && setRosterLoading(false));
  }

  async function refreshStats() {
    setRefreshing(true);
    setRefreshNote(null);
    setError(null);
    try {
      const result = await getJson<RefreshResponse>("/api/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ version: meta?.version, latestWeek: meta?.latestWeek }),
      });
      versionRef.current = result.meta.version;
      setMeta(result.meta);
      setRefreshNote(result.message);
      if (result.status === "unchanged") return;

      // New numbers: reload what's on screen, keeping the current picks and their colors.
      fieldCache.current.clear();
      const pos = positionRef.current;
      if (!pos) return;
      loadRoster(pos);
      if (showField) loadField(pos);
      if (team) loadTeam(team, pos);
      const ids = selected.map((p) => p.id);
      if (ids.length > 0) {
        const { players } = await getJson<StatsResponse>(api(`/api/stats?ids=${ids.map(encodeURIComponent).join(",")}`));
        if (positionRef.current !== pos) return;
        setSelected((cur) =>
          cur.map((p) => {
            const fresh = players.find((f) => f.id === p.id);
            return fresh ? { ...fresh, slot: p.slot, color: p.color } : p;
          }),
        );
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setRefreshing(false);
    }
  }

  function addPlayer(player: PlayerSummary) {
    const forPosition = position;
    setPending((n) => n + 1);
    setError(null);
    getJson<StatsResponse>(api(`/api/stats?ids=${encodeURIComponent(player.id)}`))
      .then(({ players }) => {
        const stats = players[0];
        if (!stats || positionRef.current !== forPosition) return;
        setSelected((cur) => {
          // Lowest free color slot; a player keeps their color until removed.
          const used = new Set(cur.map((p) => p.slot));
          const slot = PLAYER_COLORS.findIndex((_, s) => !used.has(s));
          if (slot === -1 || cur.some((p) => p.id === stats.id)) return cur;
          return [...cur, { ...stats, slot, color: PLAYER_COLORS[slot] }];
        });
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setPending((n) => n - 1));
  }

  // Clicking a gray "All Players" line adds that player, same as picking them from the list.
  function addPlayerById(id: string) {
    const player = roster.find((p) => p.id === id);
    if (player) addPlayer(player);
  }

  function clearAll() {
    if (mode === "team") {
      setTeam(null);
      setTeamPlayers(null);
      teamRequest.current = "";
    } else {
      setSelected([]);
      setShowField(false);
    }
    if (position) setMetricKeys(defaultMetricKeys(position));
  }

  const metrics = position ? METRICS_BY_POSITION[position] : [];
  const checkedMetrics = metrics.filter((m) => metricKeys.includes(m.key));
  const latestWeek = meta?.latestWeek ?? 0;

  const contributors = teamPlayers?.filter((p) => p.touches >= CONTRIBUTOR_MIN_TOUCHES) ?? [];
  // Fall back to everyone if nobody reaches the threshold (e.g. early in the season).
  const teamShown = showAllTeam || contributors.length === 0 ? (teamPlayers ?? []) : contributors;
  const hiddenCount = (teamPlayers?.length ?? 0) - teamShown.length;
  const inTeamMode = mode === "team";
  const shown = inTeamMode ? teamShown : selected;

  return (
    <div className="flex w-full flex-1 flex-col gap-6 px-4 py-6 sm:px-6 lg:py-10">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex items-center gap-3 sm:gap-4">
          <Image src="/logo.png" alt="" width={110} height={160} priority className="h-14 w-auto sm:h-[72px]" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Numbers For Looking</h1>
            <p className="mt-1 text-sm text-ink-2">See the trends. Compare the stats. Trust your eyes.</p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <div className="flex items-center gap-3">
            <p className="text-xs text-muted">
              {meta ? `${meta.season} regular season · through Week ${meta.latestWeek}` : "Loading season data…"}
            </p>
            <button
              type="button"
              onClick={refreshStats}
              disabled={refreshing || !meta}
              className="inline-flex items-center gap-1.5 rounded-lg border border-line px-2.5 py-1.5 text-xs text-ink-2 hover:bg-surface-2 hover:text-ink disabled:pointer-events-none disabled:opacity-50"
            >
              <RefreshCw className={`size-3.5 ${refreshing ? "animate-spin" : ""}`} aria-hidden />
              {refreshing ? "Checking…" : "Check for new stats"}
            </button>
          </div>
          <p role="status" className="min-h-4 text-right text-xs text-ink-2">
            {refreshNote}
          </p>
        </div>
      </header>

      <section aria-label="Controls" className="flex flex-col gap-4 rounded-xl border border-line bg-surface p-4">
        <div className="flex flex-wrap items-center gap-3">
          <PositionSelector value={position} onChange={choosePosition} />
          <ModeSelector value={mode} onChange={setMode} />
          {inTeamMode ? (
            <>
              <TeamSelector value={team} disabled={!position} onChange={chooseTeam} />
              {teamPlayers && teamPlayers.length > contributors.length && contributors.length > 0 && (
                <label className="flex cursor-pointer select-none items-center gap-2 text-sm text-ink-2">
                  <input
                    type="checkbox"
                    checked={showAllTeam}
                    onChange={(e) => setShowAllTeam(e.target.checked)}
                    className="size-3.5 accent-[var(--accent)]"
                  />
                  Show everyone ({teamPlayers.length})
                </label>
              )}
            </>
          ) : (
            <>
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
                onClick={toggleField}
                disabled={!position}
                aria-pressed={showField}
                className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm transition-colors disabled:pointer-events-none disabled:opacity-40 ${
                  showField
                    ? "border-ink-2/60 bg-surface-2 text-ink"
                    : "border-line text-ink-2 hover:bg-surface-2 hover:text-ink"
                }`}
              >
                <Users className="size-4" aria-hidden />
                All Players
              </button>
            </>
          )}
          <button
            type="button"
            onClick={clearAll}
            disabled={inTeamMode ? !team : selected.length === 0 && !showField}
            className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-2 text-sm text-ink-2 hover:bg-surface-2 hover:text-ink disabled:pointer-events-none disabled:opacity-40"
          >
            <RotateCcw className="size-4" aria-hidden />
            Clear
          </button>
        </div>

        {!inTeamMode && selected.length > 0 && (
          <ul className="flex flex-wrap gap-2" aria-label="Selected players">
            {selected.map((p) => (
              <li
                key={p.id}
                className="flex items-center gap-2 rounded-full border border-line bg-surface-2 py-1 pl-3 pr-1 text-sm"
              >
                <span className="h-0.5 w-4 rounded" style={{ background: p.color }} aria-hidden />
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

      {inTeamMode ? (
        !position ? (
          <EmptyState message="Pick a position, then a team to compare its players." />
        ) : !team ? (
          <EmptyState message={`Choose a team to compare its ${position}s.`} />
        ) : checkedMetrics.length === 0 ? (
          <EmptyState message="Check at least one stat to chart." />
        ) : !teamPlayers ? (
          <EmptyState message={`Loading ${TEAMS[team]?.name ?? team} ${position}s…`} />
        ) : teamShown.length === 0 ? (
          <EmptyState message={`No ${position}s with stats for ${TEAMS[team]?.name ?? team} yet.`} />
        ) : (
          <>
            <p className="-mb-2 text-xs text-muted">
              {TEAMS[team]?.name} · {teamShown.length} {position}s
              {hiddenCount > 0 &&
                ` (hiding ${hiddenCount} with fewer than ${CONTRIBUTOR_MIN_TOUCHES} ${position === "K" ? "kicks" : "touches"})`} · busiest
              first · hover a name or line to focus
            </p>
            <TrendCharts
              metrics={checkedMetrics}
              players={shown}
              field={null}
              fieldLabel=""
              latestWeek={latestWeek}
              canAdd={false}
              onAddPlayer={addPlayerById}
              sortTooltip
            />
            <ComparisonTable metrics={checkedMetrics} players={shown} latestWeek={latestWeek} />
          </>
        )
      ) : selected.length === 0 && !showField ? (
        <EmptyState hasPosition={!!position} />
      ) : checkedMetrics.length === 0 ? (
        <EmptyState message="Check at least one stat to chart." />
      ) : selected.length === 0 && !field ? (
        <EmptyState message={`Loading all ${position}s…`} />
      ) : (
        <>
          <TrendCharts
            metrics={checkedMetrics}
            players={selected}
            field={showField ? field : null}
            fieldLabel={`All ${position}s (${field?.length ?? "…"})`}
            latestWeek={latestWeek}
            canAdd={selected.length + pending < MAX_PLAYERS}
            onAddPlayer={addPlayerById}
          />
          {selected.length > 0 ? (
            <ComparisonTable metrics={checkedMetrics} players={selected} latestWeek={latestWeek} />
          ) : (
            <EmptyState message="Add players to highlight them on the charts and compare them week by week." />
          )}
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
          ? `Search or browse the list to add up to ${MAX_PLAYERS} players.`
          : `Pick a position, then add up to ${MAX_PLAYERS} players to compare.`)}
    </div>
  );
}

function ModeSelector({ value, onChange }: { value: Mode; onChange: (mode: Mode) => void }) {
  const options: { mode: Mode; label: string; Icon: typeof User }[] = [
    { mode: "players", label: "Players", Icon: User },
    { mode: "team", label: "Team", Icon: Shield },
  ];
  return (
    <div role="radiogroup" aria-label="Compare" className="inline-flex rounded-lg border border-line bg-surface p-1">
      {options.map(({ mode, label, Icon }) => {
        const active = mode === value;
        return (
          <button
            key={mode}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(mode)}
            className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-semibold transition-colors ${
              active ? "bg-ink text-page" : "text-ink-2 hover:bg-surface-2 hover:text-ink"
            }`}
          >
            <Icon className="size-4" aria-hidden />
            {label}
          </button>
        );
      })}
    </div>
  );
}
