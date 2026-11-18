// Starward entry point: wires the world, renderer, input and sound into the
// page, and runs the screenshot scenes when ?shot= is present. In shot mode
// the world is stepped at a fixed rate with the autopilot, so the captured
// frames are exact renders of real gameplay from the given seed.
import { createWorld, startRun, stepWorld } from './world.js';
import { drawScene } from './render.js';
import { createInput } from './input.js';
import { createPilot } from './shots.js';
import { ensureAudio, playEvents } from './sound.js';
import { EV } from './config.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const status = document.getElementById('status');

const params = new URLSearchParams(location.search);
const shot = params.get('shot');
const seed = Number(params.get('seed') || 1) >>> 0;

let world = createWorld(seed);
try {
  world.best = Number(localStorage.getItem('starward-best') || 0) || 0;
} catch { /* storage unavailable: best stays in memory */ }

let mode = 'title'; // 'title' | 'play' | 'pause' | 'over'

function announce(text) {
  if (status) status.textContent = text;
}

function begin() {
  ensureAudio();
  startRun(world);
  mode = 'play';
  announce('Run started. Break shards, gather cores, stay alive.');
}

const input = createInput(canvas, {
  onConfirm() {
    if (shot) return;
    if (mode === 'title' || mode === 'over') begin();
    else if (mode === 'pause') mode = 'play';
  },
  onPauseKey() {
    if (shot) return;
    if (mode === 'play') { mode = 'pause'; announce('Paused.'); }
    else if (mode === 'pause') mode = 'play';
  },
});

document.addEventListener('visibilitychange', () => {
  if (document.hidden && mode === 'play' && !shot) mode = 'pause';
});

function handleEvents(ev) {
  if (!ev) return;
  playEvents(ev);
  if (ev & EV.LEVEL) announce(`Level ${world.level}. The swarm quickens.`);
  if (ev & EV.POWER) announce(`Power ${world.power}. Fire rate up.`);
  if (ev & EV.OVER) {
    announce(`Game over. Score ${world.score}. Press Enter to play again.`);
    try { localStorage.setItem('starward-best', String(world.best)); } catch { /* ignore */ }
  }
}

if (shot) {
  // Deterministic screenshot scenes: fixed-step simulation, then render.
  const DT = 1 / 60;
  if (shot === 'play' || shot === 'end') {
    const weak = shot === 'end';
    const pilot = createPilot(weak);
    startRun(world);
    if (weak) world.level = 5; // the end scene starts mid-swarm
    const maxSteps = weak ? 7200 : 1500;
    let steps = 0;
    while (steps < maxSteps) {
      const ev = stepWorld(world, pilot(world), DT);
      steps += 1;
      if (weak && world.over) break;
      if (!weak && world.over) startRun(world); // keep the play scene alive
    }
    if (!weak) {
      // Shutter timing: hold the run a little longer until a frame with real
      // traffic on it — shards inbound and bolts in the air — up to 30 s more.
      for (let i = 0; i < 1800; i++) {
        if (world.shards.length >= 3 && world.bolts.length >= 1) break;
        stepWorld(world, pilot(world), DT);
        if (world.over) startRun(world);
      }
    }
    if (weak && !world.over) {
      // Guarantee the fall: one shard, point blank, no invulnerability left.
      world.lives = 1;
      world.invuln = 0;
      world.shards.push({
        x: world.player.x, y: world.player.y, r: 13, hp: 1, big: false,
        speed: 0, rot: 0, spin: 0, phase: 0,
      });
      for (let i = 0; i < 120 && !world.over; i++) stepWorld(world, { mx: 0, my: 0 }, DT);
    }
    mode = weak ? 'over' : 'play';
  }
  drawScene(ctx, world, mode);
  requestAnimationFrame(() => {
    drawScene(ctx, world, mode);
    window.__shotReady = true;
  });
} else {
  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.033, (now - last) / 1000);
    last = now;
    if (mode === 'play') {
      const ev = stepWorld(world, input.moveVec(world.player), dt);
      handleEvents(ev);
      if (world.over) mode = 'over';
    }
    drawScene(ctx, world, mode);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}
