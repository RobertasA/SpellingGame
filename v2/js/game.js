"use strict";
/* =====================================================================
   Game: the witch, her friends, and the flying part of each level
   (read a word, type it, and the lost star flies home).
   ===================================================================== */

let mode = "title";     // title | map | flight | toBrew | brew | cutscene | complete | wardrobe | friends | story
let paused = false;
let worldSpeed = 0;
let clock = 0;
let currentPlace = 0;

/* ------------------------------- views -------------------------------- */

const halfTan = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
function kbdShift() { return $("kbd").classList.contains("active") ? 1 : 0; }
function flightView() {
  // keep the whole witch-to-star stretch visible, even on narrow screens
  const dist = clamp(8.2 / (halfTan * aspect()), 12, 34);
  const lift = kbdShift() * dist * 0.1;
  return [new THREE.Vector3(0, 2.6 + dist * 0.1 - lift * 0.4, dist), new THREE.Vector3(0, 2.2 - lift, -1)];
}
function panelShare() {
  const p = document.querySelector(".panel.active");
  return p ? (p.offsetHeight + 14) / window.innerHeight : 0;
}
function stageView() {
  // the cauldron scene sits in the top part of the screen, above whichever panel is open
  const share = panelShare();
  const dist = clamp(Math.max(4.6 / (halfTan * aspect()), 2.75 / (halfTan * (1 - share))), 11.5, 32);
  const drop = dist * halfTan * share;
  return [new THREE.Vector3(STAGE_X - 0.9, 2.0 + dist * 0.1, dist), new THREE.Vector3(STAGE_X - 0.9, 2.0 - drop, -0.4)];
}
function wardrobeView() {
  const dist = clamp(2.3 / (halfTan * aspect()), 7.5, 15);
  const drop = dist * halfTan * panelShare();
  return [new THREE.Vector3(0.5, 2.9, 2.2 + dist), new THREE.Vector3(-0.2, 2.25 - drop, 2.2)];
}
function friendsView() {
  const narrow = aspect() < 1;
  const dist = clamp((narrow ? 4.4 : 7.6) / (halfTan * aspect()), 10, 34);
  return [new THREE.Vector3(0, 2.4 + dist * (narrow ? 0.34 : 0.14), dist), new THREE.Vector3(0, narrow ? 0.4 : 1.3, narrow ? -0.5 : 0)];
}
function applyView(snap = false) {
  let v;
  if (mode === "map" || mode === "brew" || mode === "cutscene" || mode === "complete") v = stageView();
  else if (mode === "toBrew") v = flight.arriving ? stageView() : flightView();
  else if (mode === "wardrobe") v = wardrobeView();
  else if (mode === "friends") v = friendsView();
  else if (mode === "story") v = story.view ? story.view() : flightView();
  else v = flightView();
  setView(v[0], v[1], snap);
  const staged = stage.visible || mode === "map";
  moonY = staged ? 8.4 : mode === "wardrobe" ? 13 : 19;
  clearing.on = staged || mode === "friends" || mode === "wardrobe";
  clearing.x = mode === "friends" || mode === "wardrobe" ? 0 : STAGE_X + 0.4;
  clearing.half = mode === "friends" ? 9 : mode === "wardrobe" ? 3.5 : 5.4;
}

/* ------------------------------- witch -------------------------------- */

