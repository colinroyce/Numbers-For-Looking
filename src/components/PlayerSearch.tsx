"use client";

import { useId, useMemo, useRef, useState } from "react";
import { Search } from "lucide-react";
import type { PlayerSummary } from "@/lib/types";

type Props = {
  players: PlayerSummary[];
  selectedIds: string[];
  maxReached: boolean;
  loading: boolean;
  disabled: boolean;
  onAdd: (player: PlayerSummary) => void;
};

export default function PlayerSearch({ players, selectedIds, maxReached, loading, disabled, onAdd }: Props) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const listId = useId();
  const listRef = useRef<HTMLUListElement>(null);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    return players.filter(
      (p) =>
        !selectedIds.includes(p.id) &&
        (!q || p.name.toLowerCase().includes(q) || p.team.toLowerCase() === q),
    );
  }, [players, selectedIds, query]);

  const inactive = disabled || maxReached || loading;
  const placeholder = disabled
    ? "Pick a position first"
    : loading
      ? "Loading players…"
      : maxReached
        ? "3 players selected — remove one to swap"
        : `Search or browse ${players.length} players`;

  function choose(player: PlayerSummary) {
    onAdd(player);
    setQuery("");
    setActive(0);
    setOpen(false);
  }

  function move(delta: number) {
    if (!matches.length) return;
    const next = (active + delta + matches.length) % matches.length;
    setActive(next);
    listRef.current?.children[next]?.scrollIntoView({ block: "nearest" });
  }

  return (
    <div className="relative w-full max-w-md">
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
      <input
        type="text"
        role="combobox"
        aria-expanded={open && !inactive}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={open && matches[active] ? `${listId}-${matches[active].id}` : undefined}
        aria-label="Search players"
        disabled={inactive}
        value={query}
        placeholder={placeholder}
        onChange={(e) => {
          setQuery(e.target.value);
          setActive(0);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onClick={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            if (!open) setOpen(true);
            else move(1);
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            move(-1);
          } else if (e.key === "Enter" && open && matches[active]) {
            e.preventDefault();
            choose(matches[active]);
          } else if (e.key === "Escape") {
            setOpen(false);
          }
        }}
        className="w-full rounded-lg border border-line bg-surface py-2 pl-9 pr-3 text-sm text-ink placeholder:text-muted focus:border-accent focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
      />
      {open && !inactive && (
        <ul
          id={listId}
          ref={listRef}
          role="listbox"
          className="absolute z-20 mt-1 max-h-72 w-full overflow-y-auto rounded-lg border border-line bg-surface-2 py-1 shadow-xl shadow-black/40"
        >
          {matches.length === 0 && <li className="px-3 py-2 text-sm text-muted">No players match “{query}”</li>}
          {matches.map((p, i) => (
            <li
              key={p.id}
              id={`${listId}-${p.id}`}
              role="option"
              aria-selected={i === active}
              // mousedown (not click) so the input's blur doesn't close the list first
              onMouseDown={(e) => {
                e.preventDefault();
                choose(p);
              }}
              onMouseEnter={() => setActive(i)}
              className={`flex cursor-pointer items-center justify-between px-3 py-1.5 text-sm ${
                i === active ? "bg-white/10 text-ink" : "text-ink-2"
              }`}
            >
              <span>{p.name}</span>
              <span className="tabular-nums text-xs text-muted">
                {p.team} · {p.games} {p.games === 1 ? "game" : "games"}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
