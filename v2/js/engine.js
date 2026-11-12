"use strict";
/* =====================================================================
   Engine: renderer and post-processing, lights and environment,
   physically based materials with procedural grain, shape helpers,
   mesh merging, particles, camera
   ===================================================================== */

const canvas = $("scene");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x6d5aa8, 0.012);
const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 300);

/** Seconds since start, shared by every animated shader. */
const TIME = { value: 0 };

/* ------------------------------ quality ------------------------------- */
/* Three levels. "Auto" starts at the top and steps down if the device
   cannot keep up, so the game stays smooth on older tablets. */

const QUALITY_LEVELS = [
  { name: "fast",   dpr: 1,   post: false, msaa: 0, shadow: 1024, carpet: 0.3 },
  { name: "medium", dpr: 1.5, post: true,  msaa: 2, shadow: 1024, carpet: 0.6 },
  { name: "best",   dpr: 2,   post: true,  msaa: 4, shadow: 2048, carpet: 1 },
];
const quality = { level: 2, auto: true, slow: 0, frames: 0, onChange: null };
{
  const asked = new URLSearchParams(location.search).get("quality") || (save.gfx !== "auto" ? save.gfx : null);
  const i = QUALITY_LEVELS.findIndex(q => q.name === asked);
  if (i >= 0) { quality.level = i; quality.auto = false; }
}
function Q() { return QUALITY_LEVELS[quality.level]; }

/* ------------------------------- lights ------------------------------- */
/* A warm key light with soft shadows, cool sky/ground bounce, a rim light
   from behind, and two small lamps that follow the wand and the cauldron. */

const hemiLight = new THREE.HemisphereLight(0xcfd8ff, 0x8fd09a, 0.8);
scene.add(hemiLight);

const keyLight = new THREE.DirectionalLight(0xffe2bd, 3.0);
keyLight.position.set(7, 12, 10);
keyLight.castShadow = true;
Object.assign(keyLight.shadow.camera, { left: -19, right: 19, top: 14, bottom: -14, near: 1, far: 48 });
keyLight.shadow.bias = -0.0004;
keyLight.shadow.normalBias = 0.035;
keyLight.shadow.radius = 3;
scene.add(keyLight);

const rimLight = new THREE.DirectionalLight(0xb9c8ff, 1.4);
rimLight.position.set(-9, 8, -11);
scene.add(rimLight);

const wandLight = new THREE.PointLight(0xffd9a0, 0, 7, 2);
const potLight = new THREE.PointLight(0x8cf0a8, 0, 9, 2);
scene.add(wandLight, potLight);

const RIM_COLOR = { value: new THREE.Color(0xb9c8ff) };

/* ---------------------------- environment ----------------------------- */
/* A tiny sky-and-lamps scene is rendered into a prefiltered environment
   map, so glossy things (eyes, iron, glass, water) have something to reflect. */