let witch = null;
const witchAnim = { celebrate: 0, hop: 0, cast: 0, trail: 0, override: null };
function rebuildWitch() {
  const old = witch;
  witch = buildWitch(save.look, save.name);
  if (old) { witch.position.copy(old.position); discard(old); }
  else witch.position.set(WITCH_X - 8, 3, 0.6);
  scene.add(witch);
}
function witchSpot() {
  if (witchAnim.override) return witchAnim.override;
  switch (mode) {
    case "map": case "brew": case "cutscene": case "complete": return tmpV.set(STAGE_X - 2.75, 1.25, 0.7);
    case "toBrew": return flight.arriving ? tmpV.set(STAGE_X - 2.75, 1.25, 0.7) : tmpV.set(WITCH_X, 1.9, 0.6);
    case "wardrobe": return tmpV.set(0, 1.7, 2.2);
    case "friends": return aspect() < 1 ? tmpV.set(0, 3.2, -7) : tmpV.set(0, 2.9, -4.5);
    default: return tmpV.set(WITCH_X, 1.9, 0.6);
  }
}
function updateWitch(dt) {
  const u = witch.userData;
  const spot = witchSpot();
  let x = spot.x, y = spot.y + Math.sin(clock * 2.2) * 0.14, z = spot.z;
  let roll = 0;
  if (witchAnim.celebrate > 0) {
    witchAnim.celebrate += dt;
    const k = witchAnim.celebrate;
    x += Math.sin(k * 3) * 1.4;
    y += Math.abs(Math.sin(k * 3)) * 1.3;
    roll = k < 2.1 ? easeInOut(clamp((k - 0.2) / 1.2, 0, 1)) * Math.PI * 2 : 0;
    if (k > 3.2) witchAnim.celebrate = 0;
  }
  if (witchAnim.hop > 0) {
    witchAnim.hop = Math.max(0, witchAnim.hop - dt * 2.2);
    y += Math.sin(witchAnim.hop * Math.PI) * 0.45;
  }
  const k = Math.min(1, dt * 4);
  witch.position.x += (x - witch.position.x) * k;
  witch.position.y += (y - witch.position.y) * k;
  witch.position.z += (z - witch.position.z) * k;
  witch.rotation.x = roll;
  witch.rotation.z = Math.sin(clock * 1.7) * 0.04 + clamp((y - witch.position.y) * 0.25, -0.3, 0.3);
  witch.rotation.y = mode === "wardrobe" ? Math.sin(clock * 0.8) * 0.5 - 0.3 : 0;

  const casting = (mode === "flight" && flight.target) || witchAnim.cast > 0;
  if (witchAnim.cast > 0) witchAnim.cast -= dt;
  u.head.rotation.z = Math.sin(clock * 1.3) * 0.08;
  u.head.rotation.x = Math.sin(clock * 0.9) * 0.04;
  for (const t of u.tails) t.rotation.z = t.userData.side * 0.12 + Math.sin(clock * 3 + t.userData.side) * 0.14 - worldSpeed * 0.03;
  for (const l of u.legs) l.rotation.x = 0.35 + Math.sin(clock * 4 + l.userData.side * 1.4) * 0.28;
  u.tip.rotation.z = -0.75 + Math.sin(clock * 2.6) * 0.16;
  const armTo = casting ? 0.55 + Math.sin(clock * 14) * 0.12 : Math.sin(clock * 3) * 0.12;
  u.arm.rotation.z += (armTo - u.arm.rotation.z) * Math.min(1, dt * 10);
  u.star.rotation.z += dt * 2;
  u.wandGlow.material.opacity = (casting ? 0.55 : 0.28) + Math.sin(clock * 6) * 0.08;
  u.wandTip.getWorldPosition(wandLight.position);                     // the wand casts a little warm light of its own
  wandLight.intensity += ((casting ? 10 : 4.5) - wandLight.intensity) * Math.min(1, dt * 8);
  u.cat.userData.tail.rotation.z = Math.sin(clock * 3) * 0.35;
  u.cat.userData.head.rotation.z = Math.sin(clock * 1.1) * 0.16;
  u.cat.position.y = 0.1 + Math.abs(Math.sin(clock * 2.2 + 1)) * 0.03;

  // sparkly trail from the broom
  witchAnim.trail -= dt;
  if (witchAnim.trail <= 0) {
    witchAnim.trail = 0.06;
    const colors = (TRAILS[save.look.trail] || TRAILS[0]).colors;
    tmpV2.set(-1.9, rand(-0.15, 0.15), rand(-0.15, 0.15));
    witch.localToWorld(tmpV2);
    emit({
      pos: tmpV2, vel: new THREE.Vector3(-worldSpeed * 0.9 - 0.5, rand(-0.3, 0.2), rand(-0.2, 0.2)),
      color: pick(colors), size: rand(0.16, 0.32), life: rand(0.6, 1.1),
    });
  }
}

/* --------------------- the cauldron and the friend -------------------- */

const stage = new THREE.Group();
stage.visible = false;
scene.add(stage);
const cauldron = buildCauldron();
cauldron.position.set(0, 0, -0.5);
stage.add(cauldron);
let stageFriend = null;
const POTION_COLORS = [0xffe27a, 0xff9a5a, 0x6fe0d0, 0xc58cff, 0x9fd8ff, 0xff8fc8];

