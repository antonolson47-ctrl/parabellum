// Shared mutable game state (avoids circular imports).
export const G = { mode: 'boot', paused: false, levelIdx: 0, time: 0, player: null, world: null, kennedy: null, level: null, run: null };
