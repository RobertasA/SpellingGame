"use strict";
/* =====================================================================
   Models: the little witch, her cat, the friends, the cauldron, stars
   Everything is built in code — lathe-turned, extruded and tube shapes
   with procedural felt, fur, cloth, wood and iron surfaces.
   ===================================================================== */

/* ------------------------------ wardrobe ------------------------------ */
// `stars` is how many level stars are needed before a look can be chosen.

const SKINS = [0xffdcc2, 0xf2c29a, 0xc48a5c, 0x8a573a];
const HAIRS = [
  { name: "Ginger", c: 0xf0813f }, { name: "Black", c: 0x3a2c4f }, { name: "Gold", c: 0xf7d36b },
  { name: "Brown", c: 0x8a5a3c }, { name: "Pink", c: 0xff8fc8 }, { name: "Lilac", c: 0xa98bff }, { name: "Teal", c: 0x4fcfc0 },
];
const OUTFITS = [
  { name: "Plum",      hat: 0x6b4bb8, dress: 0x8463d8, trim: 0xffcf4a, stars: 0 },
  { name: "Rose",      hat: 0xe85f9f, dress: 0xf58fc0, trim: 0xfff3a8, stars: 0 },
  { name: "Midnight",  hat: 0x2f3c8a, dress: 0x4558b8, trim: 0xffe27a, stars: 0 },
  { name: "Pumpkin",   hat: 0x4a3566, dress: 0xf58a2e, trim: 0xffa93d, stars: 6 },
  { name: "Mint",      hat: 0x2fa88c, dress: 0x66d6b6, trim: 0xfff3b0, stars: 14 },
  { name: "Berry",     hat: 0xa3305f, dress: 0xd0558a, trim: 0xffc2dc, stars: 24 },
  { name: "Sky",       hat: 0x3f8fe0, dress: 0x7cc6ff, trim: 0xffffff, stars: 36 },
  { name: "Snow",      hat: 0xf4f1ff, dress: 0xdfe9ff, trim: 0x8fd3ff, stars: 50 },
  { name: "Rainbow",   hat: 0xff6f91, dress: 0x6fc8ff, trim: 0xffd166, stars: 66, rainbow: true },
  { name: "Starlight", hat: 0x1f1b52, dress: 0x2e2a7a, trim: 0xfff7c2, stars: 84, starry: true },
];
const CATS = [
  { name: "Inky",    fur: 0x3d3550, belly: 0x3d3550, stars: 0 },
  { name: "Ginger",  fur: 0xf2994a, belly: 0xfff0d9, stars: 0 },
  { name: "Socks",   fur: 0x3d3550, belly: 0xffffff, stars: 3 },
  { name: "Snowy",   fur: 0xfaf6f0, belly: 0xffffff, stars: 10 },
  { name: "Misty",   fur: 0x9aa0b8, belly: 0xe6e9f5, stars: 20 },
  { name: "Plum",    fur: 0xb39df5, belly: 0xf0e8ff, stars: 40 },
  { name: "Sunny",   fur: 0xffd45e, belly: 0xfff6cf, stars: 60 },
];
const TRAILS = [
  { name: "Gold",    colors: [0xffe27a, 0xffffff, 0xffc93c], stars: 0 },
  { name: "Pink",    colors: [0xff8fc8, 0xffffff, 0xffc2e2], stars: 8 },
  { name: "Ice",     colors: [0x8fd3ff, 0xffffff, 0xc7b3ff], stars: 18 },
  { name: "Leaf",    colors: [0x7fe0b0, 0xfff3a8, 0xffffff], stars: 30 },
  { name: "Rainbow", colors: [0xff6f91, 0xffc93c, 0x7fe0b0, 0x6fc8ff, 0xb48cff], stars: 48 },
];
const RAINBOW = [0xff6f91, 0xffa64d, 0xffd166, 0x7fe0b0, 0x6fc8ff, 0xb48cff];
const PINK = 0xff9fb5;

/* lathe profiles ([radius, height], bottom to top) shared by many models */
const PEAR = [[0, 0], [0.2, 0.01], [0.31, 0.1], [0.36, 0.26], [0.34, 0.44], [0.26, 0.6], [0.13, 0.69], [0, 0.71]];
const FLAME = [[0, 0], [0.42, 0.1], [0.6, 0.34], [0.46, 0.66], [0.2, 0.92], [0.05, 1.04], [0, 1.08]];

/* -------------------------------- cat -------------------------------- */

