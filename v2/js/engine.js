"use strict";
/* =====================================================================
   Engine: renderer, toon materials, shape helpers, particles, camera
   ===================================================================== */

const canvas = $("scene");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x6d5aa8, 28, 78);

const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 260);

const hemiLight = new THREE.HemisphereLight(0xfff6ff, 0x9bd68a, 1.5);
scene.add(hemiLight);
const moonLight = new THREE.DirectionalLight(0xfff1dc, 2.0);
moonLight.position.set(6, 12, 8);
moonLight.castShadow = true;
moonLight.shadow.mapSize.set(2048, 2048);
Object.assign(moonLight.shadow.camera, { left: -16, right: 16, top: 12, bottom: -12, near: 1, far: 40 });
moonLight.shadow.bias = -0.0005;
scene.add(moonLight);

/* ----------------------------- materials ----------------------------- */

// toon shading: three flat bands give everything a soft picture-book look
const gradientMap = new THREE.DataTexture(new Uint8Array([130, 200, 255]), 3, 1, THREE.RedFormat);
gradientMap.minFilter = gradientMap.magFilter = THREE.NearestFilter;
gradientMap.needsUpdate = true;
const matCache = new Map();
const PLAIN = new WeakSet();          // plain toon colours: these can be merged into one mesh
function toon(color) {
  if (!matCache.has(color)) {
    const m = new THREE.MeshToonMaterial({ color, gradientMap });
    PLAIN.add(m);
    matCache.set(color, m);
  }
  return matCache.get(color);
}
const glowCache = new Map();
/** A material that shines by itself (windows, lanterns, magic). */
function shiny(color, strength = 0.8) {
  const key = color + "|" + strength;
  if (!glowCache.has(key)) {
    glowCache.set(key, new THREE.MeshToonMaterial({ color, gradientMap, emissive: color, emissiveIntensity: strength }));
  }
  return glowCache.get(key);
}
const flatCache = new Map();
function flat(color, fog = true) {
  const key = color + "|" + fog;
  if (!flatCache.has(key)) flatCache.set(key, new THREE.MeshBasicMaterial({ color, fog }));
  return flatCache.get(key);
}

/* ------------------------------ shapes ------------------------------- */

// spheres come in three levels of detail: big round things get more triangles than tiny ones
const SPHERE = new THREE.SphereGeometry(1, 28, 18);
const SPHERE_MID = new THREE.SphereGeometry(1, 18, 12);
const SPHERE_LOW = new THREE.SphereGeometry(1, 10, 7);
const HALF_SPHERE = new THREE.SphereGeometry(1, 20, 8, 0, Math.PI * 2, 0, Math.PI / 2);
let sceneryDetail = false;            // true while building background scenery (fewer triangles still)
function sphereFor(size) {
  if (sceneryDetail) return size < 0.4 ? SPHERE_LOW : SPHERE_MID;
  return size < 0.11 ? SPHERE_LOW : size < 0.4 ? SPHERE_MID : SPHERE;
}
const geoCache = new Map();
function cached(key, make) {
  if (!geoCache.has(key)) geoCache.set(key, make());
  return geoCache.get(key);
}
function asMat(c) { return typeof c === "number" ? toon(c) : c; }

