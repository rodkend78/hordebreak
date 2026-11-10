// Builds a level from its number. Levels are endless: each one is assembled
// from segments (gate choices, hordes, gate corridors, crates) and ends in a
// last stand or, every 5th level, a boss.
//
// "mercy" (0..1) scales the threat down. It stays at 1 unless the pre-flight
// check in bot.js finds the level cannot be won with the player's loadout.

const { ROAD_HALF, ENEMIES, refAt, isBossLevel, levelReward } = __m["src/data.js"];
const { mulberry32, hashSeed } = __m["src/rng.js"];
const TENSION_MIN = 0.46;
const TENSION_MAX = 1.0;
const DIFFICULTY = 1.25; // one knob for overall toughness
const HORDE_CAP = 240; // most bodies in one horde; above this they get tougher instead

// How hard the level leans on the player: starts gentle at level 1 and climbs toward its ceiling.
function tensionAt(n) {
  return TENSION_MIN + (TENSION_MAX - TENSION_MIN) * (1 - Math.exp(-(n - 1) / 14));
}

function generateLevel(n, seed, mercy = 1) {
  const rng = mulberry32(hashSeed(n, seed));
  const rr = (a, b) => a + (b - a) * rng();
  const ri = (a, b) => Math.floor(rr(a, b + 1));
  const pick = (arr) => arr[Math.floor(rng() * arr.length)];

  const ref = refAt(n);
  const boss = isBossLevel(n);
  const tension = tensionAt(n) * (boss ? 0.85 : 1) * DIFFICULTY;
  const hpUnit = ref.crowdDps * 0.8 * mercy; // toughness of one grunt
  const thin = Math.max(0.3, Math.sqrt(mercy)); // mercy also thins the crowd
  const length = 150 + Math.min(n, 26) * 6 + (boss ? -20 : 0);

  const L = {
    n, seed, mercy, length, tension, hpUnit,
    boss: null,
    spawns: [], gates: [], barriers: [], crates: [],
    reward: levelReward(n),
    refStart: ref.startCount,
  };

  // Expected squad strength as the level unfolds, counted in troops. Fire-rate
  // and damage bonuses are folded in as if they were extra troops.
  let exp = ref.startCount;
  let gateRows = 0;
  let s = 22;

  const types = Object.keys(ENEMIES).filter((k) => ENEMIES[k].from <= n);

  function addEnemy(type, x, at, pack) {
    const d = ENEMIES[type];
    L.spawns.push({
      type,
      x: Math.max(-ROAD_HALF + d.r, Math.min(ROAD_HALF - d.r, x)),
      s: at,
      hp: d.hp * hpUnit * pack,
      dmg: d.dmg * pack,
    });
  }

  // A block of enemies worth `seconds` of the expected squad's fire.
  function horde(at, x0, x1, seconds, flavor) {
    // A small squad covers less of the road, so it gets a lighter load.
    const cover = 0.55 + 0.45 * Math.min(1, Math.max(0, (exp - 6) / 34));
    let budget = exp * 1.25 * seconds * tension * thin * cover; // in grunt-equivalents
    const heavy = [];
    if (types.includes('giant') && flavor === 'final' && rng() < 0.6) {
      heavy.push('giant');
      budget -= ENEMIES.giant.hp;
    }
    if (types.includes('brute')) {
      const k = Math.floor((budget * rr(0.1, 0.22)) / ENEMIES.brute.hp);
      for (let i = 0; i < Math.min(k, 8); i++) heavy.push('brute');
      budget -= Math.min(k, 8) * ENEMIES.brute.hp;
    }
    budget = Math.max(4, budget);
    // Split the rest between light types.
    const mix = [['grunt', 1]];
    if (types.includes('runner')) mix.push(['runner', flavor === 'rush' ? 1.2 : 0.22]);
    if (types.includes('shield')) mix.push(['shield', 0.16]);
    if (types.includes('bomber')) mix.push(['bomber', 0.07]);
    const wsum = mix.reduce((a, m) => a + m[1], 0);
    const bodies = [];
    for (const [t, w] of mix) {
      const k = Math.round(((budget * w) / wsum) / ENEMIES[t].hp);
      for (let i = 0; i < k; i++) bodies.push(t);
    }
    // A few spitters ride at the back of a block and shell the squad as it closes.
    const spitters = types.includes('spitter') && flavor !== 'lane' ? Math.min(n >= 16 ? 4 : 3, Math.max(n === ENEMIES.spitter.from ? 2 : 0, Math.round(budget / 110))) : 0;
    let pack = 1;
    if (bodies.length > HORDE_CAP) {
      pack = bodies.length / HORDE_CAP;
      const keep = [];
      for (let i = 0; i < HORDE_CAP; i++) keep.push(bodies[Math.floor((i * bodies.length) / HORDE_CAP)]);
      bodies.length = 0;
      bodies.push(...keep);
    }
    // Shuffle so types are mixed through the block.
    for (let i = bodies.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [bodies[i], bodies[j]] = [bodies[j], bodies[i]];
    }
    const width = x1 - x0;
    const cols = Math.max(2, Math.floor(width / 0.82));
    const rows = Math.ceil(bodies.length / cols);
    for (let i = 0; i < bodies.length; i++) {
      const r = Math.floor(i / cols);
      const c = i % cols;
      const x = x0 + ((c + 0.5) / cols) * width + rr(-0.2, 0.2);
      addEnemy(bodies[i], x, at + r * 0.85 + rr(-0.2, 0.2), pack);
    }
    let depth = rows * 0.85;
    for (let i = 0; i < spitters; i++) {
      addEnemy('spitter', x0 + ((i + 0.5) / spitters) * width + rr(-0.5, 0.5), at + depth + 1.5 + rr(0, 2.5), 1);
    }
    for (const h of heavy) {
      addEnemy(h, rr(x0 + 0.8, x1 - 0.8), at + rr(0, Math.max(1, depth)) + (h === 'giant' ? depth * 0.5 : 0), 1);
    }
    exp = Math.max(3, exp * (1 - 0.12 * tension));
    return depth;
  }

  function gateValue(g) {
    if (g.kind === 'add') return g.val;
    return exp * (g.val - 1);
  }

  function gain(g, share = 1) {
    if (g.kind === 'add') exp += g.val * share;
    else exp *= 1 + (g.val - 1) * share;
    exp = Math.min(exp, 700);
  }

  function randomGate(big) {
    const roll = rng();
    if (roll < 0.55) return { kind: 'add', val: Math.max(2, Math.round(exp * rr(0.25, 0.45) * (big ? 1.7 : 1))) };
    if (roll < 0.7) return { kind: 'mul', val: big || gateRows < 2 ? 2 : 1.5 };
    if (roll < 0.85) return { kind: 'rate', val: big ? 1.4 : pick([1.15, 1.2, 1.25]) };
    return { kind: 'dmg', val: big ? 1.5 : pick([1.2, 1.25, 1.3]) };
  }

  // Two gates side by side: pick one.
  function gatePair(at) {
    let a = randomGate(false);
    let b = randomGate(false);
    for (let i = 0; i < 4 && b.kind === a.kind; i++) b = randomGate(false);
    let guard = null;
    if (n >= 6 && gateRows >= 1 && rng() < 0.28) {
      // A tempting gate guarded by brutes, next to a gate that costs troops.
      a = randomGate(true);
      b = { kind: 'add', val: -Math.max(2, Math.round(exp * rr(0.15, 0.3))) };
      guard = a;
    }
    const flip = rng() < 0.5;
    const left = flip ? a : b;
    const right = flip ? b : a;
    L.gates.push({ ...left, s: at, x0: -ROAD_HALF, x1: 0, bar: -1 });
    L.gates.push({ ...right, s: at, x0: 0, x1: ROAD_HALF + 0.01, bar: -1 });
    if (guard) {
      const gx = (guard === left ? -1 : 1) * ROAD_HALF * 0.5;
      const k = Math.max(1, Math.round(2 * thin * tension + 0.5));
      for (let i = 0; i < k; i++) addEnemy('brute', gx + rr(-1.4, 1.4), at + 3 + i * 1.4, 1);
    }
    gain(gateValue(a) >= gateValue(b) ? a : b);
    gateRows++;
  }

  // The signature piece: a free lane of small gates on one side, a lane of big
  // gates locked behind a barrier on the other, and a horde down the middle.
  function corridor(at) {
    const side = rng() < 0.5 ? -1 : 1;
    const k = ri(6, 8);
    const small = Math.max(1, Math.round(exp * 0.05));
    const m = ri(4, 5);
    const big = Math.max(4, Math.round(small * rr(3, 4)));
    const gap = 2.7;
    const lane = 2.4;
    const sx0 = side < 0 ? -ROAD_HALF : ROAD_HALF - lane;
    const bx0 = side < 0 ? ROAD_HALF - lane : -ROAD_HALF;
    for (let i = 0; i < k; i++) {
      L.gates.push({ kind: 'add', val: small, s: at + 4 + i * gap, x0: sx0, x1: sx0 + lane, bar: -1, lane: true });
    }
    const barIdx = L.barriers.length;
    L.barriers.push({
      s: at + 2.5,
      x0: bx0,
      x1: bx0 + lane,
      maxHp: Math.max(4, ref.unitDps * mercy * exp * rr(1.8, 2.6)),
    });
    for (let i = 0; i < m; i++) {
      L.gates.push({ kind: 'add', val: big, s: at + 5 + i * gap, x0: bx0, x1: bx0 + lane, bar: barIdx, lane: true });
    }
    const span = Math.max(k, m) * gap + 5;
    horde(at + 6, -ROAD_HALF + lane + 0.2, ROAD_HALF - lane - 0.2, 3.0, 'lane');
    exp = Math.min(700, exp + Math.max(small * k, big * m * 0.75));
    return span;
  }

  function crate(at) {
    const kinds = ['rate', 'dmg', 'squad'];
    if (n >= 4) kinds.push('multi');
    const kind = pick(kinds);
    const val = kind === 'rate' ? 1.25 : kind === 'dmg' ? 1.3 : kind === 'squad' ? Math.max(3, Math.round(exp * 0.4)) : 1;
    L.crates.push({ s: at, x: rr(-3.4, 3.4), kind, val, maxHp: Math.max(3, ref.unitDps * mercy * exp * rr(1.0, 1.6)) });
    // Assume the crate is usually, not always, cracked open.
    if (kind === 'squad') gain({ kind: 'add', val }, 0.7);
    else if (kind === 'multi') gain({ kind: 'mul', val: (ref.pellets + 1) / ref.pellets }, 0.7);
    else gain({ kind, val }, 0.7);
  }

  // ---- Assemble ----
  gatePair(s);
  s += 16;
  const end = boss ? length - 18 : length - 46;
  let lastKind = 'gate';
  let usedCorridor = false;
  while (s < end) {
    const room = end - s;
    const opts = [];
    if (lastKind !== 'horde') opts.push('horde', 'horde');
    if (lastKind !== 'gate') opts.push('gate', 'gate');
    if (n >= 2 && room > 34 && lastKind !== 'corridor' && (!usedCorridor || rng() < 0.5)) opts.push('corridor', 'corridor');
    if (n >= 3 && lastKind !== 'crate' && lastKind !== 'gate') opts.push('crate');
    if (n >= 3 && lastKind !== 'horde') opts.push('rush');
    const kind = pick(opts);
    if (kind === 'horde') {
      s += horde(s, -ROAD_HALF + 0.4, ROAD_HALF - 0.4, rr(4.0, 5.2), 'block') + 15;
    } else if (kind === 'rush') {
      s += horde(s, rr(-4.5, -1), rr(1, 4.5), rr(3.0, 4.0), 'rush') + 15;
      lastKind = 'horde';
      continue;
    } else if (kind === 'gate') {
      gatePair(s);
      s += 14;
    } else if (kind === 'corridor') {
      s += corridor(s) + 13;
      usedCorridor = true;
    } else {
      crate(s);
      s += 9;
    }
    lastKind = kind;
  }

  if (boss) {
    L.boss = {
      s: length + 40,
      hp: ref.unitDps * exp * 15 * tension * mercy,
      speed: 1.5,
      minionEvery: 3.6,
      minions: Math.max(3, Math.min(36, Math.round(exp * 0.3 * tension * thin))),
      minionHp: hpUnit,
      tier: Math.floor(n / 5),
    };
  } else {
    horde(length - 42, -ROAD_HALF + 0.4, ROAD_HALF - 0.4, 6, 'final');
  }

  L.spawns.sort((a, b) => a.s - b.s);
  L.expEnd = exp;
  return L;
}

return { tensionAt, generateLevel };
