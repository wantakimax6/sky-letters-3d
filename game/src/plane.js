// Sky Letters (3D) — Pipit, the fighter jet. Nara flies her late
// mother's decommissioned fighter jet, repainted as a letter courier:
// a sleek pointed nose, tinted bubble canopy, swept-back wings, twin
// canted tail fins, air intakes, an afterburner flame that grows with
// throttle, and retractable landing gear. Built only from Three.js
// geometry, two-tone grey and orange, with thin dark panel lines and
// Nara's red scarf as a small ribbon on the tail fin.
// Forward is +z; heading 0 faces north (+z).
export function buildPlane(tex) {
  const T = tex || {};
  const env = T.envMap || null;
  // Realistic metal: the procedural panel/rivet/weathering texture as
  // the colour map, metalness for the sheen, and the sky cubemap for
  // reflections — without an environment, standard materials go flat.
  const grey = new THREE.MeshStandardMaterial({
    map: T.jetMetal || null, color: T.jetMetal ? 0xffffff : 0x8a94a6,
    metalness: 0.72, roughness: 0.42, envMap: env, envMapIntensity: 0.8,
  });
  const greyDark = new THREE.MeshStandardMaterial({
    map: T.jetDetail || T.jetMetal || null,
    color: T.jetDetail ? 0xd8dce2 : T.jetMetal ? 0x9aa0ab : 0x5a6474,
    metalness: 0.7, roughness: 0.5, envMap: env, envMapIntensity: 0.7,
  });
  const wingMat = new THREE.MeshStandardMaterial({
    map: T.jetWing || T.jetMetal || null, color: T.jetWing ? 0xffffff : 0x8a94a6,
    metalness: 0.7, roughness: 0.4, envMap: env, envMapIntensity: 0.8,
  });
  const orange = new THREE.MeshStandardMaterial({ color: 0xf96a12, metalness: 0.4, roughness: 0.45, envMap: env, envMapIntensity: 0.6 });
  const red = new THREE.MeshStandardMaterial({ color: 0xd93b2b, metalness: 0.3, roughness: 0.5 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x23232c, metalness: 0.6, roughness: 0.5 });
  const glass = new THREE.MeshStandardMaterial({
    color: 0x2a5a7a, metalness: 0.95, roughness: 0.08, envMap: env, envMapIntensity: 1.6,
    transparent: true, opacity: 0.92,
  });
  const lineMat = new THREE.MeshBasicMaterial({ color: 0x2a2f3a });

  const group = new THREE.Group();
  group.rotation.order = 'YXZ';

  function add(geo, mat, x, y, z, rx, ry, rz) {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    if (rx) m.rotation.x = rx;
    if (ry) m.rotation.y = ry;
    if (rz) m.rotation.z = rz;
    group.add(m);
    return m;
  }

  // Fuselage: long slim body, pointed nose cone, tapered tail.
  add(new THREE.CylinderGeometry(0.95, 0.8, 9.5, 14), grey, 0, 0, 0, Math.PI / 2, 0, 0);
  add(new THREE.ConeGeometry(0.95, 4.2, 14), greyDark, 0, 0, 6.8, Math.PI / 2, 0, 0);
  add(new THREE.ConeGeometry(0.8, 2.8, 14), greyDark, 0, 0, -6.1, -Math.PI / 2, 0, 0);
  // Nose tip in orange, like a letter seal.
  add(new THREE.ConeGeometry(0.32, 1.1, 10), orange, 0, 0, 9.3, Math.PI / 2, 0, 0);
  // Panel lines: thin dark strips along the fuselage, so the grey body
  // reads as built metal instead of a flat tube.
  add(new THREE.BoxGeometry(0.06, 0.1, 8.6), lineMat, -0.92, 0.28, 0.2, 0, 0, 0);
  add(new THREE.BoxGeometry(0.06, 0.1, 8.6), lineMat, 0.92, 0.28, 0.2, 0, 0, 0);
  add(new THREE.BoxGeometry(1.5, 0.06, 0.1), lineMat, 0, 0.98, 2.6, 0, 0, 0);
  add(new THREE.BoxGeometry(1.5, 0.06, 0.1), lineMat, 0, 0.92, -2.4, 0, 0, 0);
  // Bubble canopy: tinted, glossy, stretched over the cockpit.
  const canopy = add(new THREE.SphereGeometry(1.05, 18, 12), glass, 0, 0.95, 2.2, 0, 0, 0);
  canopy.scale.set(0.85, 0.7, 1.7);
  // Air intakes under the fuselage sides, ahead of the wings.
  add(new THREE.BoxGeometry(0.9, 0.9, 3.4), greyDark, -1.25, -0.55, 1.4, 0, 0, 0);
  add(new THREE.BoxGeometry(0.9, 0.9, 3.4), greyDark, 1.25, -0.55, 1.4, 0, 0, 0);
  add(new THREE.BoxGeometry(0.94, 0.5, 2.2), dark, -1.25, -0.55, 3.1, 0, 0, 0);
  add(new THREE.BoxGeometry(0.94, 0.5, 2.2), dark, 1.25, -0.55, 3.1, 0, 0, 0);
  // Swept-back main wings: long thin boxes angled back, orange tips.
  // The sweep sign matters: the outer end must sit toward the tail
  // (negative z), or the tips float detached from the wing.
  add(new THREE.BoxGeometry(8.6, 0.22, 2.6), wingMat, -4.6, 0.35, -0.6, 0, -0.55, 0);
  add(new THREE.BoxGeometry(8.6, 0.22, 2.6), wingMat, 4.6, 0.35, -0.6, 0, 0.55, 0);
  add(new THREE.BoxGeometry(1.7, 0.24, 2.2), orange, -8.3, 0.35, -2.4, 0, -0.55, 0);
  add(new THREE.BoxGeometry(1.7, 0.24, 2.2), orange, 8.3, 0.35, -2.4, 0, 0.55, 0);
  // Tailplanes, smaller and swept the same way.
  add(new THREE.BoxGeometry(3.6, 0.18, 1.6), grey, -2.4, 0.3, -5.2, 0, -0.5, 0);
  add(new THREE.BoxGeometry(3.6, 0.18, 1.6), grey, 2.4, 0.3, -5.2, 0, 0.5, 0);
  // Twin tail fins, canted outward, orange tips.
  add(new THREE.BoxGeometry(0.22, 3.2, 2.4), greyDark, -1.15, 1.7, -5.4, 0, 0, 0.28);
  add(new THREE.BoxGeometry(0.22, 3.2, 2.4), greyDark, 1.15, 1.7, -5.4, 0, 0, -0.28);
  add(new THREE.BoxGeometry(0.24, 0.9, 2.0), orange, -1.5, 3.1, -5.4, 0, 0, 0.28);
  add(new THREE.BoxGeometry(0.24, 0.9, 2.0), orange, 1.5, 3.1, -5.4, 0, 0, -0.28);
  // A white envelope emblem on the left fin.
  add(new THREE.BoxGeometry(0.26, 0.9, 1.2), new THREE.MeshPhongMaterial({ color: 0xfff3d6, shininess: 30 }), -1.32, 1.7, -5.4, 0, 0, 0.28);
  // Wing-tip navigation lights.
  add(new THREE.SphereGeometry(0.26, 8, 6), new THREE.MeshBasicMaterial({ color: 0xff2222 }), -8.9, 0.35, -2.9, 0, 0, 0);
  add(new THREE.SphereGeometry(0.26, 8, 6), new THREE.MeshBasicMaterial({ color: 0x22ff66 }), 8.9, 0.35, -2.9, 0, 0, 0);

  // Afterburner: a glowing flame cone at the tail, plus a hot nozzle ring.
  // Its scale follows throttle, and it flares while Sky Boost is active.
  add(new THREE.CylinderGeometry(0.85, 0.7, 0.9, 12), dark, 0, 0, -7.6, Math.PI / 2, 0, 0);
  const flameMat = new THREE.MeshBasicMaterial({ color: 0xffa030, transparent: true, opacity: 0.7 });
  const flame = new THREE.Mesh(new THREE.ConeGeometry(0.55, 4.2, 12), flameMat);
  flame.rotation.x = -Math.PI / 2;
  flame.position.set(0, 0, -9.6);
  group.add(flame);
  const flameCore = new THREE.Mesh(
    new THREE.ConeGeometry(0.3, 3.0, 10),
    new THREE.MeshBasicMaterial({ color: 0xfff2b0, transparent: true, opacity: 0.95 }),
  );
  flameCore.rotation.x = -Math.PI / 2;
  flameCore.position.set(0, 0, -9.2);
  group.add(flameCore);
  const boostGlow = new THREE.Mesh(
    new THREE.SphereGeometry(1.1, 10, 8),
    new THREE.MeshBasicMaterial({ color: 0xffa030, transparent: true, opacity: 0.5 }),
  );
  boostGlow.position.set(0, 0, -8.6);
  boostGlow.visible = false;
  group.add(boostGlow);
  const glideGlowMat = new THREE.MeshBasicMaterial({
    color: 0x9fe8ff, transparent: true, opacity: 0.45, side: THREE.DoubleSide,
  });
  const glideGlowL = new THREE.Mesh(new THREE.PlaneGeometry(7, 2.4), glideGlowMat);
  glideGlowL.rotation.x = -Math.PI / 2;
  glideGlowL.position.set(-4.5, 0.6, -0.6);
  glideGlowL.visible = false;
  group.add(glideGlowL);
  const glideGlowR = new THREE.Mesh(new THREE.PlaneGeometry(7, 2.4), glideGlowMat);
  glideGlowR.rotation.x = -Math.PI / 2;
  glideGlowR.position.set(4.5, 0.6, -0.6);
  glideGlowR.visible = false;
  group.add(glideGlowR);

  // Landing gear: nose wheel and two main wheels, extended only when
  // the jet is slow (a landing approach) — retracted in fast flight.
  const gear = new THREE.Group();
  const wheelMat = new THREE.MeshPhongMaterial({ color: 0x1a1a1a, shininess: 10 });
  const strutMat = new THREE.MeshPhongMaterial({ color: 0xb8bec8, shininess: 60 });
  function wheel(x, y, z) {
    const strut = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 1.4, 6), strutMat);
    strut.position.set(x, y + 0.7, z);
    gear.add(strut);
    const w = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.3, 10), wheelMat);
    w.rotation.z = Math.PI / 2;
    w.position.set(x, y, z);
    gear.add(w);
  }
  wheel(0, -1.9, 4.6);
  wheel(-1.5, -1.9, -0.6);
  wheel(1.5, -1.9, -0.6);
  gear.visible = false;
  group.add(gear);

  // Nara's red scarf: a short ribbon trailing from the left tail fin,
  // waving in the slipstream — the one warm thing on a grey jet. It
  // hangs off the fin, not down the fuselage centreline, so it reads
  // as a ribbon and never as a ladder on the tail.
  const scarfSegments = [];
  for (let i = 0; i < 6; i += 1) {
    const seg = new THREE.Mesh(new THREE.BoxGeometry(0.5 - i * 0.03, 0.1, 0.85), red);
    seg.position.set(-1.6, 2.6, -6.2 - i * 0.85);
    group.add(seg);
    scarfSegments.push(seg);
  }

  // The jet casts a real shadow on the sea and islands below (the sun
  // light in render.js is the shadow caster). Transparent parts (flame,
  // canopy, glows) are left out so they never throw a dark blob.
  group.traverse((o) => {
    if (o.isMesh && o.material && o.material.transparent !== true) o.castShadow = true;
  });

  function update(state, dt, time) {
    const p = state.plane;
    group.position.set(p.x, p.alt, p.z);
    group.rotation.y = Math.PI - p.heading;
    group.rotation.x = -p.pitch;
    group.rotation.z = p.bank;
    // Barrel Roll: one full visual roll across its active window.
    const rollSk = state.skills && state.skills.roll;
    if (rollSk && rollSk.active > 0) {
      const progress = 1 - rollSk.active / 0.9;
      group.rotation.z += progress * Math.PI * 2;
    }
    // Afterburner flame: grows with throttle, flares on boost, flickers.
    const boostSk = state.skills && state.skills.boost;
    const boosting = !!(boostSk && boostSk.active > 0);
    const flameScale = (0.45 + p.throttle * 0.75) * (boosting ? 1.7 : 1) * (1 + Math.sin(time * 23) * 0.08);
    flame.scale.set(flameScale, flameScale, 1 + p.throttle * 0.5);
    flameCore.scale.set(flameScale, flameScale, 1 + p.throttle * 0.4);
    flameMat.opacity = 0.55 + p.throttle * 0.35;
    boostGlow.visible = boosting;
    if (boostGlow.visible) boostGlow.scale.setScalar(1 + Math.sin(time * 18) * 0.15);
    const glideSk = state.skills && state.skills.glide;
    const gliding = !!(glideSk && glideSk.active > 0);
    glideGlowL.visible = gliding;
    glideGlowR.visible = gliding;
    // Gear down only on a slow approach; up in fast flight.
    gear.visible = p.speed < 68;
    for (let i = 0; i < scarfSegments.length; i += 1) {
      const seg = scarfSegments[i];
      const k = (i + 1) / scarfSegments.length;
      seg.position.x = -1.6 + Math.sin(time * 3.4 + i * 0.8) * 0.5 * k;
      seg.position.y = 2.6 + Math.sin(time * 2.5 + i * 0.9) * 0.2 * k - k * 0.2;
      seg.rotation.y = Math.sin(time * 3.0 + i * 0.6) * 0.5 * k;
    }
  }
  return { group, update };
}
