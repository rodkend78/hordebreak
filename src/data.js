// All tunable game content lives here: world constants, weapons, infantry,
// enemies, upgrades, and the economy (rewards and costs).

const ROAD_HALF = 5; // road spans x = -5 .. 5
const SCROLL = 5; // how fast the squad marches (units / second)
const DT = 1 / 60; // fixed simulation step
const VIEW = 64; // enemies wake up when this close
const BULLET_RANGE = 31;
const MAX_COUNT = 999;
const START_COUNT = 6;

// ---- Weapons: better ones unlock as the player reaches higher levels ----
// dmg = damage per bullet, interval = seconds between volleys,
// pierce = extra bodies a bullet passes through, splash = explosion radius,
// crowd = roughly how much more the weapon is worth against a packed horde
// than its single-target damage suggests (measured with tools/weapons.mjs).
const WEAPONS = [
  { id: 'rifle', name: 'Rifle', unlock: 1, cost: 0, dmg: 1, interval: 0.42, pellets: 1, spread: 0.03, speed: 36, pierce: 0, splash: 0, crowd: 1, desc: 'Steady single shots.' },
  { id: 'smg', name: 'SMG', unlock: 2, cost: 90, dmg: 0.62, interval: 0.2, pellets: 1, spread: 0.07, speed: 38, pierce: 0, splash: 0, crowd: 1, desc: 'Sprays fast, light rounds.' },
  { id: 'shotgun', name: 'Shotgun', unlock: 4, cost: 260, dmg: 0.85, interval: 0.5, pellets: 3, spread: 0.03, speed: 34, pierce: 0, splash: 0, crowd: 1, desc: 'Three pellets in a wide fan.' },
  { id: 'mg', name: 'Machine Gun', unlock: 7, cost: 600, dmg: 1.05, interval: 0.14, pellets: 1, spread: 0.05, speed: 40, pierce: 0, splash: 0, crowd: 1, desc: 'A wall of lead. Best against bosses.' },
  { id: 'rail', name: 'Railgun', unlock: 10, cost: 1300, dmg: 3.0, interval: 0.45, pellets: 1, spread: 0.01, speed: 54, pierce: 3, splash: 0, crowd: 3.2, desc: 'Each shot punches through four bodies.' },
  { id: 'rocket', name: 'Rocket Launcher', unlock: 14, cost: 2800, dmg: 4.5, interval: 0.8, pellets: 1, spread: 0.04, speed: 26, pierce: 0, splash: 1.5, crowd: 3.6, desc: 'Explodes on impact. Shreds crowds.' },
  { id: 'plasma', name: 'Plasma Cannon', unlock: 19, cost: 6500, dmg: 2.2, interval: 0.22, pellets: 1, spread: 0.04, speed: 40, pierce: 1, splash: 0.8, crowd: 3.5, desc: 'Piercing, exploding bolts.' },
];

// ---- Infantry: tougher troops hit harder and sometimes shrug off a hit ----
const INFANTRY = [
  { id: 'recruit', name: 'Recruits', unlock: 1, cost: 0, dmg: 1, armor: 0, color: [0.2, 0.62, 1.0], desc: 'Fresh from training.' },
  { id: 'soldier', name: 'Soldiers', unlock: 3, cost: 160, dmg: 1.3, armor: 0.1, color: [0.1, 0.78, 0.86], desc: '+30% damage, 10% armor.' },
  { id: 'veteran', name: 'Veterans', unlock: 6, cost: 420, dmg: 1.7, armor: 0.18, color: [0.16, 0.82, 0.55], desc: '+70% damage, 18% armor.' },
  { id: 'commando', name: 'Commandos', unlock: 9, cost: 950, dmg: 2.3, armor: 0.26, color: [0.42, 0.5, 1.0], desc: '+130% damage, 26% armor.' },
  { id: 'guard', name: 'Elite Guard', unlock: 13, cost: 2200, dmg: 3.1, armor: 0.34, color: [0.72, 0.5, 1.0], desc: '+210% damage, 34% armor.' },
  { id: 'titan', name: 'Titans', unlock: 18, cost: 5000, dmg: 4.2, armor: 0.42, color: [1.0, 0.82, 0.25], desc: '+320% damage, 42% armor.' },
];

// ---- Repeatable upgrades ----
const UPGRADES = [
  { id: 'dmg', name: 'Firepower', desc: '+12% damage', base: 40, growth: 1.3, max: 9999 },
  { id: 'rate', name: 'Rapid Fire', desc: '+5% fire rate', base: 60, growth: 1.38, max: 20 },
  { id: 'squad', name: 'Recruitment', desc: '+2 starting troops', base: 50, growth: 1.27, max: 60 },
  { id: 'coin', name: 'Bounty', desc: '+8% coins', base: 90, growth: 1.45, max: 15 },
];

