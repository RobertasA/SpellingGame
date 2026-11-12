"use strict";
/* =====================================================================
   Words & curriculum map
   ---------------------------------------------------------------------
   Thirty levels in six places. The hardest part of the game for a small
   child is finding the keys, so the first ten levels are about letters:
   a few new keys at a time (in the order phonics teaches them), and only
   words where every letter is its own sound. Phonics is the second layer:
   from level 11 the digraphs and other spellings follow, loosely in the
   order of Reception phonics (Letters and Sounds phases 3-5) and then the
   Year 1 and Year 2 spelling content of the National Curriculum (English
   Appendix 1).

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
    id: "garden", name: "Cottage Garden", emoji: "🏡", stage: "Finding the keys",
    friend: "mouse", friendName: "Pip", potion: "Glow Potion",
    plea: "Pip the mouse is scared of the dark.",
    need: "Let's brew a Glow Potion for Pip!",
    thanks: "Now Pip has a cosy little light. Night night, Pip!",
    ingredients: ["🌼", "✨", "🍯", "💧", "🌙"],
  },
  {
    id: "patch", name: "Pumpkin Patch", emoji: "🎃", stage: "Finding the keys",
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
    id: "castle", name: "Moon Castle", emoji: "🏰", stage: "Year 1 → Year 2",
    friend: "dragon", friendName: "Ember", potion: "Get Well Potion",
    plea: "Ember the baby dragon has a sneezy cold.",
    need: "Let's brew a Get Well Potion for Ember!",
    thanks: "No more sneezes! Ember says sorry, and thank you.",
    ingredients: ["🍋", "🍯", "🍵", "🌈", "💖"],
  },
];

/* Woodland visitors: little animals that pop out while flying and come along for the ride.
   Three live in each place (the third is shyer); finding them all is a reason to explore. */
const CRITTERS = [
  { id: "bunny",     name: "Clover",  animal: "bunny",      emoji: "🐰", place: 0 },
  { id: "chick",     name: "Pippin",  animal: "chick",      emoji: "🐥", place: 0 },
  { id: "piglet",    name: "Truffle", animal: "piglet",     emoji: "🐷", place: 0, shy: true },
  { id: "fox",       name: "Rusty",   animal: "fox cub",    emoji: "🦊", place: 1 },
  { id: "squirrel",  name: "Nutkin",  animal: "squirrel",   emoji: "🐿️", place: 1 },
  { id: "badger",    name: "Stripe",  animal: "badger",     emoji: "🦡", place: 1, shy: true },
  { id: "duckling",  name: "Puddle",  animal: "duckling",   emoji: "🦆", place: 2 },
  { id: "otter",     name: "Otto",    animal: "otter",      emoji: "🦦", place: 2 },
  { id: "turtle",    name: "Shelly",  animal: "turtle",     emoji: "🐢", place: 2, shy: true },
  { id: "fawn",      name: "Dapple",  animal: "fawn",       emoji: "🦌", place: 3 },
  { id: "ladybird",  name: "Dotty",   animal: "ladybird",   emoji: "🐞", place: 3 },
  { id: "raccoon",   name: "Bandit",  animal: "raccoon",    emoji: "🦝", place: 3, shy: true },
  { id: "penguin",   name: "Waddle",  animal: "penguin",    emoji: "🐧", place: 4 },
  { id: "polarbear", name: "Snowy",   animal: "polar bear", emoji: "🐻‍❄️", place: 4 },
  { id: "reindeer",  name: "Comet",   animal: "reindeer",   emoji: "🦌", place: 4, shy: true },
  { id: "lamb",      name: "Woolly",  animal: "cloud lamb", emoji: "🐑", place: 5 },
  { id: "panda",     name: "Bamboo",  animal: "panda",      emoji: "🐼", place: 5 },
  { id: "unicorn",   name: "Twinkle", animal: "unicorn",    emoji: "🦄", place: 5, shy: true },
];
const CRITTER_BY_ID = Object.fromEntries(CRITTERS.map(c => [c.id, c]));
/** What is said (and shown) when a visitor pops out. */
function critterHello(c) { return `${c.name} the ${c.animal} wants to come too!`; }

