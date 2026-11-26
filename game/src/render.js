// Sky Letters (3D) — the Three.js scene: renderer, lights, sky and sea,
// the chase camera, ring meshes and the per-frame scene update. The camera
// is smoothed (lerped) behind and above the plane, banks slightly with
// it, and never snaps — it must never fight the pilot.
import { SKIES } from './config.js';
import { MISSION_TARGETS, islandById } from './islands.js';
import { buildTerrain } from './terrain.js';
import { buildPlane } from './plane.js';
import { createParticles } from './particles.js';

export function createRenderer(canvas, rng) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  if ('outputEncoding' in renderer) renderer.outputEncoding = THREE.sRGBEncoding;
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(SKIES.day.fog, 600, 3200);
  const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.5, 6000);
  camera.position.set(0, 70, -30);

  const terrain = buildTerrain(rng);
  scene.add(terrain.group);
  const plane = buildPlane();
  scene.add(plane.group);
  const particles = createParticles(scene);

  const hemi = new THREE.HemisphereLight(SKIES.day.hemiSky, SKIES.day.hemiGround, SKIES.day.hemiIntensity);
  scene.add(hemi);
  const sunLight = new THREE.DirectionalLight(SKIES.day.sunLight, SKIES.day.sunIntensity);
  sunLight.position.set(-700, 620, 1400);
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
  for (let i = 0; i < 8; i += 1) {
    const m = new THREE.Mesh(new THREE.TorusGeometry(20, 1.8, 12, 40), ringMatGold.clone());
    m.visible = false;
    scene.add(m);
    ringMeshes.push(m);
  }
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

  function setSky(key) {
    if (key === skyKey) return;
    skyKey = key;
    const s = terrain.setSky(key);
    scene.fog.color.setHex(s.fog);
    hemi.color.setHex(s.hemiSky);
    hemi.groundColor.setHex(s.hemiGround);
    hemi.intensity = s.hemiIntensity;
    sunLight.color.setHex(s.sunLight);
    sunLight.intensity = s.sunIntensity;
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
    // Forward is -z (standard Three.js): forward = (sin h, 0, -cos h),
    // right = (cos h, 0, sin h), so +x appears on the right of the screen.
    const fx = Math.sin(p.heading);
    const fz = -Math.cos(p.heading);
    const rx = Math.cos(p.heading);
    const rz = Math.sin(p.heading);
    // Chase camera: behind, above and slightly to the side of the plane,
    // smoothed, so the orange fuselage and canopy read in three-quarter view.
    desired.set(p.x - fx * 32 + rx * 6.5, p.alt + 11, p.z - fz * 32 + rz * 6.5);
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
    // Storm clouds only hang over the canyon run (mission 3).
    for (const c of terrain.stormClouds) c.visible = state.missionIndex === 2;
    plane.update(state, 1 / 60, time);
    terrain.update(1 / 60, time);
    particles.update(1 / 60, camera.position);
    renderer.render(scene, camera);
  }
  function snapCamera(state) {
    const p = state.plane;
    const fx = Math.sin(p.heading);
    const fz = -Math.cos(p.heading);
    camPos.set(p.x - fx * 32 + Math.cos(p.heading) * 6.5, p.alt + 11, p.z - fz * 32 + Math.sin(p.heading) * 6.5);
    camInit = true;
  }
  return {
    draw, setSky, snapCamera, particles, terrain, scene, camera,
    setRain(on) { particles.setRain(on, camera.position); },
    rainOn() { return particles.isRainOn(); },
    get webgl() { return !!renderer.getContext(); },
  };
}
