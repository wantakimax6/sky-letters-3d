// Sky Letters (3D) — the HUD is a DOM overlay on top of the WebGL canvas,
// so text stays crisp and no cloud, ring or island can ever cover it.
// Top-left: ALT/SPD/HDG. Top-centre: compass strip. Top-right: objective.
// Sides: throttle and fuel bars. Bottom-left: artificial horizon.
// Bottom-right: Pipit condition. Bottom-centre: the dialogue panel,
// deliberately narrow so it never covers the horizon or condition gauges.
// Above it, the four pilot skills with their keys and cooldown bars.
// Bottom-right above the condition panel: a heading-up radar. Top-right
// below the objective: a minimap of the local archipelago; N (or the
// FULL MAP button) opens the big archipelago map overlay.
import { drawPortrait, CHARACTER_NAMES } from './characters.js';
import { SKILLS } from './config.js';
import { ISLANDS } from './islands.js';

const MAP_BOUNDS = { x0: -1450, x1: 1450, z0: -5300, z1: 250 };

function headingDeg(heading) {
  return Math.round((((heading * 180) / Math.PI) % 360) + 360) % 360;
}
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

export function createHud(world) {
  const $ = (id) => document.getElementById(id);
  const el = {
    alt: $('hud-alt'), spd: $('hud-spd'), hdg: $('hud-hdg'),
    compass: $('hud-compass'), horizon: $('hud-horizon'),
    thr: $('hud-thr-fill'), thrPct: $('hud-thr-pct'),
    fuel: $('hud-fuel-fill'), fuelPct: $('hud-fuel-pct'),
    objTitle: $('hud-objective'), objSub: $('hud-objective-sub'),
    letters: $('hud-letters'), hearts: $('hud-hearts'),
    cond: $('hud-condition-fill'), score: $('hud-score'), warn: $('hud-warn'),
    timer: $('hud-timer'),
    dialogue: $('dialogue'), dlgPortrait: $('dlg-portrait'),
    dlgName: $('dlg-name'), dlgText: $('dlg-text'),
    skillFlash: $('hud-skill-flash'),
    lock: $('hud-lock'),
    enemies: $('hud-enemies'),
    radar: $('hud-radar'),
    minimap: $('hud-minimap'),
    mapBig: $('map-big'),
    mapOverlay: $('map-overlay'),
    vpadThr: $('vpad-thr-fill'),
    vpadSkills: {
      boost: $('vpad-skill-boost'), roll: $('vpad-skill-roll'),
      flare: $('vpad-skill-flare'), glide: $('vpad-skill-glide'),
      cannon: $('vpad-skill-cannon'),
    },
    skills: {
      boost: { box: $('skill-boost'), fill: $('skill-boost-fill') },
      roll: { box: $('skill-roll'), fill: $('skill-roll-fill') },
      flare: { box: $('skill-flare'), fill: $('skill-flare-fill') },
      glide: { box: $('skill-glide'), fill: $('skill-glide-fill') },
      cannon: { box: $('skill-cannon'), fill: $('skill-cannon-fill') },
    },
  };
  const compassCtx = el.compass.getContext('2d');
  const horizonCtx = el.horizon.getContext('2d');
  const portraitCtx = el.dlgPortrait.getContext('2d');
  const radarCtx = el.radar ? el.radar.getContext('2d') : null;
  const minimapCtx = el.minimap ? el.minimap.getContext('2d') : null;
  const mapBigCtx = el.mapBig ? el.mapBig.getContext('2d') : null;

  // Heading-up radar: the player is the white triangle in the middle,
  // always pointing up; the world turns under it. Range 700 m.
  function drawRadar(state) {
    if (!radarCtx) return;
    const s = el.radar.width;
    const ctx = radarCtx;
    const cx = s / 2, cy = s / 2, R = 58, range = 700;
    const p = state.plane;
    ctx.clearRect(0, 0, s, s);
    ctx.fillStyle = 'rgba(8, 24, 20, 0.6)';
    ctx.beginPath(); ctx.arc(cx, cy, R + 6, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(cx, cy, R / 2, 0, Math.PI * 2); ctx.stroke();
    const k = R / range;
    const cos = Math.cos(p.heading), sin = Math.sin(p.heading);
    const proj = (x, z) => {
      const dx = x - p.x, dz = z - p.z;
      return [cx + (dx * cos + dz * sin) * k, cy - (dx * sin - dz * cos) * k];
    };
    for (const isl of ISLANDS) {
      const [bx, by] = proj(isl.x, isl.z);
      if (Math.hypot(bx - cx, by - cy) > R) continue;
      ctx.fillStyle = isl.id === 'city' ? '#ffc93c' : 'rgba(120, 220, 130, 0.85)';
      ctx.beginPath(); ctx.arc(bx, by, isl.id === 'city' ? 3.5 : 2, 0, Math.PI * 2); ctx.fill();
    }
    const t = world.nextTarget();
    const [tx, ty] = proj(t.x, t.z);
    const td = Math.hypot(tx - cx, ty - cy);
    const tcx = td > R ? cx + (tx - cx) / td * (R - 4) : tx;
    const tcy = td > R ? cy + (ty - cy) / td * (R - 4) : ty;
    ctx.fillStyle = '#ffd94d';
    ctx.save(); ctx.translate(tcx, tcy); ctx.rotate(Math.PI / 4); ctx.fillRect(-3, -3, 6, 6); ctx.restore();
    for (const e of (state.enemies || [])) {
      if (!e.active) continue;
      const [ex, ey] = proj(e.x, e.z);
      if (Math.hypot(ex - cx, ey - cy) > R) continue;
      ctx.fillStyle = '#ff5a4d';
      ctx.beginPath(); ctx.arc(ex, ey, 3, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = '#ffd94d';
    ctx.font = 'bold 11px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('N', cx - Math.sin(p.heading) * (R + 2), cy - Math.cos(p.heading) * (R + 2));
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.moveTo(cx, cy - 6); ctx.lineTo(cx + 5, cy + 5); ctx.lineTo(cx - 5, cy + 5); ctx.closePath(); ctx.fill();
  }

  // Archipelago map, north-up. 'mini' is a local 2400 x 1800 m window
  // around the player; 'big' is the whole archipelago with labels.
  function drawMap(ctx, w, h, state, mode) {
    if (!ctx) return;
    const p = state.plane;
    let x0, x1, z0, z1;
    if (mode === 'mini') { x0 = p.x - 1200; x1 = p.x + 1200; z0 = p.z - 900; z1 = p.z + 900; }
    else { x0 = MAP_BOUNDS.x0; x1 = MAP_BOUNDS.x1; z0 = MAP_BOUNDS.z0; z1 = MAP_BOUNDS.z1; }
    const kx = w / (x1 - x0), kz = h / (z1 - z0);
    const sx = (x) => (x - x0) * kx;
    const sz = (z) => (z - z0) * kz;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = mode === 'mini' ? '#14586b' : '#123f52';
    ctx.fillRect(0, 0, w, h);
    for (const isl of ISLANDS) {
      const cx = sx(isl.x), cy = sz(isl.z);
      const rx = Math.max(1.5, isl.r * kx), ry = Math.max(1.5, isl.r * kz);
      if (cx < -rx || cx > w + rx || cy < -ry || cy > h + ry) continue;
      ctx.fillStyle = isl.id === 'city' ? '#c9a35a' : '#4f9e57';
      ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2); ctx.fill();
    }
    const rings = state.rings || [];
    for (let i = state.ringIndex || 0; i < rings.length; i += 1) {
      const r = rings[i];
      const cx = sx(r.x), cy = sz(r.z);
      if (cx < 0 || cx > w || cy < 0 || cy > h) continue;
      ctx.fillStyle = '#ffd94d';
      ctx.beginPath(); ctx.arc(cx, cy, mode === 'mini' ? 2.5 : 3, 0, Math.PI * 2); ctx.fill();
    }
    const t = world.nextTarget();
    let tx = sx(t.x), ty = sz(t.z);
    if (mode === 'mini') { tx = clamp(tx, 8, w - 8); ty = clamp(ty, 8, h - 8); }
    ctx.strokeStyle = '#ffd94d';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(tx, ty, 6, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#ffd94d';
    ctx.beginPath(); ctx.arc(tx, ty, 2.5, 0, Math.PI * 2); ctx.fill();
    for (const e of (state.enemies || [])) {
      if (!e.active) continue;
      const ex = sx(e.x), ey = sz(e.z);
      if (ex < 0 || ex > w || ey < 0 || ey > h) continue;
      ctx.fillStyle = '#ff5a4d';
      ctx.beginPath(); ctx.arc(ex, ey, 3, 0, Math.PI * 2); ctx.fill();
    }
    const px = sx(p.x), py = sz(p.z);
    ctx.fillStyle = '#fff';
    ctx.save(); ctx.translate(px, py); ctx.rotate(p.heading);
    ctx.beginPath(); ctx.moveTo(0, -7); ctx.lineTo(5, 6); ctx.lineTo(-5, 6); ctx.closePath(); ctx.fill();
    ctx.restore();
    if (mode === 'big') {
      ctx.font = 'bold 11px system-ui, sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'bottom';
      const named = ['city', 'home', 'lighthouse', 'memorial', 'mountain', 'volcano', 'senja'];
      for (const isl of ISLANDS) {
        if (!named.includes(isl.id)) continue;
        const cx = sx(isl.x), cy = sz(isl.z);
        ctx.fillStyle = 'rgba(0,0,0,0.55)';
        ctx.fillText(isl.name, cx + 7, cy - 5);
        ctx.fillStyle = '#fff';
        ctx.fillText(isl.name, cx + 6, cy - 6);
      }
      ctx.fillStyle = '#ffd94d';
      ctx.font = 'bold 12px system-ui, sans-serif';
      ctx.fillText('Next: ' + t.label, Math.max(6, Math.min(w - 180, tx + 10)), Math.max(16, ty - 10));
    }
  }

  function drawCompass(heading) {
    const w = el.compass.width;
    const h = el.compass.height;
    const ctx = compassCtx;
    ctx.clearRect(0, 0, w, h);
    const deg = headingDeg(heading);
    const pxPerDeg = w / 120;
    ctx.fillStyle = 'rgba(20,18,30,0.72)';
    ctx.fillRect(0, 0, w, h);
    ctx.font = 'bold 13px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    // Step through ABSOLUTE headings, so a major label (N, 45, E, ...) is
    // always drawn whatever the heading is — stepping relative to the
    // heading made the labels vanish for most headings.
    const first = Math.floor((deg - 60) / 5) * 5;
    for (let a = first; a <= deg + 60; a += 5) {
      const an = ((a % 360) + 360) % 360;
      const x = w / 2 + (a - deg) * pxPerDeg;
      const major = an % 45 === 0;
      ctx.strokeStyle = major ? '#ffd94d' : 'rgba(255,255,255,0.6)';
      ctx.lineWidth = major ? 2 : 1;
      ctx.beginPath();
      ctx.moveTo(x, 8);
      ctx.lineTo(x, major ? 26 : 18);
      ctx.stroke();
      if (major) {
        const label = an === 0 ? 'N' : an === 90 ? 'E' : an === 180 ? 'S' : an === 270 ? 'W' : String(an);
        ctx.fillStyle = an === 0 ? '#ffd94d' : '#fff';
        ctx.fillText(label, x, 42);
      }
    }
    ctx.fillStyle = '#ffd94d';
    ctx.beginPath();
    ctx.moveTo(w / 2 - 7, 0); ctx.lineTo(w / 2 + 7, 0); ctx.lineTo(w / 2, 9); ctx.closePath();
    ctx.fill();
  }
  function drawHorizon(pitch, bank) {
    const s = el.horizon.width;
    const ctx = horizonCtx;
    ctx.clearRect(0, 0, s, s);
    ctx.save();
    ctx.beginPath(); ctx.arc(s / 2, s / 2, s / 2 - 2, 0, Math.PI * 2); ctx.clip();
    ctx.translate(s / 2, s / 2);
    ctx.rotate(-bank);
    ctx.translate(0, pitch * 70);
    ctx.fillStyle = '#7ec8e8';
    ctx.fillRect(-s, -s, s * 2, s);
    ctx.fillStyle = '#8a6a45';
    ctx.fillRect(-s, 0, s * 2, s);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-s, 0); ctx.lineTo(s, 0); ctx.stroke();
    ctx.restore();
    ctx.strokeStyle = '#ffd94d';
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(s / 2 - 26, s / 2); ctx.lineTo(s / 2 - 8, s / 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(s / 2 + 8, s / 2); ctx.lineTo(s / 2 + 26, s / 2); ctx.stroke();
    ctx.fillStyle = '#ffd94d';
    ctx.beginPath(); ctx.arc(s / 2, s / 2, 4, 0, Math.PI * 2); ctx.fill();
  }

  function showDialogue(state) {
    const d = state.dialogue;
    if (!d) { el.dialogue.classList.add('hidden'); return; }
    const line = d.lines[state.dialogueIndex] || d.lines[0];
    el.dialogue.classList.remove('hidden');
    el.dlgName.textContent = CHARACTER_NAMES[line.who] || line.who;
    el.dlgText.textContent = line.text;
    portraitCtx.clearRect(0, 0, el.dlgPortrait.width, el.dlgPortrait.height);
    drawPortrait(portraitCtx, line.who, 46, 46, 84, d.kind === 'deliver' ? 'happy' : 'normal');
  }

  function update(state) {
    const p = state.plane;
    const m = world.mission();
    el.alt.textContent = `${Math.round(p.alt * 8)} ft`;
    el.spd.textContent = `${Math.round(p.speed)} kt`;
    el.hdg.textContent = `${String(headingDeg(p.heading)).padStart(3, '0')}°`;
    drawCompass(p.heading);
    drawHorizon(p.pitch, p.bank);
    drawRadar(state);
    drawMap(minimapCtx, el.minimap.width, el.minimap.height, state, 'mini');
    if (el.mapOverlay && !el.mapOverlay.classList.contains('hidden')) {
      drawMap(mapBigCtx, el.mapBig.width, el.mapBig.height, state, 'big');
    }
    el.thr.style.height = `${Math.round(p.throttle * 100)}%`;
    el.thrPct.textContent = `${Math.round(p.throttle * 100)}%`;
    if (el.vpadThr) el.vpadThr.style.height = `${Math.round(p.throttle * 100)}%`;
    // On compact screens the fuel bar is horizontal under the objective.
    if (document.body.classList.contains('compact')) {
      el.fuel.style.width = `${Math.round(state.fuel)}%`;
      el.fuel.style.height = '100%';
    } else {
      el.fuel.style.height = `${Math.round(state.fuel)}%`;
      el.fuel.style.width = '';
    }
    el.fuelPct.textContent = `${Math.round(state.fuel)}%`;
    el.fuel.style.background = state.fuel < 25 ? '#ff5a4d' : '#39d97e';
    el.objTitle.textContent = `LETTER ${m.id} OF 5 — ${m.name}`;
    const t = world.nextTarget();
    el.objSub.textContent = `${t.label} — ${Math.round(world.distanceToTarget())} m ahead`;
    el.letters.textContent = `Letters delivered: ${state.deliveredCount} / 5`;
    el.hearts.textContent = '♥'.repeat(Math.max(0, state.hearts)) + '♡'.repeat(Math.max(0, 5 - state.hearts));
    el.cond.style.width = `${Math.max(0, 100 - state.damage)}%`;
    el.cond.style.background = state.damage > 60 ? '#ff5a4d' : '#39d97e';
    el.score.textContent = `Score ${state.score}`;
    // Pilot skills: cooldown bars fill as the skill recharges; a firing
    // skill shows gold, a cooling one orange, a ready one green. The
    // virtual pad buttons mirror the same state.
    for (const def of SKILLS) {
      const sk = state.skills[def.id];
      const ui = el.skills[def.id];
      if (!sk || !ui) continue;
      const ready = sk.active > 0 ? 1 : 1 - sk.cd / def.cooldown;
      ui.fill.style.width = `${Math.round(Math.max(0, Math.min(1, ready)) * 100)}%`;
      ui.box.classList.toggle('active', sk.active > 0);
      ui.box.classList.toggle('cooling', sk.active <= 0 && sk.cd > 0);
      const vbtn = el.vpadSkills[def.id];
      if (vbtn) {
        vbtn.classList.toggle('active', sk.active > 0);
        vbtn.classList.toggle('cooling', sk.active <= 0 && sk.cd > 0);
      }
    }
    if (state.skillFlash && state.time < state.skillFlash.until) {
      el.skillFlash.textContent = state.skillFlash.text;
      el.skillFlash.classList.remove('hidden');
    } else {
      el.skillFlash.classList.add('hidden');
    }
    // Lock-on: the cannon has a drone in its sights.
    const live = (state.enemies || []).filter((e) => e.active).length;
    if (state.lockTarget >= 0 && state.mode === 'fly' && live > 0) {
      el.lock.textContent = '◈ LOCKED — ENEMY DRONE';
      el.lock.classList.remove('hidden');
    } else {
      el.lock.classList.add('hidden');
    }
    if (live > 0 && state.mode === 'fly') {
      el.enemies.textContent = `Hostiles: ${live} drone${live === 1 ? '' : 's'} — press 5 / C to fire the cannon`;
      el.enemies.classList.remove('hidden');
    } else {
      el.enemies.classList.add('hidden');
    }
    if (m.timeLimit > 0 && state.mode === 'fly') {
      el.timer.textContent = `Time left ${Math.max(0, Math.ceil(m.timeLimit - state.missionTime))} s`;
      el.timer.classList.remove('hidden');
    } else {
      el.timer.classList.add('hidden');
    }
    if (state.stalled && state.mode === 'fly') {
      el.warn.textContent = 'STALL — PUSH THE NOSE DOWN, ADD THROTTLE';
      el.warn.classList.remove('hidden');
    } else if (state.fuel < 25 && state.fuel > 0 && state.mode === 'fly') {
      el.warn.textContent = 'LOW FUEL — FLY THROUGH A GREEN RING';
      el.warn.classList.remove('hidden');
    } else {
      el.warn.classList.add('hidden');
    }
    showDialogue(state);
  }
  return { update, showDialogue, headingDeg };
}
