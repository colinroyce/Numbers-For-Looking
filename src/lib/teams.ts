import type { PlayerSummary } from "./types";

/** "Never Eat Soggy Waffles": AFC North → East → South → West, then the NFC in the same order. */
export const DIVISIONS = [
  "AFC North",
  "AFC East",
  "AFC South",
  "AFC West",
  "NFC North",
  "NFC East",
  "NFC South",
  "NFC West",
] as const;
export type Division = (typeof DIVISIONS)[number];

type Team = { name: string; division: Division; espn: string };

/** Keyed by the nflverse team abbreviation. Source: nflverse teams_colors_logos. */
export const TEAMS: Record<string, Team> = {
  BAL: { name: "Baltimore Ravens", division: "AFC North", espn: "bal" },
  CIN: { name: "Cincinnati Bengals", division: "AFC North", espn: "cin" },
  CLE: { name: "Cleveland Browns", division: "AFC North", espn: "cle" },
  PIT: { name: "Pittsburgh Steelers", division: "AFC North", espn: "pit" },
  BUF: { name: "Buffalo Bills", division: "AFC East", espn: "buf" },
  MIA: { name: "Miami Dolphins", division: "AFC East", espn: "mia" },
  NE: { name: "New England Patriots", division: "AFC East", espn: "ne" },
  NYJ: { name: "New York Jets", division: "AFC East", espn: "nyj" },
  HOU: { name: "Houston Texans", division: "AFC South", espn: "hou" },
  IND: { name: "Indianapolis Colts", division: "AFC South", espn: "ind" },
  JAX: { name: "Jacksonville Jaguars", division: "AFC South", espn: "jax" },
  TEN: { name: "Tennessee Titans", division: "AFC South", espn: "ten" },
  DEN: { name: "Denver Broncos", division: "AFC West", espn: "den" },
  KC: { name: "Kansas City Chiefs", division: "AFC West", espn: "kc" },
  LAC: { name: "Los Angeles Chargers", division: "AFC West", espn: "lac" },
  LV: { name: "Las Vegas Raiders", division: "AFC West", espn: "lv" },
  CHI: { name: "Chicago Bears", division: "NFC North", espn: "chi" },
  DET: { name: "Detroit Lions", division: "NFC North", espn: "det" },
  GB: { name: "Green Bay Packers", division: "NFC North", espn: "gb" },
  MIN: { name: "Minnesota Vikings", division: "NFC North", espn: "min" },
  DAL: { name: "Dallas Cowboys", division: "NFC East", espn: "dal" },
  NYG: { name: "New York Giants", division: "NFC East", espn: "nyg" },
  PHI: { name: "Philadelphia Eagles", division: "NFC East", espn: "phi" },
  WAS: { name: "Washington Commanders", division: "NFC East", espn: "wsh" },
  ATL: { name: "Atlanta Falcons", division: "NFC South", espn: "atl" },
  CAR: { name: "Carolina Panthers", division: "NFC South", espn: "car" },
  NO: { name: "New Orleans Saints", division: "NFC South", espn: "no" },
  TB: { name: "Tampa Bay Buccaneers", division: "NFC South", espn: "tb" },
  ARI: { name: "Arizona Cardinals", division: "NFC West", espn: "ari" },
  LA: { name: "Los Angeles Rams", division: "NFC West", espn: "lar" },
  SF: { name: "San Francisco 49ers", division: "NFC West", espn: "sf" },
  SEA: { name: "Seattle Seahawks", division: "NFC West", espn: "sea" },
};

/** ESPN's dark-background logo, resized server-side to a small thumbnail. */
export function teamLogoUrl(team: string): string | null {
  const espn = TEAMS[team]?.espn;
  return espn ? `https://a.espncdn.com/combiner/i?img=/i/teamlogos/nfl/500-dark/${espn}.png&w=48&h=48` : null;
}

/** nflverse headshots are full-size (up to ~4 MB); ask NFL's image CDN for a 64px face crop. */
export function headshotThumbUrl(url: string | null): string | null {
  if (!url) return null;
  return url.replace(/\/image\/(upload|private)\//, "/image/$1/w_64,h_64,c_thumb,g_face/");
}

export type DivisionGroup = { division: string; players: PlayerSummary[] };

/** Groups players by division in NESW order; within a division by team name, then player name. */
export function groupByDivision(players: PlayerSummary[]): DivisionGroup[] {
  const rank = (p: PlayerSummary) => {
    const d = TEAMS[p.team]?.division;
    return d ? DIVISIONS.indexOf(d) : DIVISIONS.length;
  };
  const sorted = [...players].sort(
    (a, b) =>
      rank(a) - rank(b) ||
      (TEAMS[a.team]?.name ?? a.team).localeCompare(TEAMS[b.team]?.name ?? b.team) ||
      a.name.localeCompare(b.name),
  );
  const groups: DivisionGroup[] = [];
  for (const p of sorted) {
    const division = TEAMS[p.team]?.division ?? "Other";
    const last = groups.at(-1);
    if (last?.division === division) last.players.push(p);
    else groups.push({ division, players: [p] });
  }
  return groups;
}
