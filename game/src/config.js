// Sky Letters (3D) — shared constants: view size, palette, flight tuning.
// One warm painterly anime style across sky, sea and land. The world uses
// Three.js units: x east, y up (altitude), z forward (north is +z, the way
// every island lies). Displayed altitude is alt * 8 feet, speed is knots.
export const VIEW = { width: 1280, height: 720 };
export const STEP = 1 / 60;
export const PALETTE = {
  planeOrange: 0xff7a2f, planeCream: 0xfff3d6, planeRed: 0xd93b2b,
  canopy: 0x9fd8ef, gold: 0xffc93c, goldDeep: 0xe89b0c, fuelGreen: 0x39d97e,
  sand: 0xf2d8a0, grass: 0x7cc46a, grassDark: 0x4f9e57, palm: 0x2f8f4e,
  palmTrunk: 0x8a6f4d, rock: 0x9a8a76, volcano: 0x8a6f5c,
};
export const FLIGHT = {
  minSpeed: 46, cruiseSpeed: 78, maxSpeed: 132, stallSpeed: 42,
  climbRate: 26, sinkRate: 18, turnRate: 1.15, bankMax: 0.62,
  fuelMax: 100, fuelDrain: 0.55, fuelRingBonus: 34,
  safeLandSpeed: 62, safeLandSink: 12, damageHard: 26, damageStall: 12,
};
// Time-of-day looks: sky gradient stops, fog, sea colour, sun colour/height.
export const SKIES = {
  day: {
    skyTop: '#5fb2e6', skyMid: '#a8dcf0', skyLow: '#ffe9b8',
    fog: 0xbfe0ea, sea: 0x2fa8a0, seaDeep: 0x1b7f8e, sun: 0xfff3c4,
    sunPos: [-700, 620, -1400], hemiSky: 0xbfdcff, hemiGround: 0x3f7f6a,
    sunLight: 0xfff2cf, sunIntensity: 1.15, hemiIntensity: 0.75,
  },
  dusk: {
    skyTop: '#3d2b63', skyMid: '#e07856', skyLow: '#ffc46b',
    fog: 0xc97a5e, sea: 0x9a5560, seaDeep: 0x5e3348, sun: 0xffd27a,
    sunPos: [-260, 200, -2600], hemiSky: 0x8a6ab0, hemiGround: 0x5a3a3a,
    sunLight: 0xffc07a, sunIntensity: 0.95, hemiIntensity: 0.55,
  },
  sunset: {
    skyTop: '#2c2350', skyMid: '#c65a6e', skyLow: '#ffb36b',
    fog: 0xd98a6a, sea: 0xa85a52, seaDeep: 0x6e3548, sun: 0xffb36b,
    sunPos: [180, 150, -2900], hemiSky: 0x9a7ab0, hemiGround: 0x6a4040,
    sunLight: 0xffb36b, sunIntensity: 0.9, hemiIntensity: 0.5,
  },
};
export const MISSION_NAMES = [
  'For Grandma Sari', 'Birthday at the Lighthouse', 'Two Brothers',
  'A Love Letter, Unsent for Ten Years', 'The Last Letter',
];
// Pilot skills: name, key, cooldown (s) and active duration (s). Shown in
// the HUD with a cooldown bar; tuned so no mission can be trivialised.
export const SKILLS = [
  { id: 'boost', name: 'Sky Boost', key: '1', cooldown: 8, duration: 2.2, desc: 'Turbo burst — costs a little fuel' },
  { id: 'roll', name: 'Barrel Roll', key: '2 / Q', cooldown: 6, duration: 0.9, desc: 'Full roll — dodges storms, brief protection' },
  { id: 'flare', name: 'Flare Burst', key: '3 / F', cooldown: 10, duration: 1.2, desc: 'Bright flare — clears the storm ahead' },
  { id: 'glide', name: 'Feather Glide', key: '4 / E', cooldown: 9, duration: 4, desc: 'Slow descent, steady wings for a gentle landing' },
];
export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';
