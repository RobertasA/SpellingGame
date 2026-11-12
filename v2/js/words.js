"use strict";
/* =====================================================================
   Words & curriculum map
   ---------------------------------------------------------------------
   Thirty levels in six places, loosely following the order sounds and
   spellings are taught in English primary schools: Reception phonics
   (Letters and Sounds phases 2-4), then the Year 1 and Year 2 spelling
   content of the National Curriculum (English Appendix 1).

   Word notation
     "cat"          every letter is its own sound
     "sh.i.p"       dots split the word into graphemes (sound buttons)
     "ear."         a trailing dot makes the whole word one grapheme
     "wh.a.l.e~"    ~ marks a split digraph (a-e) in a level that is not
                    otherwise about split digraphs
     "cat:🐱"       an optional picture clue after a colon
   ===================================================================== */

const PLACES = [
  {
    id: "garden", name: "Cottage Garden", emoji: "🏡", stage: "Reception",
    friend: "mouse", friendName: "Pip", potion: "Glow Potion",
    plea: "Pip the mouse is scared of the dark.",
    need: "Let's brew a Glow Potion for Pip!",
    thanks: "Now Pip has a cosy little light. Night night, Pip!",
    ingredients: ["🌼", "✨", "🍯", "💧", "🌙"],
  },
  {
    id: "patch", name: "Pumpkin Patch", emoji: "🎃", stage: "Reception → Year 1",
    friend: "hedgehog", friendName: "Bramble", potion: "Cosy Potion",
    plea: "Bramble the hedgehog is shivery and cold.",
    need: "Let's brew a Cosy Potion for Bramble!",
    thanks: "Now Bramble is as warm as toast. Snug as a bug!",
    ingredients: ["🎃", "🍂", "🌰", "🍎", "🔥"],
  },
  {
    id: "pond", name: "Misty Pond", emoji: "🐸", stage: "Reception → Year 1",
    friend: "frog", friendName: "Lily", potion: "Singing Potion",
    plea: "Lily the frog has lost her croak.",
    need: "Let's brew a Singing Potion for Lily!",
    thanks: "Ribbit, ribbit! Lily can sing again!",
    ingredients: ["🍃", "💧", "🎵", "🌸", "🐚"],
  },
  {
    id: "glade", name: "Mushroom Glade", emoji: "🍄", stage: "Year 1",
    friend: "bat", friendName: "Flit", potion: "Brave Potion",
    plea: "Flit the bat is too shy to say hello.",
    need: "Let's brew a Brave Potion for Flit!",
    thanks: "Flit said hello! Now Flit has lots of friends.",
    ingredients: ["🍄", "💜", "🌟", "🍇", "🦋"],
  },
  {
    id: "peak", name: "Frosty Peak", emoji: "❄️", stage: "Year 1",
    friend: "owl", friendName: "Hoot", potion: "Mending Potion",
    plea: "Hoot the owl has a sore wing and cannot fly.",
    need: "Let's brew a Mending Potion for Hoot!",
    thanks: "Hoot's wing is all better. Up, up and away!",
    ingredients: ["❄️", "🌿", "🍵", "💙", "⭐"],
  },
  {
    id: "castle", name: "Moon Castle", emoji: "🏰", stage: "Year 2",
    friend: "dragon", friendName: "Ember", potion: "Get Well Potion",
    plea: "Ember the baby dragon has a sneezy cold.",
    need: "Let's brew a Get Well Potion for Ember!",
    thanks: "No more sneezes! Ember says sorry, and thank you.",
    ingredients: ["🍋", "🍯", "🍵", "🌈", "💖"],
  },
];

/* The fixed lines of the opening story (the two that mention the witch's name are built in ui.js).
   voice.js reads these too, so the recording list can't drift from what is said. */
const STORY_LINES = {
  tickle: "One night, a baby dragon had a very tickly nose…",
  achoo: "Ah… ah… ACHOO!",
  fall: "All the stars fell out of the sky, and hid in the Whispering Wood!",
};

