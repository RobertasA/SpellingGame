"use strict";
/* =====================================================================
   Voice studio: record the game's words and sentences in your own voice
   ---------------------------------------------------------------------
   Runs on record.html after voice/manifest.js, words.js, core.js, voice.js.
   Each take is trimmed, then saved with voiceStore.put(slug, blob), which
   is what the game itself reads, so a saved take is live straight away.
   Everything is inside one function so its names cannot clash with the
   game's globals (audio, voice, say, ...) that core.js and voice.js define.
   ===================================================================== */
(function () {
  const items = voiceCatalogue();
  const bySlug = new Map(items.map((c) => [c.slug, c]));
  const MIME_CHOICES = ["audio/mp4", "audio/webm;codecs=opus", "audio/webm"];   // mp4 plays on every browser
  const MAX_TAKE_MS = 60000;                 // a forgotten recording stops itself
  const PAD_S = 0.15, TRIM_OVER_S = 0.3;     // keep 150 ms around the voice; only trim if > 300 ms is spare
  const el = {};
  ["group", "position", "text", "has", "hint", "meter", "meterLabel", "timer", "recBtn", "backBtn", "playBtn", "shippedBtn",
    "delBtn", "nextBtn", "status", "notices", "barDevice", "barShipped", "progressText", "onlyMissing", "groups",
    "zipBtn", "importBtn", "importFile", "clearBtn"].forEach((id) => { el[id] = document.getElementById(id); });

  let idx = 0;
  let state = "idle";                        // idle | recording | processing
  let onlyMissing = true;
  let recorder = null, chunks = [], takeTimer = 0, tickTimer = 0, takeStart = 0;
  let storageFailed = false;
  const openGroups = new Set();
  const player = new Audio();

  /* ------------------------------ small helpers ------------------------------ */

  const manifest = () => window.VOICE_MANIFEST || {};
  const current = () => items[idx];
  function kind(item) { return voiceStore.has(item.slug) ? "device" : manifest()[item.slug] ? "shipped" : "none"; }
  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* remembering is a nicety */ } }
  function seconds(s) { return s.toFixed(1) + " s"; }

  /* ------------------------------ notices ------------------------------ */

  const notices = new Map();                 // key -> { text, tone, action }
  function notify(key, text, tone, action) { notices.set(key, { text, tone: tone || "", action }); renderNotices(); }
  function unnotify(key) { if (notices.delete(key)) renderNotices(); }
  function renderNotices() {
    el.notices.textContent = "";
    notices.forEach((n) => {
      const box = document.createElement("div");
      box.className = "notice " + n.tone;
      const span = document.createElement("span");
      span.textContent = n.text;
      box.appendChild(span);
      if (n.action) {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "ghost";
        b.textContent = n.action.label;
        b.onclick = n.action.run;
        box.appendChild(b);
      }
      el.notices.appendChild(box);
    });
  }
  function setStatus(text) { el.status.textContent = text || ""; }

  /* ------------------------------ microphone ------------------------------ */

  const mic = { stream: null, ctx: null, analyser: null, bytes: null, ready: false };

  /** Why recording cannot work here, in words for a parent; "" when it can. */
  function recordingProblem() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      return window.isSecureContext === false
        ? "This page was opened from an address the browser does not trust with the microphone. Microphones only work on https:// addresses or on localhost. Open the game from its https:// address, or from the computer it runs on, and come back here. You can still browse, listen, and load or download recordings below."
        : "This browser cannot reach a microphone. Try a recent Safari, Chrome, Edge or Firefox. You can still browse, listen, and load or download recordings below.";
    }
    if (typeof MediaRecorder === "undefined") {
      return "This browser cannot record sound. Try a recent Safari, Chrome, Edge or Firefox. You can still browse, listen, and load or download recordings below.";
    }
    return "";
  }
  function micErrorText(e) {
    const n = e && e.name;
    if (n === "NotAllowedError" || n === "SecurityError") {
      return "The microphone is switched off for this page. Tap the padlock or settings icon next to the address, allow the microphone, then press Record to try again.";
    }
    if (n === "NotFoundError" || n === "OverconstrainedError") return "No microphone was found. Plug one in (or check it is not in use by another app), then press Record to try again.";
    return "The microphone could not be started (" + (n || "unknown problem") + "). Check that no other app is using it, then press Record to try again.";
  }
  function audioContext() {
    if (!mic.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      mic.ctx = new AC();
    }
    if (mic.ctx.state === "suspended") mic.ctx.resume().catch(() => {});
    return mic.ctx;
  }
  /** Asks once, then keeps the stream for as long as the page is open. */
  async function ensureMic() {
    if (mic.stream && mic.stream.getAudioTracks().some((t) => t.readyState === "live")) return true;
    mic.ready = false;
    try {
      mic.stream = await navigator.mediaDevices.getUserMedia({
        audio: { channelCount: 1, echoCancellation: false, noiseSuppression: true, autoGainControl: true },
      });
    } catch (e) {
      notify("mic", micErrorText(e), "bad");
      return false;
    }
    unnotify("mic");
    mic.stream.getAudioTracks().forEach((t) => { t.onended = () => { mic.ready = false; }; });
    const ctx = audioContext();
    if (ctx) {
      const source = ctx.createMediaStreamSource(mic.stream);
      mic.analyser = ctx.createAnalyser();
      mic.analyser.fftSize = 1024;
      mic.bytes = new Uint8Array(mic.analyser.fftSize);
      source.connect(mic.analyser);            // not to the speakers, or it would squeal
      requestAnimationFrame(meterLoop);
    }
    mic.ready = true;
    return true;
  }
  let shown = 0;
  function meterLoop() {
    if (!mic.analyser || !mic.ready) { el.meter.style.transform = "scaleX(0)"; return; }
    mic.analyser.getByteTimeDomainData(mic.bytes);
    let peak = 0;
    for (let i = 0; i < mic.bytes.length; i++) peak = Math.max(peak, Math.abs(mic.bytes[i] - 128) / 128);
    shown = Math.max(Math.sqrt(peak), shown - 0.04);             // quick up, slow down; sqrt so quiet voices show
    el.meter.style.transform = "scaleX(" + Math.min(1, shown).toFixed(3) + ")";
    el.meter.parentNode.setAttribute("aria-valuenow", Math.round(shown * 100));
    requestAnimationFrame(meterLoop);
  }

  /* ------------------------------ recording ------------------------------ */

  function pickMime() {
    return MIME_CHOICES.find((m) => MediaRecorder.isTypeSupported(m)) || "";   // "" = the browser's own default
  }
  async function startTake() {
    if (state !== "idle" || recordingProblem()) return;
    stopPlayback();
    unnotify("level"); unnotify("undo");
    if (!(await ensureMic())) { render(); return; }
    const item = current();
    const mime = pickMime();
    try {
      recorder = new MediaRecorder(mic.stream, mime ? { mimeType: mime } : undefined);
    } catch (e) {
      notify("mic", "This browser could not start recording (" + e.name + "). Try another browser.", "bad");
      return;
    }
    chunks = [];
    const rec = recorder;
    rec.ondataavailable = (e) => { if (e.data && e.data.size) chunks.push(e.data); };
    rec.onerror = () => { notify("mic", "Something went wrong while recording. Please try that one again.", "bad"); };
    rec.onstop = () => finishTake(item, rec, mime);
    rec.start();
    state = "recording";
    takeStart = performance.now();
    takeTimer = setTimeout(stopTake, MAX_TAKE_MS);
    tickTimer = setInterval(tick, 200);
    setStatus("Recording… say it now, then press Stop.");
    render();
  }
  function stopTake() {
    if (state !== "recording" || !recorder) return;
    clearTimeout(takeTimer);
    clearInterval(tickTimer);
    state = "processing";
    setStatus("Saving…");
    render();
    try { recorder.stop(); } catch (e) { finishTake(current(), recorder, ""); }
  }
  function tick() {
    const s = (performance.now() - takeStart) / 1000;
    el.timer.textContent = Math.floor(s / 60) + ":" + String(Math.floor(s % 60)).padStart(2, "0");
  }

  /** The recorder has stopped: trim, save, and play it back. The original is kept until the save is done. */
  async function finishTake(item, rec, mime) {
    const type = rec.mimeType || mime || (chunks[0] && chunks[0].type) || "audio/webm";
    const original = new Blob(chunks, { type });
    chunks = [];
    recorder = null;
    el.timer.textContent = "";
    if (!original.size) {
      state = "idle";
      setStatus("");
      notify("level", "Nothing was captured that time. Please press Record and try again.", "bad");
      render();
      return;
    }
    let final = original, info = null;
    try {
      info = await analyseAndTrim(original, type);
      if (info.blob) final = info.blob;
    } catch (e) { /* storing the untrimmed take is always acceptable */ }
    let saved = false;
    try { saved = await voiceStore.put(item.slug, final); } catch (e) { saved = false; }
    if (!saved) noteStorageFailed();
    state = "idle";
    if (info) reportLevel(info);
    setStatus(describeSaved(final, info, saved));
    render();
    playClip(item);
  }
  function describeSaved(blob, info, saved) {
    const where = saved ? "Saved on this device" : "Kept for now (not saved for later, see the note above)";
    let text = where;
    if (info && info.after) text += " · " + seconds(info.after);
    if (info && info.blob) text += " (quiet at the ends trimmed from " + seconds(info.before) + ")";
    return text + ". Press Enter for the next one, or Space to record it again.";
  }
  function reportLevel(info) {
    if (info.silent) notify("level", "That take was almost silent. Check the level bar moves when you speak, or move a little closer, then record it again.");
    else if (info.peak < 0.08) notify("level", "That take was quite quiet. Moving a little closer to the microphone will make it clearer.");
    else if (info.clipped) notify("level", "That take was a bit loud and may sound crackly. Try a little further from the microphone.");
    else unnotify("level");
  }
  function noteStorageFailed() {
    storageFailed = true;
    notify("storage", "This browser could not store your recordings for later, so they will be lost when you close this page (private browsing can cause this). Download the .zip below before you leave.", "bad",
      { label: "Download now", run: downloadZip });
  }
  window.addEventListener("beforeunload", (e) => {
    if (storageFailed && voiceStore.keys().length) { e.preventDefault(); e.returnValue = ""; }
  });

  /* ------------------------------ trimming ------------------------------ */

  function decode(blob) {
    const ctx = audioContext();
    if (!ctx) return Promise.reject(new Error("no audio"));
    return blob.arrayBuffer().then((data) => new Promise((resolve, reject) => ctx.decodeAudioData(data, resolve, reject)));
  }
  function monoOf(buffer) {
    const n = buffer.length, out = new Float32Array(n);
    for (let c = 0; c < buffer.numberOfChannels; c++) {
      const d = buffer.getChannelData(c);
      for (let i = 0; i < n; i++) out[i] += d[i] / buffer.numberOfChannels;
    }
    return out;
  }
  /** Decodes the take, measures it, and re-encodes it without dead air when that saves more than 150 ms. */
  async function analyseAndTrim(blob, type) {
    const buffer = await decode(blob);
    const data = monoOf(buffer), rate = buffer.sampleRate;
    let peak = 0, clipped = 0;
    for (let i = 0; i < data.length; i++) {
      const a = Math.abs(data[i]);
      if (a > peak) peak = a;
      if (a >= 0.99) clipped++;
    }
    const info = { before: buffer.duration, after: buffer.duration, peak, clipped: clipped > 3, silent: peak < 0.02, blob: null };
    if (info.silent) return info;              // nothing to find; keep it as it is
    const threshold = Math.max(0.01, peak * 0.05);   // low enough to keep a soft "s" or "f" at the end
    let first = 0, last = data.length - 1;
    while (first < last && Math.abs(data[first]) < threshold) first++;
    while (last > first && Math.abs(data[last]) < threshold) last--;
    const spareStart = first / rate, spareEnd = (data.length - 1 - last) / rate;
    if (spareStart <= TRIM_OVER_S && spareEnd <= TRIM_OVER_S) return info;
    const from = Math.max(0, first - Math.round(PAD_S * rate));
    const to = Math.min(data.length, last + 1 + Math.round(PAD_S * rate));
    const trimmed = new AudioBuffer({ length: to - from, sampleRate: rate, numberOfChannels: 1 });
    trimmed.copyToChannel(data.subarray(from, to), 0);
    try {
      const out = await reencode(trimmed, type);
      const check = await decode(out);         // only trust it if it plays and is about the right length
      if (Math.abs(check.duration - trimmed.duration) < 0.4 && check.duration > 0.05) {
        info.blob = out;
        info.after = check.duration;
      }
    } catch (e) { /* fall back to the untrimmed take */ }
    return info;
  }
  /** Plays the buffer into a second MediaRecorder: takes as long as the clip, but needs no encoder library. */
  function reencode(buffer, type) {
    return new Promise((resolve, reject) => {
      const ctx = audioContext();
      const dest = ctx.createMediaStreamDestination();
      const rec = new MediaRecorder(dest.stream, type ? { mimeType: type } : undefined);
      const parts = [];
      const guard = setTimeout(() => { try { rec.stop(); } catch (e) { /* already stopped */ } reject(new Error("timeout")); }, buffer.duration * 1000 + 4000);
      rec.ondataavailable = (e) => { if (e.data && e.data.size) parts.push(e.data); };
      rec.onerror = () => { clearTimeout(guard); reject(new Error("recorder")); };
      rec.onstop = () => {
        clearTimeout(guard);
        const blob = new Blob(parts, { type: rec.mimeType || type });
        blob.size ? resolve(blob) : reject(new Error("empty"));
      };
      const src = ctx.createBufferSource();
      src.buffer = buffer;
      src.connect(dest);
      src.onended = () => setTimeout(() => { if (rec.state !== "inactive") rec.stop(); }, 120);
      rec.start();
      src.start();
    });
  }

  /* ------------------------------ playback ------------------------------ */

  function stopPlayback() { player.pause(); }
  function playUrl(url) {
    player.onerror = () => setStatus("This device could not play that clip. (Clips recorded as .webm may not play on older iPhones and iPads.)");
    player.src = url;
    const p = player.play();
    if (p && p.catch) p.catch((e) => { if (e.name !== "AbortError") player.onerror(); });
  }
  function playClip(item) {
    const url = clipUrl(item.text);
    if (url) playUrl(url);
  }
  function playShipped() {
    const file = manifest()[current().slug];
    if (file) playUrl("voice/" + encodeURI(file));
  }

  /* ------------------------------ moving about ------------------------------ */

  function go(i) {
    if (state !== "idle") return;
    stopPlayback();
    idx = Math.max(0, Math.min(items.length - 1, i));
    lsSet("lsw.voice.at", current().slug);
    unnotify("level"); unnotify("undo");
    setStatus("");
    openGroups.add(current().group);
    render();
  }
  function nextIndex() {
    for (let k = 1; k < items.length; k++) {
      const j = idx + k;
      if (j >= items.length && !onlyMissing) return -1;
      const i = j % items.length;
      if (!onlyMissing || kind(items[i]) === "none") return i;
    }
    return -1;
  }
  function keepAndNext() {
    if (state !== "idle") return;
    const n = nextIndex();
    if (n < 0) {
      setStatus(onlyMissing ? "That is everything recorded. Wonderful!" : "That was the last one.");
      return;
    }
    go(n);
  }
  function back() { go(idx - 1); }

  function removeCurrent() {
    const item = current();
    if (state !== "idle" || !voiceStore.has(item.slug)) return;
    const url = clipUrl(item.text);
    fetch(url).then((r) => r.blob()).then((blob) => {
      voiceStore.remove(item.slug);
      stopPlayback();
      notify("undo", "Removed your recording of “" + item.text + "”.", "", {
        label: "Undo",
        run: () => { voiceStore.put(item.slug, blob).then((ok) => { if (!ok) noteStorageFailed(); }); unnotify("undo"); render(); },
      });
      render();
    }).catch(() => { voiceStore.remove(item.slug); render(); });
  }

  /* ------------------------------ drawing the page ------------------------------ */

  function renderCard() {
    const item = current(), k = kind(item);
    el.group.textContent = item.group + (item.kind === "line" ? " · sentence" : " · word");
    const missing = items.filter((c) => kind(c) === "none").length;
    el.position.textContent = (idx + 1) + " of " + items.length + (missing ? " · " + missing + " still to record" : "");
    el.text.textContent = item.text;
    el.text.className = "text" + (item.kind === "line" ? " line" : "");
    el.has.className = "has " + k;
    el.has.textContent = k === "device" ? "Recorded by you on this device" : k === "shipped" ? "A recording is shipped with the game" : "Not recorded yet";
    el.hint.textContent = item.kind === "line"
      ? "Read the whole sentence warmly, like a bedtime story."
      : "Say just the word, clearly and a little slowly, as you would to your child.";
    const busy = state !== "idle";
    const problem = recordingProblem();
    el.recBtn.classList.toggle("live", state === "recording");
    el.recBtn.textContent = state === "recording" ? "■ Stop" : state === "processing" ? "Saving…" : k === "device" ? "● Record again" : "● Record";
    el.recBtn.disabled = state === "processing" || (!!problem && state === "idle");
    el.backBtn.disabled = busy || idx === 0;
    el.playBtn.disabled = busy || k === "none";
    el.delBtn.disabled = busy || k !== "device";
    el.shippedBtn.hidden = !(manifest()[item.slug] && k === "device");
    el.nextBtn.disabled = busy;
    el.nextBtn.textContent = k === "none" ? "Skip →" : "Keep & next →";
    el.meterLabel.textContent = mic.ready ? "Microphone" : "Microphone (off)";
    if (state !== "recording") el.timer.textContent = "";
    if (problem) notify("support", problem, "bad"); else unnotify("support");
  }
  function renderProgress() {
    let dev = 0, ship = 0;
    items.forEach((c) => { const k = kind(c); if (k === "device") dev++; else if (k === "shipped") ship++; });
    el.barDevice.style.width = (dev / items.length * 100) + "%";
    el.barShipped.style.width = (ship / items.length * 100) + "%";
    el.progressText.textContent = (dev + ship) + " of " + items.length + " have a voice recording" +
      " (" + dev + " recorded here" + (ship ? ", " + ship + " shipped with the game" : "") + ").";
  }
  function renderList() {
    const frag = document.createDocumentFragment();
    const groups = [];
    items.forEach((item, i) => {
      let g = groups.find((x) => x.name === item.group);
      if (!g) groups.push(g = { name: item.group, rows: [] });
      g.rows.push({ item, i });
    });
    groups.forEach((g) => {
      const done = g.rows.filter((r) => kind(r.item) !== "none").length;
      const det = document.createElement("details");
      det.dataset.group = g.name;
      det.open = openGroups.has(g.name);
      const sum = document.createElement("summary");
      sum.textContent = g.name + " — " + done + " / " + g.rows.length;
      det.appendChild(sum);
      const box = document.createElement("div");
      box.className = "chips";
      let shownCount = 0;
      g.rows.forEach(({ item, i }) => {
        const k = kind(item);
        if (onlyMissing && k !== "none" && i !== idx) return;
        const b = document.createElement("button");
        b.type = "button";
        b.className = "chip " + (k === "device" ? "dev" : k === "shipped" ? "ship" : "") + (i === idx ? " cur" : "");
        b.dataset.i = i;
        b.textContent = (k === "device" ? "✓ " : k === "shipped" ? "♪ " : "") + item.text;
        b.title = item.text + (k === "device" ? " (recorded here)" : k === "shipped" ? " (shipped file)" : " (not recorded)");
        box.appendChild(b);
        shownCount++;
      });
      if (!shownCount) {
        const p = document.createElement("p");
        p.className = "empty";
        p.textContent = "Everything in this section is recorded.";
        box.appendChild(p);
      }
      det.appendChild(box);
      frag.appendChild(det);
    });
    el.groups.textContent = "";
    el.groups.appendChild(frag);
  }
  function render() { renderCard(); renderProgress(); renderList(); }

  /* ------------------------------ zip: write ------------------------------ */

  const CRC_TABLE = (() => {
    const t = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      t[n] = c >>> 0;
    }
    return t;
  })();
  function crc32(bytes) {
    let c = 0xffffffff;
    for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  }
  /** A store-only (no compression) zip: audio is already compressed, so this keeps the writer tiny. */
  function buildZip(files) {
    const utf8 = new TextEncoder();
    const now = new Date();
    const dosTime = (now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >> 1);
    const dosDate = ((Math.max(1980, now.getFullYear()) - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate();
    const parts = [], central = [];
    let offset = 0;
    files.forEach((f) => {
      const name = utf8.encode(f.name), crc = crc32(f.data);
      const local = new DataView(new ArrayBuffer(30));
      local.setUint32(0, 0x04034b50, true);
      local.setUint16(4, 20, true);            // version needed
      local.setUint16(6, 0x0800, true);        // names are UTF-8
      local.setUint16(8, 0, true);             // method 0 = stored
      local.setUint16(10, dosTime, true);
      local.setUint16(12, dosDate, true);
      local.setUint32(14, crc, true);
      local.setUint32(18, f.data.length, true);
      local.setUint32(22, f.data.length, true);
      local.setUint16(26, name.length, true);
      local.setUint16(28, 0, true);
      parts.push(new Uint8Array(local.buffer), name, f.data);
      const entry = new DataView(new ArrayBuffer(46));
      entry.setUint32(0, 0x02014b50, true);
      entry.setUint16(4, 20, true);            // made by
      entry.setUint16(6, 20, true);            // needed
      entry.setUint16(8, 0x0800, true);
      entry.setUint16(10, 0, true);
      entry.setUint16(12, dosTime, true);
      entry.setUint16(14, dosDate, true);
      entry.setUint32(16, crc, true);
      entry.setUint32(20, f.data.length, true);
      entry.setUint32(24, f.data.length, true);
      entry.setUint16(28, name.length, true);
      entry.setUint32(42, offset, true);       // where its local header starts
      central.push(new Uint8Array(entry.buffer), name);
      offset += 30 + name.length + f.data.length;
    });
    const cdSize = central.reduce((n, p) => n + p.length, 0);
    const end = new DataView(new ArrayBuffer(22));
    end.setUint32(0, 0x06054b50, true);
    end.setUint16(8, files.length, true);
    end.setUint16(10, files.length, true);
    end.setUint32(12, cdSize, true);
    end.setUint32(16, offset, true);
    return new Blob(parts.concat(central, [new Uint8Array(end.buffer)]), { type: "application/zip" });
  }

  /* ------------------------------ zip: read ------------------------------ */

  /** Entries of a zip: { name, method, size, offset } read from the central directory. */
  function listZip(bytes) {
    const v = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    let e = bytes.length - 22;
    while (e >= 0 && v.getUint32(e, true) !== 0x06054b50) e--;
    if (e < 0) throw new Error("not a zip");
    const count = v.getUint16(e + 10, true);
    let p = v.getUint32(e + 16, true);
    const out = [];
    for (let i = 0; i < count; i++) {
      if (v.getUint32(p, true) !== 0x02014b50) throw new Error("damaged zip");
      const nameLen = v.getUint16(p + 28, true), extraLen = v.getUint16(p + 30, true), commentLen = v.getUint16(p + 32, true);
      out.push({
        method: v.getUint16(p + 10, true),
        size: v.getUint32(p + 20, true),
        rawSize: v.getUint32(p + 24, true),
        offset: v.getUint32(p + 42, true),
        name: new TextDecoder().decode(bytes.subarray(p + 46, p + 46 + nameLen)),
      });
      p += 46 + nameLen + extraLen + commentLen;
    }
    return out;
  }
  async function zipEntryData(bytes, entry) {
    const v = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const start = entry.offset + 30 + v.getUint16(entry.offset + 26, true) + v.getUint16(entry.offset + 28, true);
    const raw = bytes.subarray(start, start + entry.size);
    if (entry.method === 0) return raw;
    if (entry.method === 8 && typeof DecompressionStream !== "undefined") {   // zips made by other tools
      const stream = new Blob([raw]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
      return new Uint8Array(await new Response(stream).arrayBuffer());
    }
    throw new Error("compressed");
  }

  /* ------------------------------ download / load ------------------------------ */

  const TYPE_EXT = [["audio/mp4", "m4a"], ["audio/x-m4a", "m4a"], ["audio/aac", "m4a"], ["audio/webm", "webm"], ["audio/ogg", "ogg"], ["audio/wav", "wav"], ["audio/x-wav", "wav"], ["audio/mpeg", "mp3"]];
  const EXT_TYPE = { m4a: "audio/mp4", webm: "audio/webm", ogg: "audio/ogg", oga: "audio/ogg", wav: "audio/wav", mp3: "audio/mpeg", aac: "audio/aac" };
  function extFor(type) {
    const hit = TYPE_EXT.find(([t]) => String(type).toLowerCase().startsWith(t));
    return hit ? hit[1] : "webm";
  }
  /** Same text as voice/build-manifest.js writes. */
  function manifestText(map) {
    const sorted = Object.fromEntries(Object.entries(map).sort(([a], [b]) => a.localeCompare(b)));
    return `/* Generated by voice/build-manifest.js — do not edit by hand.
   Maps a clip name to its audio file (relative to this folder). */
window.VOICE_MANIFEST = ${Object.keys(sorted).length ? JSON.stringify(sorted, null, 2) : "{}"};
`;
  }
  const README_TEXT = `Your Little Star Witch voice recordings
=======================================

To make these part of the game for every device:

1. Unzip this file.
2. Copy the "words" and "lines" folders into the game's v2/voice/ folder,
   and replace v2/voice/manifest.js with the manifest.js from this zip.
3. Reload the game.

(To use them on another device without touching the game files, open the
Voice studio page there and choose "Load recordings from a .zip".)
`;
  async function downloadZip() {
    const slugs = voiceStore.keys();
    if (!slugs.length) { notify("zip", "You have not recorded anything on this device yet, so there is nothing to download.", ""); return; }
    el.zipBtn.disabled = true;
    try {
      const enc = new TextEncoder();
      const files = [], map = Object.assign({}, manifest());
      for (const slug of slugs.sort()) {
        const blob = await (await fetch(voiceStore.url(slug))).blob();
        const item = bySlug.get(slug);
        const path = (item && item.kind === "word" ? "words/" : "lines/") + slug + "." + extFor(blob.type);
        files.push({ name: path, data: new Uint8Array(await blob.arrayBuffer()) });
        map[slug] = path;                      // a recording made here beats the shipped file
      }
      files.push({ name: "manifest.js", data: enc.encode(manifestText(map)) });
      files.push({ name: "README.txt", data: enc.encode(README_TEXT) });
      const url = URL.createObjectURL(buildZip(files));
      const a = document.createElement("a");
      a.href = url;
      a.download = "little-star-witch-voice.zip";
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 30000);
      notify("zip", "Your zip of " + slugs.length + " recording" + (slugs.length === 1 ? "" : "s") + " is downloading.", "good");
    } catch (e) {
      notify("zip", "Sorry, the zip could not be made (" + e.message + "). Your recordings are still here.", "bad");
    }
    el.zipBtn.disabled = false;
  }
  async function loadZip(file) {
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      let loaded = 0, skipped = 0, failedSave = false;
      for (const entry of listZip(bytes)) {
        const base = entry.name.split("/").pop();
        const m = /^(.+)\.(m4a|webm|ogg|oga|wav|mp3|aac)$/i.exec(base);
        if (!m || base.startsWith("._") || entry.name.endsWith("/")) continue;
        try {
          const data = await zipEntryData(bytes, entry);
          const ok = await voiceStore.put(m[1].toLowerCase(), new Blob([data], { type: EXT_TYPE[m[2].toLowerCase()] }));
          if (!ok) failedSave = true;
          loaded++;
        } catch (e) { skipped++; }
      }
      if (failedSave) noteStorageFailed();
      notify("zip", loaded
        ? "Loaded " + loaded + " recording" + (loaded === 1 ? "" : "s") + " from the zip." + (skipped ? " " + skipped + " could not be read." : "")
        : "No recordings were found in that zip." + (skipped ? " (" + skipped + " could not be read.)" : ""), loaded ? "good" : "");
    } catch (e) {
      notify("zip", "That does not look like a zip made by the Voice studio, so nothing was loaded.", "bad");
    }
    el.importFile.value = "";
    render();
  }
  function clearAll() {
    if (!voiceStore.keys().length) { notify("zip", "There are no recordings on this device to delete.", ""); return; }
    if (!window.confirm("Delete all " + voiceStore.keys().length + " recordings on this device? This cannot be undone. (Recordings shipped with the game stay.)")) return;
    voiceStore.clear().then(() => { notify("zip", "All recordings on this device were deleted.", ""); render(); });
  }

  /* ------------------------------ wiring ------------------------------ */

  function toggleTake() { if (state === "idle") startTake(); else if (state === "recording") stopTake(); }

  el.recBtn.onclick = toggleTake;
  el.backBtn.onclick = back;
  el.nextBtn.onclick = keepAndNext;
  el.playBtn.onclick = () => playClip(current());
  el.shippedBtn.onclick = playShipped;
  el.delBtn.onclick = removeCurrent;
  el.zipBtn.onclick = downloadZip;
  el.importBtn.onclick = () => el.importFile.click();
  el.importFile.onchange = () => { if (el.importFile.files[0]) loadZip(el.importFile.files[0]); };
  el.clearBtn.onclick = clearAll;
  el.onlyMissing.onchange = () => { onlyMissing = el.onlyMissing.checked; lsSet("lsw.voice.missing", onlyMissing ? "1" : "0"); render(); };
  el.groups.addEventListener("click", (e) => {
    const chip = e.target.closest(".chip");
    if (chip) { go(Number(chip.dataset.i)); chip.blur(); window.scrollTo({ top: 0, behavior: "smooth" }); }
  });
  el.groups.addEventListener("toggle", (e) => {      // toggle does not bubble, hence capture
    const g = e.target.dataset && e.target.dataset.group;
    if (g) { if (e.target.open) openGroups.add(g); else openGroups.delete(g); }
  }, true);
  // a mouse or finger click leaves focus on the button, where Space/Enter would press it again
  document.addEventListener("click", (e) => { const b = e.target.closest("button"); if (b && e.detail) b.blur(); });

  document.addEventListener("keydown", (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const t = e.target && e.target.tagName;
    if (/^(INPUT|SELECT|TEXTAREA|SUMMARY|A)$/.test(t) || (t === "BUTTON" && (e.key === " " || e.key === "Enter"))) return;
    const key = e.key;
    if (key === " " || key === "Enter" || key === "ArrowLeft" || key === "ArrowRight" || key === "Delete" || key === "Backspace" || key === "p" || key === "P") {
      e.preventDefault();
      if (e.repeat) return;
      if (key === " ") toggleTake();
      else if (key === "Enter" || key === "ArrowRight") keepAndNext();
      else if (key === "ArrowLeft") back();
      else if (key === "p" || key === "P") { if (state === "idle" && kind(current()) !== "none") playClip(current()); }
      else removeCurrent();
    }
  });

  /* ------------------------------ start ------------------------------ */

  voiceStore.ready.then(() => {
    onlyMissing = lsGet("lsw.voice.missing") !== "0";
    el.onlyMissing.checked = onlyMissing;
    const at = items.findIndex((c) => c.slug === lsGet("lsw.voice.at"));
    const firstMissing = items.findIndex((c) => kind(c) === "none");
    idx = at >= 0 ? at : Math.max(0, firstMissing);
    openGroups.add(current().group);
    render();
  });
})();
