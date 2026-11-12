"use strict";
/* =====================================================================
   World: six places, each with its own sky, light, terrain, carpet of
   grass and flowers, scenery and hiding spots. The wood scrolls
   right-to-left past the witch.
   ===================================================================== */

const WITCH_X = -4.6;
const REVEAL_X = 8.2;                 // stars peek out of their hiding spots here...
const SPAWN_X = REVEAL_X + 0.9;       // ...just after the spot sprouts in at the right edge
const MISS_X = WITCH_X + 0.7;
const LANES = [1.1, -1.1, -3.1];
const WORLD_HALF = 30;
const PERIOD = WORLD_HALF * 2;        // the world repeats every 60 units
const STAGE_X = 1.2;                  // where the cauldron sits when it's time to brew

const world = new THREE.Group();      // scrolling scenery
const backdrop = new THREE.Group();   // far-away things that stay put
const carpet = new THREE.Group();     // instanced grass, pebbles and flowers (scrolls with the ground)
scene.add(world, backdrop, carpet);
let scenery = [];
let scrollTotal = 0;
const SCROLL = { value: 0 };          // shared with shaders that must drift with the world

/* -------------------------------- sky -------------------------------- */
/* A dome shader: three-colour gradient, twinkling stars (more of them as
   the game goes on), thin drifting cloud and a soft glow around the moon. */

const skyUniforms = {
  top: { value: new THREE.Color(0x3b2f7a) }, mid: { value: new THREE.Color(0x8d6cc9) }, bottom: { value: new THREE.Color(0xffb3c7) },
  uTime: TIME, uFull: { value: 0.2 }, uMoon: { value: new THREE.Vector3(-0.15, 0.2, -1).normalize() },
};
const sky = new THREE.Mesh(
  new THREE.SphereGeometry(220, 32, 16),
  new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false, uniforms: skyUniforms,
    vertexShader: `varying vec3 vDir; void main(){ vDir = position;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `uniform vec3 top; uniform vec3 mid; uniform vec3 bottom; uniform float uTime; uniform float uFull; uniform vec3 uMoon;
      varying vec3 vDir;
      float hash(vec3 p){ return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
      float hash2(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float noise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
        return mix(mix(hash2(i), hash2(i + vec2(1, 0)), f.x), mix(hash2(i + vec2(0, 1)), hash2(i + vec2(1, 1)), f.x), f.y); }
      void main(){
        vec3 d = normalize(vDir);
        float h = d.y;
        vec3 c = mix(bottom, mid, smoothstep(-0.02, 0.16, h));
        c = mix(c, top, smoothstep(0.12, 0.5, h));
        // stars: one possible star per cell of a grid wrapped round the sky
        vec3 g = d * 52.0, id = floor(g), f = fract(g) - 0.5;
        float rnd = hash(id);
        vec3 off = (vec3(hash(id + 1.7), hash(id + 5.3), hash(id + 9.1)) - 0.5) * 0.6;
        float lit = step(rnd, 0.035 + 0.3 * uFull);
        float tw = 0.65 + 0.35 * sin(uTime * (1.0 + rnd * 3.0) + rnd * 40.0);
        float star = lit * smoothstep(0.07 + 0.07 * hash(id + 3.1), 0.0, length(f - off)) * tw * smoothstep(0.03, 0.22, h);
        c += vec3(1.0, 0.95, 0.82) * star * 4.0;
        // a veil of thin cloud near the horizon
        vec2 cp = d.xz / (d.y + 0.3) * 1.5 + vec2(uTime * 0.01, 0.0);
        float cl = noise(cp) * 0.6 + noise(cp * 2.3) * 0.3 + noise(cp * 5.1) * 0.1;
        cl = smoothstep(0.5, 0.82, cl) * smoothstep(0.0, 0.14, h) * (1.0 - smoothstep(0.32, 0.7, h));
        c = mix(c, mix(bottom, vec3(1.0), 0.35), cl * 0.22);
        // moon glow
        float m = max(dot(d, uMoon), 0.0);
        c += vec3(1.0, 0.92, 0.74) * (pow(m, 90.0) * 0.16 + pow(m, 10.0) * 0.06);
        gl_FragColor = vec4(c, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  })
);
sky.frustumCulled = false;
scene.add(sky);
let skyFull = 0;      // how many of the game's stars are back; night-time levels show more of them
function setSkyFullness(f) { skyFull = f; skyUniforms.uFull.value = clamp(f + (MOODS[moodIndex].stars || 0), 0, 1); }

// stars sent home during a level twinkle in the sky until the level ends
const homeStars = [];
function addHomeStar(pos, hex) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: starTex, color: hex, transparent: true, depthWrite: false, fog: false }));
  s.material.color.multiplyScalar(1.6);
  s.position.copy(pos);
  s.scale.setScalar(2.0);
  s.userData.phase = rand(0, 6);
  scene.add(s);
  homeStars.push(s);
}
function clearHomeStars() {
  for (const s of homeStars) { scene.remove(s); s.material.dispose(); }
  homeStars.length = 0;
}

/* -------------------------------- moon ------------------------------- */

const moon = new THREE.Group();
{
  const tex = moonTextures();
  const face = new THREE.Mesh(new THREE.SphereGeometry(5, 48, 32), new THREE.MeshStandardMaterial({
    color: 0x3a3320, map: tex.map, emissive: 0xfff2cc, emissiveMap: tex.map, emissiveIntensity: 1.45,
    normalMap: tex.normal, normalScale: new THREE.Vector2(0.8, 0.8), roughness: 1, fog: false,
  }));
  face.rotation.y = -1.2;
  moon.add(face);
  const ink = new THREE.MeshStandardMaterial({ color: 0x4a3566, roughness: 0.9, fog: false, emissive: 0x4a3566, emissiveIntensity: 0.25 });
  const blush = new THREE.MeshStandardMaterial({ color: 0xff9fb0, roughness: 1, fog: false, emissive: 0xff9fb0, emissiveIntensity: 0.75 });
  for (const x of [-1.5, 1.5]) {
    // sleepy closed eyes
    const lid = new THREE.Mesh(cached("lid", () => new THREE.TorusGeometry(0.55, 0.11, 8, 20, Math.PI)), ink);
    lid.rotation.z = Math.PI;
    lid.position.set(x, 0.75, 4.72);
    moon.add(lid);
    const cheek = new THREE.Mesh(SPHERE_MID, blush);
    cheek.scale.set(0.62, 0.5, 0.12);
    cheek.position.set(x * 1.75, -0.55, 4.25);
    cheek.lookAt(x * 3, -1, 12);
    moon.add(cheek);
  }
  const grin = new THREE.Mesh(cached("grin", () => new THREE.TorusGeometry(1.1, 0.13, 8, 24, Math.PI)), ink);
  grin.rotation.z = Math.PI;
  grin.position.set(0, -0.3, 4.85);
  moon.add(grin);
  moon.position.set(-14, 19, -90);
  moon.scale.setScalar(1.25);
  scene.add(moon);
}

/* ------------------------------ terrain ------------------------------- */
/* The ground is one displaced mesh. It is flat where the game is played
   (the path and its verges), dips or rises gently in front, and rolls up
   into noise-shaped hills behind. It repeats every PERIOD units, and
   slides with the scrolling world. */

const LOOP_R = PERIOD / (Math.PI * 2);
function loopNoise(u, z, f, seed) {
  const a = (u / PERIOD) * Math.PI * 2;
  return simplex.noise3d(Math.cos(a) * LOOP_R * f + seed, Math.sin(a) * LOOP_R * f - seed, z * f + seed * 2);
}
let terrain = { hill: 6, front: 0.15, rough: 1 };
function terrainH(u, z) {
  const back = sstep(-5.2, -11, z), far = sstep(-12, -42, z), front = sstep(terrain.frontFrom || 4.4, terrain.frontTo || 8, z);
  let h = back * (0.22 + loopNoise(u, z, 0.12, 1) * 0.3 * terrain.rough);
  h += far * (terrain.hill * (0.6 + 0.4 * loopNoise(u, z, 0.045, 5)) + loopNoise(u, z, 0.14, 9) * 0.9 * terrain.rough);
  h += front * (terrain.front + loopNoise(u, z, 0.22, 3) * 0.16);
  return h;
}
/** Where the edge of the path is at world-coordinate u (it wanders a little). */
function pathEdge(u, side) { return 2.8 + loopNoise(u, side * 5, 0.3, 11) * 0.32; }
function onPath(u, z) { return Math.abs(z + 1) < pathEdge(u, z > -1 ? 1 : -1); }

const TERRAIN_ROWS = (() => {
  const rows = [];
  for (let z = 13; z > 5.5; z -= 1.2) rows.push(z);
  for (let z = 5.5; z > -6; z -= 0.36) rows.push(z);
  for (let z = -6, step = 0.7; z > -72; z -= step, step = Math.min(3.2, step * 1.09)) rows.push(z);
  return rows;
})();
const TERRAIN_X0 = -PERIOD, TERRAIN_X1 = PERIOD * 2, TERRAIN_DX = 0.75;
const ground = new THREE.Mesh(new THREE.BufferGeometry(), bakedMaterial("ground"));
ground.receiveShadow = true;
ground.frustumCulled = false;
scene.add(ground);