const LEVEL_DEFS = [
  /* ---------------- 1 · Cottage Garden — first sounds, CVC words ---------------- */
  { focus: "s a t p i n", nc: "Phase 2 phonics: the first six letter sounds, blending and segmenting VC and CVC words.",
    words: ["sat", "pin:📌", "tap:🚰", "sip", "tip", "pat", "tan", "nap:😴", "pit", "pan:🍳", "nip", "tin:🥫", "it", "at", "in", "an", "ant:🐜", "pip", "sit", "nit"] },
  { focus: "m d g o c k", nc: "Phase 2 phonics: CVC words with m, d, g, o, c, k.",
    words: ["mat", "map:🗺️", "man:👨", "dad", "dog:🐶", "got", "cot", "cat:🐱", "cap:🧢", "can", "kit", "kid:🧒", "dig", "top", "pot:🍲", "mad", "sad:😢", "mop", "pig:🐷", "dot", "nod", "tag"] },
  { focus: "ck e u r", nc: "Phase 2 phonics: e, u, r and the 'ck' ending (Year 1: the /k/ sound spelt ck).",
    words: ["red:🔴", "ten:🔟", "pet", "net:🥅", "run:🏃", "sun:☀️", "cup:☕", "rug", "nut:🥜", "rat:🐀", "d.u.ck:🦆", "s.o.ck:🧦", "k.i.ck", "n.e.ck", "pen:🖊️", "mug", "p.e.ck", "mud", "r.o.ck", "men", "up"] },
  { focus: "h b f l", nc: "Phase 2 phonics: CVC words with h, b, f, l.",
    words: ["hat:🎩", "hen:🐔", "hop", "bed:🛏️", "bus:🚌", "bat:🦇", "fan", "log", "leg:🦵", "lip:👄", "bag:👜", "hug:🤗", "fun", "hut", "bun", "big", "fig", "b.a.ck", "lid", "fog"] },
  { focus: "ff ll ss zz · j v w x y z qu", nc: "Phase 2-3 phonics and Year 1: the sounds /f/ /l/ /s/ /z/ spelt ff, ll, ss, zz.",
    words: ["h.u.ff", "p.u.ff", "b.e.ll:🔔", "d.o.ll", "h.i.ll", "k.i.ss:💋", "jam", "jet:✈️", "van:🚐", "vet", "web:🕸️", "wig", "box:📦", "six:6️⃣", "fox:🦊", "yes", "zip", "b.u.zz:🐝", "qu.i.z", "f.i.zz", "m.o.ss", "h.i.ss:🐍", "w.e.ll", "j.u.g"] },

  /* ---------------- 2 · Pumpkin Patch — consonant digraphs and blends ---------------- */
  { focus: "sh ch", nc: "Phase 3 phonics: consonant digraphs sh and ch.",
    words: ["sh.i.p:🚢", "sh.o.p", "f.i.sh:🐟", "d.i.sh", "ch.i.n", "ch.i.p:🍟", "ch.o.p", "sh.e.d", "sh.e.ll:🐚", "w.i.sh", "r.i.ch", "m.u.ch", "s.u.ch", "ch.a.t", "r.u.sh", "c.a.sh", "ch.i.ck:🐥", "sh.u.t"] },
  { focus: "th ng", nc: "Phase 3 phonics: consonant digraphs th and ng.",
    words: ["th.i.s", "th.a.t", "th.e.m", "th.e.n", "w.i.th", "m.o.th", "b.a.th:🛁", "th.i.n", "th.i.ck", "r.i.ng:💍", "k.i.ng:👑", "s.i.ng:🎤", "s.o.ng:🎵", "l.o.ng", "w.i.ng", "b.a.ng", "th.i.ng", "h.a.ng"] },
  { focus: "nk · end blends", nc: "Phase 4 phonics and Year 1: the /ŋ/ sound before k (nk); adjacent consonants at the end of words.",
    words: ["pink", "sink", "wink:😉", "bunk", "th.i.n.k:🤔", "jump", "milk:🥛", "hand:✋", "tent:⛺", "pond", "desk", "lamp", "nest", "help", "belt", "gift:🎁", "wind", "bank", "honk", "best"] },
  { focus: "start blends", nc: "Phase 4 phonics: adjacent consonants at the start of words (CCVC).",
    words: ["frog:🐸", "crab:🦀", "stop:🛑", "swim:🏊", "flag:🚩", "drum:🥁", "trip", "clap:👏", "plum", "snap", "grin:😁", "slug", "spot", "step", "skip", "twig", "glad", "b.r.u.sh", "c.r.i.s.p", "s.p.e.ll"] },
  { focus: "tch · ve", nc: "Year 1: the /tʃ/ sound spelt tch; the /v/ sound at the end of words (ve).",
    words: ["w.i.tch:🧙‍♀️", "c.a.tch", "f.e.tch", "m.a.tch", "p.a.tch", "h.u.tch", "i.tch", "s.t.i.tch", "s.w.i.tch", "d.i.tch", "h.a.tch:🐣", "k.i.tch.e.n", "h.a.ve", "l.i.ve", "g.i.ve", "s.k.e.tch", "l.u.n.ch", "c.r.u.n.ch"] },

  /* ---------------- 3 · Misty Pond — vowel digraphs ---------------- */
  { focus: "ai ee", nc: "Phase 3 phonics and Year 1: vowel digraphs ai and ee.",
    words: ["r.ai.n:🌧️", "t.ai.l", "s.n.ai.l:🐌", "w.ai.t", "p.ai.n.t:🎨", "t.r.ai.n:🚂", "b.ee:🐝", "t.r.ee:🌳", "f.ee.t", "sh.ee.p:🐑", "g.r.ee.n:💚", "s.l.ee.p:😴", "s.ee.d", "qu.ee.n:👸", "s.ai.l:⛵", "n.ai.l", "w.ee.k", "ch.ai.n"] },
  { focus: "igh oa", nc: "Phase 3 phonics and Year 1: the trigraph igh and the digraph oa.",
    words: ["n.igh.t:🌙", "l.igh.t:💡", "h.igh", "r.igh.t", "b.r.igh.t", "f.igh.t", "s.igh.t", "m.igh.t", "b.oa.t:⛵", "c.oa.t:🧥", "g.oa.t:🐐", "r.oa.d", "s.oa.p:🧼", "t.oa.d:🐸", "f.l.oa.t", "m.oa.n", "t.oa.s.t:🍞", "c.r.oa.k"] },
  { focus: "oo", nc: "Phase 3 phonics and Year 1: oo as in moon and oo as in book.",
    words: ["m.oo.n:🌙", "z.oo", "b.oo.t:👢", "f.oo.d", "s.p.oo.n:🥄", "b.r.oo.m:🧹", "r.oo.f", "p.oo.l", "b.oo.k:📖", "l.oo.k:👀", "c.oo.k", "w.oo.d", "f.oo.t", "g.oo.d:👍", "h.oo.k", "w.oo.l:🧶", "z.oo.m", "h.oo.t:🦉", "t.oo.th:🦷"] },
  { focus: "ar or ur", nc: "Phase 3 phonics and Year 1: vowel digraphs ar, or, ur.",
    words: ["s.t.ar:⭐", "f.ar.m", "c.ar:🚗", "d.ar.k", "p.ar.k", "sh.ar.k:🦈", "f.or.k:🍴", "c.or.n:🌽", "h.or.n:📯", "s.t.or.m:⛈️", "b.or.n", "b.ur.n:🔥", "f.ur", "t.ur.n", "h.ur.t:🤕", "c.ur.l", "ch.ar.m", "j.ar"] },
  { focus: "ow oi ear air er", nc: "Phase 3 phonics and Year 1: ow, oi, the trigraphs ear and air, and the er ending.",
    words: ["c.ow:🐮", "ow.l:🦉", "d.ow.n:👇", "t.ow.n", "b.r.ow.n", "c.oi.n", "oi.l", "s.oi.l", "b.oi.l", "j.oi.n", "ear.:👂", "h.ear", "n.ear", "f.air", "h.air", "p.air", "l.a.dd.er", "h.a.mm.er:🔨", "l.e.tt.er:✉️", "s.u.mm.er"] },

  /* ---------------- 4 · Mushroom Glade — split digraphs, new spellings ---------------- */
  { focus: "a-e i-e", split: true, nc: "Phase 5 phonics and Year 1: split digraphs a-e and i-e.",
    words: ["cake:🎂", "game:🎲", "lake", "make", "came", "name", "snake:🐍", "plane:✈️", "bike:🚲", "kite", "time:⏰", "like", "slide", "smile:😊", "sh.i.n.e:✨", "five:5️⃣", "cave", "gate", "wave:🌊", "brave"] },
  { focus: "o-e u-e e-e", split: true, nc: "Phase 5 phonics and Year 1: split digraphs o-e, u-e and e-e.",
    words: ["home:🏠", "bone:🦴", "rope", "nose:👃", "stone", "hope", "cube:🧊", "tune:🎵", "cute", "huge", "rule", "th.e.s.e", "th.e.m.e", "broke", "smoke", "note", "flute", "woke", "mole", "rose:🌹"] },
  { focus: "ay ou ie ea", nc: "Phase 5 phonics and Year 1: new spellings ay, ou, ie, ea.",
    words: ["d.ay", "p.l.ay", "s.ay", "s.t.ay", "w.ay", "t.r.ay", "c.l.ou.d:☁️", "ou.t", "m.ou.th:👄", "sh.ou.t", "r.ou.n.d", "p.ie:🥧", "t.ie:👔", "l.ie", "s.ea:🌊", "ea.t", "t.ea:🍵", "d.r.ea.m:💭", "r.ea.d:📖", "b.ea.ch:🏖️", "s.p.r.ay", "f.ou.n.d", "c.r.ea.m"] },
  { focus: "oy ir ue aw", nc: "Phase 5 phonics and Year 1: new spellings oy, ir, ue, aw.",
    words: ["b.oy:👦", "t.oy:🧸", "j.oy", "e.n.j.oy", "g.ir.l:👧", "b.ir.d:🐦", "sh.ir.t:👕", "f.ir.s.t:🥇", "th.ir.d:🥉", "b.l.ue:🔵", "g.l.ue", "t.r.ue", "c.l.ue:🔎", "s.aw", "p.aw:🐾", "d.r.aw:✏️", "y.aw.n", "c.l.aw", "s.t.ir", "d.ir.t"] },
  { focus: "wh ph ew", nc: "Phase 5 phonics and Year 1: consonant spellings wh and ph; the digraph ew.",
    words: ["wh.e.n", "wh.i.ch", "wh.ee.l", "wh.i.t.e~", "wh.i.s.k", "wh.i.s.p.er", "d.o.l.ph.i.n:🐬", "ph.o.n.e~:📱", "ph.o.t.o:📷", "e.l.e.ph.a.n.t:🐘", "a.l.ph.a.b.e.t:🔤", "n.ew", "f.ew", "g.r.ew", "f.l.ew", "ch.ew", "s.t.ew:🍲", "b.l.ew", "c.r.ew", "wh.a.l.e~:🐳"] },

  /* ---------------- 5 · Frosty Peak — Year 1 tricky words and endings ---------------- */
  { focus: "tricky words", tricky: true, nc: "Year 1 common exception words (the, to, was, you, they...).",
    words: ["the", "to", "do", "of", "was", "is", "his", "has", "you", "your", "they", "be", "he", "me", "she", "we", "no", "go", "so", "by", "my", "are"] },
  { focus: "more tricky words", tricky: true, nc: "Year 1 common exception words (said, were, there, friend, school...).",
    words: ["said", "says", "were", "here", "there", "where", "love:❤️", "come", "some", "one:1️⃣", "once", "ask", "friend", "school:🏫", "put", "push", "pull", "full", "house:🏠", "our", "today"] },
  { focus: "-s -es -ing -ed -er · un-", nc: "Year 1: adding s and es; adding -ing, -ed, -er and -est where the root word does not change; the prefix un-.",
    words: ["c.a.t.s", "d.o.g.s", "r.o.ck.s", "w.i.sh.e.s", "f.o.x.e.s:🦊", "b.o.x.e.s", "c.a.tch.e.s", "j.u.m.p.i.ng", "h.u.n.t.i.ng", "b.u.zz.i.ng", "j.u.m.p.ed", "h.u.n.t.ed", "b.u.zz.ed", "qu.i.ck.er", "qu.i.ck.e.s.t", "f.r.e.sh.er", "u.n.d.o", "u.n.l.o.ck:🔓", "u.n.f.air", "u.n.h.a.pp.y", "u.n.p.a.ck", "h.e.l.p.i.ng", "f.l.oa.t.ed", "s.p.e.ll.i.ng"] },
  { focus: "-y · compound words", nc: "Year 1: words ending in -y (happy, very); compound words.",
    words: ["v.e.r.y", "h.a.pp.y:😀", "f.u.nn.y:😂", "p.ar.t.y:🎉", "f.a.m.i.l.y", "s.u.nn.y:☀️", "j.e.ll.y", "s.p.oo.k.y:👻", "f.oo.t.b.a.ll:⚽", "p.l.ay.g.r.ou.n.d", "f.ar.m.y.ar.d", "b.e.d.r.oo.m", "b.l.a.ck.b.e.rr.y", "s.u.n.s.e.t:🌇", "p.o.p.c.or.n:🍿", "s.t.ar.l.igh.t", "m.oo.n.l.igh.t", "b.r.oo.m.s.t.i.ck:🧹", "b.e.d.t.i.m.e~", "p.u.pp.y:🐶", "f.i.zz.y", "m.e.ss.y"] },
  { focus: "ore are ear au", nc: "Year 1: vowel trigraphs ore, are, ear (as in bear) and the digraph au.",
    words: ["m.ore", "s.c.ore", "b.e.f.ore", "w.ore", "sh.ore", "s.n.ore:😴", "b.ear:🐻", "p.ear:🍐", "w.ear", "c.are", "sh.are", "s.c.are.d", "d.are", "s.t.are", "d.i.n.o.s.aur:🦕", "a.s.t.r.o.n.au.t:👩‍🚀", "l.au.n.ch:🚀", "h.au.n.t:👻", "c.r.aw.l", "s.t.r.aw"] },

  /* ---------------- 6 · Moon Castle — Year 2 ---------------- */
  { focus: "kn gn wr", nc: "Year 2: the /n/ sound spelt kn and gn; the /r/ sound spelt wr.",
    words: ["kn.o.ck", "kn.ow", "kn.ee", "kn.igh.t", "kn.i.t:🧶", "kn.o.t", "kn.ew", "gn.a.t", "gn.aw", "gn.o.m.e~", "wr.i.t.e~:✍️", "wr.o.t.e~", "wr.o.ng:❌", "wr.a.p:🎁", "wr.i.s.t", "wr.e.n:🐦", "wr.i.gg.le", "wr.e.ck"] },
  { focus: "dge ge · soft c", nc: "Year 2: the /dʒ/ sound spelt dge, ge and g; the /s/ sound spelt c before e, i and y.",
    words: ["b.a.dge", "e.dge", "b.r.i.dge:🌉", "f.u.dge", "d.o.dge", "h.e.dge", "a.g.e~", "h.u.g.e~", "ch.a.n.ge", "v.i.ll.a.ge", "g.i.a.n.t", "m.a.g.i.c:✨", "g.e.m:💎", "r.a.c.e~:🏁", "i.c.e~:🧊", "m.i.c.e~:🐭", "c.i.t.y:🏙️", "f.a.n.c.y", "d.a.n.ce:💃", "s.p.a.c.e~:🚀", "p.r.i.n.ce:🤴", "j.ui.ce:🧃", "c.ir.c.le:⭕"] },
  { focus: "-le -el -al -il", nc: "Year 2: the /l/ or /əl/ sound at the end of words spelt -le, -el, -al and -il.",
    words: ["t.a.b.le", "a.pp.le:🍎", "b.o.tt.le:🍼", "l.i.tt.le", "m.i.dd.le", "c.a.n.d.le:🕯️", "p.u.dd.le", "c.u.dd.le:🤗", "c.a.m.el:🐫", "t.u.nn.el", "t.r.a.v.el", "t.ow.el", "j.ew.el:💎", "m.e.t.al", "p.e.t.al:🌸", "a.n.i.m.al", "p.e.n.c.il:✏️", "f.o.ss.il:🦴", "b.u.bb.le", "s.p.ar.k.le:✨", "t.w.i.n.k.le:🌟", "c.a.st.le:🏰"] },
  { focus: "all · wa · wor · o · ey", nc: "Year 2: /ɔː/ spelt a before l and ll; a after w; or after w; /ʌ/ spelt o; the -ey ending.",
    words: ["b.a.ll:⚽", "c.a.ll", "w.al.k:🚶", "t.al.k:💬", "al.w.ay.s", "w.a.n.t", "w.a.tch:⌚", "w.a.n.d:🪄", "w.a.sh", "s.w.a.n:🦢", "w.or.d", "w.or.k", "w.or.m:🐛", "w.or.l.d:🌍", "w.ar.m", "o.th.er", "m.o.th.er", "b.r.o.th.er", "n.o.th.i.ng", "k.ey:🔑", "d.o.n.k.ey", "m.o.n.k.ey:🐒", "h.o.n.ey:🍯", "s.m.a.ll", "t.a.ll"] },
  { focus: "Year 2 tricky words", tricky: true, nc: "Year 2 common exception words (because, could, people, beautiful...).",
    words: ["because", "find", "kind", "mind", "behind", "child", "children", "wild", "climb", "most", "only", "both", "old", "cold", "gold", "hold", "told", "every", "everybody", "even", "great", "break", "pretty", "beautiful", "after", "fast", "last", "past", "father", "class", "grass", "pass", "plant", "path", "bath", "hour", "move", "prove", "improve", "sure", "sugar", "eye", "could", "should", "would", "who", "whole", "any", "many", "clothes", "busy", "people", "water", "again", "half", "money", "parents"] },
];