const pmrem = new THREE.PMREMGenerator(renderer);
let envTarget = null;
const envScene = new THREE.Scene();
const envSky = new THREE.Mesh(
  new THREE.SphereGeometry(50, 24, 12),
  new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false,
    uniforms: { top: { value: new THREE.Color() }, mid: { value: new THREE.Color() }, bottom: { value: new THREE.Color() }, ground: { value: new THREE.Color() } },
    vertexShader: `varying vec3 d; void main(){ d = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `uniform vec3 top; uniform vec3 mid; uniform vec3 bottom; uniform vec3 ground; varying vec3 d;
      void main(){
        float h = normalize(d).y;
        vec3 c = mix(bottom, mid, smoothstep(0.0, 0.25, h));
        c = mix(c, top, smoothstep(0.2, 0.7, h));
        c = mix(c, ground, smoothstep(0.0, -0.25, h));
        gl_FragColor = vec4(c, 1.0); }`,
  })
);
envScene.add(envSky);
function envLamp(color, strength, size, x, y, z) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(size, 16, 10), new THREE.MeshStandardMaterial({ color: 0x000000, emissive: color, emissiveIntensity: strength }));
  m.position.set(x, y, z);
  envScene.add(m);
  return m;
}
const envMoon = envLamp(0xfff3c9, 5, 5, -14, 22, -30);
const envKey = envLamp(0xffe2bd, 3, 9, 22, 26, 26);
const envRim = envLamp(0xb9c8ff, 2, 8, -26, 14, -22);
function buildEnvironment(sky, ground, key, rim) {
  const u = envSky.material.uniforms;
  u.top.value.set(sky[0]); u.mid.value.set(sky[1]); u.bottom.value.set(sky[2]); u.ground.value.set(ground);
  envKey.material.emissive.set(key);
  envRim.material.emissive.set(rim);
  const next = pmrem.fromScene(envScene, 0.03);
  scene.environment = next.texture;
  if (envTarget) envTarget.dispose();
  envTarget = next;
}

/* -------------------------- post-processing --------------------------- */
/* RenderPass -> UnrealBloomPass (high threshold: only glowing things bloom)
   -> a gentle colour grade and vignette -> OutputPass (ACES tone mapping, sRGB). */

const GradeShader = {
  uniforms: { tDiffuse: { value: null }, uSaturation: { value: 1.22 }, uVignette: { value: 0.3 } },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: `uniform sampler2D tDiffuse; uniform float uSaturation; uniform float uVignette; varying vec2 vUv;
    void main(){
      vec4 c = texture2D(tDiffuse, vUv);
      float l = dot(c.rgb, vec3(0.2126, 0.7152, 0.0722));
      c.rgb = max(mix(vec3(l), c.rgb, uSaturation), 0.0);          // filmic tone mapping mutes colour; put a little back
      vec2 q = vUv - 0.5;
      c.rgb *= 1.0 - uVignette * smoothstep(0.18, 0.8, dot(q, q) * 1.6);
      gl_FragColor = c;
    }`,
};

let composer = null, bloomPass = null;
const bloomLook = { strength: 0.38, radius: 0.7, threshold: 1.0 };
function buildComposer() {
  if (composer) { composer.dispose(); composer = null; bloomPass = null; }
  const q = Q();
  if (!q.post || !renderer.capabilities.isWebGL2) return;
  const size = renderer.getDrawingBufferSize(new THREE.Vector2());
  const target = new THREE.WebGLRenderTarget(size.x, size.y, { type: THREE.HalfFloatType, samples: q.msaa });
  composer = new THREE.EffectComposer(renderer, target);
  composer.addPass(new THREE.RenderPass(scene, camera));
  bloomPass = new THREE.UnrealBloomPass(new THREE.Vector2(size.x, size.y), bloomLook.strength, bloomLook.radius, bloomLook.threshold);
  composer.addPass(bloomPass);
  composer.addPass(new THREE.ShaderPass(GradeShader));
  composer.addPass(new THREE.OutputPass());
}
function applyQuality() {
  const q = Q();
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, q.dpr));
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  if (keyLight.shadow.mapSize.x !== q.shadow) {
    keyLight.shadow.mapSize.set(q.shadow, q.shadow);
    if (keyLight.shadow.map) { keyLight.shadow.map.dispose(); keyLight.shadow.map = null; }
  }
  buildComposer();
  if (quality.onChange) quality.onChange(q);
}
function resizeRenderer() {
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, Q().dpr));
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  if (composer) {
    composer.setPixelRatio(renderer.getPixelRatio());
    composer.setSize(window.innerWidth, window.innerHeight);
  }
}
function renderFrame(dt) {
  if (composer) composer.render(dt);
  else renderer.render(scene, camera);
  // "auto" quality: step down a level if frames keep arriving late
  if (!quality.auto || quality.level === 0 || document.hidden) return;
  quality.frames++;
  if (quality.frames < 90) return;                 // let shaders compile and things settle first
  quality.slow = Math.max(0, quality.slow + (dt > 1 / 38 ? dt : -dt * 0.5));
  if (quality.slow > 2.5) {
    quality.level--;
    quality.slow = 0;
    quality.frames = 30;
    applyQuality();
  }
}

/* ------------------------------ materials ----------------------------- */
/* Each "kind" of surface is a MeshStandardMaterial whose grain comes from a
   procedural detail texture (see textures.js), projected from three sides
   (triplanar) so it works on any shape without UVs:
     R -> light/dark colour variation,  G -> roughness,  B -> height (bump).
   A soft rim term keeps the dark side of things from going flat. */

const KINDS = {
  // tile = world units per repeat of the texture; bump = height of the grain in world units
  soft:   { tex: "soft",   rough: 0.8,  bump: 0.012, tile: 1.2, vary: 0.12, rvar: 0.3,  rim: 0.16, env: 0.5 },
  fur:    { tex: "fur",    rough: 0.95, bump: 0.02,  tile: 1.0, vary: 0.16, rvar: 0.2,  rim: 0.4,  env: 0.3 },
  fabric: { tex: "fabric", rough: 0.88, bump: 0.012, tile: 1.0, vary: 0.1,  rvar: 0.25, rim: 0.3,  env: 0.35 },
  skin:   { tex: "skin",   rough: 0.6,  bump: 0.003, tile: 1.2, vary: 0.04, rvar: 0.15, rim: 0.22, env: 0.4 },
  hair:   { tex: "fur",    rough: 0.48, bump: 0.03,  tile: 0.9, vary: 0.2,  rvar: 0.35, rim: 0.3,  env: 0.7 },
  wood:   { tex: "wood",   rough: 0.8,  bump: 0.05,  tile: 2.2, vary: 0.28, rvar: 0.3,  rim: 0.1,  env: 0.35 },
  straw:  { tex: "straw",  rough: 0.75, bump: 0.03,  tile: 1.2, vary: 0.28, rvar: 0.3,  rim: 0.2,  env: 0.35 },
  leaf:   { tex: "leaf",   rough: 0.74, bump: 0.045, tile: 3.6, vary: 0.24, rvar: 0.3,  rim: 0.22, env: 0.4, sway: 0.035, noise: [0.13, 1.25] },
  plant:  { tex: "soft",   rough: 0.7,  bump: 0.008, tile: 1.0, vary: 0.12, rvar: 0.3,  rim: 0.2,  env: 0.45, sway: 0.12 },
  stone:  { tex: "stone",  rough: 0.9,  bump: 0.07,  tile: 3.0, vary: 0.24, rvar: 0.3,  rim: 0.08, env: 0.35, noise: [0.1, 2.0] },
  metal:  { tex: "metal",  rough: 0.42, metal: 0.85, bump: 0.02, tile: 1.6, vary: 0.12, rvar: 0.5, rim: 0.0, env: 1.2 },
  gloss:  { tex: "gloss",  rough: 0.36, bump: 0.008, tile: 2.0, vary: 0.12, rvar: 0.3,  rim: 0.12, env: 0.8 },
  snow:   { tex: "snow",   rough: 0.62, bump: 0.03,  tile: 3.0, vary: 0.05, rvar: 0.7,  rim: 0.25, env: 0.6, noise: [0.07, 1.1] },
  cloud:  { tex: "cloud",  rough: 1.0,  bump: 0.04,  tile: 5.0, vary: 0.05, rvar: 0.0,  rim: 0.24, env: 0.5, noise: [0.14, 0.8] },
  tile:   { tex: "leaf",   rough: 0.6,  bump: 0.06,  tile: 2.4, vary: 0.24, rvar: 0.3,  rim: 0.12, env: 0.5 },
  ground: { tex: "ground", rough: 0.94, bump: 0.05,  tile: 9.0, vary: 0.18, rvar: 0.3,  rim: 0.0,  env: 0.3 },
};

const DETAIL_VERT_PARS = `
varying vec3 vTriPos; varying vec3 vTriNrm;
uniform float uTriScale; uniform float uTime; uniform float uSway; uniform float uSwayBase;`;
const DETAIL_VERT = `
vTriPos = position * uTriScale; vTriNrm = normal;
#ifdef USE_SWAY
  #ifdef USE_INSTANCING
    vec3 swayAt = (modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
  #else
    vec3 swayAt = modelMatrix[3].xyz;
  #endif
  float swayH = max(transformed.y - uSwayBase, 0.0);
  float swayT = uTime * 1.5 + swayAt.x * 0.55 + swayAt.z * 0.8;
  transformed.x += (sin(swayT) + 0.4 * sin(swayT * 2.3 + 1.7)) * uSway * swayH;
  transformed.z += cos(swayT * 0.8) * uSway * 0.5 * swayH;
#endif`;
const DETAIL_FRAG_PARS = `
varying vec3 vTriPos; varying vec3 vTriNrm;
uniform sampler2D uDetail; uniform float uVary; uniform float uRVar; uniform float uBump; uniform float uRim; uniform vec3 uRimColor;
vec3 triDetail;
vec3 detailBump(vec3 surf_pos, vec3 surf_norm, vec2 dHdxy, float faceDir) {
  // un-normalised screen derivatives keep the bump the same depth at any distance
  vec3 vSigmaX = dFdx(surf_pos), vSigmaY = dFdy(surf_pos);
  vec3 R1 = cross(vSigmaY, surf_norm), R2 = cross(surf_norm, vSigmaX);
  float fDet = dot(vSigmaX, R1) * faceDir;
  vec3 vGrad = sign(fDet) * (dHdxy.x * R1 + dHdxy.y * R2);
  return normalize(abs(fDet) * surf_norm - vGrad);
}`;
const DETAIL_FRAG_COLOR = `
{
  vec3 tw = abs(normalize(vTriNrm)); tw = tw * tw * tw * tw; tw /= (tw.x + tw.y + tw.z);
  triDetail = texture2D(uDetail, vTriPos.zy).rgb * tw.x + texture2D(uDetail, vTriPos.xz).rgb * tw.y + texture2D(uDetail, vTriPos.xy).rgb * tw.z;
}
diffuseColor.rgb *= 1.0 + (triDetail.r - 0.5) * 2.0 * uVary;`;

/** Give a standard/physical material procedural grain (and optional sway in the wind). */
function addDetail(mat, def) {
  const u = {
    uDetail: { value: surfaceDetail(def.tex) }, uTriScale: { value: 1 / def.tile },
    uVary: { value: def.vary }, uRVar: { value: def.rvar }, uBump: { value: def.bump }, uRim: { value: def.rim },
    uRimColor: RIM_COLOR, uTime: TIME, uSway: { value: def.sway || 0 }, uSwayBase: { value: def.swayBase || 0 },
  };
  mat.userData.u = u;
  if (def.sway) mat.defines = { ...(mat.defines || {}), USE_SWAY: "" };
  mat.extensions = { derivatives: true };
  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, u);
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>" + DETAIL_VERT_PARS)
      .replace("#include <begin_vertex>", "#include <begin_vertex>" + DETAIL_VERT);
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", "#include <common>" + DETAIL_FRAG_PARS)
      .replace("#include <color_fragment>", "#include <color_fragment>" + DETAIL_FRAG_COLOR)
      .replace("#include <roughnessmap_fragment>", "#include <roughnessmap_fragment>\nroughnessFactor = clamp(roughnessFactor + (triDetail.g - 0.5) * uRVar, 0.04, 1.0);")
      .replace("#include <normal_fragment_maps>", "#include <normal_fragment_maps>\nnormal = detailBump(-vViewPosition, normal, vec2(dFdx(triDetail.b), dFdy(triDetail.b)) * uBump, faceDirection);")
      .replace("#include <emissivemap_fragment>", "#include <emissivemap_fragment>\ntotalEmissiveRadiance += diffuseColor.rgb * uRimColor * uRim * pow(1.0 - saturate(dot(normal, normalize(vViewPosition))), 3.0);");
  };
  mat.customProgramCacheKey = () => "detail";
  return mat;
}
function kindMaterial(kind, opts = {}, Type = THREE.MeshStandardMaterial) {
  const def = KINDS[kind];
  const m = new Type({ roughness: def.rough, metalness: def.metal || 0, envMapIntensity: def.env, ...opts });
  return addDetail(m, def);
}

