// Sky Letters (3D) — boot and the one loop: input is read every frame,
// the world advances in fixed 1/60 s steps, the renderer paints the 3D
// scene and the DOM HUD is updated. Screens: title, play, paused, crashed
// and complete. ?seed=N fixes the random pattern. ?shot=cover|storm|
// landing|sunset (with &seed=N) stages that scene, paints it twice and
// sets window.__shotReady. ?autoplay=1 flies Mission 1 with a scripted
// pilot and reports the result in #shotinfo for headless testing.
// window.__probe always carries the live plane state for testing, and
// window.__errors collects any page error.
import { STEP } from './config.js';
import { createRandom } from './random.js';
import {
  createWorld, EVENT_RING, EVENT_FUEL, EVENT_DELIVERED, EVENT_CRASH,
} from './world.js';
import { ACTION_CONFIRM, ACTION_PAUSE, ACTION_RESTART, ACTION_MUTE, ACTION_SKILL_BOOST, ACTION_SKILL_ROLL, ACTION_SKILL_FLARE, ACTION_SKILL_GLIDE, createInput } from './input.js';
import { createRenderer } from './render.js';
import { createHud } from './hud.js';
import { createAudio } from './audio.js';
import { stageShot } from './shots.js';
import { heightAt, MISSION_TARGETS } from './islands.js';

const MAX_FRAME = 0.25;
const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const autoplay = params.get('autoplay') === '1';
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const shotInfoEl = document.getElementById('shotinfo');
const world = createWorld(createRandom(seed));
const renderer = createRenderer(canvas, createRandom(seed + 7));
const hud = createHud(world);
const audio = createAudio();
const input = createInput(canvas);

window.__game = { world, renderer };
window.__probe = { mode: 'boot', x: 0, alt: 0, z: 0, heading: 0, speed: 0, letters: 0, score: 0, time: 0 };

let screen = 'title';
let best = 0;
try { best = Number.parseInt(window.localStorage.getItem('sky-letters.best') ?? '0', 10) || 0; } catch { best = 0; }

function saveBest(value) {
  try { window.localStorage.setItem('sky-letters.best', String(value)); } catch { /* storage can be off */ }
}
function announce(message) { status.textContent = message; }
function showOverlay(id) {
  for (const name of ['title-screen', 'pause-screen', 'crash-screen', 'complete-screen']) {
    document.getElementById(name).classList.toggle('hidden', name !== id);
  }
}
function writeShotInfo(extra) {
  const s = world.state;
  const p = s.plane;
  shotInfoEl.textContent = JSON.stringify({
    shot, autoplay, mode: s.mode, screen,
    x: +p.x.toFixed(1), alt: +p.alt.toFixed(1), z: +p.z.toFixed(1),
    heading: +p.heading.toFixed(3), speed: +p.speed.toFixed(1),
    letters: s.letters, delivered: s.deliveredCount, score: s.score,
    mission: s.missionIndex + 1, ringIndex: s.ringIndex,
    rain: renderer.rainOn ? renderer.rainOn() : false,
    errors: (window.__errors || []).length,
    ...extra,
  });
}

function startGame() {
  world.reset();
  renderer.setSky(world.mission().sky);
  renderer.setRain(false);
  screen = 'play';
  showOverlay(null);
  audio.ensure();
  announce('Playing. Letter 1 of 5: For Grandma Sari.');
}
function retryMission() {
  world.retryMission();
  renderer.setSky(world.mission().sky);
  screen = 'play';
  showOverlay(null);
  audio.ensure();
  announce('Flying again.');
}
function endCrash() {
  screen = 'over';
  document.getElementById('crash-reason').textContent = world.state.crashReason;
  showOverlay('crash-screen');
  audio.crash();
  audio.thud();
  renderer.particles.burst(world.state.plane.x, Math.max(2, world.state.plane.alt), world.state.plane.z, 0xffffff, 18, 22, 0.9, 1.4);
  renderer.particles.burst(world.state.plane.x, Math.max(2, world.state.plane.alt), world.state.plane.z, 0x666666, 12, 12, 1.6, 2.2);
  announce(`Crashed. ${world.state.crashReason}`);
}
function endComplete() {
  screen = 'complete';
  document.getElementById('complete-score').textContent = `Score ${world.state.score} — 5 letters delivered`;
  if (world.state.score > best) { best = world.state.score; saveBest(best); }
  showOverlay('complete-screen');
  announce('Every letter finds its sky. Thank you for flying.');
}