const VOWELS = "aeiou";

/** Turn the compact notation into { text, graphemes: [{ t, split }], emoji }. */
function parseWord(raw, levelSplit) {
  let [body, emoji] = raw.split(":");
  const markSplit = levelSplit || body.includes("~");
  body = body.replace("~", "");
  const parts = body.includes(".") ? body.split(".").filter(Boolean) : body.split("");
  const graphemes = parts.map(t => ({ t, split: false }));
  const n = graphemes.length;
  if (markSplit && n >= 3) {
    const last = graphemes[n - 1], mid = graphemes[n - 2], vowel = graphemes[n - 3];
    if (last.t === "e" && !VOWELS.includes(mid.t[0]) && vowel.t.length === 1 && VOWELS.includes(vowel.t)) {
      vowel.split = last.split = true;
    }
  }
  return { text: parts.join(""), graphemes, emoji: emoji || "" };
}

const LEVELS_PER_PLACE = 5;
const WORD_INDEX = new Map();     // text -> word (first definition wins)

const LEVELS = LEVEL_DEFS.map((def, i) => {
  const place = Math.floor(i / LEVELS_PER_PLACE);
  const words = def.words.map(raw => {
    const w = parseWord(raw, !!def.split);
    w.tricky = !!def.tricky;
    w.level = i + 1;
    if (!WORD_INDEX.has(w.text)) WORD_INDEX.set(w.text, w);
    return w;
  });
  return {
    n: i + 1, place, step: i % LEVELS_PER_PLACE,
    focus: def.focus, nc: def.nc, tricky: !!def.tricky, words,
    // pacing: the very first levels show one star at a time and give lots of time
    stars: place === 0 ? 8 : 10,
    maxOnScreen: i < 3 ? 1 : 2,
    baseLife: i < 2 ? 22 : i < 5 ? 18 : 15,     // seconds for a 3-letter word
    perLetter: 1.6,                              // extra seconds per letter after the third
  };
});