function setStage(p) {
  discard(stageFriend);
  const place = PLACES[p];
  stageFriend = buildFriend(place.friend);
  stageFriend.scale.setScalar(1.45);
  stageFriend.position.set(2.05, 0, 0.5);
  stageFriend.rotation.y = -0.5;
  setFriendHelped(stageFriend, !!save.helped[place.id]);
  stage.add(stageFriend);
  stage.position.set(STAGE_X, 0, 0);
  setBrewColor(cauldron, save.helped[place.id] ? POTION_COLORS[p] : 0x8cf0a8, true);
}

/* Friends who have had their potion come along on every adventure. */
const crew = [];
function rebuildCrew() {
  for (const m of crew) discard(m);
  crew.length = 0;
  PLACES.forEach((place, p) => {
    if (!save.helped[place.id]) return;
    const m = buildFriend(place.friend);
    setFriendHelped(m, true);
    m.userData.place = p;
    m.userData.to = new THREE.Vector3();
    m.position.set(-14, 0, 2.5);
    scene.add(m);
    crew.push(m);
  });
}
function layoutCrew() {
  const staged = mode === "map" || mode === "brew" || mode === "cutscene" || mode === "complete" || (mode === "toBrew" && flight.arriving);
  const shown = crew.filter(m => !(staged && m.userData.place === currentPlace));
  crew.forEach(m => { m.visible = shown.includes(m) && mode !== "friends" && mode !== "wardrobe" && mode !== "story"; });
  shown.forEach((m, i) => {
    // the audience gathers behind the witch, out of the way of the friend being helped
    if (staged) m.userData.to.set(STAGE_X - 4.3 - Math.floor(i / 3) * 1.15 - (i % 3 === 1 ? 0.35 : 0), 0, [1.3, -0.3, -1.9][i % 3]);
    else m.userData.to.set(WITCH_X + 2.2 - Math.floor(i / 2) * 1.45 - (i % 2) * 0.5, 0, i % 2 ? 3.6 : 2.3);
  });
}
function updateCrew(dt) {
  const lively = mode === "complete" || mode === "cutscene" || witchAnim.celebrate > 0 ? 1.6 : (worldSpeed > 0.1 || mode === "title" ? 0.9 : 0.5);
  for (const m of crew) {
    if (!m.visible) continue;
    m.position.x += (m.userData.to.x - m.position.x) * Math.min(1, dt * 2.5);
    m.position.z += (m.userData.to.z - m.position.z) * Math.min(1, dt * 2.5);
    m.rotation.y = mode === "flight" || mode === "title" ? 0.85 : 0.7;
    animateFriend(m, clock, dt, lively);
  }
}

/* ------------------------------- words -------------------------------- */

/** HTML for a word with sound buttons; `cls(i)` gives the class for letter i. */
function wordHTML(w, cls, typed = -1) {
  let i = 0;
  const gs = w.graphemes;
  const one = (g, extra) => {
    const start = i;
    let s = "";
    for (const ch of g.t) { s += `<i class="${cls(i)}">${ch}</i>`; i++; }
    return `<span class="g${g.t.length > 1 ? " m" : ""}${extra}${typed >= start + g.t.length ? " ok" : ""}">${s}</span>`;
  };
  let html = "";
  for (let k = 0; k < gs.length; k++) {
    if (gs[k].split && gs[k + 2] && gs[k + 2].split) {
      const a = one(gs[k], " s"), b = one(gs[k + 1], ""), c = one(gs[k + 2], " s");
      html += `<span class="sp${typed >= i ? " ok" : ""}">${a}${b}${c}</span>`;
      k += 2;
    } else html += one(gs[k], "");
  }
  return html;
}

/* ------------------------------- flight ------------------------------- */

const flight = {
  level: null, queue: [], stars: [], target: null, pending: [],
  sent: 0, missed: 0, need: 0, lastLane: -1, idle: 0, nudge: false, arriving: false, played: [],
};
const labelsEl = $("labels");

function buildQueue(level) {
  // fresh words first, then ones that have slipped before, then the rest
  const score = (w) => {
    const s = save.words[w.text];
    return (s ? (s.slip > s.ok ? 1 : 2 + s.ok) : 0) + Math.random();
  };
  const words = level.words.slice().sort((a, b) => score(a) - score(b)).slice(0, level.stars);
  // a couple of wobbly words from earlier levels come back for another go
  const review = wobblyWords().map(t => WORD_INDEX.get(t)).filter(w => w && w.level < level.n).slice(0, 2);
  review.forEach((w, i) => { if (!words.some(x => x.text === w.text)) words[words.length - 1 - i] = w; });
  return shuffle(words);
}

