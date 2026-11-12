"use strict";
/* =====================================================================
   Brewing: look at a word, cover it, build it from its sounds, check.
   Three words make one potion ingredient. After five ingredients the
   friend gets their potion.
   ===================================================================== */

const brew = {
  words: [], idx: 0, phase: "idle", word: null,
  slot: 0, inG: 0, wrong: 0, slips: 0, peeks: 0, tiles: [], timers: [],
};
const START_BREW = 0x8cf0a8;

function later(fn, ms) {
  const id = setTimeout(() => { brew.timers = brew.timers.filter(t => t !== id); fn(); }, ms);
  brew.timers.push(id);
  return id;
}
function clearBrewTimers() { brew.timers.forEach(clearTimeout); brew.timers = []; }

function chooseBrewWords() {
  // words that needed a few tries come first — a second look helps them stick
  const seen = new Set();
  const played = flight.played.slice().sort((a, b) => b.errors - a.errors + (Math.random() - 0.5) * 0.5);
  const out = [];
  for (const p of played) {
    if (seen.has(p.word.text) || p.word.text.length > 9) continue;
    seen.add(p.word.text);
    out.push(p.word);
    if (out.length === 3) break;
  }
  for (const w of shuffle(flight.level.words)) {
    if (out.length >= 3) break;
    if (!seen.has(w.text) && w.text.length <= 9) { seen.add(w.text); out.push(w); }
  }
  return out.sort((a, b) => a.text.length - b.text.length);
}

function startBrew() {
  mode = "brew";
  clearBrewTimers();
  Object.assign(brew, { words: chooseBrewWords(), idx: 0, phase: "idle", word: null });
  setBrewColor(cauldron, START_BREW);
  showPanel("brewUI");
  $("hud").classList.add("active");
  renderBrewDots();
  $("brewSlots").innerHTML = "";
  $("brewPic").textContent = "";
  $("brewTiles").innerHTML = "";
  applyView();
  layoutCrew();
  const place = PLACES[currentPlace];
  let wait = 600;
  if (!save.tips.brew) {
    save.tips.brew = 1; persist();
    caption("Time to brew! Look at the word… then spell it.", 4200, true);
    wait = 4300;
  } else {
    caption(save.helped[place.id] ? "Time to brew!" : `Time to brew for ${place.friendName}!`, 1800, true);
    wait = 1900;
  }
  later(brewLook, wait);
}

function renderBrewDots() {
  const place = PLACES[currentPlace];
  const emoji = place.ingredients[flight.level.step];
  $("brewDots").innerHTML = brew.words.map((_, i) => `<span class="${i < brew.idx ? "got" : ""}">${i < brew.idx ? emoji : ""}</span>`).join("");
}

function renderSlots() {
  const w = brew.word;
  const el = $("brewSlots");
  // letter index where the current grapheme starts
  let start = 0;
  for (let k = 0; k < brew.slot; k++) start += w.graphemes[k].t.length;
  el.innerHTML = wordHTML(w, (i) => (brew.phase === "spell" && i >= start && i < start + brew.inG ? "typed" : ""));
  const gs = el.querySelectorAll(".g");
  gs.forEach((g, k) => {
    if (brew.phase === "spell") {
      if (k < brew.slot) g.classList.add("filled");
      else if (k === brew.slot) g.classList.add("cur");
    }
  });
  el.className = "word big" + (w.tricky ? " plain" : "") + (brew.phase === "look" || brew.phase === "peek" ? " look" : "") + (brew.phase === "done" ? " look done" : "");
}

function brewLook() {
  if (mode !== "brew") return;
  const w = brew.words[brew.idx];
  Object.assign(brew, { word: w, phase: "look", slot: 0, inG: 0, wrong: 0, slips: 0, peeks: 0, tiles: [] });
  $("brewPic").textContent = w.emoji;
  $("brewTiles").innerHTML = "";
  $("brewTiles").classList.add("hidden");
  $("brewPeek").disabled = true;
  renderSlots();
  sfx.pop();
  say(w.text, { rate: 0.75 });
  const lookTime = (flight.level.place === 0 ? 2400 : 2000) + w.text.length * 260;
  later(brewCover, lookTime);
}

