// Sky Letters (3D) — anime-style character portraits, drawn in canvas only.
// Original characters: Nara (19, pilot, red scarf, brown bun), Grandma Sari
// (silver hair, warm smile), Mika (12, freckles, lighthouse cap), Budi and
// Agus (fishermen brothers, one with a moustache, one with a beard).
// drawPortrait(ctx, who, x, y, size, mood) paints a bust portrait.
function face(ctx, x, y, s, skin, hair, hairStyle, extra) {
  ctx.save(); ctx.translate(x, y);
  ctx.fillStyle = hair;
  ctx.beginPath(); ctx.ellipse(0, -0.34 * s, 0.46 * s, 0.42 * s, 0, 0, Math.PI * 2); ctx.fill();
  if (hairStyle === 'bun') {
    ctx.beginPath(); ctx.arc(0, -0.78 * s, 0.2 * s, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#d93b2b'; ctx.fillRect(-0.22 * s, -0.82 * s, 0.44 * s, 0.07 * s);
  } else if (hairStyle === 'silver') {
    ctx.beginPath(); ctx.ellipse(0, -0.3 * s, 0.48 * s, 0.3 * s, 0, Math.PI, 0); ctx.fill();
  } else if (hairStyle === 'cap') {
    ctx.fillStyle = '#2f6fb2'; ctx.beginPath(); ctx.ellipse(0, -0.52 * s, 0.47 * s, 0.22 * s, 0, Math.PI, 0); ctx.fill();
    ctx.fillRect(-0.47 * s, -0.56 * s, 0.94 * s, 0.1 * s);
  }
  ctx.fillStyle = skin;
  ctx.beginPath(); ctx.ellipse(0, -0.08 * s, 0.36 * s, 0.42 * s, 0, 0, Math.PI * 2); ctx.fill();
  const eyeY = -0.12 * s;
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.ellipse(-0.14 * s, eyeY, 0.085 * s, 0.11 * s, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(0.14 * s, eyeY, 0.085 * s, 0.11 * s, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#3a2a1c';
  ctx.beginPath(); ctx.arc(-0.14 * s, eyeY + 0.01 * s, 0.045 * s, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(0.14 * s, eyeY + 0.01 * s, 0.045 * s, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.arc(-0.125 * s, eyeY - 0.03 * s, 0.016 * s, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(0.155 * s, eyeY - 0.03 * s, 0.016 * s, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(255,120,120,0.45)';
  ctx.beginPath(); ctx.ellipse(-0.24 * s, 0.06 * s, 0.07 * s, 0.04 * s, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(0.24 * s, 0.06 * s, 0.07 * s, 0.04 * s, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = hair; ctx.lineWidth = 0.03 * s; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(-0.2 * s, -0.28 * s); ctx.lineTo(-0.08 * s, -0.28 * s); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0.08 * s, -0.28 * s); ctx.lineTo(0.2 * s, -0.28 * s); ctx.stroke();
  ctx.strokeStyle = '#c98a5a'; ctx.lineWidth = 0.025 * s;
  ctx.beginPath(); ctx.moveTo(0, 0.0 * s); ctx.lineTo(-0.03 * s, 0.08 * s); ctx.stroke();
  ctx.strokeStyle = '#a34d2d'; ctx.lineWidth = 0.035 * s;
  ctx.beginPath(); ctx.arc(0, 0.12 * s, 0.12 * s, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke();
  if (extra) extra(ctx, s);
  ctx.restore();
}
function shoulders(ctx, s, shirt, scarf) {
  ctx.fillStyle = shirt;
  ctx.beginPath(); ctx.moveTo(-0.5 * s, 0.95 * s);
  ctx.quadraticCurveTo(-0.48 * s, 0.42 * s, -0.2 * s, 0.36 * s);
  ctx.lineTo(0.2 * s, 0.36 * s);
  ctx.quadraticCurveTo(0.48 * s, 0.42 * s, 0.5 * s, 0.95 * s);
  ctx.closePath(); ctx.fill();
  if (scarf) {
    ctx.fillStyle = '#d93b2b';
    ctx.beginPath(); ctx.moveTo(-0.2 * s, 0.34 * s); ctx.lineTo(0.2 * s, 0.34 * s);
    ctx.lineTo(0.16 * s, 0.52 * s); ctx.lineTo(-0.16 * s, 0.52 * s); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(0.1 * s, 0.44 * s); ctx.quadraticCurveTo(0.42 * s, 0.5 * s, 0.55 * s, 0.78 * s);
    ctx.lineTo(0.44 * s, 0.84 * s); ctx.quadraticCurveTo(0.28 * s, 0.6 * s, 0.08 * s, 0.54 * s); ctx.closePath(); ctx.fill();
  }
}
export function drawPortrait(ctx, who, x, y, size, mood) {
  const s = size;
  ctx.save();
  ctx.beginPath(); ctx.arc(x, y, 0.52 * s, 0, Math.PI * 2); ctx.clip();
  ctx.fillStyle = who === 'sari' ? '#ffe9c4' : who === 'mika' ? '#bfe8f2' : '#ffd9a0';
  ctx.fillRect(x - s, y - s, 2 * s, 2 * s);
  ctx.translate(x, y + 0.08 * s);
  if (who === 'nara') {
    shoulders(ctx, s, '#ff7a2f', true);
    face(ctx, 0, 0, s, '#f7c9a0', '#6b4423', 'bun');
  } else if (who === 'sari') {
    shoulders(ctx, s, '#7a5a8f', false);
    face(ctx, 0, 0, s, '#f2c49b', '#e8e4da', 'silver', (c, ss) => {
      c.strokeStyle = '#8a8a8a'; c.lineWidth = 0.02 * ss;
      c.beginPath(); c.moveTo(-0.28 * ss, -0.02 * ss); c.lineTo(-0.2 * ss, 0.02 * ss); c.stroke();
      c.beginPath(); c.moveTo(0.28 * ss, -0.02 * ss); c.lineTo(0.2 * ss, 0.02 * ss); c.stroke();
    });
  } else if (who === 'mika') {
    shoulders(ctx, s, '#2f6fb2', false);
    face(ctx, 0, 0, s, '#f7c9a0', '#3a2a1c', 'cap', (c, ss) => {
      c.fillStyle = '#c98a5a';
      c.beginPath(); c.arc(-0.2 * ss, 0.05 * ss, 0.02 * ss, 0, Math.PI * 2); c.fill();
      c.beginPath(); c.arc(-0.13 * ss, 0.08 * ss, 0.02 * ss, 0, Math.PI * 2); c.fill();
      c.beginPath(); c.arc(0.18 * ss, 0.06 * ss, 0.02 * ss, 0, Math.PI * 2); c.fill();
    });
  } else if (who === 'budi') {
    shoulders(ctx, s, '#2f8f4e', false);
    face(ctx, 0, 0, s, '#e8b088', '#2a2a2a', 'none', (c, ss) => {
      c.fillStyle = '#2a2a2a';
      c.beginPath(); c.ellipse(0, 0.3 * ss, 0.16 * ss, 0.07 * ss, 0, 0, Math.PI); c.fill();
    });
  } else { // agus
    shoulders(ctx, s, '#3a6ea8', false);
    face(ctx, 0, 0, s, '#e8b088', '#4a4a4a', 'none', (c, ss) => {
      c.fillStyle = '#4a4a4a';
      c.beginPath(); c.ellipse(0, 0.32 * ss, 0.2 * ss, 0.12 * ss, 0, 0, Math.PI); c.fill();
    });
  }
  ctx.restore();
  ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.arc(x, y, 0.52 * s, 0, Math.PI * 2); ctx.stroke();
  if (mood === 'sad') {
    ctx.fillStyle = 'rgba(90,120,200,0.25)';
    ctx.beginPath(); ctx.arc(x, y, 0.52 * s, 0, Math.PI * 2); ctx.fill();
  }
}
export const CHARACTER_NAMES = {
  nara: 'Nara — Pilot, 19', sari: 'Grandma Sari', mika: 'Mika, 12',
  budi: 'Pak Budi', agus: 'Pak Agus',
};
