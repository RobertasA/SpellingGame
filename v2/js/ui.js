"use strict";
/* =====================================================================
   Screens: title, map, dress up, friends, story, grown-ups, level end
   ===================================================================== */

/* ---------------------------- small helpers --------------------------- */

function showScreen(id) {
  document.querySelectorAll(".overlay").forEach(o => o.classList.toggle("active", o.id === id));
}
function showPanel(id) {
  document.querySelectorAll(".panel").forEach(o => o.classList.toggle("active", o.id === id));
}

let toastTimer = null;
function toast(html, ms = 2400) {
  const t = $("toast");
  t.innerHTML = html;
  t.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove("show"), ms);
}
let hintTimer = null;
function hint(text, ms = 4000) {
  const h = $("hint");
  h.textContent = text;
  h.classList.add("show");
  clearTimeout(hintTimer);
  hintTimer = setTimeout(() => h.classList.remove("show"), ms);
}
let bannerTimer = null;
function banner(html, ms = 3000) {
  const b = $("banner");
  b.innerHTML = html;
  b.classList.add("show");
  clearTimeout(bannerTimer);
  bannerTimer = setTimeout(() => b.classList.remove("show"), ms);
}
let captionTimer = null;
/** A line of story: shown on screen and read aloud. */
function caption(text, ms = 3000, high = false, speak = true) {
  const c = $("caption");
  $("captionText").textContent = text;
  // "high" captions sit just above whichever panel is open
  const panel = high && document.querySelector(".panel.active");
  c.style.bottom = panel ? (panel.offsetHeight + 26) + "px" : "";
  c.classList.add("show");
  clearTimeout(captionTimer);
  captionTimer = setTimeout(() => c.classList.remove("show"), ms);
  if (speak) say(text, { rate: 0.9, pitch: 1.15, patience: 6000 });
}
function clearMessages() {
  for (const id of ["caption", "banner", "hint", "toast"]) $(id).classList.remove("show");
}

/** Dip to dark for a moment so a change of scene doesn't pop. */
let curtainEl = null;
function curtain(fn) {
  if (!curtainEl) {
    curtainEl = document.createElement("div");
    curtainEl.style.cssText = "position:fixed;inset:0;background:#2a1b63;z-index:40;opacity:0;pointer-events:none;transition:opacity .22s";
    document.body.appendChild(curtainEl);
  }
  curtainEl.style.pointerEvents = "auto";
  curtainEl.style.opacity = "1";
  setTimeout(() => {
    fn();
    applyView(true);
    setTimeout(() => { curtainEl.style.opacity = "0"; curtainEl.style.pointerEvents = "none"; }, 60);
  }, 230);
}

function leaveEverything() {
  clearBrewTimers();
  endCutscene();
  clearStars();
  clearShowcase();
  clearHomeStars();
  endStory();
  hush();
  clearMessages();
  paused = false;
  witchAnim.override = null;
  witchAnim.celebrate = 0;
  flight.arriving = false;
  keyClockStop();
  $("hud").classList.remove("active");
  $("friendsBar").classList.remove("active");
  showKeyboard(false);
  glowKey(null);
  showPanel(null);
  showScreen(null);
  document.querySelectorAll(".fly").forEach(e => e.remove());
}

/* -------------------------------- title ------------------------------- */

function goTitle() {
  leaveEverything();
  clearHomeStars();
  mode = "title";
  currentPlace = LEVELS[nextLevel() - 1].place;
  setBiome(currentPlace);
  stage.visible = false;
  rebuildCrew();
  gatherVisitors();
  layoutCrew();
  setSkyFullness(skyFullness());
  showScreen("titleScreen");
  $("playBtn").textContent = Object.keys(save.stars).length ? "▶ Play" : "▶ Start";
  applyView();
}

/* --------------------------------- map -------------------------------- */

function openMap(p, speak = true) {
  leaveEverything();
  clearHomeStars();
  mode = "map";
  currentPlace = clamp(p, 0, PLACES.length - 1);
  setBiome(currentPlace);
  setStage(currentPlace);
  stage.visible = true;
  rebuildCrew();
  layoutCrew();
  setSkyFullness(skyFullness());
  showPanel("mapUI");
  renderMap();
  applyView();
  const place = PLACES[currentPlace];
  if (speak) say(save.helped[place.id] ? place.thanks : place.plea + " " + place.need, { rate: 0.9, pitch: 1.15, cut: true });
}

function potionRowHTML(p, freshStep = -1) {
  const place = PLACES[p];
  let html = `<span class="label-text">${place.potion}</span>`;
  let all = true;
  for (let i = 0; i < LEVELS_PER_PLACE; i++) {
    const got = !!save.stars[p * LEVELS_PER_PLACE + i + 1];
    all = all && got;
    html += `<div class="slot${got ? " got" : ""}${i === freshStep ? " fresh" : ""}">${got ? place.ingredients[i] : ""}</div>`;
  }
  html += `<span class="bottle${all ? " ready" : ""}">🧪</span>`;
  return html;
}

