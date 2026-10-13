"use client";

import { useState } from "react";
import Image from "next/image";
import { headshotThumbUrl, teamLogoUrl, TEAMS } from "@/lib/teams";

/** Circular headshot with an initials fallback when the image is missing or fails. */
export function Headshot({ name, url, size = 24 }: { name: string; url: string | null; size?: number }) {
  const [failed, setFailed] = useState(false);
  const src = headshotThumbUrl(url);
  const style = { width: size, height: size };

  if (!src || failed) {
    const initials = name
      .split(" ")
      .map((part) => part[0])
      .slice(0, 2)
      .join("");
    return (
      <span
        style={{ ...style, fontSize: size * 0.4 }}
        className="inline-flex shrink-0 items-center justify-center rounded-full bg-white/10 font-semibold text-ink-2"
        aria-hidden
      >
        {initials}
      </span>
    );
  }
  return (
    <Image
      src={src}
      alt=""
      width={size}
      height={size}
      unoptimized
      onError={() => setFailed(true)}
      style={style}
      className="shrink-0 rounded-full bg-white/10 object-cover"
    />
  );
}

export function TeamLogo({ team, size = 18 }: { team: string; size?: number }) {
  const src = teamLogoUrl(team);
  if (!src) return null;
  return (
    <Image
      src={src}
      alt={TEAMS[team]?.name ?? team}
      title={TEAMS[team]?.name ?? team}
      width={size}
      height={size}
      unoptimized
      style={{ width: size, height: size }}
      className="shrink-0 object-contain"
    />
  );
}