function liveStars() { return flight.stars.filter(s => s.state === "waiting" || s.state === "rising" || s.state === "active"); }
function wordLife(w) { return flight.level.baseLife + Math.max(0, w.text.length - 3) * flight.level.perLetter; }

function pickWord() {
  const firsts = liveStars().map(s => s.word.text[0]);
  let i = flight.queue.findIndex(w => !firsts.includes(w.text[0]));   // distinct first letters on screen
  if (i < 0) i = 0;
  return flight.queue.splice(i, 1)[0];
}

function spawnStar() {
  const word = pickWord();
  if (!word) return;
  let lane;
  do { lane = Math.floor(Math.random() * LANES.length); } while (lane === flight.lastLane);
  flight.lastLane = lane;

  const root = new THREE.Group();
  root.position.set(SPAWN_X, 0, LANES[lane]);
  const spot = bake(hideout(pick(BIOMES[biomeIndex].hideouts)));
  spot.rotation.y = rand(-0.3, 0.3);
  spot.scale.setScalar(0.01);
  spot.userData.grow = 0;
  root.add(spot);

  const colorIndex = Math.floor(Math.random() * STAR_COLORS.length);
  const mesh = buildStar(colorIndex);
  const restY = spot.userData.height + 0.6;
  mesh.position.set(0, spot.userData.height * 0.5, 0.05);
  mesh.visible = false;
  root.add(mesh);
  world.add(root);

  const label = document.createElement("div");
  label.className = "label";
  label.style.opacity = "0";
  label.innerHTML = `<div class="word${word.tricky ? " tricky" : ""}"></div><div class="timer"><i></i></div>`;
  label.firstChild.addEventListener("pointerdown", () => say(word.text, { rate: 0.75, force: true }));    // tap a word to hear it
  labelsEl.appendChild(label);

  const star = { word, colorIndex, typed: 0, errors: 0, root, spot, mesh, label, restY, state: "waiting", t: 0, wiggle: 0, phase: rand(0, 6), life: wordLife(word) };
  flight.stars.push(star);
  renderWord(star);
}

function renderWord(star) {
  const isTarget = flight.target === star;
  const hinted = flight.nudge && (isTarget || (!flight.target && star === nudgeStar()));
  const cls = (i) => i < star.typed ? "done" : (i === star.typed && (isTarget || hinted) ? "next" + (hinted ? " nudge" : "") : "");
  const pic = star.word.emoji ? `<span class="pic">${star.word.emoji}</span>` : "";
  star.label.firstChild.innerHTML = pic + wordHTML(star.word, cls, star.typed);
  star.label.classList.toggle("target", isTarget);
}
function renderWords() { flight.stars.forEach(s => { if (s.state !== "done") renderWord(s); }); }

function nudgeStar() {
  if (flight.target) return flight.target;
  return flight.stars.filter(s => s.state === "active" || s.state === "rising").sort((a, b) => a.root.position.x - b.root.position.x)[0] || null;
}
function setNudge(on) {
  if (flight.nudge === on) return;
  flight.nudge = on;
  const s = on ? nudgeStar() : null;
  glowKey(s ? s.word.text[s.typed] : null);
  renderWords();
}