/** Who has popped out to say hello in this place — and how many are still hiding. */
function visitorRowHTML(p) {
  const slots = CRITTERS.filter(c => c.place === p).map(c => save.critters[c.id]
    ? `<span class="slot got" title="${c.name} the ${c.animal}">${c.emoji}</span>`
    : `<span class="slot hiding" title="Someone is still hiding here…">?</span>`).join("");
  return `<span class="visitors"><span class="label-text">🐾 Visitors</span>${slots}</span>`;
}
function renderMap() {
  const p = currentPlace, place = PLACES[p];
  $("mapEmoji").textContent = place.emoji;
  $("mapName").textContent = place.name;
  $("mapStage").textContent = place.stage;
  $("mapPlea").textContent = save.helped[place.id] ? place.thanks : `${place.plea} ${place.need}`;
  $("mapPotion").innerHTML = potionRowHTML(p) + visitorRowHTML(p);
  $("mapPrev").disabled = p === 0;
  $("mapNext").disabled = p === PLACES.length - 1;
  const row = $("mapLevels");
  row.innerHTML = "";
  const next = nextLevel();
  for (let i = 0; i < LEVELS_PER_PLACE; i++) {
    const lv = LEVELS[p * LEVELS_PER_PLACE + i];
    const locked = !levelUnlocked(lv.n);
    const stars = save.stars[lv.n] || 0;
    const b = document.createElement("button");
    b.className = locked ? "locked" : ["", "sky", "mint", "pink", "ghost"][i];
    if (!locked && lv.n === next && !stars) b.classList.add("next");
    b.innerHTML = `${locked ? "🔒" : lv.n}<span class="focus">${lv.focus}</span><span class="stars">${"⭐".repeat(stars)}</span>`;
    b.disabled = locked;
    b.addEventListener("click", () => { startMusic(); curtain(() => startLevel(lv.n)); });
    row.appendChild(b);
  }
}

/* ------------------------------ level end ----------------------------- */

function newUnlocks(before, after) {
  const out = [];
  const scan = (list, kind) => list.forEach(item => { if (item.stars > before && item.stars <= after) out.push(`${kind}: ${item.name}`); });
  scan(OUTFITS, "🎩 New outfit");
  scan(CATS, "🐱 New cat");
  scan(TRAILS, "✨ New sparkles");
  return out;
}

function showComplete() {
  endCutscene();
  mode = "complete";
  const level = flight.level, place = PLACES[level.place];
  const { stars } = flight.result;
  const helped = !!save.helped[place.id];
  const last = level.n === LEVELS.length;
  rebuildCrew();
  layoutCrew();
  const titles = ["Sparkly spelling! ✨", "Wonderful! 🌙", "Magic! ✨", "Hooray! 🎉", "Star spelling! ⭐"];
  $("completeTitle").textContent = last && helped ? "You are a Star Witch! 👑" : pick(titles);
  $("completeStars").innerHTML = [1, 2, 3].map(i => `<span class="${i <= stars ? "" : "dim"}">⭐</span>`).join("");
  let stats = `⭐ Stars sent home: <b>${flight.sent}</b>`;
  if (flight.missed) stats += `<br>💫 Stars that hid: <b>${flight.missed}</b>`;
  for (const id of flight.newCritters) { const c = CRITTER_BY_ID[id]; stats += `<br>${c.emoji} New friend: <b>${c.name}</b> the ${c.animal}!`; }
  // something to come back for
  if (!flight.newCritters.length && CRITTERS.some(c => c.place === level.place && !save.critters[c.id])) stats += `<br>🐾 Someone is still hiding in the ${place.name}…`;
  if (brew.aced.length) stats += `<br>🌟 Star challenge: you spelled <b style="font-family:var(--word-font)">${brew.aced.join(", ")}</b> all by yourself!`;
  if (placeDone(level.place) && helped) stats += `<br>${FRIEND_INFO[place.friend].emoji} <b>${place.friendName}</b> is your friend!`;
  $("completeStats").innerHTML = stats;
  $("completePotion").innerHTML = potionRowHTML(level.place, level.step);
  const unlocks = newUnlocks(flight.starsBefore, starCount());
  $("completeUnlocks").innerHTML = unlocks.length ? "You found something new to wear!<br>" + unlocks.join("<br>") : "";
  $("nextBtn").style.display = last ? "none" : "";
  showScreen("completeScreen");
  applyView();
  sfx.reward();
  if (unlocks.length) setTimeout(() => say("You found something new to wear!"), 900);
}

