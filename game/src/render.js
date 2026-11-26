// Sky Letters (3D) — the Three.js scene: renderer, lights, sky and sea,
// the chase camera, ring meshes and the per-frame scene update. The camera
// is smoothed (lerped) behind and above the plane, banks slightly with
// it, and never snaps — it must never fight the pilot.
import { SKIES } from './config.js';
import { MISSION_TARGETS, islandById } from './islands.js';
import { buildTerrain } from './terrain.js';
import { buildPlane } from './plane.js';
import { createParticles } from './particles.js';
import { createEnemies } from './enemies.js';
import { loadTextures } from './textures.js';

export function createRenderer(canvas, rng) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  if ('outputEncoding' in renderer) renderer.outputEncoding = THREE.sRGBEncoding;
  // Photographic tone mapping: ACES rolls off the highlights like film,
  // so sunsets and bright sea no longer clip to flat white.
  if ('ACESFilmicToneMapping' in THREE) renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.12;
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(SKIES.day.fog, 800, 5200);
  const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.5, 12000);
  camera.position.set(0, 70, -30);

  const { textures, ready } = loadTextures();
  if (textures.envMap) scene.environment = textures.envMap;
  const terrain = buildTerrain(rng, textures);
  scene.add(terrain.group);
  const plane = buildPlane(textures);
  scene.add(plane.group);
  const particles = createParticles(scene);
  const enemies = createEnemies(scene);

  const hemi = new THREE.HemisphereLight(SKIES.day.hemiSky, SKIES.day.hemiGround, SKIES.day.hemiIntensity);
  scene.add(hemi);
  const sunLight = new THREE.DirectionalLight(SKIES.day.sunLight, SKIES.day.sunIntensity);
  sunLight.position.set(-700, 620, 1400);
  // Real shadows: a 1024 map following the plane, so the jet throws a
  // shadow on the sea and islands below. Kept small for headless speed.
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.set(1024, 1024);
  sunLight.shadow.camera.left = -260;
  sunLight.shadow.camera.right = 260;
  sunLight.shadow.camera.top = 260;
  sunLight.shadow.camera.bottom = -260;
  sunLight.shadow.camera.near = 50;
  sunLight.shadow.camera.far = 3000;
  sunLight.shadow.bias = -0.0008;
  scene.add(sunLight);
  scene.add(sunLight.target);

  // Ring meshes: one torus per ring, repositioned from the world state.
  const ringMeshes = [];
  const ringMatGold = new THREE.MeshPhongMaterial({
    color: 0xffc93c, emissive: 0xaa7700, shininess: 80, transparent: true, opacity: 0.95,
  });
  const ringMatFuel = new THREE.MeshPhongMaterial({
    color: 0x39d97e, emissive: 0x0a7a34, shininess: 80, transparent: true, opacity: 0.95,
  });
  for (let i = 0; i < 12; i += 1) {
    const m = new THREE.Mesh(new THREE.TorusGeometry(20, 1.8, 12, 40), ringMatGold.clone());
    m.visible = false;
    scene.add(m);
    ringMeshes.push(m);
  }
  // Flare Burst: a bright glowing sphere at the nose while it burns.
  const flareMesh = new THREE.Mesh(
    new THREE.SphereGeometry(4.5, 12, 10),
    new THREE.MeshBasicMaterial({ color: 0xffe9a0, transparent: true, opacity: 0.9 }),
  );
  flareMesh.visible = false;
  scene.add(flareMesh);
  // A glowing beacon marker above the next target, so the pilot can
  // always see where to fly next.
  const beacon = new THREE.Mesh(
    new THREE.ConeGeometry(3.2, 9, 4),
    new THREE.MeshBasicMaterial({ color: 0xffd94d }),
  );
  beacon.rotation.x = Math.PI;
  scene.add(beacon);

  let skyKey = 'day';
  let camInit = false;
  const camPos = new THREE.Vector3(0, 70, -30);
  const desired = new THREE.Vector3();
  const lookAt = new THREE.Vector3();
  const sunDir = new THREE.Vector3();
  sunDir.set(SKIES.day.sunPos[0], SKIES.day.sunPos[1], SKIES.day.sunPos[2]).normalize();

  function setSky(key, force) {
    if (key === skyKey && !force) return;
    skyKey = key;
    const s = terrain.setSky(key);
    scene.fog.color.setHex(s.fog);
    hemi.color.setHex(s.hemiSky);
    hemi.groundColor.setHex(s.hemiGround);
    hemi.intensity = s.hemiIntensity;
    sunLight.color.setHex(s.sunLight);
    sunLight.intensity = s.sunIntensity;
    renderer.toneMappingExposure = key === 'day' ? 1.12 : key === 'dusk' ? 1.05 : 1.0;
    sunDir.set(s.sunPos[0], s.sunPos[1], s.sunPos[2]).normalize();
  }
  function resize() {
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize);

  function draw(state, time) {
    const p = state.plane;
    // The sky-dome file textures arrive after the first frames: once the
    // loader finishes, re-apply the current sky so the photographic dome
    // replaces the gradient fallback (and so screenshots see it).
    if (!draw._texApplied && textures.sky && textures.sky.day && textures.sky.day.image) {
      draw._texApplied = true;
      const k = skyKey;
      skyKey = '';
      setSky(k);
    }
    // Forward is -z (standard Three.js): forward = (sin h, 0, -cos h),
    // right = (cos h, 0, sin h), so +x appears on the right of the screen.
    const fx = Math.sin(p.heading);
    const fz = -Math.cos(p.heading);
    const rx = Math.cos(p.heading);
    const rz = Math.sin(p.heading);
    // Chase camera: behind, above and slightly to the side of the jet,
    // smoothed, so the long fuselage, canopy and twin fins read in
    // three-quarter view. The jet is longer than the old seaplane, so
    // the camera sits a little further back.
    desired.set(p.x - fx * 36 + rx * 7, p.alt + 12, p.z - fz * 36 + rz * 7);
    if (!camInit) {
      camPos.copy(desired);
      camInit = true;
    }
    const k = 1 - Math.exp(-4.2 * (1 / 60));
    camPos.lerp(desired, k);
    camera.position.copy(camPos);
    lookAt.set(p.x + fx * 42, p.alt + 2, p.z + fz * 42);
    camera.up.set(0, 1, 0);
    camera.lookAt(lookAt);
    camera.rotateZ(-p.bank * 0.28);
    // Lights and sun follow the plane so the scene stays lit everywhere.
    // The sun sprite sits far away in the sun's direction, relative to
    // the camera, so it never lands in the middle of the sea.
    terrain.sun.position.set(
      camera.position.x + sunDir.x * 2400,
      camera.position.y + sunDir.y * 2400,
      camera.position.z + sunDir.z * 2400,
    );
    // The glitter path lies flat on the water toward the sun.
    if (terrain.setGlitter) terrain.setGlitter(camera.position, sunDir, skyKey);
    sunLight.position.set(p.x + sunDir.x * 800, p.alt + sunDir.y * 800 + 200, p.z + sunDir.z * 800);
    sunLight.target.position.set(p.x, p.alt, p.z);
    sunLight.target.updateMatrixWorld();
    // Rings from the world state.
    for (let i = 0; i < ringMeshes.length; i += 1) {
      const m = ringMeshes[i];
      const r = state.rings[i];
      if (!r || r.done) { m.visible = false; continue; }
      m.visible = true;
      m.position.set(r.x, r.y, r.z);
      m.material = r.fuel ? ringMatFuel : ringMatGold;
      m.rotation.y = Math.sin(time * 0.7 + i) * 0.12;
    }
    // Beacon above the next target: the next ring, or the landing island
    // once every ring is flown.
    let bx = 0;
    let by = 40;
    let bz = 0;
    if (state.ringIndex < state.rings.length) {
      const r = state.rings[state.ringIndex];
      bx = r.x; by = r.y; bz = r.z;
    } else {
      const t = islandById(MISSION_TARGETS[state.missionIndex + 1].island);
      bx = t.x; by = 30; bz = t.z;
    }
    beacon.position.set(bx, by + 34 + Math.sin(time * 2) * 2, bz);
    beacon.visible = state.mode === 'fly';
    // Flare Burst glow at the nose while it burns; Sky Boost leaves a
    // trail of speed-line sparks behind the plane.
    const flareSk = state.skills && state.skills.flare;
    flareMesh.visible = !!(flareSk && flareSk.active > 0);
    if (flareMesh.visible) {
      flareMesh.position.set(p.x + fx * 9, p.alt + 1, p.z + fz * 9);
      flareMesh.scale.setScalar(1 + Math.sin(time * 20) * 0.12);
    }
    const boostSk = state.skills && state.skills.boost;
    if (boostSk && boostSk.active > 0) {
      particles.burst(p.x - fx * 12, p.alt + 1, p.z - fz * 12, 0xffe9a0, 2, 6, 0.35, 0.6);
    }
    const rollSk = state.skills && state.skills.roll;
    if (rollSk && rollSk.active > 0) {
      particles.burst(p.x, p.alt, p.z, 0x9fe8ff, 2, 4, 0.3, 0.8);
    }
    // Fireworks over Kota Langit during the sunset finale: a new burst
    // above the city every couple of seconds while the sky is sunset.
    if (skyKey === 'sunset' && Math.floor(time * 0.5) !== draw._fwLast) {
      draw._fwLast = Math.floor(time * 0.5);
      const a = Math.random() * Math.PI * 2;
      const col = [0xffb36b, 0xff6b8a, 0x9fe8ff, 0xffe9a0, 0xb79aff][Math.floor(Math.random() * 5)];
      particles.burst(-340 + Math.cos(a) * 170, 175 + Math.random() * 50,
        -2440 + Math.sin(a) * 170, col, 22, 26, 1.1, 1.5);
    }
    // Storm clouds only hang over the canyon run (mission 3).
    for (const c of terrain.stormClouds) c.visible = state.missionIndex === 2;
    plane.update(state, 1 / 60, time);
    enemies.update(state, time);
    terrain.update(1 / 60, time);
    particles.update(1 / 60, camera.position);
    renderer.render(scene, camera);
  }
  function snapCamera(state) {
    const p = state.plane;
    const fx = Math.sin(p.heading);
    const fz = -Math.cos(p.heading);
    camPos.set(p.x - fx * 36 + Math.cos(p.heading) * 7, p.alt + 12, p.z - fz * 36 + Math.sin(p.heading) * 7);
    camInit = true;
  }
  return {
    draw, setSky, snapCamera, particles, terrain, scene, camera, ready,
    setRain(on) { particles.setRain(on, camera.position); },
    rainOn() { return particles.isRainOn(); },
    get webgl() { return !!renderer.getContext(); },
  };
}
