"use strict";
/* =====================================================================
   Models: the little witch, her cat, the friends, the cauldron, stars
   Everything is built from simple shapes in code — no image files.
   ===================================================================== */

/* ------------------------------ wardrobe ------------------------------ */
// `stars` is how many level stars are needed before a look can be chosen.

const SKINS = [0xffe0c8, 0xf5c9a0, 0xc98f62, 0x8d5a3b];
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

/* -------------------------------- cat -------------------------------- */

function buildCat(look) {
  const g = new THREE.Group();
  const fur = look.fur, belly = look.belly, pink = 0xff9fb5;
  g.add(ball(fur, 0.3, 0, 0.3, 0, 1, 1, 0.95));
  if (belly !== fur) g.add(ball(belly, 0.2, 0, 0.27, 0.16, 1, 1.05, 0.6));
  g.add(ball(belly, 0.085, -0.13, 0.05, 0.2, 1, 0.6, 1.2));
  g.add(ball(belly, 0.085, 0.13, 0.05, 0.2, 1, 0.6, 1.2));
  const head = new THREE.Group();
  head.position.set(0, 0.74, 0.03);
  g.add(head);
  head.add(ball(fur, 0.3, 0, 0, 0, 1.08, 0.95, 0.95));
  for (const s of [-1, 1]) {
    head.add(cone(fur, 0.12, 0.24, s * 0.19, 0.28, 0, 0, -s * 0.3, 10));
    head.add(cone(pink, 0.06, 0.13, s * 0.19, 0.26, 0.05, 0, -s * 0.3, 10));
    const e = ball(0xd8ff7a, 0.07, s * 0.12, 0.02, 0.24, 1, 1.1, 0.6);
    head.add(e);
    head.add(ball(DARK, 0.035, s * 0.12, 0.02, 0.285, 0.7, 1.3, 0.6));
    head.add(ball(pink, 0.04, s * 0.2, -0.09, 0.22, 1, 0.7, 0.5));
  }
  if (belly !== fur) head.add(ball(belly, 0.12, 0, -0.09, 0.2, 1.2, 0.8, 0.8));
  head.add(ball(pink, 0.03, 0, -0.05, 0.3));
  const tail = new THREE.Group();
  tail.position.set(0.05, 0.2, -0.25);
  for (let i = 0; i < 6; i++) {
    const a = i * 0.32;
    tail.add(ball(i === 5 && belly !== fur ? belly : fur, 0.07 - i * 0.004, 0, Math.sin(a) * 0.5, -Math.cos(a) * 0.12 - i * 0.03));
  }
  g.add(tail);
  outline(g, 1.08);
  g.userData = { head, tail };
  return g;
}

/* ------------------------------- witch ------------------------------- */

const WING_GEO = (() => {
  // a scalloped bat/dragon wing, reused for both
  const s = new THREE.Shape();
  s.moveTo(0, 0);
  s.quadraticCurveTo(0.45, 0.75, 1.1, 0.55);
  s.quadraticCurveTo(0.95, 0.3, 1.0, 0.05);
  s.quadraticCurveTo(0.8, 0.2, 0.68, -0.1);
  s.quadraticCurveTo(0.5, 0.1, 0.36, -0.2);
  s.quadraticCurveTo(0.2, 0, 0, 0);
  return new THREE.ShapeGeometry(s, 10);
})();