// The scripted pilot used by ?autoplay=1: steer at the next target,
// climb or sink to its height, slow down for the landing zone.
function autopilot() {
  const s = world.state;
  const p = s.plane;
  const t = world.nextTarget();
  const dx = t.x - p.x;
  const dz = t.z - p.z;
  const desiredHeading = Math.atan2(dx, -dz);
  let err = desiredHeading - p.heading;
  while (err > Math.PI) err -= Math.PI * 2;
  while (err < -Math.PI) err += Math.PI * 2;
  const roll = Math.max(-1, Math.min(1, err * 1.6));
  const landing = s.ringIndex >= s.rings.length;
  const ground = heightAt(p.x, p.z);
  const targetAlt = landing ? ground + 4 : Math.max(t.y || 60, ground + 28);
  const pitch = Math.max(-1, Math.min(1, (targetAlt - p.alt) / 40));
  const dist = Math.hypot(dx, dz);
  let throttleDelta = 0;
  if (landing && dist < 420) throttleDelta = p.speed > 54 ? -1 : 0.3;
  else throttleDelta = p.speed < 76 ? 0.6 : 0;
  const brake = landing && dist < 260 && p.speed > 56;
  return { pitch, roll, throttleDelta, brake, mouseSteer: 0 };
}

function stepGame() {
  const inputState = autoplay ? autopilot() : {
    pitch: input.pitch(), roll: input.roll(),
    throttleDelta: input.throttleDir(), brake: input.brake(),
    mouseSteer: input.mouseSteer(),
  };
  const events = world.step(STEP, inputState, false);
  if (events & EVENT_RING) {
    audio.ring();
    const r = world.state.rings[world.state.ringIndex - 1];
    if (r) renderer.particles.burst(r.x, r.y, r.z, 0xffc93c, 16, 18, 0.8, 1.2);
  }
  if (events & EVENT_FUEL) audio.fuel();
  if (events & EVENT_DELIVERED) {
    audio.deliver();
    // A water landing splashes as well as fanfares.
    if (MISSION_TARGETS[world.mission().id].land === 'water') audio.splash();
    if (world.state.score > best) { best = world.state.score; saveBest(best); }
  }
  if (events & EVENT_CRASH) endCrash();
  if (world.state.mode === 'complete') endComplete();
}

function handleActions() {
  const actions = input.takeActions();
  if (actions & ACTION_MUTE) audio.setMuted(!audio.isMuted());
  // Pilot skills: fire one per press, with its sound and effect.
  if (screen === 'play' && world.state.mode === 'fly') {
    const skillMap = [
      [ACTION_SKILL_BOOST, 'boost', () => audio.skillBoost()],
      [ACTION_SKILL_ROLL, 'roll', () => audio.skillRoll()],
      [ACTION_SKILL_FLARE, 'flare', () => audio.skillFlare()],
      [ACTION_SKILL_GLIDE, 'glide', () => audio.skillGlide()],
    ];
    for (const [flag, id, sound] of skillMap) {
      if (actions & flag && world.useSkill(id)) {
        sound();
        const p = world.state.plane;
        if (id === 'flare') {
          renderer.particles.burst(p.x, p.alt + 2, p.z, 0xffe9a0, 18, 14, 0.9, 1.6);
        }
        if (id === 'boost') {
          renderer.particles.burst(p.x, p.alt, p.z, 0xffe9a0, 10, 10, 0.5, 1.1);
        }
      }
    }
  }
  if (actions & ACTION_RESTART && (screen === 'play' || screen === 'over')) { retryMission(); return; }
  if (actions & ACTION_PAUSE) {
    if (screen === 'play') { screen = 'paused'; showOverlay('pause-screen'); announce('Paused.'); }
    else if (screen === 'paused') { screen = 'play'; showOverlay(null); announce('Playing.'); }
    return;
  }
  if (actions & ACTION_CONFIRM) {
    if (screen === 'title') { startGame(); return; }
    if (screen === 'over') { retryMission(); return; }
    if (screen === 'complete') { startGame(); return; }
    if (screen === 'paused') { screen = 'play'; showOverlay(null); return; }
    if (world.state.dialogue) {
      audio.click();
      audio.blip();
      world.advanceDialogue();
      renderer.setSky(world.mission().sky);
    }
  }
}

