// Sky Letters (3D) — the HUD is a DOM overlay on top of the WebGL canvas,
// so text stays crisp and no cloud, ring or island can ever cover it.
// Top-left: ALT/SPD/HDG. Top-centre: compass strip. Top-right: objective.
// Sides: throttle and fuel bars. Bottom-left: artificial horizon.
// Bottom-right: Pipit condition. Bottom-centre: the dialogue panel,
// deliberately narrow so it never covers the horizon or condition gauges.
// Above it, the four pilot skills with their keys and cooldown bars.
import { drawPortrait, CHARACTER_NAMES } from './characters.js';
import { SKILLS } from './config.js';

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
    skills: {
      boost: { box: $('skill-boost'), fill: $('skill-boost-fill') },
      roll: { box: $('skill-roll'), fill: $('skill-roll-fill') },
      flare: { box: $('skill-flare'), fill: $('skill-flare-fill') },
      glide: { box: $('skill-glide'), fill: $('skill-glide-fill') },
    },
  };
  const compassCtx = el.compass.getContext('2d');
  const horizonCtx = el.horizon.getContext('2d');
  const portraitCtx = el.dlgPortrait.getContext('2d');

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
    el.thr.style.height = `${Math.round(p.throttle * 100)}%`;
    el.thrPct.textContent = `${Math.round(p.throttle * 100)}%`;
    el.fuel.style.height = `${Math.round(state.fuel)}%`;
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
    // skill shows gold, a cooling one orange, a ready one green.
    for (const def of SKILLS) {
      const sk = state.skills[def.id];
      const ui = el.skills[def.id];
      if (!sk || !ui) continue;
      const ready = sk.active > 0 ? 1 : 1 - sk.cd / def.cooldown;
      ui.fill.style.width = `${Math.round(Math.max(0, Math.min(1, ready)) * 100)}%`;
      ui.box.classList.toggle('active', sk.active > 0);
      ui.box.classList.toggle('cooling', sk.active <= 0 && sk.cd > 0);
    }
    if (state.skillFlash && state.time < state.skillFlash.until) {
      el.skillFlash.textContent = state.skillFlash.text;
      el.skillFlash.classList.remove('hidden');
    } else {
      el.skillFlash.classList.add('hidden');
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
