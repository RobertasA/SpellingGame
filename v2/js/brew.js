"use strict";
/* =====================================================================
   Brewing: look at a word, cover it, build it from its sounds, check.
   Three words make one potion ingredient. After five ingredients the
   friend gets their potion.

   A word can also be a "star challenge": it is never shown. The child
   hears it and sees its picture, then writes it letter by letter on a
   full keyboard — no sound tiles to choose from.
   ===================================================================== */

const brew = {
  words: [], idx: 0, phase: "idle", word: null,
  slot: 0, inG: 0, wrong: 0, slips: 0, peeks: 0, tiles: [], timers: [],
  dictate: [],            // for each word: is it a star challenge?
  challenge: false,       // the word being spelled now is one
  keys: {}, helped: false, aced: [],
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

/** A word can be a challenge if the child can tell which word it is without seeing it. */
function canDictate(w) { return !!w.emoji || willBeHeard(w.text); }
/** Decide which of the words are star challenges (and put the challenge last when there is just one). */
function chooseChallenges(words) {
  const style = save.brewMode || "mix";
  if (style === "hear") return words.map(canDictate);
  const flags = words.map(() => false);
  if (style !== "mix") return flags;
  // a word with a picture is the friendliest one to be asked for
  const able = words.filter(canDictate);
  const star = able.find(w => w.emoji) || able[0];
  if (!star) return flags;
  words.splice(words.indexOf(star), 1);
  words.push(star);
  flags[words.length - 1] = true;
  return flags;
}

function startBrew() {
  mode = "brew";
  clearBrewTimers();
  Object.assign(brew, { words: chooseBrewWords(), idx: 0, phase: "idle", word: null, challenge: false, aced: [] });
  brew.dictate = chooseChallenges(brew.words);
  $("brewUI").classList.remove("challenge");
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
  later(brewNext, wait);
}
function brewNext() {
  if (brew.dictate[brew.idx]) brewHear(); else brewLook();
}

function renderBrewDots() {
  const place = PLACES[currentPlace];
  const emoji = place.ingredients[flight.level.step];
  $("brewDots").innerHTML = brew.words.map((_, i) =>
    `<span class="${i < brew.idx ? "got" : brew.dictate[i] ? "star" : ""}">${i < brew.idx ? emoji : brew.dictate[i] ? "⭐" : ""}</span>`).join("");
}

function renderSlots() {
  const w = brew.word;
  const el = $("brewSlots");
  // letter index where the current grapheme starts
  let start = 0;
  for (let k = 0; k < brew.slot; k++) start += w.graphemes[k].t.length;
  const ghost = brew.phase === "spell" && brew.challenge && brew.wrong >= 3 && !screenKeysWanted() ? start + brew.inG : -1;
  el.innerHTML = wordHTML(w, (i) => (brew.phase === "spell" && i >= start && i < start + brew.inG ? "typed" : i === ghost ? "ghost" : ""));
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
  Object.assign(brew, { word: w, phase: "look", challenge: false, slot: 0, inG: 0, wrong: 0, slips: 0, peeks: 0, tiles: [] });
  $("brewUI").classList.remove("challenge");
  $("brewPic").textContent = w.emoji;
  $("brewTiles").innerHTML = "";
  $("brewTiles").className = "hidden";
  $("brewPeek").disabled = true;
  renderSlots();
  sfx.pop();
  say(w.text, { rate: 0.75 });
  const lookTime = (flight.level.place === 0 ? 2400 : 2000) + w.text.length * 260;
  later(brewCover, lookTime);
}

/** Star challenge: the word stays hidden. Hear it, see its picture, write it. */
function brewHear() {
  if (mode !== "brew") return;
  const w = brew.words[brew.idx];
  Object.assign(brew, { word: w, phase: "spell", challenge: true, slot: 0, inG: 0, wrong: 0, slips: 0, peeks: 0, tiles: [], keys: {}, helped: false });
  $("brewUI").classList.add("challenge");
  $("brewPic").textContent = w.emoji || "👂";
  // a whole keyboard to write with, laid out like the one used for flying
  const box = $("brewTiles");
  box.innerHTML = "";
  box.className = "keys";
  for (const row of KBD_LAYOUTS[save.kbd] || KBD_LAYOUTS.qwerty) {
    const r = document.createElement("div");
    r.className = "row";
    for (const ch of row) {
      const b = document.createElement("button");
      b.textContent = ch;
      if ("aeiou".includes(ch)) b.className = "vowel";
      b.addEventListener("pointerdown", (e) => { e.preventDefault(); startMusic(); handleLetter(ch); });
      r.appendChild(b);
      brew.keys[ch] = b;
    }
    box.appendChild(r);
  }
  const tip = document.createElement("div");
  tip.className = "type-tip";
  tip.textContent = "⌨️ Type the letters";
  box.appendChild(tip);
  box.classList.toggle("tucked", !screenKeysWanted());
  $("brewPeek").disabled = false;
  renderSlots();
  applyView();                                    // the panel is taller now
  sfx.reward();
  const heard = willBeHeard(w.text);
  if (!save.tips.hear) {
    save.tips.hear = 1; persist();
    caption(heard ? "⭐ Star challenge! This word is hiding. Listen… and spell it yourself!" : "⭐ Star challenge! This word is hiding. Can you spell it yourself?", 5200, true);
  } else caption(heard ? "⭐ Star challenge! Listen… and spell it." : "⭐ Star challenge! Can you spell it?", 2600, true);
  say(w.text, { rate: 0.75, queue: true });
}

/** Tuck the challenge keyboard away while a real one is being typed on, and bring it back for a finger. */
function brewKeysRefresh() {
  if (!brew.challenge || brew.phase !== "spell") return;
  $("brewTiles").classList.toggle("tucked", !screenKeysWanted());
  renderSlots();
  applyView();
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
  box.className = "";
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
  if (brew.challenge) {
    // say it again after two slips, and light up the next letter after three — nobody gets stuck
    if (brew.wrong === 2) say(brew.word.text, { rate: 0.7 });
    if (brew.wrong >= 3) {
      const key = brew.keys[brew.word.graphemes[brew.slot].t[brew.inG]];
      if (key) key.classList.add("glow");
      brew.helped = true;
      renderSlots();                              // with no screen keys to light up, the letter shows faintly in its place
    }
  } else if (brew.wrong >= 2) {
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
    if (brew.challenge) { brew.keys[ch].classList.remove("glow"); brew.wrong = 0; }
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
  // a challenge word written with no peeking and no lit-up letters earns a star of its own
  const aced = brew.challenge && brew.peeks === 0 && !brew.helped;
  if (aced) {
    brew.aced.push(w.text);
    save.aced = (save.aced || 0) + 1;
    toast("⭐ Super speller!");
    witch.userData.wandTip.getWorldPosition(tmpV2);
    burst(tmpV2.clone(), [0xffe27a, 0xffffff, 0xffc2e2], 26, 3.4);
    later(() => sfx.reward(), 350);
  }
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
    else brewNext();
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
  save.dry = flight.newCritters.length ? 0 : (save.dry || 0) + 1;
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