function makeTiles(w) {
  const have = w.graphemes.map(g => g.t);
  const extra = [];
  const want = have.length <= 3 ? 2 : 3;
  // doubled letters (ll, tt...) are muddled with the single letter
  const muddles = (t) => CONFUSABLE[t] || (t.length === 2 && t[0] === t[1] ? [t[0], ...(CONFUSABLE[t[0]] || [])] : []);
  const pool = shuffle(have.flatMap(muddles));
  for (const t of pool) {
    if (extra.length >= want) break;
    if (!have.includes(t) && !extra.includes(t)) extra.push(t);
  }
  const letters = shuffle("abcdefghilmnoprstuw".split(""));
  while (extra.length < want) {
    const t = letters.pop();
    if (!have.includes(t) && !extra.includes(t)) extra.push(t);
  }
  return shuffle([...have, ...extra]).map(t => ({ t, used: false, el: null }));
}

function brewCover() {
  if (mode !== "brew") return;
  brew.phase = "spell";
  brew.tiles = makeTiles(brew.word);
  const box = $("brewTiles");
  box.innerHTML = "";
  box.classList.remove("hidden");
  brew.tiles.forEach((tile, i) => {
    const b = document.createElement("button");
    b.textContent = tile.t;
    b.style.animationDelay = (i * 0.05) + "s";
    b.addEventListener("pointerdown", (e) => { e.preventDefault(); startMusic(); brewPick(i); });
    box.appendChild(b);
    tile.el = b;
  });
  $("brewPeek").disabled = false;
  renderSlots();
  sfx.tick();
}

function brewWrong(tileEl) {
  brew.wrong++;
  brew.slips++;
  sfx.wrong();
  const el = $("brewSlots");
  el.classList.remove("shake");
  void el.offsetWidth;
  el.classList.add("shake");
  if (tileEl) {
    tileEl.classList.remove("no");
    void tileEl.offsetWidth;
    tileEl.classList.add("no");
    setTimeout(() => tileEl.classList.remove("no"), 400);
  }
  if (brew.wrong >= 2) {
    // show which sound comes next — nobody gets stuck
    const need = brew.word.graphemes[brew.slot].t;
    const tile = brew.tiles.find(t => !t.used && t.t === need);
    if (tile) tile.el.classList.add("glow");
  }
}

function fillSlot() {
  const need = brew.word.graphemes[brew.slot].t;
  const tile = brew.tiles.find(t => !t.used && t.t === need);
  if (tile) { tile.used = true; tile.el.classList.add("used"); tile.el.classList.remove("glow"); }
  sfx.key(brew.slot);
  brew.slot++;
  brew.inG = 0;
  brew.wrong = 0;
  if (brew.slot >= brew.word.graphemes.length) brewWordDone();
  else renderSlots();
}

function brewPick(i) {
  if (mode !== "brew" || brew.phase !== "spell" || paused) return;
  const tile = brew.tiles[i];
  if (!tile || tile.used) return;
  if (tile.t === brew.word.graphemes[brew.slot].t) fillSlot();
  else brewWrong(tile.el);
}

/** Typing on a real keyboard works too, letter by letter. */
function brewLetter(ch) {
  if (brew.phase !== "spell") return;
  const g = brew.word.graphemes[brew.slot].t;
  if (g[brew.inG] === ch) {
    brew.inG++;
    if (brew.inG >= g.length) fillSlot();
    else { sfx.tick(); renderSlots(); }
  } else brewWrong(null);
}

function brewPeek() {
  if (mode !== "brew" || brew.phase !== "spell") return;
  brew.phase = "peek";
  brew.peeks++;
  renderSlots();
  say(brew.word.text, { rate: 0.75 });
  later(() => { if (brew.phase === "peek") { brew.phase = "spell"; renderSlots(); } }, 1500 + brew.word.text.length * 120);
}

function cauldronScreenPos() {
  cauldron.getWorldPosition(tmpV);
  tmpV.y += 1.3;
  tmpV.project(camera);
  return [(tmpV.x * 0.5 + 0.5) * window.innerWidth, (-tmpV.y * 0.5 + 0.5) * window.innerHeight];
}

