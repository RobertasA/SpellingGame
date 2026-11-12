"use strict";
/* =====================================================================
   World: six places, each with its own sky, colours, scenery and
   hiding spots. The wood scrolls right-to-left past the witch.
   ===================================================================== */

const WITCH_X = -4.6;
const REVEAL_X = 8.2;                 // stars peek out of their hiding spots here...
const SPAWN_X = REVEAL_X + 0.9;       // ...just after the spot sprouts in at the right edge
const MISS_X = WITCH_X + 0.7;
const LANES = [1.1, -1.1, -3.1];
const WORLD_HALF = 30;
const STAGE_X = 1.2;                  // where the cauldron sits when it's time to brew

const world = new THREE.Group();      // scrolling scenery
const backdrop = new THREE.Group();   // far-away things that stay put
scene.add(world, backdrop);
let scenery = [];

/* -------------------------------- sky -------------------------------- */

const skyUniforms = {
  top: { value: new THREE.Color(0x3b2f7a) }, mid: { value: new THREE.Color(0x8d6cc9) }, bottom: { value: new THREE.Color(0xffb3c7) },
};
const sky = new THREE.Mesh(
  new THREE.SphereGeometry(180, 32, 16),
  new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false, uniforms: skyUniforms,
    vertexShader: `varying float h; void main(){ h = normalize(position).y;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `uniform vec3 top; uniform vec3 mid; uniform vec3 bottom; varying float h;
      void main(){
        vec3 c = mix(bottom, mid, smoothstep(-0.02, 0.16, h));
        c = mix(c, top, smoothstep(0.12, 0.5, h));
        gl_FragColor = vec4(c, 1.0); }`,
  })
);
scene.add(sky);

// the night sky fills with stars as the game goes on
const SKY_STARS = 320;
const skyStarSets = [];
for (let s = 0; s < 3; s++) {
  const pos = new Float32Array(SKY_STARS * 3);
  for (let i = 0; i < SKY_STARS; i++) {
    pos[i * 3] = rand(-120, 120);
    pos[i * 3 + 1] = 6 + Math.pow(Math.random(), 0.8) * 70;
    pos[i * 3 + 2] = -130;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.PointsMaterial({
    map: starTex, size: (s === 0 ? 14 : 9) * renderer.getPixelRatio(), sizeAttenuation: false,
    transparent: true, depthWrite: false, fog: false, color: [0xfff6c9, 0xffffff, 0xd9e6ff][s],
  });
  const pts = new THREE.Points(geo, mat);
  pts.frustumCulled = false;
  scene.add(pts);
  skyStarSets.push(pts);
}
function setSkyFullness(f) {
  const base = [10, 26, 26];
  skyStarSets.forEach((p, i) => p.geometry.setDrawRange(0, Math.round(base[i] + (SKY_STARS / (i === 0 ? 4 : 1.4) - base[i]) * clamp(f, 0, 1))));
}

// stars sent home during a level twinkle in the sky until the level ends
const homeStars = [];
function addHomeStar(pos, hex) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: starTex, color: hex, transparent: true, depthWrite: false, fog: false }));
  s.position.copy(pos);
  s.scale.setScalar(2.2);
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
  const mk = (c, r, x, y, z) => {
    const m = new THREE.Mesh(cached("circ", () => new THREE.CircleGeometry(1, 48)), flat(c, false));
    m.scale.setScalar(r);
    m.position.set(x, y, z);
    return m;
  };
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: dotTex, color: 0xfff6c9, transparent: true, opacity: 0.55, depthWrite: false, fog: false }));
  halo.scale.setScalar(26);
  halo.position.z = -0.2;
  moon.add(halo);
  moon.add(mk(0xfff6d6, 5, 0, 0, 0));
  moon.add(mk(0xf6e7b4, 0.9, -2.2, 1.9, 0.02), mk(0xf6e7b4, 0.55, 2.6, -1.6, 0.02), mk(0xf6e7b4, 0.4, 1.4, 2.9, 0.02), mk(0xf6e7b4, 0.7, -2.6, -2.3, 0.02));
  for (const x of [-1.5, 1.5]) {
    // sleepy closed eyes
    const lid = new THREE.Mesh(cached("lid", () => new THREE.TorusGeometry(0.55, 0.11, 8, 20, Math.PI)), flat(0x6b4f78, false));
    lid.rotation.z = Math.PI;
    lid.position.set(x, 0.75, 0.04);
    moon.add(lid);
    moon.add(mk(0xffc2c9, 0.62, x * 1.75, -0.55, 0.03));
  }
  const grin = new THREE.Mesh(cached("grin", () => new THREE.TorusGeometry(1.1, 0.13, 8, 24, Math.PI)), flat(0x6b4f78, false));
  grin.rotation.z = Math.PI;
  grin.position.set(0, -0.3, 0.04);
  moon.add(grin);
  moon.position.set(-14, 19, -90);
  moon.scale.setScalar(1.25);
  scene.add(moon);
}

/* ------------------------------ ground ------------------------------- */

const groundMat = new THREE.MeshToonMaterial({ color: 0x8fd6a0, gradientMap });
const ground = new THREE.Mesh(new THREE.PlaneGeometry(260, 110), groundMat);
ground.rotation.x = -Math.PI / 2;
ground.position.z = -25;
ground.receiveShadow = true;
scene.add(ground);
const pathMat = new THREE.MeshToonMaterial({ color: 0xf3e2bf, gradientMap });
const path = new THREE.Mesh(new THREE.PlaneGeometry(260, 5.8), pathMat);
path.rotation.x = -Math.PI / 2;
path.position.set(0, 0.01, -1);
path.receiveShadow = true;
scene.add(path);

/* ------------------------------ scenery ------------------------------ */

function roundTree(leaves, trunk = 0x8f6a55, dots = null) {
  const g = new THREE.Group();
  g.add(cyl(trunk, 0.16, 0.24, 1.8, 0, 0.9, 0));
  const a = pick(leaves), b = pick(leaves);
  g.add(ball(a, 1.05, 0, 2.3, 0));
  g.add(ball(b, 0.75, -0.75, 1.95, 0.2));
  g.add(ball(b, 0.7, 0.75, 2.0, 0.1));
  g.add(ball(a, 0.6, 0.1, 2.95, 0.3));
  if (dots && Math.random() < 0.6) {
    for (let i = 0; i < 4; i++) {
      const an = rand(0, Math.PI * 2);
      g.add(ball(pick(dots), 0.1, Math.cos(an) * 0.9, rand(1.9, 2.8), 0.75));
    }
  }
  return g;
}
function pineTree(colors, snow = false, trunk = 0x8f6a55) {
  const g = new THREE.Group();
  g.add(cyl(trunk, 0.13, 0.18, 0.8, 0, 0.4, 0));
  const c = pick(colors);
  g.add(cone(c, 1.0, 1.4, 0, 1.25, 0));
  g.add(cone(c, 0.8, 1.2, 0, 1.95, 0));
  g.add(cone(c, 0.55, 1.0, 0, 2.6, 0));
  if (snow) {
    g.add(cone(0xffffff, 0.36, 0.62, 0, 2.82, 0));
    g.add(cone(0xffffff, 0.5, 0.5, 0, 2.3, 0.02));
    g.add(cone(0xffffff, 0.62, 0.5, 0, 1.7, 0.03));
  }
  return g;
}
function twistyTree(leaf, trunk = 0x5b4470) {
  const g = new THREE.Group();
  const t1 = cyl(trunk, 0.14, 0.26, 1.3, 0, 0.6, 0); t1.rotation.z = 0.15; g.add(t1);
  const t2 = cyl(trunk, 0.1, 0.15, 1.1, -0.25, 1.6, 0); t2.rotation.z = -0.45; g.add(t2);
  const t3 = cyl(trunk, 0.07, 0.11, 0.9, 0.42, 1.55, 0); t3.rotation.z = 0.8; g.add(t3);
  g.add(ball(pick(leaf), 0.72, -0.62, 2.35, 0), ball(pick(leaf), 0.58, 0.9, 2.0, 0.1), ball(pick(leaf), 0.5, -0.1, 2.9, 0.1));
  return g;
}
function willow(leaf, trunk = 0x7a6a66) {
  const g = new THREE.Group();
  g.add(cyl(trunk, 0.18, 0.28, 2.0, 0, 1.0, 0));
  g.add(ball(pick(leaf), 1.25, 0, 2.6, 0, 1, 0.7, 1));
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2;
    g.add(ball(pick(leaf), 0.2, Math.cos(a) * 1.05, 1.75 + Math.sin(i * 2.3) * 0.2, Math.sin(a) * 1.0, 1, 3.6, 1));
  }
  return g;
}
function flower(petals) {
  const g = new THREE.Group();
  g.add(cyl(0x5fae6a, 0.025, 0.025, 0.4, 0, 0.2, 0, 6));
  const petal = pick(petals);
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    g.add(ball(petal, 0.07, Math.cos(a) * 0.08, 0.42, Math.sin(a) * 0.08));
  }
  g.add(ball(0xffc93c, 0.055, 0, 0.44, 0));
  return g;
}
function mushroom(caps, scale = 1, glow = false) {
  const g = new THREE.Group();
  g.add(cyl(0xfff3e0, 0.12, 0.15, 0.35, 0, 0.17, 0));
  const c = pick(caps);
  g.add(dome(glow ? shiny(c, 0.35) : c, 0.3, 0, 0.32, 0));
  for (let i = 0; i < 4; i++) {
    const a = i * 1.7;
    g.add(ball(glow ? shiny(0xfff7c2, 0.9) : 0xffffff, 0.045, Math.cos(a) * 0.18, 0.5, Math.sin(a) * 0.18));
  }
  g.scale.setScalar(scale);
  return g;
}
function giantMushroom(caps) {
  const g = new THREE.Group();
  const stem = cyl(0xf3e9ff, 0.22, 0.34, 2.2, 0, 1.1, 0);
  stem.rotation.z = rand(-0.1, 0.1);
  g.add(stem);
  const c = pick(caps);
  g.add(dome(shiny(c, 0.25), 1.25, 0, 2.1, 0, 0.75));
  const under = disc(0xfff3e0, 1.2, 0, 2.1, 0);
  under.rotation.x = Math.PI / 2;
  g.add(under);
  for (let i = 0; i < 6; i++) {
    const a = i * 1.1 + rand(0, 0.4), r = rand(0.4, 0.95);
    g.add(ball(shiny(0xfff7c2, 0.9), rand(0.09, 0.16), Math.cos(a) * r, 2.1 + Math.sqrt(Math.max(0, 1.56 - r * r)) * 0.72, Math.sin(a) * r, 1, 0.5, 1));
  }
  return g;
}
function grassTuft(colors) {
  const g = new THREE.Group();
  const c = pick(colors);
  for (let i = 0; i < 3; i++) g.add(cone(c, 0.06, rand(0.25, 0.4), (i - 1) * 0.07, 0.15, 0, 0, (i - 1) * 0.35, 5));
  return g;
}
function stone(color) {
  const m = ball(color, rand(0.18, 0.3), 0, 0.02, 0, 1, 0.25, 0.8);
  m.castShadow = false;
  m.receiveShadow = true;
  return m;
}
function pumpkin(scale = 1, color = 0xf58a2e) {
  const g = new THREE.Group();
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    g.add(ball(i % 2 ? color : 0xf79a3e, 0.3, Math.cos(a) * 0.16, 0.3, Math.sin(a) * 0.16, 1, 0.95, 1));
  }
  const stem = cyl(0x5fae6a, 0.04, 0.06, 0.2, 0.02, 0.62, 0, 8);
  stem.rotation.z = 0.3;
  g.add(stem);
  g.scale.setScalar(scale);
  return g;
}
function hayBale() {
  const g = new THREE.Group();
  const b = cyl(0xf2d27a, 0.55, 0.55, 0.9, 0, 0.55, 0, 20);
  b.rotation.x = Math.PI / 2;
  b.rotation.z = Math.PI / 2;
  g.add(b);
  const band = cyl(0xd9b45a, 0.565, 0.565, 0.12, 0, 0.55, 0, 20);
  band.rotation.x = Math.PI / 2;
  band.rotation.z = Math.PI / 2;
  g.add(band);
  return g;
}
function scarecrow() {
  const g = new THREE.Group();
  g.add(cyl(0x8a5a3c, 0.05, 0.05, 1.7, 0, 0.85, 0, 8));
  const arms = cyl(0x8a5a3c, 0.04, 0.04, 1.3, 0, 1.2, 0, 8);
  arms.rotation.z = Math.PI / 2;
  g.add(arms);
  g.add(ball(0x6fa8dc, 0.26, 0, 1.1, 0, 1.3, 1.1, 0.8));
  g.add(ball(0xf7e2b0, 0.25, 0, 1.6, 0));
  eye(g, -0.09, 1.63, 0.21, 0.04); eye(g, 0.09, 1.63, 0.21, 0.04);
  smile(g, 0.07, 0, 1.56, 0.23);
  g.add(cyl(0xc9955f, 0.4, 0.42, 0.04, 0, 1.8, 0, 16));
  g.add(cone(0xc9955f, 0.24, 0.36, 0, 1.98, 0, 0, 0.15, 12));
  for (const s of [-1, 1]) g.add(ball(0xf2d27a, 0.09, s * 0.66, 1.2, 0, 1.3, 0.8, 0.8));
  return g;
}
function cornStalk() {
  const g = new THREE.Group();
  g.add(cyl(0x9bbf5a, 0.04, 0.05, 1.5, 0, 0.75, 0, 6));
  for (let i = 0; i < 4; i++) {
    const leaf = ball(0xa8cc62, 0.2, (i % 2 ? 0.16 : -0.16), 0.5 + i * 0.28, 0, 1, 0.22, 0.5);
    leaf.rotation.z = i % 2 ? -0.7 : 0.7;
    g.add(leaf);
  }
  g.add(ball(0xffd45e, 0.08, 0.06, 1.25, 0.05, 1, 2, 1));
  return g;
}
function reeds() {
  const g = new THREE.Group();
  for (let i = 0; i < 4; i++) {
    const h = rand(0.9, 1.5), x = (i - 1.5) * 0.14, z = rand(-0.1, 0.1);
    const st = cyl(0x6fb38a, 0.022, 0.03, h, x, h / 2, z, 6);
    st.rotation.z = (i - 1.5) * 0.07;
    g.add(st);
    if (i % 2 === 0) g.add(ball(0x8a5a3c, 0.055, x + (i - 1.5) * 0.07 * h * 0.5, h, z, 1, 2.6, 1));
  }
  return g;
}
function lilyPond(w = 2.4) {
  const g = new THREE.Group();
  const water = disc(shiny(0x66c7d9, 0.25), w, 0, 0.03, 0);
  water.scale.set(w, w * 0.6, 1);
  g.add(water);
  for (let i = 0; i < 4; i++) {
    const a = rand(0, Math.PI * 2), r = rand(0.2, 0.7) * w;
    const pad = disc(0x5fbf7a, rand(0.22, 0.34), Math.cos(a) * r, 0.05, Math.sin(a) * r * 0.55);
    g.add(pad);
    if (i % 2) g.add(ball(pick([0xff9ccf, 0xffffff]), 0.09, Math.cos(a) * r, 0.1, Math.sin(a) * r * 0.55, 1, 0.7, 1));
  }
  return g;
}
function crystal(colors, scale = 1) {
  const g = new THREE.Group();
  for (let i = 0; i < 3; i++) {
    const c = pick(colors);
    const m = new THREE.Mesh(cached("octa", () => new THREE.OctahedronGeometry(1, 0)), shiny(c, 0.45));
    const h = [0.55, 0.38, 0.3][i];
    m.scale.set(h * 0.38, h, h * 0.38);
    m.position.set([0, 0.26, -0.24][i], h * 0.75, [0, 0.08, 0.05][i]);
    m.rotation.z = [0, -0.35, 0.4][i];
    m.castShadow = true;
    g.add(m);
  }
  g.scale.setScalar(scale);
  return g;
}
function snowman() {
  const g = new THREE.Group();
  g.add(ball(0xffffff, 0.42, 0, 0.38, 0), ball(0xffffff, 0.3, 0, 0.95, 0), ball(0xffffff, 0.22, 0, 1.38, 0));
  eye(g, -0.08, 1.42, 0.19, 0.035); eye(g, 0.08, 1.42, 0.19, 0.035);
  g.add(cone(0xffa64d, 0.04, 0.18, 0, 1.36, 0.28, Math.PI / 2, 0, 8));
  const sc = torus(0xff6f7d, 0.2, 0.05, 0, 1.2, 0);
  sc.rotation.x = Math.PI / 2;
  g.add(sc);
  g.add(cyl(0x4a3566, 0.2, 0.2, 0.03, 0, 1.56, 0, 14), cyl(0x4a3566, 0.13, 0.14, 0.22, 0, 1.68, 0, 14));
  return g;
}
function snowDrift() {
  const g = new THREE.Group();
  g.add(ball(0xffffff, 0.6, 0, 0.05, 0, 1.2, 0.5, 0.9), ball(0xf2f8ff, 0.42, 0.55, 0.02, 0.1, 1.2, 0.5, 0.9));
  return g;
}
function cloudPuff(colors, scale = 1) {
  const g = new THREE.Group();
  const n = 3 + Math.floor(Math.random() * 2);
  for (let j = 0; j < n; j++) {
    const m = ball(pick(colors), rand(0.42, 0.62), (j - n / 2 + 0.5) * 0.55, rand(0.25, 0.4), rand(-0.1, 0.1));
    m.castShadow = false;
    g.add(m);
  }
  g.scale.setScalar(scale);
  return g;
}
function lampPost(color = 0xffe27a) {
  const g = new THREE.Group();
  g.add(cyl(0x4a3f63, 0.05, 0.07, 1.8, 0, 0.9, 0, 8));
  const arm = torus(0x4a3f63, 0.2, 0.03, 0.2, 1.8, 0, Math.PI);
  g.add(arm);
  const lamp = new THREE.Mesh(STAR_GEO, shiny(color, 1));
  lamp.scale.setScalar(0.16);
  lamp.position.set(0.4, 1.62, 0);
  g.add(lamp);
  const gl = glowSprite(color, 2.2, 0.5);
  gl.position.set(0.4, 1.62, 0.1);
  g.add(gl);
  return g;
}
function fencePiece() {
  const g = new THREE.Group();
  for (let i = 0; i < 4; i++) {
    g.add(cyl(0xfff3e0, 0.06, 0.06, 0.7, i * 0.42, 0.35, 0, 6));
    g.add(cone(0xfff3e0, 0.07, 0.14, i * 0.42, 0.77, 0, 0, 0, 6));
  }
  const rail = cyl(0xfff3e0, 0.035, 0.035, 1.5, 0.63, 0.45, 0, 6);
  rail.rotation.z = Math.PI / 2;
  g.add(rail);
  return g;
}
function cottage() {
  const g = new THREE.Group();
  g.add(cyl(0xfff0d9, 1.5, 1.65, 1.9, 0, 0.95, 0, 20));
  g.add(cone(0x7d5bd0, 2.15, 2.1, 0, 2.9, 0, 0, 0, 20));
  const top = cone(0x7d5bd0, 0.7, 1.3, 0.3, 4.2, 0, 0, -0.5, 14);
  g.add(top);
  g.add(ball(0xffcf4a, 0.16, 0.72, 4.7, 0));
  const door = ball(0x8a5a3c, 0.5, 0, 0.55, 1.5, 0.75, 1.2, 0.25);
  g.add(door);
  g.add(ball(0xffcf4a, 0.05, 0.2, 0.6, 1.64));
  for (const x of [-0.95, 0.95]) {
    const w = ball(shiny(0xffe27a, 1), 0.32, x, 1.15, 1.2, 1, 1, 0.3);
    w.lookAt(x * 2, 1.15, 4);
    g.add(w);
    const gl = glowSprite(0xffd76b, 2.4, 0.4);
    gl.position.set(x * 1.1, 1.15, 1.5);
    g.add(gl);
  }
  g.add(cyl(0xc98f72, 0.2, 0.24, 0.9, -0.9, 3.2, -0.2, 10));
  return g;
}
function tower(h = 6) {
  const g = new THREE.Group();
  g.add(cyl(0xcfc4f5, 1.0, 1.15, h, 0, h / 2, 0, 16));
  g.add(cone(0x6b4bb8, 1.45, 2.4, 0, h + 1.2, 0, 0, 0, 16));
  g.add(ball(shiny(0xffe27a, 1), 0.2, 0, h + 2.5, 0));
  for (let i = 0; i < Math.floor(h / 2); i++) {
    const w = ball(shiny(0xffe27a, 1), 0.26, 0, 1.6 + i * 1.8, 1.02, 0.8, 1.2, 0.2);
    g.add(w);
  }
  return g;
}
function mountain(snowy = true) {
  const g = new THREE.Group();
  const h = rand(14, 22), r = rand(9, 13);
  const m = cone(0x8fa6d9, r, h, 0, h / 2 - 2, 0, 0, 0, 7);
  m.castShadow = false;
  g.add(m);
  if (snowy) {
    const c = cone(0xffffff, r * 0.36, h * 0.36, 0, h * 0.82 - 2, 0, 0, 0, 7);
    c.castShadow = false;
    g.add(c);
  }
  return g;
}

const sceneryBox = new THREE.Box3();
function addScenery(obj, x, z, scale = 1, turn = true) {
  obj.position.set(x, 0, z);
  obj.scale.multiplyScalar(scale);
  if (turn) obj.rotation.y = rand(-0.5, 0.5);
  bake(obj);
  obj.userData.tall = sceneryBox.setFromObject(obj).max.y > 0.75;
  world.add(obj);
  scenery.push(obj);
  return obj;
}
function scatter(n, make, zMin, zMax, sMin = 1, sMax = 1) {
  for (let i = 0; i < n; i++) addScenery(make(), rand(-WORLD_HALF, WORLD_HALF), rand(zMin, zMax), rand(sMin, sMax));
}
function treeLine(make) {
  for (let x = -WORLD_HALF; x < WORLD_HALF; x += rand(2.3, 3.5)) {
    addScenery(make(), x, rand(-6.6, -5.2), rand(0.9, 1.15));
    addScenery(make(), x + rand(0.8, 1.6), rand(-12.5, -8.2), rand(1.1, 1.5));
  }
}
function hills(colors, n = 9) {
  for (let i = 0; i < n; i++) {
    const h = ball(colors[i % colors.length], rand(8, 13), -52 + i * 13 + rand(-3, 3), -5, rand(-36, -29), 1.4, 0.75, 1);
    h.castShadow = false;
    backdrop.add(h);
  }
}

/* ------------------------------ the places ---------------------------- */

const BIOMES = [
  { // Cottage Garden — a rosy dusk
    sky: [0x4a3d95, 0xb07bd0, 0xffc3cf], fog: 0xc79fd6, ground: 0x86d39a, path: 0xf7e3c0,
    hemi: [0xfff0ff, 0x8fd09a, 1.45], light: [0xffe9d6, 1.9], ambient: "fireflies",
    hideouts: ["bush", "flower", "mushroom", "stump"],
    build() {
      const leaves = [0x6fc98a, 0x86d68f, 0x5fbd8f];
      treeLine(() => Math.random() < 0.7 ? roundTree(leaves, 0x9a7460, [0xff9ccf, 0xfff3a8, 0xffffff]) : pineTree([0x57b38a, 0x62c296]));
      scatter(44, () => flower([0xff9ccf, 0xffffff, 0xc7a8ff, 0xffd166, 0x8fd3ff]), 2.4, 6, 0.9, 1.4);
      scatter(22, () => flower([0xff9ccf, 0xffffff, 0xffd166]), -4.8, -4.1);
      scatter(36, () => grassTuft([0x74c98a, 0x8adb96, 0x62bd84]), -4.6, 6);
      scatter(8, () => mushroom([0xff6f7d, 0xff9a6b, 0xc58cff], rand(0.7, 1.1)), 2.6, 5.5);
      scatter(22, () => stone(0xe9d6b4), -3.6, 1.6);
      scatter(4, () => pumpkin(rand(0.7, 1)), 2.6, 5);
      addScenery(cottage(), -12, -7.2, 1.15, false);
      for (let i = 0; i < 4; i++) addScenery(fencePiece(), -16.5 + i * 2.2, -4.5, 1, false);
      addScenery(lampPost(), 6, -4.4, 1, false);
      addScenery(lampPost(), -24, -4.4, 1, false);
      addScenery(lampPost(), 20, 2.6, 1, false);
      hills([0x8fcf9d, 0xa3dba6, 0x7fc59a]);
    },
  },
  { // Pumpkin Patch — a golden sunset
    sky: [0x54407f, 0xd9799a, 0xffc978], fog: 0xe6a98a, ground: 0xd8c56c, path: 0xf2d9a2,
    hemi: [0xfff1dc, 0xd9b45a, 1.45], light: [0xffd9a8, 2.0], ambient: "leaves",
    hideouts: ["pumpkin", "hay", "autumnBush", "stump"],
    build() {
      const leaves = [0xf58a2e, 0xf7a94a, 0xe5603c, 0xf2c14e];
      treeLine(() => roundTree(leaves, 0x7a5644));
      scatter(26, () => pumpkin(rand(0.6, 1.25), pick([0xf58a2e, 0xf7783e, 0xf2b04e])), 2.4, 6);
      scatter(10, () => pumpkin(rand(0.6, 1)), -4.9, -4.1);
      scatter(30, () => grassTuft([0xc9b14e, 0xe0c966, 0xb8a04a]), -4.6, 6);
      scatter(12, () => cornStalk(), -5.4, -4.4, 0.9, 1.2);
      scatter(8, () => cornStalk(), 3.4, 6, 0.9, 1.2);
      scatter(5, () => hayBale(), 3, 5.5);
      scatter(18, () => stone(0xe6cf9a), -3.6, 1.6);
      addScenery(scarecrow(), -8, -4.8, 1.2, false);
      addScenery(scarecrow(), 16, -5, 1.2, false);
      addScenery(lampPost(0xffb14d), 4, -4.4, 1, false);
      addScenery(lampPost(0xffb14d), -20, 2.7, 1, false);
      hills([0xd9b45a, 0xe6c56a, 0xc9a04e]);
    },
  },
  { // Misty Pond — a teal evening
    sky: [0x243a7a, 0x4f8fb8, 0x9fe6d0], fog: 0x7fc4c2, ground: 0x6fc7a2, path: 0xd9eccb,
    hemi: [0xe6fff8, 0x5fb79a, 1.4], light: [0xdff6ff, 1.9], ambient: "fireflies",
    hideouts: ["lily", "reedClump", "mossRock", "mushroom"],
    build() {
      const leaves = [0x5fbf9a, 0x74cfa6, 0x4fae93];
      treeLine(() => Math.random() < 0.55 ? willow(leaves) : roundTree(leaves, 0x7a6a66));
      for (let i = 0; i < 7; i++) addScenery(lilyPond(rand(1.8, 2.8)), -WORLD_HALF + i * 8.6 + rand(-1, 1), rand(3.6, 5), 1, false);
      for (let i = 0; i < 6; i++) addScenery(lilyPond(rand(1.4, 2)), -WORLD_HALF + 4 + i * 10 + rand(-1, 1), -4.9, 1, false);
      scatter(30, () => reeds(), 2.4, 6, 0.9, 1.3);
      scatter(16, () => reeds(), -5.3, -4.2, 0.9, 1.3);
      scatter(30, () => grassTuft([0x5fbf93, 0x74d0a2, 0x4fae8a]), -4.6, 6);
      scatter(10, () => mushroom([0x8fd3ff, 0xc58cff, 0x7fe0b0], rand(0.7, 1.1), true), 2.4, 5.5);
      scatter(22, () => stone(0xc6dcc2), -3.6, 1.6);
      scatter(12, () => flower([0xffffff, 0xff9ccf, 0xc7a8ff]), 2.4, 5, 0.9, 1.3);
      hills([0x62b89c, 0x74c7a8, 0x56ab95]);
    },
  },
  { // Mushroom Glade — glowing purple
    sky: [0x2a1b63, 0x7046b8, 0xd58be0], fog: 0x9a6fd0, ground: 0x7d88e0, path: 0xd9cdf7,
    hemi: [0xf3e6ff, 0x7d88e0, 1.4], light: [0xf0dcff, 1.9], ambient: "spores",
    hideouts: ["glowMushroom", "crystal", "stump", "fern"],
    build() {
      const caps = [0xff7fb0, 0xc58cff, 0x6fd6e8, 0xff9a6b];
      const leaves = [0xb08cf0, 0x9a7be6, 0xd09af5];
      treeLine(() => Math.random() < 0.6 ? giantMushroom(caps) : twistyTree(leaves));
      scatter(30, () => mushroom(caps, rand(0.7, 1.4), true), 2.4, 6);
      scatter(12, () => mushroom(caps, rand(0.6, 1), true), -4.9, -4.1);
      scatter(10, () => crystal([0x8fd3ff, 0xff9ccf, 0xc9a8ff], rand(0.7, 1.2)), 2.6, 6);
      scatter(6, () => crystal([0x8fd3ff, 0xc9a8ff], rand(0.8, 1.3)), -5.4, -4.4);
      scatter(34, () => grassTuft([0x6f7be0, 0x8a93ee, 0x9a7be6]), -4.6, 6);
      scatter(20, () => stone(0xc9bdf0), -3.6, 1.6);
      scatter(14, () => flower([0x8ff0e0, 0xff9ccf, 0xfff3a8]), 2.4, 5.5, 0.9, 1.3);
      hills([0x6a63c9, 0x7d74d9, 0x5c56b8]);
    },
  },
  { // Frosty Peak — crisp and snowy
    sky: [0x2f478f, 0x7fa8e0, 0xdff1ff], fog: 0xbcd6f2, ground: 0xeef6ff, path: 0xd6e6fa,
    hemi: [0xffffff, 0xbfd6f5, 1.35], light: [0xfff6e6, 1.7], ambient: "snow",
    hideouts: ["snowDrift", "snowBush", "iceCrystal", "snowman"],
    build() {
      treeLine(() => pineTree([0x4fa68f, 0x5bb59a, 0x45998a], true));
      scatter(18, () => snowDrift(), 2.6, 6, 0.8, 1.4);
      scatter(10, () => snowDrift(), -5.2, -4.2, 0.7, 1.1);
      scatter(8, () => crystal([0xbfe6ff, 0xdfe9ff, 0x9fd0ff], rand(0.7, 1.2)), 2.6, 6);
      scatter(6, () => pineTree([0x5bb59a], true), 3.6, 6.5, 0.45, 0.7);
      scatter(18, () => stone(0xc6d6ee), -3.6, 1.6);
      addScenery(snowman(), -10, -4.7, 1.2, false);
      addScenery(snowman(), 14, 3.4, 1.1, false);
      addScenery(lampPost(0xbfe6ff), 2, -4.4, 1, false);
      addScenery(lampPost(0xbfe6ff), -22, 2.7, 1, false);
      for (let i = 0; i < 6; i++) {
        const m = mountain();
        m.position.set(-55 + i * 22 + rand(-4, 4), 0, rand(-48, -38));
        backdrop.add(m);
      }
      hills([0xdfeaff, 0xeef6ff, 0xcfe0f7]);
    },
  },
  { // Moon Castle — above the clouds
    sky: [0x12154d, 0x3f3a9e, 0x9a7be6], fog: 0x6f66c9, ground: 0xc9c2f5, path: 0xefe9ff,
    hemi: [0xf0ecff, 0x9a8fe6, 1.4], light: [0xfff3d6, 1.9], ambient: "sparkle",
    hideouts: ["cloud", "moonFlower", "crystal", "starBush"],
    build() {
      const puffs = [0xffffff, 0xf0ecff, 0xe3dcff, 0xffe6f5];
      for (let x = -WORLD_HALF; x < WORLD_HALF; x += rand(2.4, 3.6)) {
        addScenery(cloudPuff(puffs, rand(1.8, 2.6)), x, rand(-6.8, -5.4));
        addScenery(cloudPuff(puffs, rand(2.4, 3.4)), x + rand(0.8, 1.6), rand(-12.5, -8.5));
      }
      scatter(24, () => cloudPuff(puffs, rand(0.7, 1.3)), 2.6, 6.5);
      scatter(12, () => crystal([0xffe27a, 0xff9ccf, 0x8fd3ff], rand(0.7, 1.1)), 2.6, 6);
      scatter(8, () => crystal([0xffe27a, 0xc9a8ff], rand(0.7, 1)), -5.2, -4.3);
      scatter(18, () => stone(0xdcd5fa), -3.6, 1.6);
      for (let i = 0; i < 6; i++) addScenery(lampPost(pick([0xffe27a, 0xff9ccf, 0x8fd3ff])), -WORLD_HALF + i * 10 + 3, i % 2 ? 2.6 : -4.4, 1, false);
      for (let i = 0; i < 5; i++) {
        const t = tower(rand(4, 7.5));
        t.position.set(-38 + i * 19 + rand(-3, 3), -1, rand(-30, -22));
        t.scale.setScalar(rand(1.1, 1.5));
        t.traverse(o => { o.castShadow = false; });
        backdrop.add(t);
      }
      hills([0xb6adf0, 0xcfc8fa, 0xa59be6], 9);
    },
  },
];

/* ----------------------------- hiding spots --------------------------- */

function hideout(kind) {
  const g = new THREE.Group();
  let height = 1;
  const bush = (cols, berries) => {
    const c = pick(cols);
    g.add(ball(c, 0.5, -0.35, 0.4, 0), ball(c, 0.6, 0.1, 0.55, 0.05), ball(pick(cols), 0.45, 0.48, 0.38, 0.1));
    if (berries) for (let i = 0; i < 5; i++) g.add(ball(pick(berries), 0.07, rand(-0.6, 0.7), rand(0.4, 0.9), 0.5));
    height = 1.05;
  };
  switch (kind) {
    case "bush": bush([0x6fc98a, 0x7fd493], [0xff7a8a, 0xffd36b]); break;
    case "autumnBush": bush([0xf58a2e, 0xe5603c, 0xf2b04e], [0xffe27a]); break;
    case "snowBush": bush([0xffffff, 0xeaf3ff], [0xff6f7d]); break;
    case "starBush": bush([0xffffff, 0xf0ecff, 0xffe6f5], [shiny(0xffe27a, 1)]); break;
    case "fern": bush([0x8a7be6, 0x9a8cf0, 0x7d6fd9], [shiny(0x8ff0e0, 0.9)]); break;
    case "mushroom": g.add(mushroom([0xff6f7d, 0xff9a6b, 0xc58cff], 2.2)); height = 1.15; break;
    case "glowMushroom": g.add(mushroom([0xff7fb0, 0xc58cff, 0x6fd6e8], 2.2, true)); height = 1.15; break;
    case "stump":
      g.add(cyl(0xb98c6c, 0.45, 0.55, 0.6, 0, 0.3, 0));
      g.add(cyl(0xf2d8b0, 0.45, 0.45, 0.04, 0, 0.61, 0));
      g.add(cyl(0xd9b48a, 0.25, 0.25, 0.045, 0, 0.615, 0));
      g.add(ball(0x7fd493, 0.2, -0.5, 0.12, 0.2));
      height = 0.65;
      break;
    case "flower": case "moonFlower": case "lily": {
      const moonF = kind === "moonFlower";
      g.add(cyl(0x5fae6a, 0.05, 0.06, 0.8, 0, 0.4, 0, 8));
      const leaf = ball(0x74c98a, 0.2, 0.18, 0.3, 0, 1, 0.35, 0.6);
      leaf.rotation.z = -0.6;
      g.add(leaf);
      const c = moonF ? shiny(pick([0xfff3a8, 0xc9a8ff]), 0.5) : pick(kind === "lily" ? [0xff9ccf, 0xffffff] : [0xff9ccf, 0xc7a8ff, 0xffb36b]);
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        g.add(ball(c, 0.2, Math.cos(a) * 0.24, 0.85 + Math.sin(a) * 0.24, 0, 1, 1, 0.4));
      }
      g.add(ball(0xffd166, 0.15, 0, 0.85, 0.05, 1, 1, 0.6));
      height = 1.35;
      break;
    }
    case "pumpkin": g.add(pumpkin(1.9)); height = 1.2; break;
    case "hay": g.add(hayBale()); height = 1.1; break;
    case "reedClump": {
      const r1 = reeds(); r1.position.x = -0.2; const r2 = reeds(); r2.position.x = 0.25; r2.scale.setScalar(0.85);
      g.add(r1, r2, ball(0x74c98a, 0.3, 0, 0.12, 0.1, 1.6, 0.6, 1));
      height = 1.1;
      break;
    }
    case "mossRock":
      g.add(ball(0xb9c6cc, 0.55, 0, 0.3, 0, 1.2, 0.8, 1), ball(0x74c98a, 0.4, -0.15, 0.55, 0, 1.3, 0.45, 1.1), ball(0xb9c6cc, 0.3, 0.55, 0.18, 0.15));
      height = 0.8;
      break;
    case "crystal": g.add(crystal([0x8fd3ff, 0xff9ccf, 0xc9a8ff], 1.8)); height = 1.25; break;
    case "iceCrystal": g.add(crystal([0xbfe6ff, 0xdfe9ff, 0x9fd0ff], 1.8)); height = 1.25; break;
    case "snowDrift": g.add(snowDrift()); g.children[0].scale.setScalar(1.25); height = 0.6; break;
    case "snowman": g.add(snowman()); height = 1.75; break;
    case "cloud": g.add(cloudPuff([0xffffff, 0xf0ecff, 0xffe6f5], 1.5)); height = 0.95; break;
  }
  g.userData.height = height;
  return g;
}

/* ----------------------------- switching ------------------------------ */

let biomeIndex = -1;
let moonY = 19;       // the moon dips a little when the camera looks down at the cauldron
function setBiome(i) {
  if (i === biomeIndex) return;
  biomeIndex = i;
  const b = BIOMES[i];
  clearGroup(world);
  clearGroup(backdrop);
  scenery = [];
  skyUniforms.top.value.set(b.sky[0]);
  skyUniforms.mid.value.set(b.sky[1]);
  skyUniforms.bottom.value.set(b.sky[2]);
  scene.fog.color.set(b.fog);
  groundMat.color.set(b.ground);
  pathMat.color.set(b.path);
  hemiLight.color.set(b.hemi[0]);
  hemiLight.groundColor.set(b.hemi[1]);
  hemiLight.intensity = b.hemi[2];
  moonLight.color.set(b.light[0]);
  moonLight.intensity = b.light[1];
  moon.scale.setScalar(i === 5 ? 2.1 : 1.25);
  moon.position.x = i === 5 ? -10 : -14;
  sceneryDetail = true;
  b.build();
  sceneryDetail = false;
  for (const o of backdrop.children) if (o.isGroup) bake(o);
}

// Tall scenery steps aside wherever something important is standing (the cauldron, the friends).
const clearing = { on: false, was: false, x: 0, half: 5, zMin: -4.6, zMax: 4.6 };
function scrollWorld(dx) {
  const c = clearing;
  for (const s of scenery) {
    s.position.x -= dx;
    if (s.position.x < -WORLD_HALF) s.position.x += WORLD_HALF * 2;
    if (c.on) s.visible = !(s.userData.tall && Math.abs(s.position.x - c.x) < c.half && s.position.z > c.zMin && s.position.z < c.zMax);
    else if (c.was) s.visible = true;
  }
  c.was = c.on;
}

/* ------------------------- drifting ambience -------------------------- */

function ambient(dt, speed) {
  const kind = BIOMES[biomeIndex]?.ambient;
  if (!kind) return;
  const drift = -speed * 0.6 - 0.2;
  if (kind === "fireflies" && Math.random() < dt * 5) {
    emit({ pos: new THREE.Vector3(rand(-11, 12), rand(0.4, 3.6), rand(-5, 4)), vel: new THREE.Vector3(drift, rand(-0.1, 0.3), rand(-0.1, 0.1)),
           color: pick([0xfff3a8, 0xd8ff9a, 0xffe27a]), size: rand(0.14, 0.26), life: rand(2, 4), tex: dotTex, add: true });
  } else if (kind === "leaves" && Math.random() < dt * 4) {
    emit({ pos: new THREE.Vector3(rand(-8, 14), rand(3, 6), rand(-5, 3)), vel: new THREE.Vector3(drift - 0.5, rand(-0.9, -0.4), 0),
           color: pick([0xf58a2e, 0xe5603c, 0xf2c14e]), size: rand(0.16, 0.26), life: rand(3, 5), tex: dropTex, spin: rand(-3, 3) });
  } else if (kind === "spores" && Math.random() < dt * 7) {
    emit({ pos: new THREE.Vector3(rand(-11, 12), rand(0.2, 3), rand(-5, 4)), vel: new THREE.Vector3(drift, rand(0.15, 0.5), 0),
           color: pick([0xff9ccf, 0x8ff0e0, 0xfff3a8, 0xc9a8ff]), size: rand(0.1, 0.22), life: rand(2, 4), tex: dotTex, add: true });
  } else if (kind === "snow" && Math.random() < dt * 16) {
    emit({ pos: new THREE.Vector3(rand(-11, 14), rand(5, 8), rand(-6, 4)), vel: new THREE.Vector3(drift - 0.3, rand(-1.4, -0.8), 0),
           color: 0xffffff, size: rand(0.1, 0.2), life: rand(4, 6), tex: dotTex });
  } else if (kind === "sparkle" && Math.random() < dt * 6) {
    emit({ pos: new THREE.Vector3(rand(-11, 12), rand(0.4, 5), rand(-5, 4)), vel: new THREE.Vector3(drift, rand(-0.1, 0.2), 0),
           color: pick([0xfff3a8, 0xffffff, 0xff9ccf, 0x8fd3ff]), size: rand(0.14, 0.28), life: rand(1.2, 2.4), tex: starTex, add: true });
  }
}
function animateSky(t) {
  skyStarSets.forEach((p, i) => { p.material.opacity = 0.65 + Math.sin(t * (1.1 + i * 0.7) + i * 2) * 0.3; });
  for (const s of homeStars) s.scale.setScalar(2.2 + Math.sin(t * 4 + s.userData.phase) * 0.5);
  moon.rotation.z = Math.sin(t * 0.5) * 0.05;
  moon.position.y += (moonY - moon.position.y) * 0.04;
}
