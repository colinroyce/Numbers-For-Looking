import type { Metric } from "@/lib/metrics";

type Props = {
  metrics: Metric[];
  selected: string[];
  onToggle: (key: string) => void;
};

export default function MetricSelector({ metrics, selected, onToggle }: Props) {
  return (
    <fieldset className="flex flex-wrap gap-2">
      <legend className="sr-only">Stats to compare</legend>
      {metrics.map((m) => {
        const on = selected.includes(m.key);
        return (
          <label
            key={m.key}
            className={`flex cursor-pointer select-none items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-colors ${
              on ? "border-ink-2/60 bg-surface-2 text-ink" : "border-line text-muted hover:text-ink-2"
            }`}
          >
            <input
              type="checkbox"
              checked={on}
              onChange={() => onToggle(m.key)}
              className="size-3.5 accent-[var(--accent)]"
            />
            {m.label}
          </label>
        );
      })}
    </fieldset>
  );
}
