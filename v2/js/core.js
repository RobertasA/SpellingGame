"use strict";
/* =====================================================================
   Core: tiny helpers, saved progress, sound
   ===================================================================== */

const VERSION = "2.2";
const $ = (id) => document.getElementById(id);
const rand = (a, b) => a + Math.random() * (b - a);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function easeOutBack(t) { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); }
function easeInOut(t) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }

/* ============================ saved progress ============================ */

const SAVE_KEY = "littleStarWitch.v2";
function freshSave() {
  return {
    name: "Hazel",
    look: { skin: 0, hair: 0, outfit: 0, cat: 0, trail: 0 },
    stars: {},            // level number -> best stars (1-3)
    helped: {},           // place id -> true once the friend has their potion
    words: {},            // word -> { ok, slip }   (slip = hid again or needed lots of tries)
    totalStars: 0,        // little stars sent home, ever
    seenIntro: false, seenEnding: false,
    tips: {},             // one-off hints already shown
    muted: false,
    voice: "on",          // read aloud: "on" (recordings, then computer voice), "recorded" (recordings only) or "off"
    voiceLast: "on",      // the on-mode to go back to when the voice button is tapped again
    kbd: "qwerty",        // or "abc"
    showKbd: "auto",      // "auto" (only while no real keyboard is being typed on) or "always"
    realKeys: null,       // was a real keyboard typed on last time? (null = not known yet)
    helper: true,         // glow the next key when stuck
    brewMode: "mix",      // brewing: "mix" (the last word is a star challenge), "look" (always shown first) or "hear" (all challenges)
    aced: 0,              // star challenges spelled with no peeking or help, ever
    critters: {},         // woodland visitor id -> true once it has popped out to say hello
    dry: 0,               // levels played in a row with no new visitor (the next one is then certain)
    gfx: "auto",          // graphics: "auto", "best", "medium" or "fast"
    unlockAll: false,
  };
}
function loadSave() {
  const fresh = freshSave();
  try {
    const s = JSON.parse(localStorage.getItem(SAVE_KEY));
    if (s && typeof s === "object") {
      const merged = { ...fresh, ...s, look: { ...fresh.look, ...(s.look || {}) }, critters: { ...(s.critters || {}) } };
      // older saves had a plain on/off switch called "speak"
      if (s.voice === undefined && s.speak === false) merged.voice = "off";
      delete merged.speak;
      if (!["on", "recorded", "off"].includes(merged.voice)) merged.voice = "on";
      if (merged.voiceLast !== "recorded") merged.voiceLast = "on";
      return merged;
    }
  } catch (e) { /* no storage or corrupted — start fresh */ }
  return fresh;
}
let save = loadSave();
function persist() {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) { /* storage unavailable */ }
}

function starCount() { return Object.values(save.stars).reduce((a, b) => a + b, 0); }
function levelUnlocked(n) {
  if (save.unlockAll || n === 1) return true;
  return (save.stars[n - 1] || 0) > 0;
}
function nextLevel() {
  for (const lv of LEVELS) if (!save.stars[lv.n]) return lv.n;
  return LEVELS.length;
}
function placeDone(p) {
  for (let i = 0; i < LEVELS_PER_PLACE; i++) if (!save.stars[p * LEVELS_PER_PLACE + i + 1]) return false;
  return true;
}
function noteWord(text, ok) {
  const w = save.words[text] || (save.words[text] = { ok: 0, slip: 0 });
  if (ok) w.ok++; else w.slip++;
}
/** Words that have slipped more often than they've been spelled cleanly — worth another go. */
function wobblyWords() {
  return Object.entries(save.words)
    .filter(([, s]) => s.slip > 0 && s.slip * 2 > s.ok)
    .sort((a, b) => (b[1].slip - b[1].ok) - (a[1].slip - a[1].ok))
    .map(([w]) => w);
}

/* ================================ sound ================================ */
/* Every effect is made in code with the Web Audio API, so it works on any
   tablet (no audio formats to worry about) and each letter can ring one note
   higher than the last. The background music is the CC0 loop from v1. */

let actx = null, master = null;
function audio() {
  if (!actx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    actx = new AC();
    master = actx.createGain();
    master.gain.value = 0.55;
    master.connect(actx.destination);
  }
  if (actx.state === "suspended") actx.resume();
  return actx;
}

