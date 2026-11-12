"use strict";
/* =====================================================================
   Procedural textures
   ---------------------------------------------------------------------
   Every surface in the game gets its grain from textures synthesised
   here on offscreen canvases — no image files. For each kind of surface
   (felt, fur, bark, leaves, stone, hammered iron...) a small generator
   describes a tileable field of
       height     (drives bump / normal mapping),
       albedo     (light-and-dark colour variation), and
       roughness  (how the surface catches the light),
   and the utility packs them into CanvasTextures.
   ===================================================================== */

/* ------------------------------ noise -------------------------------- */

function hash2(ix, iy, seed) {
  let h = Math.imul(ix, 374761393) ^ Math.imul(iy, 668265263) ^ Math.imul(seed, 1274126177);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
function wrap(i, p) { return ((i % p) + p) % p; }
const fade = (t) => t * t * t * (t * (t * 6 - 15) + 10);

/** Smooth value noise that repeats every (px, py) cells, so textures tile. */
function tileNoise(x, y, px, py, seed) {
  const x0 = Math.floor(x), y0 = Math.floor(y);
  const fx = fade(x - x0), fy = fade(y - y0);
  const a = hash2(wrap(x0, px), wrap(y0, py), seed), b = hash2(wrap(x0 + 1, px), wrap(y0, py), seed);
  const c = hash2(wrap(x0, px), wrap(y0 + 1, py), seed), d = hash2(wrap(x0 + 1, px), wrap(y0 + 1, py), seed);
  return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
}
/** Fractal noise over u,v in [0,1): `fx`,`fy` cells across at the coarsest octave. */
function fbm(u, v, fx, fy, octaves, seed) {
  let sum = 0, amp = 0.5, norm = 0;
  for (let o = 0; o < octaves; o++) {
    sum += tileNoise(u * fx, v * fy, fx, fy, seed + o * 17) * amp;
    norm += amp;
    amp *= 0.5; fx *= 2; fy *= 2;
  }
  return sum / norm;
}
/** Tileable cellular noise: distance to the nearest and second-nearest feature point, and the cell's id. */
function worley(u, v, cells, seed) {
  const x = u * cells, y = v * cells;
  const xi = Math.floor(x), yi = Math.floor(y);
  let f1 = 9, f2 = 9, id = 0;
  for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) {
    const cx = xi + i, cy = yi + j;
    const wx = wrap(cx, cells), wy = wrap(cy, cells);
    const px = cx + hash2(wx, wy, seed), py = cy + hash2(wx, wy, seed + 7);
    const d = Math.hypot(px - x, py - y);
    if (d < f1) { f2 = f1; f1 = d; id = hash2(wx, wy, seed + 13); } else if (d < f2) f2 = d;
  }
  return [f1, f2, id];
}
const sstep = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

/* --------------------------- surface recipes -------------------------- */
/* Each recipe returns [height, albedo, roughness], all 0..1 (0.5 = neutral for the last two). */

