"use strict";
/* =====================================================================
   Voice: recorded clips first, the computer voice as a fallback
   ---------------------------------------------------------------------
   save.voice is "on" (clips, then the computer voice), "recorded" (clips
   only, otherwise silent) or "off" (nothing is read; the child reads).
   say(..., { force: true }) is for a child tapping a 🔊 button: it beats
   "off" (but never mute).

   Clips come from two places, device recordings winning:
     1. IndexedDB (voiceStore) — recorded in the browser
     2. window.VOICE_MANIFEST (voice/manifest.js) — files in v2/voice/
   Both are keyed by clipSlug(text).
   ===================================================================== */

/* ------------------------------ clip names ------------------------------ */

/** Lower-case words joined with "-", e.g. "Time to brew!" -> "time-to-brew". Long ones end in a hash. */
function clipSlug(text) {
  const full = String(text).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  if (full.length <= 48) return full;
  let h = 2166136261;                      // FNV-1a, 32 bit
  for (let i = 0; i < full.length; i++) h = Math.imul(h ^ full.charCodeAt(i), 16777619);
  return full.slice(0, 48) + "-" + (h >>> 0).toString(16).padStart(8, "0").slice(-6);
}

/* ---------------------- clips recorded on this device -------------------- */

const VOICE_DB = "littleStarWitch.voice", VOICE_STORE = "clips";
const deviceClips = new Map();             // slug -> object URL
let voiceDbPromise = null;

/** Opens the database once; resolves null where IndexedDB is missing or blocked (file://, private mode). */
function voiceDb() {
  if (!voiceDbPromise) {
    voiceDbPromise = new Promise((resolve) => {
      try {
        const req = indexedDB.open(VOICE_DB, 1);
        req.onupgradeneeded = () => req.result.createObjectStore(VOICE_STORE);
        req.onsuccess = () => resolve(req.result);
        req.onerror = req.onblocked = () => resolve(null);
      } catch (e) { resolve(null); }
    });
  }
  return voiceDbPromise;
}
/** Runs fn(store) in a transaction. Resolves true once it is saved, false if there is no database. */
function voiceDbDo(mode, fn) {
  return voiceDb().then((db) => new Promise((resolve) => {
    if (!db) { resolve(false); return; }
    try {
      const tx = db.transaction(VOICE_STORE, mode);
      fn(tx.objectStore(VOICE_STORE));
      tx.oncomplete = () => resolve(true);
      tx.onerror = tx.onabort = () => resolve(false);
    } catch (e) { resolve(false); }
  }));
}
function dropDeviceUrl(slug) {
  const old = deviceClips.get(slug);
  if (!old) return;
  URL.revokeObjectURL(old);
  clipBuffers.delete(old);
}
function setDeviceClip(slug, blob) {
  dropDeviceUrl(slug);
  deviceClips.set(slug, URL.createObjectURL(blob));
}
function loadDeviceClips() {
  return voiceDb().then((db) => new Promise((resolve) => {
    if (!db) { resolve(); return; }
    try {
      const req = db.transaction(VOICE_STORE, "readonly").objectStore(VOICE_STORE).openCursor();
      req.onsuccess = () => {
        const c = req.result;
        if (!c) { resolve(); return; }
        // a clip put() while we were loading is newer than the stored one
        if (c.value instanceof Blob && !deviceClips.has(c.key)) setDeviceClip(c.key, c.value);
        c.continue();
      };
      req.onerror = () => resolve();
    } catch (e) { resolve(); }
  })).catch(() => { /* no stored clips — fine */ });
}

/** The recordings made on this device. The in-memory map always matches what put/remove/clear were told. */
const voiceStore = {
  ready: loadDeviceClips(),
  put(slug, blob) { setDeviceClip(slug, blob); return voiceDbDo("readwrite", (s) => s.put(blob, slug)); },
  remove(slug) {
    dropDeviceUrl(slug);
    deviceClips.delete(slug);
    return voiceDbDo("readwrite", (s) => s.delete(slug));
  },
  has(slug) { return deviceClips.has(slug); },
  url(slug) { return deviceClips.get(slug) || null; },      // an object URL for the recording, to play or copy it
  keys() { return Array.from(deviceClips.keys()); },
  clear() {
    Array.from(deviceClips.keys()).forEach(dropDeviceUrl);
    deviceClips.clear();
    return voiceDbDo("readwrite", (s) => s.clear());
  },
};

/* ------------------------------ finding clips ---------------------------- */

function clipUrl(text) {
  const slug = clipSlug(text);
  if (deviceClips.has(slug)) return deviceClips.get(slug);
  const file = (window.VOICE_MANIFEST || {})[slug];
  return file ? "voice/" + encodeURI(file) : null;
}
function hasClip(text) { return !!clipUrl(text); }