function brewWordDone() {
  brew.phase = "done";
  renderSlots();
  $("brewPeek").disabled = true;
  const w = brew.word;
  noteWord(w.text, brew.slips === 0 && brew.peeks === 0);
  persist();
  sfx.collect();
  say(w.text);
  witchAnim.cast = 1.2;

  // the word's magic plops into the cauldron
  const place = PLACES[currentPlace];
  const r = $("brewSlots").getBoundingClientRect();
  const fly = document.createElement("div");
  fly.className = "fly";
  fly.textContent = w.emoji || "✨";
  const sx = r.left + r.width / 2 - 22, sy = r.top - 30;
  fly.style.transform = `translate(${sx}px, ${sy}px) scale(1)`;
  document.body.appendChild(fly);
  const [cx, cy] = cauldronScreenPos();
  requestAnimationFrame(() => requestAnimationFrame(() => {
    fly.style.transform = `translate(${cx - 22}px, ${cy - 22}px) scale(.35)`;
    fly.style.opacity = "0.2";
  }));
  later(() => {
    fly.remove();
    sfx.plop();
    cauldron.getWorldPosition(tmpV2);
    tmpV2.y += 1.4;
    const final = new THREE.Color(POTION_COLORS[currentPlace]);
    const mix = new THREE.Color(START_BREW).lerp(final, (brew.idx + 1) / brew.words.length);
    setBrewColor(cauldron, mix.getHex());
    burst(tmpV2.clone(), [mix.getHex(), 0xffffff, 0xffe27a], 20, 3.2);
    brew.idx++;
    renderBrewDots();
  }, 720);
  later(() => {
    if (brew.idx >= brew.words.length) finishBrew();
    else brewLook();
  }, 1900);
}

/* ---------------------- the potion and the friend --------------------- */

const cut = { active: false, t: 0, bottle: null, steps: [], from: new THREE.Vector3(), to: new THREE.Vector3(), give: -1 };

function finishBrew() {
  mode = "cutscene";
  showPanel(null);
  applyView();
  const level = flight.level, place = PLACES[level.place];
  const stars = flight.missed === 0 ? 3 : flight.missed <= 2 ? 2 : 1;
  const first = !save.stars[level.n];
  save.stars[level.n] = Math.max(save.stars[level.n] || 0, stars);
  persist();
  flight.result = { stars, first };
  setSkyFullness(skyFullness());

  // POOF — a bottle pops out of the cauldron
  sfx.poof();
  cauldron.getWorldPosition(tmpV2);
  tmpV2.y += 1.4;
  const hex = POTION_COLORS[level.place];
  burst(tmpV2.clone(), [hex, 0xffffff, 0xffe27a], 40, 5);
  for (let i = 0; i < 10; i++) {
    emit({ pos: tmpV2.clone().add(new THREE.Vector3(rand(-0.5, 0.5), rand(0, 0.5), 0)), vel: new THREE.Vector3(rand(-0.6, 0.6), rand(0.8, 1.8), 0),
           color: 0xffffff, size: rand(0.6, 1.1), life: rand(0.8, 1.3), tex: dotTex, grow: 1.2 });
  }
  discard(cut.bottle);
  cut.bottle = buildBottle(hex);
  cut.bottle.position.copy(tmpV2);
  cut.bottle.scale.setScalar(0.01);
  scene.add(cut.bottle);
  cut.active = true;
  cut.t = 0;
  cut.give = -1;
  cut.from.copy(tmpV2).add(new THREE.Vector3(0, 0.9, 0.3));

  const helpNow = placeDone(level.place) && !save.helped[place.id];
  if (helpNow) {
    caption(`The ${place.potion} is ready!`, 2400, true);
    cut.steps = [
      [2.2, () => {
        cut.give = cut.t;
        stageFriend.getWorldPosition(cut.to);
        cut.to.y += 1.6;
      }],
      [3.3, () => {
        sfx.poof();
        stageFriend.getWorldPosition(tmpV2);
        tmpV2.y += 1;
        burst(tmpV2.clone(), [hex, 0xffffff, 0xffe27a, 0xff9ccf], 46, 5);
        setFriendHelped(stageFriend, true);
        discard(cut.bottle);
        cut.bottle = null;
        save.helped[place.id] = true;
        persist();
        witchAnim.celebrate = 0.001;
      }],
      [3.7, () => {
        sfx.heart();
        stageFriend.getWorldPosition(tmpV2);
        tmpV2.y += 1.6;
        hearts(tmpV2.clone(), 10);
        caption(place.thanks, 5200, true);
      }],
      [6.2, () => { sfx.reward(); stageFriend.getWorldPosition(tmpV2); tmpV2.y += 1.6; hearts(tmpV2.clone(), 8); }],
    ];
    if (level.n === LEVELS.length) {
      cut.steps.push(
        [9.2, () => { caption("All the stars are back in the sky. You did it!", 5200, true); sfx.complete(); setSkyFullness(1); witchAnim.celebrate = 0.001; save.seenEnding = true; persist(); }],
        [9.6, () => fireworks(6)],
        [14.4, () => showComplete()],
      );
    } else cut.steps.push([9.0, () => showComplete()]);
  } else {
    const done = save.helped[place.id];
    caption(done ? "A lovely potion!" : `One more thing for the ${place.potion}!`, 2400, true);
    cut.steps = [[2.6, () => showComplete()]];
  }
}