/* The fixed lines of the opening story (the two that mention the witch's name are built in ui.js).
   voice.js reads these too, so the recording list can't drift from what is said. */
const STORY_LINES = {
  tickle: "One night, a baby dragon had a very tickly nose…",
  achoo: "Ah… ah… ACHOO!",
  fall: "All the stars fell out of the sky, and hid in the Whispering Wood!",
};

/* Levels 1-10 are about finding the keys: each brings in two to four new letters, and every word
   is spelt with one letter per sound, using only letters met so far. */
const LETTER_LEVELS = 10;

const LEVEL_DEFS = [
  /* ---------------- 1 · Cottage Garden — the first keys ---------------- */
  { focus: "s a t p", nc: "Finding the first four keys. Phase 2 phonics: short words where every letter is one sound.",
    words: ["at", "sat", "pat", "tap:🚰", "sap", "taps", "pats", "spat"] },
  { focus: "i n", nc: "Two new keys: i and n. Phase 2 phonics: VC and CVC words.",
    words: ["it", "in", "an", "pin:📌", "tin:🥫", "sit", "sip", "tip", "pit", "nap:😴", "pan:🍳", "tan", "nip", "ant:🐜", "pip", "snap", "spin"] },
  { focus: "m d", nc: "Two new keys: m and d. Phase 2 phonics: CVC words.",
    words: ["mat", "map:🗺️", "man:👨", "dad", "mad", "sad:😢", "dip", "dim", "did", "and", "pad", "am", "damp", "sand", "mint", "mist", "stamp"] },
  { focus: "g o", nc: "Two new keys: g and o. Phase 2 phonics: CVC words.",
    words: ["dog:🐶", "got", "dig", "pig:🐷", "top", "pot:🍲", "mop", "dot", "nod", "tag", "on", "not", "gap", "pop", "pond", "stop:🛑", "spot"] },
  { focus: "c k", nc: "Two new keys: c and k — two letters for the same sound. Phase 2 phonics: CVC words.",
    words: ["cat:🐱", "cap:🧢", "can", "cot", "kit", "kid:🧒", "cod", "act", "camp:🏕️", "skip", "skin", "pink", "sink", "tank", "mask:🎭", "cost"] },

  /* ---------------- 2 · Pumpkin Patch — the rest of the keys ---------------- */
  { focus: "e u", nc: "Two new keys: e and u — now all five vowels. Phase 2 phonics: CVC words.",
    words: ["ten:🔟", "pet", "net:🥅", "pen:🖊️", "men", "peg", "get", "set", "den", "up", "cup:☕", "mug", "mud", "nut:🥜", "sun:☀️", "gum", "tug", "tent:⛺", "nest", "pump", "dust", "must", "desk"] },
  { focus: "r h", nc: "Two new keys: r and h. Phase 2 and 4 phonics: CVC words and words with adjacent consonants.",
    words: ["red:🔴", "run:🏃", "rug", "rat:🐀", "rip", "hat:🎩", "hen:🐔", "hop", "hug:🤗", "hut", "hot", "him", "had", "drum:🥁", "trip", "trap", "drip", "hand:✋", "rest", "grin:😁", "crisp", "honk", "step"] },
  { focus: "b f l", nc: "Three new keys: b, f and l. Phase 2 and 4 phonics: CVC words and words with adjacent consonants.",
    words: ["bed:🛏️", "bus:🚌", "bat:🦇", "bag:👜", "big", "bun", "fan", "fun", "fig", "fog", "log", "leg:🦵", "lip:👄", "lid", "flag:🚩", "frog:🐸", "crab:🦀", "milk:🥛", "lamp", "belt", "gift:🎁", "help", "clap:👏", "plum", "slug", "glad", "bank", "bunk", "best"] },
  { focus: "j v w", nc: "Three new keys: j, v and w. Phase 3 and 4 phonics: CVC words and words with adjacent consonants.",
    words: ["jam", "jet:✈️", "jug", "jog", "job", "van:🚐", "vet", "web:🕸️", "wig", "win", "wet", "swim:🏊", "twig", "jump", "wind", "went", "vest", "just", "wink:😉", "seven:7️⃣", "visit"] },
  { focus: "x y z q", nc: "The last four keys: x, y, z and q — now the whole alphabet. Phase 3 phonics.",
    words: ["box:📦", "six:6️⃣", "fox:🦊", "fix", "mix", "wax", "next", "yes", "yet", "yum", "yap", "zip", "zap", "zigzag", "quiz", "quit", "yak", "squid:🦑"] },

  /* ---------------- 3 · Misty Pond — two letters, one sound ---------------- */
  { focus: "ck ff ll ss zz", nc: "Year 1: the /k/ sound spelt ck, and /f/ /l/ /s/ /z/ spelt ff, ll, ss, zz after a short vowel — the first 'two letters, one sound' spellings.",
    words: ["d.u.ck:🦆", "s.o.ck:🧦", "k.i.ck", "n.e.ck", "p.e.ck", "r.o.ck", "b.a.ck", "qu.i.ck", "h.u.ff", "p.u.ff", "c.l.i.ff", "b.e.ll:🔔", "d.o.ll", "h.i.ll", "w.e.ll", "s.p.e.ll", "s.m.e.ll", "k.i.ss:💋", "m.o.ss", "h.i.ss:🐍", "d.r.e.ss:👗", "b.u.zz:🐝", "f.i.zz"] },
  { focus: "sh ch", nc: "Phase 3 phonics: consonant digraphs sh and ch.",
    words: ["sh.i.p:🚢", "sh.o.p", "f.i.sh:🐟", "d.i.sh", "ch.i.n", "ch.i.p:🍟", "ch.o.p", "sh.e.d", "sh.e.ll:🐚", "w.i.sh", "r.i.ch", "m.u.ch", "s.u.ch", "ch.a.t", "r.u.sh", "c.a.sh", "ch.i.ck:🐥", "sh.u.t", "b.r.u.sh"] },
  { focus: "th ng", nc: "Phase 3 phonics: consonant digraphs th and ng (and the /ŋ/ sound before k).",
    words: ["th.i.s", "th.a.t", "th.e.m", "th.e.n", "w.i.th", "m.o.th", "b.a.th:🛁", "th.i.n", "th.i.ck", "th.i.n.k:🤔", "r.i.ng:💍", "k.i.ng:👑", "s.i.ng:🎤", "s.o.ng:🎵", "l.o.ng", "w.i.ng", "b.a.ng", "th.i.ng", "h.a.ng"] },
  { focus: "tch · ve", nc: "Year 1: the /tʃ/ sound spelt tch; the /v/ sound at the end of words (ve).",
    words: ["w.i.tch:🧙‍♀️", "c.a.tch", "f.e.tch", "m.a.tch", "p.a.tch", "h.u.tch", "i.tch", "s.t.i.tch", "s.w.i.tch", "d.i.tch", "h.a.tch:🐣", "k.i.tch.e.n", "h.a.ve", "l.i.ve", "g.i.ve", "s.k.e.tch", "l.u.n.ch", "c.r.u.n.ch"] },
  { focus: "ai ee", nc: "Phase 3 phonics and Year 1: vowel digraphs ai and ee.",
    words: ["r.ai.n:🌧️", "t.ai.l", "s.n.ai.l:🐌", "w.ai.t", "p.ai.n.t:🎨", "t.r.ai.n:🚂", "b.ee:🐝", "t.r.ee:🌳", "f.ee.t", "sh.ee.p:🐑", "g.r.ee.n:💚", "s.l.ee.p:😴", "s.ee.d", "qu.ee.n:👸", "s.ai.l:⛵", "n.ai.l", "w.ee.k", "ch.ai.n"] },

  /* ---------------- 4 · Mushroom Glade — more vowel sounds, split digraphs ---------------- */
  { focus: "igh oa oo", nc: "Phase 3 phonics and Year 1: the trigraph igh, the digraph oa, and oo as in moon and as in book.",
    words: ["n.igh.t:🌃", "l.igh.t:💡", "h.igh", "r.igh.t", "b.r.igh.t", "f.igh.t", "m.igh.t", "b.oa.t:🚣", "c.oa.t:🧥", "g.oa.t:🐐", "r.oa.d", "s.oa.p:🧼", "t.oa.d", "t.oa.s.t:🍞", "f.l.oa.t", "c.r.oa.k", "m.oo.n:🌙", "z.oo", "b.oo.t:👢", "f.oo.d", "s.p.oo.n:🥄", "b.r.oo.m:🧹", "r.oo.f", "p.oo.l", "b.oo.k:📖", "l.oo.k:👀", "c.oo.k", "w.oo.d", "f.oo.t", "g.oo.d:👍", "w.oo.l:🧶", "h.oo.t:🦉", "t.oo.th:🦷"] },
  { focus: "ar or ur", nc: "Phase 3 phonics and Year 1: vowel digraphs ar, or, ur.",
    words: ["s.t.ar:⭐", "f.ar.m", "c.ar:🚗", "d.ar.k", "p.ar.k", "sh.ar.k:🦈", "f.or.k:🍴", "c.or.n:🌽", "h.or.n:📯", "s.t.or.m:⛈️", "b.or.n", "b.ur.n:🔥", "f.ur", "t.ur.n", "h.ur.t:🤕", "c.ur.l", "ch.ar.m", "j.ar"] },
  { focus: "ow oi ear air er", nc: "Phase 3 phonics and Year 1: ow, oi, the trigraphs ear and air, and the er ending.",
    words: ["c.ow:🐮", "ow.l:🦉", "d.ow.n:👇", "t.ow.n", "b.r.ow.n", "c.oi.n", "oi.l", "s.oi.l", "b.oi.l", "j.oi.n", "ear.:👂", "h.ear", "n.ear", "f.air", "h.air", "p.air", "l.a.dd.er", "h.a.mm.er:🔨", "l.e.tt.er:✉️", "s.u.mm.er"] },
  { focus: "a-e i-e", split: true, nc: "Phase 5 phonics and Year 1: split digraphs a-e and i-e.",
    words: ["cake:🎂", "game:🎲", "lake", "make", "came", "name", "snake:🐍", "plane:✈️", "bike:🚲", "kite", "time:⏰", "like", "slide", "smile:😊", "sh.i.n.e:✨", "five:5️⃣", "cave", "gate", "wave:🌊", "brave"] },
  { focus: "o-e u-e e-e", split: true, nc: "Phase 5 phonics and Year 1: split digraphs o-e, u-e and e-e.",
    words: ["home:🏠", "bone:🦴", "rope", "nose:👃", "stone", "hope", "cube:🧊", "tune:🎵", "cute", "huge", "rule", "th.e.s.e", "th.e.m.e", "broke", "smoke", "note", "flute", "woke", "mole", "rose:🌹"] },

  /* ---------------- 5 · Frosty Peak — new spellings, Year 1 tricky words ---------------- */
  { focus: "ay ou ie ea", nc: "Phase 5 phonics and Year 1: new spellings ay, ou, ie, ea.",
    words: ["d.ay", "p.l.ay", "s.ay", "s.t.ay", "w.ay", "t.r.ay", "c.l.ou.d:☁️", "ou.t", "m.ou.th:👄", "sh.ou.t", "r.ou.n.d", "p.ie:🥧", "t.ie:👔", "l.ie", "s.ea:🌊", "ea.t", "t.ea:🍵", "d.r.ea.m:💭", "r.ea.d:📖", "b.ea.ch:🏖️", "s.p.r.ay", "f.ou.n.d", "c.r.ea.m"] },
  { focus: "oy ir ue aw", nc: "Phase 5 phonics and Year 1: new spellings oy, ir, ue, aw.",
    words: ["b.oy:👦", "t.oy:🧸", "j.oy", "e.n.j.oy", "g.ir.l:👧", "b.ir.d:🐦", "sh.ir.t:👕", "f.ir.s.t:🥇", "th.ir.d:🥉", "b.l.ue:🔵", "g.l.ue", "t.r.ue", "c.l.ue:🔎", "s.aw", "p.aw:🐾", "d.r.aw:✏️", "y.aw.n", "c.l.aw", "s.t.ir", "d.ir.t"] },
  { focus: "wh ph ew", nc: "Phase 5 phonics and Year 1: consonant spellings wh and ph; the digraph ew.",
    words: ["wh.e.n", "wh.i.ch", "wh.ee.l", "wh.i.t.e~", "wh.i.s.k", "wh.i.s.p.er", "d.o.l.ph.i.n:🐬", "ph.o.n.e~:📱", "ph.o.t.o:📷", "e.l.e.ph.a.n.t:🐘", "a.l.ph.a.b.e.t:🔤", "n.ew", "f.ew", "g.r.ew", "f.l.ew", "ch.ew", "s.t.ew:🍲", "b.l.ew", "c.r.ew", "wh.a.l.e~:🐳"] },
  { focus: "tricky words", tricky: true, nc: "Year 1 common exception words (the, to, was, you, they...).",
    words: ["the", "to", "do", "of", "was", "is", "his", "has", "you", "your", "they", "be", "he", "me", "she", "we", "no", "go", "so", "by", "my", "are"] },
  { focus: "more tricky words", tricky: true, nc: "Year 1 common exception words (said, were, there, friend, school...).",
    words: ["said", "says", "were", "here", "there", "where", "love:❤️", "come", "some", "one:1️⃣", "once", "ask", "friend", "school:🏫", "put", "push", "pull", "full", "house:🏠", "our", "today"] },

  /* ---------------- 6 · Moon Castle — endings and Year 2 ---------------- */
  { focus: "-s -ing -ed -er -y · un-", nc: "Year 1: adding s and es; adding -ing, -ed, -er and -est where the root word does not change; the prefix un-; words ending in -y; compound words.",
    words: ["c.a.t.s", "d.o.g.s", "r.o.ck.s", "w.i.sh.e.s", "f.o.x.e.s:🦊", "b.o.x.e.s", "c.a.tch.e.s", "j.u.m.p.i.ng", "h.u.n.t.i.ng", "b.u.zz.i.ng", "h.e.l.p.i.ng", "s.p.e.ll.i.ng", "j.u.m.p.ed", "h.u.n.t.ed", "b.u.zz.ed", "f.l.oa.t.ed", "qu.i.ck.er", "qu.i.ck.e.s.t", "f.r.e.sh.er", "u.n.d.o", "u.n.l.o.ck:🔓", "u.n.f.air", "u.n.h.a.pp.y", "u.n.p.a.ck",
            "v.e.r.y", "h.a.pp.y:😀", "f.u.nn.y:😂", "p.ar.t.y:🎉", "f.a.m.i.l.y", "s.u.nn.y:🌞", "j.e.ll.y", "s.p.oo.k.y:👻", "p.u.pp.y:🐕", "f.i.zz.y", "m.e.ss.y",
            "f.oo.t.b.a.ll:⚽", "b.e.d.r.oo.m", "s.u.n.s.e.t:🌇", "p.o.p.c.or.n:🍿", "s.t.ar.l.igh.t", "m.oo.n.l.igh.t", "b.r.oo.m.s.t.i.ck", "b.e.d.t.i.m.e~", "f.ar.m.y.ar.d", "p.l.ay.g.r.ou.n.d", "b.l.a.ck.b.e.rr.y"] },
  { focus: "ore are ear au", nc: "Year 1: vowel trigraphs ore, are, ear (as in bear) and the digraph au.",
    words: ["m.ore", "s.c.ore", "b.e.f.ore", "w.ore", "sh.ore", "s.n.ore:💤", "b.ear:🐻", "p.ear:🍐", "w.ear", "c.are", "sh.are", "s.c.are.d", "d.are", "s.t.are", "d.i.n.o.s.aur:🦕", "a.s.t.r.o.n.au.t:👩‍🚀", "l.au.n.ch:🚀", "h.au.n.t", "c.r.aw.l", "s.t.r.aw"] },
  { focus: "kn gn wr · dge · soft c", nc: "Year 2: the /n/ sound spelt kn and gn; the /r/ sound spelt wr; the /dʒ/ sound spelt dge, ge and g; the /s/ sound spelt c before e, i and y.",
    words: ["kn.o.ck", "kn.ow", "kn.ee", "kn.igh.t", "kn.i.t", "kn.o.t", "kn.ew", "gn.a.t", "gn.aw", "gn.o.m.e~", "wr.i.t.e~:✍️", "wr.o.t.e~", "wr.o.ng:❌", "wr.a.p", "wr.i.s.t", "wr.e.n", "wr.i.gg.le", "wr.e.ck",
            "b.a.dge", "e.dge", "b.r.i.dge:🌉", "f.u.dge", "d.o.dge", "h.e.dge", "a.g.e~", "h.u.g.e~", "ch.a.n.ge", "v.i.ll.a.ge", "g.i.a.n.t", "m.a.g.i.c:🪄", "g.e.m:💎", "r.a.c.e~:🏁", "i.c.e~", "m.i.c.e~:🐭", "c.i.t.y:🏙️", "f.a.n.c.y", "d.a.n.ce:💃", "s.p.a.c.e~", "p.r.i.n.ce:🤴", "j.ui.ce:🧃", "c.ir.c.le:⭕"] },
  { focus: "-le -el -al · all wa wor ey", nc: "Year 2: the /l/ sound at the end of words spelt -le, -el, -al and -il; /ɔː/ spelt a before l and ll; a after w; or after w; /ʌ/ spelt o; the -ey ending.",
    words: ["t.a.b.le", "a.pp.le:🍎", "b.o.tt.le:🍼", "l.i.tt.le", "m.i.dd.le", "c.a.n.d.le:🕯️", "p.u.dd.le", "c.u.dd.le", "b.u.bb.le:🫧", "s.p.ar.k.le", "t.w.i.n.k.le:🌟", "c.a.st.le:🏰", "c.a.m.el:🐫", "t.u.nn.el", "t.r.a.v.el", "t.ow.el", "j.ew.el", "m.e.t.al", "p.e.t.al:🌸", "a.n.i.m.al", "p.e.n.c.il", "f.o.ss.il",
            "b.a.ll", "c.a.ll", "s.m.a.ll", "t.a.ll", "w.al.k:🚶", "t.al.k:💬", "al.w.ay.s", "w.a.n.t", "w.a.tch:⌚", "w.a.n.d", "w.a.sh", "s.w.a.n:🦢", "w.or.d", "w.or.k", "w.or.m:🐛", "w.or.l.d:🌍", "w.ar.m", "o.th.er", "m.o.th.er", "b.r.o.th.er", "n.o.th.i.ng", "k.ey:🔑", "d.o.n.k.ey", "m.o.n.k.ey:🐒", "h.o.n.ey:🍯"] },
  { focus: "Year 2 tricky words", tricky: true, nc: "Year 2 common exception words (because, could, people, beautiful...).",
    words: ["because", "find", "kind", "mind", "behind", "child", "children", "wild", "climb", "most", "only", "both", "old", "cold", "gold", "hold", "told", "every", "everybody", "even", "great", "break", "pretty", "beautiful", "after", "fast", "last", "past", "father", "class", "grass", "pass", "plant", "path", "hour", "move", "prove", "improve", "sure", "sugar", "eye", "could", "should", "would", "who", "whole", "any", "many", "clothes", "busy", "people", "water", "again", "half", "money", "parents"] },
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
    letters: i < LETTER_LEVELS,                  // a keyboard level: single letters only
    // pacing: the first place shows one star at a time, and the letter levels give lots of time
    stars: place === 0 ? 8 : 10,
    maxOnScreen: i < 5 ? 1 : 2,
    baseLife: i < 5 ? 22 : i < LETTER_LEVELS ? 19 : 15,     // seconds for a 3-letter word
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
