// Sky Letters (3D) — the flight model and the mission rules, with no
// drawing and no browser in it. Fixed-step physics: throttle, pitch, bank
// and turn, stall, wind, fuel, damage, rings, landings and crashes. step()
// advances one fixed step and returns what happened as bit flags. The plane
// lives in Three.js units: x east, alt up, z forward (north is +z).
import { FLIGHT } from './config.js';
import { MISSIONS } from './missions.js';
import { ISLANDS, MISSION_TARGETS, heightAt, islandById } from './islands.js';

export const EVENT_RING = 1;
export const EVENT_FUEL = 2;
export const EVENT_DELIVERED = 4;
export const EVENT_CRASH = 8;
export const EVENT_STALL = 16;
export const EVENT_COMPLETE = 32;
export const EVENT_LAND = 64;

function lerp(a, b, t) { return a + (b - a) * t; }
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

function buildRings(mission) {
  const target = islandById(MISSION_TARGETS[mission.id].island);
  const rings = [];
  // Longer chains across the bigger map: 5, 5, 6, 5 and 7 golden rings.
  const count = mission.id === 1 ? 5 : mission.id === 2 ? 5 : mission.id === 3 ? 6 : mission.id === 4 ? 5 : 7;
  for (let i = 0; i < count; i += 1) {
    const t = (i + 1) / (count + 1);
    let x = lerp(0, target.x, t);
    let y = 95;
    if (mission.id === 3) { x = lerp(-260, 260, t); y = 62; }
    if (mission.id === 5) { x = Math.sin(t * Math.PI) * 260 - 60; y = 90 + Math.sin(t * Math.PI) * 130; }
    if (mission.id === 4) y = 115;
    rings.push({ x, y, z: lerp(-80, target.z + 160, t), r: 20, done: false, fuel: false });
  }
  // Green fuel rings on the long legs, flown after the golden rings.
  if (mission.id === 4) {
    rings.push({ x: -140, y: 120, z: -900, r: 20, done: false, fuel: true });
    rings.push({ x: 100, y: 120, z: -1950, r: 20, done: false, fuel: true });
    rings.push({ x: -260, y: 120, z: -2900, r: 20, done: false, fuel: true });
    rings.push({ x: 180, y: 115, z: -3600, r: 20, done: false, fuel: true });
  }
  if (mission.id === 2) {
    rings.push({ x: 210, y: 100, z: -1500, r: 20, done: false, fuel: true });
  }
  if (mission.id === 5) {
    rings.push({ x: -40, y: 110, z: -2600, r: 20, done: false, fuel: true });
  }
  return rings;
}

