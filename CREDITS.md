# Asset Credits

Everything in this repository is open-source. The audio in `assets/` is **CC0 1.0 (public
domain)**; the library and fonts bundled with v2 are MIT and SIL OFL. Credits are given with thanks.

## Little Star Witch (v2)

Everything you see is built in code: the witch, her cat, the six friends, the cauldron, the
stars and all six places are original procedural 3D models made for this game. All sound
effects are synthesised in the browser with the Web Audio API. No image or sound-effect files
are used.

| Asset | Files | Source | Author | License |
|---|---|---|---|---|
| three.js r160 | `v2/lib/three.min.js` | [threejs.org](https://threejs.org/) | three.js authors | MIT (`v2/lib/three.LICENSE`) |
| Fredoka (interface font) | `v2/fonts/fredoka-*.woff2` | [Fontsource](https://fontsource.org/fonts/fredoka) / Google Fonts | The Fredoka Project Authors | SIL OFL 1.1 (`v2/fonts/Fredoka-OFL.txt`) |
| Andika (word font, designed for new readers) | `v2/fonts/andika-*.woff2` | [Fontsource](https://fontsource.org/fonts/andika) / SIL | SIL International | SIL OFL 1.1 (`v2/fonts/Andika-OFL.txt`) |
| Background music loop | `assets/audio/music.mp3` (shared with v1) | [Cozy Puzzle In-Game 1](https://opengameart.org/content/cozy-puzzle-in-game-1) | Samza | CC0 1.0 |

The vendored `three.min.js` is the stock r160 build with only its start-up deprecation
`console.warn` removed.

## Gem Fairy (v1)

The music is CC0; three.js (MIT) and the Fredoka font (OFL) are loaded from CDNs.

### Visuals

Everything you see is built in code with [three.js](https://threejs.org/) (MIT license,
loaded from the jsDelivr CDN): the puppy fairy, the woodland crew, the gems, trees,
hiding spots and sparkles are all original procedural 3D models made for this game.
No external image assets are used.

Earlier 2D versions of the game used Kenney's Animal Pack Remastered and Background
Elements Remastered (CC0) and Sylly's Gem Match 3 Set (CC0); those files were removed
with the 3D rebuild.

### Audio

| Asset | Files | Source | Author | License |
|---|---|---|---|---|
| Background music loop | `assets/audio/music.mp3` | [Cozy Puzzle In-Game 1](https://opengameart.org/content/cozy-puzzle-in-game-1) | Samza | CC0 1.0 |
| Key tap, wrong letter, gem collect SFX | `assets/audio/key.ogg`, `assets/audio/wrong.ogg`, `assets/audio/collect.ogg` | [Interface Sounds](https://kenney.nl/assets/interface-sounds) | Kenney | CC0 1.0 |
| Reward & level-complete jingles | `assets/audio/reward.ogg`, `assets/audio/complete.ogg` | [Music Jingles](https://kenney.nl/assets/music-jingles) (Pizzicato set) | Kenney | CC0 1.0 |

### License verification notes

- **Cozy Puzzle In-Game 1** — OpenGameArt page lists CC0; track is marked loopable by the author.
- **Kenney packs** — kenney.nl assets are CC0; each pack ships a `License.txt` confirming this.

Candidate sources that were evaluated but not used: FreePD.com (site has shut down),
"Natural Forest Fantasy Music" by Thalon (CC-BY — passed over in favour of a CC0 track),
Tiny Creatures by Clint Bellanger, SunnyLand Woods by Ansimuz, GEMS!!! by Winternaut,
and Animated Wild Animals by scratchio (all CC0 — used in earlier pixel-art revisions
of this branch and replaced by the Kenney flat-cartoon set).
