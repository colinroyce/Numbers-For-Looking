# Numbers For Looking

**See the trends. Compare the stats. Trust your eyes.**

Numbers For Looking (NFL) is a simple, visual-first tool for comparing 2026 NFL player stats week over week. No AI, no projections, no fantasy points, just real game stats and clean charts.

- Pick a position (QB, RB, WR, TE)
- Add up to 3 players
- Check the stats you care about
- Read the week-by-week trend charts and the comparison table

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
- The server downloads the file at most once every 6 hours, keeps only regular-season QB/RB/WR/TE rows, and caches the parsed result in memory. API responses also send CDN cache headers.
- If a refresh fails, the app keeps serving the last good copy and says so in the footer. It never falls back to made-up data.

### Reading the charts

- One chart per stat, each with its own scale. Each player keeps the same color everywhere.
- A **gap** in a line means the player had no stats that week. The table labels it **BYE** (the team didn't play) or **did not play** (the team played, but the player has no stat line, e.g. injured or inactive).

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
    api/stats/route.ts    # weekly stats for up to 3 players
  lib/
    nflverse.ts           # fetch, parse, and cache the nflverse CSV
    metrics.ts            # which stats each position shows, and how they're formatted
    colors.ts             # the 3 player colors
    weeks.ts              # game / bye / did-not-play logic per week
  components/             # Dashboard, PositionSelector, PlayerSearch, MetricSelector, TrendCharts, ComparisonTable
```

Built with Next.js, TypeScript, Tailwind CSS, Recharts, and Lucide icons.