export function createWorld(seed) {
  const state = {
    plane: { x: 0, z: 0, alt: 60, heading: 0, speed: 70, throttle: 0.6, bank: 0, pitch: 0, vs: 0, prop: 0 },
    fuel: FLIGHT.fuelMax, damage: 0, hearts: 3, letters: 0, score: 0,
    missionIndex: 0, rings: [], ringIndex: 0, elapsed: 0, missionTime: 0,
    wind: 0, mode: 'fly', crashReason: '', landedGentle: false,
    dialogue: null, dialogueIndex: 0, deliveredCount: 0, stalled: false,
    time: 0, seed,
    skills: {
      boost: { cd: 0, active: 0 }, roll: { cd: 0, active: 0 },
      flare: { cd: 0, active: 0 }, glide: { cd: 0, active: 0 },
    },
    stormClearedUntil: 0, protectedUntil: 0, skillFlash: null,
  };

  function mission() { return MISSIONS[state.missionIndex]; }
  function targetIsland() { return islandById(MISSION_TARGETS[mission().id].island); }

  // Pilot skills (see config SKILLS): each has a cooldown and a short
  // active window. Returns true only when the skill actually fired.
  const SKILL_DEFS = {
    boost: { cooldown: 8, duration: 2.2, label: 'Sky Boost!' },
    roll: { cooldown: 6, duration: 0.9, label: 'Barrel Roll!' },
    flare: { cooldown: 10, duration: 1.2, label: 'Flare Burst!' },
    glide: { cooldown: 9, duration: 4, label: 'Feather Glide!' },
  };
  function useSkill(id) {
    if (state.mode !== 'fly') return false;
    const def = SKILL_DEFS[id];
    const sk = state.skills[id];
    if (!def || !sk || sk.cd > 0) return false;
    sk.cd = def.cooldown;
    sk.active = def.duration;
    state.skillFlash = { text: def.label, until: state.time + 1.4 };
    if (id === 'boost') state.fuel = Math.max(0, state.fuel - 6);
    if (id === 'flare') state.stormClearedUntil = state.time + 6;
    if (id === 'roll') state.protectedUntil = state.time + 1.0;
    return true;
  }

  function startMission(index) {
    state.missionIndex = index;
    const m = mission();
    state.rings = buildRings(m);
    state.ringIndex = 0;
    state.plane = { x: 0, z: 0, alt: 60, heading: 0, speed: 70, throttle: 0.6, bank: 0, pitch: 0, vs: 0, prop: 0 };
    state.fuel = FLIGHT.fuelMax;
    state.damage = Math.max(0, state.damage - 30);
    state.wind = m.wind;
    state.missionTime = 0;
    state.mode = 'dialogue';
    state.dialogue = { lines: m.lines, kind: 'brief' };
    state.dialogueIndex = 0;
    for (const k of Object.keys(state.skills)) { state.skills[k].cd = 0; state.skills[k].active = 0; }
    state.stormClearedUntil = 0;
    state.protectedUntil = 0;
    state.skillFlash = null;
  }

  function nextTarget() {
    if (state.ringIndex < state.rings.length) {
      const r = state.rings[state.ringIndex];
      return { x: r.x, y: r.y, z: r.z, label: r.fuel ? 'Fuel ring' : 'Golden ring', fuel: r.fuel };
    }
    const t = targetIsland();
    return { x: t.x, y: 0, z: t.z, label: `Land at ${t.name}`, fuel: false };
  }
  function distanceToTarget() {
    const t = nextTarget(); const p = state.plane;
    return Math.hypot(t.x - p.x, t.z - p.z);
  }

  function reset() {
    state.letters = 0; state.score = 0; state.hearts = 3; state.damage = 0;
    state.deliveredCount = 0; state.elapsed = 0;
    startMission(0);
  }

  function advanceDialogue() {
    if (!state.dialogue) return false;
    state.dialogueIndex += 1;
    if (state.dialogueIndex >= state.dialogue.lines.length) {
      const wasDeliver = state.dialogue.kind === 'deliver';
      state.dialogue = null; state.dialogueIndex = 0;
      if (wasDeliver) {
        if (state.missionIndex + 1 >= MISSIONS.length) {
          state.mode = 'complete';
          return true;
        }
        startMission(state.missionIndex + 1);
      } else {
        state.mode = 'fly';
      }
      return true;
    }
    return false;
  }

  function step(dt, input, harmless) {
    let events = 0;
    state.time += dt;
    if (state.mode === 'dialogue' || state.mode === 'complete') return events;
    if (state.mode === 'crashed' || state.mode === 'landed') return events;
    const p = state.plane;
    const m = mission();
    state.elapsed += dt; state.missionTime += dt;
    if (m.timeLimit > 0 && state.missionTime > m.timeLimit) {
      state.mode = 'crashed'; state.crashReason = 'Too slow — the birthday candles melted. Try again, a little faster.';
      return EVENT_CRASH;
    }
    // Pilot-skill timers tick down every step.
    for (const k of Object.keys(state.skills)) {
      const sk = state.skills[k];
      if (sk.cd > 0) sk.cd = Math.max(0, sk.cd - dt);
      if (sk.active > 0) sk.active = Math.max(0, sk.active - dt);
    }
    // Throttle and speed. Sky Boost multiplies the target speed.
    p.throttle = clamp(p.throttle + (input.throttleDelta || 0) * dt * 0.55, 0, 1);
    if (input.brake) p.throttle = clamp(p.throttle - dt * 0.8, 0, 1);
    if (state.fuel <= 0) p.throttle = 0;
    let targetSpeed = FLIGHT.minSpeed + p.throttle * (FLIGHT.maxSpeed - FLIGHT.minSpeed);
    if (state.skills.boost.active > 0) targetSpeed = Math.min(168, targetSpeed * 1.45);
    p.speed += (targetSpeed - p.speed) * 0.35 * dt;
    if (input.brake) p.speed = Math.max(FLIGHT.minSpeed, p.speed - 26 * dt);
    // Pitch and climb. Climbing is strong, sinking is gentle, so a landing
    // approach can be flown slowly and the touchdown sink stays readable.
    const pitchIn = input.pitch || 0;
    const stalled = p.speed < FLIGHT.stallSpeed;
    state.stalled = stalled;
    if (stalled) events |= EVENT_STALL;
    // Feather Glide steadies the plane: a stalled glide sinks gently
    // instead of dropping, and a normal glide never sinks fast.
    const gliding = state.skills.glide.active > 0;
    const sink = gliding ? -4 : -FLIGHT.sinkRate;
    const climb = stalled ? sink
      : pitchIn * (pitchIn >= 0 ? FLIGHT.climbRate : 15) - (p.throttle < 0.25 ? 6 : 0);
    p.vs = lerp(p.vs, gliding ? Math.max(climb, -4) : climb, 0.2);
    p.alt += p.vs * dt;
    p.pitch = lerp(p.pitch, clamp(p.vs / FLIGHT.climbRate, -0.5, 0.5), 0.1);
    // Bank, turn and wind. A Barrel Roll protects briefly and does not
    // fight the turn: the visual roll is drawn by the plane, not the bank.
    const rollIn = (input.roll || 0) + (input.mouseSteer || 0);
    const bankTarget = clamp(rollIn, -1, 1) * FLIGHT.bankMax * (stalled ? 0.4 : 1) * (gliding ? 0.5 : 1);
    p.bank = lerp(p.bank, bankTarget, 0.14);
    p.heading += p.bank * FLIGHT.turnRate * (p.speed / FLIGHT.cruiseSpeed) * dt;
    p.x += Math.sin(p.heading) * p.speed * dt + state.wind * dt * 0.4;
    p.z -= Math.cos(p.heading) * p.speed * dt;
    p.prop += dt * (6 + p.throttle * 26);
    // Fuel and damage.
    state.fuel = Math.max(0, state.fuel - FLIGHT.fuelDrain * (0.35 + p.throttle) * dt);
    if (state.fuel <= 0 && state.mode === 'fly') p.vs = Math.min(p.vs, -8);
    // Stay inside the big archipelago (forward is -z).
    p.x = clamp(p.x, -2200, 2200);
    p.z = clamp(p.z, -5600, 400);
    if (p.alt > 520) { p.alt = 520; p.vs = Math.min(p.vs, 0); }
    // Rings.
    const ring = state.rings[state.ringIndex];
    if (ring && !ring.done) {
      const d = Math.hypot(ring.x - p.x, ring.y - p.alt, ring.z - p.z);
      if (d < ring.r + 14) {
        ring.done = true; state.ringIndex += 1;
        if (ring.fuel) {
          state.fuel = Math.min(FLIGHT.fuelMax, state.fuel + FLIGHT.fuelRingBonus);
          events |= EVENT_FUEL;
        } else {
          state.score += 100;
          events |= EVENT_RING;
        }
      }
    }
    // Storm clouds on the canyon run hurt when flown through — unless a
    // Flare Burst cleared them, or a Barrel Roll is protecting the plane.
    if (m.id === 3 && state.time > state.stormClearedUntil && state.time > state.protectedUntil
      && p.alt > 90 && p.alt < 260 && p.z < -1500 && p.z > -2400) {
      state.damage = Math.min(100, state.damage + 9 * dt);
    }
    // Landing or crash. The landing zone is the water runway in front of
    // the island (or the island itself for the strip and the hill): come
    // in slow, level and gentle, and the letter is delivered.
    const t = targetIsland();
    const runway = { x: t.x, z: t.z + 220 };
    const overTarget = Math.hypot(t.x - p.x, t.z - p.z) < 130
      || Math.hypot(runway.x - p.x, runway.z - p.z) < 170;
    const allRingsDone = state.ringIndex >= state.rings.length;
    const ground = heightAt(p.x, p.z);
    if (p.alt <= ground + 2) {
      if (allRingsDone && overTarget && p.speed <= FLIGHT.safeLandSpeed && Math.abs(p.vs) <= FLIGHT.safeLandSink) {
        const gentle = Math.abs(p.vs) <= 5 && p.speed <= 55;
        state.landedGentle = gentle;
        state.mode = 'landed';
        state.letters += 1; state.deliveredCount += 1;
        state.score += 500 + (gentle ? 150 : 0) + Math.max(0, Math.round(100 - state.missionTime / 3));
        if (gentle) state.hearts = Math.min(5, state.hearts + 1);
        events |= EVENT_LAND | EVENT_DELIVERED;
        state.dialogue = { lines: m.deliverLines, kind: 'deliver' };
        state.dialogueIndex = 0;
        state.mode = 'dialogue';
        return events;
      }
      state.mode = 'crashed';
      state.damage = Math.min(100, state.damage + FLIGHT.damageHard);
      state.crashReason = p.speed > FLIGHT.safeLandSpeed
        ? 'Too fast for the water — Pipit skipped and splashed. Come in slow and gentle.'
        : 'Pipit is hurt — try again, gently. Slow down, line up, and settle onto the water.';
      events |= EVENT_CRASH;
      return events;
    }
    if (state.damage >= 100) {
      state.mode = 'crashed'; state.crashReason = 'Pipit took too much damage and had to ditch. Fly kinder next time.';
      events |= EVENT_CRASH;
    }
    return events;
  }

  function retryMission() {
    state.damage = 0;
    startMission(state.missionIndex);
  }

  reset();
  return {
    state, reset, step, startMission, nextTarget, distanceToTarget,
    mission, targetIsland, advanceDialogue, retryMission, useSkill,
  };
}