const RECIPES = {
  // felt / modelling clay: a fine, even grain
  soft(u, v) {
    const g = fbm(u, v, 24, 24, 3, 1), b = fbm(u, v, 5, 5, 3, 2);
    return [g * 0.7 + b * 0.3, 0.5 + (b - 0.5) * 0.9 + (g - 0.5) * 0.3, 0.5 + (g - 0.5) * 0.8];
  },
  // plush fur: short strands combed downwards
  fur(u, v) {
    const s = fbm(u, v, 56, 7, 3, 3), c = fbm(u, v, 6, 6, 3, 4);
    return [s * 0.8 + c * 0.2, 0.5 + (s - 0.5) * 0.8 + (c - 0.5) * 0.6, 0.6 + (s - 0.5) * 0.5];
  },
  // woven cloth
  fabric(u, v) {
    const w = Math.sin(u * Math.PI * 2 * 44) * Math.sin(v * Math.PI * 2 * 44);
    const n = fbm(u, v, 8, 8, 3, 5);
    return [0.5 + w * 0.32 + (n - 0.5) * 0.3, 0.5 + w * 0.12 + (n - 0.5) * 0.7, 0.55 + w * 0.2];
  },
  skin(u, v) {
    const n = fbm(u, v, 30, 30, 2, 6), b = fbm(u, v, 4, 4, 2, 7);
    return [n * 0.5 + 0.25, 0.5 + (b - 0.5) * 0.5, 0.5 + (n - 0.5) * 0.4];
  },
  // bark and broom handles: long grain with the odd knot
  wood(u, v) {
    const warp = fbm(u, v, 3, 3, 2, 8) * 0.12;
    const grain = fbm(u + warp, v, 30, 3, 3, 9);
    const ridge = 1 - Math.abs(grain * 2 - 1);
    const big = fbm(u, v, 4, 2, 2, 10);
    return [ridge * 0.75 + big * 0.25, 0.5 + (ridge - 0.55) * 0.9 + (big - 0.5) * 0.5, 0.55 + (ridge - 0.5) * 0.5];
  },
  straw(u, v) {
    const s = fbm(u, v, 5, 64, 2, 11), t = fbm(u, v, 3, 40, 2, 12);
    const ridge = 1 - Math.abs(s * 2 - 1);
    return [ridge * 0.8 + t * 0.2, 0.5 + (ridge - 0.5) * 0.9 + (t - 0.5) * 0.5, 0.5 + (ridge - 0.5) * 0.4];
  },
  // foliage: a quilt of rounded leaf clumps, each a slightly different green
  leaf(u, v) {
    const [f1, f2, id] = worley(u, v, 7, 13);
    const small = worley(u, v, 21, 14);
    const mound = 1 - sstep(0, 0.75, f1);
    const edge = sstep(0, 0.12, f2 - f1);
    const fine = 1 - sstep(0, 0.7, small[0]);
    return [mound * 0.6 * edge + fine * 0.4, 0.5 + (id - 0.5) * 0.75 + (fine - 0.5) * 0.2 - (1 - edge) * 0.3, 0.45 + fine * 0.25];
  },
  // rock: lumpy, pitted, with hairline cracks
  stone(u, v) {
    const n = fbm(u, v, 6, 6, 5, 15), [f1, f2] = worley(u, v, 5, 16);
    const crack = 1 - sstep(0, 0.07, f2 - f1);
    const speck = fbm(u, v, 48, 48, 2, 17);
    return [n * 0.8 - crack * 0.25 + 0.1, 0.5 + (n - 0.5) * 1.1 - crack * 0.14 + (speck - 0.5) * 0.3, 0.6 + (speck - 0.5) * 0.5 - crack * 0.1];
  },
  // hand-beaten iron: shallow hammer dimples and a few scratches
  metal(u, v) {
    const [f1] = worley(u, v, 9, 18);
    const dimple = sstep(0, 0.6, f1);
    const scratch = fbm(u, v, 3, 70, 2, 19);
    const n = fbm(u, v, 12, 12, 3, 20);
    return [dimple * 0.75 + n * 0.25, 0.5 + (n - 0.5) * 0.6 + (dimple - 0.5) * 0.25, 0.35 + (scratch - 0.5) * 0.7 + (1 - dimple) * 0.25];
  },
  // glazed and waxy things: pumpkins, mushroom caps, boots
  gloss(u, v) {
    const n = fbm(u, v, 6, 6, 4, 21), f = fbm(u, v, 40, 40, 2, 22);
    return [n * 0.6 + f * 0.15, 0.5 + (n - 0.5) * 0.9, 0.5 + (f - 0.5) * 0.6 + (n - 0.5) * 0.3];
  },
  // turf and earth: big soft blotches with a fine crumb
  ground(u, v) {
    const big = fbm(u, v, 3, 3, 5, 23), crumb = fbm(u, v, 40, 40, 3, 24);
    const [f1] = worley(u, v, 26, 25);
    const pebble = 1 - sstep(0.05, 0.3, f1);
    return [crumb * 0.6 + pebble * 0.4, 0.5 + (big - 0.5) * 1.3 + (crumb - 0.5) * 0.35, 0.55 + (crumb - 0.5) * 0.5 - pebble * 0.1];
  },
  // snow: wind-smoothed drifts that glitter
  snow(u, v) {
    const n = fbm(u, v, 5, 5, 4, 26);
    const glint = hash2(Math.floor(u * 256), Math.floor(v * 256), 27) > 0.965 ? 1 : 0;
    const crumb = fbm(u, v, 50, 50, 2, 28);
    return [n * 0.75 + crumb * 0.25, 0.5 + (n - 0.5) * 0.45, 0.6 + (crumb - 0.5) * 0.3 - glint * 0.6];
  },
  cloud(u, v) {
    const n = fbm(u, v, 4, 4, 4, 29);
    return [n, 0.5 + (n - 0.5) * 0.4, 0.5];
  },
};

/* --------------------------- canvas packing --------------------------- */