function ball(color, r, x = 0, y = 0, z = 0, sx = 1, sy = 1, sz = 1) {
  const m = new THREE.Mesh(sphereFor(r * Math.max(sx, sy, sz)), asMat(color));
  m.scale.set(r * sx, r * sy, r * sz);
  m.position.set(x, y, z);
  m.castShadow = true;
  return m;
}
function dome(color, r, x = 0, y = 0, z = 0, sy = 1) {
  const m = new THREE.Mesh(HALF_SPHERE, asMat(color));
  m.scale.set(r, r * sy, r);
  m.position.set(x, y, z);
  m.castShadow = true;
  return m;
}
function cone(color, r, h, x = 0, y = 0, z = 0, rx = 0, rz = 0, seg = 16) {
  const m = new THREE.Mesh(cached("cone" + seg, () => new THREE.ConeGeometry(1, 1, seg)), asMat(color));
  m.scale.set(r, h, r);
  m.position.set(x, y, z);
  m.rotation.set(rx, 0, rz);
  m.castShadow = true;
  return m;
}
function cyl(color, rt, rb, h, x = 0, y = 0, z = 0, seg = 18) {
  const ratio = Math.round((rt / rb) * 20) / 20;
  const m = new THREE.Mesh(cached("cyl" + ratio + "|" + seg, () => new THREE.CylinderGeometry(ratio, 1, 1, seg)), asMat(color));
  m.scale.set(rb, h, rb);
  m.position.set(x, y, z);
  m.castShadow = true;
  return m;
}
function torus(color, r, tube, x = 0, y = 0, z = 0, arc = Math.PI * 2) {
  const key = "torus" + Math.round((tube / r) * 100) + "|" + arc.toFixed(2);
  const m = new THREE.Mesh(cached(key, () => new THREE.TorusGeometry(1, tube / r, 8, 28, arc)), asMat(color));
  m.scale.setScalar(r);
  m.position.set(x, y, z);
  m.castShadow = true;
  return m;
}
function disc(color, r, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(cached("disc", () => new THREE.CircleGeometry(1, 32)), asMat(color));
  m.scale.setScalar(r);
  m.rotation.x = -Math.PI / 2;
  m.position.set(x, y, z);
  m.receiveShadow = true;
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
  const g = new THREE.ExtrudeGeometry(starShape(1, 0.52), { depth: 0.3, bevelEnabled: true, bevelSize: 0.16, bevelThickness: 0.14, bevelSegments: 3 });
  g.translate(0, 0, -0.15);
  return g;
})();

const DARK = 0x3a2c4f;
function eye(group, x, y, z, r = 0.055) {
  group.add(ball(DARK, r, x, y, z));
  const shine = new THREE.Mesh(SPHERE, flat(0xffffff));
  shine.scale.setScalar(r * 0.4);
  shine.position.set(x + r * 0.35, y + r * 0.4, z + r * 0.75);
  shine.userData.noOutline = true;
  group.add(shine);
}
function smile(group, r, x, y, z, color = DARK) {
  const m = torus(color, r, r * 0.26, x, y, z, Math.PI);
  m.rotation.z = Math.PI;
  m.castShadow = false;
  group.add(m);
  return m;
}

/* ------------------------- merging ("baking") -------------------------
   A character is built from dozens of little shapes. Drawing each one
   separately is slow on tablets, so the shapes that move together are
   merged into a single mesh with the colours stored per vertex. */

const BAKED = new THREE.MeshToonMaterial({ vertexColors: true, gradientMap });
const bakeV = new THREE.Vector3(), bakeN = new THREE.Matrix3(), bakeM = new THREE.Matrix4();