function buildCat(look) {
  const g = new THREE.Group();
  const fur = K.fur(look.fur), belly = K.fur(look.belly), two = look.belly !== look.fur;
  const body = lathe(fur, PEAR, 20, "pear");
  body.scale.set(0.86, 0.86, 0.82);
  g.add(body);
  if (two) g.add(ball(belly, 0.2, 0, 0.25, 0.16, 1, 1.05, 0.6));
  g.add(ball(belly, 0.085, -0.13, 0.05, 0.2, 1, 0.6, 1.2));
  g.add(ball(belly, 0.085, 0.13, 0.05, 0.2, 1, 0.6, 1.2));
  const head = new THREE.Group();
  head.position.set(0, 0.74, 0.03);
  g.add(head);
  head.add(ball(fur, 0.3, 0, 0, 0, 1.08, 0.95, 0.95));
  for (const s of [-1, 1]) {
    head.add(cone(fur, 0.12, 0.24, s * 0.19, 0.28, 0, 0, -s * 0.3, 10));
    head.add(cone(K.skin(PINK), 0.06, 0.13, s * 0.19, 0.26, 0.05, 0, -s * 0.3, 10));
    const iris = new THREE.Mesh(SPHERE_MID, shiny(0xc8f56a, 0.55));
    iris.scale.set(0.07, 0.077, 0.042);
    iris.position.set(s * 0.12, 0.02, 0.24);
    head.add(iris);
    const pupil = new THREE.Mesh(SPHERE_LOW, GLOSSY_DARK);
    pupil.scale.set(0.025, 0.046, 0.022);
    pupil.position.set(s * 0.12, 0.02, 0.276);
    head.add(pupil);
    head.add(ball(K.skin(PINK), 0.04, s * 0.2, -0.09, 0.22, 1, 0.7, 0.5));
    // whiskers
    for (const k of [-1, 1]) {
      const w = cyl(K.gloss(0xffffff), 0.004, 0.006, 0.2, s * 0.26, -0.06 + k * 0.025, 0.2, 5);
      w.rotation.z = Math.PI / 2 + s * k * 0.18;
      w.castShadow = false;
      head.add(w);
    }
  }
  if (two) head.add(ball(belly, 0.12, 0, -0.09, 0.2, 1.2, 0.8, 0.8));
  head.add(ball(K.skin(PINK), 0.03, 0, -0.05, 0.3));
  const tail = new THREE.Group();
  tail.position.set(0.05, 0.16, -0.24);
  tail.add(tube(fur, [[0, 0, 0], [0, 0.12, -0.12], [0.02, 0.32, -0.16], [0, 0.5, -0.1], [-0.03, 0.6, 0.0]], 0.07, 0.05, 10, 7));
  tail.add(ball(two ? belly : fur, 0.062, -0.03, 0.6, 0.0));
  g.add(tail);
  fuse(g);
  g.userData = { head, tail };
  return g;
}

/* ------------------------------- witch ------------------------------- */

const WING_GEO = (() => {
  // a scalloped bat/dragon wing with a little thickness, reused for both
  const s = new THREE.Shape();
  s.moveTo(0, 0);
  s.quadraticCurveTo(0.45, 0.75, 1.1, 0.55);
  s.quadraticCurveTo(0.95, 0.3, 1.0, 0.05);
  s.quadraticCurveTo(0.8, 0.2, 0.68, -0.1);
  s.quadraticCurveTo(0.5, 0.1, 0.36, -0.2);
  s.quadraticCurveTo(0.2, 0, 0, 0);
  return new THREE.ExtrudeGeometry(s, { depth: 0.02, bevelEnabled: true, bevelSize: 0.025, bevelThickness: 0.02, bevelSegments: 2, curveSegments: 8 });
})();
const wingMats = new Map();
function wingMaterial(color) {
  if (!wingMats.has(color)) wingMats.set(color, kindMaterial("fabric", { color, side: THREE.DoubleSide }));
  return wingMats.get(color);
}

