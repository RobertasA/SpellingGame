"use strict";
/* =====================================================================
   Main: keyboard input, the frame loop, start-up
   ===================================================================== */

function handleLetter(letter) {
  if (paused) return;
  flashKey(letter);
  if (mode === "flight") flightLetter(letter);
  else if (mode === "brew") brewLetter(letter);
}

window.addEventListener("keydown", (e) => {
  if (e.target && e.target.tagName === "INPUT") return;
  startMusic();
  if (e.key === "Escape") { togglePause(); return; }
  if (e.key === "Backspace") { releaseTarget(); e.preventDefault(); return; }
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  if (mode === "story" && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); if (!e.repeat) storyNext(); return; }
  if (e.key.length === 1 && /[a-z]/i.test(e.key)) {
    if (e.repeat) return;              // a key held down is one press, not a stream of wrong letters
    if (mode === "flight" || mode === "brew") setRealKeys(true);
    handleLetter(e.key.toLowerCase());
  }
});
// a finger on the screen while spelling: the on-screen keys are wanted after all
window.addEventListener("pointerdown", (e) => {
  if (e.pointerType !== "mouse" && (mode === "flight" || mode === "brew") && !paused) setRealKeys(false);
}, true);

document.addEventListener("visibilitychange", () => {
  if (document.hidden && (mode === "flight" || mode === "brew") && !paused) togglePause();
});

/* -------------------------------- loop -------------------------------- */

function update(dt) {
  clock += dt;
  TIME.value = clock;
  let target = 0;
  if (mode === "title") target = 1.2;
  else if (mode === "flight" || mode === "toBrew") target = updateFlight(dt);
  else if (mode === "story") target = story.speed;
  if (!(mode === "toBrew" && flight.arriving)) worldSpeed += (target - worldSpeed) * Math.min(1, dt * 3);
  scrollWorld(worldSpeed * dt);

  updateStars(dt);
  updateWitch(dt);
  updateCrew(dt);
  if (stage.visible) {
    animateFriend(stageFriend, clock, dt, mode === "complete" || mode === "cutscene" ? 1.3 : 1);
    friendFx(stageFriend, dt);
    animateCauldron(cauldron, clock, dt);
  }
  updateCutscene(dt);
  updateShowcase(dt);
  updateStory(dt);
  potLight.intensity += ((stage.visible ? 9 : 0) - potLight.intensity) * Math.min(1, dt * 3);
  animateSky(clock);
  updateParticles(dt);
  updateCamera(dt);
}

function updateLabels() {
  for (const star of flight.stars) {
    if (star.state === "rising" || star.state === "active" || star.state === "miss") project(star.mesh, 0.72, star.label, false, true);
  }
  for (const { m, el } of showcase) project(m, -0.1, el, true);
}

let last = performance.now();
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min((now - last) / 1000, 0.1);
  last = now;
  if (!paused) update(dt);
  renderFrame(dt);
  updateLabels();
}

function resize() {
  const w = window.innerWidth, h = window.innerHeight;
  resizeRenderer();
  resizeWorld();
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  if ($("kbd").classList.contains("active")) document.documentElement.style.setProperty("--kbd-h", $("kbd").offsetHeight + "px");
  applyView(true);
}
window.addEventListener("resize", resize);

/* -------------------------------- start ------------------------------- */

// fetch the word font now, so the first word doesn't flash in a different one
if (document.fonts && document.fonts.load) { document.fonts.load('700 30px "Andika"'); document.fonts.load('600 20px "Fredoka"'); }

applyQuality();
rebuildWitch();
buildKeyboard();
buildKeyMap();
wireUI();
setIcons();
goTitle();
resize();
requestAnimationFrame(frame);
$("loading").remove();

// Offline play once the game has been opened online (only when served over https or localhost).
if ("serviceWorker" in navigator && /^https?:$/.test(location.protocol) && (location.protocol === "https:" || /^(localhost|127\.)/.test(location.hostname))) {
  navigator.serviceWorker.register("sw.js").catch(() => { /* no offline support here — the game still works */ });
}

// Handy for testing from the browser console (and for the automated checks).
window.__game = {
  get mode() { return mode; }, get flight() { return flight; }, get brew() { return brew; }, get save() { return save; },
  startLevel, startDrill, openMap, goTitle, openFriends, openWardrobe,
};
