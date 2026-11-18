// Keyboard + pointer input. Movement comes from WASD / arrow keys, or from
// holding the pointer down and steering toward it. Enter / click starts and
// restarts; P or Esc pauses. The game reads plain state each frame.
export function createInput(canvas, handlers) {
  const keys = new Set();
  const pointer = { down: false, x: 0, y: 0 };

  function toGame(evt) {
    const r = canvas.getBoundingClientRect();
    return {
      x: ((evt.clientX - r.left) / r.width) * canvas.width,
      y: ((evt.clientY - r.top) / r.height) * canvas.height,
    };
  }

  window.addEventListener('keydown', (e) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) e.preventDefault();
    if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') handlers.onPauseKey();
    if (e.key === 'Enter') handlers.onConfirm();
    keys.add(e.key.toLowerCase());
  });
  window.addEventListener('keyup', (e) => keys.delete(e.key.toLowerCase()));
  window.addEventListener('blur', () => keys.clear());

  canvas.addEventListener('pointerdown', (e) => {
    const pt = toGame(e);
    pointer.down = true; pointer.x = pt.x; pointer.y = pt.y;
    handlers.onConfirm();
  });
  canvas.addEventListener('pointermove', (e) => {
    const pt = toGame(e);
    pointer.x = pt.x; pointer.y = pt.y;
  });
  window.addEventListener('pointerup', () => { pointer.down = false; });

  return {
    // player: current world player position, for pointer steering.
    moveVec(player) {
      let mx = 0, my = 0;
      if (keys.has('a') || keys.has('arrowleft')) mx -= 1;
      if (keys.has('d') || keys.has('arrowright')) mx += 1;
      if (keys.has('w') || keys.has('arrowup')) my -= 1;
      if (keys.has('s') || keys.has('arrowdown')) my += 1;
      if (mx === 0 && my === 0 && pointer.down && player) {
        const dx = pointer.x - player.x, dy = pointer.y - player.y;
        const d = Math.hypot(dx, dy);
        if (d > 12) { mx = dx / d; my = dy / d; }
      }
      return { mx, my };
    },
  };
}
