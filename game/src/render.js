// Starward rendering: deep plum space, a teal ward-orb, crimson shards and
// amber cores and bolts. Everything is drawn from world state alone, so any
// frame can be reproduced exactly from the seed.
import { VIEW_W, VIEW_H, PLAYER_R, MAX_POWER } from './config.js';
import { createRng } from './random.js';

// Fixed decorative starfield (its own seed; never touches the world RNG).
const STARS = (() => {
  const rng = createRng(4242);
  const out = [];
  for (let i = 0; i < 130; i++) {
    out.push({ x: rng() * VIEW_W, y: rng() * VIEW_H, r: 0.6 + rng() * 1.7, tw: rng() * 6.28 });
  }
  return out;
})();

function drawBackground(ctx, w) {
  const g = ctx.createLinearGradient(0, 0, 0, VIEW_H);
  g.addColorStop(0, '#17102b');
  g.addColorStop(0.55, '#120e24');
  g.addColorStop(1, '#0b0819');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  // Faint ward rings around the arena centre.
  ctx.save();
  ctx.strokeStyle = 'rgba(122, 231, 210, 0.05)';
  ctx.lineWidth = 1.5;
  for (const r of [120, 210, 300]) {
    ctx.beginPath();
    ctx.arc(VIEW_W / 2, VIEW_H / 2, r, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
  for (const s of STARS) {
    const a = 0.35 + 0.3 * Math.sin(w.time * 0.9 + s.tw);
    ctx.fillStyle = `rgba(230, 225, 255, ${a.toFixed(3)})`;
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawShard(ctx, s) {
  ctx.save();
  ctx.translate(s.x, s.y);
  ctx.rotate(s.rot);
  ctx.fillStyle = s.big ? '#c22e4a' : '#e8405f';
  ctx.strokeStyle = 'rgba(255, 150, 170, 0.85)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    const x = Math.cos(a) * s.r, y = Math.sin(a) * s.r;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  if (s.big) {
    ctx.rotate(-s.rot * 1.7);
    ctx.fillStyle = 'rgba(255, 157, 92, 0.9)';
    ctx.beginPath();
    ctx.arc(0, 0, 5, 0, Math.PI * 2);
    ctx.fill();
    if (s.hp < 3) {
      ctx.fillStyle = 'rgba(255,255,255,0.75)';
      ctx.font = 'bold 13px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(String(s.hp), 0, -s.r - 6);
    }
  }
  ctx.restore();
}

function drawPlayer(ctx, w) {
  const p = w.player;
  const blink = w.invuln > 0 && Math.floor(w.time * 14) % 2 === 0;
  ctx.save();
  ctx.translate(p.x, p.y);
  // Outer ward ring, slowly turning.
  ctx.save();
  ctx.rotate(w.time * 0.8);
  ctx.strokeStyle = 'rgba(122, 231, 210, 0.55)';
  ctx.lineWidth = 2;
  ctx.setLineDash([10, 7]);
  ctx.beginPath();
  ctx.arc(0, 0, PLAYER_R + 7, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
  if (!blink) {
    const g = ctx.createRadialGradient(-4, -5, 2, 0, 0, PLAYER_R + 2);
    g.addColorStop(0, '#d9fff6');
    g.addColorStop(0.45, '#7ae7d2');
    g.addColorStop(1, '#1f9e8a');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, PLAYER_R, 0, Math.PI * 2);
    ctx.fill();
    // Nose toward facing.
    ctx.rotate(p.face);
    ctx.fillStyle = '#eafffa';
    ctx.beginPath();
    ctx.moveTo(PLAYER_R + 5, 0);
    ctx.lineTo(PLAYER_R - 5, -4.5);
    ctx.lineTo(PLAYER_R - 5, 4.5);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

function drawHud(ctx, w) {
  ctx.save();
  ctx.textAlign = 'left';
  ctx.fillStyle = 'rgba(234, 255, 250, 0.92)';
  ctx.font = '600 21px system-ui, sans-serif';
  ctx.fillText(`SCORE ${w.score}`, 22, 34);
  ctx.font = '500 15px system-ui, sans-serif';
  ctx.fillStyle = 'rgba(234, 255, 250, 0.65)';
  ctx.fillText(`BEST ${Math.max(w.best, w.score)}`, 22, 56);
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(234, 255, 250, 0.92)';
  ctx.font = '600 19px system-ui, sans-serif';
  ctx.fillText(`LEVEL ${w.level}`, VIEW_W / 2, 34);
  if (w.combo >= 3) {
    ctx.fillStyle = '#ffd166';
    ctx.font = '700 17px system-ui, sans-serif';
    ctx.fillText(`COMBO x${w.combo}`, VIEW_W / 2, 58);
  }
  // Power pips.
  ctx.textAlign = 'right';
  ctx.fillStyle = 'rgba(234, 255, 250, 0.65)';
  ctx.font = '500 15px system-ui, sans-serif';
  ctx.fillText('POWER', VIEW_W - 22, 56);
  for (let i = 0; i < MAX_POWER; i++) {
    ctx.fillStyle = i < w.power ? '#ffd166' : 'rgba(255, 209, 102, 0.22)';
    ctx.beginPath();
    ctx.arc(VIEW_W - 30 - i * 20, 30, 6, 0, Math.PI * 2);
    ctx.fill();
  }
  // Lives as orbs, bottom-left; cores count bottom-right.
  for (let i = 0; i < 3; i++) {
    ctx.fillStyle = i < w.lives ? '#7ae7d2' : 'rgba(122, 231, 210, 0.18)';
    ctx.beginPath();
    ctx.arc(34 + i * 26, VIEW_H - 24, 8, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.textAlign = 'right';
  ctx.fillStyle = 'rgba(255, 209, 102, 0.9)';
  ctx.font = '600 16px system-ui, sans-serif';
  ctx.fillText(`CORES ${w.coresGot}`, VIEW_W - 22, VIEW_H - 18);
  ctx.restore();
}

function panel(ctx, title, lines, accent) {
  ctx.save();
  ctx.fillStyle = 'rgba(8, 5, 18, 0.62)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  const pw = 520, ph = 84 + lines.length * 30;
  const x = (VIEW_W - pw) / 2, y = (VIEW_H - ph) / 2;
  ctx.fillStyle = 'rgba(20, 14, 40, 0.92)';
  ctx.strokeStyle = accent;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(x, y, pw, ph, 14);
  ctx.fill();
  ctx.stroke();
  ctx.textAlign = 'center';
  ctx.fillStyle = accent;
  ctx.font = '800 44px system-ui, sans-serif';
  ctx.fillText(title, VIEW_W / 2, y + 58);
  ctx.fillStyle = 'rgba(238, 240, 255, 0.88)';
  ctx.font = '500 18px system-ui, sans-serif';
  lines.forEach((ln, i) => ctx.fillText(ln, VIEW_W / 2, y + 96 + i * 30));
  ctx.restore();
}

// mode: 'title' | 'play' | 'pause' | 'over'
export function drawScene(ctx, w, mode) {
  ctx.save();
  if (w.shake > 0) {
    const m = w.shake * 14;
    ctx.translate(Math.sin(w.time * 61) * m, Math.cos(w.time * 53) * m);
  }
  drawBackground(ctx, w);
  // Cores.
  for (const c of w.cores) {
    const pulse = 1 + 0.18 * Math.sin(w.time * 5 + c.pulse);
    ctx.save();
    ctx.translate(c.x, c.y);
    ctx.rotate(Math.PI / 4);
    ctx.fillStyle = '#ffd166';
    const s = 6 * pulse;
    ctx.fillRect(-s / 2, -s / 2, s, s);
    ctx.restore();
  }
  for (const s of w.shards) drawShard(ctx, s);
  // Bolts as amber streaks.
  ctx.strokeStyle = '#ffd166';
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  for (const b of w.bolts) {
    ctx.beginPath();
    ctx.moveTo(b.x - b.vx * 0.02, b.y - b.vy * 0.02);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }
  if (!w.over) drawPlayer(ctx, w);
  // Particles.
  for (const pt of w.particles) {
    ctx.globalAlpha = Math.max(0, pt.life / pt.maxLife);
    ctx.fillStyle = pt.color;
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, pt.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.restore();

  if (mode !== 'title') drawHud(ctx, w);
  if (mode === 'title') {
    panel(ctx, 'STARWARD', [
      'Hold the ward. Break the shards. Gather their cores.',
      'Move: WASD / arrow keys / hold the pointer',
      'Your ward fires on its own — flying is your job.',
      'Press Enter or click to begin',
    ], '#7ae7d2');
  } else if (mode === 'pause') {
    panel(ctx, 'PAUSED', ['Press P or Esc to resume'], '#ffd166');
  } else if (mode === 'over') {
    panel(ctx, 'THE WARD FALLS', [
      `Score ${w.score} · Best ${w.best}`,
      `Level ${w.level} · Shards broken ${w.kills} · Cores ${w.coresGot}`,
      'Press Enter or click to ward again',
    ], '#ff5c7a');
  }
}