// Plain painted surfaces: one cached material per colour and kind. These are the ones that get merged.
const PLAIN = new WeakMap();            // material -> kind
const paintCache = new Map();
function paint(color, kind = "soft") {
  const key = kind + color;
  if (!paintCache.has(key)) {
    const m = kindMaterial(kind, { color });
    PLAIN.set(m, kind);
    paintCache.set(key, m);
  }
  return paintCache.get(key);
}
/** K.wood(0x8f6a55), K.fur(...), K.leaf(...): a colour painted onto a kind of surface. */
const K = {};
for (const kind of Object.keys(KINDS)) K[kind] = (color) => paint(color, kind);

// merged meshes carry their colours per vertex and share one material per kind
const bakedCache = new Map();
function bakedMaterial(kind) {
  if (!bakedCache.has(kind)) bakedCache.set(kind, kindMaterial(kind, { vertexColors: true }));
  return bakedCache.get(kind);
}

const glowCache = new Map();
/** Something that shines by itself (windows, lanterns, stars). Strong ones are picked up by the bloom pass. */
function shiny(color, strength = 1.6) {
  const key = color + "|" + strength;
  if (!glowCache.has(key)) {
    glowCache.set(key, new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: strength, roughness: 0.4, envMapIntensity: 0.4 }));
  }
  return glowCache.get(key);
}
const glassCache = new Map();
/** Polished, faintly glowing crystal or glass. */
function crystalMat(color, glow = 0.5) {
  const key = color + "|" + glow;
  if (!glassCache.has(key)) {
    glassCache.set(key, new THREE.MeshPhysicalMaterial({
      color, emissive: color, emissiveIntensity: glow, roughness: 0.12, metalness: 0.0,
      clearcoat: 1, clearcoatRoughness: 0.08, envMapIntensity: 1.6, flatShading: true,
    }));
  }
  return glassCache.get(key);
}
/** Wet, dark and glossy: eyes and noses. */
const GLOSSY_DARK = new THREE.MeshPhysicalMaterial({ color: 0x241a33, roughness: 0.08, clearcoat: 1, clearcoatRoughness: 0.05, envMapIntensity: 1.5 });
const DARK = 0x3a2c4f;

