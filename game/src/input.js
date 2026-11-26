// Sky Letters (3D) — keyboard, mouse, touch virtual pad and physical
// gamepad input. Held keys give pitch, roll and throttle; one-shot
// presses (confirm, pause, restart, mute) are queued as bit flags and
// taken once by the loop, so a press between two frames is never lost
// and never counted twice. The virtual pad (analog stick, throttle
// buttons, skill buttons) and the Gamepad API feed the same values.
export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_RESTART = 4;
export const ACTION_MUTE = 8;
export const ACTION_SKILL_BOOST = 16;
export const ACTION_SKILL_ROLL = 32;
export const ACTION_SKILL_FLARE = 64;
export const ACTION_SKILL_GLIDE = 128;
export const ACTION_SKILL_CANNON = 256;
export const ACTION_MAP = 512;

const SKILL_KEYS = {
  Digit1: ACTION_SKILL_BOOST,
  Digit2: ACTION_SKILL_ROLL, KeyQ: ACTION_SKILL_ROLL,
  Digit3: ACTION_SKILL_FLARE, KeyF: ACTION_SKILL_FLARE,
  Digit4: ACTION_SKILL_GLIDE, KeyE: ACTION_SKILL_GLIDE,
  Digit5: ACTION_SKILL_CANNON, KeyC: ACTION_SKILL_CANNON,
};

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
const MAP = new Set(['KeyN']);

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

