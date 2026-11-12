# Spelling games

Two gentle, no-stress spelling games for young children. Both are built in 3D with
[three.js](https://threejs.org/), run in any modern browser, and save progress on the device.

| | Game | Open |
|---|---|---|
| **v2** | **Little Star Witch** — a story-led spelling adventure for 5–7 year olds who love witches | [`v2/index.html`](v2/index.html) |
| v1 | Gem Fairy — type words to catch gems | [`index.html`](index.html) |

---

## v2 · Little Star Witch 🧙‍♀️⭐

> One night a baby dragon with a tickly nose did a great big sneeze — *ACHOO!* — and blew all the
> stars out of the sky. They are hiding in the Whispering Wood. A little witch and her cat fly
> out on their broom to **spell them home**.

![Little Star Witch: the Pumpkin Patch, with the witch, her cat, the cauldron and Bramble the hedgehog](v2/screenshot.png)

Every level has two parts:

1. **Fly** — a lost star peeks out of a pumpkin, a mushroom or a snowdrift, holding a word.
   Read it and type it; the star whooshes back up into the sky. Each right letter rings one note
   higher than the last. A star that isn't spelled in time just hides and comes back later.
2. **Brew** — land beside the cauldron. *Look* at a word, it is *covered*, then *build it* from
   sound tiles (`sh` `i` `p`) and *check*. Three words make one potion ingredient.

Five ingredients make a potion for a woodland friend who needs a little help: Pip the mouse is
scared of the dark, Bramble the hedgehog is cold, Lily the frog has lost her croak, Flit the bat is
shy, Hoot the owl has a sore wing — and in the last place, Ember the baby dragon needs a Get Well
Potion for that sneezy cold. Everyone you help comes along on the rest of the adventure.

### What's in it

- **30 levels in 6 places** (Cottage Garden, Pumpkin Patch, Misty Pond, Mushroom Glade, Frosty
  Peak, Moon Castle), each with its own sky, scenery and friend. About 650 words.
- **Sound buttons** under every word — a dot for one letter, a bar for a digraph (`sh`, `igh`),
  an arc for a split digraph (`a-e`) — the same marking children see in phonics lessons.
- **Read aloud** (British English voice where the device has one): the story, each word when a star
  goes home, and the word to spell when brewing. Tap any word to hear it.
- **Kind by design**: nothing can be lost or failed. The wood slows down while a word is being
  typed, the next key glows if a child is stuck, and after two wrong tries the right tile lights up.
- **Words that wobble come back**: a word that hid or needed several tries is remembered and
  slipped into later levels for another go. Brewing favours the words that were hardest when flying.
- **Dress up**: choose skin, hair, outfit, cat and broom sparkles, and name the witch.
  New outfits and cats unlock as stars are collected.
- **On-screen keyboard** on tablets, in lower case, with vowels picked out; `q w e r t y` or
  `a b c` order. `Esc` pauses, `Backspace` lets go of a word.
- **A page for grown-ups**: settings, the curriculum focus of every level, the child's wobbly
  words, and a switch to unlock every level so an older child can start further on.
- **Works offline**: three.js and the fonts are bundled, sound effects are made in code, and after
  one visit over https the game is cached and can be added to a tablet's home screen.

### Curriculum link (England)

The levels loosely follow the order sounds and spellings are taught in English primary schools —
Reception phonics, then the spelling content of the National Curriculum for Year 1 and Year 2
(English Appendix 1). It is a practice game, not a scheme of work.

| Place | Levels | Roughly | Focus |
|---|---|---|---|
| 🏡 Cottage Garden | 1–5 | Reception (Phase 2) | `s a t p i n`, `m d g o c k`, `ck e u r`, `h b f l`, `ff ll ss zz`, `j v w x y z qu` — VC and CVC words |
| 🎃 Pumpkin Patch | 6–10 | Reception → Year 1 (Phases 3–4) | `sh ch`, `th ng`, `nk` and end blends, start blends, `tch` and `-ve` |
| 🐸 Misty Pond | 11–15 | Reception → Year 1 (Phase 3) | `ai ee`, `igh oa`, `oo`, `ar or ur`, `ow oi ear air er` |
| 🍄 Mushroom Glade | 16–20 | Year 1 (Phase 5) | split digraphs `a-e i-e o-e u-e e-e`, `ay ou ie ea`, `oy ir ue aw`, `wh ph ew` |
| ❄️ Frosty Peak | 21–25 | Year 1 | common exception words, `-s -es -ing -ed -er -est`, `un-`, `-y`, compound words, `ore are ear au` |
| 🏰 Moon Castle | 26–30 | Year 2 | `kn gn wr`, `dge ge` and soft `c`, `-le -el -al -il`, `all`, `wa`, `wor`, `o` as in *other*, `-ey`, Year 2 common exception words |

Typing a word that is on screen practises reading, letter recognition and keyboard skills.
Brewing practises spelling from memory with the "look, cover, write, check" routine, and building
words from graphemes rather than single letters.

### Running it

Open `v2/index.html` in a browser — it works straight from disk, no internet needed.
To also get the offline cache and "add to home screen", serve the folder:

```bash
python3 -m http.server 8000      # then visit http://localhost:8000/v2/
```

### How it is put together

No build step and no dependencies to install. Plain scripts, loaded in order:

| File | What it holds |
|---|---|
| `v2/js/words.js` | the six places, thirty levels and all the words (with their sound buttons) |
| `v2/js/core.js` | saved progress, sound effects (Web Audio), voice |
| `v2/js/engine.js` | renderer, toon materials, shape helpers, mesh merging, particles, camera |
| `v2/js/models.js` | the witch, her cat, the six friends, cauldron, stars, wardrobe colours |
| `v2/js/world.js` | sky, moon, the six biomes and their scenery and hiding spots |
| `v2/js/game.js` | the flying part: words, typing, stars, level flow |
| `v2/js/brew.js` | the brewing part and the "friend gets a potion" scenes |
| `v2/js/ui.js` | title, map, dress up, friends, story, grown-ups page |
| `v2/js/main.js` | keyboard input, the frame loop, start-up |

To add or change words, edit `v2/js/words.js` — the notation is explained at the top of the file
(`"sh.i.p:🚢"` is *ship*, split into its three sounds, with a picture clue).

Progress is stored in the browser's `localStorage` under `littleStarWitch.v2`.

---

## v1 · Gem Fairy

A little puppy fairy flies through a sunny woodland. Gems peek out of bushes, mushrooms,
stumps and flowers, and each gem carries a word. **Type the word to catch the gem** —
the fairy zaps it with a star wand and it flies into the bag. If the fairy flies past before
the word is spelled, the gem just hides again. There's no losing, only trying again.

- **20 levels** that follow a phonics order: SATPIN words first, then new sounds,
  digraphs (sh, ch, th), blends, vowel teams, magic-e, tricky words, and finally long words.
- As levels go up the fairy flies faster and more gems can be out at once.
- The forest slows down while you're in the middle of spelling a word.
- **Colour challenges** on some levels: e.g. fill the bag of 10, with at least 4 green.
- Each gem caught has a chance to bring a **woodland friend** (bunny, bear, panda, frog,
  duckling, owl, fox, hedgehog) who joins the crew hopping along behind the fairy.
  See them all under **My Crew**.
- Stars per level: 3 stars for catching every gem, fewer if some hid again.
- Optional read-aloud: the game says each word when you catch it (🗣️ button).
- Tablets get an on-screen keyboard. `Esc` pauses, `Backspace` lets go of a word.

Progress, stars and your crew are saved in the browser (localStorage).

Open `index.html` in a browser (an internet connection is needed to load three.js and
the font). For sound to load reliably, serve the folder locally as above and visit
<http://localhost:8000>.

## Assets

All the 3D art in both games is made in code. Music, fonts and libraries are open-source —
see [CREDITS.md](CREDITS.md) for sources and authors.
