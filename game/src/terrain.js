// Sky Letters (3D) — the visible archipelago: gradient sky dome, sun,
// animated sea, islands built from the same height function the flight
// model uses, palms, a volcano, a lighthouse with a rotating beam, the
// water runway and the mountain airstrip, and white and storm clouds.
// Labels are drawn by the HUD as DOM text, so clouds and rings can never
// cover them.
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
  const tex = new THREE.CanvasTexture(c);
  return tex;
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
  const tmp = new THREE.Color();
  function colorFor(h, isl2) {
    if (isl2.kind === 'volcano') {
      if (h < 2) return tmp.copy(sand);
      return tmp.copy(volc).lerp(rock, Math.min(1, h / isl2.h));
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

function buildPalm(x, y, z, rng) {
  const g = new THREE.Group();
  const trunkMat = new THREE.MeshPhongMaterial({ color: PALETTE.palmTrunk, shininess: 10 });
  const leafMat = new THREE.MeshPhongMaterial({ color: PALETTE.palm, shininess: 20, side: THREE.DoubleSide });
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.5, 7, 6), trunkMat);
  trunk.position.y = 3.5;
  trunk.rotation.z = rng.range(-0.14, 0.14);
  g.add(trunk);
  for (let i = 0; i < 6; i += 1) {
    const frond = new THREE.Mesh(new THREE.ConeGeometry(1.15, 4.6, 4), leafMat);
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

export function buildTerrain(rng) {
  const group = new THREE.Group();
  const sky = SKIES.day;
  // Sky dome with a vertical gradient texture.
  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(3000, 24, 12),
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
  // Sea: a large plane whose vertices ripple gently.
  const seaGeo = new THREE.PlaneGeometry(5200, 5200, 48, 48);
  seaGeo.rotateX(-Math.PI / 2);
  const seaBase = seaGeo.attributes.position.array.slice();
  const seaMat = new THREE.MeshPhongMaterial({
    color: sky.sea, shininess: 200, specular: 0x99bbcc, transparent: true, opacity: 0.96,
  });
  const sea = new THREE.Mesh(seaGeo, seaMat);
  sea.position.set(0, 0, -1600);
  group.add(sea);
  // Islands, sand rims, palms, volcano cone, lighthouse, runway, airstrip.
  const islandMat = new THREE.MeshPhongMaterial({ vertexColors: true, shininess: 8 });
  const sandMat = new THREE.MeshPhongMaterial({ color: PALETTE.sand, shininess: 5 });
  const whiteMat = new THREE.MeshPhongMaterial({ color: 0xf8f4ec, shininess: 30 });
  const redMat = new THREE.MeshPhongMaterial({ color: 0xd93b2b, shininess: 30 });
  const darkMat = new THREE.MeshPhongMaterial({ color: 0x2b2b33, shininess: 20 });
  const stripMat = new THREE.MeshPhongMaterial({ color: 0xe8dcc0, shininess: 10 });
  let lighthouseTop = null;
  let beam = null;
  let volcanoTop = null;
  for (const isl of ISLANDS) {
    const mesh = new THREE.Mesh(islandGeometry(isl), islandMat);
    group.add(mesh);
    const rim = new THREE.Mesh(new THREE.RingGeometry(isl.r * 0.94, isl.r * 1.04, 40), sandMat);
    rim.rotation.x = -Math.PI / 2;
    rim.position.set(isl.x, 0.35, isl.z);
    group.add(rim);
    const topY = heightAt(isl.x, isl.z);
    if (isl.kind === 'palm' || isl.kind === 'village' || isl.kind === 'runway-water' || isl.kind === 'lighthouse') {
      const count = isl.kind === 'palm' ? 6 : 4;
      for (let i = 0; i < count; i += 1) {
        const a = rng.range(0, Math.PI * 2);
        const rr = isl.r * rng.range(0.35, 0.62);
        const px = isl.x + Math.cos(a) * rr;
        const pz = isl.z + Math.sin(a) * rr;
        group.add(buildPalm(px, Math.max(0.4, heightAt(px, pz)) - 0.3, pz, rng));
      }
    }
    if (isl.kind === 'volcano') {
      const cone = new THREE.Mesh(new THREE.ConeGeometry(isl.r * 0.5, isl.h * 0.85, 24),
        new THREE.MeshPhongMaterial({ color: PALETTE.volcano, shininess: 5 }));
      cone.position.set(isl.x, topY * 0.4, isl.z);
      group.add(cone);
      volcanoTop = new THREE.Vector3(isl.x, topY + isl.h * 0.35, isl.z);
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
  for (let i = 0; i < 14; i += 1) {
    makeCloud(cloudMat, rng.range(-1300, 1300), rng.range(210, 330), rng.range(-3500, 200), rng.range(0.8, 1.6));
  }
  const stormClouds = [];
  for (let i = 0; i < 6; i += 1) {
    stormClouds.push(makeCloud(stormMat, rng.range(-350, 350), rng.range(150, 230), rng.range(-2400, -1500), rng.range(1.1, 1.8)));
  }

  function setSky(key) {
    const s = SKIES[key] || SKIES.day;
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
      pos.array[i * 3 + 1] = Math.sin(bx * 0.02 + time * 0.8) * 1.4 + Math.cos(bz * 0.017 + time * 0.6) * 1.4;
    }
    pos.needsUpdate = true;
    seaGeo.computeVertexNormals();
    for (const c of clouds) c.position.x += dt * 1.2;
    if (beam) beam.rotation.y = time * 0.5;
  }
  return { group, sea, setSky, update, lighthouseTop, volcanoTop, stormClouds, sun };
}