// ---- Enemies. hp is in multiples of one grunt at the current level.
// dmg is how many troops a hit costs on average (0.2 = a 20% chance).
const ENEMIES = {
  grunt: { name: 'Grunt', hp: 1, speed: 2.0, lat: 2.0, r: 0.38, dmg: 0.2, from: 1 },
  runner: { name: 'Runner', hp: 0.6, speed: 4.4, lat: 3.4, r: 0.33, dmg: 0.2, from: 3 },
  brute: { name: 'Brute', hp: 9, speed: 1.5, lat: 1.4, r: 0.72, dmg: 1, from: 5 },
  shield: { name: 'Shieldbearer', hp: 4, speed: 1.8, lat: 1.6, r: 0.46, dmg: 0.4, from: 8 },
  bomber: { name: 'Bomber', hp: 2.5, speed: 3.2, lat: 2.6, r: 0.48, dmg: 1.5, from: 11 },
  giant: { name: 'Giant', hp: 55, speed: 1.15, lat: 1.0, r: 1.25, dmg: 5, from: 7 },
  // Artillery: lobs acid at where the squad is heading (see Sim.spit).
  spitter: { name: 'Spitter', hp: 3, speed: 1.3, lat: 1.0, r: 0.5, dmg: 0.6, from: 6 },
};

// One line of advice the first time an enemy shows up.
const ENEMY_TIPS = {
  runner: 'Runners sprint ahead of the pack.',
  brute: 'Brutes soak up fire, and each one that lands costs a soldier.',
  spitter: 'Spitters lob acid from range. Step off the marked ground before it lands.',
  giant: 'A Giant leads the last stand. Keep every gun on it.',
  shield: 'Shieldbearers take four times the punishment of a grunt.',
  bomber: 'Bombers blow a hole in the squad. Drop them early.',
};

// The airstrike: charged by kills, called in by the player.
const STRIKE_FROM = 3; // first level it is available
const STRIKE_PER_LEVEL = 2.3; // roughly how many a full level's kills pay for

const BOSS_NAMES = ['Gorefist', 'Ironmaw', 'Skullcrown', 'Dreadhorn', 'The Warden', 'Ashbringer', 'Old Hunger', 'Kingbreaker'];
function bossName(n) {
  return BOSS_NAMES[(Math.floor(n / 5) - 1 + BOSS_NAMES.length * 8) % BOSS_NAMES.length];
}

// Medals for a win: how much of the squad made it home.
function starsFor(lost, left) {
  const rate = lost / Math.max(1, lost + left);
  return rate <= 0.1 ? 3 : rate <= 0.35 ? 2 : 1;
}
const STAR_BONUS = [0, 0, 0.05, 0.12];

function isBossLevel(n) {
  return n % 5 === 0;
}

// Coins for clearing level n. Grows every level; boss levels pay double.
function levelReward(n) {
  return Math.round(60 * Math.pow(1.18, n - 1)) * (isBossLevel(n) ? 2 : 1);
}

function upgradeCost(u, lvl) {
  return Math.round(u.base * Math.pow(u.growth, lvl));
}

function weaponPower(w) {
  return ((w.dmg * w.pellets) / w.interval) * (0.5 + 0.5 * (w.crowd || 1));
}

function newSave() {
  return {
    v: 1,
    level: 1,
    coins: 0,
    weapon: 'rifle',
    infantry: 'recruit',
    owned: { rifle: true, recruit: true },
    upg: { dmg: 0, rate: 0, squad: 0, coin: 0 },
    lossStreak: 0,
    seed: 1,
    wins: 0,
    sound: true,
    seenHelp: false,
    seenStrike: false,
  };
}

function byId(list, id) {
  for (const it of list) if (it.id === id) return it;
  return list[0];
}

// Turn a save into the numbers the simulation needs.
function loadoutOf(save) {
  const w = byId(WEAPONS, save.weapon);
  const inf = byId(INFANTRY, save.infantry);
  const dmg = w.dmg * inf.dmg * Math.pow(1.12, save.upg.dmg);
  const interval = w.interval / Math.pow(1.05, save.upg.rate);
  return {
    weapon: w.id,
    infantry: inf.id,
    dmg,
    interval,
    pellets: w.pellets,
    spread: w.spread,
    speed: w.speed,
    pierce: w.pierce,
    splash: w.splash,
    armor: inf.armor,
    startCount: START_COUNT + 2 * save.upg.squad,
    unitDps: (dmg * w.pellets) / interval,
    crowd: w.crowd || 1,
    coinMul: 1 + 0.08 * save.upg.coin,
  };
}

// Everything the shop can sell right now, in one flat list.
function shopOffers(save) {
  const out = [];
  for (const w of WEAPONS) {
    out.push({ kind: 'weapon', item: w, owned: !!save.owned[w.id], equipped: save.weapon === w.id, locked: save.level < w.unlock, cost: w.cost });
  }
  for (const inf of INFANTRY) {
    out.push({ kind: 'infantry', item: inf, owned: !!save.owned[inf.id], equipped: save.infantry === inf.id, locked: save.level < inf.unlock, cost: inf.cost });
  }
  for (const u of UPGRADES) {
    const lvl = save.upg[u.id];
    out.push({ kind: 'upgrade', item: u, lvl, maxed: lvl >= u.max, locked: false, cost: upgradeCost(u, lvl) });
  }
  return out;
}