function updateStars(dt) {
  for (const star of [...flight.stars]) {
    star.root.position.x -= worldSpeed * dt;
    star.t += dt;
    const m = star.mesh;
    const U = m.userData;

    if (star.state === "waiting" && star.root.position.x <= REVEAL_X) {
      star.state = "rising";
      star.t = 0;
      m.visible = true;
      star.label.style.opacity = "1";
      star.spot.userData.rustle = 0.5;
      sfx.pop();
    }
    if (star.state === "rising") {
      const k = Math.min(star.t / 0.6, 1);
      m.position.y = lerp(star.spot.userData.height * 0.5, star.restY, easeOutBack(k));
      m.scale.setScalar(0.3 + 0.7 * k);
      if (k >= 1) { star.state = "active"; sparkleAt(m, STAR_COLORS[star.colorIndex].hex, 6); }
    }
    if (star.state === "active") {
      m.position.y = star.restY + Math.sin(clock * 2.5 + star.phase) * 0.08;
      if (star.root.position.x <= MISS_X) missStar(star);
    }
    if (star.state === "rising" || star.state === "active") {
      m.rotation.z = Math.sin(clock * 2 + star.phase) * 0.18;
      const frac = star.typed / star.word.text.length;
      U.mat.emissiveIntensity = 0.9 + 1.5 * frac + 0.12 * Math.sin(clock * 5 + star.phase);     // glows brighter with every letter
      U.glow.material.opacity = 0.22 + 0.3 * frac;
      const prog = clamp((REVEAL_X - star.root.position.x) / (REVEAL_X - MISS_X), 0, 1);
      const bar = star.label.lastChild.firstChild;
      bar.style.transform = `scaleX(${1 - prog})`;
      bar.style.background = prog > 0.75 ? "#ffb36b" : "";
    }
    if (star.state === "miss") {
      const k = Math.min(star.t / 0.5, 1);
      m.position.y = lerp(star.restY, star.spot.userData.height * 0.4, k);
      m.scale.setScalar(1 - 0.8 * k);
      if (k >= 1) m.visible = false;
    }
    if (star.state === "collect") {
      // a happy wiggle, then whoosh — up into the sky
      const k = Math.min(star.t / 1.1, 1);
      if (k < 0.25) {
        m.position.copy(star.from);
        m.position.y += Math.sin((k / 0.25) * Math.PI) * 0.5;
        m.rotation.z = Math.sin(k * 50) * 0.4;
        m.scale.setScalar(1 + Math.sin((k / 0.25) * Math.PI) * 0.35);
      } else {
        const f = (k - 0.25) / 0.75, e = f * f;
        m.position.lerpVectors(star.from, star.to, e);
        m.position.x += Math.sin(f * Math.PI) * star.swerve;
        m.rotation.z += dt * 14;
        m.scale.setScalar(1 - 0.55 * e);
        if (Math.random() < dt * 60) {
          emit({ pos: m.position, vel: new THREE.Vector3(rand(-0.4, 0.4), rand(-0.6, 0), 0), color: pick([STAR_COLORS[star.colorIndex].hex, 0xffffff]), size: rand(0.25, 0.45), life: rand(0.5, 0.9), add: true });
        }
      }
      if (k >= 1) {
        discard(m);
        addHomeStar(star.to, STAR_COLORS[star.colorIndex].hex);
        burst(star.to, [STAR_COLORS[star.colorIndex].hex, 0xffffff, 0xffe27a], 14, 3);
        star.state = "done";
      }
    }
    if (star.wiggle > 0) {
      star.wiggle -= dt;
      m.rotation.z = Math.sin(star.wiggle * 40) * 0.35 * (star.wiggle / 0.4);
    }

    // the hiding spot sprouts up, then rustles when its star pops in or out
    const sd = star.spot.userData;
    if (sd.grow < 1) {
      sd.grow = Math.min(1, sd.grow + dt * 2.5);
      star.spot.scale.setScalar(Math.max(0.01, easeOutBack(sd.grow)));
    } else if (sd.rustle > 0) {
      sd.rustle -= dt;
      const r = sd.rustle;
      star.spot.scale.set(1 + Math.sin(r * 30) * 0.08 * r * 2, 1 - Math.sin(r * 30) * 0.08 * r * 2, 1);
    }

    if (star.root.position.x < -WORLD_HALF) removeStar(star);
  }
}
function removeStar(star) {
  discard(star.root);
  discard(star.mesh);
  star.label.remove();
  const i = flight.stars.indexOf(star);
  if (i >= 0) flight.stars.splice(i, 1);
}
function clearStars() {
  for (const s of [...flight.stars]) removeStar(s);
  flight.target = null;
}

function sparkleAt(obj, color, n) {
  obj.getWorldPosition(tmpV2);
  for (let i = 0; i < n; i++) {
    emit({
      pos: tmpV2.clone().add(new THREE.Vector3(rand(-0.5, 0.5), rand(-0.4, 0.6), rand(-0.3, 0.3))),
      vel: new THREE.Vector3(rand(-0.4, 0.4), rand(0.4, 1.2), 0),
      color: pick([color, 0xffffff]), size: rand(0.2, 0.35), life: rand(0.5, 0.9),
    });
  }
}