function buildWitch(look, name) {
  const skin = K.skin(SKINS[look.skin] ?? SKINS[0]);
  const hair = K.hair((HAIRS[look.hair] ?? HAIRS[0]).c);
  const outfit = OUTFITS[look.outfit] ?? OUTFITS[0];
  const catLook = CATS[look.cat] ?? CATS[0];
  const hatC = K.fabric(outfit.hat), dressC = K.fabric(outfit.dress), trim = K.gloss(outfit.trim);

  const root = new THREE.Group();

  /* broom — a slightly crooked stick along x, a bound bundle of straw at the back */
  const broom = new THREE.Group();
  broom.add(tube(K.wood(0xb07a4c), [[-1.0, 0, 0], [-0.3, 0.025, 0.01], [0.5, -0.02, -0.01], [1.5, 0.03, 0]], 0.055, 0.042, 14, 8));
  broom.add(ball(K.wood(0xb07a4c), 0.05, 1.5, 0.03, 0));
  const bundle = lathe(K.straw(0xf0c064), [[0, 0], [0.1, 0], [0.13, 0.08], [0.24, 0.3], [0.36, 0.62], [0.34, 0.88], [0.24, 1.04], [0.08, 1.12], [0, 1.13]], 18);
  bundle.rotation.z = Math.PI / 2;
  bundle.position.x = -0.88;
  broom.add(bundle);
  for (let i = 0; i < 9; i++) {                       // loose straws
    const a = i * 0.7, r = 0.2 + (i % 3) * 0.05;
    const s = cone(K.straw(i % 2 ? 0xe0aa4e : 0xf7d27a), 0.035, 0.5, -1.75 - (i % 3) * 0.06, Math.cos(a) * r, Math.sin(a) * r, 0, Math.PI / 2 + Math.cos(a) * 0.25, 6);
    broom.add(s);
  }
  for (const x of [-0.92, -1.02]) {
    const band = torus(trim, 0.125 + (x < -1 ? 0.03 : 0), 0.028, x, 0, 0);
    band.rotation.y = Math.PI / 2;
    broom.add(band);
  }
  root.add(broom);

  /* rider — sits side-saddle, turned a little towards us */
  const rider = new THREE.Group();
  rider.position.set(0.15, 0.04, 0);
  rider.rotation.y = 0.75;
  root.add(rider);

  const body = new THREE.Group();
  rider.add(body);
  body.add(lathe(dressC, [[0, -0.06], [0.46, -0.06], [0.5, -0.02], [0.44, 0.08], [0.33, 0.3], [0.26, 0.5], [0.25, 0.62], [0.2, 0.76], [0.1, 0.84], [0, 0.85]], 24));
  const hem = torus(trim, 0.46, 0.04, 0, 0.0, 0);
  hem.rotation.x = Math.PI / 2;
  body.add(hem);
  // stripy stockings and shiny boots dangling in front
  const legs = [];
  for (const s of [-1, 1]) {
    const leg = new THREE.Group();
    leg.position.set(s * 0.15, 0.0, 0.26);
    leg.rotation.x = 0.35;
    for (let i = 0; i < 4; i++) leg.add(cyl(K.fabric(i % 2 ? 0xffffff : outfit.hat), 0.075, 0.075, 0.105, 0, -0.08 - i * 0.1, 0, 12));
    leg.add(ball(K.gloss(DARK), 0.12, 0, -0.5, 0.05, 0.9, 0.8, 1.4));
    leg.add(ball(K.gloss(DARK), 0.085, 0, -0.44, 0.0, 1, 0.9, 1));
    leg.userData.side = s;
    body.add(leg);
    legs.push(leg);
  }
  // a little cape
  const cape = cone(hatC, 0.46, 0.84, 0, 0.36, -0.13, 0.13, 0, 18);
  cape.scale.z *= 0.62;
  body.add(cape);
  // bow at the neck
  for (const s of [-1, 1]) {
    const loop = petal(trim, 0.17, s * 0.02, 0.7, 0.25);
    loop.rotation.z = -s * 1.45;
    body.add(loop);
  }
  body.add(ball(trim, 0.035, 0, 0.7, 0.27));

  /* head */
  const head = new THREE.Group();
  head.position.y = 1.1;
  body.add(head);
  head.add(ball(skin, 0.46, 0, 0, 0, 1.05, 0.96, 0.96));
  head.add(ball(hair, 0.49, 0, 0.05, -0.1, 1.05, 1, 0.95));                 // back of hair
  for (let i = -2; i <= 2; i++) {                                           // fringe
    head.add(ball(hair, 0.17, i * 0.15, 0.3 - Math.abs(i) * 0.035, 0.3 - Math.abs(i) * 0.045, 1, 0.85, 0.8));
  }
  const tails = [];
  for (const s of [-1, 1]) {                                                 // bunches
    const t = new THREE.Group();
    t.position.set(s * 0.47, -0.08, -0.02);
    t.add(ball(trim, 0.075, 0, 0.05, 0));
    t.add(tube(hair, [[0, 0, 0], [s * 0.08, -0.16, 0], [s * 0.11, -0.38, 0.01], [s * 0.1, -0.58, 0.02]], 0.17, 0.07, 8, 8));
    t.add(ball(hair, 0.07, s * 0.1, -0.59, 0.02));
    t.userData.side = s;
    head.add(t);
    tails.push(t);
  }
  eye(head, -0.17, -0.02, 0.4, 0.078);
  eye(head, 0.17, -0.02, 0.4, 0.078);
  head.add(ball(K.skin(PINK), 0.075, -0.3, -0.15, 0.32, 1, 0.65, 0.4));
  head.add(ball(K.skin(PINK), 0.075, 0.3, -0.15, 0.32, 1, 0.65, 0.4));
  head.add(ball(skin, 0.035, 0, -0.07, 0.455));                              // button nose
  smile(head, 0.075, 0, -0.14, 0.44);

  /* hat — turned on the lathe: a floppy brim with a rolled edge and a tall crown */
  const hat = new THREE.Group();
  hat.position.set(0, 0.3, -0.03);
  hat.rotation.set(-0.16, 0, 0.1);
  head.add(hat);
  hat.add(lathe(hatC, [[0, -0.02], [0.72, -0.035], [0.81, -0.01], [0.82, 0.03], [0.76, 0.055], [0.6, 0.06], [0.49, 0.08], [0.44, 0.16], [0.39, 0.32], [0.3, 0.5], [0.22, 0.63], [0.12, 0.67], [0, 0.68]], 28));
  const tip = new THREE.Group();
  tip.position.set(0, 0.6, 0);
  tip.rotation.z = -0.75;
  tip.add(lathe(hatC, [[0, -0.04], [0.21, -0.02], [0.2, 0.06], [0.13, 0.26], [0.06, 0.42], [0, 0.46]], 16));
  tip.add(ball(trim, 0.09, 0, 0.47, 0));
  hat.add(tip);
  if (outfit.rainbow) {
    RAINBOW.forEach((c, i) => hat.add(cyl(K.fabric(c), 0.455 - i * 0.045, 0.48 - i * 0.045, 0.085, 0, 0.1 + i * 0.085, 0, 24)));
  } else {
    hat.add(cyl(trim, 0.445, 0.475, 0.12, 0, 0.125, 0, 24));
  }
  const badge = new THREE.Mesh(STAR_GEO, shiny(outfit.starry ? 0xfff7c2 : 0xffd34d, 1.3));
  badge.scale.setScalar(0.09);
  badge.position.set(0, 0.14, 0.475);
  badge.castShadow = true;
  hat.add(badge);
  if (outfit.starry) {
    for (let i = 0; i < 7; i++) {
      const a = i * 0.9, y = 0.26 + (i % 4) * 0.1, r = 0.43 - (y - 0.16) * 0.48;
      const st = new THREE.Mesh(SPHERE_LOW, shiny(0xfff7c2, 2.4));
      st.scale.setScalar(0.03);
      st.position.set(Math.cos(a) * r, y, Math.sin(a) * r);
      hat.add(st);
    }
  }

  /* arms: one holds the broom, one waves the wand */
  const holdArm = capsule(dressC, 0.09, 0.2, -0.3, 0.4, 0.14);
  holdArm.rotation.z = -0.5;
  body.add(holdArm);
  body.add(ball(skin, 0.085, -0.42, 0.2, 0.2));
  const arm = new THREE.Group();
  arm.position.set(0.28, 0.58, 0.1);
  body.add(arm);
  const sleeve = capsule(dressC, 0.09, 0.2, 0.14, 0.02, 0.06);
  sleeve.rotation.z = Math.PI / 2;
  arm.add(sleeve);
  arm.add(ball(skin, 0.085, 0.3, 0.04, 0.1));
  const wand = cyl(K.wood(0x6b4a3a), 0.02, 0.032, 0.62, 0.44, 0.3, 0.14, 8);
  wand.rotation.z = -0.5;
  arm.add(wand);
  const star = new THREE.Mesh(STAR_GEO, shiny(0xffd34d, 2.2));
  star.scale.setScalar(0.15);
  star.position.set(0.6, 0.6, 0.14);
  star.castShadow = true;
  arm.add(star);
  const wandTip = new THREE.Object3D();
  wandTip.position.copy(star.position);
  arm.add(wandTip);
  const wandGlow = glowSprite(0xffe9a0, 0.8, 0.3);
  wandGlow.position.copy(star.position);
  arm.add(wandGlow);

  fuse(root);

  /* the cat rides on the bristles */
  const cat = buildCat(catLook);
  cat.scale.setScalar(0.72);
  cat.position.set(-1.0, 0.12, 0);
  cat.rotation.y = 0.75;
  root.add(cat);

  root.userData = { rider, body, head, hat, tip, arm, star, wandTip, wandGlow, tails, legs, cat, broom, name };
  return root;
}