function showDrillDone() {
  $("hud").classList.remove("active");
  $("completeTitle").textContent = pick(["Clever fingers! ⌨️", "Speedy keys! ✨", "Key star! ⭐"]);
  $("completeStars").innerHTML = "";
  let stats = `⭐ Stars sent home: <b>${flight.sent}</b>`;
  const kc = (list) => list.map(ch => `<b class="kc">${ch}</b>`).join(" ");
  if (flight.learnt.length) stats += `<br>🌟 Now you know where ${kc(flight.learnt)} ${flight.learnt.length > 1 ? "are" : "is"}!`;
  for (const id of flight.newCritters) { const c = CRITTER_BY_ID[id]; stats += `<br>${c.emoji} New friend: <b>${c.name}</b> the ${c.animal}!`; }
  const focus = focusKeys();
  persist();
  if (focus.length) stats += `<br>⌨️ Keys to find next time: ${kc(focus)}`;
  else stats += `<br>⌨️ You know every key so far!`;
  $("completeStats").innerHTML = stats;
  $("completePotion").innerHTML = "";
  $("completeUnlocks").innerHTML = "";
  $("nextBtn").style.display = "none";
  showScreen("completeScreen");
  sfx.reward();
}

function nextAfterComplete() {
  const n = flight.level.n;
  const next = LEVELS[n];
  if (!next) return;
  if (next.place !== flight.level.place) curtain(() => openMap(next.place));
  else curtain(() => startLevel(n + 1));
}

/* -------------------------------- pause ------------------------------- */

function togglePause() {
  if (mode !== "flight" && mode !== "brew") return;
  paused = !paused;
  keyClockStop();
  showScreen(paused ? "pauseScreen" : null);
  if (mode === "flight") { showKeyboard(!paused); $("keyMap").classList.toggle("show", !paused && !!keyMapLit); }
  if (paused) hush();
}

/* ------------------------- on-screen keyboard ------------------------- */

const touchDevice = window.matchMedia("(pointer: coarse)").matches;
const KBD_LAYOUTS = { qwerty: ["qwertyuiop", "asdfghjkl", "zxcvbnm"], abc: ["abcdefghi", "jklmnopqr", "stuvwxyz"] };
const keyEls = {};
function buildKeyboard() {
  const kbd = $("kbd");
  kbd.innerHTML = "";
  for (const row of KBD_LAYOUTS[save.kbd] || KBD_LAYOUTS.qwerty) {
    const r = document.createElement("div");
    r.className = "row";
    for (const ch of row) {
      const b = document.createElement("button");
      b.textContent = ch;
      if ("aeiou".includes(ch)) b.className = "vowel";
      b.addEventListener("pointerdown", (e) => { e.preventDefault(); startMusic(); handleLetter(ch); });
      r.appendChild(b);
      keyEls[ch] = b;
    }
    kbd.appendChild(r);
  }
}
/* The on-screen keyboard is only for children with no real one. A touch screen is a first guess;
   after that, whatever was used last decides: typing a letter on a real keyboard tucks the screen
   keys away, and touching the screen while spelling brings them back. */
let realKeys = typeof save.realKeys === "boolean" ? save.realKeys : !touchDevice;
function screenKeysWanted() { return save.showKbd === "always" || !realKeys; }
function setRealKeys(on) {
  if (realKeys === on) return;
  realKeys = on;
  save.realKeys = on; persist();
  refreshScreenKeys();
}
function refreshScreenKeys() {
  if (mode === "flight") { showKeyboard(!paused); glowKey(glowCh); applyView(); }
  else if (mode === "brew") brewKeysRefresh();
}
function showKeyboard(on) {
  const show = on && screenKeysWanted();
  $("kbd").classList.toggle("active", show);
  document.documentElement.style.setProperty("--kbd-h", show ? $("kbd").offsetHeight + "px" : "0px");
}
let glowing = null, glowCh = null;
/** Point out a key: on the screen keyboard if it is showing, otherwise on a little picture of a real one. */
function glowKey(ch) {
  glowCh = ch || null;
  if (glowing) glowing.classList.remove("glow");
  glowing = ch ? keyEls[ch] : null;
  if (glowing) glowing.classList.add("glow");
  showKeyMap(ch && !$("kbd").classList.contains("active") ? ch : null);
}
/* A small picture of a real keyboard (always q w e r t y, with the bumps on f and j), with one key lit:
   where to look when the letter can't be found. */
const keyMapEls = {};
function buildKeyMap() {
  const map = $("keyMap");
  KBD_LAYOUTS.qwerty.forEach((row, r) => {
    const div = document.createElement("div");
    div.className = "row r" + r;
    for (const ch of row) {
      const k = document.createElement("i");
      k.textContent = ch;
      if (ch === "f" || ch === "j") k.className = "bump";
      div.appendChild(k);
      keyMapEls[ch] = k;
    }
    map.appendChild(div);
  });
  const space = document.createElement("div");
  space.className = "row space";
  space.appendChild(document.createElement("i"));
  map.appendChild(space);
}
let keyMapLit = null;
function showKeyMap(ch) {
  if (keyMapLit) keyMapLit.classList.remove("lit");
  keyMapLit = ch ? keyMapEls[ch] : null;
  if (keyMapLit) keyMapLit.classList.add("lit");
  $("keyMap").classList.toggle("show", !!keyMapLit);
  document.documentElement.style.setProperty("--map-h", keyMapLit ? ($("keyMap").offsetHeight + 8) + "px" : "0px");   // messages sit above it
}
function flashKey(ch) {
  const b = keyEls[ch];
  if (!b) return;
  b.classList.add("down");
  setTimeout(() => b.classList.remove("down"), 120);
}

