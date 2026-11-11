// Ties everything together: saving, the game loop, touch controls, effects.

const { DT, ROAD_HALF, WEAPONS, INFANTRY, ENEMIES, newSave, loadoutOf, buy, canUpgrade, starsFor } = __m["src/data.js"];
const { Sim, coinsEarned } = __m["src/sim.js"];
const { planLevel, botThink } = __m["src/bot.js"];
const { Renderer } = __m["src/render.js"];
const { Fx } = __m["src/fx.js"];
const { Sound } = __m["src/audio.js"];
const { buildUI, show, renderHome, renderArmory, renderResult, updateHud, toast, setHint } = __m["src/ui.js"];
const SAVE_KEY = 'hordebreak-save-v1';

function loadSave() {
  const fresh = newSave();
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return fresh;
    const s = JSON.parse(raw);
    if (!s || s.v !== 1) return fresh;
    return { ...fresh, ...s, owned: { ...fresh.owned, ...s.owned }, upg: { ...fresh.upg, ...s.upg } };
  } catch (e) {
    return fresh; // storage unavailable: play without saving
  }
}
function storeSave() {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(save));
  } catch (e) {
    /* storage unavailable */
  }
}

const stage = document.getElementById('stage');
buildUI(document.getElementById('ui'));
const el = (id) => document.getElementById(id);

let renderer;
try {
  renderer = new Renderer(el('gl'), el('labels'));
} catch (err) {
  el('ui').innerHTML = `<section class="screen"><div class="panel"><h2 class="verdict small">Cannot start</h2><p class="brief">This browser does not support WebGL2, which the game needs to draw in 3D. Try a current version of Chrome, Safari, Firefox or Edge.</p></div></section>`;
  throw err;
}

const sound = new Sound();
const save = loadSave();
sound.on = save.sound;

let plan = null;
let sim = null;
let state = 'home'; // home | play | ending | result | armory | pause
let armoryFrom = 'home';
let endTimer = 0;
let peak = 0;
let acc = 0;
let lastT = 0;
let time = 0;
let hintTimer = 0;
let slowFor = 0;
let strikeReady = false; // has "airstrike ready" been announced for this charge?
const fx = new Fx();
const flashEl = document.createElement('div');
flashEl.id = 'flash';
stage.appendChild(flashEl);
const keys = { left: false, right: false };

// Work out the next level: the hardest version the bot can still win with
// this loadout, eased further after defeats. While the player has coins for
// a worthwhile upgrade the easing stops at the upgrade wall, and the plan may
// come back unverified: the squad is outgunned until the player upgrades.
function prepare() {
  const lo = loadoutOf(save);
  plan = planLevel(save.level, save.seed, lo, { wall: canUpgrade(save), extraEase: Math.min(6, save.lossStreak) });
  sim = new Sim(plan.level, lo, { record: true });
  peak = sim.count;
  fx.reset();
  acc = 0;
}

function goHome() {
  state = 'home';
  prepare();
  renderHome(save, plan);
  show('screen-home');
}

function startBattle() {
  sound.unlock();
  sound.play('tap');
  if (!sim || sim.t > 0) prepare();
  state = 'play';
  show(null);
  mouse.active = false;
  if (!save.seenHelp) {
    setHint(true, finePointer.matches);
    hintTimer = 4;
  }
  strikeReady = false;
  const newcomer = Object.keys(ENEMIES).find((k) => ENEMIES[k].from === sim.L.n && k !== 'grunt');
  if (!plan.verified) toast('Outgunned: upgrade first', 2200);
  else if (plan.level.boss) toast('Boss level', 1800);
  else if (newcomer) toast('New enemy: ' + ENEMIES[newcomer].name, 2400);
}

function callStrike() {
  if (state !== 'play' || !sim.callStrike()) return;
  toast('Airstrike inbound', 1400);
  save.seenStrike = true;
}

function openArmory(from) {
  sound.unlock();
  sound.play('tap');
  armoryFrom = from;
  state = 'armory';
  renderArmory(save, onBuy);
  show('screen-armory');
}

function onBuy(offer) {
  const wasOwned = offer.kind !== 'upgrade' && offer.owned;
  if (buy(save, offer)) {
    sound.play(wasOwned ? 'tap' : 'buy');
    storeSave();
  }
  const list = el('armory-list');
  const y = list.scrollTop;
  renderArmory(save, onBuy);
  list.scrollTop = y;
}

