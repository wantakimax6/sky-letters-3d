// Sky Letters (3D) — a tiny seeded random generator, so the archipelago,
// clouds and screenshots are identical for the same seed.
export function createRandom(seed) {
  let s = seed >>> 0 || 1;
  function next() {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  }
  return {
    next,
    range(lo, hi) { return lo + next() * (hi - lo); },
    pick(list) { return list[Math.floor(next() * list.length)]; },
  };
}
