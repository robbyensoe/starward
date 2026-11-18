// Starward sound: small WebAudio synth, no audio files. Low square and saw
// voices this time — a heavier, more mechanical palette than a sine chime.
// Audio starts only after a user gesture, per browser policy.
import { EV } from './config.js';

let ac = null;
let lastFire = 0;

export function ensureAudio() {
  if (!ac) {
    try {
      ac = new (window.AudioContext || window.webkitAudioContext)();
    } catch {
      ac = null;
    }
  }
  if (ac && ac.state === 'suspended') ac.resume();
}

function blip(f0, f1, dur, type, gain, when = 0) {
  if (!ac) return;
  const t = ac.currentTime + when;
  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(f0, t);
  osc.frequency.exponentialRampToValueAtTime(Math.max(30, f1), t + dur);
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(g).connect(ac.destination);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

export function playEvents(ev) {
  if (!ac || !ev) return;
  if (ev & EV.FIRE) {
    const now = performance.now();
    if (now - lastFire > 90) {
      lastFire = now;
      blip(520, 300, 0.05, 'square', 0.03);
    }
  }
  if (ev & EV.KILL) blip(340, 90, 0.14, 'sawtooth', 0.07);
  if (ev & EV.CORE) blip(760, 1180, 0.08, 'square', 0.045);
  if (ev & EV.POWER) {
    blip(392, 392, 0.09, 'square', 0.06);
    blip(587, 587, 0.09, 'square', 0.06, 0.09);
    blip(784, 784, 0.13, 'square', 0.06, 0.18);
  }
  if (ev & EV.HIT) blip(160, 55, 0.28, 'sawtooth', 0.11);
  if (ev & EV.LEVEL) {
    blip(262, 262, 0.1, 'square', 0.055);
    blip(392, 392, 0.14, 'square', 0.055, 0.1);
  }
  if (ev & EV.OVER) {
    blip(330, 330, 0.22, 'sawtooth', 0.09);
    blip(233, 233, 0.22, 'sawtooth', 0.09, 0.22);
    blip(155, 60, 0.5, 'sawtooth', 0.09, 0.44);
  }
}