function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min((now - last) / 1000, MAX_FRAME);
  last = now;
  handleActions();
  if (screen === 'play') {
    accumulator += dt;
    while (accumulator >= STEP) {
      stepGame();
      accumulator -= STEP;
      if (screen !== 'play') break;
    }
  } else if (screen === 'title') {
    // A slow, gentle title backdrop: the plane waits over Home Bay.
    world.state.plane.prop += STEP * 8;
  }
  if (autoplay) {
    if (world.state.dialogue && world.state.mode === 'dialogue') {
      autoDialogueTimer += dt;
      if (autoDialogueTimer > 0.6) { autoDialogueTimer = 0; world.advanceDialogue(); }
    }
    if (world.state.letters >= 1 && !autoDone) {
      autoDone = true;
      document.title = `AUTOPLAY-DONE letters=${world.state.letters} score=${world.state.score}`;
      writeShotInfo({ autoplayDone: true });
    }
  }
  const s = world.state;
  renderer.setSky(s.missionIndex >= 0 ? world.mission().sky : 'day');
  renderer.setRain(world.mission().sky === 'dusk' && screen === 'play');
  renderer.draw(s, s.time);
  hud.update(s);
  // Layered sound mix follows the flight; the stall alarm beeps while stalled.
  audio.update({
    throttle: s.plane.throttle, speed: s.plane.speed, alt: s.plane.alt,
    rain: world.mission().sky === 'dusk' && screen === 'play',
  });
  if (s.stalled && s.mode === 'fly' && screen === 'play') audio.alarm();
  const p = s.plane;
  window.__probe = {
    mode: s.mode, screen, x: +p.x.toFixed(1), alt: +p.alt.toFixed(1), z: +p.z.toFixed(1),
    heading: +p.heading.toFixed(3), speed: +p.speed.toFixed(1),
    letters: s.letters, score: s.score, time: +s.time.toFixed(1),
    errors: (window.__errors || []).length,
  };
  writeShotInfo({});
}

let last = performance.now();
let accumulator = 0;
let autoDialogueTimer = 0;
let autoDone = false;

document.getElementById('start-btn').addEventListener('click', () => { audio.ensure(); startGame(); });
document.getElementById('retry-btn').addEventListener('click', () => retryMission());
document.getElementById('again-btn').addEventListener('click', () => startGame());

function runShot(name) {
  const staged = stageShot(name, world);
  renderer.setSky(staged.sky);
  renderer.snapCamera(world.state);
  renderer.setRain(staged.rain);
  screen = 'play';
  showOverlay(null);
  let painted = 0;
  function paint() {
    const s = world.state;
    renderer.draw(s, s.time + painted * 0.05);
    hud.update(s);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else {
      window.__shotReady = true;
      document.title = 'SHOT-READY';
      writeShotInfo({ ready: true, sky: staged.sky });
    }
  }
  requestAnimationFrame(paint);
}

if (shot) runShot(shot);
else {
  showOverlay('title-screen');
  announce('Sky Letters. Press Enter or click Start to fly.');
  requestAnimationFrame(frame);
}
