// A simple automatic player. Before a level is shown to the player, the bot
// plays it at full speed with the player's real loadout. If the bot cannot
// win, the level is eased ("mercy") until it can, but only down to the
// upgrade wall (see mercyFloor). The bot is deliberately
// held back (slower hands, weaker guns), so a level it can beat always has
// room for a human to beat it too.

const { SCROLL, ROAD_HALF } = __m["src/data.js"];
const { Sim } = __m["src/sim.js"];
const { generateLevel } = __m["src/levelgen.js"];
const BOT_HANDICAP = 0.85; // bot deals 85% of the player's damage
const BOT_STRAFE = 9; // bot moves at half the player's top speed
const MERCY_STEPS = [1, 0.88, 0.77, 0.67, 0.58, 0.5, 0.42, 0.35, 0.28, 0.22, 0.16, 0.11, 0.07, 0.045, 0.03, 0.02, 0.012, 0.007, 0.004, 0.002, 0.001, 0.0004];

// The upgrade wall. While the player can afford something worthwhile in the
// armory, a level is never eased below this fraction of its full strength.
// Enemies toughen by roughly 10-15% a level, so gear that is three or four
// levels out of date drops below the floor: the level then cannot be won
// until some coins are spent. A player with nothing left to buy is never
// walled; for them the easing goes as far as it needs to.
const WALL_FLOOR = +(globalThis.process?.env?.HB_FLOOR || 0.72);
const WALL_FREE_LEVELS = 3; // a new player has nothing to spend yet

function mercyFloor(n) {
  return n <= WALL_FREE_LEVELS ? 0.42 : WALL_FLOOR;
}

function gateWorth(sim, g) {
  if (g.kind === 'add') return g.val;
  if (g.kind === 'mul') return sim.count * (g.val - 1);
  return sim.count * (g.val - 1) * 0.9;
}

// Marked ground about to be hit: find the nearest spot that keeps the squad
// (or as much of it as possible) clear. Null when nothing is close to landing.
function botDodge(sim) {
  let live = null;
  for (const h of sim.hazards) {
    if (h.t > 1.15) continue;
    const z = h.s - sim.p - (sim.bossHold ? 0 : SCROLL * h.t); // where it will be, relative to the squad
    if (Math.abs(z) > h.zr + sim.squadR * 0.5 + 0.6) continue;
    (live = live || []).push(h);
  }
  if (!live) return null;
  const R = sim.squadR;
  const lim = ROAD_HALF - Math.min(R, 1.2) * 0.6;
  let best = sim.x;
  let bestCost = Infinity;
  for (let i = 0; i <= 40; i++) {
    const x = -lim + (i / 40) * 2 * lim;
    let cost = Math.abs(x - sim.x) * 0.02;
    for (const h of live) {
      const w = Math.min(x + R + 0.25, h.x1) - Math.max(x - R - 0.25, h.x0);
      if (w > 0) cost += (w / (2 * R)) * h.share * 10 + 0.2;
    }
    if (cost < bestCost) {
      bestCost = cost;
      best = x;
    }
  }
  return best;
}