function finish() {
  const lo = sim.lo;
  const win = sim.result === 'win';
  const coins = coinsEarned(sim, lo.coinMul);
  const info = {
    win,
    level: sim.L.n,
    coins,
    kills: sim.kills,
    lost: sim.lost,
    peak,
    survivors: sim.count,
    progress: sim.progress,
    stars: win ? starsFor(sim.lost, sim.count) : 0,
    unlocks: [],
    streak: 0,
    walled: false,
  };
  save.coins += coins;
  if (win) {
    save.level++;
    save.wins++;
    save.lossStreak = 0;
    save.seed = (save.seed * 31 + 17) % 99991;
    for (const it of [...WEAPONS, ...INFANTRY]) if (it.unlock === save.level) info.unlocks.push(it.name);
  } else {
    save.lossStreak++;
  }
  info.streak = save.lossStreak;
  save.seenHelp = true;
  storeSave();
  sound.play(win ? 'win' : 'lose');
  state = 'result';
  prepare(); // plan what comes next, so the result screen can say if it needs upgrades
  info.walled = !plan.verified;
  renderResult(save, info);
  show('screen-result');
}

// ---- the loop ----
function frame(ms) {
  requestAnimationFrame(frame);
  const now = ms / 1000;
  let dt = Math.min(0.1, now - lastT || 0);
  lastT = now;
  time += dt;

  if (state === 'play' || state === 'ending') {
    if (keys.left) sim.targetX -= 13 * dt;
    if (keys.right) sim.targetX += 13 * dt;
    if (mouse.active && state === 'play') {
      // The squad heads for the spot on the road under the cursor. Worked out
      // every frame, because the camera drifts as the squad moves.
      const rx = renderer.roadX((mouse.x - stage.getBoundingClientRect().left) * renderer.dpr);
      if (rx !== null) sim.targetX = rx;
    }
    sim.targetX = Math.max(-ROAD_HALF, Math.min(ROAD_HALF, sim.targetX));
    // Big moments (a boss going down) play out in slow motion.
    const pace = fx.slow > 0 ? 0.3 : 1;
    fx.slow = Math.max(0, fx.slow - dt);
    acc += dt * pace;
    let steps = 0;
    while (acc >= DT && steps < 5) {
      sim.step();
      acc -= DT;
      steps++;
    }
    if (acc > DT * 5) acc = 0;
    if (sim.count > peak) peak = sim.count;
    fx.handle(sim, sound, toast);
    updateHud(sim, save, coinsEarned(sim, sim.lo.coinMul));
    if (sim.strikeOn && sim.charge >= 1 && !strikeReady) {
      strikeReady = true;
      sound.play('ready');
      if (!save.seenStrike) toast(finePointer.matches ? 'Airstrike ready: press Space' : 'Airstrike ready: tap Strike', 2600);
    } else if (sim.charge < 1) strikeReady = false;
    if (hintTimer > 0) {
      hintTimer -= dt;
      if (hintTimer <= 0) setHint(false);
    }
    if (state === 'play' && sim.result) {
      state = 'ending';
      endTimer = sim.result !== 'win' ? 1.3 : sim.boss ? 2.4 : 1.0; // a boss gets time to blow up
      setHint(false);
    } else if (state === 'ending') {
      endTimer -= dt;
      if (endTimer <= 0) finish();
    }
  }
  if (state !== 'pause') fx.update(fx.slow > 0 ? dt * 0.3 : dt, state === 'play' || state === 'ending' ? sim : null, sound);
  flashEl.style.opacity = fx.screenFlash > 0.01 ? (fx.screenFlash * 0.8).toFixed(2) : '0';
  if (sim) renderer.draw(sim, fx, time);

  // If the device cannot hold a smooth frame rate, draw at a lower resolution.
  if (state === 'play' && dt > 0 && !window.__HB_LOCK_QUALITY) {
    slowFor = dt > 1 / 40 ? slowFor + dt : Math.max(0, slowFor - dt * 2);
    if (slowFor > 2 && renderer.maxDpr > 1) {
      renderer.maxDpr = Math.max(1, renderer.maxDpr - 0.5);
      renderer.resize();
      slowFor = 0;
    } else if (slowFor > 2 && renderer.farZ > 10) {
      // Already at the lowest resolution: draw the detailed models only up close.
      renderer.farZ = Math.max(10, renderer.farZ - 11);
      slowFor = 0;
    }
  }
}

