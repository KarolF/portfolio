# Playfield — Playable Ads Gallery

A standalone HTML/CSS/JavaScript gallery featuring Jelly Orbit, Tiki Treats, Paper Boat Parade, and Dinosaur Dig. Each game loads on demand in the preview modal. Restart creates a fresh game; closing removes the game and its audio. Press Escape to close, including while playing inside the iframe.

## Local preview

Serve this folder over HTTP, for example:

```powershell
python -m http.server 8000 --bind 127.0.0.1
```

Then open `http://127.0.0.1:8000`. Stop the server with Ctrl+C when finished. Check that port 8000 is free before starting it. Use HTTP rather than opening `index.html` directly so the gallery and its iframe keyboard controls share an origin.

## Refresh a playable

The gallery contains copies of the production exports. Edit and rebuild the original project, then replace its gallery copy. The original three game commands below run from `C:\phaser\prototypes`; Dinosaur Dig uses its own project root.

| Game | Production export | Gallery copy |
| --- | --- | --- |
| Jelly Orbit | `jelly-orbit/dist/index.html` | `playables/jelly-orbit/index.html` |
| Tiki Treats | `tiki-treats.html` | `playables/tiki-treats/index.html` |
| Paper Boat Parade | `paper-boat-parade.html` | `playables/paper-boat-parade/index.html` |
| Dinosaur Dig | `C:/Users/elpar/DinosaurDig/output/portfolio/dinosaur-dig/index.html` | `playables/dinosaur-dig/index.html` |

Jelly Orbit source lives in `jelly-orbit/src/`. Rebuild with `npm --prefix jelly-orbit run build`; verify an existing export with `npm --prefix jelly-orbit run verify`. Do not copy `jelly-orbit/index.html`: it is a development entrypoint.

Tiki Treats source is `cloudberry-cafe/tiki-template.html.in`. Rebuild with `node cloudberry-cafe/package-tiki.cjs`. This also regenerates the project's HTML aliases.

Paper Boat Parade source is `paper-boat-art/game.template.html.in`, `paper-boat-art/puzzle-engine.js`, and `paper-boat-art/runtime/`. Rebuild with `node paper-boat-art/package-html.cjs`. Do not copy `game.template.html`: it is a redirect launcher.

Dinosaur Dig source lives in `C:/Users/elpar/DinosaurDig`. Run `node scripts/build-playable.cjs` from that project root, then copy `output/portfolio/dinosaur-dig/index.html` here. Its standalone SVG/HTML5 build shares the puzzle logic with the Cocos project. The release is 382,528 bytes, with all six sound cues embedded. Released boards fall in front of the remaining puzzle. A blocked puzzle shows an animated Restart hint. Victory has one CTA, followed by a CTA-clicked popup; OK restarts the round. Audio is paused when the game loses focus.

Each shipped export embeds its scripts, styles, and artwork. No separate game assets or runtime dependencies are required. After copying an export, compare its checksum with the original and test gameplay, Restart, replay, Escape, and Close through the gallery.

## Website files

- `index.html` — page structure and hero artwork.
- `styles.css` — responsive gallery and player styling.
- `app.js` — game metadata, iframe lifecycle, and navigation.
- `assets/jelly-orbit.jpg`, `assets/tiki-treats.jpg`, `assets/paper-boat-parade.jpg`, `assets/dinosaur-dig.jpg` — screenshots of the shipped games, shared by cards and hero.
- `playables/<game>/index.html` — standalone production exports.

Only trusted same-origin exports belong in this gallery: its keyboard integration accesses each iframe document. GitHub Pages publishes the repository root from `main`; this gallery is served at `/portfolio/v3/`. Publish the `v3` files together, retaining relative paths and content hashes. Verify all four games, audio, Restart, Escape and Close before pushing.
