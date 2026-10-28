# Gem Fairy — a spelling game

A gentle, no-stress spelling game for a kid, inspired by typing shooters like ztype.
It's built in 3D with [three.js](https://threejs.org/).

## The idea

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

## Running it

Open `index.html` in a browser (an internet connection is needed to load three.js and
the font). For sound to load reliably, serve the folder locally instead:

```bash
python3 -m http.server 8000
```

then visit <http://localhost:8000>.

## Assets

The 3D art is all made in code. Music and sound effects under `assets/audio/` are CC0 —
see [CREDITS.md](CREDITS.md) for sources and authors.