/* ------------------------------ shapes -------------------------------- */

const SPHERE = new THREE.SphereGeometry(1, 28, 18);
const SPHERE_MID = new THREE.SphereGeometry(1, 18, 12);
const SPHERE_LOW = new THREE.SphereGeometry(1, 10, 7);
const HALF_SPHERE = new THREE.SphereGeometry(1, 20, 8, 0, Math.PI * 2, 0, Math.PI / 2);
let sceneryDetail = false;            // true while building background scenery (fewer triangles)
function sphereFor(size) {
  if (sceneryDetail) return size < 0.4 ? SPHERE_LOW : SPHERE_MID;
  return size < 0.11 ? SPHERE_LOW : size < 0.4 ? SPHERE_MID : SPHERE;
}
const geoCache = new Map();
function cached(key, make) {
  if (!geoCache.has(key)) geoCache.set(key, make());
  return geoCache.get(key);
}
function asMat(c) { return typeof c === "number" ? paint(c) : c; }
function own(geo) { geo.userData.own = true; return geo; }       // made for one object; freed with it
function mesh(geo, color) {
  const m = new THREE.Mesh(geo, asMat(color));
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

function ball(color, r, x = 0, y = 0, z = 0, sx = 1, sy = 1, sz = 1) {
  const m = mesh(sphereFor(r * Math.max(sx, sy, sz)), color);
  m.scale.set(r * sx, r * sy, r * sz);
  m.position.set(x, y, z);
  return m;
}
function dome(color, r, x = 0, y = 0, z = 0, sy = 1) {
  const m = mesh(HALF_SPHERE, color);
  m.scale.set(r, r * sy, r);
  m.position.set(x, y, z);
  return m;
}
function cone(color, r, h, x = 0, y = 0, z = 0, rx = 0, rz = 0, seg = 16) {
  // a cone with a softly rounded tip and base edge, turned on the lathe
  const m = mesh(cached("cone" + seg, () => new THREE.LatheGeometry(
    [[0.001, -0.5], [0.9, -0.5], [1, -0.46], [0.97, -0.4], [0.5, 0.08], [0.16, 0.4], [0.06, 0.48], [0.001, 0.5]].map(p => new THREE.Vector2(p[0], p[1])), seg)), color);
  m.scale.set(r, h, r);
  m.position.set(x, y, z);
  m.rotation.set(rx, 0, rz);
  return m;
}
function cyl(color, rt, rb, h, x = 0, y = 0, z = 0, seg = 18) {
  // a cylinder with chamfered rims
  const ratio = Math.round((rt / rb) * 20) / 20;
  const m = mesh(cached("cyl" + ratio + "|" + seg, () => new THREE.LatheGeometry(
    [[0.001, -0.5], [0.92, -0.5], [1, -0.44], [ratio, 0.44], [ratio * 0.92, 0.5], [0.001, 0.5]].map(p => new THREE.Vector2(p[0], p[1])), seg)), color);
  m.scale.set(rb, h, rb);
  m.position.set(x, y, z);
  return m;
}
function torus(color, r, tube, x = 0, y = 0, z = 0, arc = Math.PI * 2) {
  const key = "torus" + Math.round((tube / r) * 100) + "|" + arc.toFixed(2);
  const m = mesh(cached(key, () => new THREE.TorusGeometry(1, tube / r, 8, 28, arc)), color);
  m.scale.setScalar(r);
  m.position.set(x, y, z);
  return m;
}
function disc(color, r, x = 0, y = 0, z = 0) {
  const m = mesh(cached("disc", () => new THREE.CircleGeometry(1, 32)), color);
  m.castShadow = false;
  m.scale.setScalar(r);
  m.rotation.x = -Math.PI / 2;
  m.position.set(x, y, z);
  return m;
}
/** A shape turned on a lathe: `profile` is a list of [radius, height] points, bottom to top. */
function lathe(color, profile, seg = 20, key = null) {
  const make = () => new THREE.LatheGeometry(profile.map(p => new THREE.Vector2(Math.max(p[0], 0.0005), p[1])), seg);
  return mesh(key ? cached(key, make) : own(make()), color);
}
/** A tube along a smooth curve through `points` ([x, y, z] each), tapering from radius r0 to r1. */
function tube(color, points, r0, r1 = r0, seg = 12, radial = 7) {
  const curve = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(p[0], p[1], p[2])));
  const geo = own(new THREE.TubeGeometry(curve, seg, 1, radial, false));
  const pos = geo.attributes.position, c = new THREE.Vector3(), v = new THREE.Vector3();
  for (let i = 0; i <= seg; i++) {
    curve.getPointAt(i / seg, c);
    const r = r0 + (r1 - r0) * (i / seg);
    for (let j = 0; j <= radial; j++) {
      const k = i * (radial + 1) + j;
      v.fromBufferAttribute(pos, k).sub(c).multiplyScalar(r).add(c);
      pos.setXYZ(k, v.x, v.y, v.z);
    }
  }
  return mesh(geo, color);
}
/** A flat outline given depth and rounded (bevelled) edges. */
function extrude(color, shape, depth, bevel = 0.03, key = null) {
  const make = () => {
    const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: bevel > 0, bevelSize: bevel, bevelThickness: bevel, bevelSegments: 2, curveSegments: 10 });
    g.translate(0, 0, -depth / 2);
    return g;
  };
  return mesh(key ? cached(key, make) : own(make()), color);
}
function capsule(color, r, len, x = 0, y = 0, z = 0) {
  const m = mesh(cached("capsule" + Math.round(len / r * 10), () => new THREE.CapsuleGeometry(1, len / r, 5, 12)), color);
  m.scale.setScalar(r);
  m.position.set(x, y, z);
  return m;
}
function starShape(outer = 1, inner = 0.48, points = 5) {
  const s = new THREE.Shape();
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 ? inner : outer, a = (i / (points * 2)) * Math.PI * 2 + Math.PI / 2;
    i ? s.lineTo(Math.cos(a) * r, Math.sin(a) * r) : s.moveTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  s.closePath();
  return s;
}
const STAR_GEO = (() => {
  const g = new THREE.ExtrudeGeometry(starShape(1, 0.52), { depth: 0.3, bevelEnabled: true, bevelSize: 0.16, bevelThickness: 0.14, bevelSegments: 4 });
  g.translate(0, 0, -0.15);
  return g;
})();
/** A rounded petal / leaf outline, pointing up from the origin. */
const PETAL_SHAPE = (() => {
  const s = new THREE.Shape();
  s.moveTo(0, 0);
  s.bezierCurveTo(0.42, 0.12, 0.5, 0.62, 0, 1);
  s.bezierCurveTo(-0.5, 0.62, -0.42, 0.12, 0, 0);
  return s;
})();
const PETAL_GEO = (() => {
  const g = new THREE.ExtrudeGeometry(PETAL_SHAPE, { depth: 0.04, bevelEnabled: true, bevelSize: 0.05, bevelThickness: 0.04, bevelSegments: 2, curveSegments: 8 });
  // cup the petal a little so it catches the light
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) p.setZ(i, p.getZ(i) + p.getX(i) * p.getX(i) * 0.9 + p.getY(i) * p.getY(i) * 0.18);
  g.computeVertexNormals();
  return g;
})();
function petal(color, size, x = 0, y = 0, z = 0) {
  const m = mesh(PETAL_GEO, color);
  m.scale.setScalar(size);
  m.position.set(x, y, z);
  return m;
}