/* ----------------------------- computer voice ---------------------------- */

let voice = null;
function chooseVoice() {
  if (!("speechSynthesis" in window)) return;
  const vs = speechSynthesis.getVoices();
  if (!vs.length) return;
  const score = (v) =>
    (/en[-_]GB/i.test(v.lang) ? 10 : /^en/i.test(v.lang) ? 4 : -100) +
    (/female|serena|martha|kate|libby|sonia|maisie|hazel|susan|google uk english female/i.test(v.name) ? 3 : 0) +
    (v.localService ? 1 : 0);
  voice = vs.slice().sort((a, b) => score(b) - score(a))[0];
  if (voice && score(voice) < 0) voice = null;
}
if ("speechSynthesis" in window) {
  chooseVoice();
  speechSynthesis.addEventListener?.("voiceschanged", chooseVoice);
}
function hasComputerVoice() { return "speechSynthesis" in window && typeof SpeechSynthesisUtterance !== "undefined"; }
/** Stricter: the device really has a voice installed (some have the speech API but nothing to speak with). */
function computerVoiceReady() { return hasComputerVoice() && speechSynthesis.getVoices().length > 0; }

/* ------------------------------- saying it ------------------------------- */

function voiceMode() { return save.voice === "off" || save.voice === "recorded" ? save.voice : "on"; }

/** What say() may use right now: { clip, speech } (clip only counts if one exists), or null for silence. */
function sayPlan(text, force) {
  if (save.muted) return null;
  const mode = voiceMode();
  if (mode === "off" && !force) return null;
  const clip = hasClip(text);
  const speech = hasComputerVoice() && (mode === "on" || (mode === "off" && force));   // "recorded" never uses it
  return clip || speech ? { clip, speech } : null;
}
function canSay(text, force = false) { return !!sayPlan(text, force); }
/** For when the game relies on a word being heard (a spelling challenge): a clip, or a voice that is really there. */
function willBeHeard(text) {
  const plan = sayPlan(text, false);
  return !!plan && (plan.clip || computerVoiceReady());
}
/** Older name: true when the computer voice would read things out. */
function canSpeak() { return !save.muted && voiceMode() === "on" && hasComputerVoice(); }

// One line at a time, whether it is a clip or the computer voice, so "queue" works for both.
const sayQueue = [];
let sayNow = null;

/* While anything is being said the music drops to a murmur and the sound effects step back, so a
   word to be spelled from hearing is never fighting a tune. Both come back shortly after the last
   line ends — not between two lines said one after the other. */
const MUSIC_UNDER_VOICE = 0.12;            // of MUSIC_VOLUME
const SFX_UNDER_VOICE = 0.3;               // of SFX_GAIN
let ducking = 0, duckRelease = 0, musicFade = 0;
function fadeMusic(to) {
  clearInterval(musicFade);
  const from = music.volume, t0 = performance.now();
  musicFade = setInterval(() => {
    const k = Math.min(1, (performance.now() - t0) / 240);
    music.volume = from + (to - from) * k;
    if (k >= 1) clearInterval(musicFade);
  }, 30);
}
function applyDuck(down) {
  fadeMusic(down ? MUSIC_VOLUME * MUSIC_UNDER_VOICE : MUSIC_VOLUME);
  if (master && actx) master.gain.setTargetAtTime(down ? SFX_GAIN * SFX_UNDER_VOICE : SFX_GAIN, actx.currentTime, 0.06);
}
function duck(on) {
  const was = ducking;
  ducking = Math.max(0, ducking + (on ? 1 : -1));
  clearTimeout(duckRelease);
  if (ducking && !was) applyDuck(true);
  else if (!ducking) duckRelease = setTimeout(() => applyDuck(false), 700);
}
function stopClip(job) {
  if (!job.clip) return;
  job.clip = false;
  if (job.source) { job.source.onended = null; try { job.source.stop(); } catch (e) { /* never started */ } job.source = null; }
  if (job.audio) { job.audio.onended = job.audio.onerror = null; job.audio.pause(); job.audio = null; }
}
function stopJob(job) {
  clearTimeout(job.timer);
  stopClip(job);
  if (job.speaking) { job.speaking = false; speechSynthesis.cancel(); }
  if (job.ducked) { job.ducked = false; duck(false); }
}
function finishJob(job) {
  if (sayNow !== job) return;
  stopJob(job);
  sayNow = null;
  // a breath between two lines, so "Listen… and spell it." and the word don't run together
  if (sayQueue.length) setTimeout(nextJob, 260);
}
function speakJob(job) {
  // pictures in a caption ("⭐ Star challenge!") would be read out as words
  const u = new SpeechSynthesisUtterance(job.text.replace(/[\p{Extended_Pictographic}️]/gu, "").trim());
  if (voice) { u.voice = voice; u.lang = voice.lang; } else u.lang = "en-GB";
  u.rate = job.rate;
  u.pitch = job.pitch;
  u.onend = u.onerror = () => { job.speaking = false; finishJob(job); };
  job.utterance = u;                                   // keep it referenced, or Chrome may drop its events
  job.speaking = true;
  // some browsers never fire "end"; don't let one lost event freeze the queue
  clearTimeout(job.timer);
  job.timer = setTimeout(() => finishJob(job), 2000 + job.text.length * 130 / job.rate);
  speechSynthesis.speak(u);
}
function clipFailed(job) {
  if (sayNow !== job) return;
  stopClip(job);
  if (job.plan.speech) speakJob(job); else finishJob(job);
}
/* Clips play through the same Web Audio context as the sound effects. Tablets only let a page
   start sound from a tap, and that context has already been unlocked by one — an <audio> element
   made later, when a star flies home, would be refused. The element is the fallback (it is all
   that works when the game is opened straight from disk). */
