import { POSITIONS, type Position } from "@/lib/types";

type Props = {
  value: Position | null;
  onChange: (position: Position) => void;
};

export default function PositionSelector({ value, onChange }: Props) {
  return (
    <div role="radiogroup" aria-label="Position" className="inline-flex rounded-lg border border-line bg-surface p-1">
      {POSITIONS.map((pos) => {
        const active = pos === value;
        return (
          <button
            key={pos}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(pos)}
            className={`min-w-14 rounded-md px-3 py-1.5 text-sm font-semibold transition-colors ${
              active ? "bg-ink text-page" : "text-ink-2 hover:bg-surface-2 hover:text-ink"
            }`}
          >
            {pos}
          </button>
        );
      })}
    </div>
  );
}