function missStar(star, counted = true) {
  star.state = "miss";
  star.t = 0;
  star.spot.userData.rustle = 0.5;
  star.label.style.opacity = "0";
  if (flight.target === star) flight.target = null;
  if (!counted) return;
  sfx.hide();
  flight.missed++;
  noteWord(star.word.text, false);
  flight.queue.push(star.word);        // it will peek out again a little later
  flight.pending.push(0.6);
  setNudge(false);
  if (!save.tips.hid) { save.tips.hid = 1; persist(); hint("Oops, the star hid! It will come back. 💫", 4000); }
}

/** A spot high in the sky, in view, for a star to fly home to. */
function skySpot() {
  const v = new THREE.Vector3(rand(-0.85, 0.85), rand(0.42, 0.8), 0.5).unproject(camera);
  const dir = v.sub(camera.position).normalize();
  const t = (-16 - camera.position.z) / dir.z;
  return camera.position.clone().addScaledVector(dir, t);
}

function sendHome(star) {
  star.state = "collect";
  star.t = 0;
  star.from = star.mesh.getWorldPosition(new THREE.Vector3());
  star.to = skySpot();
  star.swerve = rand(-2, 2);
  scene.attach(star.mesh);
  star.mesh.position.copy(star.from);
  star.label.style.opacity = "0";
  star.spot.userData.rustle = 0.4;
  flight.target = null;
  setNudge(false);
  renderWords();

  sfx.collect();
  say(star.word.text);
  witchAnim.hop = 1;
  witchAnim.cast = 0.5;
  flight.sent++;
  flight.played.push({ word: star.word, errors: star.errors });
  save.totalStars++;
  noteWord(star.word.text, star.errors <= 1);
  persist();
  setTimeout(renderJar, 500);

  if (flight.sent >= flight.need) endFlight();
  else flight.pending.push(0.7);
}

function renderJar() {
  let html = "";
  for (let i = 0; i < flight.need; i++) {
    const c = flight.jar[i];
    html += `<div class="slot">${c != null ? starIcon(STAR_COLORS[c].css) : ""}</div>`;
  }
  $("jar").innerHTML = html;
}
function starIcon(css) {
  return `<svg viewBox="0 0 24 24"><path d="M12 1.8l3 6.4 7 .9-5.1 4.8 1.3 6.9L12 17.4l-6.2 3.4 1.3-6.9L2 9.1l7-.9z" fill="${css}" stroke="#fff" stroke-width="1.2" stroke-linejoin="round"/></svg>`;
}

/* ------------------------------ typing ------------------------------- */

function flightLetter(letter) {
  const live = flight.stars.filter(s => s.state === "rising" || s.state === "active");
  if (flight.target && !live.includes(flight.target)) flight.target = null;

  if (!flight.target) {
    // the first letter chooses a star — the one closest to the witch wins ties
    const match = live.filter(s => s.word.text[0] === letter).sort((a, b) => a.root.position.x - b.root.position.x)[0];
    if (!match) {
      sfx.wrong();
      live.forEach(wiggle);
      flight.idle += 2;               // the helper glow arrives sooner
      return;
    }
    flight.target = match;
  }
  const star = flight.target;
  if (star.word.text[star.typed] === letter) {
    sfx.key(star.typed);
    star.typed++;
    flight.idle = 0;
    setNudge(false);
    zap(star);
    if (star.typed === star.word.text.length) {
      flight.jar.push(star.colorIndex);
      sendHome(star);
    } else renderWords();
  } else {
    sfx.wrong();
    star.errors++;
    wiggle(star);       // no progress lost — just a gentle nudge
    if (star.errors >= 2) { flight.idle = 99; }      // show which key comes next
  }
}

function releaseTarget() {
  if (mode !== "flight" || !flight.target) return;
  flight.target.typed = 0;
  flight.target = null;
  renderWords();
}

function wiggle(star) {
  star.wiggle = 0.4;
  star.label.classList.remove("wiggle");
  void star.label.offsetWidth;
  star.label.classList.add("wiggle");
}