function buildTerrain(b) {
  const cols = Math.round((TERRAIN_X1 - TERRAIN_X0) / TERRAIN_DX) + 1, rows = TERRAIN_ROWS.length;
  const pos = new Float32Array(cols * rows * 3), col = new Float32Array(cols * rows * 3);
  const gA = new THREE.Color(b.ground[0]), gB = new THREE.Color(b.ground[1]), hill = new THREE.Color(b.hill);
  const pA = new THREE.Color(b.path[0]), pB = new THREE.Color(b.path[1]), c = new THREE.Color(), p = new THREE.Color();
  for (let r = 0; r < rows; r++) {
    const z = TERRAIN_ROWS[r];
    for (let i = 0; i < cols; i++) {
      const x = TERRAIN_X0 + i * TERRAIN_DX, o = (r * cols + i) * 3;
      pos[o] = x; pos[o + 1] = terrainH(x, z); pos[o + 2] = z;
      c.copy(gA).lerp(gB, 0.5 + 0.5 * loopNoise(x, z, 0.16, 7));
      c.lerp(hill, sstep(-9, -38, z) * 0.85);
      if (b.shore) c.lerp(p.set(b.shore), sstep(3.5, 4.2, z));
      const d = Math.abs(z + 1), edge = pathEdge(x, z > -1 ? 1 : -1);
      p.copy(pA).lerp(pB, 0.5 + 0.5 * loopNoise(x, z, 0.4, 13));
      c.lerp(p, 1 - sstep(edge - 0.35, edge + 0.45, d));
      col[o] = c.r; col[o + 1] = c.g; col[o + 2] = c.b;
    }
  }
  const idx = new Uint32Array((cols - 1) * (rows - 1) * 6);
  let k = 0;
  for (let r = 0; r < rows - 1; r++) for (let i = 0; i < cols - 1; i++) {
    const a = r * cols + i, d = a + cols;
    idx[k++] = a; idx[k++] = a + 1; idx[k++] = d; idx[k++] = a + 1; idx[k++] = d + 1; idx[k++] = d;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
  geo.setIndex(new THREE.BufferAttribute(idx, 1));
  geo.computeVertexNormals();
  ground.geometry.dispose();
  ground.geometry = geo;
  ground.material = bakedMaterial(b.groundKind || "ground");
}

/* -------------------------------- water ------------------------------- */
/* Glossy water whose ripples are two layers of a procedural normal map
   sliding over each other; it mirrors the sky through the environment map. */

const rippleMap = rippleNormalTexture();
const waterCache = new Map();
function waterMaterial(color) {
  if (waterCache.has(color)) return waterCache.get(color);
  const m = new THREE.MeshPhysicalMaterial({
    color, roughness: 0.09, metalness: 0.15, clearcoat: 1, clearcoatRoughness: 0.08,
    normalMap: rippleMap, normalScale: new THREE.Vector2(0.9, 0.9), envMapIntensity: 1.25,
  });
  m.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = TIME;
    shader.uniforms.uScroll = SCROLL;
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec2 vWater; uniform float uScroll;")
      .replace("#include <begin_vertex>", "#include <begin_vertex>\nvWater = (modelMatrix * vec4(transformed, 1.0)).xz + vec2(uScroll, 0.0);");
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", "#include <common>\nvarying vec2 vWater; uniform float uTime;")
      .replace("texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0",
        "(texture2D(normalMap, vWater * 0.17 + vec2(uTime * 0.021, uTime * 0.013)).xyz + texture2D(normalMap, vWater * 0.39 - vec2(uTime * 0.03, -uTime * 0.018)).xyz) - 1.0");
  };
  m.customProgramCacheKey = () => "water";
  waterCache.set(color, m);
  return m;
}
const lake = new THREE.Mesh(new THREE.PlaneGeometry(PERIOD * 3, 12), waterMaterial(0x2f8f9f));
lake.rotation.x = -Math.PI / 2;
lake.position.set(0, -0.22, 9.4);
lake.receiveShadow = true;
lake.visible = false;
scene.add(lake);

/* ------------------------------ dust motes ---------------------------- */
/* Fireflies, spores, snowflakes, drifting leaves: one cloud of points
   animated entirely in its vertex shader. */

