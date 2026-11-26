# Sky Letters — a 3D seaplane letter-delivery game

[![make.fun bounty](https://img.shields.io/badge/make.fun-bounty-best--flight--game--20261126--0057-orange)](https://make.fun/bounty/best-flight-game-20261126-0057)
[![repo](https://img.shields.io/badge/repo-wantakimax6%2Fsky--letters--3d-blue)](https://github.com/wantakimax6/sky-letters-3d)
[![license](https://img.shields.io/badge/license-MIT-green)](LICENSE)

**Sky Letters** is a real-3D flight game built with Three.js for the
[make.fun bounty **best-flight-game-20261126-0057**](https://make.fun/bounty/best-flight-game-20261126-0057)
("Make the best flight game"). Everything in the game is in English.
It runs entirely offline: the Three.js library is vendored in
`game/vendor/three.min.js`, and the game makes no network requests.

## The story

The radio network has failed across the islands, so the mail must fly.
**Nara**, 19, red scarf, brown bun, flies her orange-and-cream seaplane
**Pipit** across a sunny Indonesian archipelago, delivering handwritten
letters that the radio can no longer carry. Five letters, five flights —
and the last one is her own.

## Characters

- **Nara** — 19, pilot of Pipit, taught to fly by her mother.
- **Grandma Sari** — waits at Pulau Senja for a letter from her granddaughter.
- **Mika** — 12, birthday at the lighthouse.
- **Pak Budi and Pak Agus** — two fisherman brothers who have not spoken
  in years, until one apology letter crosses the canyon between them.
- **Nara's mother** — gone, but still flying with her daughter.

Each mission opens with a short dialogue and a hand-drawn anime portrait
(canvas art, drawn in code) of the person the letter is for.

## The five missions

1. **For Grandma Sari** — fly three golden rings, then land on the water
   runway at Pulau Senja.
2. **Birthday at the Lighthouse** — a timed delivery to Mika at the
   lighthouse island.
3. **Two Brothers** — a low canyon run through storm clouds, carrying an
   apology letter from Pak Budi to Pak Agus.
4. **A Love Letter, Unsent for Ten Years** — dusk rain, fuel management,
   green fuel rings, and a landing on the mountain airstrip.
5. **The Last Letter** — Nara's letter to her late mother: a sunset
   flight through rings arcing over the sea. *Every letter finds its sky.*

## Flight

Throttle and turn discipline matter: stall below safe speed, watch the
fuel gauge, and come in slow and gentle — a hard impact on water or
terrain damages Pipit, and a too-fast landing splashes her. Fuel rings
refill the tanks; golden rings mark the route; a safe landing delivers
the letter and opens the next one.

- **HUD** — altitude (ft), speed (kt), heading with a compass strip,
  throttle and fuel gauges, artificial horizon, objective and distance,
  letters delivered, hearts, and Pipit's condition, with a stall warning.
- **Controls** — Arrow keys / WASD pitch and bank, Shift / Ctrl throttle,
  Space brake, mouse steering (optional), P pause, M mute, R restart,
  Enter start and continue.
- **Sound** — WebAudio synthesis only: engine hum, wind, ring chimes,
  and a short delivery melody. No audio files.

## Screenshots

Real renders of the game's own code, staged with `?shot=…&seed=1`:

1. `1-cover.jpg` — Letter 1, golden ring and water runway ahead.
2. `2-storm.jpg` — Letter 3, canyon storm, Pak Agus's reply.
3. `3-landing.jpg` — Letter 4, dusk rain approach, fuel ring.
4. `4-sunset.jpg` — Letter 5, sunset rings over the sea.

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
                   runway, airstrip, memorial, clouds
    plane.js       Pipit, built from Three.js geometry (fuselage, wings,
                   floats, spinning propeller, trailing red scarf)
    particles.js   ring bursts, splash, smoke, rain
    render.js      Three.js scene, lighting, chase camera, rings, beacon
    hud.js         DOM HUD and instruments
    input.js       keyboard and mouse input
    shots.js       deterministic staged screenshots (?shot=…)
    main.js        game loop, screens, autoplay, shot mode
  vendor/
    three.min.js   Three.js r128, vendored (not source)
screenshots/      the four staged screenshots above
```

## License

MIT — see [LICENSE](LICENSE).
