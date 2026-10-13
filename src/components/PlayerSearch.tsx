"use client";

import { useId, useMemo, useRef, useState } from "react";
import { Search } from "lucide-react";
import { groupByDivision } from "@/lib/teams";
import type { PlayerSummary } from "@/lib/types";
import { Headshot, TeamLogo } from "./PlayerBadge";

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

  // Grouped by division (NESW order); `matches` is the same order flattened, for keyboard nav.
  const { groups, matches } = useMemo(() => {
    const q = query.trim().toLowerCase();
    const groups = groupByDivision(
      players.filter(
        (p) =>
          !selectedIds.includes(p.id) &&
          (!q || p.name.toLowerCase().includes(q) || p.team.toLowerCase() === q),
      ),
    );
    return { groups, matches: groups.flatMap((g) => g.players) };
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
    document.getElementById(`${listId}-${matches[next].id}`)?.scrollIntoView({ block: "nearest" });
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
          aria-label="Players"
          className="absolute z-20 mt-1 max-h-80 w-full overflow-y-auto rounded-lg border border-line bg-surface-2 pb-1 shadow-xl shadow-black/40"
        >
          {matches.length === 0 && <li className="px-3 py-2 text-sm text-muted">No players match “{query}”</li>}
          {groups.map((group) => {
            const headerId = `${listId}-${group.division.replace(/\s+/g, "-")}`;
            return (
              <li key={group.division} role="group" aria-labelledby={headerId}>
                {/* Sticky within its own group, so the next division's header pushes it out. */}
                <div
                  id={headerId}
                  role="presentation"
                  className="sticky top-0 z-10 border-b border-line bg-surface-2/95 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted backdrop-blur"
                >
                  {group.division}
                </div>
                <ul role="presentation">
                  {group.players.map((p) => {
                    const i = matches.indexOf(p);
                    return (
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
                        className={`flex scroll-mt-8 cursor-pointer items-center gap-2.5 px-3 py-1.5 text-sm ${
                          i === active ? "bg-white/10 text-ink" : "text-ink-2"
                        }`}
                      >
                        <TeamLogo team={p.team} size={18} />
                        <Headshot name={p.name} url={p.headshot} size={26} />
                        <span className="flex-1 truncate">{p.name}</span>
                        <span className="shrink-0 tabular-nums text-xs text-muted">
                          {p.team} · {p.games} {p.games === 1 ? "game" : "games"}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
