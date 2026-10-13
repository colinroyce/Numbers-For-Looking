import "server-only";
import type { NextRequest } from "next/server";
import { createHash } from "node:crypto";
import Papa from "papaparse";
import {
  STAT_FIELDS,
  isPosition,
  type Dataset,
  type PlayerSummary,
  type WeeklyStat,
} from "./types";

export const SEASON = 2026;
export const SOURCE_URL = `https://github.com/nflverse/nflverse-data/releases/download/stats_player/stats_player_week_${SEASON}.csv`;

/** nflverse refreshes this file a few times a day during the season. */
const TTL_MS = 6 * 60 * 60 * 1000;
/** Manual refreshes re-download at most this often, however many people click. */
const REFRESH_COOLDOWN_MS = 3 * 60 * 1000;

type CsvRow = Record<string, string | undefined>;

let cached: { data: Dataset; expiresAt: number } | null = null;
let inFlight: Promise<Dataset> | null = null;
let lastFetchStartedAt = 0;

function num(value: string | undefined): number | null {
  if (value === undefined || value === "" || value === "NA") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

async function fetchDataset(): Promise<Dataset> {
  const res = await fetch(SOURCE_URL, { cache: "no-store" });
  if (!res.ok) throw new Error(`nflverse responded ${res.status} for ${SOURCE_URL}`);
  const text = await res.text();

  const { data: rows } = Papa.parse<CsvRow>(text, { header: true, skipEmptyLines: true });

  const stats: Record<string, WeeklyStat[]> = {};
  const latest: Record<string, PlayerSummary & { lastWeek: number }> = {};
  const teamWeeks: Record<string, Set<number>> = {};
  let latestWeek = 0;

  for (const row of rows) {
    if (row.season_type !== "REG") continue;
    const week = num(row.week);
    const team = row.team;
    if (week === null || !team) continue;

    // Every position counts toward "the team played this week" (bye detection).
    (teamWeeks[team] ??= new Set()).add(week);
    latestWeek = Math.max(latestWeek, week);

    const position = row.position;
    const id = row.player_id;
    if (!isPosition(position) || !id) continue;

    const line = { week, team, opponent: row.opponent_team ?? "" } as WeeklyStat;
    for (const field of STAT_FIELDS) line[field] = num(row[field]);
    (stats[id] ??= []).push(line);

    const prev = latest[id];
    if (!prev || week >= prev.lastWeek) {
      latest[id] = {
        id,
        name: row.player_display_name || row.player_name || id,
        position,
        team,
        headshot: row.headshot_url || null,
        games: 0,
        lastWeek: week,
      };
    }
  }

  const players = Object.values(latest)
    .map((p): PlayerSummary => ({
      id: p.id,
      name: p.name,
      position: p.position,
      team: p.team,
      headshot: p.headshot,
      games: stats[p.id].length,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
  for (const lines of Object.values(stats)) lines.sort((a, b) => a.week - b.week);

  return {
    season: SEASON,
    latestWeek,
    fetchedAt: new Date().toISOString(),
    version: createHash("sha1").update(text).digest("hex").slice(0, 12),
    players,
    stats,
    teamWeeks: Object.fromEntries(
      Object.entries(teamWeeks).map(([t, weeks]) => [t, [...weeks].sort((a, b) => a - b)]),
    ),
  };
}

async function load(): Promise<Dataset> {
  if (!inFlight) {
    lastFetchStartedAt = Date.now();
    inFlight = fetchDataset().finally(() => {
      inFlight = null;
    });
  }
  const data = await inFlight;
  cached = { data, expiresAt: Date.now() + TTL_MS };
  return data;
}

/**
 * Returns the parsed 2026 dataset, fetched from nflverse at most once per TTL per
 * server instance. If a refresh fails, the last good copy is served (`stale: true`);
 * with no copy at all the error propagates — we never substitute made-up data.
 */
export async function getDataset(): Promise<{ data: Dataset; stale: boolean }> {
  if (cached && Date.now() < cached.expiresAt) return { data: cached.data, stale: false };
  try {
    return { data: await load(), stale: false };
  } catch (err) {
    if (cached) {
      // Back off for a few minutes rather than retrying on every request.
      cached.expiresAt = Date.now() + 5 * 60 * 1000;
      console.error("nflverse refresh failed, serving cached data:", err);
      return { data: cached.data, stale: true };
    }
    throw err;
  }
}

/**
 * Re-downloads now, ignoring the TTL (but not the cooldown).
 *
 * Note: each API route (and, on Vercel, each serverless instance) can hold its own copy
 * of this module's cache, so callers compare against the version the *client* has,
 * never against another route's cache.
 */
export async function refreshDataset(): Promise<Dataset> {
  if (cached && Date.now() - lastFetchStartedAt < REFRESH_COOLDOWN_MS) return cached.data;
  return load();
}

/**
 * For data routes. The client sends the version it expects (`?v=`); if this server
 * instance holds a different copy, it refreshes once. Responses only get CDN caching
 * when the data matches the requested version, so a CDN can never file old numbers
 * under a new version's URL.
 */
export async function getDatasetFor(request: NextRequest) {
  const wanted = request.nextUrl.searchParams.get("v");
  let result = await getDataset();
  if (wanted && wanted !== result.data.version) {
    await refreshDataset().catch((err) => console.error("nflverse refresh failed:", err));
    result = await getDataset();
  }
  const headers = !wanted || wanted === result.data.version ? CACHE_HEADERS : NO_STORE_HEADERS;
  return { ...result, headers };
}

/** Cache-Control for API responses: lets a CDN (e.g. Vercel) share results between instances. */
export const CACHE_HEADERS = {
  "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=21600",
};

export const NO_STORE_HEADERS = { "Cache-Control": "no-store" };

/** /api/meta tells clients the current version, so it must not be cached for long. */
export const META_CACHE_HEADERS = {
  "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
};