function tone(freq, { at = 0, dur = 0.3, type = "sine", gain = 0.25, slide = 0, attack = 0.008 } = {}) {
  if (save.muted) return;
  const ac = audio();
  if (!ac) return;
  const t0 = ac.currentTime + at;
  const o = ac.createOscillator(), g = ac.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t0);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq * slide), t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g); g.connect(master);
  o.start(t0); o.stop(t0 + dur + 0.05);
}
/** A soft bell: a sine with a quiet shimmer an octave and a fifth above. */
function bell(freq, at = 0, gain = 0.22, dur = 0.55) {
  tone(freq, { at, dur, gain });
  tone(freq * 2, { at, dur: dur * 0.6, gain: gain * 0.35 });
  tone(freq * 3, { at, dur: dur * 0.3, gain: gain * 0.12 });
}
function whoosh(at = 0, dur = 0.5, gain = 0.25, from = 400, to = 3200) {
  if (save.muted) return;
  const ac = audio();
  if (!ac) return;
  const t0 = ac.currentTime + at;
  const len = Math.floor(ac.sampleRate * dur);
  const buf = ac.createBuffer(1, len, ac.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  const src = ac.createBufferSource();
  src.buffer = buf;
  const f = ac.createBiquadFilter();
  f.type = "bandpass"; f.Q.value = 1.2;
  f.frequency.setValueAtTime(from, t0);
  f.frequency.exponentialRampToValueAtTime(to, t0 + dur);
  const g = ac.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + dur * 0.25);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(f); f.connect(g); g.connect(master);
  src.start(t0);
}

// C major pentatonic, climbing: each right letter rings the next note up
const SCALE = [523.25, 587.33, 659.25, 783.99, 880, 1046.5, 1174.66, 1318.51, 1567.98, 1760, 2093, 2349.32];
const sfx = {
  key(i = 0) { bell(SCALE[Math.min(i, SCALE.length - 1)], 0, 0.2, 0.4); },
  wrong() { tone(220, { dur: 0.16, type: "triangle", gain: 0.16, slide: 0.8 }); tone(196, { at: 0.09, dur: 0.2, type: "triangle", gain: 0.12, slide: 0.8 }); },
  collect() {
    [0, 2, 4, 5, 7].forEach((n, i) => bell(SCALE[n], i * 0.06, 0.2, 0.5));
    whoosh(0.05, 0.6, 0.12, 900, 6000);
  },
  hide() { tone(440, { dur: 0.3, type: "sine", gain: 0.12, slide: 0.5 }); },
  pop() { tone(700, { dur: 0.09, gain: 0.2, slide: 1.8 }); },
  tick() { tone(1200, { dur: 0.04, gain: 0.08, type: "triangle" }); },
  plop() { tone(300, { dur: 0.18, gain: 0.25, slide: 0.4 }); tone(900, { at: 0.1, dur: 0.12, gain: 0.12, slide: 1.6 }); },
  bubble() { tone(rand(380, 620), { dur: 0.12, gain: 0.08, slide: 1.7 }); },
  poof() { whoosh(0, 0.7, 0.35, 250, 2400); [0, 3, 5, 7, 9].forEach((n, i) => bell(SCALE[n], 0.1 + i * 0.07, 0.16, 0.7)); },
  sneeze() { whoosh(0, 0.18, 0.2, 2500, 600); whoosh(0.35, 0.5, 0.45, 300, 5000); tone(180, { at: 0.35, dur: 0.3, type: "sawtooth", gain: 0.12, slide: 0.5 }); },
  reward() { [0, 2, 4, 7].forEach((n, i) => bell(SCALE[n], i * 0.11, 0.24, 0.7)); bell(SCALE[9], 0.5, 0.2, 1.1); },
  complete() {
    const tune = [[0, 0], [2, 0.15], [4, 0.3], [5, 0.45], [4, 0.62], [5, 0.75], [7, 0.9]];
    tune.forEach(([n, t]) => bell(SCALE[n], t, 0.24, 0.6));
    [0, 2, 4].forEach(n => bell(SCALE[n] / 2, 0.9, 0.14, 1.4));
    whoosh(0.85, 0.9, 0.1, 1500, 7000);
  },
  heart() { bell(SCALE[4], 0, 0.18, 0.5); bell(SCALE[7], 0.12, 0.18, 0.7); },
};

const music = new Audio("../assets/audio/music.mp3");
music.loop = true;
const MUSIC_VOLUME = 0.22;      // voice.js dips it while a recording plays
music.volume = MUSIC_VOLUME;
let musicStarted = false;
function playMusic() {
  const p = music.play();
  if (p) p.then(() => { musicStarted = true; }).catch(() => { /* blocked until a gesture */ });
}
function startMusic() {
  audio();
  if (!musicStarted && !save.muted) playMusic();
}
