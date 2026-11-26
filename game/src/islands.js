// Sky Letters (3D) — the archipelago, with no Three.js in it: island data
// and the pure terrain-height function the flight model uses for crashes
// and landings. The plane starts at (0, 60, 0) heading north (+z); every
// island sits ahead. terrain.js builds the visible meshes from this data.
export const ISLANDS = [
  { id: 'home', name: 'Home Bay', x: 0, z: 40, r: 150, kind: 'village', h: 26 },
  { id: 'senja', name: 'Pulau Senja', x: 0, z: -900, r: 130, kind: 'runway-water', h: 18 },
  { id: 'lighthouse', name: 'Lighthouse Island', x: 280, z: -1450, r: 95, kind: 'lighthouse', h: 30 },
  { id: 'canyon-west', name: 'Canyon West', x: -330, z: -1950, r: 170, kind: 'cliff', h: 90 },
  { id: 'canyon-east', name: 'Canyon East', x: 330, z: -2050, r: 170, kind: 'cliff', h: 95 },
  { id: 'mountain', name: 'Mount Api', x: 0, z: -2650, r: 150, kind: 'airstrip', h: 120 },
  { id: 'memorial', name: 'Memorial Hill', x: -90, z: -3250, r: 115, kind: 'memorial', h: 55 },
  { id: 'palm-a', name: 'Palm Cay', x: -560, z: -700, r: 80, kind: 'palm', h: 16 },
  { id: 'palm-b', name: 'Turtle Cay', x: 620, z: -1100, r: 85, kind: 'palm', h: 16 },
  { id: 'volcano', name: 'Ember Isle', x: -700, z: -2400, r: 130, kind: 'volcano', h: 110 },
  { id: 'palm-c', name: 'Coral Cay', x: 560, z: -2900, r: 75, kind: 'palm', h: 14 },
];
export function islandById(id) { return ISLANDS.find((i) => i.id === id); }
// Where each mission ends: the island and the kind of landing surface.
export const MISSION_TARGETS = {
  1: { island: 'senja', land: 'water' },
  2: { island: 'lighthouse', land: 'water' },
  3: { island: 'canyon-east', land: 'water' },
  4: { island: 'mountain', land: 'strip' },
  5: { island: 'memorial', land: 'hill' },
};
// A smooth bump so the mesh and the flight model agree: 1 at the centre,
// 0 at the rim, with a flat top on the mountain airstrip.
function profile(d, r, kind) {
  const t = Math.min(1, d / r);
  let h = Math.cos(t * Math.PI * 0.5);
  h *= h;
  if (kind === 'airstrip' && t < 0.35) h = 0.55;
  if (kind === 'cliff') h = Math.pow(h, 0.7);
  return h;
}
// Small deterministic wobble so islands are not perfect cones.
function wobble(x, z) {
  return 0.12 * Math.sin(x * 0.021 + 1.7) * Math.cos(z * 0.017 - 0.6)
    + 0.08 * Math.sin(x * 0.043 - z * 0.031);
}
// Ground height at (x, z); 0 is sea level. The visible meshes use the
// same function, so what the pilot sees is what the physics feels.
export function heightAt(x, z) {
  let h = 0;
  for (const isl of ISLANDS) {
    const dx = x - isl.x;
    const dz = z - isl.z;
    const d = Math.hypot(dx, dz);
    if (d >= isl.r) continue;
    const p = profile(d, isl.r, isl.kind);
    h = Math.max(h, isl.h * p * (1 + wobble(x, z) * p));
  }
  return h;
}