function botThink(sim) {
  const p = sim.p;
  const dps = Math.max(0.001, sim.dps);
  const dodge = botDodge(sim);
  if (dodge !== null) return dodge;

  // Enemies about to arrive: face them.
  let nearW = 0;
  let nearX = 0;
  let farW = 0;
  let farX = 0;
  let nearN = 0;
  for (const e of sim.enemies) {
    if (e.hp <= 0 || e.z < 0) continue;
    if (e.z < 9) {
      const w = (e.dmg || 1) / (e.z + 1);
      nearW += w;
      nearX += e.x * w;
      nearN += e.dmg || 1;
    } else if (e.z < 46) {
      const w = 1 / Math.pow(e.z + 2, 1.5);
      farW += w;
      farX += e.x * w;
    }
  }

  // The next row of gates.
  let rowS = Infinity;
  for (const g of sim.gates) if (!g.used && g.s - p > 0 && g.s < rowS) rowS = g.s;
  let gateX = null;
  let mustHold = false;
  if (rowS - p < 26) {
    let best = null;
    let bestV = -Infinity;
    for (const g of sim.gates) {
      if (g.used || Math.abs(g.s - rowS) > 1.4) continue;
      let v = gateWorth(sim, g);
      if (g.bar >= 0 && sim.barriers[g.bar].alive) {
        const bar = sim.barriers[g.bar];
        const timeLeft = (bar.s - p) / SCROLL - 0.4;
        if (bar.hp / dps > timeLeft * 0.75) v = 0; // cannot open it in time
      }
      if (v > bestV) {
        bestV = v;
        best = g;
      }
    }
    if (best && bestV > 0) {
      gateX = (best.x0 + best.x1) / 2;
      // Hold the line for a gate that is close and worth it, or to keep
      // shooting a barrier open.
      const worthIt = bestV >= sim.count * 0.08;
      mustHold = (rowS - p < 7 && worthIt) || (best.bar >= 0 && sim.barriers[best.bar].alive);
    } else if (best) {
      // Every option is bad (for example a troop-losing gate): steer clear.
      let worst = null;
      for (const g of sim.gates) {
        if (g.used || Math.abs(g.s - rowS) > 1.4) continue;
        if (gateWorth(sim, g) < 0) worst = g;
      }
      if (worst && rowS - p < 8) {
        const mid = (worst.x0 + worst.x1) / 2;
        gateX = mid > 0 ? worst.x0 - 1.5 : worst.x1 + 1.5;
        mustHold = true;
      }
    }
  }

  const danger = nearN > Math.max(1, sim.count * 0.12);
  if (gateX !== null && (mustHold || !danger) && rowS - p < 16) return gateX;
  if (nearW > 0 && danger) return nearX / nearW;
  if (gateX !== null) return gateX;

  // A crate worth cracking open.
  for (const c of sim.crates) {
    const cz = c.s - p;
    if (c.alive && cz > 2 && cz < 40 && nearW === 0) return c.x;
  }
  if (sim.boss && sim.boss.hp > 0 && sim.boss.z < 50 && nearW === 0) return sim.boss.x;
  if (nearW > 0) return nearX / nearW;
  if (farW > 0) return farX / farW;
  return 0;
}

// Fast-forward a level with the bot at the controls.
function botPlay(level, loadout, opts = {}) {
  // The bot never calls an airstrike: levels are proven winnable without one.
  const sim = new Sim(level, loadout, { handicap: opts.handicap ?? BOT_HANDICAP, maxStrafe: opts.maxStrafe ?? BOT_STRAFE, bonusUnits: opts.bonusUnits, strike: opts.strike });
  const every = opts.thinkEvery ?? 6;
  let i = 0;
  while (!sim.result) {
    if (i++ % every === 0) sim.targetX = botThink(sim);
    sim.step();
  }
  return sim;
}

// Find the hardest version of level n that this loadout can win.
//   opts.wall       true while the player could afford an upgrade: easing
//                   then stops at the upgrade wall (mercyFloor).
//   opts.extraEase  go this many steps easier than strictly needed (used
//                   after defeats); never below the wall.
// If no allowed version can be won, the result has verified: false. With the
// wall up, that means: upgrade to get through.
function planLevel(n, seed, loadout, opts = {}) {
  const wall = opts.wall !== false;
  const extraEase = opts.extraEase || 0;
  const floor = wall ? mercyFloor(n) : 0;
  const steps = MERCY_STEPS.filter((m) => m > floor + 1e-9);
  if (wall) steps.push(floor);
  const last = steps.length - 1;
  const start = 0;
  let checks = 0;
  const tryStep = (i) => {
    const level = generateLevel(n, seed, steps[i]);
    // Two different play styles must both win, so the result does not hinge
    // on one lucky line through the level.
    let run = botPlay(level, loadout);
    checks++;
    if (run.result === 'win') {
      run = botPlay(level, loadout, { maxStrafe: BOT_STRAFE * 1.8, thinkEvery: 9 });
      checks++;
    }
    return { ok: run.result === 'win', level, mercy: steps[i], step: i, botLeft: run.count, botProgress: run.progress };
  };
  const done = (r) => {
    if (r.ok && extraEase > 0 && r.step < last) {
      const softer = tryStep(Math.min(last, r.step + extraEase));
      if (softer.ok) r = softer;
    }
    return { ...r, checks, floor, wall, verified: r.ok };
  };

  let r = tryStep(start);
  if (r.ok) return done(r);
  let pass = start === last ? r : tryStep(last);
  if (!pass.ok) return done(pass); // with the wall up: upgrade needed
  // `lo` fails, `hi` passes: narrow down to the hardest step that passes.
  let lo = start;
  let hi = last;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    const m = tryStep(mid);
    if (m.ok) {
      hi = mid;
      pass = m;
    } else lo = mid;
  }
  return done(pass);
}

return { BOT_HANDICAP, BOT_STRAFE, WALL_FLOOR, mercyFloor, botThink, botPlay, planLevel };