const TEX_SIZE = 256;
function newCanvas(size = TEX_SIZE) {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  return c;
}
function finishTexture(canvas, color = false) {
  const t = new THREE.CanvasTexture(canvas);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = color ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  t.anisotropy = 4;
  return t;
}

/** Evaluate a recipe over the whole tile. */
function bakeField(recipe, size = TEX_SIZE) {
  const h = new Float32Array(size * size), a = new Float32Array(size * size), r = new Float32Array(size * size);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const v = recipe(x / size, y / size), i = y * size + x;
    h[i] = v[0]; a[i] = v[1]; r[i] = v[2];
  }
  return { h, a, r, size };
}
const to8 = (v) => Math.max(0, Math.min(255, Math.round(v * 255)));

/** Pack a field into one "detail" texture: R = albedo variation, G = roughness, B = height (bump). */
function detailTexture(field) {
  const { h, a, r, size } = field;
  const c = newCanvas(size), g = c.getContext("2d");
  const img = g.createImageData(size, size);
  for (let i = 0; i < size * size; i++) {
    img.data[i * 4] = to8(a[i]);
    img.data[i * 4 + 1] = to8(r[i]);
    img.data[i * 4 + 2] = to8(h[i]);
    img.data[i * 4 + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  return finishTexture(c);
}
/** A tangent-space normal map from a height field (wrapping at the edges). */
function normalTexture(h, size, strength = 2) {
  const c = newCanvas(size), g = c.getContext("2d");
  const img = g.createImageData(size, size);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const l = h[y * size + wrap(x - 1, size)], rr = h[y * size + wrap(x + 1, size)];
    const u = h[wrap(y - 1, size) * size + x], d = h[wrap(y + 1, size) * size + x];
    let nx = (l - rr) * strength, ny = (u - d) * strength, nz = 1;
    const len = Math.hypot(nx, ny, nz);
    const i = (y * size + x) * 4;
    img.data[i] = to8(nx / len * 0.5 + 0.5);
    img.data[i + 1] = to8(ny / len * 0.5 + 0.5);
    img.data[i + 2] = to8(nz / len * 0.5 + 0.5);
    img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  return finishTexture(c);
}
/** A colour (albedo) texture: `tint(h, a) -> [r, g, b]` in 0..1. */
function albedoTexture(field, tint) {
  const { h, a, size } = field;
  const c = newCanvas(size), g = c.getContext("2d");
  const img = g.createImageData(size, size);
  for (let i = 0; i < size * size; i++) {
    const rgb = tint(h[i], a[i]);
    img.data[i * 4] = to8(rgb[0]); img.data[i * 4 + 1] = to8(rgb[1]); img.data[i * 4 + 2] = to8(rgb[2]); img.data[i * 4 + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  return finishTexture(c, true);
}

const detailCache = new Map();
/** The detail texture for a kind of surface (made the first time it is asked for). */
function surfaceDetail(name) {
  if (!detailCache.has(name)) detailCache.set(name, detailTexture(bakeField(RECIPES[name])));
  return detailCache.get(name);
}

/* ---------------------- one-off textures (UV mapped) ------------------- */

/** Ripples for water: a normal map of overlapping swells. */
function rippleNormalTexture() {
  const f = bakeField((u, v) => {
    const a = fbm(u, v, 5, 5, 3, 40), b = fbm(u, v, 11, 11, 2, 41);
    const ring = worley(u, v, 4, 42)[0];
    return [a * 0.6 + b * 0.25 + Math.sin(ring * 22) * 0.07, 0.5, 0.5];
  });
  return normalTexture(f.h, f.size, 5);
}
/** The moon: pale seas, soft craters — colour, glow and bump maps. */
function moonTextures() {
  const f = bakeField((u, v) => {
    const seas = fbm(u, v, 4, 4, 4, 50);
    let crater = 0;
    for (const [cells, seed, depth] of [[5, 51, 1], [11, 52, 0.6]]) {
      const [f1] = worley(u, v, cells, seed);
      const rim = sstep(0.16, 0.22, f1) - sstep(0.22, 0.3, f1);
      crater += (rim * 0.5 - (1 - sstep(0.0, 0.2, f1)) * 0.6) * depth;
    }
    return [0.55 + crater * 0.5 + (seas - 0.5) * 0.25, seas, 0.5];
  });
  const map = albedoTexture(f, (h, a) => {
    const k = 0.9 + (h - 0.55) * 0.32 - sstep(0.52, 0.7, a) * 0.06;
    return [1.0 * k, 0.95 * k, 0.78 * k];
  });
  return { map, normal: normalTexture(f.h, f.size, 3.5) };
}