/* Letters and graphemes that are easily muddled — used to make gentle distractors when brewing. */
const CONFUSABLE = {
  b: ["d", "p"], d: ["b", "p"], p: ["q", "b"], q: ["p", "g"], m: ["n", "w"], n: ["m", "u"], u: ["n", "a"],
  a: ["e", "o", "u"], e: ["a", "i"], i: ["e", "y"], o: ["a", "u"], c: ["k", "s"], k: ["c", "ck"], s: ["c", "z"],
  f: ["v", "th"], v: ["f", "w"], w: ["v", "wh"], g: ["j", "q"], j: ["g", "y"], t: ["f", "d"], l: ["i", "t"],
  h: ["n", "b"], r: ["n", "w"], x: ["s", "z"], y: ["i", "j"], z: ["s", "x"],
  sh: ["ch", "s"], ch: ["sh", "tch"], th: ["f", "t"], ng: ["n", "nk"], ck: ["k", "c"], qu: ["k", "q"],
  ff: ["f", "v"], ll: ["l", "i"], ss: ["s", "z"], zz: ["z", "s"], tch: ["ch", "sh"], ve: ["v", "f"],
  ai: ["ay", "a"], ay: ["ai", "a"], ee: ["ea", "e"], ea: ["ee", "e"], igh: ["ie", "i"], ie: ["igh", "y"],
  oa: ["ow", "o"], ow: ["ou", "oa"], ou: ["ow", "oo"], oo: ["u", "ew"], ew: ["oo", "ue"], ue: ["ew", "oo"],
  ar: ["a", "or"], or: ["aw", "ore"], ore: ["or", "aw"], aw: ["or", "au"], au: ["aw", "or"], aur: ["or", "ore"],
  ur: ["ir", "er"], ir: ["ur", "er"], er: ["ur", "a"], oi: ["oy", "o"], oy: ["oi", "o"],
  ear: ["eer", "air"], air: ["are", "ear"], are: ["air", "ear"], wh: ["w", "h"], ph: ["f", "p"],
  kn: ["n", "k"], gn: ["n", "g"], wr: ["r", "w"], dge: ["j", "ge"], ge: ["j", "dge"], ce: ["s", "se"],
  le: ["el", "al"], el: ["le", "il"], al: ["le", "el"], il: ["le", "al"], ey: ["y", "ee"], ed: ["d", "t"],
  st: ["s", "ss"], ui: ["oo", "u"],
};