function eye(group, x, y, z, r = 0.055) {
  const e = new THREE.Mesh(sphereFor(r * 2), GLOSSY_DARK);
  e.scale.setScalar(r);
  e.position.set(x, y, z);
  group.add(e);
  const shine = new THREE.Mesh(SPHERE_LOW, shiny(0xffffff, 1.2));
  shine.scale.setScalar(r * 0.36);
  shine.position.set(x + r * 0.35, y + r * 0.4, z + r * 0.78);
  group.add(shine);
}
function smile(group, r, x, y, z, color = DARK) {
  const m = torus(color, r, r * 0.26, x, y, z, Math.PI);
  m.rotation.z = Math.PI;
  m.castShadow = false;
  group.add(m);
  return m;
}

/* -------------------------- organic displacement ---------------------- */

const simplex = new THREE.SimplexNoise({ random: Math.random });
const dispP = new THREE.Vector3(), dispN = new THREE.Vector3(), dispG = new THREE.Vector3();
/** Push every vertex in or out along its normal by simplex noise, and tilt the normals to match,
    so natural things (foliage, rocks, snow, clouds) lose their mathematical smoothness. */
function displaceGeometry(geo, amp, freq, seed = Math.random() * 100) {
  const p = geo.attributes.position, n = geo.attributes.normal, e = 0.06;
  const f = (x, y, z) => simplex.noise3d(x * freq + seed, y * freq + seed * 1.7, z * freq - seed) * 0.65 + simplex.noise3d(x * freq * 2.3 - seed, y * freq * 2.3, z * freq * 2.3 + seed) * 0.35;
  for (let i = 0; i < p.count; i++) {
    dispP.fromBufferAttribute(p, i);
    dispN.fromBufferAttribute(n, i);
    const d = f(dispP.x, dispP.y, dispP.z);
    dispG.set(f(dispP.x + e, dispP.y, dispP.z) - d, f(dispP.x, dispP.y + e, dispP.z) - d, f(dispP.x, dispP.y, dispP.z + e) - d).multiplyScalar(amp / e);
    dispG.addScaledVector(dispN, -dispG.dot(dispN));               // keep only the part along the surface
    p.setXYZ(i, dispP.x + dispN.x * d * amp, dispP.y + dispN.y * d * amp, dispP.z + dispN.z * d * amp);
    dispN.sub(dispG).normalize();
    n.setXYZ(i, dispN.x, dispN.y, dispN.z);
  }
  return geo;
}