function buildWitch(look, name) {
  const skin = SKINS[look.skin] ?? SKINS[0];
  const hair = (HAIRS[look.hair] ?? HAIRS[0]).c;
  const outfit = OUTFITS[look.outfit] ?? OUTFITS[0];
  const catLook = CATS[look.cat] ?? CATS[0];

  const root = new THREE.Group();

  /* broom — lies along x, bristles at the back */
  const broom = new THREE.Group();
  const stick = cyl(0xb98556, 0.05, 0.05, 2.5, 0.25, 0, 0, 10);
  stick.rotation.z = Math.PI / 2;
  broom.add(stick);
  const bristles = cone(0xf2c46a, 0.36, 1.0, -1.35, 0, 0, 0, -Math.PI / 2, 14);
  broom.add(bristles);
  const b2 = cone(0xe0aa4e, 0.26, 0.9, -1.45, 0.02, 0.03, 0, -Math.PI / 2, 12);
  broom.add(b2);
  const band = cyl(outfit.trim, 0.12, 0.12, 0.14, -0.92, 0, 0, 12);
  band.rotation.z = Math.PI / 2;
  broom.add(band);
  root.add(broom);

  /* rider — sits side-saddle, turned a little towards us */
  const rider = new THREE.Group();
  rider.position.set(0.15, 0.04, 0);
  rider.rotation.y = 0.75;
  root.add(rider);

  const body = new THREE.Group();
  rider.add(body);
  const dress = cone(outfit.dress, 0.5, 0.86, 0, 0.36, 0, 0, 0, 20);
  body.add(dress);
  body.add(ball(outfit.dress, 0.25, 0, 0.5, 0, 1, 1.05, 0.95));
  const hem = torus(outfit.trim, 0.44, 0.045, 0, 0.0, 0);
  hem.rotation.x = Math.PI / 2;
  body.add(hem);
  // stripy stockings and boots dangling in front
  for (const s of [-1, 1]) {
    const leg = new THREE.Group();
    leg.position.set(s * 0.15, 0.0, 0.26);
    leg.rotation.x = 0.35;
    for (let i = 0; i < 4; i++) leg.add(cyl(i % 2 ? 0xffffff : outfit.hat, 0.075, 0.075, 0.1, 0, -0.08 - i * 0.1, 0, 10));
    leg.add(ball(DARK, 0.12, 0, -0.5, 0.05, 0.9, 0.8, 1.4));
    leg.userData.side = s;
    body.add(leg);
    (body.userData.legs || (body.userData.legs = [])).push(leg);
  }
  // a little cape
  const cape = cone(outfit.hat, 0.46, 0.8, 0, 0.38, -0.12, 0.12, 0, 16);
  body.add(cape);
  // bow at the neck
  body.add(ball(outfit.trim, 0.07, -0.08, 0.7, 0.24, 1.2, 0.8, 0.6));
  body.add(ball(outfit.trim, 0.07, 0.08, 0.7, 0.24, 1.2, 0.8, 0.6));

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
    t.add(ball(outfit.trim, 0.075, 0, 0.05, 0));
    t.add(ball(hair, 0.17, s * 0.06, -0.14, 0, 1, 1.25, 1));
    t.add(ball(hair, 0.13, s * 0.1, -0.38, 0, 1, 1.2, 1));
    t.add(ball(hair, 0.085, s * 0.12, -0.56, 0));
    t.userData.side = s;
    head.add(t);
    tails.push(t);
  }
  eye(head, -0.17, -0.02, 0.4, 0.078);
  eye(head, 0.17, -0.02, 0.4, 0.078);
  head.add(ball(0xff9fb5, 0.075, -0.3, -0.15, 0.32, 1, 0.65, 0.4));
  head.add(ball(0xff9fb5, 0.075, 0.3, -0.15, 0.32, 1, 0.65, 0.4));
  smile(head, 0.075, 0, -0.14, 0.44);

  /* hat */
  const hat = new THREE.Group();
  hat.position.set(0, 0.3, -0.03);
  hat.rotation.set(-0.16, 0, 0.1);
  head.add(hat);
  hat.add(cyl(outfit.hat, 0.78, 0.8, 0.06, 0, 0, 0, 28));
  hat.add(cone(outfit.hat, 0.43, 0.75, 0, 0.4, 0, 0, 0, 24));
  const tip = new THREE.Group();
  tip.position.set(0, 0.62, 0);
  tip.rotation.z = -0.75;
  tip.add(cone(outfit.hat, 0.2, 0.5, 0, 0.2, 0, 0, 0, 16));
  tip.add(ball(outfit.trim, 0.09, 0, 0.47, 0));
  hat.add(tip);
  if (outfit.rainbow) {
    RAINBOW.forEach((c, i) => hat.add(cyl(c, 0.445 - i * 0.045, 0.47 - i * 0.045, 0.085, 0, 0.07 + i * 0.085, 0, 24)));
  } else {
    hat.add(cyl(outfit.trim, 0.425, 0.45, 0.13, 0, 0.1, 0, 24));
  }
  const badge = new THREE.Mesh(STAR_GEO, shiny(outfit.starry ? 0xfff7c2 : 0xffd34d, 0.4));
  badge.scale.setScalar(0.09);
  badge.position.set(0, 0.13, 0.46);
  badge.castShadow = true;
  hat.add(badge);
  if (outfit.starry) {
    for (let i = 0; i < 7; i++) {
      const a = i * 0.9, y = 0.25 + (i % 4) * 0.12, r = 0.43 * (1 - (y - 0.03) / 0.76) + 0.02;
      const st = new THREE.Mesh(SPHERE, shiny(0xfff7c2, 0.9));
      st.scale.setScalar(0.035);
      st.position.set(Math.cos(a) * r, y, Math.sin(a) * r);
      st.userData.noOutline = true;
      hat.add(st);
    }
  }

  /* arms: one holds the broom, one waves the wand */
  const holdArm = ball(outfit.dress, 0.095, -0.3, 0.4, 0.14, 1, 1.9, 1);
  holdArm.rotation.z = -0.5;
  body.add(holdArm);
  body.add(ball(skin, 0.085, -0.42, 0.2, 0.2));
  const arm = new THREE.Group();
  arm.position.set(0.28, 0.58, 0.1);
  body.add(arm);
  const sleeve = ball(outfit.dress, 0.095, 0.14, 0.02, 0.06, 1.9, 1, 1);
  arm.add(sleeve);
  arm.add(ball(skin, 0.085, 0.3, 0.04, 0.1));
  const wand = cyl(0x6b4a3a, 0.025, 0.03, 0.62, 0.44, 0.3, 0.14, 8);
  wand.rotation.z = -0.5;
  arm.add(wand);
  const star = new THREE.Mesh(STAR_GEO, shiny(0xffd34d, 0.55));
  star.scale.setScalar(0.15);
  star.position.set(0.6, 0.6, 0.14);
  star.castShadow = true;
  arm.add(star);
  const wandTip = new THREE.Object3D();
  wandTip.position.copy(star.position);
  arm.add(wandTip);
  const wandGlow = glowSprite(0xffe9a0, 0.9, 0.5);
  wandGlow.position.copy(star.position);
  arm.add(wandGlow);

  outline(root);

  /* the cat rides on the bristles */
  const cat = buildCat(catLook);
  cat.scale.setScalar(0.72);
  cat.position.set(-1.0, 0.1, 0);
  cat.rotation.y = 0.75;
  root.add(cat);

  root.userData = { rider, body, head, hat, tip, arm, star, wandTip, wandGlow, tails, legs: body.userData.legs, cat, broom, name };
  return root;
}