const clipBuffers = new Map();             // url -> Promise<AudioBuffer | null>
function clipBuffer(url) {
  if (!clipBuffers.has(url)) {
    const ctx = audio();
    clipBuffers.set(url, !ctx ? Promise.resolve(null) : fetch(url)
      .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error("missing"))))
      .then((data) => new Promise((resolve, reject) => ctx.decodeAudioData(data, resolve, reject)))
      .catch(() => null));
  }
  return clipBuffers.get(url);
}
/* Home recordings come out at whatever level the microphone gave, usually well under the music.
   Each clip is measured once and brought up to the same speaking level: the loudness of its voiced
   part (not the quiet around it), with a ceiling on the boost so a hissy take isn't all hiss. */
const CLIP_LEVEL = 0.2;                    // target RMS of the voiced part
const CLIP_MAX_BOOST = 10;
const clipGains = new WeakMap();
function clipGain(buffer) {
  if (clipGains.has(buffer)) return clipGains.get(buffer);
  const d = buffer.getChannelData(0);
  let peak = 0;
  for (let i = 0; i < d.length; i++) { const a = Math.abs(d[i]); if (a > peak) peak = a; }
  let gain = 1;
  if (peak > 0.005) {
    // 20 ms windows; only the ones that hold voice count
    const win = Math.max(1, Math.floor(buffer.sampleRate * 0.02)), floor = (peak * 0.15) ** 2;
    let sum = 0, n = 0;
    for (let i = 0; i + win <= d.length; i += win) {
      let e = 0;
      for (let j = i; j < i + win; j++) e += d[j] * d[j];
      e /= win;
      if (e >= floor) { sum += e; n++; }
    }
    const rms = n ? Math.sqrt(sum / n) : peak * 0.3;
    // peaks may go a little over full scale: the limiter after this catches them
    gain = Math.max(0.5, Math.min(CLIP_LEVEL / rms, 1.6 / peak, CLIP_MAX_BOOST));
  }
  clipGains.set(buffer, gain);
  return gain;
}
/** gain → rumble out → a touch more consonant → limiter. Built once, shared by every clip. */
let clipBus = null;
function clipOut(ctx) {
  if (!clipBus) {
    const low = ctx.createBiquadFilter();
    low.type = "highpass"; low.frequency.value = 110;
    const presence = ctx.createBiquadFilter();
    presence.type = "peaking"; presence.frequency.value = 3200; presence.Q.value = 0.8; presence.gain.value = 3.5;
    const limit = ctx.createDynamicsCompressor();
    limit.threshold.value = -8; limit.knee.value = 6; limit.ratio.value = 12;
    limit.attack.value = 0.002; limit.release.value = 0.12;
    low.connect(presence); presence.connect(limit); limit.connect(ctx.destination);
    clipBus = low;
  }
  return clipBus;
}
function playClipElement(job, url) {
  const a = new Audio(url);
  job.audio = a;
  a.onended = () => finishJob(job);
  a.onerror = () => clipFailed(job);
  try {
    const p = a.play();
    if (p && p.catch) p.catch(() => clipFailed(job));     // blocked or undecodable
  } catch (e) { clipFailed(job); }
}
function playClipJob(job, url) {
  job.clip = true;
  clearTimeout(job.timer);
  job.timer = setTimeout(() => finishJob(job), 30000);   // no clip is this long
  clipBuffer(url).then((buffer) => {
    if (sayNow !== job || !job.clip) return;             // hushed while it was loading
    const ctx = buffer && audio();
    if (!ctx || ctx.state !== "running") { playClipElement(job, url); return; }
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const gain = ctx.createGain();
    gain.gain.value = clipGain(buffer);
    src.connect(gain).connect(clipOut(ctx));
    src.onended = () => finishJob(job);
    job.source = src;
    src.start();
  });
}
function nextJob() {
  if (sayNow) return;
  let job = null;
  const now = performance.now();
  while (sayQueue.length && !job) {
    const j = sayQueue.shift();
    if (j.keep || now - j.born <= j.patience) job = j;   // a remark that has waited too long is stale
  }
  if (!job) return;
  sayNow = job;
  job.ducked = true;
  duck(true);
  const url = job.plan.clip ? clipUrl(job.text) : null;
  if (url) playClipJob(job, url);
  else if (job.plan.speech) speakJob(job);
  else finishJob(job);
}

