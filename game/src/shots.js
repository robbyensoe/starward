// Autopilot used only for the screenshot scenes (?shot=play / ?shot=end).
// It plays the game honestly through the same input the player has: steer
// away from the nearest shards, drift toward nearby cores, keep off the
// walls. In 'end' mode the pilot is deliberately weakened — it re-decides
// rarely and ignores far shards — so the rising swarm eventually lands the
// three hits that end the run, as it would for a struggling player.
export function createPilot(weak) {
  let held = { mx: 0, my: 0 };
  let tick = 0;
  return function pilot(w) {
    tick += 1;
    const decideEvery = weak ? 14 : 3;
    if (tick % decideEvery !== 0) return held;
    const p = w.player;
    let mx = 0, my = 0;
    // Flee: strongest push from the closest shards.
    const sorted = [...w.shards].sort((a, b) => {
      const da = (a.x - p.x) ** 2 + (a.y - p.y) ** 2;
      const db = (b.x - p.x) ** 2 + (b.y - p.y) ** 2;
      return da - db;
    });
    const watch = weak ? 2 : 4;
    for (const s of sorted.slice(0, watch)) {
      const dx = p.x - s.x, dy = p.y - s.y;
      const d = Math.hypot(dx, dy) || 1;
      const weight = Math.max(0, 1 - d / 330) * 2.2;
      mx += (dx / d) * weight;
      my += (dy / d) * weight;
    }
    // Seek the nearest core when nothing is close enough to matter.
    if (sorted.length === 0 || Math.hypot(sorted[0].x - p.x, sorted[0].y - p.y) > 190) {
      let bestC = null, bestD = Infinity;
      for (const c of w.cores) {
        const d = (c.x - p.x) ** 2 + (c.y - p.y) ** 2;
        if (d < bestD) { bestD = d; bestC = c; }
      }
      if (bestC) {
        const d = Math.hypot(bestC.x - p.x, bestC.y - p.y) || 1;
        mx += ((bestC.x - p.x) / d) * 0.8;
        my += ((bestC.y - p.y) / d) * 0.8;
      } else {
        // Idle drift toward centre so the scene stays composed.
        mx += (640 - p.x) / 640 * 0.3;
        my += (360 - p.y) / 360 * 0.3;
      }
    }
    // Wall margin.
    if (p.x < 110) mx += 1.2;
    if (p.x > 1170) mx -= 1.2;
    if (p.y < 110) my += 1.2;
    if (p.y > 610) my -= 1.2;
    const len = Math.hypot(mx, my);
    if (len > 1) { mx /= len; my /= len; }
    held = { mx, my };
    return held;
  };
}