/** parts: [{ mesh, matrix }] -> one geometry (positions, normals, optional colours). */
function mergeMeshes(parts, colored) {
  let vCount = 0, iCount = 0;
  for (const { mesh } of parts) {
    const g = mesh.geometry;
    vCount += g.attributes.position.count;
    iCount += g.index ? g.index.count : g.attributes.position.count;
  }
  const pos = new Float32Array(vCount * 3), nor = new Float32Array(vCount * 3);
  const col = colored ? new Float32Array(vCount * 3) : null;
  const idx = vCount > 65535 ? new Uint32Array(iCount) : new Uint16Array(iCount);
  let vo = 0, io = 0;
  for (const { mesh, matrix } of parts) {
    const g = mesh.geometry, p = g.attributes.position, n = g.attributes.normal;
    const c = mesh.material.color;
    bakeN.getNormalMatrix(matrix);
    for (let i = 0; i < p.count; i++) {
      const o = (vo + i) * 3;
      bakeV.fromBufferAttribute(p, i).applyMatrix4(matrix);
      pos[o] = bakeV.x; pos[o + 1] = bakeV.y; pos[o + 2] = bakeV.z;
      bakeV.fromBufferAttribute(n, i).applyMatrix3(bakeN).normalize();
      nor[o] = bakeV.x; nor[o + 1] = bakeV.y; nor[o + 2] = bakeV.z;
      if (col) { col[o] = c.r; col[o + 1] = c.g; col[o + 2] = c.b; }
    }
    if (g.index) { const a = g.index.array; for (let i = 0; i < a.length; i++) idx[io++] = a[i] + vo; }
    else for (let i = 0; i < p.count; i++) idx[io++] = vo + i;
    vo += p.count;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geo.setAttribute("normal", new THREE.BufferAttribute(nor, 3));
  if (col) geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
  geo.setIndex(new THREE.BufferAttribute(idx, 1));
  geo.userData.baked = true;
  return geo;
}
function canMerge(o) { return o.isMesh && PLAIN.has(o.material) && !o.userData.keep && o.children.length === 0; }

// inverted-hull outlines make the characters read like a picture book
const OUTLINE = new THREE.MeshBasicMaterial({ color: 0x3b2a55, side: THREE.BackSide });

/** Outline a character and merge the shapes inside each moving part (head, arm, tail...). */
function outline(root, k = 1.07) {
  const visit = (node) => {
    const plain = [], other = [];
    for (const ch of [...node.children]) {
      if (ch.isMesh) (canMerge(ch) ? plain : other).push(ch);
      else if (!ch.isSprite) visit(ch);
    }
    if (plain.length) {
      for (const m of plain) m.updateMatrix();
      const body = new THREE.Mesh(mergeMeshes(plain.map(m => ({ mesh: m, matrix: m.matrix })), true), BAKED);
      body.castShadow = plain.some(m => m.castShadow);
      body.userData.noOutline = true;
      const edged = plain.filter(m => !m.userData.noOutline);
      if (edged.length) {
        const hull = new THREE.Mesh(mergeMeshes(edged.map(m => ({ mesh: m, matrix: m.matrix.clone().scale(bakeV.setScalar(k)) })), false), OUTLINE);
        hull.userData.noOutline = true;
        node.add(hull);
      }
      for (const m of plain) node.remove(m);
      node.add(body);
    }
    for (const m of other) {
      if (m.userData.noOutline) continue;
      const hull = new THREE.Mesh(m.geometry, OUTLINE);
      hull.scale.setScalar(k);
      hull.userData.noOutline = true;
      m.add(hull);
    }
  };
  visit(root);
  return root;
}

/** Merge every plain shape of a piece of scenery into one mesh (it never moves inside itself). */
function bake(root) {
  root.updateMatrixWorld(true);
  bakeM.copy(root.matrixWorld).invert();
  const parts = [];
  root.traverse(o => { if (canMerge(o)) parts.push({ mesh: o, matrix: new THREE.Matrix4().multiplyMatrices(bakeM, o.matrixWorld) }); });
  if (parts.length < 2) return root;
  const body = new THREE.Mesh(mergeMeshes(parts, true), BAKED);
  body.castShadow = parts.some(p => p.mesh.castShadow);
  body.receiveShadow = parts.every(p => p.mesh.receiveShadow);
  for (const { mesh } of parts) mesh.parent.remove(mesh);
  root.add(body);
  return root;
}
/** Free the merged geometry of something that is being thrown away. */
function discard(obj) {
  if (!obj) return;
  obj.traverse(o => {
    if (o.geometry && o.geometry.userData.baked) o.geometry.dispose();
    if (o.material && (o.isSprite || o.material.userData.own)) o.material.dispose();
  });
  if (obj.parent) obj.parent.remove(obj);
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
    emit({ pos, vel: v, color: pick(colors), size: rand(0.25, 0.5), life: rand(0.6, 1.1), gravity: -3, drag: 0.94, spin: rand(-4, 4), tex });
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

/** Empty a group, freeing merged geometry on the way. */
function clearGroup(group) {
  for (let i = group.children.length - 1; i >= 0; i--) discard(group.children[i]);
}