/* ------------------------------ friends ------------------------------ */
/* Each friend has a "poorly" look and a "helped" look; setHelped() swaps them. */

const FRIEND_INFO = {
  mouse:    { fur: 0xd8cfe6, belly: 0xffffff, kind: "fur",   emoji: "🐭" },
  hedgehog: { fur: 0xf3d9b5, belly: 0xfff0dc, kind: "fur",   emoji: "🦔" },
  frog:     { fur: 0x8ed46a, belly: 0xe8f7c4, kind: "gloss", emoji: "🐸" },
  bat:      { fur: 0x9d86e8, belly: 0xe6dcff, kind: "fur",   emoji: "🦇" },
  owl:      { fur: 0xf2f5ff, belly: 0xffffff, kind: "fur",   emoji: "🦉" },
  dragon:   { fur: 0x6fd3a2, belly: 0xfff2c9, kind: "gloss", emoji: "🐲" },
};

function buildFriend(kind) {
  const g = new THREE.Group();
  const P = FRIEND_INFO[kind];
  const coat = K[P.kind];
  const fur = coat(P.fur), belly = coat(P.belly), pink = K.skin(PINK);
  const helpedParts = [], poorlyParts = [];
  const U = { kind, helpedParts, poorlyParts, wings: [], phase: rand(0, 6), helped: false, hover: 0, baseY: 0 };

  const body = lathe(fur, PEAR, 20, "pear");
  body.scale.set(0.98, 0.98, 0.9);
  g.add(body);
  g.add(ball(belly, 0.22, 0, 0.32, 0.17, 1, 1, 0.6));
  const foot = kind === "owl" ? K.gloss(0xffb14d) : fur;
  g.add(ball(foot, 0.1, -0.14, 0.06, 0.13, 1, 0.6, 1.3));
  g.add(ball(foot, 0.1, 0.14, 0.06, 0.13, 1, 0.6, 1.3));
  const head = new THREE.Group();
  head.position.set(0, 0.82, 0.04);
  g.add(head);
  U.head = head;
  const wide = kind === "frog";
  head.add(ball(fur, wide ? 0.3 : 0.32, 0, 0, 0, wide ? 1.25 : 1, wide ? 0.8 : 1, 1));

  const eyes = (y = 0.04, z = 0.27, spread = 0.12, r = 0.058) => { eye(head, -spread, y, z, r); eye(head, spread, y, z, r); };
  const cheeks = (y = -0.06) => {
    head.add(ball(pink, 0.05, -0.2, y, 0.23, 1, 0.7, 0.5));
    head.add(ball(pink, 0.05, 0.2, y, 0.23, 1, 0.7, 0.5));
  };
  const nose = (r, x, y, z) => { const n = new THREE.Mesh(SPHERE_LOW, GLOSSY_DARK); n.scale.set(r * 1.15, r * 0.85, r); n.position.set(x, y, z); head.add(n); };

  switch (kind) {
    case "mouse": {
      for (const s of [-1, 1]) {
        head.add(ball(fur, 0.19, s * 0.27, 0.27, -0.02, 1, 1, 0.35));
        head.add(ball(pink, 0.12, s * 0.27, 0.27, 0.03, 1, 1, 0.3));
      }
      head.add(ball(belly, 0.12, 0, -0.07, 0.24, 1, 0.8, 0.9));
      head.add(ball(pink, 0.04, 0, -0.03, 0.36));
      eyes(); cheeks(-0.08);
      g.add(tube(pink, [[-0.08, 0.1, -0.28], [-0.14, 0.06, -0.45], [-0.2, 0.14, -0.6], [-0.22, 0.26, -0.72], [-0.2, 0.3, -0.8]], 0.04, 0.018, 12, 6));
      // a tiny glowing lantern once Pip has the Glow Potion
      const lantern = new THREE.Group();
      lantern.position.set(0.4, 0.42, 0.2);
      lantern.add(ball(fur, 0.07, -0.08, 0.02, -0.02));
      const lamp = new THREE.Mesh(SPHERE_MID, shiny(0xffe27a, 3));
      lamp.scale.setScalar(0.11);
      lantern.add(lamp);
      lantern.add(cyl(K.metal(0x8a6a4a), 0.05, 0.085, 0.045, 0, 0.125, 0, 10));
      lantern.add(cyl(K.metal(0x8a6a4a), 0.085, 0.06, 0.04, 0, -0.12, 0, 10));
      const ring = torus(K.metal(0x8a6a4a), 0.045, 0.012, 0, 0.18, 0);
      lantern.add(ring);
      for (let i = 0; i < 4; i++) lantern.add(cyl(K.metal(0x8a6a4a), 0.009, 0.009, 0.22, Math.cos(i * 1.57) * 0.1, 0, Math.sin(i * 1.57) * 0.1, 5));
      const glow = glowSprite(0xffe27a, 1.3, 0.4);
      lantern.add(glow);
      g.add(lantern);
      helpedParts.push(lantern);
      U.glow = glow;
      break;
    }
    case "hedgehog": {
      for (let i = 0; i < 30; i++) {
        const a = rand(-2.4, 2.4), b = rand(0.1, 1.4);
        const dir = new THREE.Vector3(Math.sin(a) * Math.sin(b), Math.cos(b), -Math.abs(Math.cos(a)) * Math.sin(b) - 0.2).normalize();
        const spike = cone(K.hair(i % 3 ? 0x9a6b4b : 0x7d543a), 0.065, 0.26, dir.x * 0.32, 0.55 + dir.y * 0.38, -0.05 + dir.z * 0.32, 0, 0, 6);
        spike.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
        g.add(spike);
      }
      head.add(ball(fur, 0.11, 0, -0.06, 0.26, 1, 0.8, 1));
      nose(0.04, 0, -0.04, 0.36);
      eyes(0.06, 0.26); cheeks(-0.04);
      // a stripy scarf and a bobble hat once Bramble has the Cosy Potion
      const scarf = new THREE.Group();
      const wool = K.fabric(0xff6f7d), white = K.fabric(0xffffff);
      const wrap = torus(wool, 0.27, 0.07, 0, 0.6, 0.03);
      wrap.rotation.x = Math.PI / 2;
      scarf.add(wrap);
      const end = capsule(wool, 0.065, 0.14, 0.16, 0.45, 0.26);
      scarf.add(end);
      scarf.add(ball(white, 0.07, 0.16, 0.34, 0.26, 1, 0.5, 0.8));
      scarf.add(lathe(K.fabric(0x6fc8ff), [[0, 0], [0.21, 0], [0.22, 0.05], [0.19, 0.14], [0.11, 0.21], [0, 0.23]], 16, "bobblehat"));
      scarf.children[scarf.children.length - 1].position.set(0, 1.07, 0.04);
      scarf.add(ball(K.fur(0xffffff), 0.075, 0, 1.33, 0.04));
      const brim = torus(white, 0.2, 0.045, 0, 1.09, 0.04);
      brim.rotation.x = Math.PI / 2;
      scarf.add(brim);
      g.add(scarf);
      helpedParts.push(scarf);
      break;
    }
    case "frog": {
      for (const s of [-1, 1]) {
        head.add(ball(fur, 0.12, s * 0.17, 0.21, 0.06));
        head.add(ball(K.gloss(0xffffff), 0.08, s * 0.17, 0.23, 0.13));
        eye(head, s * 0.17, 0.23, 0.2, 0.045);
        g.add(ball(K.gloss(0x7cc45c), 0.04, s * 0.2, 0.5 + s * 0.03, -0.26, 1, 0.5, 1));     // spots
      }
      smile(head, 0.12, 0, 0, 0.27);
      cheeks(-0.04);
      // a pink water-lily hat
      for (let i = 0; i < 7; i++) {
        const p = petal(K.gloss(i % 2 ? 0xff9ccf : 0xffb8dc), 0.13, 0, 0.27, -0.06);
        p.rotation.set(-1.0, (i / 7) * Math.PI * 2, 0, "YXZ");
        head.add(p);
      }
      head.add(ball(K.soft(0xffd166), 0.05, 0, 0.3, -0.06));
      break;
    }
    case "bat": {
      for (const s of [-1, 1]) {
        head.add(cone(fur, 0.14, 0.34, s * 0.2, 0.33, 0, 0, -s * 0.3, 10));
        head.add(cone(pink, 0.07, 0.2, s * 0.2, 0.31, 0.05, 0, -s * 0.3, 10));
      }
      nose(0.035, 0, -0.03, 0.31);
      head.add(cone(K.gloss(0xffffff), 0.022, 0.06, -0.05, -0.13, 0.28, Math.PI, 0, 6));
      head.add(cone(K.gloss(0xffffff), 0.022, 0.06, 0.05, -0.13, 0.28, Math.PI, 0, 6));
      eyes(0.05, 0.27, 0.13, 0.065); cheeks(-0.06);
      break;
    }
    case "owl": {
      for (const s of [-1, 1]) {
        head.add(ball(K.fur(0xdfe6ff), 0.13, s * 0.13, 0.05, 0.21, 1, 1, 0.5));
        eye(head, s * 0.13, 0.05, 0.27, 0.062);
        head.add(cone(fur, 0.07, 0.2, s * 0.2, 0.32, 0, 0, -s * 0.4, 8));
      }
      head.add(cone(K.gloss(0xffb14d), 0.045, 0.1, 0, -0.07, 0.3, Math.PI, 0, 8));
      for (let i = 0; i < 7; i++) {                                           // breast feathers
        const f = petal(K.fur(0xb9c6ee), 0.09, (i % 4 - 1.5) * 0.085 + (i > 3 ? 0.04 : 0), i > 3 ? 0.36 : 0.26, 0.3);
        f.rotation.set(0.25, 0, Math.PI);
        g.add(f);
      }
      for (const s of [-1, 1]) {
        const w = new THREE.Group();
        w.position.set(s * 0.3, 0.5, 0);
        w.add(ball(fur, 0.16, s * 0.03, -0.14, 0, 0.45, 1.25, 1));
        for (let i = 0; i < 3; i++) {
          const f = petal(K.fur(0xdfe6ff), 0.16, s * 0.05, -0.2 - i * 0.05, (i - 1) * 0.07);
          f.rotation.set(0, s * Math.PI / 2, Math.PI);
          w.add(f);
        }
        w.userData.side = s;
        g.add(w);
        U.wings.push(w);
      }
      // a bandage on the sore wing until the Mending Potion is ready
      const bandage = new THREE.Group();
      bandage.position.set(0.34, 0.36, 0.02);
      const wrap = torus(K.fabric(0xffffff), 0.12, 0.045, 0, 0, 0);
      wrap.rotation.x = Math.PI / 2;
      wrap.scale.set(0.09, 0.17, 0.12);
      bandage.add(wrap);
      bandage.add(ball(K.fabric(0xff6f7d), 0.03, 0.07, 0, 0.1));
      g.add(bandage);
      poorlyParts.push(bandage);
      break;
    }
    case "dragon": {
      head.add(ball(fur, 0.2, 0, -0.08, 0.2, 1.15, 0.8, 1));                 // snout
      nose(0.02, -0.07, -0.03, 0.39);
      nose(0.02, 0.07, -0.03, 0.39);
      smile(head, 0.07, 0, -0.14, 0.36);
      for (const s of [-1, 1]) {
        head.add(tube(K.gloss(0xfff2c9), [[s * 0.15, 0.22, -0.03], [s * 0.19, 0.32, -0.06], [s * 0.18, 0.41, -0.11]], 0.055, 0.015, 6, 7));    // horns
        head.add(ball(fur, 0.08, s * 0.31, 0.1, -0.02, 0.5, 1, 1));
      }
      eyes(0.1, 0.25, 0.14, 0.066); cheeks(-0.02);
      for (let i = 0; i < 4; i++) g.add(cone(K.gloss(0xffa64d), 0.07, 0.17, 0, 1.12 - i * 0.24, -0.26 - (i === 0 ? 0 : 0.06), -0.6, 0, 6));
      const tail = new THREE.Group();
      tail.position.set(0, 0.2, -0.28);
      tail.add(tube(fur, [[0, 0, 0.05], [0.07, 0.02, -0.14], [0.13, 0.04, -0.34], [0.08, 0.07, -0.55], [0.03, 0.1, -0.7]], 0.14, 0.05, 12, 8));
      const spade = petal(K.gloss(0xffa64d), 0.24, 0.03, 0.1, -0.68);
      spade.rotation.set(-1.45, 0, 0);
      tail.add(spade);
      g.add(tail);
      U.tail = tail;
      for (const s of [-1, 1]) {
        const w = new THREE.Group();
        w.position.set(s * 0.2, 0.55, -0.22);
        const m = new THREE.Mesh(WING_GEO, wingMaterial(0xffa9c0));
        m.scale.set(s * 0.5, 0.5, 0.5);
        m.castShadow = true;
        w.add(m);
        w.userData.side = s;
        g.add(w);
        U.wings.push(w);
      }
      // a sore red nose while Ember has a cold
      const sore = ball(K.gloss(0xff5a6a), 0.085, 0, -0.03, 0.4);
      sore.userData.keep = true;          // shown and hidden on its own
      head.add(sore);
      poorlyParts.push(sore);
      break;
    }
  }

  fuse(g);

  if (kind === "bat") {
    for (const s of [-1, 1]) {
      const w = new THREE.Group();
      w.position.set(s * 0.22, 0.5, -0.05);
      const m = new THREE.Mesh(WING_GEO, wingMaterial(0x6f58c9));
      m.scale.set(s * 0.75, 0.75, 0.75);
      m.castShadow = true;
      w.add(m);
      w.userData.side = s;
      g.add(w);
      U.wings.push(w);
    }
  }

  g.userData = U;
  setFriendHelped(g, false);
  return g;
}

