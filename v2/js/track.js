"use strict";
/* =====================================================================
   The play diary and the save file.

   The diary is a list of small events — which words came up, how long each
   letter took, which wrong keys were pressed, what hid, what was peeked at,
   where a level was left — kept beside the save so that a save file shows
   how the game was really played, not just where it has got to.

   Nothing is ever sent anywhere: it stays in this browser until a grown-up
   downloads the save file.

   Storage: each profile has its own diary, in pieces of LOG_CHUNK events
   under <its save key>.log.<n>, so that only the piece being written is
   stored again each time. The oldest pieces are dropped once the diary
   passes LOG_MAX_CHARS.

   An event is { t: time (ms since 1970), e: kind, ...details }. Times
   inside an event (ms, keys) are milliseconds of play: pauses and time with
   the game hidden are not counted. The kinds:

     session    the game was opened: version, screen, device, progress so far
     screen     title / map / friends / wardrobe / grown / story
     level      a level began: n, the words chosen, warm-up letters, the key budget, the known keys
     fly        a letter firefly: ch, out (caught | away), ms, wrong keys, hint (the key was glowing)
     word       a word star: w, out (home | hid), ms on screen, keys (ms for each letter, the first
                includes reading the word), wrong (letter index + the key pressed), hints (letter
                indexes typed while glowing), rel (times let go with Backspace), typed (letters done when it hid)
     key        the same, for a one-letter star in key practice
     flightEnd  all the stars are home: sent, missed, ms, stray (keys that matched no star)
     brew       brewing began: the words, and which are star challenges
     brewWord   a brewed word: w, kind (look | hear), ms, slips, peeks, helped, aced,
                bad (sound slot + what was chosen instead), typed / tapped (letters typed, tiles tapped)
     levelEnd   n, stars, first (first time through), ms for the whole level, newWords, critters
     drill / drillEnd   key practice: the focus keys; sent, missed, ms, learnt
     quit       left in the middle: n, mode, sent, need, brewed
     after      the button chosen on the results page: again | next | map
     pause / resume / hide / show
     hear       a word was tapped to hear it: w, where (star | brew)
     input      a real keyboard, or the screen keys, came into use
     critter, helped, ending, look, locked, set, gfx, reset, keysClear, err
   ===================================================================== */

const LOG_CHUNK = 300;                  // events in one stored piece
const LOG_MAX_CHARS = 1500000;          // about 1.5 MB of diary for a profile; the oldest goes first
const SAVE_FILE_APP = "little-star-witch";

function logPrefix(id) { return profileKey(id) + ".log."; }
/** The stored pieces of a profile's diary, oldest first: [[n, key], ...]. */
function logPieces(id) {
  const prefix = logPrefix(id), out = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(prefix) && /^\d+$/.test(k.slice(prefix.length))) out.push([+k.slice(prefix.length), k]);
    }
  } catch (e) { /* storage unavailable */ }
  return out.sort((a, b) => a[0] - b[0]);
}
function readLog(id) {
  const out = [];
  for (const [, k] of logPieces(id)) {
    try { const part = JSON.parse(lsGet(k)); if (Array.isArray(part)) out.push(...part); } catch (e) { /* a spoiled piece is skipped */ }
  }
  return out;
}
function clearLog(id) { for (const [, k] of logPieces(id)) lsDel(k); }
function writeLog(id, events) {
  clearLog(id);
  for (let i = 0, n = 0; i < events.length; i += LOG_CHUNK, n++) {
    if (!lsSet(logPrefix(id) + n, JSON.stringify(events.slice(i, i + LOG_CHUNK)))) return false;
  }
  return true;
}

// every visit starts a new piece, after the last one stored
let logSeq = (logPieces(profile.id).pop() || [-1])[0] + 1;
let logBuf = [], logDirty = false, logTimer = null;

/** Note something that happened. Empty details are left out, to keep the diary small. */
function track(e, data) {
  if (save.diary === false) return;
  const ev = { t: Date.now(), e };
  if (data) for (const [k, v] of Object.entries(data)) {
    if (v == null || v === false || v === "" || (Array.isArray(v) && !v.length)) continue;
    ev[k] = v;
  }
  logBuf.push(ev);
  logDirty = true;
  if (!logTimer) logTimer = setTimeout(flushLog, 1500);
}
function flushLog() {
  clearTimeout(logTimer);
  logTimer = null;
  if (!logDirty) return;
  logDirty = false;
  const key = logPrefix(profile.id) + logSeq, text = JSON.stringify(logBuf);
  if (!lsSet(key, text)) {
    // no room: let go of the oldest pieces (never the game itself) and try once more
    const old = logPieces(profile.id).filter(([n]) => n !== logSeq).slice(0, 3);
    old.forEach(([, k]) => lsDel(k));
    if (!old.length || !lsSet(key, text)) return;
  }
  if (logBuf.length >= LOG_CHUNK) {
    logSeq++;
    logBuf = [];
    const pieces = logPieces(profile.id).map(([, k]) => [k, (lsGet(k) || "").length]);
    let total = pieces.reduce((a, p) => a + p[1], 0);
    while (total > LOG_MAX_CHARS && pieces.length > 1) { const [k, n] = pieces.shift(); lsDel(k); total -= n; }
  }
}
window.addEventListener("pagehide", flushLog);

