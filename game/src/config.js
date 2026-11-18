// Starward tuning constants. The arena is a fixed logical field; the canvas
// scales it to the window, so gameplay numbers never depend on screen size.
export const VIEW_W = 1280;
export const VIEW_H = 720;

export const PLAYER_R = 14;
export const PLAYER_SPEED = 335;
export const START_LIVES = 3;
export const INVULN_TIME = 1.2;

export const FIRE_INTERVAL = 0.3;
export const BOLT_SPEED = 660;
export const BOLT_R = 4;
export const BOLT_LIFE = 1.1;

export const SHARD_R = 13;
export const BIG_SHARD_R = 25;
export const CORE_R = 6;
export const MAGNET_R = 125;
export const COLLECT_R = 26;
export const CORE_DROP_CHANCE = 0.7;
export const CORES_PER_POWER = 8;
export const MAX_POWER = 5;

export const LEVEL_EVERY = 14; // seconds per level
export const MAX_LEVEL = 12;

// Event bits returned by stepWorld and consumed by sound and announcements.
export const EV = {
  FIRE: 1,
  KILL: 2,
  CORE: 4,
  HIT: 8,
  POWER: 16,
  LEVEL: 32,
  OVER: 64,
};