// ---- controls ----
// A mouse steers by position, with no button held; a finger drags.
const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
const mouse = { x: 0, active: false };
let drag = null;
stage.addEventListener('pointerdown', (e) => {
  if (state !== 'play' || e.target.closest('button') || e.pointerType === 'mouse') return;
  mouse.active = false;
  drag = { id: e.pointerId, x: e.clientX, start: sim.targetX };
  try {
    stage.setPointerCapture(e.pointerId);
  } catch (err) {
    /* not capturable */
  }
  if (hintTimer > 0) hintTimer = Math.min(hintTimer, 0.6);
});
stage.addEventListener('pointermove', (e) => {
  if (e.pointerType === 'mouse') {
    mouse.x = e.clientX;
    mouse.active = true;
    if (state === 'play' && hintTimer > 0) hintTimer = Math.min(hintTimer, 0.6);
    return;
  }
  if (!drag || drag.id !== e.pointerId || state !== 'play') return;
  // On a wide screen the road is only part of the view: a drag covers the
  // road's width on screen, not the whole window's.
  const a = renderer.wide && renderer.project(-ROAD_HALF, 0, 0);
  const b = renderer.wide && renderer.project(ROAD_HALF, 0, 0);
  const w = a && b ? Math.max(200, ((b.x - a.x) / renderer.dpr) * 1.35) : stage.clientWidth || 1;
  sim.targetX = Math.max(-ROAD_HALF, Math.min(ROAD_HALF, drag.start + ((e.clientX - drag.x) / w) * ROAD_HALF * 2 * 1.35));
});
const endDrag = (e) => {
  if (drag && drag.id === e.pointerId) drag = null;
};
stage.addEventListener('pointerup', endDrag);
stage.addEventListener('pointercancel', endDrag);
function toggleFullscreen() {
  const app = document.getElementById('app');
  try {
    if (document.fullscreenElement) document.exitFullscreen();
    else if (app.requestFullscreen) app.requestFullscreen().catch(() => {});
  } catch (err) {
    /* fullscreen is optional */
  }
}

window.addEventListener('keydown', (e) => {
  const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
  if (k === 'ArrowLeft' || k === 'a') { keys.left = true; mouse.active = false; }
  if (k === 'ArrowRight' || k === 'd') { keys.right = true; mouse.active = false; }
  if ((k === 'Escape' || k === 'p') && state === 'play') pause();
  else if (k === 'p' && state === 'pause') resume();
  if (k === 'f' && !e.repeat && !e.ctrlKey && !e.metaKey) toggleFullscreen();
  if (e.key === ' ' && state === 'play') {
    e.preventDefault();
    callStrike();
  }
});
window.addEventListener('keyup', (e) => {
  const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
  if (k === 'ArrowLeft' || k === 'a') keys.left = false;
  if (k === 'ArrowRight' || k === 'd') keys.right = false;
});

function pause() {
  if (state !== 'play') return;
  state = 'pause';
  show('screen-pause');
}
document.addEventListener('visibilitychange', () => {
  if (document.hidden) pause();
});

el('btn-start').addEventListener('click', startBattle);
el('btn-armory').addEventListener('click', () => openArmory('home'));
el('btn-result-armory').addEventListener('click', () => openArmory('result'));
el('btn-back').addEventListener('click', () => {
  sound.play('tap');
  goHome(); // the loadout may have changed, so plan the level again
});
el('btn-next').addEventListener('click', startBattle);
el('btn-pause').addEventListener('click', pause);
el('btn-strike').addEventListener('click', callStrike);
function resume() {
  state = 'play';
  lastT = 0;
  show(null);
}
el('btn-resume').addEventListener('click', resume);
// Fullscreen is offered only where the browser allows it.
el('btn-full').hidden = !document.fullscreenEnabled;
el('btn-full').addEventListener('click', toggleFullscreen);
el('btn-quit').addEventListener('click', goHome);
el('btn-sound').addEventListener('click', () => {
  save.sound = !save.sound;
  sound.on = save.sound;
  sound.unlock();
  sound.play('tap');
  storeSave();
  el('btn-sound').classList.toggle('off', !save.sound);
});
window.addEventListener('resize', () => renderer.resize());

goHome();
requestAnimationFrame(frame);

// Handy for testing from the browser console.
window.__hordebreak = { save, botThink, goHome, fx, renderer, get sim() { return sim; }, get plan() { return plan; }, get state() { return state; } };

return {  };
