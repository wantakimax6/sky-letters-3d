// Sky Letters (3D) — the screenshot scenes behind
// ?shot=cover|storm|landing|sunset (&seed=1). Each scene sets the plane,
// mission, time of day and HUD values explicitly — no autopilot drift —
// so the same seed always gives the same frame. Every shot shows the
// plane, recognisable terrain, a ring or runway ahead and ALT/SPD/HDG.
// Letters delivered always matches the mission (Letter 3 => 2/5, and so on).
// The cover shot fires Sky Boost, so a skill effect (speed lines and the
// engine glow) is visible in at least one screenshot.
import { STEP } from './config.js';

const SHOTS = {
  cover: {
    mission: 1, sky: 'day', rain: false,
    plane: { x: 0, alt: 95, z: -450, heading: 0, speed: 82, throttle: 0.55 },
    ringIndex: 2, delivered: 0, fuel: 98, score: 0,
    skill: 'boost',
  },
  storm: {
    mission: 3, sky: 'day', rain: false,
    plane: { x: -20, alt: 62, z: -1400, heading: 0.1, speed: 68, throttle: 0.5 },
    ringIndex: 3, delivered: 2, fuel: 94, score: 340,
    dialogue: 'deliver',
  },
  landing: {
    mission: 4, sky: 'dusk', rain: true,
    plane: { x: 0, alt: 115, z: -2400, heading: 0, speed: 61, throttle: 0.45 },
    ringIndex: 3, delivered: 3, fuel: 92, score: 520,
  },
  sunset: {
    mission: 5, sky: 'sunset', rain: false,
    plane: { x: 120, alt: 195, z: -1600, heading: 0.05, speed: 74, throttle: 0.55 },
    ringIndex: 2, delivered: 4, fuel: 94, score: 780,
  },
};

export function stageShot(name, world) {
  const shot = SHOTS[name] || SHOTS.cover;
  world.reset();
  world.startMission(shot.mission - 1);
  const state = world.state;
  const m = world.mission();
  Object.assign(state.plane, shot.plane);
  state.plane.bank = 0;
  state.plane.pitch = 0;
  state.plane.vs = 0;
  state.plane.prop = 1.2;
  state.ringIndex = shot.ringIndex;
  for (let i = 0; i < state.rings.length; i += 1) state.rings[i].done = i < shot.ringIndex;
  state.deliveredCount = shot.delivered;
  state.letters = shot.delivered;
  state.fuel = shot.fuel;
  state.score = shot.score;
  state.hearts = 3;
  state.damage = 0;
  state.mode = 'fly';
  state.dialogue = null;
  state.dialogueIndex = 0;
  if (shot.skill) {
    const sk = state.skills[shot.skill];
    if (sk) { sk.active = 1.5; sk.cd = 0; }
    state.skillFlash = { text: 'Sky Boost!', until: 9999 };
  }
  if (shot.dialogue === 'deliver') {
    state.dialogue = { lines: m.deliverLines, kind: 'deliver' };
    state.dialogueIndex = 0;
    state.mode = 'dialogue';
  }
  return { sky: shot.sky, rain: shot.rain, mission: m };
}

export function shotInfo(name) {
  return SHOTS[name] || SHOTS.cover;
}
export { STEP };
