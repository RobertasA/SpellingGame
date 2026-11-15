#!/usr/bin/env node
/* Little Star Witch — a first look at a downloaded save file.

     node v2/tools/analyse-save.js little-star-witch-my-game-2026-11-15.json

   Prints where the game has got to and what the play diary shows: time played,
   how each level went, the words and keys that give trouble, and where play stops.
   The event kinds are described at the top of js/track.js. */
"use strict";
const fs = require("fs");
const file = process.argv[2];
if (!file) { console.error("usage: node analyse-save.js <save file.json>"); process.exit(1); }
const data = JSON.parse(fs.readFileSync(file, "utf8"));
const save = data.save || data, log = data.log || [];

const median = (a) => { if (!a.length) return null; const s = a.slice().sort((x, y) => x - y), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const secs = (ms) => ms == null ? "–" : (ms / 1000).toFixed(1) + "s";
const mins = (ms) => (ms / 60000).toFixed(1) + " min";
const pad = (s, n) => String(s).padEnd(n);
const head = (t) => console.log(`\n== ${t} ==`);
const by = (list, key) => { const m = new Map(); for (const x of list) { const k = key(x); if (!m.has(k)) m.set(k, []); m.get(k).push(x); } return m; };
const of = (kind) => log.filter(e => e.e === kind);

head("Save");
console.log(`profile: ${data.profile ? data.profile.name : "?"}   game version: ${data.version || "?"}   exported: ${data.exported || "?"}`);
const stars = Object.values(save.stars || {});
console.log(`levels done: ${stars.length}   stars: ${stars.reduce((a, b) => a + b, 0)}   little stars sent home: ${save.totalStars || 0}   star challenges aced: ${save.aced || 0}`);
console.log(`friends helped: ${Object.keys(save.helped || {}).join(", ") || "none"}   visitors: ${Object.keys(save.critters || {}).length}`);
const boxes = Object.entries(save.keys || {}).filter(([ch]) => /^[a-z]$/.test(ch));
console.log(`keys known (box 3+): ${boxes.filter(([, k]) => (k.box || 0) >= 3).map(([ch]) => ch).join("") || "none"}   being practised: ${(save.focus || []).join("") || "none"}`);
const slowKeys = boxes.filter(([, k]) => k.t && k.t.length >= 3).map(([ch, k]) => [ch, median(k.t), k.miss || 0]).sort((a, b) => b[1] - a[1]);
if (slowKeys.length) console.log(`slowest keys (recent median): ${slowKeys.slice(0, 8).map(([ch, m]) => `${ch} ${secs(m)}`).join(", ")}`);
const wob = Object.entries(save.words || {}).filter(([, s]) => s.slip > 0 && s.slip * 2 > s.ok).sort((a, b) => (b[1].slip - b[1].ok) - (a[1].slip - a[1].ok));
if (wob.length) console.log(`wobbly words: ${wob.slice(0, 20).map(([w, s]) => `${w} (${s.ok}✓ ${s.slip}✗)`).join(", ")}`);

if (!log.length) { console.log("\nNo play diary in this file yet (it starts with version 2.5)."); process.exit(0); }

head("Sessions");
// time played = gaps between events of under two minutes, so a tablet left lying about doesn't count
let sessions = [], cur = null;
for (const ev of log) {
  if (ev.e === "session" || !cur) { cur = { start: ev.t, end: ev.t, active: 0, info: ev.e === "session" ? ev : {}, levels: 0, drills: 0 }; sessions.push(cur); }
  if (ev.t - cur.end < 120000) cur.active += ev.t - cur.end;
  cur.end = ev.t;
  if (ev.e === "levelEnd") cur.levels++;
  if (ev.e === "drillEnd") cur.drills++;
}
console.log(`${log.length} events, ${sessions.length} visits, ${mins(sessions.reduce((a, s) => a + s.active, 0))} of play, from ${new Date(log[0].t).toISOString().slice(0, 10)} to ${new Date(log[log.length - 1].t).toISOString().slice(0, 10)}`);
for (const s of sessions.slice(-15)) {
  const i = s.info;
  console.log(`  ${new Date(s.start).toISOString().slice(0, 16).replace("T", " ")}  ${pad(mins(s.active), 9)} levels ${s.levels}  key practice ${s.drills}` +
    (i.v ? `   v${i.v} ${i.w}x${i.h} ${i.touch ? "touch" : "no touch"}${i.realKeys ? ", real keyboard" : ", screen keys"}${i.installed ? ", installed" : ""} gfx ${i.gfx}` : ""));
}
const errs = of("err");
if (errs.length) console.log(`errors: ${[...by(errs, e => `${e.m} @ ${e.at}`)].map(([k, v]) => `${k} ×${v.length}`).join("; ")}`);
const gfx = of("gfx");
if (gfx.length) console.log(`graphics stepped down ${gfx.length} time(s) for slow frames`);

head("Levels (starts / finishes / quits, stars, time, stars that hid)");
const starts = by(of("level"), e => e.n), ends = by(of("levelEnd"), e => e.n), quits = by(of("quit"), e => e.n);
for (const n of [...new Set([...starts.keys(), ...ends.keys()])].sort((a, b) => a - b)) {
  const e = ends.get(n) || [], q = quits.get(n) || [];
  console.log(`  level ${pad(n, 3)} ${(starts.get(n) || []).length} / ${e.length} / ${q.length}   stars ${pad(e.map(x => x.stars).join("") || "–", 6)} ` +
    `time ${pad(secs(median(e.map(x => x.ms))), 7)} hid ${e.map(x => x.missed || 0).join(",") || "–"}` + (q.length ? `   quit in ${q.map(x => `${x.mode} ${x.sent}/${x.need}`).join(", ")}` : ""));
}
const after = by(of("after"), e => e.pick);
console.log(`after a level: ${["next", "again", "map"].map(k => `${k} ${(after.get(k) || []).length}`).join(", ")}`);

head("Words while flying (seen, hid, wrong keys, median time on screen, first letter)");
const words = [...by(of("word"), e => e.w)].map(([w, list]) => ({
  w, n: list.length, hid: list.filter(x => x.out === "hid").length, wrong: list.reduce((a, x) => a + (x.wrong || []).length, 0),
  ms: median(list.filter(x => x.out === "home").map(x => x.ms)), first: median(list.filter(x => x.keys && x.keys.length).map(x => x.keys[0])),
  hints: list.reduce((a, x) => a + (x.hints || []).length, 0),
}));
words.sort((a, b) => (b.hid * 3 + b.wrong) / b.n - (a.hid * 3 + a.wrong) / a.n);
for (const x of words.slice(0, 25)) console.log(`  ${pad(x.w, 12)} seen ${pad(x.n, 3)} hid ${pad(x.hid, 3)} wrong ${pad(x.wrong, 3)} hints ${pad(x.hints, 3)} time ${pad(secs(x.ms), 7)} first letter ${secs(x.first)}`);
const allW = of("word");
console.log(`all words: ${allW.length} stars, ${allW.filter(x => x.out === "hid").length} hid (${Math.round(100 * allW.filter(x => x.out === "hid").length / Math.max(1, allW.length))}%)`);

head("Keys (from every timed letter in the diary)");
const keyT = {}, keyWrong = {}, mix = {};
const bad = (want, got) => { keyWrong[want] = (keyWrong[want] || 0) + 1; const k = `${got} for ${want}`; mix[k] = (mix[k] || 0) + 1; };
for (const ev of allW) {
  (ev.keys || []).forEach((ms, i) => { if (i > 0) (keyT[ev.w[i]] = keyT[ev.w[i]] || []).push(ms); });       // the first letter includes reading
  for (const x of ev.wrong || []) { const m = /^(\d+)(.)$/.exec(x); if (m && ev.w[+m[1]]) bad(ev.w[+m[1]], m[2]); }
}
for (const ev of [...of("key"), ...of("fly")]) {
  const ch = ev.ch || ev.w;
  if (ev.ms != null && ev.out !== "hid" && ev.out !== "away") (keyT[ch] = keyT[ch] || []).push(ev.ms);
  for (const x of ev.wrong || []) bad(ch, x.slice(-1));
}
const keys = Object.keys({ ...keyT, ...keyWrong }).sort((a, b) => (median(keyT[b] || [0]) || 0) - (median(keyT[a] || [0]) || 0));
console.log("  " + keys.map(ch => `${ch} ${secs(median(keyT[ch] || []))}${keyWrong[ch] ? ` ${keyWrong[ch]}✗` : ""}`).join("   "));
const mixes = Object.entries(mix).sort((a, b) => b[1] - a[1]).slice(0, 10);
if (mixes.length) console.log(`  most often pressed by mistake: ${mixes.map(([k, n]) => `${k} ×${n}`).join(", ")}`);
const flies = of("fly");
if (flies.length) console.log(`  fireflies: ${flies.length}, caught ${flies.filter(f => f.out === "caught").length}, with the key glowing ${flies.filter(f => f.hint).length}`);

head("Brewing");
for (const kind of ["look", "hear"]) {
  const list = of("brewWord").filter(x => x.kind === kind);
  if (!list.length) continue;
  console.log(`  ${kind === "look" ? "look, cover, spell" : "star challenges   "}: ${list.length} words, clean ${list.filter(x => !x.slips && !x.peeks && !x.helped).length}, ` +
    `peeked ${list.filter(x => x.peeks).length}, slips ${list.reduce((a, x) => a + (x.slips || 0), 0)}, median ${secs(median(list.map(x => x.ms)))}, typed ${list.filter(x => x.typed).length} / tapped ${list.filter(x => x.tapped).length}`);
}
const brewBad = [...by(of("brewWord").filter(x => x.slips || x.peeks), e => e.w)].sort((a, b) => b[1].length - a[1].length).slice(0, 15);
if (brewBad.length) console.log(`  words with slips or peeks: ${brewBad.map(([w, l]) => `${w} ×${l.length}`).join(", ")}`);

head("Other");
const screens = by(of("screen"), e => e.s);
console.log(`  screens opened: ${[...screens].map(([s, l]) => `${s} ${l.length}`).join(", ")}`);
console.log(`  key practice: ${of("drill").length} started, ${of("drillEnd").length} finished   words tapped to hear: ${of("hear").length}   pauses: ${of("pause").length}`);
const locked = by(of("locked"), e => `${e.k} ${e.i}`);
if (locked.size) console.log(`  locked outfits tapped: ${[...locked].map(([k, l]) => `${k} ×${l.length}`).join(", ")}`);
const sets = of("set");
if (sets.length) console.log(`  settings changed: ${sets.map(s => `${s.k} → ${s.v}`).join("; ")}`);
