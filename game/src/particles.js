// Sky Letters (3D) — small 3D particle bursts: gold sparks when a ring
// is flown, white spray on a splash, grey smoke on a crash, and rain
// that falls around the camera during the dusk mission.
export function createParticles(scene) {
  const pool = [];
  const geo = new THREE.SphereGeometry(1.1, 6, 5);
  for (let i = 0; i < 48; i += 1) {
    const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true }));
    m.visible = false;
    scene.add(m);
    pool.push({ mesh: m, vx: 0, vy: 0, vz: 0, life: 0, max: 1, grow: 0 });
  }
  let cursor = 0;
  function spawn(x, y, z, color, speed, life, size) {
    const p = pool[cursor];
    cursor = (cursor + 1) % pool.length;
    p.mesh.visible = true;
    p.mesh.position.set(x, y, z);
    p.mesh.material.color.setHex(color);
    p.mesh.material.opacity = 1;
    p.mesh.scale.setScalar(size || 1);
    const a = Math.random() * Math.PI * 2;
    const b = Math.random() * Math.PI - Math.PI / 2;
    p.vx = Math.cos(a) * Math.cos(b) * speed;
    p.vy = Math.sin(b) * speed + speed * 0.4;
    p.vz = Math.sin(a) * Math.cos(b) * speed;
    p.life = life;
    p.max = life;
    p.grow = size > 1.6 ? 1.4 : 0;
  }
  function burst(x, y, z, color, count, speed, life, size) {
    for (let i = 0; i < count; i += 1) spawn(x, y, z, color, speed, life, size);
  }
  // Rain: a points cloud that follows the camera and falls forever.
  // A soft round sprite texture, so the drops read as rain, not squares.
  const dropCanvas = document.createElement('canvas');
  dropCanvas.width = 32; dropCanvas.height = 32;
  const dg = dropCanvas.getContext('2d');
  const dgrad = dg.createRadialGradient(16, 16, 1, 16, 16, 15);
  dgrad.addColorStop(0, 'rgba(255,255,255,1)');
  dgrad.addColorStop(0.5, 'rgba(220,232,255,0.7)');
  dgrad.addColorStop(1, 'rgba(220,232,255,0)');
  dg.fillStyle = dgrad;
  dg.fillRect(0, 0, 32, 32);
  const dropTex = new THREE.CanvasTexture(dropCanvas);
  const rainCount = 420;
  const rainPos = new Float32Array(rainCount * 3);
  const rainGeo = new THREE.BufferGeometry();
  rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPos, 3));
  const rain = new THREE.Points(rainGeo, new THREE.PointsMaterial({
    color: 0xcfe0ff, size: 2.6, map: dropTex, transparent: true, opacity: 0.7, depthWrite: false,
  }));
  rain.visible = false;
  rain.frustumCulled = false;
  scene.add(rain);
  let rainOn = false;
  function setRain(on, camPos) {
    // Only re-seed the drops when rain switches on; called every frame
    // while it rains, it must not re-randomise the positions each frame.
    if (on && !rainOn) {
      for (let i = 0; i < rainCount; i += 1) {
        rainPos[i * 3] = camPos.x + (Math.random() - 0.5) * 260;
        // Spread through the visible band around the camera, not just
        // above it: drops seeded only at the top sit above the frame
        // (vertical FOV is +/-30 deg) and never show in a still shot.
        rainPos[i * 3 + 1] = camPos.y + (Math.random() * 120 - 30);
        rainPos[i * 3 + 2] = camPos.z + (Math.random() - 0.5) * 260;
      }
      rainGeo.attributes.position.needsUpdate = true;
    }
    rainOn = on;
    rain.visible = on;
  }
  function update(dt, camPos) {
    for (const p of pool) {
      if (!p.mesh.visible) continue;
      p.life -= dt;
      if (p.life <= 0) { p.mesh.visible = false; continue; }
      p.mesh.position.x += p.vx * dt;
      p.mesh.position.y += p.vy * dt;
      p.mesh.position.z += p.vz * dt;
      p.vy -= 6 * dt;
      p.mesh.material.opacity = p.life / p.max;
      if (p.grow) p.mesh.scale.addScalar(p.grow * dt);
    }
    if (rain.visible) {
      for (let i = 0; i < rainCount; i += 1) {
        rainPos[i * 3 + 1] -= 90 * dt;
        rainPos[i * 3] += 8 * dt;
        // Recycle any drop that has fallen below the camera, or drifted
        // out of the box around the camera, so the rain follows the plane.
        if (rainPos[i * 3 + 1] < camPos.y - 30
          || Math.abs(rainPos[i * 3] - camPos.x) > 140
          || Math.abs(rainPos[i * 3 + 2] - camPos.z) > 140) {
          // Recycle across the visible band, not only at the top: drops
          // recycled only to camPos.y + 90 sit above the frame (vertical
          // FOV is +/-30 deg) and never show in a still shot.
          rainPos[i * 3 + 1] = camPos.y + (Math.random() * 120 - 30);
          rainPos[i * 3] = camPos.x + (Math.random() - 0.5) * 260;
          rainPos[i * 3 + 2] = camPos.z + (Math.random() - 0.5) * 260;
        }
      }
      rainGeo.attributes.position.needsUpdate = true;
    }
  }
  return { burst, setRain, update, isRainOn() { return rain.visible; } };
}
