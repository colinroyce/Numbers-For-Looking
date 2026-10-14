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
