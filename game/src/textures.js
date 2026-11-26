// Sky Letters (3D) — procedural texture loading. Every texture in
// game/assets/ was generated in-session by a Python script (periodic
// sinusoid noise + drawn details): original art, no downloads, no copies.
// Textures load asynchronously through one LoadingManager; materials hold
// the texture objects from the start, so Three.js shows them as soon as
// each image arrives. `ready` resolves when all are loaded (or after a
// timeout, so a slow disk can never hang the game or a screenshot).
export function loadTextures() {
  const manager = new THREE.LoadingManager();
  const loader = new THREE.TextureLoader(manager);
  const maxAniso = 8;
  let loaded = false;
  const ready = new Promise((resolve) => {
    const done = () => { if (!loaded) { loaded = true; resolve(); } };
    manager.onLoad = done;
    manager.onError = () => { /* a missing file falls back to flat colour */ };
    setTimeout(done, 9000);
  });
  function tex(file, opts = {}) {
    const t = loader.load(`assets/${file}`);
    t.anisotropy = maxAniso;
    if (opts.srgb !== false) t.encoding = THREE.sRGBEncoding;
    if (opts.repeat) {
      t.wrapS = THREE.RepeatWrapping;
      t.wrapT = THREE.RepeatWrapping;
      t.repeat.set(opts.repeat[0], opts.repeat[1]);
    }
    return t;
  }
  const textures = {
    terrainDetail: tex('terrain_detail.jpg', { repeat: [1, 1] }),
    rock: tex('rock.jpg', { repeat: [1, 1] }),
    sand: tex('sand.jpg', { repeat: [1, 1] }),
    grass: tex('grass.jpg', { repeat: [1, 1] }),
    basalt: tex('basalt.jpg', { repeat: [1, 1] }),
    palmBark: tex('palm_bark.jpg', { repeat: [1, 1] }),
    seaColor: tex('sea_color.jpg', { repeat: [18, 18] }),
    seaNormal: tex('sea_normal.jpg', { srgb: false, repeat: [18, 18] }),
    jetMetal: tex('jet_metal.jpg', { repeat: [1, 1] }),
    jetWing: tex('jet_wing.jpg', { repeat: [1, 1] }),
    runway: tex('runway.jpg', { repeat: [1, 1] }),
    tarmac: tex('tarmac.jpg', { repeat: [4, 4] }),
    facades: ['facade_a.jpg', 'facade_b.jpg', 'facade_c.jpg',
      'facade_d.jpg', 'facade_e.jpg', 'facade_f.jpg'].map((f) => tex(f)),
    sky: {
      day: tex('sky_day.jpg'),
      dusk: tex('sky_dusk.jpg'),
      sunset: tex('sky_sunset.jpg'),
    },
    cloud: tex('cloud.png'),
    cloudB: tex('cloud_b.png'),
    cloudC: tex('cloud_c.png'),
    stormCloud: tex('storm_cloud.png'),
  };
  // A small sky-gradient cubemap for standard-material reflections, so
  // the jet metal and canopy have something photographic to reflect.
  // Built from canvas gradients: blue sky above, warm horizon, dark sea
  // below. No external file, no network.
  function face(top, bottom) {
    const c = document.createElement('canvas');
    c.width = 64; c.height = 64;
    const g = c.getContext('2d');
    const grad = g.createLinearGradient(0, 0, 0, 64);
    grad.addColorStop(0, top);
    grad.addColorStop(0.55, '#cfe8f2');
    grad.addColorStop(0.62, '#ffe9b8');
    grad.addColorStop(1, bottom);
    g.fillStyle = grad;
    g.fillRect(0, 0, 64, 64);
    return c;
  }
  const envFaces = [
    face('#5fb2e6', '#1b4a5a'), face('#5fb2e6', '#1b4a5a'),
    face('#7ec4ee', '#274b5c'), face('#3a6a86', '#12262e'),
    face('#5fb2e6', '#1b4a5a'), face('#5fb2e6', '#1b4a5a'),
  ];
  // CubeTexture takes the canvas elements themselves, not textures.
  const envMap = new THREE.CubeTexture(envFaces);
  envMap.needsUpdate = true;
  textures.envMap = envMap;
  return {
    textures,
    ready,
    isReady() { return loaded; },
  };
}
