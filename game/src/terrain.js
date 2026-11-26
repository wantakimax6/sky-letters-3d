// Sky Letters (3D) — the visible archipelago: gradient sky dome, sun,
// animated sea with a soft horizontal glitter path, islands built from
// the same height function the flight model uses, palms, village huts
// with lit windows, a volcano with a glowing crater and smoke, a
// lighthouse with a rotating beam, the water runway and the mountain
// airstrip, lagoons with coral, boats with wakes, birds, and white and
// storm clouds. Labels are drawn by the HUD as DOM text, so clouds and
// rings can never cover them. Geometries and materials are shared across
// palms, huts and boats, so the richer map costs few draw calls.
import { ISLANDS, CITY_BUILDINGS, heightAt } from './islands.js';
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
  const uvs = [];
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
      // UVs in world units: the detail texture tiles every 90 units,
      // so the grain reads at the same scale on every island.
      uvs.push(x / 90, z / 90);
      const col = colorFor(h, isl);
      colors.push(col.r, col.g, col.b);
    }
  }
  const stride = segs + 1;
  for (let i = 0; i < rings; i += 1) {
    for (let j = 0; j < segs; j += 1) {
      const a = i * stride + j;
      const b = a + stride;
      // Winding matters: (a, a+1, b) faces UP. The old order (a, b, a+1)
      // faced down — the flat tops were backface-culled from above, so
      // the city plateau (and its ground disc) were invisible and the
      // islands were lit only by the hemisphere ground colour.
      indices.push(a, a + 1, b, b, a + 1, b + 1);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

export function buildTerrain(rng, tex) {
  const group = new THREE.Group();
  const sky = SKIES.day;
  const T = tex || {};
  // Shared geometries/materials: every palm, hut and boat reuses them.
  const trunkGeo = new THREE.CylinderGeometry(0.32, 0.5, 7, 6);
  const frondGeo = new THREE.ConeGeometry(1.15, 4.6, 4);
  const trunkMat = new THREE.MeshStandardMaterial({
    map: T.palmBark || null, color: T.palmBark ? 0xffffff : PALETTE.palmTrunk, roughness: 0.95,
  });
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
  function buildTree(x, y, z, s) {
    // A leafy city-park tree: trunk plus two foliage spheres with the
    // painted leaf texture, so the park reads green from the air.
    const g = new THREE.Group();
    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.scale.set(1.4, 1.1, 1.4);
    trunk.position.y = 3.5;
    g.add(trunk);
    const leafMat = new THREE.MeshStandardMaterial({
      map: T.parkFoliage || null, color: T.parkFoliage ? 0xffffff : PALETTE.palm,
      roughness: 0.95,
    });
    const c1 = new THREE.Mesh(new THREE.SphereGeometry(3.4 * s, 10, 8), leafMat);
    c1.position.y = 8.4;
    c1.scale.y = 0.85;
    g.add(c1);
    const c2 = new THREE.Mesh(new THREE.SphereGeometry(2.4 * s, 10, 8), leafMat);
    c2.position.set(1.8 * s, 10.2, 0.8 * s);
    c2.scale.y = 0.8;
    g.add(c2);
    g.position.set(x, y, z);
    g.rotation.y = rng.range(0, Math.PI * 2);
    return g;
  }
  // The city ground: a radial-grid disc that follows heightAt exactly
  // (like the island meshes) but with planar UVs, so the painted city
  // map — streets, plaza, park, market, airport — lands on the land
  // itself, in world coordinates. u east, v south (texture top = north).
  function cityGroundGeometry(isl) {
    const rings = 16;
    const segs = 64;
    const R = 295;
    const positions = [];
    const uvs = [];
    const indices = [];
    for (let i = 0; i <= rings; i += 1) {
      const rr = (R * i) / rings;
      for (let j = 0; j <= segs; j += 1) {
        const a = (j / segs) * Math.PI * 2;
        const x = isl.x + Math.cos(a) * rr;
        const z = isl.z + Math.sin(a) * rr;
        const h = i === 0 ? heightAt(isl.x, isl.z) : heightAt(x, z);
        positions.push(x, Math.max(0.3, h) + 0.35, z);
        uvs.push((x - (isl.x - 300)) / 600, 1 - (z - (isl.z - 300)) / 600);
      }
    }
    const stride = segs + 1;
    for (let i = 0; i < rings; i += 1) {
      for (let j = 0; j < segs; j += 1) {
        const a = i * stride + j;
        const b = a + stride;
        // Same upward winding as islandGeometry (see above).
        indices.push(a, a + 1, b, b, a + 1, b + 1);
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    return geo;
  }

  // City building facades: six procedural facade textures (lit windows,
  // balconies, shop fronts), used as map and emissive map so the windows
  // glow at dusk while the walls stay dark. Buildings pick a facade by
  // index, so the city no longer repeats one texture everywhere.
  function buildingTexture() {
    const c = document.createElement('canvas');
    c.width = 128; c.height = 256;
    const g = c.getContext('2d');
    g.fillStyle = '#2e3442';
    g.fillRect(0, 0, 128, 256);
    for (let y = 12; y < 244; y += 22) {
      for (let x = 10; x < 118; x += 22) {
        const lit = ((x * 7 + y * 13) % 10) < 6;
        g.fillStyle = lit ? '#ffd97a' : '#1a2030';
        g.fillRect(x, y, 12, 14);
      }
    }
    return new THREE.CanvasTexture(c);
  }
  const facadeTex = buildingTexture();
  const facadeMats = (T.facades && T.facades.length ? T.facades : [facadeTex]).map((f) => (
    new THREE.MeshStandardMaterial({
      map: f, emissiveMap: f, emissive: 0xbb9955, emissiveIntensity: 0.55, roughness: 0.9, metalness: 0.05,
    })
  ));
  const facadeTopMat = new THREE.MeshStandardMaterial({
    map: T.rooftop || null, color: T.rooftop ? 0xffffff : 0x3a4152, roughness: 0.9,
  });
  const streetMat = new THREE.MeshStandardMaterial({
    map: T.tarmac || null, color: T.tarmac ? 0xffffff : 0x2b2f3a, roughness: 0.95,
  });
  const towerGlassMat = new THREE.MeshPhongMaterial({ color: 0x9fd8ef, shininess: 120, specular: 0xffffff });

  // The coastal city Kota Langit, rebuilt as a PROPER ISLAND CITY:
  // a raised landmass with a painted ground map (streets, plaza, park,
  // market, airport) hugging the terrain, buildings standing ON the
  // ground at their own ground height, a park with trees and a fountain,
  // a plaza monument, a lit night-market street, street lamps, a harbour
  // pier, a bridge to Bridge Isle, and an airport with a lit runway and
  // a control tower on the east edge — all on land, never on water.
  function buildCity(isl) {
    const g = new THREE.Group();
    const topY = heightAt(isl.x, isl.z);
    // The ground itself: the painted city map on terrain-hugging geometry.
    const groundMat = new THREE.MeshStandardMaterial({
      map: T.cityLand || null, normalMap: T.cityLandNormal || null,
      normalScale: new THREE.Vector2(0.5, 0.5),
      color: T.cityLand ? 0xffffff : 0x6a9a5a, roughness: 0.95,
    });
    const ground = new THREE.Mesh(cityGroundGeometry(isl), groundMat);
    ground.receiveShadow = true;
    g.add(ground);
    // Buildings: each stands on its own ground height, with a textured
    // rooftop and an air-conditioning box on some roofs.
    const acGeo = new THREE.BoxGeometry(3, 1.4, 2.4);
    const acMat = new THREE.MeshStandardMaterial({ color: 0x8a8f98, roughness: 0.8, metalness: 0.3 });
    CITY_BUILDINGS.forEach((b, bi) => {
      const fm = facadeMats[bi % facadeMats.length];
      const tower = new THREE.Mesh(new THREE.BoxGeometry(b.w, b.h, b.d),
        [fm, fm, facadeTopMat, facadeTopMat, fm, fm]);
      tower.castShadow = true;
      const groundY = heightAt(b.x, b.z);
      tower.position.set(b.x, groundY + b.h / 2, b.z);
      tower.rotation.y = b.rot || 0;
      g.add(tower);
      if ((bi % 5) === 0) {
        const ac = new THREE.Mesh(acGeo, acMat);
        ac.position.set(b.x, groundY + b.h + 0.7, b.z);
        g.add(ac);
      }
      if (b.tower) {
        const beacon = new THREE.Mesh(new THREE.SphereGeometry(1.1, 8, 6),
          new THREE.MeshBasicMaterial({ color: 0xff4444 }));
        beacon.position.set(b.x, groundY + b.h + 1.2, b.z);
        g.add(beacon);
      }
    });
    // Central plaza: a paved stone circle and the Sky Letters monument —
    // a tapered obelisk with a gold orb, ringed by lamp posts.
    const plazaMat = new THREE.MeshStandardMaterial({
      map: T.plazaStone || null, color: T.plazaStone ? 0xffffff : 0xc4bcac, roughness: 0.9,
    });
    const plaza = new THREE.Mesh(new THREE.CircleGeometry(32, 32), plazaMat);
    plaza.rotation.x = -Math.PI / 2;
    plaza.position.set(isl.x, topY + 0.55, isl.z);
    g.add(plaza);
    const monumentMat = new THREE.MeshStandardMaterial({
      map: T.memorialStone || null, color: T.memorialStone ? 0xffffff : 0xf8f4ec, roughness: 0.6,
    });
    const obelisk = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 4.2, 24, 4), monumentMat);
    obelisk.position.set(isl.x, topY + 12, isl.z);
    obelisk.rotation.y = Math.PI / 4;
    obelisk.castShadow = true;
    g.add(obelisk);
    const orb = new THREE.Mesh(new THREE.SphereGeometry(2.6, 12, 10),
      new THREE.MeshBasicMaterial({ color: 0xffd94d }));
    orb.position.set(isl.x, topY + 26, isl.z);
    g.add(orb);
    const lampPoleMat = new THREE.MeshStandardMaterial({ color: 0x2b2f3a, roughness: 0.7, metalness: 0.4 });
    const lampGlowMat = new THREE.MeshBasicMaterial({ color: 0xffd97a });
    const lampPoleGeo = new THREE.CylinderGeometry(0.25, 0.3, 7, 6);
    const lampGlowGeo = new THREE.SphereGeometry(0.9, 8, 6);
    for (let i = 0; i < 8; i += 1) {
      const a = (i / 8) * Math.PI * 2;
      const lx = isl.x + Math.cos(a) * 26;
      const lz = isl.z + Math.sin(a) * 26;
      const pole = new THREE.Mesh(lampPoleGeo, lampPoleMat);
      pole.position.set(lx, heightAt(lx, lz) + 3.5, lz);
      g.add(pole);
      const glow = new THREE.Mesh(lampGlowGeo, lampGlowMat);
      glow.position.set(lx, heightAt(lx, lz) + 7.2, lz);
      g.add(glow);
    }
    // The city park (north-west quadrant): leafy trees, a fountain with
    // a rippling water disc, and benches.
    const parkCX = isl.x - 116;
    const parkCZ = isl.z - 116;
    for (let i = 0; i < 14; i += 1) {
      const a = rng.range(0, Math.PI * 2);
      const rr = rng.range(18, 52);
      const tx = parkCX + Math.cos(a) * rr;
      const tz = parkCZ + Math.sin(a) * rr;
      if (Math.hypot(tx - parkCX, tz - parkCZ) < 14) continue; // keep the fountain clear
      g.add(buildTree(tx, Math.max(0.4, heightAt(tx, tz)) - 0.3, tz, rng.range(0.8, 1.3)));
    }
    const fountainBasin = new THREE.Mesh(new THREE.CylinderGeometry(11, 12, 2.4, 20),
      new THREE.MeshStandardMaterial({
        map: T.concrete || null, color: T.concrete ? 0xffffff : 0x9a9a96, roughness: 0.9,
      }));
    fountainBasin.position.set(parkCX, heightAt(parkCX, parkCZ) + 1.2, parkCZ);
    g.add(fountainBasin);
    const fountainWater = new THREE.Mesh(new THREE.CircleGeometry(10, 20),
      new THREE.MeshStandardMaterial({
        map: T.waterFountain || null, color: T.waterFountain ? 0xffffff : 0x3f8fbf,
        roughness: 0.25, metalness: 0.1,
      }));
    fountainWater.rotation.x = -Math.PI / 2;
    fountainWater.position.set(parkCX, heightAt(parkCX, parkCZ) + 2.5, parkCZ);
    g.add(fountainWater);
    const spire = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 1.4, 7, 8), monumentMat);
    spire.position.set(parkCX, heightAt(parkCX, parkCZ) + 6, parkCZ);
    g.add(spire);
    const benchGeo = new THREE.BoxGeometry(4, 0.5, 1.4);
    const benchMat = new THREE.MeshStandardMaterial({ color: 0x6b4423, roughness: 0.9 });
    for (const [bx, bz, rot] of [[-20, 0, 0], [20, 0, 0], [0, -20, Math.PI / 2], [0, 20, Math.PI / 2]]) {
      const bench = new THREE.Mesh(benchGeo, benchMat);
      bench.position.set(parkCX + bx, heightAt(parkCX + bx, parkCZ + bz) + 0.6, parkCZ + bz);
      bench.rotation.y = rot;
      g.add(bench);
    }
    // Night market along the south street: stalls with striped awnings
    // and warm glowing fronts.
    const awningMat = new THREE.MeshStandardMaterial({
      map: T.marketAwning || null, color: T.marketAwning ? 0xffffff : 0xd63b2b,
      roughness: 0.85, side: THREE.DoubleSide,
    });
    const stallBodyMat = new THREE.MeshStandardMaterial({ color: 0x4a3524, roughness: 0.9 });
    const stallGlowMat = new THREE.MeshBasicMaterial({ color: 0xffb36b });
    const stallBodyGeo = new THREE.BoxGeometry(6, 3, 4);
    const awningGeo = new THREE.PlaneGeometry(7.5, 4.5);
    for (let i = 0; i < 10; i += 1) {
      const sx = isl.x - 108 + i * 24;
      const sz = isl.z + 152;
      const sy = heightAt(sx, sz);
      const body = new THREE.Mesh(stallBodyGeo, stallBodyMat);
      body.position.set(sx, sy + 1.5, sz);
      g.add(body);
      const glow = new THREE.Mesh(new THREE.PlaneGeometry(5, 1.6), stallGlowMat);
      glow.position.set(sx, sy + 1.8, sz - 2.05);
      g.add(glow);
      const awn = new THREE.Mesh(awningGeo, awningMat);
      awn.rotation.x = -Math.PI / 2 + 0.5;
      awn.position.set(sx, sy + 3.6, sz - 0.6);
      g.add(awn);
    }
    // Street lamps at the four main intersections: poles on the ground,
    // warm glowing heads.
    for (const [lx, lz] of [[-87, -87], [87, -87], [-87, 87], [87, 87], [-29, 29], [29, -29]]) {
      const x = isl.x + lx;
      const z = isl.z + lz;
      const pole = new THREE.Mesh(lampPoleGeo, lampPoleMat);
      pole.position.set(x, heightAt(x, z) + 3.5, z);
      g.add(pole);
      const glow = new THREE.Mesh(lampGlowGeo, lampGlowMat);
      glow.position.set(x, heightAt(x, z) + 7.2, z);
      g.add(glow);
    }
    // Traffic lights at four intersections: tiny red/green dots.
    const lightRed = new THREE.MeshBasicMaterial({ color: 0xff4444 });
    const lightGreen = new THREE.MeshBasicMaterial({ color: 0x33ff77 });
    for (const [lx, lz, mat] of [
      [-58, -58, lightRed], [58, -58, lightGreen], [-58, 58, lightGreen], [58, 58, lightRed],
    ]) {
      const l = new THREE.Mesh(new THREE.SphereGeometry(1.4, 8, 6), mat);
      l.position.set(isl.x + lx, heightAt(isl.x + lx, isl.z + lz) + 6, isl.z + lz);
      g.add(l);
    }
    // Harbour pier with docked boats on the south shore, at the water's
    // edge where the land meets the sea.
    const pier = new THREE.Mesh(new THREE.BoxGeometry(90, 1.2, 8), streetMat);
    pier.position.set(isl.x, 1.2, isl.z + isl.r - 8);
    g.add(pier);
    // Bridge to Bridge Isle: deck, two tall towers that reach the water,
    // and lamp dots along the deck.
    const deck = new THREE.Mesh(new THREE.BoxGeometry(110, 2.5, 12), streetMat);
    deck.position.set(12, 14, isl.z + 180);
    g.add(deck);
    for (const bx of [-30, 55]) {
      const tower = new THREE.Mesh(new THREE.BoxGeometry(6, 48, 6), facadeTopMat);
      tower.position.set(bx, 24, isl.z + 180);
      g.add(tower);
      const topLight = new THREE.Mesh(new THREE.SphereGeometry(1.2, 8, 6),
        new THREE.MeshBasicMaterial({ color: 0xff4444 }));
      topLight.position.set(bx, 49, isl.z + 180);
      g.add(topLight);
    }
    for (let i = 0; i < 7; i += 1) {
      const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.8, 8, 6), lampGlowMat);
      lamp.position.set(-36 + i * 16, 16.2, isl.z + 180);
      g.add(lamp);
    }
    // Airport: lit runway strip + control tower on the east edge, both
    // on the plateau land.
    const runway = new THREE.Mesh(new THREE.BoxGeometry(16, 1.2, 170),
      new THREE.MeshStandardMaterial({ color: 0x3a3f4a, roughness: 0.95 }));
    runway.position.set(isl.x + 180, topY + 0.8, isl.z);
    g.add(runway);
    // Asphalt top with painted centreline and threshold marks, so the
    // runway reads as a real strip from the air. The texture is
    // landscape, so it is rotated to run along the strip.
    if (T.runway) {
      // The shared runway texture, rotated once to run along the strip.
      // (Cloning it and marking the clone for update before the image
      // loads logs a THREE warning; the loader marks it itself on load.)
      T.runway.center.set(0.5, 0.5);
      T.runway.rotation = Math.PI / 2;
      const rwTop = new THREE.Mesh(
        new THREE.PlaneGeometry(16, 170),
        new THREE.MeshStandardMaterial({ map: T.runway, roughness: 0.9 }),
      );
      rwTop.rotation.x = -Math.PI / 2;
      rwTop.position.set(isl.x + 180, topY + 1.45, isl.z);
      g.add(rwTop);
    }
    const edgeMat = new THREE.MeshBasicMaterial({ color: 0xffd94d });
    for (let i = 0; i < 9; i += 1) {
      for (const side of [-1, 1]) {
        const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.9, 8, 6), edgeMat);
        lamp.position.set(isl.x + 180 + side * 9, topY + 1.9, isl.z - 76 + i * 19);
        g.add(lamp);
      }
    }
    const ctX = isl.x + 150;
    const ctZ = isl.z + 80;
    const ctBase = new THREE.Mesh(new THREE.CylinderGeometry(3.5, 4.5, 26, 10), facadeTopMat);
    ctBase.position.set(ctX, heightAt(ctX, ctZ) + 13, ctZ);
    g.add(ctBase);
    const ctTop = new THREE.Mesh(new THREE.CylinderGeometry(5.5, 4.5, 5, 10), towerGlassMat);
    ctTop.position.set(ctX, heightAt(ctX, ctZ) + 28, ctZ);
    g.add(ctTop);
    return g;
  }

  // Sky dome: a photographic sky texture per time of day (gradient +
  // painted cloud bands), falling back to the canvas gradient until the
  // file texture has loaded.
  function domeTextureFor(key) {
    if (T.sky && T.sky[key] && T.sky[key].image) return T.sky[key];
    return skyTexture(SKIES[key] || sky);
  }
  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(5200, 24, 12),
    new THREE.MeshBasicMaterial({ map: domeTextureFor('day'), side: THREE.BackSide, fog: false }),
  );
  group.add(dome);
  // Sun sprite: positioned every frame far away in the sun's direction
  // (see render.draw); it must never sit at the world origin.
  const sun = new THREE.Sprite(new THREE.SpriteMaterial({
    map: sunTexture(), transparent: true, fog: false, depthWrite: false,
  }));
  sun.scale.set(320, 320, 1);
  group.add(sun);
  // Sea: a large plane whose vertices ripple gently, now with a
  // photographic colour texture and a wave normal map for sun glitter.
  // Specular is kept moderate and the normal map does the sparkling, so
  // no huge white beam ever appears. The textures scroll slowly, so the
  // water feels alive instead of painted on.
  const seaGeo = new THREE.PlaneGeometry(9000, 9000, 48, 48);
  seaGeo.rotateX(-Math.PI / 2);
  const seaBase = seaGeo.attributes.position.array.slice();
  const seaMat = new THREE.MeshPhongMaterial({
    map: T.seaColor || null, normalMap: T.seaNormal || null, normalScale: new THREE.Vector2(0.12, 0.12),
    color: T.seaColor ? 0xffffff : sky.sea, shininess: 14, specular: 0x224455,
    transparent: true, opacity: 0.96,
  });
  const sea = new THREE.Mesh(seaGeo, seaMat);
  sea.position.set(0, 0, -2600);
  sea.receiveShadow = true;
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
    glitterMat.opacity = key === 'day' ? 0.06 : key === 'dusk' ? 0.12 : 0.16;
    glitterMat.color.setHex(key === 'day' ? 0xfff3c4 : 0xffc46b);
  }

  // Islands, sand rims, palms, huts, volcano, lighthouse, runway, airstrip.
  // The detail texture is a bump map on the islands: the vertex colours
  // keep the sand/grass/rock zoning, while the bump adds photographic
  // grain without shifting the colours.
  const islandMat = new THREE.MeshStandardMaterial({
    vertexColors: true, bumpMap: T.terrainDetail || null, bumpScale: 0.9,
    normalMap: T.terrainNormal || null, normalScale: new THREE.Vector2(0.5, 0.5),
    roughness: 0.95, metalness: 0,
  });
  const sandMat = new THREE.MeshStandardMaterial({
    map: T.sand || null, color: T.sand ? 0xffffff : PALETTE.sand, roughness: 0.95,
    transparent: true, opacity: 0.55,
  });
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
    mesh.receiveShadow = true;
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
        new THREE.MeshStandardMaterial({
          map: T.volcanoDetail || T.basalt || null,
          bumpMap: T.basalt || null, bumpScale: 0.7,
          color: T.volcanoDetail || T.basalt ? 0xffffff : PALETTE.volcano, roughness: 1,
        }));
      cone.castShadow = true;
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
      const towerMat = new THREE.MeshStandardMaterial({
        map: T.lighthousePaint || null, color: T.lighthousePaint ? 0xffffff : 0xf8f4ec,
        roughness: 0.7,
      });
      const tower = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 4.4, 16, 12), towerMat);
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
      // The keeper's cottages at the foot of the lighthouse.
      group.add(buildHut(isl.x - 22, Math.max(0.4, heightAt(isl.x - 22, isl.z + 26)) - 0.2, isl.z + 26, 0.4));
      group.add(buildHut(isl.x + 24, Math.max(0.4, heightAt(isl.x + 24, isl.z + 30)) - 0.2, isl.z + 30, -0.7));
    }
    if (isl.kind === 'cliff') {
      // Jagged rock spires on the cliff islands, textured with the
      // vertical-striation cliff rock, so the canyon walls read as rock.
      const cliffMat = new THREE.MeshStandardMaterial({
        map: T.cliffRock || null, color: T.cliffRock ? 0xffffff : PALETTE.rock,
        roughness: 1,
      });
      for (let i = 0; i < 3; i += 1) {
        const a = rng.range(0, Math.PI * 2);
        const rr = isl.r * rng.range(0.3, 0.6);
        const sx = isl.x + Math.cos(a) * rr;
        const sz = isl.z + Math.sin(a) * rr;
        const spire = new THREE.Mesh(new THREE.ConeGeometry(
          rng.range(9, 16), rng.range(38, 62), 7), cliffMat);
        spire.position.set(sx, Math.max(0.4, heightAt(sx, sz)) + 16, sz);
        spire.rotation.z = rng.range(-0.12, 0.12);
        spire.castShadow = true;
        group.add(spire);
      }
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
      if (T.runway) {
        T.runway.center.set(0.5, 0.5);
        T.runway.rotation = Math.PI / 2;
        const rwTop = new THREE.Mesh(
          new THREE.PlaneGeometry(18, 130),
          new THREE.MeshStandardMaterial({ map: T.runway, roughness: 0.9 }),
        );
        rwTop.rotation.x = -Math.PI / 2;
        rwTop.position.set(isl.x, topY + 1.05, isl.z);
        group.add(rwTop);
      }
    }
    if (isl.kind === 'memorial') {
      const stoneMat = new THREE.MeshStandardMaterial({
        map: T.memorialStone || null, color: T.memorialStone ? 0xffffff : 0xf8f4ec,
        roughness: 0.55,
      });
      const stone = new THREE.Mesh(new THREE.BoxGeometry(6, 9, 2), stoneMat);
      stone.position.set(isl.x, topY + 4.5, isl.z);
      group.add(stone);
      const orb = new THREE.Mesh(new THREE.SphereGeometry(2.2, 12, 10),
        new THREE.MeshBasicMaterial({ color: 0xffe9a0 }));
      orb.position.set(isl.x, topY + 11, isl.z);
      group.add(orb);
    }
    if (isl.kind === 'city') {
      group.add(buildCity(isl));
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
  const wakeMat = new THREE.MeshBasicMaterial({
    map: T.seaSpray || null, color: 0xffffff, transparent: true, opacity: 0.35, depthWrite: false,
  });
  const boatRoutes = [
    { cx: 0, cz: -400, r: 320, speed: 0.03, phase: 0 },
    { cx: -500, cz: -1200, r: 260, speed: -0.04, phase: 2 },
    { cx: 600, cz: -1900, r: 300, speed: 0.035, phase: 4 },
    { cx: 0, cz: -3200, r: 340, speed: -0.03, phase: 1 },
    { cx: -340, cz: -2800, r: 260, speed: 0.04, phase: 3 },
    { cx: 900, cz: -2600, r: 280, speed: -0.035, phase: 5 },
    { cx: -1200, cz: -3200, r: 300, speed: 0.032, phase: 1.5 },
    { cx: 300, cz: -4600, r: 320, speed: -0.028, phase: 4.8 },
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
    { x: -340, z: -2440, r: 220, y: 140 }, { x: -140, z: -5100, r: 160, y: 160 },
  ];
  for (let i = 0; i < 12; i += 1) {
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
  // Civilian air traffic: three small airliners on fixed circular
  // routes, so the sky feels busy even between missions.
  const traffic = [];
  const trafficMat = new THREE.MeshPhongMaterial({ color: 0xe8ecf2, shininess: 40 });
  const trafficTailMat = new THREE.MeshPhongMaterial({ color: 0x2f6fb2, shininess: 40 });
  const trafficRoutes = [
    { cx: -200, cz: -1200, r: 500, y: 210, speed: 0.05, phase: 0 },
    { cx: 400, cz: -3200, r: 620, y: 260, speed: -0.04, phase: 2.5 },
    { cx: -700, cz: -4200, r: 540, y: 230, speed: 0.045, phase: 4.5 },
    { cx: 200, cz: -600, r: 420, y: 190, speed: -0.055, phase: 1.2 },
    { cx: -900, cz: -1800, r: 480, y: 280, speed: 0.038, phase: 5.5 },
  ];
  for (const route of trafficRoutes) {
    const t = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 14, 10), trafficMat);
    body.rotation.x = Math.PI / 2;
    t.add(body);
    const nose = new THREE.Mesh(new THREE.ConeGeometry(1.6, 3.5, 10), trafficMat);
    nose.rotation.x = Math.PI / 2;
    nose.position.z = 8.5;
    t.add(nose);
    const wings = new THREE.Mesh(new THREE.BoxGeometry(20, 0.3, 3.2), trafficMat);
    t.add(wings);
    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.3, 3.4, 2.4), trafficTailMat);
    fin.position.set(0, 1.8, -6.2);
    t.add(fin);
    group.add(t);
    traffic.push({ group: t, ...route });
  }
  // Floating lanterns for the sunset finale: warm glowing spheres
  // that rise slowly over the sea along the final flight path, close
  // enough to the staged sunset camera (plane near x 120, z -1600,
  // heading north) to actually be visible in the sunset screenshot.
  const lanterns = [];
  const lanternMat = new THREE.MeshBasicMaterial({ color: 0xffb36b, transparent: true, opacity: 0.9 });
  const lanternGeo = new THREE.SphereGeometry(3.2, 8, 6);
  for (let i = 0; i < 24; i += 1) {
    const l = new THREE.Mesh(lanternGeo, lanternMat);
    const a = rng.range(0, Math.PI * 2);
    const rr = rng.range(40, 320);
    l.position.set(120 + Math.cos(a) * rr, rng.range(50, 130), -2050 + Math.sin(a) * rr);
    l.visible = false;
    group.add(l);
    lanterns.push({ mesh: l, speed: rng.range(1.5, 3.5), baseY: l.position.y });
  }
  // Fireworks over Kota Langit for the sunset finale: glowing star
  // sprites that hang above the city and pulse, so the final mission
  // ends under a small festival sky. Visible only at sunset.
  const fireworks = [];
  if (T.fireworkStar) {
    const fwCols = [0xffb36b, 0xff6b8a, 0x9fe8ff, 0xffe9a0, 0xb79aff, 0x7dff9a];
    for (let i = 0; i < 6; i += 1) {
      const mat = new THREE.SpriteMaterial({
        map: T.fireworkStar, color: fwCols[i % fwCols.length],
        transparent: true, opacity: 0.9, depthWrite: false,
        blending: THREE.AdditiveBlending, fog: false,
      });
      const s = new THREE.Sprite(mat);
      const a = (i / 6) * Math.PI * 2 + 0.4;
      s.position.set(-340 + Math.cos(a) * 170, 165 + (i % 3) * 28, -2440 + Math.sin(a) * 170);
      s.scale.set(46, 46, 1);
      s.visible = false;
      group.add(s);
      fireworks.push({ sprite: s, phase: i * 1.1, base: 46 });
    }
  }
  // Clouds: photographic billboards, not flat grey blobs. Each cloud is
  // a sprite with a soft procedural cloud texture, so it reads as a real
  // cloud from any angle and at any light. Three variants keep them from
  // looking cloned.
  const cloudTexs = [T.cloud, T.cloudB, T.cloudC, T.cloudD, T.cloudE, T.cloudF].filter(Boolean);
  const cloudMats = cloudTexs.map((t) => new THREE.SpriteMaterial({
    map: t, transparent: true, opacity: 0.6, depthWrite: false, fog: true,
  }));
  const stormMat = new THREE.SpriteMaterial({
    map: T.stormCloud || null, color: T.stormCloud ? 0xffffff : 0x555566,
    transparent: true, opacity: 0.85, depthWrite: false, fog: true,
  });
  const stormMat2 = new THREE.SpriteMaterial({
    map: T.stormCloud2 || null, color: T.stormCloud2 ? 0xffffff : 0x555566,
    transparent: true, opacity: 0.85, depthWrite: false, fog: true,
  });
  const clouds = [];
  function makeCloud(mat, cx, cy, cz, scale) {
    const s = new THREE.Sprite(mat);
    s.position.set(cx, cy, cz);
    s.scale.set(220 * scale, 78 * scale, 1);
    group.add(s);
    clouds.push(s);
    return s;
  }
  for (let i = 0; i < 18; i += 1) {
    makeCloud(cloudMats[i % cloudMats.length] || stormMat,
      rng.range(-2600, 2600), rng.range(210, 380), rng.range(-5600, 400), rng.range(0.7, 1.4));
  }
  const stormClouds = [];
  for (let i = 0; i < 8; i += 1) {
    stormClouds.push(makeCloud(i % 2 ? stormMat2 : stormMat, rng.range(-450, 450), rng.range(150, 230), rng.range(-2600, -1500), rng.range(1.1, 1.8)));
  }

  let skyKey = 'day';
  function setSky(key) {
    const s = SKIES[key] || SKIES.day;
    skyKey = key;
    // Photographic sky file when it has loaded, else the gradient.
    dome.material.map = domeTextureFor(key);
    dome.material.needsUpdate = true;
    // With a colour texture on the sea, the tint must stay light or the
    // map goes nearly black at dusk: white by day, warm tints at dusk.
    seaMat.color.setHex(key === 'day' ? 0xffffff : key === 'dusk' ? 0xffd0b0 : 0xffc0a0);
    sun.material.color.setHex(s.sun);
    if (beam) beam.material.opacity = key === 'day' ? 0.08 : 0.22;
    for (const l of lanterns) l.mesh.visible = key === 'sunset';
    for (const f of fireworks) f.sprite.visible = key === 'sunset';
    for (const m of cloudMats) m.color.setHex(key === 'day' ? 0xffffff : 0xffd9c4);
    return s;
  }
  function update(dt, time) {
    // Scroll the sea textures slowly, so the water feels alive.
    if (T.seaColor) { T.seaColor.offset.x += dt * 0.004; T.seaColor.offset.y += dt * 0.0015; }
    if (T.seaNormal) { T.seaNormal.offset.x -= dt * 0.006; T.seaNormal.offset.y += dt * 0.002; }
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
    for (const t of traffic) {
      const a = time * t.speed + t.phase;
      t.group.position.set(t.cx + Math.cos(a) * t.r, t.y, t.cz + Math.sin(a) * t.r);
      t.group.rotation.y = -a + (t.speed > 0 ? 0 : Math.PI);
    }
    if (skyKey === 'sunset') {
      for (const l of lanterns) {
        l.mesh.position.y += l.speed * dt;
        if (l.mesh.position.y > 110) l.mesh.position.y = 6;
        l.mesh.material.opacity = 0.75 + Math.sin(time * 2 + l.baseY) * 0.15;
      }
      for (const f of fireworks) {
        const pulse = 0.75 + 0.25 * Math.sin(time * 2.2 + f.phase);
        f.sprite.scale.set(f.base * pulse, f.base * pulse, 1);
        f.sprite.material.opacity = 0.55 + 0.35 * pulse;
      }
    }
  }
  return { group, sea, setSky, update, lighthouseTop, volcanoTop, stormClouds, sun, setGlitter };
}
