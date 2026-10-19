# Numbers For Looking

**See the trends. Compare the stats. Trust your eyes.**

A week-by-week comparison tool for 2026 NFL player stats. No projections, no fantasy scoring: real game stats from [nflverse](https://github.com/nflverse/nflverse-data), drawn as clean trend lines.

## Features

- **Positions:** QB, RB, WR, TE and K, each with its own set of stats (passing, rushing, receiving, yards after catch, target share, field goals, and more).
- **Player comparison:** pick up to 4 players and see one trend chart per stat, plus a week-by-week table with opponents.
- **All Players:** draws every player at the position as faint gray lines behind your picks. Hover a line to see who it is, click it to add them.
- **Team view:** compare every player at a position on one team, busiest first. Hover a name or line to focus on one player.
- **Byes and missed games** show as gaps, never as zeros. The table labels each one: bye, not played yet, or did not play.
- **Check for new stats** pulls the latest numbers on demand and says when the next week kicks off.

## Data

Stats come from nflverse's public [weekly player stats](https://github.com/nflverse/nflverse-data/releases/tag/stats_player) for the 2026 regular season. nflverse usually posts a game's stats within a day of it being played. The schedule (for bye weeks and kickoff dates) comes from [nflverse/nfldata](https://github.com/nflverse/nfldata).

The server caches the parsed data for 6 hours. If nflverse can't be reached, the app keeps serving the last good copy and says so; it never falls back to placeholder data.

## Development

Requires Node.js 20+. No API keys or environment variables.

```bash
npm install
npm run dev
```

Built with Next.js (App Router), TypeScript, Tailwind CSS, Recharts and Lucide.

```
src/
  app/api/      meta, players, stats, field, team, refresh
  lib/          nflverse fetch + cache, schedule, metrics, colors, teams
  components/   Dashboard, TrendCharts, ComparisonTable, PlayerSearch, TeamSelector, ...
```