export function createInput(canvas) {
  const held = new Set();
  let actions = 0;
  let mouseSteer = 0;
  let dragging = false;
  // Virtual pad state: the analog stick gives pitch (up = climb) and
  // roll; the throttle buttons nudge the throttle while held.
  const touch = { pitch: 0, roll: 0, thrDir: 0 };
  // Physical gamepad state, refreshed once per frame by update().
  let pad = null;
  let prevPadButtons = [];

  window.addEventListener('keydown', (event) => {
    if (CONFIRM.has(event.code)) { if (!event.repeat) actions |= ACTION_CONFIRM; }
    else if (PAUSE.has(event.code)) { if (!event.repeat) actions |= ACTION_PAUSE; }
    else if (RESTART.has(event.code)) { if (!event.repeat) actions |= ACTION_RESTART; }
    else if (MUTE.has(event.code)) { if (!event.repeat) actions |= ACTION_MUTE; }
    else if (MAP.has(event.code)) { if (!event.repeat) actions |= ACTION_MAP; }
    else if (SKILL_KEYS[event.code]) { if (!event.repeat) actions |= SKILL_KEYS[event.code]; }
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

  // ---- Virtual gamepad (touch) ----
  const stickEl = document.getElementById('vpad-stick');
  const knobEl = document.getElementById('vpad-knob');
  let stickPointer = null;
  function stickUpdate(event) {
    if (!stickEl) return;
    const r = stickEl.getBoundingClientRect();
    let dx = (event.clientX - (r.left + r.width / 2)) / (r.width / 2);
    let dy = (event.clientY - (r.top + r.height / 2)) / (r.height / 2);
    const len = Math.hypot(dx, dy);
    if (len > 1) { dx /= len; dy /= len; }
    touch.roll = dx;
    touch.pitch = -dy;
    if (knobEl) knobEl.style.transform = `translate(calc(-50% + ${dx * 43}px), calc(-50% + ${dy * 43}px))`;
  }
  function stickReset() {
    touch.pitch = 0; touch.roll = 0; stickPointer = null;
    if (knobEl) knobEl.style.transform = 'translate(-50%, -50%)';
  }
  if (stickEl) {
    stickEl.addEventListener('pointerdown', (event) => {
      stickPointer = event.pointerId;
      try { stickEl.setPointerCapture(event.pointerId); } catch { /* old browsers */ }
      stickUpdate(event);
      event.preventDefault();
    });
    stickEl.addEventListener('pointermove', (event) => {
      if (event.pointerId === stickPointer) stickUpdate(event);
    });
    const endStick = (event) => { if (event.pointerId === stickPointer) stickReset(); };
    stickEl.addEventListener('pointerup', endStick);
    stickEl.addEventListener('pointercancel', endStick);
  }
  function holdButton(id, on, off) {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('pointerdown', (event) => { on(); event.preventDefault(); });
    el.addEventListener('pointerup', () => off());
    el.addEventListener('pointerleave', () => off());
    el.addEventListener('pointercancel', () => off());
  }
  holdButton('vpad-thr-up', () => { touch.thrDir = 1; }, () => { touch.thrDir = 0; });
  holdButton('vpad-thr-down', () => { touch.thrDir = -1; }, () => { touch.thrDir = 0; });
  // Skill buttons and the pad's pause / mute / map buttons fire the
  // same one-shot actions as their keyboard keys.
  const padAction = (id, flag) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('pointerdown', (event) => { actions |= flag; event.preventDefault(); });
  };
  padAction('vpad-skill-boost', ACTION_SKILL_BOOST);
  padAction('vpad-skill-roll', ACTION_SKILL_ROLL);
  padAction('vpad-skill-flare', ACTION_SKILL_FLARE);
  padAction('vpad-skill-glide', ACTION_SKILL_GLIDE);
  padAction('vpad-skill-cannon', ACTION_SKILL_CANNON);
  padAction('vpad-pause', ACTION_PAUSE);
  padAction('vpad-mute', ACTION_MUTE);
  padAction('vpad-map', ACTION_MAP);
  // For headless tests: the live touch / gamepad state is inspectable.
  window.__touch = touch;

  // ---- Physical gamepad (Gamepad API) ----
  // Standard mapping: left stick steers (X = roll, Y = pitch, up is
  // negative), D-pad up/down throttles, RT brakes, A confirms,
  // Start pauses, X/Y/LB/RB/LT fire the five skills, Back mutes.
  // update() must be called once per frame; it is cheap when no pad
  // is connected.
  function update() {
    pad = null;
    let pads = [];
    try { pads = navigator.getGamepads ? navigator.getGamepads() : []; } catch { pads = []; }
    const gp = Array.from(pads || []).find((p) => p && p.connected !== false);
    if (!gp) { prevPadButtons = []; window.__pad = null; return; }
    const ax = (i) => { const v = gp.axes[i] || 0; return Math.abs(v) > 0.12 ? v : 0; };
    const btn = (i) => !!(gp.buttons[i] && gp.buttons[i].pressed);
    pad = {
      pitch: -ax(1), roll: ax(0),
      thrDir: (btn(12) ? 1 : 0) - (btn(13) ? 1 : 0),
      brake: btn(7),
    };
    const edge = (i) => btn(i) && !prevPadButtons[i];
    if (edge(0)) actions |= ACTION_CONFIRM;
    if (edge(9)) actions |= ACTION_PAUSE;
    if (edge(2)) actions |= ACTION_SKILL_BOOST;
    if (edge(3)) actions |= ACTION_SKILL_ROLL;
    if (edge(4)) actions |= ACTION_SKILL_FLARE;
    if (edge(5)) actions |= ACTION_SKILL_GLIDE;
    if (edge(6)) actions |= ACTION_SKILL_CANNON;
    if (edge(8)) actions |= ACTION_MUTE;
    prevPadButtons = Array.from(gp.buttons, (b) => !!(b && b.pressed));
    window.__pad = pad;
  }

  function any(set) { for (const k of set) if (held.has(k)) return true; return false; }
  return {
    update,
    pitch() {
      const k = (any(PITCH_UP) ? 1 : 0) - (any(PITCH_DOWN) ? 1 : 0);
      return clamp(k + touch.pitch + (pad ? pad.pitch : 0), -1, 1);
    },
    roll() {
      const k = (any(ROLL_RIGHT) ? 1 : 0) - (any(ROLL_LEFT) ? 1 : 0);
      return clamp(k + touch.roll + (pad ? pad.roll : 0), -1, 1);
    },
    throttleDir() {
      const k = (any(THR_UP) ? 1 : 0) - (any(THR_DOWN) ? 1 : 0);
      return clamp(k + touch.thrDir + (pad ? pad.thrDir : 0), -1, 1);
    },
    brake() { return held.has('Space') || !!(pad && pad.brake); },
    mouseSteer() { return dragging ? mouseSteer : 0; },
    takeActions() { const taken = actions; actions = 0; return taken; },
  };
}
