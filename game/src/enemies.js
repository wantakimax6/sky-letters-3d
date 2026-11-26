// Sky Letters (3D) — enemy drones. Small dark rogue jets with red
// lights that chase the player in missions 3, 4 and 5, fire slow tracer
// shots, and can be shot down with the Lock-On Cannon. This file only
// draws: the drones' positions, health and tracers live in world.js,
// so what the pilot sees is exactly what the flight model feels.
// A yellow wireframe diamond marks the drone the cannon has locked.
export function createEnemies(scene) {
  const droneGeo = {
    body: new THREE.ConeGeometry(0.9, 5.5, 8),
    wings: new THREE.BoxGeometry(7.5, 0.18, 1.8),
    fin: new THREE.BoxGeometry(0.18, 2.0, 1.6),
  };
  const bodyMat = new THREE.MeshPhongMaterial({ color: 0x2b2b33, shininess: 40 });
  const wingMat = new THREE.MeshPhongMaterial({ color: 0x3d3d48, shininess: 30 });
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0xff2222 });
  const glowMat = new THREE.MeshBasicMaterial({ color: 0xff5522, transparent: true, opacity: 0.8 });

  const drones = [];
  for (let i = 0; i < 6; i += 1) {
    const g = new THREE.Group();
    const body = new THREE.Mesh(droneGeo.body, bodyMat);
    body.rotation.x = Math.PI / 2;
    g.add(body);
    const wings = new THREE.Mesh(droneGeo.wings, wingMat);
    wings.position.set(0, 0, -0.4);
    g.add(wings);
    const fin = new THREE.Mesh(droneGeo.fin, bodyMat);
    fin.position.set(0, 1.0, -1.6);
    g.add(fin);
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.65, 8, 6), eyeMat);
    eye.position.set(0, 0.3, 1.6);
    g.add(eye);
    const glow = new THREE.Mesh(new THREE.SphereGeometry(0.7, 8, 6), glowMat);
    glow.position.set(0, 0, -2.9);
    g.add(glow);
    // Drones are small at combat range: draw them 1.4x so a locked drone
    // actually reads in a screenshot.
    g.scale.setScalar(1.4);
    g.visible = false;
    scene.add(g);
    drones.push({ group: g, eye, glow });
  }

  // Tracer pool: orange-red enemy shots, pale-yellow cannon shots.
  const tracers = [];
  const tracerGeo = new THREE.SphereGeometry(1.0, 8, 6);
  for (let i = 0; i < 28; i += 1) {
    const m = new THREE.Mesh(tracerGeo, new THREE.MeshBasicMaterial({ color: 0xff5522, transparent: true, opacity: 0.95 }));
    m.visible = false;
    scene.add(m);
    tracers.push(m);
  }

  // Lock-on diamond over the locked drone.
  const lock = new THREE.Mesh(
    new THREE.OctahedronGeometry(6),
    new THREE.MeshBasicMaterial({ color: 0xffd94d, wireframe: true, transparent: true, opacity: 0.9 }),
  );
  lock.visible = false;
  scene.add(lock);

  function update(state, time) {
    const list = state.enemies || [];
    for (let i = 0; i < drones.length; i += 1) {
      const d = drones[i];
      const e = list[i];
      if (!e || !e.active) { d.group.visible = false; continue; }
      d.group.visible = true;
      d.group.position.set(e.x, e.y, e.z);
      // Face along the drone's motion toward the player.
      const p = state.plane;
      const dx = p.x - e.x;
      const dz = p.z - e.z;
      d.group.rotation.y = Math.PI - Math.atan2(dx, -dz);
      d.group.rotation.z = Math.sin(time * 2 + i * 1.7) * 0.15;
      const pulse = 0.7 + Math.sin(time * 6 + i) * 0.3;
      d.eye.scale.setScalar(pulse);
      d.glow.scale.setScalar(0.8 + Math.sin(time * 12 + i) * 0.25);
    }
    const tr = state.tracers || [];
    for (let i = 0; i < tracers.length; i += 1) {
      const m = tracers[i];
      const t = tr[i];
      if (!t || t.life <= 0) { m.visible = false; continue; }
      m.visible = true;
      m.position.set(t.x, t.y, t.z);
      m.material.color.setHex(t.from === 'cannon' ? 0xffe9a0 : 0xff5522);
      m.scale.setScalar(t.from === 'cannon' ? 0.8 : 1.1);
    }
    const li = state.lockTarget;
    if (typeof li === 'number' && li >= 0 && list[li] && list[li].active) {
      const e = list[li];
      lock.visible = true;
      lock.position.set(e.x, e.y, e.z);
      lock.rotation.y = time * 2;
      lock.scale.setScalar(1 + Math.sin(time * 6) * 0.12);
    } else {
      lock.visible = false;
    }
  }
  return { update };
}