/* ------------------------- merging ("baking") -------------------------
   Characters and props are built from dozens of little shapes. Drawing
   each one separately is slow on tablets, so shapes of the same kind that
   move together are merged into one mesh with colours stored per vertex. */

const bakeV = new THREE.Vector3(), bakeN = new THREE.Matrix3(), bakeM = new THREE.Matrix4();

/** parts: [{ mesh, matrix }] -> one geometry (positions, normals, colours). */
function mergeMeshes(parts) {
  let vCount = 0, iCount = 0;
  for (const { mesh: m } of parts) {
    const g = m.geometry;
    vCount += g.attributes.position.count;
    iCount += g.index ? g.index.count : g.attributes.position.count;
  }
  const pos = new Float32Array(vCount * 3), nor = new Float32Array(vCount * 3), col = new Float32Array(vCount * 3);
  const idx = vCount > 65535 ? new Uint32Array(iCount) : new Uint16Array(iCount);
  let vo = 0, io = 0;
  for (const { mesh: m, matrix } of parts) {
    const g = m.geometry, p = g.attributes.position, n = g.attributes.normal;
    const c = m.material.color;
    bakeN.getNormalMatrix(matrix);
    for (let i = 0; i < p.count; i++) {
      const o = (vo + i) * 3;
      bakeV.fromBufferAttribute(p, i).applyMatrix4(matrix);
      pos[o] = bakeV.x; pos[o + 1] = bakeV.y; pos[o + 2] = bakeV.z;
      bakeV.fromBufferAttribute(n, i).applyMatrix3(bakeN).normalize();
      nor[o] = bakeV.x; nor[o + 1] = bakeV.y; nor[o + 2] = bakeV.z;
      col[o] = c.r; col[o + 1] = c.g; col[o + 2] = c.b;
    }
    if (g.index) { const a = g.index.array; for (let i = 0; i < a.length; i++) idx[io++] = a[i] + vo; }
    else for (let i = 0; i < p.count; i++) idx[io++] = vo + i;
    vo += p.count;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geo.setAttribute("normal", new THREE.BufferAttribute(nor, 3));
  geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
  geo.setIndex(new THREE.BufferAttribute(idx, 1));
  geo.userData.own = true;
  return geo;
}
function canMerge(o) { return o.isMesh && PLAIN.has(o.material) && !o.userData.keep && o.children.length === 0; }
function mergedMesh(parts, kind, organic) {
  const geo = mergeMeshes(parts);
  const noise = organic && KINDS[kind].noise;
  if (noise) displaceGeometry(geo, noise[0], noise[1]);
  const body = new THREE.Mesh(geo, bakedMaterial(kind));
  body.castShadow = parts.some(p => p.mesh.castShadow);
  body.receiveShadow = true;
  return body;
}
function byKind(meshes) {
  const groups = new Map();
  for (const m of meshes) {
    const kind = PLAIN.get(m.material);
    if (!groups.has(kind)) groups.set(kind, []);
    groups.get(kind).push(m);
  }
  return groups;
}

/** Merge the shapes inside each moving part of a character (head, arm, tail...), kind by kind. */
function fuse(root) {
  const visit = (node) => {
    const plain = [];
    for (const ch of [...node.children]) {
      if (ch.isMesh) { if (canMerge(ch)) plain.push(ch); }
      else if (!ch.isSprite && !ch.isLight) visit(ch);
    }
    for (const [kind, list] of byKind(plain)) {
      for (const m of list) { m.updateMatrix(); node.remove(m); }
      node.add(mergedMesh(list.map(m => ({ mesh: m, matrix: m.matrix })), kind, false));
    }
  };
  visit(root);
  return root;
}

/** Merge every plain shape of a piece of scenery, and roughen the natural ones with noise. */
function bake(root) {
  root.updateMatrixWorld(true);
  bakeM.copy(root.matrixWorld).invert();
  const plain = [];
  root.traverse(o => { if (canMerge(o)) plain.push(o); });
  if (!plain.length) return root;
  for (const [kind, list] of byKind(plain)) {
    const parts = list.map(m => ({ mesh: m, matrix: new THREE.Matrix4().multiplyMatrices(bakeM, m.matrixWorld) }));
    for (const m of list) { if (m === root) continue; m.parent.remove(m); }
    if (list.length === 1 && list[0] === root) return root;
    root.add(mergedMesh(parts, kind, true));
  }
  return root;
}
/** Free the one-off geometry and materials of something that is being thrown away. */
function discard(obj) {
  if (!obj) return;
  obj.traverse(o => {
    if (o.geometry && o.geometry.userData.own) o.geometry.dispose();
    if (o.material && (o.isSprite || o.material.userData.own)) o.material.dispose();
  });
  if (obj.parent) obj.parent.remove(obj);
}
/** Empty a group, freeing merged geometry on the way. */
function clearGroup(group) {
  for (let i = group.children.length - 1; i >= 0; i--) discard(group.children[i]);
}

/* ----------------------- textures drawn in code ---------------------- */

function canvasTexture(draw, size = 64) {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  draw(c.getContext("2d"), size);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
const starTex = canvasTexture((g, s) => {
  const h = s / 2;
  const glow = g.createRadialGradient(h, h, 0, h, h, h);
  glow.addColorStop(0, "rgba(255,255,255,1)");
  glow.addColorStop(0.25, "rgba(255,255,255,.6)");
  glow.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = glow;
  g.fillRect(0, 0, s, s);
  g.fillStyle = "#fff";
  g.beginPath();
  g.moveTo(h, 2); g.quadraticCurveTo(h, h, s - 2, h); g.quadraticCurveTo(h, h, h, s - 2);
  g.quadraticCurveTo(h, h, 2, h); g.quadraticCurveTo(h, h, h, 2);
  g.fill();
});
const dotTex = canvasTexture((g, s) => {
  const h = s / 2;
  const grad = g.createRadialGradient(h, h, 0, h, h, h);
  grad.addColorStop(0, "rgba(255,255,255,1)");
  grad.addColorStop(0.5, "rgba(255,255,255,.5)");
  grad.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, s, s);
});
const heartTex = canvasTexture((g, s) => {
  g.fillStyle = "#fff";
  g.beginPath();
  g.moveTo(s / 2, s * 0.85);
  g.bezierCurveTo(-s * 0.1, s * 0.4, s * 0.2, -s * 0.05, s / 2, s * 0.28);
  g.bezierCurveTo(s * 0.8, -s * 0.05, s * 1.1, s * 0.4, s / 2, s * 0.85);
  g.fill();
});
const noteTex = canvasTexture((g, s) => {
  g.fillStyle = "#fff";
  g.beginPath(); g.ellipse(s * 0.34, s * 0.74, s * 0.17, s * 0.13, -0.4, 0, Math.PI * 2); g.fill();
  g.fillRect(s * 0.46, s * 0.16, s * 0.07, s * 0.6);
  g.beginPath(); g.moveTo(s * 0.46, s * 0.16); g.quadraticCurveTo(s * 0.8, s * 0.2, s * 0.78, s * 0.5);
  g.quadraticCurveTo(s * 0.7, s * 0.34, s * 0.46, s * 0.34); g.fill();
});
const dropTex = canvasTexture((g, s) => {
  g.fillStyle = "#fff";
  g.beginPath();
  g.moveTo(s / 2, s * 0.08);
  g.bezierCurveTo(s * 0.95, s * 0.6, s * 0.75, s * 0.95, s / 2, s * 0.95);
  g.bezierCurveTo(s * 0.25, s * 0.95, s * 0.05, s * 0.6, s / 2, s * 0.08);
  g.fill();
});
const ringTex = canvasTexture((g, s) => {
  g.strokeStyle = "#fff"; g.lineWidth = s * 0.08;
  g.beginPath(); g.arc(s / 2, s / 2, s * 0.38, 0, Math.PI * 2); g.stroke();
  g.fillStyle = "rgba(255,255,255,.25)"; g.fill();
  g.fillStyle = "#fff";
  g.beginPath(); g.arc(s * 0.38, s * 0.36, s * 0.07, 0, Math.PI * 2); g.fill();
});

function glowSprite(color, size, opacity = 0.6) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({
    map: dotTex, color, transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending,
  }));
  s.scale.setScalar(size);
  return s;
}