function buy(save, offer) {
  if (offer.locked) return false;
  if (offer.kind === 'upgrade') {
    if (offer.maxed || save.coins < offer.cost) return false;
    save.coins -= offer.cost;
    save.upg[offer.item.id]++;
    return true;
  }
  if (!offer.owned) {
    if (save.coins < offer.cost) return false;
    save.coins -= offer.cost;
    save.owned[offer.item.id] = true;
  }
  if (offer.kind === 'weapon') save.weapon = offer.item.id;
  else save.infantry = offer.item.id;
  return true;
}

// The most worthwhile thing the player can afford right now, or null.
// "Worthwhile" means it makes the squad stronger (or richer): a weaker weapon
// than the one equipped does not count.
function bestPurchase(save) {
  let best = null;
  let bestScore = 0;
  const curW = weaponPower(byId(WEAPONS, save.weapon));
  const curI = byId(INFANTRY, save.infantry);
  const start = START_COUNT + 2 * save.upg.squad;
  for (const o of shopOffers(save)) {
    if (o.locked || o.cost > save.coins) continue;
    let gain = 1;
    if (o.kind === 'weapon') {
      if (o.owned) continue;
      gain = weaponPower(o.item) / curW;
    } else if (o.kind === 'infantry') {
      if (o.owned) continue;
      gain = (o.item.dmg * (1 + o.item.armor * 0.5)) / (curI.dmg * (1 + curI.armor * 0.5));
    } else if (o.maxed) continue;
    else if (o.item.id === 'dmg') gain = 1.12;
    else if (o.item.id === 'rate') gain = 1.05;
    else if (o.item.id === 'squad') gain = (start + 2) / start;
    else gain = 1.03;
    if (gain <= 1) continue;
    const score = Math.log(gain) / Math.max(1, o.cost);
    if (score > bestScore) {
      bestScore = score;
      best = o;
    }
  }
  return best;
}

function canUpgrade(save) {
  return bestPurchase(save) !== null;
}

// A sensible "spend everything" policy. Used to work out how strong a player
// who keeps upgrading should be at each level, and by the balance tool.
function autoSpend(save, maxBuys = 500) {
  let bought = 0;
  for (; bought < maxBuys; bought++) {
    const best = bestPurchase(save);
    if (!best) return bought;
    buy(save, best);
  }
  return bought;
}

// Reference strength: the loadout of a player who won every level once and
// spent the coins sensibly. Enemy toughness is set against this curve, so
// difficulty tracks a player who keeps upgrading.
const refCache = [];
let refSave = null;
function refAt(n) {
  if (!refSave) {
    refSave = newSave();
    refCache[0] = refCache[1] = loadoutOf(refSave);
  }
  while (refCache.length <= n) {
    const k = refCache.length - 1; // level just cleared
    refSave.coins += Math.round(levelReward(k) * 1.0 * loadoutOf(refSave).coinMul);
    refSave.level = k + 1;
    autoSpend(refSave);
    refCache.push(loadoutOf(refSave));
  }
  // Smooth over three levels so one big purchase (a new weapon) does not make
  // the next level jump in toughness.
  const a = refCache[Math.max(1, n - 2)];
  const b = refCache[Math.max(1, n - 1)];
  const c = refCache[n];
  const geo = (f) => Math.cbrt(f(a) * f(b) * f(c));
  return {
    unitDps: geo((r) => r.unitDps),
    crowdDps: geo((r) => r.unitDps * r.crowd),
    startCount: c.startCount,
    pellets: c.pellets,
  };
}

function fmt(n) {
  n = Math.round(n);
  if (n < 10000) return String(n);
  const units = ['K', 'M', 'B', 'T', 'Qa', 'Qi'];
  let u = -1;
  let v = n;
  while (v >= 1000 && u < units.length - 1) {
    v /= 1000;
    u++;
  }
  return (v >= 100 ? v.toFixed(0) : v >= 10 ? v.toFixed(1) : v.toFixed(2)) + units[u];
}

return { ROAD_HALF, SCROLL, DT, VIEW, BULLET_RANGE, MAX_COUNT, START_COUNT, WEAPONS, INFANTRY, UPGRADES, ENEMIES, ENEMY_TIPS, STRIKE_FROM, STRIKE_PER_LEVEL, bossName, starsFor, STAR_BONUS, isBossLevel, levelReward, upgradeCost, weaponPower, newSave, byId, loadoutOf, shopOffers, buy, bestPurchase, canUpgrade, autoSpend, refAt, fmt };
