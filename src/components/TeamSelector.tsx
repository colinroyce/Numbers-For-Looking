"use client";

import { useId, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { DIVISIONS, TEAMS } from "@/lib/teams";
import { TeamLogo } from "./PlayerBadge";

type Props = {
  value: string | null;
  disabled: boolean;
  onChange: (team: string) => void;
};

/** Teams in "Never Eat Soggy Waffles" division order, alphabetical within a division. */
const GROUPS = DIVISIONS.map((division) => ({
  division,
  teams: Object.entries(TEAMS)
    .filter(([, t]) => t.division === division)
    .sort(([, a], [, b]) => a.name.localeCompare(b.name))
    .map(([abbr]) => abbr),
}));
const ORDER = GROUPS.flatMap((g) => g.teams);

export default function TeamSelector({ value, disabled, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);

  function openList() {
    setActive(Math.max(0, value ? ORDER.indexOf(value) : 0));
    setOpen(true);
  }

  function choose(team: string) {
    onChange(team);
    setOpen(false);
  }

  function move(delta: number) {
    const next = (active + delta + ORDER.length) % ORDER.length;
    setActive(next);
    document.getElementById(`${listId}-${ORDER[next]}`)?.scrollIntoView({ block: "nearest" });
  }

  return (
    <div
      ref={rootRef}
      className="relative w-full max-w-xs"
      onBlur={(e) => {
        if (!rootRef.current?.contains(e.relatedTarget as Node)) setOpen(false);
      }}
    >
      <button
        type="button"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-label="Team"
        aria-activedescendant={open ? `${listId}-${ORDER[active]}` : undefined}
        disabled={disabled}
        onClick={() => (open ? setOpen(false) : openList())}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" || e.key === "ArrowUp") {
            e.preventDefault();
            if (!open) openList();
            else move(e.key === "ArrowDown" ? 1 : -1);
          } else if ((e.key === "Enter" || e.key === " ") && open) {
            e.preventDefault();
            choose(ORDER[active]);
          } else if (e.key === "Escape") {
            setOpen(false);
          }
        }}
        className="flex w-full items-center gap-2 rounded-lg border border-line bg-surface py-2 pl-3 pr-2 text-left text-sm text-ink focus:border-accent focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
      >
        {value ? (
          <>
            <TeamLogo team={value} size={20} />
            <span className="flex-1 truncate">{TEAMS[value]?.name ?? value}</span>
          </>
        ) : (
          <span className="flex-1 text-muted">{disabled ? "Pick a position first" : "Choose a team"}</span>
        )}
        <ChevronDown className="size-4 text-muted" aria-hidden />
      </button>

      {open && (
        <ul
          id={listId}
          role="listbox"
          aria-label="Teams"
          className="absolute z-20 mt-1 max-h-80 w-full overflow-y-auto rounded-lg border border-line bg-surface-2 pb-1 shadow-xl shadow-black/40"
        >
          {GROUPS.map((group) => {
            const headerId = `${listId}-${group.division.replace(/\s+/g, "-")}`;
            return (
              <li key={group.division} role="group" aria-labelledby={headerId}>
                <div
                  id={headerId}
                  role="presentation"
                  className="sticky top-0 z-10 border-b border-line bg-surface-2/95 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted backdrop-blur"
                >
                  {group.division}
                </div>
                <ul role="presentation">
                  {group.teams.map((team) => {
                    const i = ORDER.indexOf(team);
                    return (
                      <li
                        key={team}
                        id={`${listId}-${team}`}
                        role="option"
                        aria-selected={team === value}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          choose(team);
                        }}
                        onMouseEnter={() => setActive(i)}
                        className={`flex scroll-mt-8 cursor-pointer items-center gap-2.5 px-3 py-1.5 text-sm ${
                          i === active ? "bg-white/10 text-ink" : "text-ink-2"
                        }`}
                      >
                        <TeamLogo team={team} size={18} />
                        <span className="flex-1 truncate">{TEAMS[team].name}</span>
                        <span className="text-xs text-muted">{team}</span>
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