/* ------------------------------ dress up ------------------------------ */

const WARDROBE = [
  { key: "outfit", label: "🎩 Outfit", list: OUTFITS, css: (o) => `linear-gradient(160deg, ${hex(o.hat)} 0 50%, ${hex(o.dress)} 50%)` },
  { key: "hair", label: "💇 Hair", list: HAIRS, css: (o) => hex(o.c) },
  { key: "skin", label: "🙂 Skin", list: SKINS.map(c => ({ c })), css: (o) => hex(o.c) },
  { key: "cat", label: "🐱 Cat", list: CATS, css: (o) => `radial-gradient(circle at 50% 70%, ${hex(o.belly)} 0 30%, ${hex(o.fur)} 32%)` },
  { key: "trail", label: "✨ Sparkles", list: TRAILS, css: (o) => `conic-gradient(${o.colors.map(hex).join(", ")}, ${hex(o.colors[0])})` },
];
function hex(n) { return "#" + n.toString(16).padStart(6, "0"); }
let wardrobeTab = 0;

function openWardrobe() {
  leaveEverything();
  mode = "wardrobe";
  stage.visible = false;
  layoutCrew();
  showPanel("wardrobeUI");
  $("nameInput").value = save.name;
  renderWardrobe();
  applyView();
}
function renderWardrobe() {
  const tabs = $("wardrobeTabs");
  tabs.innerHTML = "";
  WARDROBE.forEach((w, i) => {
    const b = document.createElement("button");
    b.textContent = w.label;
    if (i === wardrobeTab) b.className = "on";
    b.addEventListener("click", () => { wardrobeTab = i; sfx.tick(); renderWardrobe(); });
    tabs.appendChild(b);
  });
  const tab = WARDROBE[wardrobeTab];
  const box = $("wardrobeSwatches");
  box.innerHTML = "";
  const have = starCount();
  tab.list.forEach((item, i) => {
    const b = document.createElement("button");
    const locked = !save.unlockAll && (item.stars || 0) > have;
    b.style.background = tab.css(item);
    if (save.look[tab.key] === i) b.classList.add("on");
    if (locked) { b.classList.add("locked"); b.innerHTML = `<span class="lock">⭐<br>${item.stars}</span>`; }
    b.title = item.name || "";
    b.addEventListener("click", () => {
      if (locked) {
        sfx.wrong();
        toast(`Collect ${item.stars} ⭐ to wear this!<br><small>You have ${have}.</small>`);
        return;
      }
      save.look[tab.key] = i;
      persist();
      rebuildWitch();
      sfx.pop();
      burst(witch.position.clone().add(new THREE.Vector3(0, 0.8, 0.5)), [0xffe27a, 0xffffff, 0xff9ccf], 14, 2.5);
      witchAnim.hop = 1;
      renderWardrobe();
    });
    box.appendChild(b);
  });
}
function saveName() {
  const v = $("nameInput").value.replace(/[^\p{L} '-]/gu, "").trim().slice(0, 10);
  save.name = v || "Hazel";
  $("nameInput").value = save.name;
  persist();
}

/* ------------------------------- friends ------------------------------ */

let showcase = [];
function openFriends() {
  leaveEverything();
  mode = "friends";
  stage.visible = false;
  layoutCrew();
  $("friendsBar").classList.add("active");
  const n = PLACES.filter(p => save.helped[p.id]).length;
  $("friendsTitle").textContent = `💛 My friends · ${n} / ${PLACES.length}`;
  $("visitorsPill").innerHTML = `🐾 Visitors · ${CRITTERS.filter(c => save.critters[c.id]).length} / ${CRITTERS.length}<br>` +
    CRITTERS.map(c => save.critters[c.id] ? `<span title="${c.name} the ${c.animal}">${c.emoji}</span>` : `<span class="hiding">?</span>`).join("");
  const narrow = aspect() < 1;
  PLACES.forEach((place, i) => {
    const helped = !!save.helped[place.id];
    const m = buildFriend(place.friend);
    setFriendHelped(m, helped);
    const col = narrow ? i % 3 : i, row = narrow ? Math.floor(i / 3) : 0;
    const cols = narrow ? 3 : 6;
    m.position.set((col - (cols - 1) / 2) * (narrow ? 2.6 : 2.3), 0, narrow ? 2.4 - row * 4.6 : (i % 2 ? 1.2 : 0));
    m.scale.setScalar(1.4);
    scene.add(m);
    const el = document.createElement("div");
    el.className = "label";
    el.innerHTML = `<div class="name-tag">${helped ? "💛 " : ""}${place.friendName}<small>${helped ? "your friend" : "needs a " + place.potion}</small></div>`;
    el.firstChild.addEventListener("click", () => {
      startMusic();
      caption(helped ? place.thanks : place.plea, 3600);
      if (helped) { sfx.heart(); hearts(m.position.clone().add(new THREE.Vector3(0, 1.6, 0)), 6); }
    });
    labelsEl.appendChild(el);
    showcase.push({ m, el });
  });
  applyView();
  if (!n) hint("Brew potions to help the friends of the wood 💛", 5000);
}
function clearShowcase() {
  for (const { m, el } of showcase) { discard(m); el.remove(); }
  showcase = [];
}
function updateShowcase(dt) {
  for (const { m } of showcase) {
    animateFriend(m, clock, dt, 1);
    friendFx(m, dt);
    m.rotation.y = Math.sin(clock * 1.2 + m.userData.phase) * 0.3;
  }
}

/* -------------------------------- story ------------------------------- */

const story = { steps: [], i: -1, view: null, speed: 0, actors: [], rain: false, then: null };

function introSteps() {
  const cat = (CATS[save.look.cat] || CATS[0]).name;
  let dragon = null;
  return [
    { text: `This is ${save.name}, a little witch, and her cat, ${cat}.`, speed: 1.2, view: null,
      run() { witchAnim.hop = 1; setSkyFullness(1); } },
    { text: STORY_LINES.tickle, speed: 0,
      view: () => [new THREE.Vector3(1.5, 2.6, 12.5), new THREE.Vector3(2.4, 1.3, 0)],
      run() {
        dragon = buildFriend("dragon");
        dragon.scale.setScalar(1.9);
        dragon.position.set(4.4, 0, 0.4);
        dragon.rotation.y = -0.6;
        scene.add(dragon);
        story.actors.push(dragon);
        witchAnim.override = new THREE.Vector3(-1.6, 2.0, 0.6);
      } },
    { text: STORY_LINES.achoo, speed: 0,
      view: () => [new THREE.Vector3(1.5, 2.6, 12.5), new THREE.Vector3(2.4, 1.3, 0)],
      run() {
        sfx.sneeze();
        setTimeout(() => {
          if (mode !== "story") return;
          cam.shake = 0.7;
          dragon.userData.sneeze = 1;
          setSkyFullness(-1);
          story.rain = true;
          const p = new THREE.Vector3(3.6, 1.8, 1.2);
          burst(p, [0xffffff, 0xffe27a, 0xbfe6ff], 40, 7);
          for (let i = 0; i < 12; i++) emit({ pos: p, vel: new THREE.Vector3(rand(-5, -1), rand(0.5, 3), rand(-1, 1)), color: 0xffffff, size: rand(0.6, 1.2), life: 1, tex: dotTex, grow: 1.5, drag: 0.93 });
        }, 350);
      } },
    { text: STORY_LINES.fall, speed: 0.6, view: null,
      run() { witchAnim.override = null; } },
    { text: `Can you help ${save.name} spell them home?`, speed: 1.2, view: null, last: true,
      run() { story.rain = false; witchAnim.celebrate = 0.001; } },
  ];
}

function startStory(steps, then) {
  leaveEverything();
  mode = "story";
  stage.visible = false;
  layoutCrew();
  Object.assign(story, { steps, i: -1, then, actors: [], rain: false, view: null, speed: 0 });
  showPanel("storyUI");
  storyNext();
}
function storyNext() {
  if (mode !== "story") return;
  story.i++;
  const step = story.steps[story.i];
  if (!step) { finishStory(); return; }
  story.view = step.view;
  story.speed = step.speed || 0;
  $("storyText").textContent = step.text;
  $("storyNext").textContent = step.last ? "Let's go! ▶" : "▶";
  say(step.text, { rate: 0.9, pitch: 1.15, cut: true });
  step.run?.();
  applyView();
  sfx.tick();
}
function endStory() {
  for (const a of story.actors) discard(a);
  story.actors = [];
  story.rain = false;
  story.view = null;
}
function finishStory() {
  const then = story.then;
  story.then = null;
  save.seenIntro = true;
  persist();
  curtain(() => { endStory(); then ? then() : goTitle(); });
}
function updateStory(dt) {
  if (mode !== "story") return;
  for (const a of story.actors) {
    animateFriend(a, clock, dt, 1);
    friendFx(a, dt);
    if (a.userData.sneeze > 0) {
      a.userData.sneeze = Math.max(0, a.userData.sneeze - dt * 1.5);
      a.userData.head.rotation.x = Math.sin(a.userData.sneeze * Math.PI) * 0.7;
    }
  }
  if (story.rain && Math.random() < dt * 26) {
    // stars tumbling out of the sky
    const c = pick(STAR_COLORS).hex;
    emit({ pos: new THREE.Vector3(rand(-12, 14), rand(8, 11), rand(-8, 2)), vel: new THREE.Vector3(rand(-2.5, -1), rand(-6, -4), 0),
           color: c, size: rand(0.4, 0.8), life: 2, spin: rand(-3, 3), add: true });
  }
}

/* ------------------------------ grown-ups ----------------------------- */

function openGrown() {
  renderGrown();
  showScreen("grownScreen");
}
function renderGrown() {
  const settings = [
    ["On-screen keyboard letters", () => save.kbd === "abc" ? "a b c" : "q w e r t y", () => { save.kbd = save.kbd === "abc" ? "qwerty" : "abc"; buildKeyboard(); }],
    ["Show the on-screen keyboard", () => save.showKbd === "always" ? "Always" : "Only without a real keyboard", () => { save.showKbd = save.showKbd === "always" ? "auto" : "always"; }],
    ["Glow the next letter when stuck", () => save.helper ? "On" : "Off", () => { save.helper = !save.helper; }],
    ["Brewing (a star challenge is heard, not shown)", () => ({ mix: "Last word is a star challenge", look: "Always look first", hear: "Star challenges only" })[save.brewMode] || "Last word is a star challenge", () => {
      const order = ["mix", "look", "hear"];
      save.brewMode = order[(order.indexOf(save.brewMode) + 1) % order.length];
    }],
    ["Graphics (Auto steps down on slower tablets)", () => ({ auto: "Auto", best: "Best", medium: "Medium", fast: "Fast" })[save.gfx] || "Auto", () => {
      const order = ["auto", "best", "medium", "fast"];
      save.gfx = order[(order.indexOf(save.gfx) + 1) % order.length];
      quality.auto = save.gfx === "auto";
      quality.level = save.gfx === "auto" ? 2 : QUALITY_LEVELS.findIndex(q => q.name === save.gfx);
      quality.slow = 0; quality.frames = 0;
      applyQuality();
    }],
    ["Unlock every level and outfit", () => save.unlockAll ? "On" : "Off", () => { save.unlockAll = !save.unlockAll; }],
  ];
  renderVoiceSetting();
  $("version").textContent = `Little Star Witch ${VERSION}`;
  const box = $("settings");
  box.innerHTML = "";
  for (const [label, value, toggle] of settings) {
    const l = document.createElement("div");
    l.textContent = label;
    const b = document.createElement("button");
    b.className = "ghost";
    b.textContent = value();
    b.addEventListener("click", () => { toggle(); persist(); b.textContent = value(); setIcons(); });
    box.append(l, b);
  }
  const wob = wobblyWords().slice(0, 24);
  $("wobbly").innerHTML = wob.length
    ? `These words have hidden or needed a few tries. They will pop up again while playing: <b style="font-family:var(--word-font)">${wob.join(", ")}</b>`
    : "Nothing yet — words that prove tricky will be listed here, and will come back for another go.";
  if (save.aced) $("wobbly").innerHTML += `<br>🌟 Star challenges spelled with no peeking and no help: <b>${save.aced}</b>`;
  renderKeyStats();
  let html = "";
  PLACES.forEach((place, p) => {
    html += `<div class="place">${place.emoji} ${place.name} · ${place.stage}</div>`;
    for (let i = 0; i < LEVELS_PER_PLACE; i++) {
      const lv = LEVELS[p * LEVELS_PER_PLACE + i];
      html += `<div class="lv"><span>${lv.n}${save.stars[lv.n] ? " ✓" : ""}</span><b>${lv.focus}</b><span>${lv.nc}</span></div>`;
    }
  });
  $("curriculum").innerHTML = html;
}

/** Where each key has got to in key practice, set out in order of how common the letters are in English. */
function keyLearningHTML() {
  const intro = introducedKeys(), focus = focusKeys();
  const state = (ch) => !intro.includes(ch) ? "later" : focus.includes(ch) ? "focus" : keyBox(ch) >= KEY_KNOWN ? "known" : "wait";
  const tip = { later: "not met in the levels yet", focus: "being practised now", known: "known", wait: "waiting its turn" };
  const known = intro.split("").filter(ch => keyBox(ch) >= KEY_KNOWN).length;
  const chips = LETTER_FREQ.split("").map(ch => `<i class="${state(ch)}" title="${ch}: ${tip[state(ch)]}">${ch}</i>`).join("");
  return `<p class="note">${focus.length ? `Practising now: ${focus.map(ch => `<b class="kc">${ch}</b>`).join(", ")}. ` : ""}Known: <b>${known}</b> of the ${intro.length} keys met so far.</p>
    <div class="key-freq">${chips}</div>
    <p class="note key-legend"><span class="sw known"></span>known <span class="sw focus"></span>practising now <span class="sw wait"></span>waiting its turn <span class="sw later"></span>not met yet</p>
    <p class="note small">The letters above are in order of how common they are in English, most common first.
      <b>⌨️ Keys</b> on the title page is a short practice with one letter on each star. It works on at most ${FOCUS_MAX} keys at a time: those come round most often,
      a key found quickly and without help a few times counts as known, and then the next one joins. Known keys come back less and less often, and a key
      that goes wrong or slow comes back sooner. Until every key has been met in the levels, new keys join in the order the levels teach them
      (<span class="kc">${KEY_ORDER.split("").join(" ")}</span>); after that, the most common letters go first.
      When a letter can't be found, a little picture of the keyboard shows where it is (with "Glow the next letter when stuck" on).</p>`;
}

/** Which keys are slow to find, or often mixed up: a little keyboard coloured by speed, then the details. */
const KEY_MIN_TIMES = 3;        // fewer timings than this and a key is left grey
function renderKeyStats() {
  const box = $("keyStats");
  const stats = {};
  for (const [ch, k] of Object.entries(save.keys || {})) {
    if (!/^[a-z]$/.test(ch)) continue;
    stats[ch] = { med: k.t.length >= KEY_MIN_TIMES ? median(k.t) : null, n: k.t.length, miss: k.miss || 0, mix: k.mix || {} };
  }
  const timed = Object.entries(stats).filter(([, s]) => s.med != null);
  if (!timed.length && !Object.values(stats).some(s => s.miss)) {
    box.innerHTML = keyLearningHTML() + `<p class="note">No timings yet — after a few words have been typed, this shows which keys take longest to find.</p>`;
    return;
  }
  // colours are against this child's own usual speed, not a target
  const typical = timed.length ? median(timed.map(([, s]) => s.med)) : 0;
  const shade = (s) => !s || s.med == null ? "none" : s.med > typical * 1.6 ? "slow" : s.med > typical * 1.2 ? "meh" : "ok";
  const secs = (ms) => (ms / 1000).toFixed(1) + " s";
  let html = `<div class="key-map">`;
  for (const row of KBD_LAYOUTS[save.kbd] || KBD_LAYOUTS.qwerty) {
    html += `<div class="row">`;
    for (const ch of row) {
      const s = stats[ch];
      const tip = s ? `${ch}: ${s.med != null ? secs(s.med) + " typical" : "not enough yet"}, ${s.miss} wrong key${s.miss === 1 ? "" : "s"}` : `${ch}: not typed yet`;
      html += `<div class="k ${shade(s)}" title="${tip}"><b>${ch}</b><small>${s && s.med != null ? secs(s.med) : ""}</small>${s && s.miss ? `<i>${s.miss}✗</i>` : ""}</div>`;
    }
    html += `</div>`;
  }
  html += `</div><p class="note key-legend"><span class="sw ok"></span>usual <span class="sw meh"></span>a bit slow <span class="sw slow"></span>slow <span class="sw none"></span>not enough yet
    · ✗ = a different key was pressed when this one was wanted</p>`;

  const lines = [];
  const slow = timed.filter(([, s]) => s.med > typical * 1.2).sort((a, b) => b[1].med - a[1].med).slice(0, 6);
  if (timed.length) lines.push(`Usual time to find a key: <b>${secs(typical)}</b>.`);
  if (slow.length) lines.push(`Slowest to find: ${slow.map(([ch, s]) => `<b class="kc">${ch}</b> ${secs(s.med)}`).join(", ")}.`);
  const mixes = [];
  for (const [ch, s] of Object.entries(stats)) for (const [got, n] of Object.entries(s.mix)) mixes.push([ch, got, n]);
  mixes.sort((a, b) => b[2] - a[2]);
  const top = mixes.filter(m => m[2] >= 2).slice(0, 6);
  if (top.length) lines.push(`Often pressed by mistake: ${top.map(([want, got, n]) => `<b class="kc">${got}</b> for <b class="kc">${want}</b> (${n}×)`).join(", ")}.`);
  html += `<p class="note">${lines.join("<br>")}</p>
    <p class="note small">Each key is timed from the letter before it in the same word, so reading time is left out; the first letter of a word is never timed.
      In key practice a letter is timed from when its star pops out. Only the last ${KEY_KEEP} times for each key count, so this follows your child as they improve.</p>
    <button class="ghost small" id="keyStatsClear">Clear key timings and practice</button>`;
  box.innerHTML = keyLearningHTML() + html;
  $("keyStatsClear").addEventListener("click", () => {
    if (!confirm("Clear the key timings and key practice? Stars and everything else are kept.")) return;
    save.keys = {}; save.focus = []; save.drills = 0;
    persist();
    renderKeyStats();
  });
}

const VOICE_CHOICES = [["on", "Read aloud"], ["recorded", "Only my recordings"], ["off", "Off — my child reads"]];
function setVoice(mode) {
  if (mode !== "off") save.voiceLast = mode;
  else if (save.voice !== "off") save.voiceLast = save.voice;
  save.voice = mode;
  if (mode === "off") hush();
  persist();
  setIcons();
}
function voiceStatusText() {
  const cat = voiceCatalogue();
  const count = (kind) => { const all = cat.filter(c => c.kind === kind); return [all.filter(c => hasClip(c.text)).length, all.length]; };
  const [w, wn] = count("word"), [l, ln] = count("line");
  return `${w} of ${wn} words and ${l} of ${ln} lines have a recording.`;
}
function renderVoiceSetting() {
  const box = $("voiceSetting");
  box.innerHTML = `<div>Voice-over for words and story</div><div class="tabs"></div>
    <p class="note" id="voiceStatus"></p>
    <p class="note">Want your child to hear your voice instead of the computer's?
      <a class="link" id="voiceStudioLink" href="record.html">🎙️ Record your own voice</a></p>`;
  const tabs = box.querySelector(".tabs");
  for (const [mode, label] of VOICE_CHOICES) {
    const b = document.createElement("button");
    b.textContent = label;
    if (voiceMode() === mode) b.className = "on";
    b.addEventListener("click", () => { setVoice(mode); renderVoiceSetting(); });
    tabs.appendChild(b);
  }
  $("voiceStatus").textContent = voiceStatusText();
}

/* ------------------------------- buttons ------------------------------ */

const VOICE_LABELS = { on: "Reading aloud", recorded: "Reading aloud (my recordings only)", off: "Reading aloud is off" };
function setIcons() {
  document.querySelectorAll(".mute-toggle").forEach(b => {
    b.textContent = save.muted ? "🔇" : "🔊";
    b.classList.toggle("off", save.muted);
  });
  document.querySelectorAll(".voice-toggle").forEach(b => {
    b.textContent = voiceMode() === "off" ? "🤫" : "🗣️";
    b.classList.toggle("off", voiceMode() === "off");
    b.title = VOICE_LABELS[voiceMode()];
  });
}

function wireUI() {
  const on = (id, fn) => $(id).addEventListener("click", () => { startMusic(); fn(); });
  on("playBtn", () => {
    const n = nextLevel();
    if (!save.seenIntro) curtain(() => startStory(introSteps(), () => startLevel(1)));
    else if (LEVELS[n - 1].step === 0 && !save.stars[n]) curtain(() => openMap(LEVELS[n - 1].place));
    else curtain(() => startLevel(n));
  });
  on("mapBtn", () => curtain(() => openMap(LEVELS[nextLevel() - 1].place)));
  on("friendsBtn", () => curtain(openFriends));
  on("dressBtn", () => curtain(openWardrobe));
  on("keysBtn", () => curtain(startDrill));
  on("grownBtn", openGrown);
  on("grownBack", () => { showScreen(mode === "title" ? "titleScreen" : null); if (mode === "title") goTitle(); });
  on("resetBtn", () => {
    if (!confirm("Start again from the very beginning? All stars, friends and outfits will be cleared.")) return;
    keyNews.length = 0;
    const keep = { muted: save.muted, voice: save.voice, voiceLast: save.voiceLast, kbd: save.kbd, showKbd: save.showKbd, realKeys: save.realKeys, helper: save.helper, gfx: save.gfx, brewMode: save.brewMode };
    save = { ...freshSave(), ...keep };
    persist();
    rebuildWitch();
    goTitle();
  });
  on("mapPrev", () => curtain(() => openMap(currentPlace - 1)));
  on("mapNext", () => curtain(() => openMap(currentPlace + 1)));
  on("mapBack", () => curtain(goTitle));
  on("pauseBtn", togglePause);
  on("resumeBtn", togglePause);
  on("quitBtn", () => curtain(() => openMap(currentPlace, false)));
  on("menuBtn", () => curtain(() => openMap(currentPlace, false)));
  on("replayBtn", () => curtain(() => flight.level.drill ? startDrill() : startLevel(flight.level.n)));
  on("nextBtn", nextAfterComplete);
  document.querySelectorAll(".mute-toggle").forEach(b => b.addEventListener("click", () => {
    startMusic();
    save.muted = !save.muted;
    persist();
    setIcons();
    if (save.muted) { music.pause(); hush(); } else playMusic();
  }));
  document.querySelectorAll(".voice-toggle").forEach(b => b.addEventListener("click", () => {
    startMusic();
    if (voiceMode() === "off") {
      setVoice(save.voiceLast);
      toast("I'll read to you! 🗣️");
      say("I'll read to you!", { cut: true });
    } else {
      setVoice("off");
      toast("You read — I'll be quiet 🤫");
    }
  }));
  on("brewSay", () => { if (brew.word) say(brew.word.text, { rate: 0.75, force: true, cut: true }); });
  on("brewPeek", brewPeek);
  on("storyNext", storyNext);
  on("storySkip", finishStory);
  on("friendsBack", () => curtain(goTitle));
  on("wardrobeDone", () => { saveName(); curtain(goTitle); });
  $("nameInput").addEventListener("change", saveName);
  $("nameInput").addEventListener("keydown", (e) => { if (e.key === "Enter") { e.target.blur(); saveName(); } });

  window.addEventListener("pointerdown", startMusic);
  // keep buttons from stealing keyboard focus (space/enter would click them while typing)
  document.addEventListener("mousedown", (e) => { if (e.target.closest("button")) e.preventDefault(); });
}
