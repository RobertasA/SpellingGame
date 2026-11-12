# Bundled three.js

`three.min.js` is three.js r160 plus the handful of add-ons the game uses
(`EffectComposer`, `RenderPass`, `ShaderPass`, `UnrealBloomPass`, `OutputPass`, `SimplexNoise`),
bundled into one classic script that defines `window.THREE`. Keeping it a classic
script means the game still opens straight from disk, with no web server.

To rebuild it (for example to add another add-on, or to move to a newer three.js):

```bash
npm install three@0.160.0 esbuild
npx esbuild three-entry.js --bundle --format=iife --global-name=THREE --minify \
  --legal-comments=none --outfile=three.min.js
```

Licence: MIT — see `three.LICENSE`.