/* ------------------------------ friends ------------------------------ */
/* Each friend has a "poorly" look and a "helped" look; setHelped() swaps them. */

const FRIEND_INFO = {
  mouse:    { fur: 0xd8cfe6, belly: 0xffffff, emoji: "🐭" },
  hedgehog: { fur: 0xf3d9b5, belly: 0xfff0dc, emoji: "🦔" },
  frog:     { fur: 0x8ed46a, belly: 0xe8f7c4, emoji: "🐸" },
  bat:      { fur: 0x9d86e8, belly: 0xe6dcff, emoji: "🦇" },
  owl:      { fur: 0xf2f5ff, belly: 0xffffff, emoji: "🦉" },
  dragon:   { fur: 0x6fd3a2, belly: 0xfff2c9, emoji: "🐲" },
};

function buildFriend(kind) {
  const g = new THREE.Group();
  const P = FRIEND_INFO[kind];
  const pink = 0xff9fb5;
  const helpedParts = [], poorlyParts = [];
  const U = { kind, helpedParts, poorlyParts, wings: [], phase: rand(0, 6), helped: false, hover: 0, baseY: 0 };

  g.add(ball(P.fur, 0.34, 0, 0.34, 0, 1, 0.95, 0.9));
  g.add(ball(P.belly, 0.22, 0, 0.32, 0.17, 1, 1, 0.6));
  const footC = kind === "owl" ? 0xffb14d : P.fur;
  g.add(ball(footC, 0.1, -0.14, 0.06, 0.13, 1, 0.6, 1.3));
  g.add(ball(footC, 0.1, 0.14, 0.06, 0.13, 1, 0.6, 1.3));
  const head = new THREE.Group();
  head.position.set(0, 0.82, 0.04);
  g.add(head);
  U.head = head;
  const wide = kind === "frog";
  head.add(ball(P.fur, wide ? 0.3 : 0.32, 0, 0, 0, wide ? 1.25 : 1, wide ? 0.8 : 1, 1));

  const eyes = (y = 0.04, z = 0.27, spread = 0.12, r = 0.058) => { eye(head, -spread, y, z, r); eye(head, spread, y, z, r); };
  const cheeks = (y = -0.06) => {
    head.add(ball(pink, 0.05, -0.2, y, 0.23, 1, 0.7, 0.5));
    head.add(ball(pink, 0.05, 0.2, y, 0.23, 1, 0.7, 0.5));
  };

  switch (kind) {
    case "mouse": {
      for (const s of [-1, 1]) {
        head.add(ball(P.fur, 0.19, s * 0.27, 0.27, -0.02, 1, 1, 0.35));
        head.add(ball(pink, 0.12, s * 0.27, 0.27, 0.03, 1, 1, 0.3));
      }
      head.add(ball(P.belly, 0.12, 0, -0.07, 0.24, 1, 0.8, 0.9));
      head.add(ball(pink, 0.04, 0, -0.03, 0.36));
      eyes(); cheeks(-0.08);
      for (let i = 0; i < 7; i++) g.add(ball(pink, 0.035, -0.1 - i * 0.02, 0.1 + Math.sin(i * 0.5) * 0.12, -0.3 - i * 0.07));
      // a tiny glowing lantern once Pip has the Glow Potion
      const lantern = new THREE.Group();
      lantern.position.set(0.4, 0.42, 0.2);
      lantern.add(ball(P.fur, 0.07, -0.08, 0.02, -0.02));
      const lamp = new THREE.Mesh(SPHERE, shiny(0xffe27a, 1));
      lamp.scale.setScalar(0.12);
      lantern.add(lamp);
      lantern.add(cyl(0x6b4a3a, 0.06, 0.08, 0.04, 0, 0.12, 0, 10));
      lantern.add(cyl(0x6b4a3a, 0.08, 0.06, 0.04, 0, -0.12, 0, 10));
      const glow = glowSprite(0xffe27a, 1.5, 0.55);
      lantern.add(glow);
      g.add(lantern);
      helpedParts.push(lantern);
      U.glow = glow;
      break;
    }
    case "hedgehog": {
      for (let i = 0; i < 26; i++) {
        const a = rand(-2.4, 2.4), b = rand(0.1, 1.4);
        const dir = new THREE.Vector3(Math.sin(a) * Math.sin(b), Math.cos(b), -Math.abs(Math.cos(a)) * Math.sin(b) - 0.2).normalize();
        const spike = cone(0x9a6b4b, 0.07, 0.24, dir.x * 0.32, 0.55 + dir.y * 0.38, -0.05 + dir.z * 0.32, 0, 0, 6);
        spike.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
        g.add(spike);
      }
      head.add(ball(P.fur, 0.11, 0, -0.06, 0.26, 1, 0.8, 1));
      head.add(ball(DARK, 0.04, 0, -0.04, 0.36));
      eyes(0.06, 0.26); cheeks(-0.04);
      // a stripy scarf and a bobble hat once Bramble has the Cosy Potion
      const scarf = new THREE.Group();
      const wrap = torus(0xff6f7d, 0.27, 0.07, 0, 0.6, 0.03);
      wrap.rotation.x = Math.PI / 2;
      scarf.add(wrap);
      scarf.add(ball(0xff6f7d, 0.075, 0.16, 0.48, 0.25, 1, 1.9, 0.7));
      scarf.add(ball(0xffffff, 0.078, 0.16, 0.4, 0.26, 1, 0.5, 0.7));
      const hatB = dome(0x6fc8ff, 0.2, 0, 1.08, 0.04);
      scarf.add(hatB);
      scarf.add(ball(0xffffff, 0.07, 0, 1.3, 0.04));
      const brim = torus(0xffffff, 0.2, 0.04, 0, 1.08, 0.04);
      brim.rotation.x = Math.PI / 2;
      scarf.add(brim);
      g.add(scarf);
      helpedParts.push(scarf);
      break;
    }
    case "frog": {
      for (const s of [-1, 1]) {
        head.add(ball(P.fur, 0.12, s * 0.17, 0.21, 0.06));
        head.add(ball(0xffffff, 0.08, s * 0.17, 0.23, 0.13));
        eye(head, s * 0.17, 0.23, 0.2, 0.045);
      }
      smile(head, 0.12, 0, 0, 0.27);
      cheeks(-0.04);
      // a pink water-lily hat
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        const p = ball(0xff9ccf, 0.07, Math.cos(a) * 0.07, 0.29, -0.06 + Math.sin(a) * 0.07, 1, 0.6, 1);
        head.add(p);
      }
      head.add(ball(0xffd166, 0.05, 0, 0.31, -0.06));
      break;
    }
    case "bat": {
      for (const s of [-1, 1]) {
        head.add(cone(P.fur, 0.14, 0.34, s * 0.2, 0.33, 0, 0, -s * 0.3, 10));
        head.add(cone(pink, 0.07, 0.2, s * 0.2, 0.31, 0.05, 0, -s * 0.3, 10));
      }
      head.add(ball(DARK, 0.035, 0, -0.03, 0.31));
      head.add(cone(0xffffff, 0.022, 0.06, -0.05, -0.13, 0.28, Math.PI, 0, 6));
      head.add(cone(0xffffff, 0.022, 0.06, 0.05, -0.13, 0.28, Math.PI, 0, 6));
      eyes(0.05, 0.27, 0.13, 0.065); cheeks(-0.06);
      break;
    }
    case "owl": {
      for (const s of [-1, 1]) {
        head.add(ball(0xdfe6ff, 0.13, s * 0.13, 0.05, 0.21, 1, 1, 0.5));
        eye(head, s * 0.13, 0.05, 0.27, 0.062);
        head.add(cone(P.fur, 0.07, 0.2, s * 0.2, 0.32, 0, 0, -s * 0.4, 8));
      }
      head.add(cone(0xffb14d, 0.045, 0.1, 0, -0.07, 0.3, Math.PI, 0, 8));
      for (let i = 0; i < 5; i++) g.add(ball(0xb9c6ee, 0.035, (i - 2) * 0.08, 0.3 + (i % 2) * 0.1, 0.3));
      for (const s of [-1, 1]) {
        const w = new THREE.Group();
        w.position.set(s * 0.3, 0.5, 0);
        w.add(ball(P.fur, 0.16, s * 0.03, -0.14, 0, 0.45, 1.25, 1));
        w.userData.side = s;
        g.add(w);
        U.wings.push(w);
      }
      // a bandage on the sore wing until the Mending Potion is ready
      const bandage = new THREE.Group();
      bandage.position.set(0.34, 0.36, 0.02);
      const wrap = torus(0xffffff, 0.12, 0.045, 0, 0, 0);
      wrap.rotation.x = Math.PI / 2;
      wrap.scale.set(0.09, 0.17, 0.12);
      bandage.add(wrap);
      bandage.add(ball(0xff6f7d, 0.03, 0.07, 0, 0.1));
      g.add(bandage);
      poorlyParts.push(bandage);
      break;
    }
    case "dragon": {
      head.add(ball(P.fur, 0.2, 0, -0.08, 0.2, 1.15, 0.8, 1));                 // snout
      head.add(ball(DARK, 0.022, -0.07, -0.03, 0.39));
      head.add(ball(DARK, 0.022, 0.07, -0.03, 0.39));
      smile(head, 0.07, 0, -0.14, 0.36);
      for (const s of [-1, 1]) {
        head.add(cone(0xfff2c9, 0.06, 0.2, s * 0.17, 0.3, -0.05, -0.2, -s * 0.3, 8));
        head.add(ball(P.fur, 0.08, s * 0.31, 0.1, -0.02, 0.5, 1, 1));
      }
      eyes(0.1, 0.25, 0.14, 0.066); cheeks(-0.02);
      for (let i = 0; i < 4; i++) g.add(cone(0xffa64d, 0.07, 0.16, 0, 1.12 - i * 0.24, -0.26 - (i === 0 ? 0 : 0.06), -0.6, 0, 6));
      const tail = new THREE.Group();
      tail.position.set(0, 0.2, -0.28);
      for (let i = 0; i < 6; i++) tail.add(ball(P.fur, 0.13 - i * 0.015, Math.sin(i * 0.5) * 0.14, 0.02 + i * 0.015, -i * 0.13));
      tail.add(cone(0xffa64d, 0.1, 0.2, Math.sin(3) * 0.14 + 0.02, 0.12, -0.84, -1.3, 0, 4));
      g.add(tail);
      U.tail = tail;
      const wingMat = toon(0xffb3c7).clone();
      wingMat.side = THREE.DoubleSide;
      for (const s of [-1, 1]) {
        const w = new THREE.Group();
        w.position.set(s * 0.2, 0.55, -0.22);
        const m = new THREE.Mesh(WING_GEO, wingMat);
        m.scale.set(s * 0.5, 0.5, 0.5);
        m.castShadow = true;
        m.userData.noOutline = true;
        w.add(m);
        w.userData.side = s;
        g.add(w);
        U.wings.push(w);
      }
      // a sore red nose while Ember has a cold
      const nose = ball(0xff5a6a, 0.085, 0, -0.03, 0.4);
      nose.userData.keep = true;          // shown and hidden on its own
      head.add(nose);
      poorlyParts.push(nose);
      break;
    }
  }

  outline(g, 1.08);

  if (kind === "bat") {
    const wingMat = toon(0x6f58c9).clone();
    wingMat.side = THREE.DoubleSide;
    for (const s of [-1, 1]) {
      const w = new THREE.Group();
      w.position.set(s * 0.22, 0.5, -0.05);
      const m = new THREE.Mesh(WING_GEO, wingMat);
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
  if (U.glow) U.glow.material.opacity = 0.45 + Math.sin(t * 3) * 0.12;
}

/* ------------------------------ cauldron ------------------------------ */

function buildCauldron() {
  const g = new THREE.Group();
  const iron = 0x4a3f63;
  const pot = ball(iron, 0.8, 0, 0.72, 0, 1, 0.82, 1);
  g.add(pot);
  const rim = torus(0x5d5080, 0.66, 0.09, 0, 1.22, 0);
  rim.rotation.x = Math.PI / 2;
  g.add(rim);
  for (let i = 0; i < 3; i++) {
    const a = i * 2.094 + 0.5;
    g.add(ball(iron, 0.14, Math.cos(a) * 0.5, 0.1, Math.sin(a) * 0.5, 1, 1.2, 1));
  }
  for (const s of [-1, 1]) {
    const h = torus(0x5d5080, 0.14, 0.035, s * 0.82, 0.95, 0);
    h.rotation.y = Math.PI / 2;
    g.add(h);
  }
  outline(g, 1.05);
  const brewMat = new THREE.MeshToonMaterial({ color: 0x8cf0a8, gradientMap, emissive: 0x8cf0a8, emissiveIntensity: 0.6 });
  const brew = new THREE.Mesh(cached("disc", () => new THREE.CircleGeometry(1, 32)), brewMat);
  brew.scale.setScalar(0.62);
  brew.rotation.x = -Math.PI / 2;
  brew.position.y = 1.24;
  g.add(brew);
  const glow = glowSprite(0x8cf0a8, 3.2, 0.45);
  glow.position.y = 1.5;
  g.add(glow);
  // a cosy little fire
  const flames = [];
  for (let i = 0; i < 5; i++) {
    const a = i * 1.257;
    const f = cone(shiny(i % 2 ? 0xffb14d : 0xff7a4d, 0.9), 0.13, 0.4, Math.cos(a) * 0.5, 0.2, Math.sin(a) * 0.5, 0, 0, 8);
    f.castShadow = false;
    g.add(f);
    flames.push(f);
  }
  for (let i = 0; i < 4; i++) {
    const log = cyl(0x8a5a3c, 0.07, 0.07, 0.9, 0, 0.06, 0, 8);
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
  U.brewMat.color.copy(U.color);
  U.brewMat.emissive.copy(U.color);
  U.glow.material.color.copy(U.color);
  U.glow.material.opacity = 0.38 + Math.sin(t * 2.3) * 0.08;
  U.flames.forEach((f, i) => { f.scale.y = 0.4 * (0.8 + Math.sin(t * 9 + i * 2) * 0.3); });
  U.t -= dt;
  if (active && U.t <= 0 && c.visible) {
    U.t = rand(0.12, 0.3);
    c.getWorldPosition(tmpV2);
    emit({
      pos: new THREE.Vector3(tmpV2.x + rand(-0.45, 0.45), tmpV2.y + 1.3, tmpV2.z + rand(-0.3, 0.3)),
      vel: new THREE.Vector3(rand(-0.1, 0.1), rand(0.5, 1.1), 0), color: U.color.getHex(),
      size: rand(0.14, 0.3), life: rand(0.8, 1.5), tex: ringTex, grow: 0.5,
    });
  }
}

function buildBottle(hex) {
  const g = new THREE.Group();
  const liquid = new THREE.MeshToonMaterial({ color: hex, gradientMap, emissive: hex, emissiveIntensity: 0.7 });
  liquid.userData.own = true;
  g.add(ball(liquid, 0.26, 0, 0, 0, 1, 0.95, 1));
  g.add(cyl(0xeaf6ff, 0.09, 0.11, 0.2, 0, 0.3, 0, 12));
  g.add(cyl(0xc9955f, 0.1, 0.09, 0.1, 0, 0.44, 0, 10));
  outline(g, 1.08);
  const glow = glowSprite(hex, 1.8, 0.6);
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
  const mat = new THREE.MeshToonMaterial({ color: col.hex, gradientMap, emissive: col.hex, emissiveIntensity: 0.45 });
  mat.userData.own = true;
  const body = new THREE.Mesh(STAR_GEO, mat);
  body.scale.setScalar(0.42);
  body.castShadow = true;
  g.add(body);
  // a sleepy little face
  eye(g, -0.11, 0.0, 0.14, 0.05);
  eye(g, 0.11, 0.0, 0.14, 0.05);
  g.add(ball(0xff8fa8, 0.045, -0.2, -0.08, 0.12, 1, 0.7, 0.5));
  g.add(ball(0xff8fa8, 0.045, 0.2, -0.08, 0.12, 1, 0.7, 0.5));
  smile(g, 0.045, 0, -0.09, 0.15);
  bake(g);
  const glow = glowSprite(col.hex, 2.1, 0.55);
  glow.position.z = -0.2;
  g.add(glow);
  g.userData = { mat, glow, body };
  return g;
}