/** Milliseconds of play since `since` (a reading of the game clock, which stops while paused or hidden). */
function playMs(since) { return since == null ? null : Math.round((clock - since) * 1000); }

let errCount = 0;
window.addEventListener("error", (e) => {
  if (errCount++ >= 10) return;
  track("err", { m: String(e.message || "").slice(0, 200), at: `${String(e.filename || "").split("/").pop()}:${e.lineno || 0}` });
});

/* ------------------------------ save file ----------------------------- */

/** Everything about one profile: the save, its diary, and a little about where it was played. */
function saveFileData() {
  flushLog();
  return {
    app: SAVE_FILE_APP, format: 1, version: VERSION, exported: new Date().toISOString(),
    profile: { id: profile.id, name: profile.name, made: profile.made || null },
    device: deviceInfo(),
    save,
    log: readLog(profile.id),
  };
}
function deviceInfo() {
  return {
    ua: navigator.userAgent, lang: navigator.language,
    w: window.innerWidth, h: window.innerHeight, dpr: window.devicePixelRatio || 1,
    touch: window.matchMedia("(pointer: coarse)").matches,
    installed: window.matchMedia("(display-mode: standalone)").matches || navigator.standalone === true,
  };
}
function downloadSaveFile() {
  persist();
  const name = (profile.name || "game").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "game";
  const blob = new Blob([JSON.stringify(saveFileData())], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `little-star-witch-${name}-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 10000);
}
/** The save and diary inside a save file's text, or null if it is not one. */
function parseSaveFile(text) {
  let data = null;
  try { data = JSON.parse(text); } catch (e) { return null; }
  if (!data || typeof data !== "object") return null;
  const s = data.app === SAVE_FILE_APP ? data.save : data;          // a bare save (copied out of the browser) will do too
  if (!s || typeof s !== "object" || typeof s.stars !== "object" || typeof s.look !== "object") return null;
  return {
    name: data.profile && typeof data.profile.name === "string" ? data.profile.name : "",
    save: loadSave(s),
    log: Array.isArray(data.log) ? data.log.filter(ev => ev && typeof ev === "object" && typeof ev.e === "string") : [],
  };
}

/* ------------------------------ profiles ------------------------------ */

function cleanProfileName(name) { return String(name || "").replace(/[<>&"]/g, "").trim().slice(0, 24); }
/** Leave this profile for another one. The page loads again, so nothing of the old game lingers. */
function switchProfile(id) {
  if (!profiles.list.some(x => x.id === id)) return;
  persist();
  track("profile", { to: id });
  flushLog();
  profiles.current = id;
  saveProfiles();
  location.reload();
}
/** A new profile, starting from `data` (a save) or from the beginning, with an optional diary. Returns its id, or null if there was no room. */
function addProfile(name, data, log) {
  const id = Date.now().toString(36);
  const fresh = data || { ...freshSave(), ...deviceSettings() };
  if (!lsSet(profileKey(id), JSON.stringify(fresh))) return null;
  if (log && log.length && !writeLog(id, log)) clearLog(id);         // the game matters more than its diary
  profiles.list.push({ id, name: cleanProfileName(name) || "New game", made: Date.now() });
  if (!saveProfiles()) { profiles.list.pop(); lsDel(profileKey(id)); clearLog(id); return null; }
  return id;
}
function renameProfile(id, name) {
  const p = profiles.list.find(x => x.id === id);
  name = cleanProfileName(name);
  if (!p || !name) return;
  p.name = name;
  saveProfiles();
}
/** Remove a profile, its save and its diary. The first profile, and the one being played, stay. */
function deleteProfile(id) {
  if (id === MAIN_PROFILE || id === profile.id) return;
  profiles.list = profiles.list.filter(x => x.id !== id);
  saveProfiles();
  lsDel(profileKey(id));
  clearLog(id);
}
/** A line about a profile that is not being played: how far it has got. */
function profileSummary(id) {
  if (id === profile.id) return `${Object.keys(save.stars).length} levels · ${starCount()} ⭐`;
  try {
    const s = JSON.parse(lsGet(profileKey(id))) || {};
    const stars = Object.values(s.stars || {});
    return `${stars.length} levels · ${stars.reduce((a, b) => a + b, 0)} ⭐`;
  } catch (e) { return ""; }
}
