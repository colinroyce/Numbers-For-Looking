# Numbers For Looking

**See the trends. Compare the stats. Trust your eyes.**

Numbers For Looking (NFL) is a simple, visual-first tool for comparing 2026 NFL player stats week over week. No AI, no projections, no fantasy points, just real game stats and clean charts.

- Pick a position (QB, RB, WR, TE, K)
- Add up to 4 players
- Check the stats you care about
- Read the week-by-week trend charts and the comparison table
- Turn on **All Players** to see every player at the position as faint gray lines behind your picks (hover one to see who it is)
- Switch to **Team** to compare every player at a position on one team (busiest players first; hover a name or line to focus on one player)

## Run it locally

You need **Node.js 20 or newer** ([download](https://nodejs.org)). There are no API keys or accounts to set up.

```bash
git clone https://github.com/colinroyce/Numbers-For-Looking.git
cd Numbers-For-Looking
npm install
npm run dev
```

Then open http://localhost:3000.

## Where the data comes from

All stats are real, from [nflverse](https://github.com/nflverse/nflverse-data). The app reads their public 2026 weekly player stats file:

```
https://github.com/nflverse/nflverse-data/releases/download/stats_player/stats_player_week_2026.csv
```

- nflverse updates the file during the season, usually within a day of games finishing. The footer shows which week the data runs through.
- The server downloads the file at most once every 6 hours, keeps only regular-season QB/RB/WR/TE/K rows, and caches the parsed result in memory. API responses also send CDN cache headers.
- If a refresh fails, the app keeps serving the last good copy and says so in the footer. It never falls back to made-up data.
- **Check for new stats** (top right) re-downloads right away instead of waiting for the 6-hour refresh. It reports whether a new week arrived, numbers were updated, or nothing changed. It also uses the nflverse schedule to say when the next week kicks off, or that games have been played and stats are pending. Repeat clicks within 3 minutes reuse the last download.

### Reading the charts

- One chart per stat, each with its own scale. Each player keeps the same color everywhere.
- A **gap** in a line means the player had no stats that week. The table labels it **BYE** (the team had no game), **not played yet** (the team's game that week hasn't happened or been posted), or **did not play** (the team played, but the player has no stat line, e.g. injured or inactive).

## Deploy to Vercel (shareable link)

1. Push this repo to GitHub.
2. Go to [vercel.com/new](https://vercel.com/new), sign in with GitHub, and import the repo.
3. Keep the defaults (Vercel detects Next.js) and click **Deploy**.

You get a public URL to share, and every push to `main` redeploys automatically. No environment variables are needed.

## Project layout

```
src/
  app/
    page.tsx              # the dashboard page
    api/meta/route.ts     # season + latest week
    api/players/route.ts  # player list for a position
    api/stats/route.ts    # weekly stats for up to 4 players
    api/field/route.ts    # weekly stats for every player at a position (All Players)
    api/team/route.ts     # every player at a position on one team (Team view)
    api/refresh/route.ts  # re-check nflverse now (Check for new stats)
  lib/
    nflverse.ts           # fetch, parse, and cache the nflverse CSV
    metrics.ts            # which stats each position shows, and how they're formatted
    colors.ts             # the 4 player colors (also sets the pick limit)
    weeks.ts              # game / bye / did-not-play logic per week
    schedule.ts           # nflverse schedule, for the refresh message
  components/             # Dashboard, PositionSelector, PlayerSearch, MetricSelector, TrendCharts, ComparisonTable
```

Built with Next.js, TypeScript, Tailwind CSS, Recharts, and Lucide icons.