const MOTE_COUNT = 420;
const moteUniforms = {
  uTime: TIME, uScroll: SCROLL, uScale: { value: 600 }, uSize: { value: 0.2 }, uFall: { value: 0.05 }, uDrift: { value: 0.2 },
  uTwinkle: { value: 1 }, uGlow: { value: 2 }, uA: { value: new THREE.Color() }, uB: { value: new THREE.Color() }, uC: { value: new THREE.Color() },
};
const motes = (() => {
  const pos = new Float32Array(MOTE_COUNT * 3), seed = new Float32Array(MOTE_COUNT * 3);
  for (let i = 0; i < MOTE_COUNT; i++) {
    pos[i * 3] = rand(0, 34); pos[i * 3 + 1] = rand(0, 8); pos[i * 3 + 2] = rand(0, 15);
    seed[i * 3] = Math.random(); seed[i * 3 + 1] = Math.random(); seed[i * 3 + 2] = Math.random();
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geo.setAttribute("aSeed", new THREE.BufferAttribute(seed, 3));
  const mat = new THREE.ShaderMaterial({
    uniforms: moteUniforms, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: `attribute vec3 aSeed;
      uniform float uTime, uScroll, uScale, uSize, uFall, uDrift, uTwinkle;
      uniform vec3 uA, uB, uC;
      varying vec3 vColor; varying float vAlpha;
      void main(){
        vec3 box = vec3(34.0, 8.0, 15.0);
        vec3 p = position;
        p.y += uTime * uFall * (0.5 + aSeed.x);
        p.x += -uScroll * 0.7 - uTime * uDrift * (0.4 + aSeed.y) + sin(uTime * 0.7 + aSeed.z * 30.0) * 0.5;
        p.z += cos(uTime * 0.5 + aSeed.x * 20.0) * 0.4;
        p = mod(p, box);
        float edge = smoothstep(0.0, 1.2, p.y) * smoothstep(8.0, 6.5, p.y) * smoothstep(0.0, 2.0, p.x) * smoothstep(34.0, 32.0, p.x);
        p += vec3(-17.0, 0.15, -9.5);
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        float tw = 0.5 + 0.5 * sin(uTime * (1.5 + aSeed.y * 3.0) + aSeed.z * 50.0);
        vAlpha = mix(1.0, tw * tw, uTwinkle) * edge;
        vColor = aSeed.z < 0.34 ? uA : (aSeed.z < 0.67 ? uB : uC);
        gl_PointSize = uSize * (0.55 + aSeed.x * 0.9) * uScale / -mv.z;
      }`,
    fragmentShader: `uniform float uGlow; varying vec3 vColor; varying float vAlpha;
      void main(){
        float d = length(gl_PointCoord - 0.5);
        float a = smoothstep(0.5, 0.05, d);
        gl_FragColor = vec4(vColor * uGlow, a * a * vAlpha);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  const pts = new THREE.Points(geo, mat);
  pts.frustumCulled = false;
  scene.add(pts);
  return pts;
})();
const MOTE_STYLES = {
  fireflies: { colors: [0xfff3a8, 0xd8ff9a, 0xffe27a], size: 0.2, fall: 0.06, drift: 0.15, twinkle: 1, glow: 2.6, add: true, count: 150 },
  leaves:    { colors: [0xf58a2e, 0xe5603c, 0xf2c14e], size: 0.2, fall: -0.7, drift: 0.9, twinkle: 0, glow: 1.0, add: false, count: 160 },
  spores:    { colors: [0xff9ccf, 0x8ff0e0, 0xfff3a8], size: 0.18, fall: 0.25, drift: 0.1, twinkle: 0.7, glow: 2.4, add: true, count: 260 },
  snow:      { colors: [0xffffff, 0xeaf4ff, 0xffffff], size: 0.15, fall: -1.1, drift: 0.5, twinkle: 0, glow: 1.3, add: false, count: 420 },
  sparkle:   { colors: [0xfff3a8, 0xff9ccf, 0x8fd3ff], size: 0.17, fall: 0.04, drift: 0.1, twinkle: 1, glow: 3.0, add: true, count: 220 },
};
function setMotes(name) {
  const s = MOTE_STYLES[name];
  moteUniforms.uA.value.set(s.colors[0]); moteUniforms.uB.value.set(s.colors[1]); moteUniforms.uC.value.set(s.colors[2]);
  moteUniforms.uSize.value = s.size; moteUniforms.uFall.value = s.fall; moteUniforms.uDrift.value = s.drift;
  moteUniforms.uTwinkle.value = s.twinkle; moteUniforms.uGlow.value = s.glow;
  motes.material.blending = s.add ? THREE.AdditiveBlending : THREE.NormalBlending;
  motes.geometry.setDrawRange(0, s.count);
}

/* ------------------------------ scenery ------------------------------ */

const SOLO_GLOW = new Map();
/** A glowing surface that still has grain (mushroom caps, moon flowers). */
function glowMat(color, strength = 0.6, kind = "gloss") {
  const key = kind + color + "|" + strength;
  if (!SOLO_GLOW.has(key)) SOLO_GLOW.set(key, kindMaterial(kind, { color, emissive: color, emissiveIntensity: strength }));
  return SOLO_GLOW.get(key);
}
const ICO = new THREE.IcosahedronGeometry(1, 2);
function rock(color, r, x = 0, y = 0, z = 0, sx = 1, sy = 0.7, sz = 0.9) {
  const m = mesh(ICO, K.stone(color));
  m.scale.set(r * sx, r * sy, r * sz);
  m.position.set(x, y, z);
  m.rotation.set(rand(0, 3), rand(0, 3), rand(0, 3));
  return m;
}
/** A trunk that leans and tapers, with flaring roots. */
function trunk(color, h, r, lean = 0.25) {
  const g = new THREE.Group();
  const lx = rand(-lean, lean), lz = rand(-lean, lean) * 0.5;
  g.add(tube(color, [[0, -0.1, 0], [lx * 0.25, h * 0.35, lz * 0.3], [lx * 0.8, h * 0.72, lz * 0.8], [lx, h, lz]], r * 1.35, r * 0.62, 8, 8));
  for (let i = 0; i < 4; i++) {
    const a = i * 1.57 + rand(-0.3, 0.3);
    g.add(tube(color, [[Math.cos(a) * r * 0.5, 0.32, Math.sin(a) * r * 0.5], [Math.cos(a) * r * 1.5, 0.08, Math.sin(a) * r * 1.5], [Math.cos(a) * r * 2.6, -0.06, Math.sin(a) * r * 2.6]], r * 0.55, r * 0.18, 4, 5));
  }
  g.userData.top = new THREE.Vector3(lx, h, lz);
  return g;
}
function roundTree(leaves, bark = 0x8f6a55, dots = null) {
  const g = trunk(K.wood(bark), 1.75, 0.2);
  const t = g.userData.top, a = K.leaf(pick(leaves)), b = K.leaf(pick(leaves));
  g.add(tube(K.wood(bark), [[t.x, t.y - 0.5, t.z], [t.x - 0.45, t.y + 0.05, t.z + 0.1], [t.x - 0.75, t.y + 0.3, t.z + 0.15]], 0.1, 0.05, 4, 5));
  g.add(tube(K.wood(bark), [[t.x, t.y - 0.4, t.z], [t.x + 0.4, t.y + 0.1, t.z], [t.x + 0.75, t.y + 0.35, t.z + 0.05]], 0.1, 0.05, 4, 5));
  g.add(ball(a, 1.05, t.x, t.y + 0.55, t.z, 1, 0.92, 1));
  g.add(ball(b, 0.78, t.x - 0.78, t.y + 0.2, t.z + 0.2, 1, 0.9, 1));
  g.add(ball(b, 0.72, t.x + 0.78, t.y + 0.25, t.z + 0.1, 1, 0.9, 1));
  g.add(ball(a, 0.62, t.x + 0.1, t.y + 1.2, t.z + 0.25));
  g.add(ball(b, 0.55, t.x - 0.3, t.y + 0.75, t.z - 0.55));
  if (dots && Math.random() < 0.6) {
    for (let i = 0; i < 5; i++) {
      const an = rand(0, Math.PI * 2);
      g.add(ball(K.gloss(pick(dots)), 0.1, t.x + Math.cos(an) * 0.95, t.y + rand(0.1, 1.0), t.z + 0.8));
    }
  }
  return g;
}
const PINE_TIER = [[0, 0], [0.86, 0.0], [1, 0.05], [0.95, 0.13], [0.62, 0.42], [0.34, 0.72], [0.12, 0.93], [0, 1]];
function pineTree(colors, snow = false, bark = 0x8f6a55) {
  const g = trunk(K.wood(bark), 0.9, 0.15, 0.08);
  const c = K.leaf(pick(colors));
  [[1.05, 1.35, 0.55], [0.84, 1.2, 1.25], [0.62, 1.05, 1.9], [0.38, 0.8, 2.5]].forEach(([r, h, y], i) => {
    const tier = lathe(c, PINE_TIER, 12, "pinetier");
    tier.scale.set(r, h, r);
    tier.position.y = y;
    tier.rotation.y = i * 0.5;
    g.add(tier);
    if (snow) {
      const cap = lathe(K.snow(0xffffff), [[0, 0.3], [0.5, 0.26], [0.62, 0.34], [0.42, 0.6], [0.14, 0.9], [0, 0.98]], 10, "snowcap");
      cap.scale.set(r * 1.06, h * 1.04, r * 1.06);
      cap.position.y = y + 0.02;
      g.add(cap);
    }
  });
  return g;
}
function twistyTree(leaf, bark = 0x5b4470) {
  const g = new THREE.Group(), w = K.wood(bark);
  g.add(tube(w, [[0, -0.1, 0], [0.18, 0.6, 0], [-0.05, 1.2, 0.05], [0.12, 1.7, 0]], 0.3, 0.15, 10, 8));
  g.add(tube(w, [[0, 1.15, 0.03], [-0.4, 1.6, 0.05], [-0.72, 2.2, 0]], 0.14, 0.06, 5, 6));
  g.add(tube(w, [[0.1, 1.5, 0], [0.5, 1.75, 0.08], [0.95, 1.9, 0.1]], 0.12, 0.05, 5, 6));
  g.add(ball(K.leaf(pick(leaf)), 0.74, -0.7, 2.4, 0), ball(K.leaf(pick(leaf)), 0.6, 0.98, 2.05, 0.1), ball(K.leaf(pick(leaf)), 0.52, 0.0, 2.75, 0.1));
  return g;
}
function willow(leaf, bark = 0x7a6a66) {
  const g = trunk(K.wood(bark), 2.0, 0.22);
  const t = g.userData.top;
  g.add(ball(K.leaf(pick(leaf)), 1.28, t.x, t.y + 0.6, t.z, 1, 0.68, 1));
  for (let i = 0; i < 11; i++) {
    const a = (i / 11) * Math.PI * 2, r = 1.08, drop = rand(0.9, 1.5);
    const x = t.x + Math.cos(a) * r, z = t.z + Math.sin(a) * r * 0.95;
    g.add(tube(K.leaf(pick(leaf)), [[x * 0.9, t.y + 0.55, z * 0.9], [x, t.y + 0.25, z], [x * 1.04, t.y + 0.25 - drop, z * 1.04]], 0.2, 0.07, 5, 6));
  }
  return g;
}
const MUSH_STEM = [[0, 0], [0.16, 0], [0.18, 0.04], [0.13, 0.14], [0.1, 0.3], [0.11, 0.36], [0, 0.37]];
const MUSH_CAP = [[0.06, 0.3], [0.24, 0.27], [0.31, 0.29], [0.33, 0.34], [0.28, 0.45], [0.17, 0.56], [0.06, 0.61], [0, 0.62]];
function mushroom(caps, scale = 1, glow = false) {
  const g = new THREE.Group();
  g.add(lathe(K.soft(0xfff3e0), MUSH_STEM, 12, "mushstem"));
  const c = pick(caps);
  g.add(lathe(glow ? glowMat(c, 0.45) : K.gloss(c), MUSH_CAP, 16, "mushcap"));
  for (let i = 0; i < 5; i++) {
    const a = i * 1.3 + 0.4, r = 0.1 + (i % 2) * 0.1;
    const spot = ball(glow ? shiny(0xfff7c2, 1.8) : K.soft(0xffffff), 0.042, Math.cos(a) * r, 0.585 - r * r * 1.9, Math.sin(a) * r, 1, 0.45, 1);
    spot.castShadow = false;
    g.add(spot);
  }
  g.scale.setScalar(scale);
  return g;
}
function giantMushroom(caps) {
  const g = new THREE.Group();
  const lean = rand(-0.25, 0.25);
  g.add(tube(K.soft(0xf3e9ff), [[0, -0.1, 0], [lean * 0.3, 0.8, 0], [lean, 1.6, 0], [lean * 1.1, 2.15, 0]], 0.42, 0.2, 8, 10));
  const c = pick(caps);
  const cap = lathe(glowMat(c, 0.32), [[0.15, 2.0], [0.9, 1.93], [1.24, 1.97], [1.32, 2.08], [1.22, 2.32], [0.92, 2.62], [0.5, 2.82], [0.15, 2.9], [0, 2.91]], 22);
  cap.position.x = lean * 1.1;
  g.add(cap);
  const gills = lathe(K.soft(0xfff0dc), [[0.2, 1.92], [1.18, 1.99]], 22);
  gills.position.x = lean * 1.1;
  gills.material = K.soft(0xfff0dc);
  g.add(gills);
  for (let i = 0; i < 7; i++) {
    const a = i * 0.95 + rand(0, 0.4), r = rand(0.35, 1.0);
    const spot = ball(shiny(0xfff7c2, 1.7), rand(0.08, 0.15), lean * 1.1 + Math.cos(a) * r, 2.9 - r * r * 0.62, Math.sin(a) * r, 1, 0.4, 1);
    spot.castShadow = false;
    g.add(spot);
  }
  return g;
}
const PUMPKIN_GEO = (() => {
  // a lathe-turned gourd with eight lobes pressed into it
  const profile = [[0.03, 0.04], [0.22, 0], [0.44, 0.1], [0.52, 0.3], [0.46, 0.5], [0.28, 0.6], [0.08, 0.57], [0.03, 0.54]].map(p => new THREE.Vector2(p[0], p[1]));
  const seg = 32, g = new THREE.LatheGeometry(profile, seg), p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i), k = 1 - 0.1 * Math.pow(Math.abs(Math.sin(Math.atan2(z, x) * 4)), 0.6);
    p.setX(i, x * k); p.setZ(i, z * k);
  }
  g.computeVertexNormals();
  const n = g.attributes.normal, P = profile.length;                 // close the seam
  for (let j = 0; j < P; j++) {
    const a = j, b = seg * P + j;
    const nx = n.getX(a) + n.getX(b), ny = n.getY(a) + n.getY(b), nz = n.getZ(a) + n.getZ(b), l = Math.hypot(nx, ny, nz) || 1;
    n.setXYZ(a, nx / l, ny / l, nz / l); n.setXYZ(b, nx / l, ny / l, nz / l);
  }
  return g;
})();
function pumpkin(scale = 1, color = 0xf58a2e) {
  const g = new THREE.Group();
  const body = mesh(PUMPKIN_GEO, K.gloss(color));
  body.scale.set(1, rand(0.85, 1.05), 1);
  g.add(body);
  g.add(tube(K.wood(0x6a8f4a), [[0, 0.5, 0], [0.02, 0.62, 0], [0.09, 0.7, 0.02], [0.16, 0.69, 0.03]], 0.055, 0.03, 5, 6));
  const leaf = petal(K.plant(0x5fae6a), 0.3, 0.04, 0.55, 0.02);
  leaf.rotation.set(-1.3, rand(0, 6), 0, "YXZ");
  g.add(leaf);
  g.scale.setScalar(scale);
  g.rotation.y = rand(0, 6);
  return g;
}
function hayBale() {
  const g = new THREE.Group();
  const b = cyl(K.straw(0xf2d27a), 0.55, 0.55, 0.92, 0, 0.55, 0, 22);
  b.rotation.x = Math.PI / 2;
  b.rotation.z = Math.PI / 2;
  g.add(b);
  for (const x of [-0.22, 0.22]) {
    const band = torus(K.fabric(0xc99a4a), 0.56, 0.022, x, 0.55, 0);
    band.rotation.y = Math.PI / 2;
    g.add(band);
  }
  return g;
}
function scarecrow() {
  const g = new THREE.Group(), wood = K.wood(0x8a5a3c);
  g.add(tube(wood, [[0, -0.1, 0], [0.02, 0.9, 0], [0, 1.75, 0]], 0.06, 0.045, 5, 6));
  g.add(tube(wood, [[-0.68, 1.2, 0], [0, 1.24, 0], [0.68, 1.18, 0]], 0.04, 0.04, 4, 6));
  g.add(lathe(K.fabric(0x6fa8dc), [[0, 0.72], [0.3, 0.74], [0.34, 0.82], [0.3, 1.2], [0.2, 1.36], [0, 1.4]], 14));
  for (const s of [-1, 1]) {
    const sl = capsule(K.fabric(0x6fa8dc), 0.085, 0.36, s * 0.42, 1.2, 0);
    sl.rotation.z = Math.PI / 2;
    g.add(sl);
    g.add(cone(K.straw(0xf2d27a), 0.1, 0.24, s * 0.72, 1.19, 0, 0, -s * Math.PI / 2, 7));
  }
  g.add(ball(K.fabric(0xf7e2b0), 0.26, 0, 1.62, 0, 1, 0.95, 0.95));
  eye(g, -0.09, 1.65, 0.22, 0.04); eye(g, 0.09, 1.65, 0.22, 0.04);
  smile(g, 0.07, 0, 1.58, 0.24);
  g.add(ball(K.skin(PINK), 0.04, -0.15, 1.58, 0.2, 1, 0.7, 0.5), ball(K.skin(PINK), 0.04, 0.15, 1.58, 0.2, 1, 0.7, 0.5));
  const hat = lathe(K.straw(0xc9955f), [[0, 0], [0.44, 0], [0.47, 0.03], [0.26, 0.07], [0.22, 0.2], [0.1, 0.38], [0, 0.42]], 14);
  hat.position.y = 1.8;
  hat.rotation.z = 0.12;
  g.add(hat);
  return g;
}
function cornStalk() {
  const g = new THREE.Group();
  g.add(tube(K.plant(0x9bbf5a), [[0, 0, 0], [0.03, 0.8, 0], [0, 1.55, 0.02]], 0.05, 0.03, 5, 6));
  for (let i = 0; i < 5; i++) {
    const leaf = petal(K.plant(i % 2 ? 0xa8cc62 : 0x93bd52), 0.55, 0, 0.3 + i * 0.26, 0);
    leaf.scale.x *= 0.45;
    leaf.rotation.set(-0.95, i * 2.4, 0, "YXZ");
    g.add(leaf);
  }
  g.add(capsule(K.gloss(0xffd45e), 0.07, 0.16, 0.07, 1.2, 0.05));
  return g;
}
function reeds() {
  const g = new THREE.Group();
  for (let i = 0; i < 5; i++) {
    const h = rand(0.9, 1.6), x = (i - 2) * 0.13, z = rand(-0.1, 0.1), lean = (i - 2) * 0.09 + rand(-0.05, 0.05);
    g.add(tube(K.plant(i % 2 ? 0x6fb38a : 0x5fa57c), [[x, 0, z], [x + lean * 0.4, h * 0.5, z], [x + lean, h, z]], 0.03, 0.016, 4, 5));
    if (i % 2 === 0) {
      const head = capsule(K.fur(0x8a5a3c), 0.05, 0.2, x + lean * 0.95, h - 0.08, z);
      head.rotation.z = -lean * 0.6;
      g.add(head);
    }
  }
  return g;
}
/** A flat disc with a wobbly edge (ponds, lily pads). */
function blobDisc(r, wobble, notch = 0, seg = 28) {
  const g = own(new THREE.CircleGeometry(r, seg, 0, Math.PI * 2 - notch));
  const p = g.attributes.position, s = rand(0, 50);
  for (let i = 1; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), k = 1 + simplex.noise(Math.atan2(y, x) * 1.3 + s, s) * wobble;
    p.setXY(i, x * k, y * k);
  }
  g.rotateX(-Math.PI / 2);
  return g;
}
function lilyPad(r, x, z, y = 0.045) {
  const pad = mesh(blobDisc(r, 0.06, 0.5, 14), K.gloss(pick([0x5fbf7a, 0x4fae6e, 0x74cc8a])));
  pad.position.set(x, y, z);
  pad.rotation.y = rand(0, 6);
  pad.castShadow = false;
  return pad;
}
function lilyFlower(x, z, y = 0.07) {
  const g = new THREE.Group();
  const c = pick([0xff9ccf, 0xffffff, 0xffc2e0]);
  for (let i = 0; i < 8; i++) {
    const p = petal(K.gloss(c), i < 4 ? 0.15 : 0.19, 0, 0, 0);
    p.rotation.set(i < 4 ? -0.5 : -1.05, (i / 4) * Math.PI * 2 + (i < 4 ? 0.4 : 0), 0, "YXZ");
    g.add(p);
  }
  g.add(ball(K.soft(0xffd166), 0.045, 0, 0.05, 0));
  g.position.set(x, y, z);
  return g;
}
function lilyPond(w = 2.4) {
  const g = new THREE.Group();
  const water = new THREE.Mesh(blobDisc(w, 0.12), waterMaterial(0x3aa0b0));
  water.scale.z = 0.62;
  water.position.y = 0.03;
  water.receiveShadow = true;
  g.add(water);
  for (let i = 0; i < 9; i++) {                                               // stones round the edge
    const a = rand(0, Math.PI * 2);
    g.add(rock(0xb9c6c0, rand(0.1, 0.22), Math.cos(a) * w * 1.02, 0.03, Math.sin(a) * w * 0.63));
  }
  for (let i = 0; i < 4; i++) {
    const a = rand(0, Math.PI * 2), r = rand(0.15, 0.68) * w;
    const x = Math.cos(a) * r, z = Math.sin(a) * r * 0.55;
    g.add(lilyPad(rand(0.2, 0.32), x, z));
    if (i % 2) g.add(lilyFlower(x, z));
  }
  return g;
}
const CRYSTAL = [[0, 0], [0.26, 0], [0.34, 0.22], [0.3, 1.25], [0.12, 1.62], [0, 1.72]];
function crystal(colors, scale = 1) {
  const g = new THREE.Group();
  for (let i = 0; i < 4; i++) {
    const c = lathe(crystalMat(pick(colors), 0.5), CRYSTAL, 6, "crystal");
    const h = [0.52, 0.36, 0.3, 0.22][i];
    c.scale.set(h * 0.55, h * 0.62, h * 0.55);
    c.position.set([0, 0.24, -0.22, 0.05][i], 0, [0, 0.08, 0.05, 0.2][i]);
    c.rotation.set([0, 0.1, 0.05, 0.5][i], i * 1.1, [0, -0.4, 0.45, 0.1][i]);
    g.add(c);
  }
  g.add(rock(0x8f86b8, 0.2, 0, 0.02, 0, 1.6, 0.45, 1.3));
  g.scale.setScalar(scale);
  return g;
}
function snowman() {
  const g = new THREE.Group(), snow = K.snow(0xffffff);
  g.add(ball(snow, 0.44, 0, 0.38, 0, 1, 0.95, 1), ball(snow, 0.31, 0, 0.96, 0), ball(snow, 0.23, 0, 1.4, 0));
  eye(g, -0.08, 1.44, 0.2, 0.035); eye(g, 0.08, 1.44, 0.2, 0.035);
  g.add(cone(K.gloss(0xffa64d), 0.04, 0.2, 0, 1.38, 0.3, Math.PI / 2, 0, 8));
  for (let i = 0; i < 3; i++) { const b = new THREE.Mesh(SPHERE_LOW, GLOSSY_DARK); b.scale.setScalar(0.03); b.position.set(0, 0.82 + i * 0.13, 0.3 - Math.abs(i - 1) * 0.02); g.add(b); }
  const sc = torus(K.fabric(0xff6f7d), 0.21, 0.055, 0, 1.2, 0);
  sc.rotation.x = Math.PI / 2;
  g.add(sc);
  g.add(capsule(K.fabric(0xff6f7d), 0.05, 0.2, 0.16, 1.05, 0.17));
  const hat = lathe(K.fabric(0x4a3566), [[0, 0], [0.22, 0], [0.23, 0.035], [0.15, 0.05], [0.14, 0.26], [0.12, 0.29], [0, 0.29]], 14);
  hat.position.y = 1.58;
  hat.rotation.z = -0.12;
  g.add(hat);
  for (const s of [-1, 1]) g.add(tube(K.wood(0x6b4a3a), [[s * 0.26, 1.0, 0], [s * 0.5, 1.15, 0.03], [s * 0.66, 1.34, 0.02]], 0.03, 0.014, 4, 5));
  return g;
}
function snowDrift() {
  const g = new THREE.Group(), s = K.snow(0xffffff);
  g.add(ball(s, 0.6, 0, 0.05, 0, 1.2, 0.5, 0.9), ball(K.snow(0xf2f8ff), 0.42, 0.55, 0.02, 0.1, 1.2, 0.5, 0.9), ball(s, 0.3, -0.5, 0.0, 0.15, 1.2, 0.5, 1));
  return g;
}
function cloudPuff(colors, scale = 1) {
  const g = new THREE.Group();
  const n = 3 + Math.floor(Math.random() * 2);
  for (let j = 0; j < n; j++) {
    const m = ball(K.cloud(pick(colors)), rand(0.42, 0.62), (j - n / 2 + 0.5) * 0.55, rand(0.25, 0.4), rand(-0.1, 0.1));
    m.castShadow = false;
    g.add(m);
  }
  g.scale.setScalar(scale);
  return g;
}
function lampPost(color = 0xffe27a) {
  const g = new THREE.Group(), iron = K.metal(0x5a4f78);
  g.add(tube(iron, [[0, 0, 0], [0, 1.2, 0], [0.02, 1.72, 0], [0.16, 1.96, 0], [0.34, 1.96, 0], [0.42, 1.84, 0]], 0.065, 0.028, 16, 7));
  g.add(lathe(iron, [[0, 0], [0.16, 0], [0.18, 0.05], [0.1, 0.12], [0.08, 0.3], [0, 0.3]], 10, "lampbase"));
  g.add(torus(iron, 0.05, 0.012, 0.42, 1.8, 0));
  const lamp = new THREE.Mesh(STAR_GEO, shiny(color, 3.2));
  lamp.scale.setScalar(0.15);
  lamp.position.set(0.42, 1.58, 0);
  g.add(lamp);
  const gl = glowSprite(color, 1.9, 0.3);
  gl.position.set(0.42, 1.58, 0.1);
  g.add(gl);
  return g;
}
const PICKET = (() => {
  const s = new THREE.Shape();
  s.moveTo(-0.06, 0); s.lineTo(0.06, 0); s.lineTo(0.06, 0.66); s.lineTo(0, 0.8); s.lineTo(-0.06, 0.66); s.closePath();
  return s;
})();
function fencePiece() {
  const g = new THREE.Group(), white = K.wood(0xfff3e0);
  for (let i = 0; i < 4; i++) {
    const p = extrude(white, PICKET, 0.05, 0.012, "picket");
    p.position.set(i * 0.42, rand(-0.02, 0.02), 0);
    p.rotation.z = rand(-0.05, 0.05);
    g.add(p);
  }
  for (const y of [0.22, 0.5]) {
    const rail = capsule(white, 0.03, 1.5, 0.63, y, -0.04);
    rail.rotation.z = Math.PI / 2;
    g.add(rail);
  }
  return g;
}
const ARCH = (w, h) => {
  const s = new THREE.Shape();
  s.moveTo(-w, 0); s.lineTo(w, 0); s.lineTo(w, h - w); s.absarc(0, h - w, w, 0, Math.PI, false); s.closePath();
  return s;
};
function cottage() {
  const g = new THREE.Group();
  // plastered round walls on a ring of foundation stones
  g.add(lathe(K.stone(0xfff0d9), [[0, 0], [1.7, 0], [1.74, 0.15], [1.6, 0.4], [1.54, 1.1], [1.6, 1.75], [1.52, 2.0], [0, 2.0]], 26));
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    g.add(rock(pick([0xb9aecb, 0xa79bbd, 0xcfc4dd]), rand(0.2, 0.3), Math.cos(a) * 1.72, 0.12, Math.sin(a) * 1.72, 1.2, 0.8, 0.9));
  }
  // a tall crooked roof with flared eaves
  g.add(lathe(K.tile(0x7d5bd0), [[0, 1.86], [2.2, 1.78], [2.34, 1.86], [2.2, 2.0], [1.62, 2.5], [1.1, 3.15], [0.7, 3.8], [0.45, 4.25], [0, 4.3]], 26));
  g.add(tube(K.tile(0x7d5bd0), [[0, 4.1, 0], [0.12, 4.6, 0], [0.42, 4.95, 0], [0.78, 4.92, 0]], 0.42, 0.1, 8, 10));
  g.add(ball(K.metal(0xffcf4a), 0.15, 0.84, 4.9, 0));
  // door, set into a frame
  const frame = extrude(K.wood(0x6b4a3a), ARCH(0.5, 1.3), 0.16, 0.03);
  frame.position.set(0, 0, 1.56);
  g.add(frame);
  const door = extrude(K.wood(0x9a6a44), ARCH(0.41, 1.18), 0.16, 0.025);
  door.position.set(0, 0.03, 1.62);
  g.add(door);
  g.add(ball(K.metal(0xffcf4a), 0.055, 0.24, 0.6, 1.75));
  for (const y of [0.3, 0.9]) {
    const strap = capsule(K.metal(0x5a4f78), 0.022, 0.6, 0, y, 1.72);
    strap.rotation.z = Math.PI / 2;
    g.add(strap);
  }
  g.add(lathe(K.stone(0xb9aecb), [[0, 0], [0.7, 0], [0.72, 0.06], [0, 0.08]], 14).translateZ(2.05));
  // round windows that glow from the fire inside
  for (const x of [-1.0, 1.0]) {
    const w = new THREE.Group();
    w.position.set(x, 1.15, 1.2);
    w.lookAt(x * 2, 1.15, 4);
    const pane = new THREE.Mesh(SPHERE_MID, shiny(0xffd98a, 2.4));
    pane.scale.set(0.3, 0.3, 0.06);
    w.add(pane);
    w.add(torus(K.wood(0x6b4a3a), 0.31, 0.05, 0, 0, 0.03));
    for (const r of [0, Math.PI / 2]) {
      const bar = capsule(K.wood(0x6b4a3a), 0.022, 0.56, 0, 0, 0.07);
      bar.rotation.z = r;
      w.add(bar);
    }
    g.add(w);
    const gl = glowSprite(0xffd76b, 2.0, 0.22);
    gl.position.set(x * 1.1, 1.15, 1.55);
    g.add(gl);
  }
  // chimney
  g.add(lathe(K.stone(0xc98f72), [[0, 2.7], [0.26, 2.7], [0.24, 3.55], [0.3, 3.6], [0.3, 3.72], [0.2, 3.74], [0.18, 3.6]], 10).translateX(-1.0).translateZ(-0.2));
  return g;
}
function tower(h = 6) {
  const g = new THREE.Group();
  g.add(lathe(K.stone(0xcfc4f5), [[0, 0], [1.3, 0], [1.34, 0.25], [1.1, 0.7], [1.0, h - 0.7], [1.18, h - 0.3], [1.24, h], [0, h]], 18));
  g.add(lathe(K.tile(0x6b4bb8), [[0, h - 0.05], [1.5, h - 0.12], [1.58, h], [1.3, h + 0.4], [0.7, h + 1.5], [0.25, h + 2.4], [0, h + 2.6]], 18));
  g.add(ball(shiny(0xffe27a, 2.6), 0.2, 0, h + 2.7, 0));
  for (let i = 0; i < Math.floor(h / 2); i++) {
    const w = extrude(shiny(0xffe27a, 2.0), ARCH(0.2, 0.62), 0.1, 0.02, "towerwin");
    w.position.set(0, 1.3 + i * 1.8, 1.0);
    g.add(w);
  }
  return g;
}
function mountain(rockColor = 0x8fa6d9, snowy = true) {
  // a noise-carved peak with snow gathering above the snow line
  const h = rand(14, 22), r = rand(9, 13);
  const profile = [];
  for (let i = 0; i <= 10; i++) { const t = i / 10; profile.push(new THREE.Vector2(r * Math.pow(1 - t, 1.15) + 0.01, t * h - 2)); }
  const geo = own(new THREE.LatheGeometry(profile, 18));
  displaceGeometry(geo, 1.5, 0.16);
  const p = geo.attributes.position, col = new Float32Array(p.count * 3), a = new THREE.Color(rockColor), s = new THREE.Color(0xffffff), c = new THREE.Color();
  for (let i = 0; i < p.count; i++) {
    const t = sstep(h * 0.5, h * 0.66, p.getY(i) + 2 + simplex.noise(p.getX(i) * 0.3, p.getZ(i) * 0.3) * 1.6);
    c.copy(a).lerp(s, snowy ? t : t * 0.25);
    col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
  }
  geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
  const m = new THREE.Mesh(geo, bakedMaterial("stone"));
  m.castShadow = false;
  return m;
}

const sceneryBox = new THREE.Box3();
function addScenery(obj, x, z, scale = 1, turn = true, y = null) {
  obj.position.set(x, y ?? terrainH(x + scrollTotal, z), z);
  obj.scale.multiplyScalar(scale);
  if (turn) obj.rotation.y += rand(-0.5, 0.5);
  bake(obj);
  obj.userData.tall = sceneryBox.setFromObject(obj).max.y - obj.position.y > 0.75;
  world.add(obj);
  scenery.push(obj);
  return obj;
}
function scatter(n, make, zMin, zMax, sMin = 1, sMax = 1, y = null) {
  for (let i = 0; i < n; i++) {
    let x, z, tries = 0;
    do { x = rand(-WORLD_HALF, WORLD_HALF); z = rand(zMin, zMax); } while (onPath(x + scrollTotal, z) && ++tries < 8);
    addScenery(make(), x, z, rand(sMin, sMax), true, y);
  }
}
function treeLine(make) {
  for (let x = -WORLD_HALF; x < WORLD_HALF; x += rand(2.3, 3.5)) {
    addScenery(make(), x, rand(-6.8, -5.4), rand(0.9, 1.15));
    addScenery(make(), x + rand(0.8, 1.6), rand(-12.8, -8.4), rand(1.1, 1.5));
  }
}

/* ------------------------- the instanced carpet ----------------------- */
/* Thousands of grass tufts, pebbles and little flowers, each drawn as an
   instance with its own size, turn and tint. One period's worth is made
   and shown three times side by side so it can scroll for ever. */

const TUFT_GEO = (() => {
  // four curved, tapering blades fanned out from one root (1 unit tall before scaling)
  const pos = [], nor = [], col = [], idx = [];
  const SEG = 2;
  for (let b = 0; b < 4; b++) {
    const turn = b * 1.65 + 0.3, lean = 0.3 + (b % 2) * 0.22, w = 0.14, h = 0.72 + (b % 3) * 0.14;
    const ca = Math.cos(turn), sa = Math.sin(turn), base = pos.length / 3;
    for (let i = 0; i <= SEG; i++) {
      const t = i / SEG, y = t * h, out = t * t * lean + 0.06, half = w * (1 - t * 0.92);
      for (const s of [-1, 1]) {
        const lx = s * half, lz = out;
        pos.push(lx * ca - lz * sa, y, lx * sa + lz * ca);
        nor.push(-sa * 0.25, 0.93, ca * 0.25);                    // mostly "up": grass is lit like the ground it grows from
        const shade = 0.74 + 0.4 * t;
        col.push(shade, shade, shade);
      }
    }
    for (let i = 0; i < SEG; i++) {
      const a = base + i * 2;
      idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
  g.setIndex(idx);
  return g;
})();
const GRASS_MAT = addDetail(
  new THREE.MeshStandardMaterial({ vertexColors: true, side: THREE.DoubleSide, roughness: 0.78, envMapIntensity: 0.4 }),
  { tex: "soft", tile: 1.5, vary: 0.1, rvar: 0.2, bump: 0, rim: 0.25, sway: 0.22 });
const PEBBLE_GEO = (() => {
  const g = new THREE.IcosahedronGeometry(1, 1);
  displaceGeometry(g, 0.22, 1.1, 3);
  g.scale(1, 0.55, 0.85);
  g.computeVertexNormals();
  return g;
})();
const PEBBLE_MAT = kindMaterial("stone");
// Hundreds of flowers and fallen leaves are drawn, so they use a petal with a tenth of the triangles of PETAL_GEO.
const PETAL_LO_GEO = (() => {
  const g = new THREE.ExtrudeGeometry(PETAL_SHAPE, { depth: 0.07, bevelEnabled: false, curveSegments: 4 });
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) p.setZ(i, p.getZ(i) + p.getX(i) * p.getX(i) * 0.9 + p.getY(i) * p.getY(i) * 0.18);
  g.computeVertexNormals();
  return g;
})();
const FLOWER_GEO = (() => {
  // stem, two leaves, five cupped petals and a centre, merged into one geometry with white petals to be tinted
  const lo = PETAL_LO_GEO;
  const part = (color, size, y) => { const m = mesh(lo, color); m.scale.setScalar(size); m.position.y = y; return m; };
  const g = new THREE.Group();
  g.add(tube(0x4f9a5e, [[0, 0, 0], [0.02, 0.2, 0], [0, 0.4, 0]], 0.022, 0.016, 2, 3));
  for (const s of [-1, 1]) {
    const leaf = part(0x5fae6a, 0.16, 0.08);
    leaf.rotation.set(-0.9, s * 1.2, 0, "YXZ");
    g.add(leaf);
  }
  for (let i = 0; i < 5; i++) {
    const p = part(0xffffff, 0.15, 0.4);
    p.rotation.set(-1.05, (i / 5) * Math.PI * 2, 0, "YXZ");
    g.add(p);
  }
  const centre = mesh(new THREE.IcosahedronGeometry(1, 0), 0xffc93c);
  centre.scale.setScalar(0.05);
  centre.position.y = 0.425;
  g.add(centre);
  g.updateMatrixWorld(true);
  const parts = [];
  g.traverse(o => { if (o.isMesh) parts.push({ mesh: o, matrix: o.matrixWorld }); });
  const geo = mergeMeshes(parts);
  geo.userData.own = false;
  for (const { mesh: m } of parts) if (m.geometry !== lo) m.geometry.dispose();
  return geo;
})();
const FLOWER_MAT = addDetail(
  new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6, envMapIntensity: 0.5 }),
  { tex: "soft", tile: 1.0, vary: 0.1, rvar: 0.2, bump: 0.005, rim: 0.25, sway: 0.16 });
const LEAF_LITTER_GEO = (() => { const g = PETAL_LO_GEO.clone(); g.rotateX(-Math.PI / 2); g.scale(0.16, 0.16, 0.16); return g; })();
const LITTER_MAT = kindMaterial("gloss", { side: THREE.DoubleSide });
const TUFT_CLOUD_GEO = (() => { const g = new THREE.IcosahedronGeometry(1, 1); displaceGeometry(g, 0.14, 1.2, 5); g.scale(1, 0.62, 1); return g; })();
const TUFT_CLOUD_MAT = kindMaterial("cloud");

const carpetLayers = [];
const carpetM = new THREE.Matrix4(), carpetQ = new THREE.Quaternion(), carpetE = new THREE.Euler(), carpetS = new THREE.Vector3(), carpetP = new THREE.Vector3(), carpetC = new THREE.Color();
/** items: [{ x, y, z, ry, rx, s, sy, color }] for one period -> three side-by-side InstancedMeshes. */
function addCarpetLayer(geo, mat, items, opts = {}) {
  if (!items.length) return;
  for (let k = -1; k <= 1; k++) {
    const im = new THREE.InstancedMesh(geo, mat, items.length);
    items.forEach((it, i) => {
      carpetQ.setFromEuler(carpetE.set(it.rx || 0, it.ry || 0, it.rz || 0, "YXZ"));
      carpetM.compose(carpetP.set(it.x, it.y, it.z), carpetQ, carpetS.set(it.s, it.s * (it.sy || 1), it.s));
      im.setMatrixAt(i, carpetM);
      im.setColorAt(i, carpetC.set(it.color));
    });
    im.position.x = k * PERIOD;
    im.castShadow = !!opts.cast;
    im.receiveShadow = true;
    im.userData.full = items.length;
    im.userData.thin = opts.thin !== false;
    im.count = im.userData.thin ? Math.ceil(items.length * Q().carpet) : items.length;
    im.computeBoundingSphere();
    carpet.add(im);
    carpetLayers.push(im);
  }
}
quality.onChange = (q) => { for (const im of carpetLayers) if (im.userData.thin) im.count = Math.ceil(im.userData.full * q.carpet); };

function tint(colors, lo = 0.82, hi = 1.12) {
  return carpetC.set(pick(colors)).multiplyScalar(rand(lo, hi)).getHex();
}
function buildCarpet(b) {
  for (const im of carpetLayers) { carpet.remove(im); im.dispose(); }
  carpetLayers.length = 0;

  if (b.grass) {
    const items = [];
    const want = b.grass.count;
    for (let tries = 0; items.length < want && tries < want * 6; tries++) {
      const u = rand(0, PERIOD);
      // most of the grass grows near the camera and along the verges
      const pickZ = Math.random();
      const z = pickZ < 0.52 ? rand(1.6, 9.5) : pickZ < 0.86 ? rand(-9.5, -3.4) : rand(-16, -9.5);
      if (onPath(u, z) && Math.random() < 0.97) continue;
      if (b.water && z > 3.9) continue;
      if (loopNoise(u, z, 0.3, 21) < -0.35 + Math.random() * 0.5) continue;           // grow in drifts, with bare patches
      const s = rand(0.2, 0.36) * (z < -9 ? 1.6 : 1);
      items.push({ x: u, y: terrainH(u, z) - 0.02, z, ry: rand(0, 6.3), rx: rand(-0.2, 0.2), s, sy: rand(0.7, 1.5), color: tint(b.grass.colors) });
    }
    addCarpetLayer(TUFT_GEO, GRASS_MAT, items);
  }
  {
    const items = [];
    for (let i = 0; i < (b.pebbles ?? 150); i++) {
      const u = rand(0, PERIOD), side = Math.random() < 0.5 ? -1 : 1;
      const edge = pathEdge(u, side);
      const d = Math.random() < 0.6 ? edge + rand(-0.7, 0.35) : rand(0, edge);          // gathered along the edges, a few strewn across
      const z = -1 + side * d;
      const s = rand(0.05, 0.15) * (Math.random() < 0.08 ? 2 : 1);
      items.push({ x: u, y: terrainH(u, z) + s * 0.25, z, ry: rand(0, 6.3), rx: rand(-0.3, 0.3), s, color: tint(b.stones, 0.75, 1.1) });
    }
    addCarpetLayer(PEBBLE_GEO, PEBBLE_MAT, items, { thin: false });
  }
  if (b.flowers) {
    const items = [];
    for (let i = 0; i < b.flowers.count; i++) {
      const u = rand(0, PERIOD), z = Math.random() < 0.7 ? rand(2.1, 7.5) : rand(-6.5, -4.0);
      if (onPath(u, z) || (b.water && z > 3.8)) continue;
      items.push({ x: u, y: terrainH(u, z), z, ry: rand(0, 6.3), rx: rand(-0.12, 0.12), s: rand(0.8, 1.5), color: tint(b.flowers.colors, 0.95, 1.05) });
    }
    addCarpetLayer(FLOWER_GEO, FLOWER_MAT, items, { thin: false });
  }
  if (b.litter) {
    const items = [];
    for (let i = 0; i < b.litter.count; i++) {
      const u = rand(0, PERIOD), z = rand(-9, 8);
      items.push({ x: u, y: terrainH(u, z) + 0.02, z, ry: rand(0, 6.3), rx: rand(-0.25, 0.25), rz: rand(-0.25, 0.25), s: rand(0.7, 1.4), color: tint(b.litter.colors) });
    }
    addCarpetLayer(LEAF_LITTER_GEO, LITTER_MAT, items);
  }
  if (b.wisps) {
    const items = [];
    for (let i = 0; i < b.wisps.count; i++) {
      const u = rand(0, PERIOD), z = Math.random() < 0.6 ? rand(2.2, 9) : rand(-9, -4.2);
      if (onPath(u, z)) continue;
      items.push({ x: u, y: terrainH(u, z) + 0.05, z, ry: rand(0, 6.3), s: rand(0.16, 0.5), color: tint(b.wisps.colors, 0.96, 1.04) });
    }
    addCarpetLayer(TUFT_CLOUD_GEO, TUFT_CLOUD_MAT, items);
  }
}

/* ------------------------------ the places ---------------------------- */

const BIOMES = [
  { // Cottage Garden — a rosy dusk
    sky: [0x2c2478, 0x8a55c4, 0xff9db8], fog: [0xc48fd0, 0.0072],
    ground: [0x55b06c, 0x74c97e], hill: 0x5fb890, path: [0xf2d9ae, 0xe6c595], stones: [0xd9c7a8, 0xc9b79a, 0xe6d8bd],
    key: [0xffd9b0, 3.6], hemi: [0xc9c0ff, 0x9fb89a, 0.8], rim: [0xff9fd0, 2.2], exposure: 1.0,
    terrain: { hill: 6, front: 0.12, rough: 1 }, motes: "fireflies",
    grass: { count: 6400, colors: [0x62bd76, 0x7bd086, 0x55b070, 0x90dc8c] },
    flowers: { count: 110, colors: [0xff9ccf, 0xffffff, 0xc7a8ff, 0xffd166, 0x8fd3ff] },
    hideouts: ["bush", "flower", "mushroom", "stump"],
    build() {
      const leaves = [0x5fbd7c, 0x76cf86, 0x52b082, 0x8ad88a];
      treeLine(() => Math.random() < 0.7 ? roundTree(leaves, 0x9a7460, [0xff9ccf, 0xfff3a8, 0xffffff]) : pineTree([0x4fae84, 0x5cbd90]));
      scatter(9, () => mushroom([0xff6f7d, 0xff9a6b, 0xc58cff], rand(0.8, 1.3)), 2.8, 5.8);
      scatter(5, () => pumpkin(rand(0.7, 1)), 2.8, 5.2);
      scatter(7, () => rock(0xcfc4dd, rand(0.25, 0.45)), 2.6, 7);
      scatter(5, () => rock(0xcfc4dd, rand(0.3, 0.6)), -6, -4.4);
      addScenery(cottage(), -12, -7.4, 1.15, false);
      for (let i = 0; i < 4; i++) addScenery(fencePiece(), -16.5 + i * 2.2, -4.6, 1, false);
      addScenery(lampPost(), 6, -4.5, 1, false);
      addScenery(lampPost(), -24, -4.5, 1, false);
      addScenery(lampPost(), 20, 2.7, 1, false);
    },
  },
  { // Pumpkin Patch — a golden sunset
    sky: [0x3a2a70, 0xd0607e, 0xffb04a], fog: [0xe0957a, 0.0072],
    ground: [0xc2a648, 0xd8bd5c], hill: 0xd0a24a, path: [0xf0d49a, 0xe2bf80], stones: [0xd9c48f, 0xc7ad78, 0xe8d6a8],
    key: [0xffc080, 3.7], hemi: [0xf0c8d8, 0xc0a870, 0.75], rim: [0xff8a7a, 2.2], exposure: 1.0,
    terrain: { hill: 5, front: 0.15, rough: 1 }, motes: "leaves",
    grass: { count: 4600, colors: [0xcbb658, 0xdfc96a, 0xbda64e, 0xd8bd5c] },
    litter: { count: 260, colors: [0xf58a2e, 0xe5603c, 0xf2c14e, 0xd9482e] },
    hideouts: ["pumpkin", "hay", "autumnBush", "stump"],
    build() {
      const leaves = [0xf58a2e, 0xf7a94a, 0xe5603c, 0xf2c14e];
      treeLine(() => roundTree(leaves, 0x7a5644));
      scatter(24, () => pumpkin(rand(0.6, 1.25), pick([0xf58a2e, 0xf7783e, 0xf2b04e])), 2.6, 7);
      scatter(9, () => pumpkin(rand(0.6, 1)), -5.6, -4.3);
      scatter(12, () => cornStalk(), -6, -4.6, 0.9, 1.2);
      scatter(8, () => cornStalk(), 3.6, 6.5, 0.9, 1.2);
      scatter(5, () => hayBale(), 3.2, 6);
      scatter(6, () => rock(0xd9c48f, rand(0.25, 0.45)), 2.6, 7);
      addScenery(scarecrow(), -8, -4.9, 1.2, false);
      addScenery(scarecrow(), 16, -5.1, 1.2, false);
      addScenery(lampPost(0xffb14d), 4, -4.5, 1, false);
      addScenery(lampPost(0xffb14d), -20, 2.8, 1, false);
    },
  },
  { // Misty Pond — a teal evening by the water
    sky: [0x152a66, 0x3a7aa8, 0x8fe0c8], fog: [0x74bfc0, 0.008],
    ground: [0x46a780, 0x62c092], hill: 0x4aa890, path: [0xd3e6c2, 0xbfd9b0], stones: [0xb9cfc0, 0xa5bfb0, 0xd0e0cf], shore: 0xd6d2a2,
    key: [0xffecc8, 3.4], hemi: [0xb0e6ff, 0x7fb0a0, 0.8], rim: [0x7ff0dc, 2.3], exposure: 1.0,
    terrain: { hill: 5.5, front: -0.8, rough: 1, frontFrom: 3.5, frontTo: 5.6 }, water: 0x1c7170, motes: "fireflies",
    grass: { count: 4400, colors: [0x58b78f, 0x70cb9e, 0x4dab86, 0x82d6aa] },
    flowers: { count: 50, colors: [0xffffff, 0xff9ccf, 0xc7a8ff] },
    hideouts: ["lily", "reedClump", "mossRock", "mushroom"],
    build() {
      const leaves = [0x52b392, 0x69c7a0, 0x45a68b];
      treeLine(() => Math.random() < 0.55 ? willow(leaves) : roundTree(leaves, 0x7a6a66));
      for (let i = 0; i < 6; i++) addScenery(lilyPond(rand(1.3, 1.9)), -WORLD_HALF + 4 + i * 10 + rand(-1, 1), -5.0, 1, false);
      scatter(26, () => reeds(), 3.8, 5.0, 0.9, 1.4);
      scatter(14, () => reeds(), -5.6, -4.3, 0.9, 1.3);
      scatter(30, () => lilyPad(rand(0.25, 0.45), 0, 0, 0), 4.6, 9, 1, 1, -0.19);
      scatter(12, () => lilyFlower(0, 0, 0), 4.6, 8.5, 1, 1.3, -0.16);
      scatter(9, () => mushroom([0x8fd3ff, 0xc58cff, 0x7fe0b0], rand(0.8, 1.2), true), 2.2, 3.6);
      scatter(10, () => rock(0xb9cfc0, rand(0.25, 0.5)), 3.4, 4.6);
    },
  },
  { // Mushroom Glade — glowing purple
    sky: [0x1a1050, 0x5a30b0, 0xd070e0], fog: [0x8a5ccc, 0.0075],
    ground: [0x5f68d8, 0x7a7ce8], hill: 0x5a50c0, path: [0xd6caf5, 0xc4b6ee], stones: [0xc0b4ec, 0xab9fe0, 0xd8cdf7],
    key: [0xffd8f0, 3.3], hemi: [0xd0b8ff, 0x8a88d0, 0.85], rim: [0x70f0ff, 2.4], exposure: 1.02,
    terrain: { hill: 5, front: 0.12, rough: 1.1 }, motes: "spores",
    grass: { count: 4600, colors: [0x6f7be0, 0x868aec, 0x927ce6, 0x636fd6] },
    flowers: { count: 70, colors: [0x8ff0e0, 0xff9ccf, 0xfff3a8] },
    hideouts: ["glowMushroom", "crystal", "stump", "fern"],
    build() {
      const caps = [0xff7fb0, 0xc58cff, 0x6fd6e8, 0xff9a6b];
      const leaves = [0xb08cf0, 0x9a7be6, 0xd09af5];
      treeLine(() => Math.random() < 0.6 ? giantMushroom(caps) : twistyTree(leaves));
      scatter(26, () => mushroom(caps, rand(0.8, 1.6), true), 2.6, 7);
      scatter(12, () => mushroom(caps, rand(0.7, 1.1), true), -5.6, -4.3);
      scatter(9, () => crystal([0x8fd3ff, 0xff9ccf, 0xc9a8ff], rand(0.8, 1.3)), 2.8, 7);
      scatter(6, () => crystal([0x8fd3ff, 0xc9a8ff], rand(0.9, 1.4)), -6, -4.6);
      scatter(6, () => rock(0xab9fe0, rand(0.25, 0.5)), 2.6, 7);
    },
  },
  { // Frosty Peak — crisp and snowy
    sky: [0x1c3480, 0x5f95e0, 0xcfe8ff], fog: [0xb4d0f2, 0.006], groundKind: "snow",
    ground: [0xeef5ff, 0xdfeafc], hill: 0xe6f0ff, path: [0xc9dcf5, 0xbcd2ef], stones: [0xb9cdea, 0xa9c0e0, 0xd6e4f7],
    key: [0xffe8cc, 3.0], hemi: [0xc0dcff, 0xb0c4e4, 0.7], rim: [0xa8ccff, 1.8], exposure: 0.92,
    terrain: { hill: 7, front: 0.2, rough: 1.2 }, motes: "snow", pebbles: 90,
    grass: { count: 1200, colors: [0xd6e8fa, 0xc4dcf2, 0xe2effc] },
    hideouts: ["snowDrift", "snowBush", "iceCrystal", "snowman"],
    build() {
      treeLine(() => pineTree([0x479c87, 0x52ab92, 0x3f9080], true));
      scatter(16, () => snowDrift(), 2.8, 7, 0.8, 1.4);
      scatter(9, () => snowDrift(), -5.8, -4.4, 0.7, 1.1);
      scatter(8, () => crystal([0xbfe6ff, 0xdfe9ff, 0x9fd0ff], rand(0.8, 1.3)), 2.8, 7);
      scatter(6, () => pineTree([0x52ab92], true), 3.8, 7.5, 0.45, 0.7);
      scatter(7, () => rock(0xa9c0e0, rand(0.3, 0.55)), 2.6, 7);
      addScenery(snowman(), -10, -4.8, 1.2, false);
      addScenery(snowman(), 14, 3.5, 1.1, false);
      addScenery(lampPost(0xbfe6ff), 2, -4.5, 1, false);
      addScenery(lampPost(0xbfe6ff), -22, 2.8, 1, false);
      for (let i = 0; i < 6; i++) {
        const m = mountain(0x8fa6d9);
        m.position.set(-58 + i * 23 + rand(-4, 4), 4, rand(-62, -50));
        backdrop.add(m);
      }
    },
  },
  { // Moon Castle — above the clouds
    sky: [0x0a0d40, 0x302c98, 0x8a66e6], fog: [0x574cbc, 0.0058], groundKind: "cloud",
    ground: [0xd6cffa, 0xc4bcf2], hill: 0xb9b0f0, path: [0xf0eaff, 0xe2daff], stones: [0xffe9a8, 0xffc9e6, 0xbfe0ff],
    key: [0xffecd0, 2.8], hemi: [0xc4bcff, 0x9890e0, 0.6], rim: [0xffb0ec, 2.1], exposure: 0.9,
    terrain: { hill: 4.5, front: 0.25, rough: 0.8 }, motes: "sparkle", pebbles: 70,
    wisps: { count: 420, colors: [0xffffff, 0xf0ecff, 0xffe6f5] },
    hideouts: ["cloud", "moonFlower", "crystal", "starBush"],
    build() {
      const puffs = [0xffffff, 0xf0ecff, 0xe3dcff, 0xffe6f5];
      for (let x = -WORLD_HALF; x < WORLD_HALF; x += rand(2.4, 3.6)) {
        addScenery(cloudPuff(puffs, rand(1.8, 2.6)), x, rand(-7, -5.6));
        addScenery(cloudPuff(puffs, rand(2.4, 3.4)), x + rand(0.8, 1.6), rand(-12.8, -8.7));
      }
      scatter(18, () => cloudPuff(puffs, rand(0.7, 1.3)), 2.8, 7.5);
      scatter(11, () => crystal([0xffe27a, 0xff9ccf, 0x8fd3ff], rand(0.8, 1.2)), 2.8, 7);
      scatter(7, () => crystal([0xffe27a, 0xc9a8ff], rand(0.8, 1.1)), -5.8, -4.5);
      for (let i = 0; i < 6; i++) addScenery(lampPost(pick([0xffe27a, 0xff9ccf, 0x8fd3ff])), -WORLD_HALF + i * 10 + 3, i % 2 ? 2.7 : -4.5, 1, false);
      for (let i = 0; i < 5; i++) {
        const t = tower(rand(4, 7.5));
        t.position.set(-38 + i * 19 + rand(-3, 3), 2.5, rand(-36, -28));
        t.scale.setScalar(rand(1.2, 1.6));
        t.traverse(o => { o.castShadow = false; });
        backdrop.add(t);
      }
    },
  },
];

/* ----------------------------- hiding spots --------------------------- */

function hideout(kind) {
  const g = new THREE.Group();
  let height = 1;
  const bush = (surface, cols, berries) => {
    g.add(ball(surface(pick(cols)), 0.5, -0.35, 0.4, 0), ball(surface(pick(cols)), 0.6, 0.1, 0.55, 0.05), ball(surface(pick(cols)), 0.45, 0.48, 0.38, 0.1), ball(surface(pick(cols)), 0.34, 0.0, 0.3, 0.35));
    if (berries) for (let i = 0; i < 6; i++) g.add(ball(berries(), 0.07, rand(-0.6, 0.7), rand(0.4, 0.9), 0.5));
    height = 1.05;
  };
  switch (kind) {
    case "bush": bush(K.leaf, [0x5fbd7c, 0x76cf86, 0x52b082], () => K.gloss(pick([0xff7a8a, 0xffd36b]))); break;
    case "autumnBush": bush(K.leaf, [0xf58a2e, 0xe5603c, 0xf2b04e], () => K.gloss(0xffe27a)); break;
    case "snowBush": bush(K.snow, [0xffffff, 0xeaf3ff], () => K.gloss(0xff6f7d)); break;
    case "starBush": bush(K.cloud, [0xffffff, 0xf0ecff, 0xffe6f5], () => shiny(0xffe27a, 2.4)); break;
    case "fern": bush(K.leaf, [0x8a7be6, 0x9a8cf0, 0x7d6fd9], () => shiny(0x8ff0e0, 2.2)); break;
    case "mushroom": g.add(mushroom([0xff6f7d, 0xff9a6b, 0xc58cff], 2.2)); height = 1.25; break;
    case "glowMushroom": g.add(mushroom([0xff7fb0, 0xc58cff, 0x6fd6e8], 2.2, true)); height = 1.25; break;
    case "stump": {
      const bark = K.wood(0xa67c5c);
      g.add(lathe(bark, [[0, 0], [0.72, 0], [0.62, 0.08], [0.5, 0.25], [0.46, 0.55], [0.47, 0.62], [0, 0.62]], 16));
      for (let i = 0; i < 5; i++) {
        const a = i * 1.26 + 0.3;
        g.add(tube(bark, [[Math.cos(a) * 0.4, 0.2, Math.sin(a) * 0.4], [Math.cos(a) * 0.65, 0.06, Math.sin(a) * 0.65], [Math.cos(a) * 0.9, -0.04, Math.sin(a) * 0.9]], 0.13, 0.05, 4, 5));
      }
      g.add(cyl(K.wood(0xf2d8b0), 0.43, 0.43, 0.03, 0, 0.625, 0, 18), cyl(K.wood(0xe2c090), 0.3, 0.3, 0.03, 0, 0.632, 0, 16), cyl(K.wood(0xf2d8b0), 0.17, 0.17, 0.03, 0, 0.639, 0, 12));
      g.add(ball(K.leaf(0x76cf86), 0.2, -0.5, 0.12, 0.2), ball(K.leaf(0x5fbd7c), 0.14, 0.42, 0.5, 0.25));
      height = 0.68;
      break;
    }
    case "flower": case "moonFlower": case "lily": {
      const moonF = kind === "moonFlower";
      g.add(tube(K.plant(0x5fae6a), [[0, 0, 0], [0.06, 0.4, 0], [0, 0.8, 0.02]], 0.06, 0.045, 5, 6));
      for (const s of [-1, 1]) {
        const leaf = petal(K.plant(0x74c98a), 0.42, 0, 0.12, 0);
        leaf.rotation.set(-0.85, s * 1.4, 0, "YXZ");
        g.add(leaf);
      }
      const col = pick(moonF ? [0xfff3a8, 0xc9a8ff] : kind === "lily" ? [0xff9ccf, 0xffffff] : [0xff9ccf, 0xc7a8ff, 0xffb36b]);
      const surface = moonF ? glowMat(col, 0.7) : K.gloss(col);
      for (let i = 0; i < 7; i++) {
        const p = petal(surface, 0.42, 0, 0.85, 0.02);
        p.rotation.z = (i / 7) * Math.PI * 2;
        p.rotation.x = 0.28;
        p.rotation.order = "ZXY";
        g.add(p);
      }
      g.add(ball(K.soft(0xffd166), 0.15, 0, 0.85, 0.1, 1, 1, 0.6));
      height = 1.35;
      break;
    }
    case "pumpkin": g.add(pumpkin(2.0)); height = 1.2; break;
    case "hay": g.add(hayBale()); height = 1.1; break;
    case "reedClump": {
      const r1 = reeds(); r1.position.x = -0.2; const r2 = reeds(); r2.position.x = 0.25; r2.scale.setScalar(0.85);
      g.add(r1, r2, ball(K.leaf(0x69c7a0), 0.3, 0, 0.12, 0.1, 1.6, 0.6, 1));
      height = 1.1;
      break;
    }
    case "mossRock":
      g.add(rock(0xb9c6cc, 0.6, 0, 0.3, 0, 1.2, 0.75, 1), rock(0xa9b8c0, 0.32, 0.6, 0.16, 0.15, 1, 0.8, 1));
      g.add(ball(K.leaf(0x69c7a0), 0.42, -0.12, 0.55, 0, 1.3, 0.42, 1.1));
      height = 0.82;
      break;
    case "crystal": g.add(crystal([0x8fd3ff, 0xff9ccf, 0xc9a8ff], 2.0)); height = 1.25; break;
    case "iceCrystal": g.add(crystal([0xbfe6ff, 0xdfe9ff, 0x9fd0ff], 2.0)); height = 1.25; break;
    case "snowDrift": { const d = snowDrift(); d.scale.setScalar(1.25); g.add(d); height = 0.6; break; }
    case "snowman": g.add(snowman()); height = 1.75; break;
    case "cloud": g.add(cloudPuff([0xffffff, 0xf0ecff, 0xffe6f5], 1.5)); height = 0.95; break;
  }
  g.userData.height = height;
  return g;
}

/* ----------------------------- switching ------------------------------ */

let biomeIndex = -1;
let moonY = 19;       // the moon dips a little when the camera looks down at the cauldron
/* Each of a place's five levels is flown at a different time of day, so no two feel the same.
   A mood bends the place's own colours rather than replacing them:
   sky = [top, middle, horizon] to lean towards and how far; then multipliers for the lights. */
const MOODS = [
  { name: "evening" },
  { name: "golden hour", sky: [0x6a3fa0, 0xff8f6a, 0xffd27a], lean: 0.3, key: [0xffc070, 0.3, 1.06], hemi: 1.0, rim: 1.1, exposure: 1.04, fog: 0.9, stars: 0 },
  { name: "twilight", sky: [0x16154e, 0x5a3f9e, 0xd98ab8], lean: 0.42, key: [0xe9d4ff, 0.35, 0.86], hemi: 0.88, rim: 1.25, exposure: 0.95, fog: 1.0, stars: 0.25 },
  { name: "starry night", sky: [0x070a30, 0x1c2470, 0x5a5ac8], lean: 0.66, key: [0xbfd0ff, 0.6, 0.64], hemi: 0.66, rim: 1.6, exposure: 0.9, fog: 0.85, stars: 0.6 },
  { name: "dawn", sky: [0x5aa6f0, 0xffb8d0, 0xffe6ae], lean: 0.4, key: [0xfff0d0, 0.4, 1.0], hemi: 0.96, rim: 0.9, exposure: 0.95, fog: 0.95, stars: 0 },
];
let moodIndex = 0;
const moodC = new THREE.Color();
function applyLook(b, m) {
  const lean = m.lean || 0;
  const sky = b.sky.map((c, k) => new THREE.Color(c).lerp(moodC.set(m.sky ? m.sky[k] : c), lean));
  skyUniforms.top.value.copy(sky[0]);
  skyUniforms.mid.value.copy(sky[1]);
  skyUniforms.bottom.value.copy(sky[2]);
  // the haze takes on the colour of the horizon
  scene.fog.color.set(b.fog[0]).lerp(sky[2], lean * 0.7);
  fogBase = b.fog[1] * (m.fog || 1);
  hemiLight.color.set(b.hemi[0]).lerp(sky[1], lean * 0.5);
  hemiLight.groundColor.set(b.hemi[1]);
  hemiLight.intensity = b.hemi[2] * (m.hemi || 1);
  keyLight.color.set(b.key[0]);
  if (m.key) keyLight.color.lerp(moodC.set(m.key[0]), m.key[1]);
  keyLight.intensity = b.key[1] * (m.key ? m.key[2] : 1);
  rimLight.color.set(b.rim[0]);
  rimLight.intensity = b.rim[1] * (m.rim || 1);
  RIM_COLOR.value.set(b.rim[0]);
  renderer.toneMappingExposure = b.exposure * (m.exposure || 1);
  buildEnvironment(sky.map(c => c.getHex()), b.ground[0], keyLight.color.getHex(), b.rim[0]);
  setSkyFullness(skyFull);
}
/** Change the time of day without rebuilding the place. */
function setMood(k) {
  moodIndex = k % MOODS.length;
  applyLook(BIOMES[biomeIndex], MOODS[moodIndex]);
}

/** Build a place. `fresh` rebuilds it even if it is already there, so its scenery is laid out anew for each level. */
function setBiome(i, fresh = false, mood = null) {
  if (i === biomeIndex && !fresh) return;
  if (mood !== null) moodIndex = mood % MOODS.length;
  else if (i !== biomeIndex) moodIndex = 0;
  biomeIndex = i;
  const b = BIOMES[i];
  clearGroup(world);
  clearGroup(backdrop);
  scenery = [];
  terrain = b.terrain;

  applyLook(b, MOODS[moodIndex]);

  moon.scale.setScalar(i === 5 ? 2.1 : 1.25);
  moon.position.x = i === 5 ? -10 : -14;
  skyUniforms.uMoon.value.copy(moon.position).normalize();

  buildTerrain(b);
  lake.visible = !!b.water;
  if (b.water) lake.material = waterMaterial(b.water);
  setMotes(b.motes);
  sceneryDetail = true;
  b.build();
  sceneryDetail = false;
  for (const o of backdrop.children) if (o.isGroup) bake(o);
  buildCarpet(b);
  scrollWorld(0);
}

let fogBase = 0.012;
/** Fog thins out when the camera pulls back (portrait screens), so the scene reads the same at any distance. */
function matchFog() {
  scene.fog.density = fogBase * clamp(15 / Math.max(8, camera.position.z), 0.45, 1.25);
}

// Tall scenery steps aside wherever something important is standing (the cauldron, the friends).
const clearing = { on: false, was: false, x: 0, half: 5, zMin: -4.6, zMax: 4.6 };
function scrollWorld(dx) {
  scrollTotal += dx;
  SCROLL.value = scrollTotal;
  const shift = -(((scrollTotal % PERIOD) + PERIOD) % PERIOD);
  ground.position.x = shift;
  carpet.position.x = shift;
  const c = clearing;
  for (const s of scenery) {
    s.position.x -= dx;
    if (s.position.x < -WORLD_HALF) s.position.x += PERIOD;
    if (c.on) s.visible = !(s.userData.tall && Math.abs(s.position.x - c.x) < c.half && s.position.z > c.zMin && s.position.z < c.zMax);
    else if (c.was) s.visible = true;
  }
  c.was = c.on;
}

function resizeWorld() {
  // dust motes are sized in world units; this converts them to pixels on the current screen
  moteUniforms.uScale.value = renderer.getDrawingBufferSize(tmpV2).y / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)));
}

function animateSky(t) {
  for (const s of homeStars) s.scale.setScalar(2.0 + Math.sin(t * 4 + s.userData.phase) * 0.45);
  moon.rotation.z = Math.sin(t * 0.5) * 0.05;
  moon.position.y += (moonY - moon.position.y) * 0.04;
  skyUniforms.uMoon.value.copy(moon.position).normalize();
  matchFog();
}