function setFriendHelped(friend, helped) {
  const U = friend.userData;
  U.helped = helped;
  for (const p of U.helpedParts) p.visible = helped;
  for (const p of U.poorlyParts) p.visible = !helped;
}

/** Idle animation for a friend: droopy when poorly, bouncy when helped. */
function animateFriend(friend, t, dt, lively = 1) {
  const U = friend.userData;
  const ph = U.phase;
  const happy = U.helped;
  let hoverTarget = 0;
  if (happy) {
    const hop = Math.abs(Math.sin(t * 5 + ph)) * 0.22 * lively;
    friend.position.y = U.baseY + hop;
    U.head.rotation.z = Math.sin(t * 2.5 + ph) * 0.12;
    U.head.rotation.x = 0;
    if (U.kind === "bat" || U.kind === "owl") hoverTarget = U.kind === "bat" ? 1.1 : 0.7;
  } else {
    friend.position.y = U.baseY;
    U.head.rotation.x = 0.22 + Math.sin(t * 1.2 + ph) * 0.03;
    U.head.rotation.z = Math.sin(t * 0.8 + ph) * 0.05;
    if (U.kind === "hedgehog") friend.rotation.z = Math.sin(t * 38) * 0.025;           // shivering
  }
  if (happy || U.kind !== "hedgehog") friend.rotation.z = 0;
  U.hover += (hoverTarget - U.hover) * Math.min(1, dt * 2);
  friend.position.y += U.hover;
  for (const w of U.wings) {
    const s = w.userData.side;
    if (U.kind === "bat") {
      // shy bats hide behind their wings
      w.rotation.y = happy ? s * (0.2 + Math.sin(t * 14 + ph) * 0.6) : -s * (1.75 + Math.sin(t * 1.3 + ph) * 0.12);
      w.rotation.z = happy ? 0 : s * 0.5;
    } else if (U.kind === "owl") {
      w.rotation.z = happy ? s * (0.9 + Math.sin(t * 12 + ph) * 0.7) : (s > 0 ? 0 : Math.sin(t * 2) * 0.08);
    } else {
      w.rotation.y = s * (0.3 + Math.sin(t * (happy ? 9 : 2) + ph) * (happy ? 0.5 : 0.1));
    }
  }
  if (U.tail) U.tail.rotation.y = Math.sin(t * (happy ? 5 : 1.5) + ph) * 0.3;
  if (U.glow) U.glow.material.opacity = 0.32 + Math.sin(t * 3) * 0.1;
}