// a little trail of sparkles from the wand to the star on every right letter
function zap(star) {
  witch.userData.wandTip.getWorldPosition(tmpV);
  star.mesh.getWorldPosition(tmpV2);
  const hex = STAR_COLORS[star.colorIndex].hex;
  for (let i = 0; i < 7; i++) {
    const p = tmpV.clone().lerp(tmpV2, i / 7);
    p.y += Math.sin((i / 7) * Math.PI) * 0.7;
    emit({ pos: p, vel: new THREE.Vector3(0, rand(0.2, 0.6), 0), color: pick([0xffe27a, hex, 0xffffff]), size: 0.3, life: 0.35 + i * 0.04, add: true });
  }
  sparkleAt(star.mesh, hex, 3);
}

/* --------------------------- level lifecycle -------------------------- */

function startLevel(n) {
  const level = LEVELS[n - 1];
  leaveEverything();
  clearHomeStars();
  currentPlace = level.place;
  setBiome(level.place);
  setStage(level.place);
  stage.visible = false;
  Object.assign(flight, {
    level, queue: buildQueue(level), target: null, pending: [], sent: 0, missed: 0,
    need: level.stars, lastLane: -1, idle: 0, nudge: false, arriving: false, jar: [], played: [],
    starsBefore: starCount(),
  });
  for (let i = 0; i < level.maxOnScreen; i++) flight.pending.push(1.6 + i * Math.min(4, level.baseLife * 0.3));
  mode = "flight";
  paused = false;
  $("hud").classList.add("active");
  const place = PLACES[level.place];
  $("levelPill").textContent = `${place.emoji} ${level.n}`;
  $("jar").style.display = "";
  renderJar();
  showKeyboard(true);
  layoutCrew();
  applyView();
  setSkyFullness(skyFullness());
  banner(`${place.name}<small>${level.focus}</small>`, 3200);
  if (!save.tips.fly) {
    save.tips.fly = 1; persist();
    setTimeout(() => { if (mode === "flight") { hint("Type the letters to send the star home! ⭐", 7000); say("Type the letters to send the star home!"); } }, 2600);
  } else if (level.step === 0 && !save.helped[place.id]) {
    setTimeout(() => { if (mode === "flight") caption(place.plea + " " + place.need, 5000); }, 800);   // shown as well as said, for when the voice is off
  }
}
function skyFullness() { return Object.keys(save.stars).length / LEVELS.length; }

function updateFlight(dt) {
  // the wood moves at a pace that gives the longest word on screen enough time
  let speed = 0;
  if (mode === "flight") {
    const live = flight.stars.filter(s => s.state === "rising" || s.state === "active");
    const life = live.length ? Math.max(...live.map(s => s.life)) : flight.level.baseLife;
    speed = (REVEAL_X - MISS_X) / life;
    if (!live.length) speed *= 2.2;                                    // hurry to the next hiding spot
    else if (flight.target) {
      speed *= 0.6;                                                    // the wood waits a little while you spell
      if (flight.target.typed > 0 && flight.target.root.position.x < MISS_X + 2) speed *= 0.3;
    }
    for (let i = flight.pending.length - 1; i >= 0; i--) {
      flight.pending[i] -= dt;
      if (flight.pending[i] <= 0) {
        flight.pending.splice(i, 1);
        if (liveStars().length < flight.level.maxOnScreen) spawnStar();
      }
    }
    if (live.length) {
      flight.idle += dt;
      const wait = flight.level.place === 0 ? 4 : 7;
      if (save.helper && flight.idle > wait && !flight.nudge) setNudge(true);
    }
  } else if (mode === "toBrew" && flight.arriving) {
    // glide the cauldron in from the right and settle gently
    speed = Math.min(clamp((stage.position.x - STAGE_X) * 1.6, 0.05, 7), worldSpeed + dt * 8);
    stage.position.x -= speed * dt;
    clearing.x = stage.position.x + 0.4;
    if (stage.position.x - STAGE_X < 0.02) {
      stage.position.x = STAGE_X;
      flight.arriving = false;
      startBrew();
    }
    worldSpeed = speed;
  }
  return speed;
}

function endFlight() {
  mode = "toBrew";
  showKeyboard(false);
  glowKey(null);
  for (const s of liveStars()) missStar(s, false);       // leftovers just hide again, no penalty
  witchAnim.celebrate = 0.001;
  setTimeout(() => {
    sfx.complete();
    caption("All the stars are home!", 2400);
  }, 700);
  setTimeout(() => {
    if (mode !== "toBrew") return;
    stage.visible = true;
    stage.position.x = 19;
    flight.arriving = true;
    $("jar").style.display = "none";
    layoutCrew();
    applyView();
  }, 2500);
}
