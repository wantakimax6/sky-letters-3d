// Sky Letters (3D) — the visible archipelago: gradient sky dome, sun,
// animated sea with a soft horizontal glitter path, islands built from
// the same height function the flight model uses, palms, village huts
// with lit windows, a volcano with a glowing crater and smoke, a
// lighthouse with a rotating beam, the water runway and the mountain
// airstrip, lagoons with coral, boats with wakes, birds, and white and
// storm clouds. Labels are drawn by the HUD as DOM text, so clouds and
// rings can never cover them. Geometries and materials are shared across
// palms, huts and boats, so the richer map costs few draw calls.
import { ISLANDS, heightAt } from './islands.js';
import { PALETTE, SKIES } from './config.js';

function skyTexture(sky) {
  const c = document.createElement('canvas');
  c.width = 4; c.height = 512;
  const g = c.getContext('2d');
  const grad = g.createLinearGradient(0, 0, 0, 512);
  grad.addColorStop(0, sky.skyTop);
  grad.addColorStop(0.45, sky.skyMid);
  grad.addColorStop(1, sky.skyLow);
  g.fillStyle = grad;
  g.fillRect(0, 0, 4, 512);
  return new THREE.CanvasTexture(c);
}
function sunTexture() {
  const c = document.createElement('canvas');
  c.width = 128; c.height = 128;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(64, 64, 4, 64, 64, 64);
  grad.addColorStop(0, 'rgba(255,248,220,1)');
  grad.addColorStop(0.35, 'rgba(255,220,140,0.9)');
  grad.addColorStop(1, 'rgba(255,200,110,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
}

// A radial-grid island mesh: rings of vertices from the centre out, so the
// mesh follows heightAt exactly and has no flat sheet spilling onto the sea.
function islandGeometry(isl) {
  const rings = 12;
  const segs = 40;
  const positions = [];
  const colors = [];
  const indices = [];
  const sand = new THREE.Color(PALETTE.sand);
  const grass = new THREE.Color(PALETTE.grass);
  const grassDark = new THREE.Color(PALETTE.grassDark);
  const rock = new THREE.Color(PALETTE.rock);
  const volc = new THREE.Color(PALETTE.volcano);
  const lagoonCol = new THREE.Color(0x6fd3c0);
  const tmp = new THREE.Color();
  function colorFor(h, isl2) {
    if (isl2.kind === 'volcano') {
      if (h < 2) return tmp.copy(sand);
      return tmp.copy(volc).lerp(rock, Math.min(1, h / isl2.h));
    }
    if (isl2.kind === 'lagoon') {
      if (h < 2.2) return tmp.copy(sand);
      if (h < 4.5) return tmp.copy(lagoonCol);
      return tmp.copy(grass).lerp(grassDark, h / isl2.h);
    }
    if (h < 2.2) return tmp.copy(sand);
    if (h < isl2.h * 0.45) return tmp.copy(grass).lerp(grassDark, h / isl2.h);
    if (h < isl2.h * 0.8) return tmp.copy(grassDark).lerp(rock, (h / isl2.h - 0.45) * 1.6);
    return tmp.copy(rock);
  }
  for (let i = 0; i <= rings; i += 1) {
    const rr = (isl.r * i) / rings;
    for (let j = 0; j <= segs; j += 1) {
      const a = (j / segs) * Math.PI * 2;
      const x = isl.x + Math.cos(a) * rr;
      const z = isl.z + Math.sin(a) * rr;
      const h = i === 0 ? heightAt(isl.x, isl.z) : heightAt(x, z);
      positions.push(x, Math.max(0.25, h), z);
      const col = colorFor(h, isl);
      colors.push(col.r, col.g, col.b);
    }
  }
  const stride = segs + 1;
  for (let i = 0; i < rings; i += 1) {
    for (let j = 0; j < segs; j += 1) {
      const a = i * stride + j;
      const b = a + stride;
      indices.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

export function buildTerrain(rng) {
  const group = new THREE.Group();
  const sky = SKIES.day;
  // Shared geometries/materials: every palm, hut and boat reuses them.
  const trunkGeo = new THREE.CylinderGeometry(0.32, 0.5, 7, 6);
  const frondGeo = new THREE.ConeGeometry(1.15, 4.6, 4);
  const trunkMat = new THREE.MeshPhongMaterial({ color: PALETTE.palmTrunk, shininess: 10 });
  const leafMat = new THREE.MeshPhongMaterial({ color: PALETTE.palm, shininess: 20, side: THREE.DoubleSide });
  const hutWallGeo = new THREE.BoxGeometry(5, 3.6, 4.5);
  const hutRoofGeo = new THREE.ConeGeometry(4.2, 2.8, 4);
  const hutWallMat = new THREE.MeshPhongMaterial({ color: 0xd9a066, shininess: 8 });
  const hutRoofMat = new THREE.MeshPhongMaterial({ color: 0x8a4a2a, shininess: 8 });
  const windowMat = new THREE.MeshBasicMaterial({ color: 0xffd97a });
  const windowGeo = new THREE.PlaneGeometry(1.1, 1.2);
  const coralGeo = new THREE.ConeGeometry(1.6, 3.2, 6);
  const coralMats = [0xff7a9a, 0xffa04d, 0x7fd3ff].map(
    (c) => new THREE.MeshPhongMaterial({ color: c, shininess: 30 }),
  );
  function buildPalm(x, y, z) {
    const g = new THREE.Group();
    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.position.y = 3.5;
    trunk.rotation.z = rng.range(-0.14, 0.14);
    g.add(trunk);
    for (let i = 0; i < 6; i += 1) {
      const frond = new THREE.Mesh(frondGeo, leafMat);
      frond.scale.set(1, 1, 0.32);
      const a = (i / 6) * Math.PI * 2;
      frond.position.set(Math.cos(a) * 1.7, 7.2, Math.sin(a) * 1.7);
      frond.rotation.set(Math.sin(a) * 1.15, 0, -Math.cos(a) * 1.15);
      g.add(frond);
    }
    g.position.set(x, y, z);
    g.rotation.y = rng.range(0, Math.PI * 2);
    return g;
  }
  function buildHut(x, y, z, rot) {
    const g = new THREE.Group();
    const wall = new THREE.Mesh(hutWallGeo, hutWallMat);
    wall.position.y = 1.8;
    g.add(wall);
    const roof = new THREE.Mesh(hutRoofGeo, hutRoofMat);
    roof.position.y = 5;
    roof.rotation.y = Math.PI / 4;
    g.add(roof);
    const win = new THREE.Mesh(windowGeo, windowMat);
    win.position.set(0, 1.9, 2.28);
    g.add(win);
    g.position.set(x, y, z);
    g.rotation.y = rot;
    return g;
  }

  // Sky dome with a vertical gradient texture.
  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(5200, 24, 12),
    new THREE.MeshBasicMaterial({ map: skyTexture(sky), side: THREE.BackSide, fog: false }),
  );
  group.add(dome);
  // Sun sprite: positioned every frame far away in the sun's direction
  // (see render.draw); it must never sit at the world origin.
  const sun = new THREE.Sprite(new THREE.SpriteMaterial({
    map: sunTexture(), transparent: true, fog: false, depthWrite: false,
  }));
  sun.scale.set(320, 320, 1);
  group.add(sun);
  // Sea: a large plane whose vertices ripple gently. Specular is kept
  // low on purpose — a strong specular made a huge white vertical beam
  // in the sunset shots. The glitter path below is the sun's reflection.
  const seaGeo = new THREE.PlaneGeometry(9000, 9000, 48, 48);
  seaGeo.rotateX(-Math.PI / 2);
  const seaBase = seaGeo.attributes.position.array.slice();
  const seaMat = new THREE.MeshPhongMaterial({
    color: sky.sea, shininess: 0, specular: 0x000000, transparent: true, opacity: 0.96,
  });
  const sea = new THREE.Mesh(seaGeo, seaMat);
  sea.position.set(0, 0, -2600);
  group.add(sea);
  // Sun glitter: a WIDE, SHORT, soft horizontal band on the water, lying
  // flat far ahead toward the sun — its long axis runs ACROSS the view,
  // so it reads as shimmer on the horizon, never as a vertical beam.
  // (A long strip pointing at the sun read as a huge white column.)
  const glitterGroup = new THREE.Group();
  const glitterMat = new THREE.MeshBasicMaterial({
    color: 0xffe9a0, transparent: true, opacity: 0.13, depthWrite: false,
  });
  const glitter = new THREE.Mesh(new THREE.PlaneGeometry(620, 90), glitterMat);
  glitter.rotation.x = -Math.PI / 2;
  glitterGroup.add(glitter);
  glitterGroup.position.set(0, 0.7, -600);
  group.add(glitterGroup);
  function setGlitter(camPos, sunDir, key) {
    const len = Math.hypot(sunDir.x, sunDir.z) || 1;
    const hx = sunDir.x / len;
    const hz = sunDir.z / len;
    glitterGroup.position.set(camPos.x + hx * 700, 0.7, camPos.z + hz * 700);
    glitterGroup.rotation.y = Math.atan2(hx, hz);
    glitterMat.opacity = key === 'day' ? 0.10 : key === 'dusk' ? 0.18 : 0.22;
    glitterMat.color.setHex(key === 'day' ? 0xfff3c4 : 0xffc46b);
  }

  // Islands, sand rims, palms, huts, volcano, lighthouse, runway, airstrip.
  const islandMat = new THREE.MeshPhongMaterial({ vertexColors: true, shininess: 8 });
  const sandMat = new THREE.MeshPhongMaterial({ color: PALETTE.sand, shininess: 5, transparent: true, opacity: 0.55 });
  const whiteMat = new THREE.MeshPhongMaterial({ color: 0xf8f4ec, shininess: 30 });
  const redMat = new THREE.MeshPhongMaterial({ color: 0xd93b2b, shininess: 30 });
  const darkMat = new THREE.MeshPhongMaterial({ color: 0x2b2b33, shininess: 20 });
  const stripMat = new THREE.MeshPhongMaterial({ color: 0xe8dcc0, shininess: 10 });
  let lighthouseTop = null;
  let beam = null;
  let volcanoTop = null;
  const smokePuffs = [];
  const smokeGeo = new THREE.SphereGeometry(6, 8, 6);
  const smokeMat = new THREE.MeshBasicMaterial({ color: 0x8a8a92, transparent: true, opacity: 0.32, depthWrite: false });
  for (const isl of ISLANDS) {
    const mesh = new THREE.Mesh(islandGeometry(isl), islandMat);
    group.add(mesh);
    const rim = new THREE.Mesh(new THREE.RingGeometry(isl.r * 0.97, isl.r * 1.03, 40), sandMat);
    rim.rotation.x = -Math.PI / 2;
    rim.position.set(isl.x, 0.35, isl.z);
    group.add(rim);
    const topY = heightAt(isl.x, isl.z);
    // Palms: groves on palm islands, a few on villages and the runway.
    const palmCount = isl.kind === 'palm' ? 9 : isl.kind === 'village' ? 5
      : isl.kind === 'runway-water' ? 4 : isl.kind === 'lighthouse' ? 3
      : isl.kind === 'lagoon' ? 4 : 0;
    for (let i = 0; i < palmCount; i += 1) {
      const a = rng.range(0, Math.PI * 2);
      const rr = isl.r * rng.range(0.3, 0.62);
      const px = isl.x + Math.cos(a) * rr;
      const pz = isl.z + Math.sin(a) * rr;
      group.add(buildPalm(px, Math.max(0.4, heightAt(px, pz)) - 0.3, pz));
    }
    // Village huts with warm lit windows.
    if (isl.kind === 'village') {
      for (let i = 0; i < 6; i += 1) {
        const a = (i / 6) * Math.PI * 2 + rng.range(-0.2, 0.2);
        const rr = isl.r * rng.range(0.25, 0.5);
        const px = isl.x + Math.cos(a) * rr;
        const pz = isl.z + Math.sin(a) * rr;
        group.add(buildHut(px, Math.max(0.4, heightAt(px, pz)) - 0.2, pz, rng.range(0, Math.PI * 2)));
      }
    }
    // Lagoon shallows and coral.
    if (isl.kind === 'lagoon') {
      const shallow = new THREE.Mesh(
        new THREE.CircleGeometry(isl.r * 0.9, 32),
        new THREE.MeshPhongMaterial({ color: 0x4fc8b8, transparent: true, opacity: 0.5, shininess: 60 }),
      );
      shallow.rotation.x = -Math.PI / 2;
      shallow.position.set(isl.x, 0.55, isl.z);
      group.add(shallow);
      for (let i = 0; i < 5; i += 1) {
        const a = rng.range(0, Math.PI * 2);
        const rr = isl.r * rng.range(0.3, 0.7);
        const coral = new THREE.Mesh(coralGeo, coralMats[i % coralMats.length]);
        coral.position.set(isl.x + Math.cos(a) * rr, 1.2, isl.z + Math.sin(a) * rr);
        group.add(coral);
      }
    }
    if (isl.kind === 'volcano') {
      const cone = new THREE.Mesh(new THREE.ConeGeometry(isl.r * 0.5, isl.h * 0.85, 24),
        new THREE.MeshPhongMaterial({ color: PALETTE.volcano, shininess: 5 }));
      cone.position.set(isl.x, topY * 0.4, isl.z);
      group.add(cone);
      volcanoTop = new THREE.Vector3(isl.x, topY + isl.h * 0.35, isl.z);
      const crater = new THREE.Mesh(
        new THREE.CircleGeometry(isl.r * 0.13, 20),
        new THREE.MeshBasicMaterial({ color: 0xff7a1a }),
      );
      crater.rotation.x = -Math.PI / 2;
      crater.position.set(isl.x, volcanoTop.y + 1, isl.z);
      group.add(crater);
      for (let i = 0; i < 6; i += 1) {
        const puff = new THREE.Mesh(smokeGeo, smokeMat.clone());
        puff.position.set(isl.x, volcanoTop.y + 8 + i * 6, isl.z);
        group.add(puff);
        smokePuffs.push({ mesh: puff, baseY: volcanoTop.y + 8, offset: i * 6 });
      }
    }
    if (isl.kind === 'lighthouse') {
      const base = new THREE.Group();
      const tower = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 4.4, 16, 12), whiteMat);
      tower.position.y = 8;
      base.add(tower);
      for (const by of [4, 11]) {
        const band = new THREE.Mesh(new THREE.CylinderGeometry(3.55, 3.75, 2.6, 12), redMat);
        band.position.y = by;
        base.add(band);
      }
      const lampRoom = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 2.4, 3.2, 10), darkMat);
      lampRoom.position.y = 17.4;
      base.add(lampRoom);
      const lamp = new THREE.Mesh(new THREE.SphereGeometry(1.7, 12, 10),
        new THREE.MeshBasicMaterial({ color: 0xfff2b0 }));
      lamp.position.y = 17.4;
      base.add(lamp);
      const cap = new THREE.Mesh(new THREE.ConeGeometry(2.9, 2.2, 10), darkMat);
      cap.position.y = 20;
      base.add(cap);
      beam = new THREE.Mesh(
        new THREE.ConeGeometry(7, 70, 14, 1, true),
        new THREE.MeshBasicMaterial({ color: 0xfff2b0, transparent: true, opacity: 0.22, side: THREE.DoubleSide, depthWrite: false }),
      );
      beam.rotation.z = Math.PI / 2;
      beam.position.set(35, 17.4, 0);
      base.add(beam);
      base.position.set(isl.x, topY - 0.5, isl.z);
      group.add(base);
      lighthouseTop = new THREE.Vector3(isl.x, topY + 18, isl.z);
    }
    if (isl.kind === 'runway-water') {
      const strip = new THREE.Mesh(new THREE.BoxGeometry(16, 0.7, 170), stripMat);
      strip.position.set(isl.x, 0.45, isl.z + 220);
      group.add(strip);
      const buoyMat = new THREE.MeshPhongMaterial({ color: 0xff7a2f, shininess: 40 });
      for (let i = 0; i < 6; i += 1) {
        for (const side of [-1, 1]) {
          const buoy = new THREE.Mesh(new THREE.SphereGeometry(1.3, 10, 8), buoyMat);
          buoy.position.set(isl.x + side * 11, 0.6, isl.z + 140 + i * 32);
          group.add(buoy);
        }
      }
    }
    if (isl.kind === 'airstrip') {
      const strip = new THREE.Mesh(new THREE.BoxGeometry(18, 1.2, 130), stripMat);
      strip.position.set(isl.x, topY + 0.4, isl.z);
      group.add(strip);
    }
    if (isl.kind === 'memorial') {
      const stone = new THREE.Mesh(new THREE.BoxGeometry(6, 9, 2), whiteMat);
      stone.position.set(isl.x, topY + 4.5, isl.z);
      group.add(stone);
      const orb = new THREE.Mesh(new THREE.SphereGeometry(2.2, 12, 10),
        new THREE.MeshBasicMaterial({ color: 0xffe9a0 }));
      orb.position.set(isl.x, topY + 11, isl.z);
      group.add(orb);
    }
  }
  // Boats with wakes, sailing slow circles around the home islands.
  const boats = [];
  const hullGeo = new THREE.BoxGeometry(7, 1.4, 2.6);
  const hullMat = new THREE.MeshPhongMaterial({ color: 0x6b4423, shininess: 15 });
  const mastGeo = new THREE.CylinderGeometry(0.18, 0.18, 6, 6);
  const sailGeo = new THREE.PlaneGeometry(3, 4.4);
  const sailMat = new THREE.MeshPhongMaterial({ color: 0xfff3d6, side: THREE.DoubleSide, shininess: 10 });
  const wakeGeo = new THREE.CircleGeometry(3.2, 14);
  const wakeMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.3, depthWrite: false });
  const boatRoutes = [
    { cx: 0, cz: -400, r: 320, speed: 0.03, phase: 0 },
    { cx: -500, cz: -1200, r: 260, speed: -0.04, phase: 2 },
    { cx: 600, cz: -1900, r: 300, speed: 0.035, phase: 4 },
    { cx: 0, cz: -3200, r: 340, speed: -0.03, phase: 1 },
  ];
  for (const route of boatRoutes) {
    const boat = new THREE.Group();
    const hull = new THREE.Mesh(hullGeo, hullMat);
    hull.position.y = 0.7;
    boat.add(hull);
    const mast = new THREE.Mesh(mastGeo, hullMat);
    mast.position.y = 4;
    boat.add(mast);
    const sail = new THREE.Mesh(sailGeo, sailMat);
    sail.position.set(0, 3.6, 0.4);
    boat.add(sail);
    const wake = new THREE.Mesh(wakeGeo, wakeMat);
    wake.rotation.x = -Math.PI / 2;
    wake.scale.set(1.6, 2.6, 1);
    wake.position.y = 0.45;
    group.add(wake);
    group.add(boat);
    boats.push({ group: boat, wake, ...route });
  }
  // Birds circling above the islands, wings flapping.
  const birds = [];
  const wingGeo = new THREE.BoxGeometry(2.4, 0.12, 0.8);
  const birdMat = new THREE.MeshBasicMaterial({ color: 0x2b2b33 });
  const birdCentres = [
    { x: 0, z: -600, r: 180, y: 130 }, { x: 420, z: -2300, r: 150, y: 150 },
    { x: -950, z: -2600, r: 170, y: 120 }, { x: 0, z: -4200, r: 200, y: 170 },
  ];
  for (let i = 0; i < 8; i += 1) {
    const c = birdCentres[i % birdCentres.length];
    const bird = new THREE.Group();
    const left = new THREE.Mesh(wingGeo, birdMat);
    left.position.x = -1.2;
    const right = new THREE.Mesh(wingGeo, birdMat);
    right.position.x = 1.2;
    bird.add(left);
    bird.add(right);
    group.add(bird);
    birds.push({ group: bird, left, right, ...c, speed: 0.25 + rng.range(-0.06, 0.06), phase: rng.range(0, Math.PI * 2) });
  }
  // Clouds: bright basic material so they read as clouds at any light.
  const cloudMat = new THREE.MeshBasicMaterial({ color: 0xffffff, fog: true });
  const stormMat = new THREE.MeshBasicMaterial({ color: 0x555566, fog: true });
  const clouds = [];
  function makeCloud(mat, cx, cy, cz, scale) {
    const c = new THREE.Group();
    const n = 3 + Math.floor(rng.next() * 3);
    for (let i = 0; i < n; i += 1) {
      const s = new THREE.Mesh(new THREE.SphereGeometry(rng.range(9, 20), 10, 8), mat);
      s.position.set(rng.range(-22, 22), rng.range(-4, 5), rng.range(-10, 10));
      s.scale.y = 0.55;
      c.add(s);
    }
    c.position.set(cx, cy, cz);
    c.scale.setScalar(scale);
    group.add(c);
    clouds.push(c);
    return c;
  }
  for (let i = 0; i < 26; i += 1) {
    makeCloud(cloudMat, rng.range(-2600, 2600), rng.range(210, 380), rng.range(-5600, 400), rng.range(0.8, 1.8));
  }
  const stormClouds = [];
  for (let i = 0; i < 8; i += 1) {
    stormClouds.push(makeCloud(stormMat, rng.range(-450, 450), rng.range(150, 230), rng.range(-2600, -1500), rng.range(1.1, 1.8)));
  }

  let skyKey = 'day';
  function setSky(key) {
    const s = SKIES[key] || SKIES.day;
    skyKey = key;
    dome.material.map = skyTexture(s);
    dome.material.needsUpdate = true;
    seaMat.color.setHex(s.sea);
    sun.material.color.setHex(s.sun);
    if (beam) beam.material.opacity = key === 'day' ? 0.08 : 0.22;
    cloudMat.color.setHex(key === 'day' ? 0xffffff : 0xffd9c4);
    return s;
  }
  function update(dt, time) {
    // Gentle sea ripple: move the sea vertices on a slow sine.
    const pos = seaGeo.attributes.position;
    for (let i = 0; i < pos.count; i += 1) {
      const bx = seaBase[i * 3];
      const bz = seaBase[i * 3 + 2];
      pos.array[i * 3 + 1] = Math.sin(bx * 0.008 + time * 0.8) * 1.4 + Math.cos(bz * 0.007 + time * 0.6) * 1.4;
    }
    pos.needsUpdate = true;
    seaGeo.computeVertexNormals();
    for (const c of clouds) c.position.x += dt * 1.2;
    if (beam) beam.rotation.y = time * 0.5;
    for (const puff of smokePuffs) {
      const cycle = (time * 2.2 + puff.offset) % 36;
      puff.mesh.position.y = puff.baseY + cycle;
      puff.mesh.material.opacity = 0.32 * Math.max(0, 1 - cycle / 36);
      puff.mesh.scale.setScalar(1 + cycle * 0.06);
    }
    for (const b of boats) {
      const a = time * b.speed + b.phase;
      const bx = b.cx + Math.cos(a) * b.r;
      const bz = b.cz + Math.sin(a) * b.r;
      b.group.position.set(bx, 0, bz);
      b.group.rotation.y = -a + (b.speed > 0 ? 0 : Math.PI);
      const wx = bx - Math.cos(a) * 8;
      const wz = bz - Math.sin(a) * 8;
      b.wake.position.set(wx, 0.45, wz);
      b.wake.rotation.z = -a;
    }
    for (const bird of birds) {
      const a = time * bird.speed + bird.phase;
      bird.group.position.set(
        bird.x + Math.cos(a) * bird.r,
        bird.y + Math.sin(time * 0.8 + bird.phase) * 6,
        bird.z + Math.sin(a) * bird.r,
      );
      bird.group.rotation.y = -a;
      const flap = Math.sin(time * 7 + bird.phase) * 0.45;
      bird.left.rotation.z = 0.25 + flap;
      bird.right.rotation.z = -0.25 - flap;
    }
  }
  return { group, sea, setSky, update, lighthouseTop, volcanoTop, stormClouds, sun, setGlitter };
}
