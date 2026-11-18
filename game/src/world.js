// Starward world: a lone ward-orb holds an arena against drifting shards.
// Move freely, fire is automatic at the nearest shard, and every shard you
// break can drop a core — gather cores to raise your power and fire rate.
// Three hits end the run. All randomness comes from the seeded RNG, so a
// run is fully reproducible from its seed and inputs.
import { createRng } from './random.js';
import {
  VIEW_W, VIEW_H, PLAYER_R, PLAYER_SPEED, START_LIVES, INVULN_TIME,
  FIRE_INTERVAL, BOLT_SPEED, BOLT_R, BOLT_LIFE, SHARD_R, BIG_SHARD_R,
  CORE_R, MAGNET_R, COLLECT_R, CORE_DROP_CHANCE, CORES_PER_POWER,
  MAX_POWER, LEVEL_EVERY, MAX_LEVEL, EV,
} from './config.js';

export function createWorld(seed) {
  return {
    rng: createRng(seed),
    time: 0,
    player: { x: VIEW_W / 2, y: VIEW_H / 2, vx: 0, vy: 0, face: -Math.PI / 2 },
    shards: [],
    bolts: [],
    cores: [],
    particles: [],
    score: 0,
    best: 0,
    combo: 0,
    comboTimer: 0,
    kills: 0,
    coresGot: 0,
    power: 1,
    lives: START_LIVES,
    level: 1,
    levelTimer: 0,
    spawnTimer: 0.6,
    fireTimer: 0.2,
    invuln: 0,
    shake: 0,
    over: false,
    started: false,
  };
}

export function startRun(w) {
  const keepBest = w.best;
  const seed = (w.rng() * 0xffffffff) >>> 0;
  Object.assign(w, createWorld(seed));
  w.best = Math.max(keepBest, w.score);
  w.started = true;
}

function spawnShard(w) {
  const edge = Math.floor(w.rng() * 4);
  const m = 30;
  let x, y;
  if (edge === 0) { x = m + w.rng() * (VIEW_W - 2 * m); y = m; }
  else if (edge === 1) { x = VIEW_W - m; y = m + w.rng() * (VIEW_H - 2 * m); }
  else if (edge === 2) { x = m + w.rng() * (VIEW_W - 2 * m); y = VIEW_H - m; }
  else { x = m; y = m + w.rng() * (VIEW_H - 2 * m); }
  const big = w.level >= 3 && w.rng() < 0.10 + 0.02 * w.level;
  const base = 62 + w.level * 9 + w.rng() * 30;
  w.shards.push({
    x, y,
    r: big ? BIG_SHARD_R : SHARD_R,
    hp: big ? 3 : 1,
    big,
    speed: big ? base * 0.55 : base,
    rot: w.rng() * Math.PI * 2,
    spin: (w.rng() - 0.5) * 2.4,
    phase: w.rng() * Math.PI * 2,
  });
}

function burst(w, x, y, color, n, speed) {
  for (let i = 0; i < n; i++) {
    const a = w.rng() * Math.PI * 2;
    const s = speed * (0.3 + w.rng() * 0.7);
    w.particles.push({
      x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s,
      life: 0.45 + w.rng() * 0.4, maxLife: 0.85, color, r: 2 + w.rng() * 2.5,
    });
  }
}

function nearestShard(w) {
  let bestS = null, bestD = Infinity;
  for (const s of w.shards) {
    const dx = s.x - w.player.x, dy = s.y - w.player.y;
    const d = dx * dx + dy * dy;
    if (d < bestD) { bestD = d; bestS = s; }
  }
  return bestS;
}