function fireworks(n) {
  for (let i = 0; i < n; i++) {
    setTimeout(() => {
      burst(new THREE.Vector3(STAGE_X + rand(-5, 5), rand(3.5, 6), rand(-3, 0)), [0xff8fc8, 0x6fc8ff, 0xffc93c, 0x7fe0b0, 0xb48cff, 0xffffff], 34, 5.5);
      sfx.pop();
    }, i * 380);
  }
}

function updateCutscene(dt) {
  if (!cut.active) return;
  cut.t += dt;
  while (cut.steps.length && cut.t >= cut.steps[0][0]) cut.steps.shift()[1]();
  const b = cut.bottle;
  if (b) {
    b.rotation.y += dt * 2.5;
    if (cut.give < 0) {
      const k = clamp(cut.t / 0.7, 0, 1);
      b.scale.setScalar(Math.max(0.01, easeOutBack(k)) * 1.2);
      b.position.lerpVectors(tmpV.copy(cut.from).setY(cut.from.y - 0.9), cut.from, k);
      b.position.y += Math.sin(cut.t * 3) * 0.08;
    } else {
      const k = easeInOut(clamp((cut.t - cut.give) / 1.0, 0, 1));
      b.position.lerpVectors(cut.from, cut.to, k);
      b.position.y += Math.sin(k * Math.PI) * 0.8;
    }
    if (Math.random() < dt * 14) emit({ pos: b.position, vel: new THREE.Vector3(rand(-0.4, 0.4), rand(0.2, 0.9), 0), color: pick([0xffffff, 0xffe27a]), size: rand(0.15, 0.3), life: 0.7, add: true });
  }
}
function endCutscene() {
  cut.active = false;
  cut.steps = [];
  discard(cut.bottle);
  cut.bottle = null;
}

/** Little touches that show how a friend is feeling. */
function friendFx(friend, dt) {
  const U = friend.userData;
  U.fx = (U.fx || rand(0.5, 2)) - dt;
  if (U.fx > 0) return;
  friend.getWorldPosition(tmpV2);
  const s = friend.scale.x;
  if (!U.helped) {
    U.fx = rand(1.6, 3);
    if (U.kind === "dragon") {
      // a small sniffly sneeze
      emit({ pos: new THREE.Vector3(tmpV2.x - 0.1, tmpV2.y + 0.85 * s, tmpV2.z + 0.5 * s), vel: new THREE.Vector3(rand(-0.6, -0.2), 0.3, 0.6), color: 0xffffff, size: 0.35, life: 0.6, tex: dotTex, grow: 1 });
      U.head.rotation.x = -0.3;
    } else {
      emit({ pos: new THREE.Vector3(tmpV2.x + rand(-0.15, 0.15) * s, tmpV2.y + 0.85 * s, tmpV2.z + 0.4 * s), vel: new THREE.Vector3(0, -0.2, 0), color: 0x8fd3ff, size: 0.2, life: 0.9, gravity: -2.5, tex: dropTex });
    }
  } else {
    U.fx = rand(0.7, 1.4);
    if (U.kind === "frog") {
      emit({ pos: new THREE.Vector3(tmpV2.x + rand(-0.2, 0.2), tmpV2.y + 1.2 * s, tmpV2.z + 0.2), vel: new THREE.Vector3(rand(-0.4, 0.4), rand(0.7, 1.1), 0), color: pick([0xff8fc8, 0x6fc8ff, 0xffe27a]), size: 0.36, life: 1.4, tex: noteTex });
    } else if (U.kind === "bat" || U.kind === "dragon") {
      emit({ pos: new THREE.Vector3(tmpV2.x + rand(-0.3, 0.3), tmpV2.y + 1.2 * s, tmpV2.z + 0.2), vel: new THREE.Vector3(rand(-0.2, 0.2), rand(0.6, 1), 0), color: 0xff8fc8, size: 0.3, life: 1.2, tex: heartTex });
    } else if (U.kind === "mouse") {
      emit({ pos: new THREE.Vector3(tmpV2.x + 0.4 * s + rand(-0.2, 0.2), tmpV2.y + 0.5 * s, tmpV2.z + 0.3 * s), vel: new THREE.Vector3(rand(-0.2, 0.2), rand(0.3, 0.7), 0), color: 0xffe27a, size: 0.2, life: 1, add: true });
    }
  }
}