/* ----------------------------- particles ----------------------------- */

const particles = [];
const spritePool = [];
function emit({ pos, vel = new THREE.Vector3(), color = 0xffffff, size = 0.3, life = 0.8, gravity = 0, tex = starTex, drag = 1, spin = 0, grow = 0, add = false }) {
  if (particles.length > 520) return;
  let s = spritePool.pop();
  if (!s) s = new THREE.Sprite(new THREE.SpriteMaterial({ transparent: true, depthWrite: false }));
  s.material.map = tex;
  s.material.color.set(color);
  if (add) s.material.color.multiplyScalar(1.7);          // bright enough to bloom
  s.material.opacity = 1;
  s.material.blending = add ? THREE.AdditiveBlending : THREE.NormalBlending;
  s.material.rotation = spin ? rand(0, Math.PI) : 0;
  s.position.copy(pos);
  s.scale.setScalar(size);
  scene.add(s);
  particles.push({ s, vel: vel.clone(), life, max: life, size, gravity, drag, spin, grow });
}
function burst(pos, colors, n = 18, power = 3, tex = starTex) {
  for (let i = 0; i < n; i++) {
    const v = new THREE.Vector3(rand(-1, 1), rand(-0.3, 1.2), rand(-1, 1)).normalize().multiplyScalar(rand(power * 0.4, power));
    emit({ pos, vel: v, color: pick(colors), size: rand(0.25, 0.5), life: rand(0.6, 1.1), gravity: -3, drag: 0.94, spin: rand(-4, 4), tex, add: tex === starTex });
  }
}
function hearts(pos, n = 6) {
  for (let i = 0; i < n; i++) {
    emit({
      pos: new THREE.Vector3(pos.x + rand(-0.5, 0.5), pos.y + rand(0, 0.4), pos.z + rand(-0.2, 0.3)),
      vel: new THREE.Vector3(rand(-0.3, 0.3), rand(0.8, 1.5), 0), color: pick([0xff8fc8, 0xff6fa5, 0xffb3dc]),
      size: rand(0.3, 0.45), life: rand(1.0, 1.6), tex: heartTex,
    });
  }
}
function updateParticles(dt) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.life -= dt;
    if (p.life <= 0) {
      scene.remove(p.s);
      spritePool.push(p.s);
      particles.splice(i, 1);
      continue;
    }
    p.vel.y += p.gravity * dt;
    p.vel.multiplyScalar(Math.pow(p.drag, dt * 60));
    p.s.position.addScaledVector(p.vel, dt);
    p.s.material.rotation += p.spin * dt;
    const k = p.life / p.max;
    p.s.material.opacity = Math.min(1, k * 2);
    p.s.scale.setScalar(p.size * (0.5 + 0.5 * k) * (1 + p.grow * (1 - k)));
  }
}
function clearParticles() {
  for (const p of particles) { scene.remove(p.s); spritePool.push(p.s); }
  particles.length = 0;
}

