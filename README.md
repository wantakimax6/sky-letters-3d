# Sky Letters — a 3D fighter-jet letter-delivery game

[![make.fun · best-flight-game-20261126-0057](https://make.fun/badge/best-flight-game-20261126-0057.svg)](https://make.fun/bounty/best-flight-game-20261126-0057?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057)
[![rank](https://make.fun/badge/best-flight-game-20261126-0057/wantakimax6/sky-letters-3d/rank.svg)](https://make.fun/bounty/best-flight-game-20261126-0057/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057)
[![reward](https://make.fun/badge/best-flight-game-20261126-0057/wantakimax6/sky-letters-3d/reward.svg)](https://make.fun/bounty/best-flight-game-20261126-0057?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057)
[![repo](https://img.shields.io/badge/repo-wantakimax6%2Fsky--letters--3d-blue)](https://github.com/wantakimax6/sky-letters-3d)
[![license](https://img.shields.io/badge/license-MIT-green)](LICENSE)

**Sky Letters** is a real-3D flight game built with Three.js for the
[make.fun bounty **best-flight-game-20261126-0057**](https://make.fun/bounty/best-flight-game-20261126-0057)
("Make the best flight game"). Everything in the game is in English.
It runs entirely offline: the Three.js library is vendored in
`game/vendor/three.min.js`, and the game makes no network requests.

## The story

The radio network has failed across the islands, so the mail must fly.
**Nara**, 19, red scarf, brown bun, flies her late mother's
decommissioned fighter jet — converted to a letter courier, callsign
**Pipit** — across a sunny Indonesian archipelago, delivering handwritten
letters that the radio can no longer carry. Five letters, five flights —
and the last one is her own.

## Characters

- **Nara** — 19, pilot of Pipit, taught to fly by her mother.
- **Grandma Sari** — waits at Pulau Senja for a letter from her granddaughter.
- **Mika** — 12, birthday at the lighthouse.
- **Mr. Budi and Mr. Agus** — two fisherman brothers who have not spoken
  in years, until one apology letter crosses the canyon between them.
- **Nara's mother** — gone, but still flying with her daughter.

Each mission opens with a short dialogue and a hand-drawn anime portrait
(canvas art, drawn in code) of the person the letter is for.

The archipelago is big: **19 islands** over about 2.8 km east-west and
5.5 km north-south — Pulau Senja, Lighthouse Island, Mount Api, Ember
Isle (a smoking volcano), Canyon West and East, Blue Lagoon and Coral
Garden, Kampung Nelayan fishing village, Palm Grove, Sunset Cay,
Driftwood Isle, Turtle Cay, Eagle Cliff and Harbor Rock, plus **Kota
Langit**, a proper island city: a raised landmass with beaches, a
painted ground map of streets, a central plaza with a monument, a park
with leafy trees and a fountain, a lit night-market street, dozens of
buildings with lit windows standing on the ground, a bridge to Bridge
Isle, a harbour with boats, and an airport with a lit runway and control
tower. The sky is busy too: civilian airliners on fixed routes, boats
with wakes, circling birds, drifting clouds, chimney and volcano smoke,
fireworks over the city at sunset, and floating lanterns at sunset. Rings and fuel rings
are spread across the whole map, so every letter is a real journey.

## The five missions

1. **For Grandma Sari** — fly five golden rings, then land on the water
   runway at Pulau Senja.
2. **Birthday at the Lighthouse** — a timed delivery to Mika at the
   lighthouse island, with a fuel ring on the long leg.
3. **Two Brothers** — a low canyon run through six rings and storm clouds, carrying an
   apology letter from Mr. Budi to Mr. Agus — then a low fly-through of
   Kota Langit, past the city towers, while rogue drones patrol the route.
   Shoot them down with the Lock-On Cannon.
4. **A Love Letter, Unsent for Ten Years** — dusk rain, fuel management,
   four green fuel rings, drones over the mountain road, and a landing on the mountain airstrip.
5. **The Last Letter** — Nara's letter to her late mother: a sunset
   flight through seven rings arcing over the sea, past the last drones,
   under the floating lanterns. *Every letter finds its sky.*

## Flight

Throttle and turn discipline matter: stall below safe speed, watch the
fuel gauge, and come in slow and gentle — a hard impact on water or
terrain damages Pipit, and a too-fast landing splashes her. Fuel rings
refill the tanks; golden rings mark the route; a safe landing delivers
the letter and opens the next one. **Rogue drones** patrol missions 3–5:
they chase Pipit and fire slow tracers that damage her on hit — shoot
them down with the cannon, or break their lock with a Flare Burst.
Flying low between the buildings of Kota Langit is dangerous too:
hitting a building damages Pipit.

- **HUD** — altitude (ft), speed (kt), heading with a compass strip,
  throttle and fuel gauges, artificial horizon, objective and distance,
  letters delivered, hearts, and Pipit's condition, with a stall warning,
  an enemy lock-on warning, a hostiles count, plus the five pilot skills with their keys and cooldown bars.
- **Controls** — Arrow keys / WASD pitch and bank, Shift / Ctrl throttle,
  Space brake, mouse steering (optional), P pause, M mute, R restart,
  N opens the archipelago map (the minimap is always on, top right).
  Skills: 1 Sky Boost, 2 / Q Barrel Roll, 3 / F Flare Burst,
  4 / E Feather Glide, 5 / C Lock-On Cannon.
- **Radar + map** — a heading-up radar (bottom right) shows the next
  target in gold, enemy drones in red, Kota Langit in amber and the
  islands in green, with a north tick. The minimap (top right) shows
  the local archipelago with the player, the remaining rings, the
  target and the drones; N or FULL MAP opens the big labelled map.
- **Touch + gamepad** — on phones the virtual gamepad appears: an
  analog stick (bottom left) for pitch and roll, ▲ / ▼ throttle
  buttons, five round skill buttons, and pause / mute / map buttons.
  A physical gamepad works too (Gamepad API): left stick steers,
  D-pad throttles, RT brakes, A confirms, Start pauses, X / Y / LB /
  RB / LT fire the five skills, Back mutes.
  Enter start and continue.
- **Pilot skills** — 1 **Sky Boost** (turbo burst, costs a little fuel,
  speed lines + afterburner glow), 2 / Q **Barrel Roll** (full roll, brief
  protection from storm clouds), 3 / F **Flare Burst** (bright flare
  that clears the storm ahead and breaks enemy lock-on), 4 / E **Feather Glide** (slow descent
  and steady wings for a gentle landing), 5 / C **Lock-On Cannon**
  (locks the nearest enemy drone ahead and fires a cannon burst).
  Each has a cooldown shown in the HUD.
- **Sound** — rich layered WebAudio synthesis only: engine hum that
  follows the throttle, wind that rises with speed, rain patter in the
  dusk mission, waves and birds at low altitude, a four-note ring
  arpeggio, a warm delivery fanfare, dialogue blips, a stall alarm, a
  splash on water landings and a thud on crashes, and a sound for every
  skill, plus cannon fire, explosions, and hit impacts. Sound starts after you press Start; M mutes everything.
  No audio files.

## Screenshots

Real renders of the game's own code, staged with `?shot=…&seed=1`:

1. `1-cover.jpg` — Letter 1, golden ring and water runway ahead, Sky Boost firing (speed lines + engine glow).
2. `2-storm.jpg` — Letter 3, canyon storm, enemy drone locked in the
   cannon sight, Kota Langit and its bridge ahead, Mr. Agus's reply.
3. `3-landing.jpg` — Letter 4, dusk rain approach, fuel ring, enemy
   drone locked, city lights below.
4. `4-sunset.jpg` — Letter 5, sunset rings over the sea, enemy drone
   locked, Kota Langit and the lighthouse behind.

## Run it

```sh
node serve.ts --port 8093
# open http://localhost:8093/
```

Or open `game/index.html` through any static file server. No build step,
no dependencies, no network. `?autoplay=1` plays Mission 1 with a
scripted pilot (used for testing).

## Files

```
main.ts            entrypoint: copies game/ + screenshots/ to the output
                   directory and writes dossier.json
serve.ts           tiny static server for local play
game/
  index.html       page, DOM HUD, dialogue and menu overlays
  src/
    config.js      constants, palette, flight tuning, sky presets
    random.js      seeded random number generator
    islands.js     island data and the shared heightAt(x, z) terrain model
    missions.js    the five letters and their dialogue text
    characters.js  canvas anime portraits (Nara, Sari, Mika, Budi, Agus)
    audio.js       WebAudio synthesis (engine, wind, chimes, melody)
    world.js       flight physics and mission rules (no browser, no THREE)
    terrain.js     sky dome, sea, islands, palms, volcano, lighthouse,
                   runway, airstrip, memorial, clouds, the island city of
                   Kota Langit (land, park, plaza, night market, harbour,
                   bridge, airport), airliners, lanterns, fireworks
    enemies.js     rogue drones, their tracers, lock-on diamond
    plane.js       Pipit, the fighter jet, built from Three.js geometry
                   (pointed nose, bubble canopy, swept wings, twin tail
                   fins, intakes, afterburner, landing gear, trailing
                   red scarf on the tail fin)
    particles.js   ring bursts, splash, smoke, rain
    textures.js    procedural texture loading (see below)
    render.js      Three.js scene, lighting, chase camera, rings, beacon
    hud.js         DOM HUD and instruments
    input.js       keyboard, mouse, touch virtual pad and gamepad input
    shots.js       deterministic staged screenshots (?shot=…)
    main.js        game loop, screens, autoplay, shot mode
  assets/          original procedural textures (generated in-session with
                   a Python script — see tools/generate_textures.py:
                   periodic-noise terrain/rock/sand/sea, a painted 4096 px
                   city ground map with streets, plaza, park, market and
                   airport, sky-dome gradients with painted cloud bands,
                   twelve city facades with lit windows, runway asphalt,
                   jet livery with panel lines, rivets, weathering and
                   PIPIT 07 squadron markings, cloud sprites, palm bark,
                   basalt, rooftop, market awning, plaza and memorial
                   stone, lighthouse paint, volcano rock, park foliage,
                   fountain water, cliff rock, firework stars — about
                   40 MB in all, inside the 48 MB game limit)
  vendor/
    three.min.js   Three.js r128, vendored (not source)
screenshots/      the four staged screenshots above
```

## Rendering

The game uses `MeshStandardMaterial` throughout: the fighter jet is metal
(`metalness` 0.7, roughness 0.4) with a procedural panel-line livery and a
reflective glass canopy, lit by an ACES tone-mapped directional sun with a
1024 px shadow map, a hemisphere light, fog matched to the sky, and a
canvas-gradient sky cubemap for reflections. The sea carries a colour
texture plus a scrolling wave normal map for sun glitter (no glare beam),
the islands use a 4096 px detail bump map over vertex-colour zoning
(sand on shores, grass on flats, rock on slopes), and the clouds are
textured billboards. Rain falls as visible vertical streaks, and the
sunset finale is lit by 24 floating lanterns over the sea and fireworks
bursting over Kota Langit.

## License

MIT — see [LICENSE](LICENSE).