// ?voicedebug: tell me about anything spoken that the recording list doesn't know
let catalogueSlugs = null;
const voiceDebug = typeof location !== "undefined" && /[?&]voicedebug\b/.test(location.search);
function noteUncatalogued(text) {
  if (!catalogueSlugs) catalogueSlugs = new Set(voiceCatalogue().map((c) => c.slug));
  if (!catalogueSlugs.has(clipSlug(text))) console.info("[voice] not in catalogue:", text);
}

/* A new line never cuts off the one being said. By default it waits its turn, taking the place
   of anything else that was waiting, and is dropped if its turn takes too long to come.
     queue: true   wait however long it takes, and don't push other lines out (a word to spell)
     cut: true     stop whatever is being said and say this now (the player asked for it)        */
function say(text, { rate = 0.85, pitch = 1.25, queue = false, cut = false, force = false, patience = 3000 } = {}) {
  if (voiceDebug) noteUncatalogued(text);
  const plan = sayPlan(text, force);
  if (!plan) return;
  if (cut) hush();
  else if (!queue) for (let i = sayQueue.length - 1; i >= 0; i--) if (!sayQueue[i].keep) sayQueue.splice(i, 1);
  sayQueue.push({ text, rate, pitch, plan, keep: queue, patience, born: performance.now(),
    clip: false, audio: null, source: null, timer: 0, speaking: false, ducked: false });
  nextJob();
}
function hush() {
  sayQueue.length = 0;
  const job = sayNow;
  sayNow = null;
  if (job) stopJob(job);
  if ("speechSynthesis" in window) speechSynthesis.cancel();
}

/* ------------------------- everything the game says ---------------------- */
/* Lines that live as data elsewhere (words, places, STORY_LINES) are read from there.
   These are said by brew.js / game.js / ui.js with the text written in place, so they are
   listed here by hand — ?voicedebug will point out any that go missing or change. */

const VOICE_STORY_EXTRA = [
  "All the stars are back in the sky. You did it!",
];
const VOICE_CHEERS = [
  "Time to brew! Look at the word… then spell it.",
  "Time to brew!",
  "⭐ Star challenge! This word is hiding. Listen… and spell it yourself!",
  "⭐ Star challenge! This word is hiding. Can you spell it yourself?",
  "⭐ Star challenge! Listen… and spell it.",
  "⭐ Star challenge! Can you spell it?",
  "A lovely potion!",
  "All the stars are home!",
  "Type the letters to send the star home!",
  "You found something new to wear!",
  "I'll read to you!",
];
/** The lines about each friend. The map and level start say plea + need as one go. */
function friendLines(place) {
  return [
    place.plea + " " + place.need,
    place.plea,
    place.thanks,
    `Time to brew for ${place.friendName}!`,
    `The ${place.potion} is ready!`,
    `One more thing for the ${place.potion}!`,
  ];
}
// Not listed: the two story lines that contain the witch's name (she can be called anything).

let catalogueCache = null;
/** [{ group, kind: "word" | "line", text, slug }] in recording order, each slug once. */
function voiceCatalogue() {
  if (catalogueCache) return catalogueCache.slice();
  const out = [], seen = new Set();
  const add = (group, kind, text) => {
    const slug = clipSlug(text);
    if (!slug || seen.has(slug)) return;
    seen.add(slug);
    out.push({ group, kind, text, slug });
  };
  PLACES.forEach((place, p) => {
    for (let i = 0; i < LEVELS_PER_PLACE; i++) LEVELS[p * LEVELS_PER_PLACE + i].words.forEach((w) => add(place.name, "word", w.text));
  });
  Object.values(STORY_LINES).forEach((t) => add("Story", "line", t));
  VOICE_STORY_EXTRA.forEach((t) => add("Story", "line", t));
  PLACES.forEach((place) => friendLines(place).forEach((t) => add("Friends", "line", t)));
  CRITTERS.forEach((c) => add("Visitors", "line", critterHello(c)));
  VOICE_CHEERS.forEach((t) => add("Hints and cheers", "line", t));
  catalogueCache = out;
  return out.slice();
}