/* ------------------------------- camera ------------------------------ */

const cam = {
  pos: new THREE.Vector3(0, 5, 20), look: new THREE.Vector3(0, 1.5, -1),
  toPos: new THREE.Vector3(0, 5, 20), toLook: new THREE.Vector3(0, 1.5, -1),
  shake: 0, speed: 2.4,
};
function setView(pos, look, snap = false) {
  cam.toPos.copy(pos);
  cam.toLook.copy(look);
  if (snap) { cam.pos.copy(pos); cam.look.copy(look); }
}
function updateCamera(dt) {
  const k = 1 - Math.exp(-dt * cam.speed);
  cam.pos.lerp(cam.toPos, k);
  cam.look.lerp(cam.toLook, k);
  camera.position.copy(cam.pos);
  if (cam.shake > 0) {
    cam.shake = Math.max(0, cam.shake - dt);
    camera.position.x += Math.sin(cam.shake * 70) * cam.shake * 0.5;
    camera.position.y += Math.cos(cam.shake * 55) * cam.shake * 0.35;
  }
  camera.lookAt(cam.look);
}
function aspect() { return window.innerWidth / Math.max(1, window.innerHeight); }

const tmpV = new THREE.Vector3();
const tmpV2 = new THREE.Vector3();

/** Pin a DOM element above (or below) a 3D object. */
function project(obj, offsetY, el, below = false, keepIn = false) {
  obj.getWorldPosition(tmpV);
  tmpV.y += offsetY;
  tmpV.project(camera);
  if (tmpV.z > 1) { el.style.visibility = "hidden"; return; }
  el.style.visibility = "";
  let x = (tmpV.x * 0.5 + 0.5) * window.innerWidth;
  const y = (-tmpV.y * 0.5 + 0.5) * window.innerHeight;
  if (keepIn) {
    const half = el.offsetWidth / 2 + 8;
    x = clamp(x, half, window.innerWidth - half);
  }
  el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(-50%, ${below ? "10%" : "-100%"})`;
}