/* ------------------------------ cauldron ------------------------------ */

/** The potion's surface: a slow glowing swirl (bright enough for the bloom pass to catch). */
function brewMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: { uColor: { value: new THREE.Color(0x8cf0a8) }, uTime: TIME },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `uniform vec3 uColor; uniform float uTime; varying vec2 vUv;
      float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float noise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
        return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y); }
      void main(){
        vec2 p = vUv - 0.5;
        float r = length(p) * 2.0, a = atan(p.y, p.x);
        float swirl = a + r * 3.5 - uTime * 0.9;
        float n = noise(vec2(cos(swirl), sin(swirl)) * 1.8 + r * 3.0 - uTime * 0.25);
        float bands = 0.5 + 0.5 * sin(swirl * 3.0 + n * 5.0);
        float bubbles = smoothstep(0.82, 0.95, noise(p * 22.0 + vec2(0.0, uTime * 0.6)));
        vec3 c = uColor * mix(0.75, 2.1, bands * (1.0 - r * 0.45)) + vec3(1.0) * (pow(bands, 7.0) * 0.6 * (1.0 - r) + bubbles * 0.7);
        gl_FragColor = vec4(c, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
}

function buildCauldron() {
  const g = new THREE.Group();
  const iron = K.metal(0x4b4266), brass = K.metal(0x8f7fb8);
  // the pot: turned on the lathe, with a flared lip and a hollow inside
  g.add(lathe(iron, [[0, 0.08], [0.3, 0.09], [0.6, 0.2], [0.78, 0.46], [0.83, 0.74], [0.75, 1.02], [0.64, 1.15], [0.66, 1.2], [0.76, 1.23], [0.77, 1.29], [0.66, 1.31], [0.59, 1.25], [0.58, 1.05]], 32));
  for (let i = 0; i < 12; i++) {                                              // rivets round the rim
    const a = (i / 12) * Math.PI * 2;
    g.add(ball(brass, 0.035, Math.cos(a) * 0.75, 1.26, Math.sin(a) * 0.75, 1, 0.8, 1));
  }
  for (let i = 0; i < 3; i++) {                                               // stubby feet
    const a = i * 2.094 + 0.5;
    const f = lathe(iron, [[0, 0], [0.1, 0], [0.13, 0.04], [0.11, 0.16], [0.17, 0.3], [0, 0.34]], 10, "potfoot");
    f.position.set(Math.cos(a) * 0.5, 0, Math.sin(a) * 0.5);
    g.add(f);
  }
  for (const s of [-1, 1]) {                                                  // ring handles
    const h = torus(brass, 0.15, 0.032, s * 0.86, 0.92, 0);
    h.rotation.y = Math.PI / 2;
    h.rotation.x = s * 0.25;
    g.add(h);
    g.add(ball(brass, 0.06, s * 0.8, 1.04, 0));
  }
  fuse(g);
  const brewMat = brewMaterial();
  const brew = new THREE.Mesh(cached("disc", () => new THREE.CircleGeometry(1, 32)), brewMat);
  brew.scale.setScalar(0.6);
  brew.rotation.x = -Math.PI / 2;
  brew.position.y = 1.2;
  g.add(brew);
  const glow = glowSprite(0x8cf0a8, 2.6, 0.22);
  glow.position.y = 1.5;
  g.add(glow);
  // a cosy little fire
  const flames = [];
  for (let i = 0; i < 6; i++) {
    const a = i * 1.047;
    const f = lathe(shiny(i % 2 ? 0xffb14d : 0xff7a3d, 2.6), FLAME, 8, "flame");
    f.castShadow = false;
    f.receiveShadow = false;
    f.scale.set(0.2, 0.36, 0.2);
    f.position.set(Math.cos(a) * 0.52, 0.05, Math.sin(a) * 0.52);
    g.add(f);
    flames.push(f);
  }
  for (let i = 0; i < 4; i++) {
    const log = cyl(K.wood(0x8a5a3c), 0.075, 0.085, 1.0, 0, 0.07, 0, 8);
    log.rotation.set(Math.PI / 2, 0, i * 0.8);
    g.add(log);
  }
  g.userData = { brew, brewMat, glow, flames, color: new THREE.Color(0x8cf0a8), toColor: new THREE.Color(0x8cf0a8), t: 0 };
  return g;
}
function setBrewColor(cauldron, hex, snap = false) {
  cauldron.userData.toColor.set(hex);
  if (snap) cauldron.userData.color.set(hex);
}
function animateCauldron(c, t, dt, active = true) {
  const U = c.userData;
  U.color.lerp(U.toColor, Math.min(1, dt * 3));
  U.brewMat.uniforms.uColor.value.copy(U.color);
  U.glow.material.color.copy(U.color);
  U.glow.material.opacity = 0.2 + Math.sin(t * 2.3) * 0.05;
  U.flames.forEach((f, i) => {
    f.scale.y = 0.36 * (0.8 + Math.sin(t * 9 + i * 2) * 0.3);
    f.rotation.z = Math.sin(t * 7 + i) * 0.12;
  });
  // the potion lights up whoever is standing near it
  c.getWorldPosition(potLight.position);
  potLight.position.y += 1.9;
  potLight.position.z += 0.7;
  potLight.color.copy(U.color);
  U.t -= dt;
  if (active && U.t <= 0 && c.visible) {
    U.t = rand(0.12, 0.3);
    c.getWorldPosition(tmpV2);
    emit({
      pos: new THREE.Vector3(tmpV2.x + rand(-0.45, 0.45), tmpV2.y + 1.3, tmpV2.z + rand(-0.3, 0.3)),
      vel: new THREE.Vector3(rand(-0.1, 0.1), rand(0.5, 1.1), 0), color: U.color.getHex(),
      size: rand(0.14, 0.3), life: rand(0.8, 1.5), tex: ringTex, grow: 0.5,
    });
    if (Math.random() < 0.3) {                                                // an ember from the fire
      emit({ pos: new THREE.Vector3(tmpV2.x + rand(-0.6, 0.6), tmpV2.y + 0.25, tmpV2.z + rand(-0.2, 0.6)),
             vel: new THREE.Vector3(rand(-0.2, 0.2), rand(0.6, 1.2), 0), color: 0xffa64d, size: rand(0.06, 0.12), life: rand(0.6, 1.1), tex: dotTex, add: true });
    }
  }
}

function buildBottle(hex) {
  const g = new THREE.Group();
  const glass = new THREE.MeshPhysicalMaterial({
    color: hex, emissive: hex, emissiveIntensity: 1.5, roughness: 0.06, clearcoat: 1, clearcoatRoughness: 0.04, envMapIntensity: 1.6,
  });
  glass.userData.own = true;
  const flask = lathe(glass, [[0, -0.25], [0.18, -0.24], [0.27, -0.14], [0.28, 0.02], [0.22, 0.16], [0.11, 0.25], [0.09, 0.38], [0.125, 0.4], [0.125, 0.44], [0, 0.44]], 20);
  g.add(flask);
  g.add(cyl(K.wood(0xc9955f), 0.1, 0.085, 0.12, 0, 0.49, 0, 10));
  const tag = torus(K.fabric(0xfff3e0), 0.1, 0.014, 0, 0.36, 0);
  tag.rotation.x = Math.PI / 2;
  g.add(tag);
  fuse(g);
  const glow = glowSprite(hex, 1.5, 0.35);
  g.add(glow);
  return g;
}

/* ------------------------------ lost stars ----------------------------- */

const STAR_COLORS = [
  { hex: 0xffd34d, css: "#ffcf4a" }, { hex: 0xff9ccf, css: "#ff9ccf" }, { hex: 0x8fd3ff, css: "#8fd3ff" },
  { hex: 0x8ff0c0, css: "#7fe0b0" }, { hex: 0xc9a8ff, css: "#c9a8ff" },
];
function buildStar(colorIndex) {
  const col = STAR_COLORS[colorIndex];
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: col.hex, emissive: col.hex, emissiveIntensity: 1.0, roughness: 0.35, envMapIntensity: 0.6 });
  mat.userData.own = true;
  const body = new THREE.Mesh(STAR_GEO, mat);
  body.scale.setScalar(0.42);
  body.castShadow = true;
  g.add(body);
  // a sleepy little face
  eye(g, -0.11, 0.0, 0.14, 0.05);
  eye(g, 0.11, 0.0, 0.14, 0.05);
  g.add(ball(K.skin(0xff8fa8), 0.045, -0.2, -0.08, 0.12, 1, 0.7, 0.5));
  g.add(ball(K.skin(0xff8fa8), 0.045, 0.2, -0.08, 0.12, 1, 0.7, 0.5));
  smile(g, 0.045, 0, -0.09, 0.15);
  fuse(g);
  const glow = glowSprite(col.hex, 1.8, 0.3);
  glow.position.z = -0.2;
  g.add(glow);
  g.userData = { mat, glow, body };
  return g;
}
