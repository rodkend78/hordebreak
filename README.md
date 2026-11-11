# Hordebreak

A one-screen lane shooter for phones and desktop. Steer a squad down a road,
pick gates to grow it, shoot through hordes, step off marked ground, call in
airstrikes and bring down a boss every fifth level. Coins buy weapons, tougher
infantry and upgrades between battles.

**Play it: https://rodkend78.github.io/hordebreak/**

The whole game is a single file, `index.html`: plain WebGL2 and WebAudio, no
libraries, no image or sound files. Open it in a browser to play.

## Controls

| Action | Touch | Mouse and keyboard |
| --- | --- | --- |
| Steer | Drag left and right | Move the mouse, or arrow keys / A and D |
| Airstrike (level 3+, once charged) | Tap **Strike** | Space, or click **Strike** |
| Pause | Tap **II** | Esc or P |
| Fullscreen | | F, or the button on the home screen |

On a phone the game plays in a tall view from above. In a wide window
(at least 820 by 560, wider than tall) it fills the window with a lower camera
that looks further up the road, the menus stand in a column on the left, and
the armory shows its three shelves side by side.

## Build

```bash
python3 build.py
```

This joins `head.html`, every module listed in `order.txt`, and `tail.html`
into `index.html`. There is no bundler and nothing to install.

## Publishing

The site is served by GitHub Pages from the `gh-pages` branch. Every push to
`main` runs `.github/workflows/publish.yml`, which checks that `index.html`
is up to date with the sources and then moves `gh-pages` to the new commit.
The live page follows a minute or two later.

## Layout

| Path | What it holds |
| --- | --- |
| `src/data.js` | Weapons, infantry, enemies, upgrades, economy |
| `src/sim.js` | The rules: deterministic, fixed-step, no drawing |
| `src/levelgen.js` | Builds a level from its number and seed |
| `src/bot.js` | Automatic player that proves each level is winnable before it is shown |
| `src/render.js` | WebGL2 renderer (instanced meshes and sprites) |
| `src/fx.js`, `src/audio.js` | Effects and synthesised sound |
| `src/ui.js`, `src/main.js` | Menus, HUD, game loop, controls, saving |
| `src/meshes.js` | Unpacks the models for the renderer |
| `src/models.js`, `src/thumbs.js` | **Generated** from Blender: packed models and armory portraits |
| `art/` | Blender scripts that author every model |
| `tools/` | Balance run and screenshot driver |

## Models

Characters, weapons and props are authored in Blender from Python
(`art/models.py`, using the small toolkit in `art/kit.py`). The horde follows
one style: chunky faceted bodies in the unit's colour, steel armour plates,
bone spikes, and glowing hexagon and triangle insets.

The bake paints ambient occlusion and lighter chamfered edges into vertex
colours, and each mesh is packed into the 17-byte vertex format the game's
shader reads (position, normal, colour, tint, walk-cycle swing with its hinge
height and depth, glow). The hinge depth is what lets a four-legged body move
each leg about its own hip.

To change a model and rebuild:

```bash
pip install bpy            # Blender as a Python module (about 400 MB)
python art/build_art.py export   # writes out/models.bin and out/models.json
python art/build_art.py thumbs   # renders armory portraits to out/thumbs/
python3 gen_models.py            # regenerates src/models.js and src/thumbs.js
python3 build.py
```

`python art/build_art.py horde` (or `squad`, `boss`, `props`) renders preview
sheets into `out/`.

## Checks

```bash
node tools/balance.mjs 40
```

Plays levels 1 to 40 headlessly as a player who wins and spends sensibly, with
both a careful and a deliberately sloppy bot, and prints how much each level
had to be eased.

```bash
node tools/shot.cjs '{"level":10}' out/shot "2,6"
```

Drives the built page in headless Chromium through Playwright and saves
screenshots. Further arguments pick a mode (`play`, `strike`, `home`,
`armory`) and a moment to fast-forward to; see the top of the script.

## Saving

Progress is kept in the browser's `localStorage` under `hordebreak-save-v1`.
