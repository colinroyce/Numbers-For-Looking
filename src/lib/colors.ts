/**
 * Player line colors, in fixed slot order: blue, orange, green, yellow. A player keeps
 * their slot while selected; colours are never re-assigned by rank.
 *
 * Validated on the chart surface (#1a1a19) across all pairs (lines cross, so every pair
 * must be distinguishable) for normal vision and colour-vision deficiency. Yellow is a
 * bright, true yellow on purpose: a darker amber was too close to the orange. It reads
 * slightly brighter than the other three, which is the accepted trade-off.
 */
export const PLAYER_COLORS = ["#3987e5", "#d95926", "#199e70", "#e0b400"] as const;

/** One color per pick, so the pick limit follows the palette. */
export const MAX_PLAYERS = PLAYER_COLORS.length;

/**
 * Team view can show 5–9 players at once. Eight distinct hues, in an order validated so
 * neighbouring colours stay apart (normal vision and colour-vision deficiency); beyond
 * that no ninth hue is invented, extra players fall back to a neutral gray. With this many
 * lines colour alone isn't enough, so team view adds hover-to-focus, legend labels and the
 * table.
 */
export const TEAM_COLORS = [
  ...PLAYER_COLORS,
  "#9085e9", // violet
  "#d55181", // magenta
  "#008300", // green
  "#e66767", // red
] as const;
export const OVERFLOW_COLOR = "#c3c2b7";

export function teamColor(index: number): string {
  return TEAM_COLORS[index] ?? OVERFLOW_COLOR;
}
