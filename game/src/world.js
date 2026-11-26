// Sky Letters (3D) — the flight model and the mission rules, with no
// drawing and no browser in it. Fixed-step physics: throttle, pitch, bank
// and turn, stall, wind, fuel, damage, rings, landings and crashes, plus
// enemy drones (missions 3-5) that chase, fire slow tracers and can be
// shot down with the Lock-On Cannon, and city-building collisions.
// step() advances one fixed step and returns what happened as bit flags.
// The plane lives in Three.js units: x east, alt up, z forward.
import { FLIGHT } from './config.js';
import { MISSIONS } from './missions.js';
import { ISLANDS, MISSION_TARGETS, CITY_BUILDINGS, heightAt, islandById } from './islands.js';

export const EVENT_RING = 1;
export const EVENT_FUEL = 2;
export const EVENT_DELIVERED = 4;
export const EVENT_CRASH = 8;
export const EVENT_STALL = 16;
export const EVENT_COMPLETE = 32;
export const EVENT_LAND = 64;
export const EVENT_ENEMY_DOWN = 128;
export const EVENT_HIT = 256;

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
  // Mission 3 flies a low leg through the city: the third ring hangs
  // over Kota Langit between the towers — a low pass through the city
  // is fast, but the buildings below are not forgiving.
  if (mission.id === 3 && rings[2]) {
    rings[2] = { x: -380, y: 74, z: -2500, r: 20, done: false, fuel: false };
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

// How many enemy drones each mission fields: none for the tutorial and
// the birthday run, then two, two and three for the canyon, dusk and
// sunset flights.
const ENEMY_COUNT = { 1: 0, 2: 0, 3: 2, 4: 2, 5: 3 };

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
      cannon: { cd: 0, active: 0 },
    },
    stormClearedUntil: 0, protectedUntil: 0, skillFlash: null,
    enemies: [], tracers: [], lockTarget: -1, enemyLockBrokenUntil: 0,
    lastEnemyDown: null, enemiesDown: 0,
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
    cannon: { cooldown: 5, duration: 0.6, label: 'Lock-On Cannon!' },
  };

  function spawnEnemies() {
    const count = ENEMY_COUNT[mission().id] || 0;
    state.enemies = [];
    for (let i = 0; i < count; i += 1) {
      state.enemies.push({
        x: (i - (count - 1) / 2) * 260, y: 95 + i * 22, z: -750 - i * 260,
        hp: 50, active: true, fireCd: 2.0 + i * 0.7, phase: i * 1.7,
      });
    }
    state.tracers = [];
    state.lockTarget = -1;
    state.enemyLockBrokenUntil = 0;
    state.lastEnemyDown = null;
  }
  // Place drones at exact positions (used by screenshot staging).
  function placeEnemies(list) {
    state.enemies = list.map((e) => ({
      x: e.x, y: e.y, z: e.z, hp: 50, active: true, fireCd: 3, phase: 0,
    }));
    state.tracers = [];
    state.lockTarget = list.length > 0 ? 0 : -1;
  }

  function fireCannon() {
    const p = state.plane;
    const fx = Math.sin(p.heading);
    const fz = -Math.cos(p.heading);
    let tx = p.x + fx * 200;
    let ty = p.alt;
    let tz = p.z + fz * 200;
    const locked = state.lockTarget >= 0 && state.enemies[state.lockTarget]
      && state.enemies[state.lockTarget].active
      ? state.enemies[state.lockTarget] : null;
    if (locked) { tx = locked.x; ty = locked.y; tz = locked.z; }
    for (let i = 0; i < 5; i += 1) {
      const dx = tx - p.x;
      const dy = ty - p.alt;
      const dz = tz - p.z;
      const len = Math.hypot(dx, dy, dz) || 1;
      const spread = (i - 2) * 0.02;
      state.tracers.push({
        x: p.x + fx * 10, y: p.alt + 1, z: p.z + fz * 10,
        vx: (dx / len) * 420 + spread * 60, vy: (dy / len) * 420, vz: (dz / len) * 420,
        life: 1.4, max: 1.4, from: 'cannon', dmg: 25,
      });
    }
  }

  function useSkill(id) {
    if (state.mode !== 'fly') return false;
    const def = SKILL_DEFS[id];
    const sk = state.skills[id];
    if (!def || !sk || sk.cd > 0) return false;
    sk.cd = def.cooldown;
    sk.active = def.duration;
    state.skillFlash = { text: def.label, until: state.time + 1.4 };
    if (id === 'boost') state.fuel = Math.max(0, state.fuel - 6);
    if (id === 'flare') {
      state.stormClearedUntil = state.time + 6;
      state.enemyLockBrokenUntil = state.time + 6;
    }
    if (id === 'roll') state.protectedUntil = state.time + 1.0;
    if (id === 'cannon') fireCannon();
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
    spawnEnemies();
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
    state.deliveredCount = 0; state.elapsed = 0; state.enemiesDown = 0;
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

  // Enemy drones: chase the player, fire slow tracers, and take cannon
  // fire. Returns event flags (enemy down, player hit).
  function stepEnemies(dt) {
    let events = 0;
    const p = state.plane;
    // Lock-on: the nearest live drone ahead, inside a 35-degree cone.
    let best = -1;
    let bestDist = 450;
    const fx = Math.sin(p.heading);
    const fz = -Math.cos(p.heading);
    for (let i = 0; i < state.enemies.length; i += 1) {
      const e = state.enemies[i];
      if (!e.active) continue;
      const dx = e.x - p.x;
      const dy = e.y - p.alt;
      const dz = e.z - p.z;
      const d = Math.hypot(dx, dy, dz);
      const dot = (dx * fx + dz * fz) / (Math.hypot(dx, dz) || 1);
      if (d < bestDist && dot > 0.5) { best = i; bestDist = d; }
    }
    state.lockTarget = best;
    for (let i = 0; i < state.enemies.length; i += 1) {
      const e = state.enemies[i];
      if (!e.active) continue;
      const dx = p.x - e.x;
      const dy = p.alt - e.y;
      const dz = p.z - e.z;
      const d = Math.hypot(dx, dy, dz);
      // Chase, a little faster when far so they catch up, never teleport.
      const speed = d > 550 ? 150 : 88 + state.missionIndex * 4;
      const wob = Math.sin(state.time * 1.3 + e.phase) * 14;
      e.x += ((dx / (d || 1)) * speed + Math.cos(e.phase) * wob * 0.2) * dt;
      e.y += clamp(dy / (d || 1) * speed, -30, 30) * dt;
      e.z += (dz / (d || 1)) * speed * dt;
      e.y = Math.max(e.y, heightAt(e.x, e.z) + 18);
      if (e.y > 420) e.y = 420;
      // Fire a slow tracer when close and the lock is not broken.
      e.fireCd -= dt;
      if (e.fireCd <= 0 && d < 340 && state.time > state.enemyLockBrokenUntil) {
        e.fireCd = 2.3 + i * 0.3;
        const lead = 0.4;
        const tx = p.x + Math.sin(p.heading) * p.speed * lead;
        const ty = p.alt + p.vs * lead;
        const tz = p.z - Math.cos(p.heading) * p.speed * lead;
        const sx = tx - e.x;
        const sy = ty - e.y;
        const sz = tz - e.z;
        const len = Math.hypot(sx, sy, sz) || 1;
        state.tracers.push({
          x: e.x, y: e.y, z: e.z,
          vx: (sx / len) * 190, vy: (sy / len) * 190, vz: (sz / len) * 190,
          life: 2.5, max: 2.5, from: 'enemy', dmg: 10,
        });
      }
      // A drone that rams the player is destroyed, and hurts the player.
      if (d < 20) {
        e.active = false;
        state.enemiesDown += 1;
        state.score += 100;
        state.lastEnemyDown = { x: e.x, y: e.y, z: e.z };
        state.damage = Math.min(100, state.damage + 25);
        events |= EVENT_ENEMY_DOWN | EVENT_HIT;
      }
    }
    // Tracers fly straight; enemy shots hurt on contact (unless a Barrel
    // Roll is protecting the plane), cannon shots damage drones.
    for (const t of state.tracers) {
      if (t.life <= 0) continue;
      t.x += t.vx * dt;
      t.y += t.vy * dt;
      t.z += t.vz * dt;
      t.life -= dt;
      if (t.from === 'enemy') {
        const d = Math.hypot(t.x - p.x, t.y - p.alt, t.z - p.z);
        if (d < 15 && state.time > state.protectedUntil) {
          t.life = 0;
          state.damage = Math.min(100, state.damage + t.dmg);
          events |= EVENT_HIT;
        }
      } else {
        for (const e of state.enemies) {
          if (!e.active) continue;
          const d = Math.hypot(t.x - e.x, t.y - e.y, t.z - e.z);
          if (d < 18) {
            t.life = 0;
            e.hp -= t.dmg;
            if (e.hp <= 0) {
              e.active = false;
              state.enemiesDown += 1;
              state.score += 250;
              state.lastEnemyDown = { x: e.x, y: e.y, z: e.z };
              events |= EVENT_ENEMY_DOWN;
            }
            break;
          }
        }
      }
    }
    state.tracers = state.tracers.filter((t) => t.life > 0);
    return events;
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
    if (state.skills.boost.active > 0) targetSpeed = Math.min(190, targetSpeed * 1.45);
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
    // City buildings: flying into one scrapes the jet and damages it.
    for (const b of CITY_BUILDINGS) {
      if (Math.abs(p.x - b.x) < b.w / 2 + 3 && Math.abs(p.z - b.z) < b.d / 2 + 3 && p.alt < b.h + 3) {
        state.damage = Math.min(100, state.damage + 22 * dt);
      }
    }
    // Enemy drones (missions 3-5).
    if (state.missionIndex >= 2) events |= stepEnemies(dt);
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
    placeEnemies, spawnEnemies,
  };
}