// input: { mx, my } desired movement direction, each in [-1, 1].
export function stepWorld(w, input, dt) {
  let ev = 0;
  if (w.over) { updateParticles(w, dt); return ev; }
  w.time += dt;
  const p = w.player;

  // Level ramp.
  w.levelTimer += dt;
  if (w.levelTimer >= LEVEL_EVERY && w.level < MAX_LEVEL) {
    w.levelTimer = 0;
    w.level += 1;
    ev |= EV.LEVEL;
  }

  // Spawning.
  w.spawnTimer -= dt;
  const spawnEvery = Math.max(0.34, 1.05 - 0.065 * (w.level - 1));
  if (w.spawnTimer <= 0) {
    w.spawnTimer = spawnEvery * (0.75 + w.rng() * 0.5);
    spawnShard(w);
  }

  // Player movement.
  let mx = input.mx || 0, my = input.my || 0;
  const len = Math.hypot(mx, my);
  if (len > 1) { mx /= len; my /= len; }
  p.vx = mx * PLAYER_SPEED;
  p.vy = my * PLAYER_SPEED;
  p.x = Math.min(VIEW_W - PLAYER_R, Math.max(PLAYER_R, p.x + p.vx * dt));
  p.y = Math.min(VIEW_H - PLAYER_R, Math.max(PLAYER_R, p.y + p.vy * dt));
  if (len > 0.05) p.face = Math.atan2(my, mx);

  // Automatic fire at the nearest shard.
  w.fireTimer -= dt;
  if (w.fireTimer <= 0) {
    const target = nearestShard(w);
    if (target) {
      const interval = FIRE_INTERVAL * (1 - 0.07 * (w.power - 1));
      w.fireTimer = interval;
      const base = Math.atan2(target.y - p.y, target.x - p.x);
      p.face = base;
      const n = 1 + (w.power >= 3 ? 1 : 0) + (w.power >= 5 ? 1 : 0);
      for (let i = 0; i < n; i++) {
        const off = n === 1 ? 0 : (i - (n - 1) / 2) * 0.11;
        const a = base + off;
        w.bolts.push({
          x: p.x + Math.cos(a) * (PLAYER_R + 4),
          y: p.y + Math.sin(a) * (PLAYER_R + 4),
          vx: Math.cos(a) * BOLT_SPEED, vy: Math.sin(a) * BOLT_SPEED,
          life: BOLT_LIFE,
        });
      }
      ev |= EV.FIRE;
    } else {
      w.fireTimer = 0.06;
    }
  }

  // Bolts.
  for (let i = w.bolts.length - 1; i >= 0; i--) {
    const b = w.bolts[i];
    b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
    if (b.life <= 0 || b.x < -20 || b.x > VIEW_W + 20 || b.y < -20 || b.y > VIEW_H + 20) {
      w.bolts.splice(i, 1);
    }
  }

  // Shards drift at the player, wobbling as they come.
  for (const s of w.shards) {
    const dx = p.x - s.x, dy = p.y - s.y;
    const d = Math.hypot(dx, dy) || 1;
    const wob = Math.sin(w.time * 3 + s.phase) * 26;
    const px = -dy / d, py = dx / d;
    s.x += (dx / d * s.speed + px * wob) * dt;
    s.y += (dy / d * s.speed + py * wob) * dt;
    s.rot += s.spin * dt;
  }

  // Bolt vs shard.
  for (let i = w.shards.length - 1; i >= 0; i--) {
    const s = w.shards[i];
    for (let j = w.bolts.length - 1; j >= 0; j--) {
      const b = w.bolts[j];
      const dx = b.x - s.x, dy = b.y - s.y;
      if (dx * dx + dy * dy <= (s.r + BOLT_R) * (s.r + BOLT_R)) {
        w.bolts.splice(j, 1);
        s.hp -= 1;
        if (s.hp <= 0) {
          w.shards.splice(i, 1);
          w.kills += 1;
          w.combo += 1;
          w.comboTimer = 2.5;
          w.score += 10 + Math.min(w.combo, 40);
          if (s.big) w.score += 25;
          burst(w, s.x, s.y, s.big ? '#ff9d5c' : '#ff5c7a', s.big ? 16 : 9, 190);
          if (w.rng() < CORE_DROP_CHANCE) {
            w.cores.push({ x: s.x, y: s.y, vx: 0, vy: 0, pulse: w.rng() * 6 });
          }
          ev |= EV.KILL;
        } else {
          burst(w, s.x, s.y, '#ffb3c0', 3, 120);
        }
        break;
      }
    }
  }

  // Shard vs player.
  if (w.invuln > 0) w.invuln -= dt;
  for (let i = w.shards.length - 1; i >= 0; i--) {
    const s = w.shards[i];
    const dx = s.x - p.x, dy = s.y - p.y;
    if (dx * dx + dy * dy <= (s.r + PLAYER_R - 3) * (s.r + PLAYER_R - 3)) {
      w.shards.splice(i, 1);
      burst(w, s.x, s.y, '#ff5c7a', 12, 220);
      if (w.invuln <= 0) {
        w.lives -= 1;
        w.combo = 0;
        w.comboTimer = 0;
        w.shake = 0.4;
        w.invuln = INVULN_TIME;
        ev |= EV.HIT;
        if (w.lives <= 0) {
          w.over = true;
          w.best = Math.max(w.best, w.score);
          burst(w, p.x, p.y, '#7ae7d2', 30, 300);
          ev |= EV.OVER;
        }
      }
    }
  }

  // Cores: drift, magnet, collect.
  for (let i = w.cores.length - 1; i >= 0; i--) {
    const c = w.cores[i];
    const dx = p.x - c.x, dy = p.y - c.y;
    const d = Math.hypot(dx, dy) || 1;
    if (d < MAGNET_R) {
      const pull = 340 * (1 - d / MAGNET_R) + 90;
      c.vx = dx / d * pull; c.vy = dy / d * pull;
    } else {
      c.vx *= 0.9; c.vy *= 0.9;
    }
    c.x += c.vx * dt; c.y += c.vy * dt;
    if (d < COLLECT_R) {
      w.cores.splice(i, 1);
      w.coresGot += 1;
      ev |= EV.CORE;
      if (w.coresGot % CORES_PER_POWER === 0 && w.power < MAX_POWER) {
        w.power += 1;
        burst(w, p.x, p.y, '#ffd166', 18, 240);
        ev |= EV.POWER;
      }
    }
  }

  // Combo decay, shake decay, particles.
  if (w.comboTimer > 0) {
    w.comboTimer -= dt;
    if (w.comboTimer <= 0) w.combo = 0;
  }
  if (w.shake > 0) w.shake = Math.max(0, w.shake - dt);
  updateParticles(w, dt);
  return ev;
}

function updateParticles(w, dt) {
  for (let i = w.particles.length - 1; i >= 0; i--) {
    const pt = w.particles[i];
    pt.x += pt.vx * dt; pt.y += pt.vy * dt;
    pt.vx *= 0.92; pt.vy *= 0.92;
    pt.life -= dt;
    if (pt.life <= 0) w.particles.splice(i, 1);
  }
}
