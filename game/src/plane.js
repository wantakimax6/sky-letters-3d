// Sky Letters (3D) — Pipit, the orange-and-cream seaplane, built only
// from Three.js geometry: fuselage, wings, floats, a spinning translucent
// propeller disc and Nara's red scarf trailing behind the cockpit.
// Forward is +z; heading 0 faces north (+z).
export function buildPlane() {
  const orange = new THREE.MeshPhongMaterial({ color: 0xf96a12, shininess: 25 });
  const cream = new THREE.MeshPhongMaterial({ color: 0xfff3d6, shininess: 40 });
  const red = new THREE.MeshPhongMaterial({ color: 0xd93b2b, shininess: 30 });
  const dark = new THREE.MeshPhongMaterial({ color: 0x3a2a20, shininess: 20 });
  const glass = new THREE.MeshPhongMaterial({ color: 0x9fd8ef, shininess: 120, specular: 0xffffff });

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

  // Fuselage: cylinder along z, nose cone, tail cone.
  add(new THREE.CylinderGeometry(1.15, 0.85, 8.5, 14), orange, 0, 0, 0, Math.PI / 2, 0, 0);
  add(new THREE.ConeGeometry(1.15, 2.4, 14), orange, 0, 0, 5.4, Math.PI / 2, 0, 0);
  add(new THREE.ConeGeometry(0.85, 2.6, 14), orange, 0, 0, -5.5, -Math.PI / 2, 0, 0);
  // Red cheatlines along the fuselage sides, so the orange body reads
  // from behind and above instead of washing out to pale tan.
  add(new THREE.BoxGeometry(0.18, 0.55, 7.6), red, -1.08, 0.15, 0.3, 0, 0, 0);
  add(new THREE.BoxGeometry(0.18, 0.55, 7.6), red, 1.08, 0.15, 0.3, 0, 0, 0);
  // Canopy: a glossy bubble over the cockpit.
  const canopy = add(new THREE.SphereGeometry(1.25, 18, 12), glass, 0, 1.05, 1.7, 0, 0, 0);
  canopy.scale.set(0.9, 0.72, 1.5);
  // Main wings with orange tips, tail wings and the vertical fin.
  add(new THREE.BoxGeometry(17, 0.35, 3.4), cream, 0, 0.55, 0.6, 0, 0, 0);
  add(new THREE.BoxGeometry(1.6, 0.38, 3.4), orange, -8.2, 0.55, 0.6, 0, 0, 0);
  add(new THREE.BoxGeometry(1.6, 0.38, 3.4), orange, 8.2, 0.55, 0.6, 0, 0, 0);
  add(new THREE.BoxGeometry(6.5, 0.28, 2.0), cream, 0, 0.5, -4.7, 0, 0, 0);
  add(new THREE.BoxGeometry(0.3, 3.0, 2.2), orange, 0, 1.6, -4.9, 0, 0, 0);
  // A white envelope emblem on the tail fin.
  add(new THREE.BoxGeometry(0.34, 1.0, 1.3), cream, 0, 1.7, -4.9, 0, 0, 0);
  // Floats under the wings, on short struts.
  add(new THREE.CylinderGeometry(0.55, 0.55, 5.5, 10), cream, -2.6, -1.7, 0.8, Math.PI / 2, 0, 0);
  add(new THREE.CylinderGeometry(0.55, 0.55, 5.5, 10), cream, 2.6, -1.7, 0.8, Math.PI / 2, 0, 0);
  add(new THREE.BoxGeometry(0.25, 1.4, 0.25), dark, -2.6, -0.9, 0.8, 0, 0, 0);
  add(new THREE.BoxGeometry(0.25, 1.4, 0.25), dark, 2.6, -0.9, 0.8, 0, 0, 0);
  // Wing-tip navigation lights.
  const navRed = new THREE.MeshBasicMaterial({ color: 0xff2222 });
  const navGreen = new THREE.MeshBasicMaterial({ color: 0x22ff66 });
  add(new THREE.SphereGeometry(0.28, 8, 6), navRed, -8.9, 0.55, 0.6, 0, 0, 0);
  add(new THREE.SphereGeometry(0.28, 8, 6), navGreen, 8.9, 0.55, 0.6, 0, 0, 0);

  // Propeller: two blades plus a translucent spinning disc, so it reads
  // as motion blur instead of a solid bar.
  const prop = new THREE.Group();
  prop.position.set(0, 0, 6.7);
  const bladeMat = new THREE.MeshPhongMaterial({ color: 0x2b2118, shininess: 20 });
  const blade1 = new THREE.Mesh(new THREE.BoxGeometry(0.45, 4.8, 0.12), bladeMat);
  const blade2 = new THREE.Mesh(new THREE.BoxGeometry(0.45, 4.8, 0.12), bladeMat);
  blade2.rotation.z = Math.PI / 2;
  const disc = new THREE.Mesh(
    new THREE.CircleGeometry(2.5, 24),
    new THREE.MeshBasicMaterial({ color: 0xdddddd, transparent: true, opacity: 0.22, side: THREE.DoubleSide }),
  );
  const hub = new THREE.Mesh(new THREE.SphereGeometry(0.45, 10, 8), red);
  prop.add(blade1); prop.add(blade2); prop.add(disc); prop.add(hub);
  group.add(prop);

  // Nara's red scarf: a ribbon of small segments trailing behind the
  // cockpit, waving in the slipstream.
  const scarfSegments = [];
  for (let i = 0; i < 8; i += 1) {
    const seg = new THREE.Mesh(new THREE.BoxGeometry(0.55 - i * 0.03, 0.12, 0.95), red);
    seg.position.set(0, 1.35, -0.6 - i * 0.95);
    group.add(seg);
    scarfSegments.push(seg);
  }

  function update(state, dt, time) {
    const p = state.plane;
    group.position.set(p.x, p.alt, p.z);
    // Nose must point along (sin h, 0, -cos h): yaw is PI - heading,
    // and rolling right (bank > 0) is a positive rotation about the
    // nose axis in the model's own frame.
    group.rotation.y = Math.PI - p.heading;
    group.rotation.x = -p.pitch;
    group.rotation.z = p.bank;
    prop.rotation.z += dt * (10 + p.throttle * 34);
    for (let i = 0; i < scarfSegments.length; i += 1) {
      const seg = scarfSegments[i];
      const k = (i + 1) / scarfSegments.length;
      seg.position.x = Math.sin(time * 3.2 + i * 0.75) * 0.55 * k;
      seg.position.y = 1.35 + Math.sin(time * 2.3 + i * 0.9) * 0.22 * k - k * 0.25;
      seg.rotation.y = Math.sin(time * 2.8 + i * 0.6) * 0.5 * k;
    }
  }
  return { group, update };
}
