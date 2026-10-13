import { Fragment } from "react";
import { PLAYER_COLORS } from "@/lib/colors";
import type { Metric } from "@/lib/metrics";
import { weekCell, weekRange, type ComparedPlayer } from "@/lib/weeks";

type Props = {
  metrics: Metric[];
  players: ComparedPlayer[];
  latestWeek: number;
};

export default function ComparisonTable({ metrics, players, latestWeek }: Props) {
  const weeks = weekRange(latestWeek);

  return (
    <section aria-label="Weekly stats table" className="rounded-xl border border-line bg-surface">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm tabular-nums">
          <thead>
            <tr className="border-b border-line">
              <th rowSpan={2} scope="col" className="sticky left-0 bg-surface px-3 py-2 text-left font-medium text-muted">
                Week
              </th>
              {players.map((p) => (
                <th
                  key={p.id}
                  colSpan={metrics.length + 1}
                  scope="colgroup"
                  className="border-l border-line px-3 pt-2 text-left font-semibold text-ink"
                >
                  <span className="flex items-center gap-2 whitespace-nowrap">
                    <span className="inline-block h-0.5 w-4 rounded" style={{ background: PLAYER_COLORS[p.slot] }} />
                    {p.name}
                    <span className="font-normal text-muted">{p.team}</span>
                  </span>
                </th>
              ))}
            </tr>
            <tr className="border-b border-line text-xs text-muted">
              {players.map((p) => (
                <Fragment key={p.id}>
                  <th scope="col" className="border-l border-line px-3 py-1.5 text-left font-normal">
                    Opp
                  </th>
                  {metrics.map((m) => (
                    <th key={m.key} scope="col" title={m.label} className="whitespace-nowrap px-3 py-1.5 text-right font-normal">
                      {m.short}
                    </th>
                  ))}
                </Fragment>
              ))}
            </tr>
          </thead>
          <tbody>
            {weeks.map((week) => (
              <tr key={week} className="border-b border-line/60 last:border-0 hover:bg-white/[0.03]">
                <th scope="row" className="sticky left-0 bg-surface px-3 py-2 text-left font-medium text-ink-2">
                  {week}
                </th>
                {players.map((p) => {
                  const cell = weekCell(p, week);
                  if (cell.kind !== "game") {
                    return (
                      <td key={p.id} colSpan={metrics.length + 1} className="border-l border-line px-3 py-2 text-muted">
                        {cell.kind === "bye" ? "BYE" : "—  did not play"}
                      </td>
                    );
                  }
                  return (
                    <Fragment key={p.id}>
                      <td className="border-l border-line px-3 py-2 text-muted">{cell.stat.opponent}</td>
                      {metrics.map((m) => {
                        const v = m.value(cell.stat);
                        return (
                          <td key={m.key} className="px-3 py-2 text-right text-ink">
                            {v === null ? "—" : m.format(v)}
                          </td>
                        );
                      })}
                    </Fragment>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
