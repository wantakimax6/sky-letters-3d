// Sky Letters (3D) — keyboard and mouse input. Held keys give pitch,
// roll and throttle; one-shot presses (confirm, pause, restart, mute)
// are queued as bit flags and taken once by the loop, so a press between
// two frames is never lost and never counted twice.
export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_RESTART = 4;
export const ACTION_MUTE = 8;

const PITCH_UP = new Set(['ArrowUp', 'KeyI']);
const PITCH_DOWN = new Set(['ArrowDown', 'KeyK']);
const ROLL_LEFT = new Set(['ArrowLeft', 'KeyA', 'KeyJ']);
const ROLL_RIGHT = new Set(['ArrowRight', 'KeyD', 'KeyL']);
const THR_UP = new Set(['KeyW', 'ShiftLeft', 'ShiftRight']);
const THR_DOWN = new Set(['KeyS', 'ControlLeft', 'ControlRight']);
const CONFIRM = new Set(['Enter']);
const PAUSE = new Set(['KeyP', 'Escape']);
const RESTART = new Set(['KeyR']);
const MUTE = new Set(['KeyM']);

export function createInput(canvas) {
  const held = new Set();
  let actions = 0;
  let mouseSteer = 0;
  let dragging = false;

  window.addEventListener('keydown', (event) => {
    if (CONFIRM.has(event.code)) { if (!event.repeat) actions |= ACTION_CONFIRM; }
    else if (PAUSE.has(event.code)) { if (!event.repeat) actions |= ACTION_PAUSE; }
    else if (RESTART.has(event.code)) { if (!event.repeat) actions |= ACTION_RESTART; }
    else if (MUTE.has(event.code)) { if (!event.repeat) actions |= ACTION_MUTE; }
    else if (event.code === 'Space') { held.add('Space'); }
    else held.add(event.code);
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(event.code)) event.preventDefault();
  });
  window.addEventListener('keyup', (event) => {
    held.delete(event.code);
    if (event.code === 'Space') held.delete('Space');
  });
  window.addEventListener('blur', () => { held.clear(); mouseSteer = 0; dragging = false; });
  canvas.addEventListener('pointerdown', (event) => {
    dragging = true;
    mouseSteer = Math.max(-1, Math.min(1, (event.clientX - window.innerWidth / 2) / 320));
  });
  window.addEventListener('pointermove', (event) => {
    if (!dragging) return;
    mouseSteer = Math.max(-1, Math.min(1, (event.clientX - window.innerWidth / 2) / 320));
  });
  window.addEventListener('pointerup', () => { dragging = false; mouseSteer = 0; });

  function any(set) { for (const k of set) if (held.has(k)) return true; return false; }
  return {
    pitch() { return (any(PITCH_UP) ? 1 : 0) - (any(PITCH_DOWN) ? 1 : 0); },
    roll() { return (any(ROLL_RIGHT) ? 1 : 0) - (any(ROLL_LEFT) ? 1 : 0); },
    throttleDir() { return (any(THR_UP) ? 1 : 0) - (any(THR_DOWN) ? 1 : 0); },
    brake() { return held.has('Space'); },
    mouseSteer() { return dragging ? mouseSteer : 0; },
    takeActions() { const taken = actions; actions = 0; return taken; },
  };
}
