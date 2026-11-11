// How things look: shared by the renderer (render.js) and the effects (fx.js).

const { INFANTRY } = __m["src/data.js"];

// mesh = which model, col = base colour, s = size, walk = stride speed,
// atk = seconds its attack takes: it starts that long before reaching the squad
const ENEMY_LOOK = {
  grunt: { mesh: 'grunt', col: [0.95, 0.27, 0.3], s: 1.0, walk: 7.5, atk: 0.5 },
  runner: { mesh: 'runner', col: [1.0, 0.56, 0.2], s: 1.0, walk: 14, atk: 0.42 },
  brute: { mesh: 'brute', col: [0.88, 0.22, 0.42], s: 1.12, walk: 5, atk: 0.7 },
  shield: { mesh: 'shield', col: [0.66, 0.36, 0.95], s: 1.04, walk: 6.5, atk: 0.6 },
  bomber: { mesh: 'bomber', col: [1.0, 0.78, 0.1], s: 1.05, walk: 13, atk: 0.5 },
  giant: { mesh: 'giant', col: [0.74, 0.16, 0.38], s: 1.95, walk: 3.6, atk: 0.95 },
  spitter: { mesh: 'spitter', col: [0.42, 0.86, 0.3], s: 1.08, walk: 6 },
  // Late-game variants reuse a model at a new size and colour.
  dire: { mesh: 'runner', col: [0.4, 0.5, 0.85], s: 1.6, walk: 12, atk: 0.46 },
  warlord: { mesh: 'brute', col: [1.0, 0.72, 0.18], s: 1.5, walk: 4.2, atk: 0.82 },
};
// Crowd types switch to a lighter model beyond this distance.
const FAR_Z = 32;
const FAR_MESH = { grunt: 1, runner: 1, shield: 1, bomber: 1, spitter: 1, brute: 1 };
// Each boss in turn wears its own colour.
const BOSS_COLORS = [[0.78, 0.12, 0.2], [0.5, 0.2, 0.8], [0.14, 0.5, 0.62], [0.86, 0.42, 0.1], [0.3, 0.32, 0.4], [0.2, 0.62, 0.3]];
function bossColor(n) {
  return BOSS_COLORS[(Math.max(1, Math.floor(n / 5)) - 1) % BOSS_COLORS.length];
}
const BOSS_COLOR = BOSS_COLORS[0];
const BOSS_SCALE = 3.1;

// col = tracer colour, w/len = tracer size, flash = muzzle flash size,
// light = how strongly a volley lights up the squad and the road.
// mz/my = where the muzzle of the weapon model sits (ahead of, and above, the trooper's feet).
const WEAPON_LOOK = {
  rifle: { col: [1.0, 0.8, 0.36], w: 0.075, len: 1.7, flash: 0.6, light: 0.8, casing: true, mz: 0.9, my: 0.73 },
  smg: { col: [1.0, 0.86, 0.42], w: 0.06, len: 1.2, flash: 0.45, light: 0.6, casing: true, mz: 0.66, my: 0.73 },
  shotgun: { col: [1.0, 0.62, 0.22], w: 0.085, len: 1.0, flash: 1.0, light: 1.2, casing: true, mz: 0.9, my: 0.75 },
  mg: { col: [1.0, 0.62, 0.2], w: 0.075, len: 2.2, flash: 0.6, light: 0.9, casing: true, mz: 0.92, my: 0.61 },
  rail: { col: [0.35, 0.85, 1.0], w: 0.13, len: 4.5, flash: 0.8, light: 1.1, beam: true, mz: 0.96, my: 0.73 },
  rocket: { col: [1.0, 0.55, 0.18], flash: 0.9, light: 1.0, rocket: true, mz: 0.8, my: 0.91 },
  plasma: { col: [0.9, 0.35, 1.0], w: 0.15, len: 1.3, flash: 0.7, light: 1.0, orb: 0.55, mz: 0.72, my: 0.71 },
  laser: { col: [1.0, 0.32, 0.25], w: 0.07, len: 2.8, flash: 0.5, light: 0.8, mz: 0.94, my: 0.74 },
  cluster: { col: [1.0, 0.55, 0.18], flash: 0.9, light: 1.0, rocket: true, mz: 0.6, my: 0.92 },
  nova: { col: [1.0, 0.9, 0.5], w: 0.2, len: 5.5, flash: 1.0, light: 1.3, beam: true, orb: 0.5, mz: 1.0, my: 0.72 },
};

// Which two models make a trooper: a body per rank, arms and gun per weapon.
function squadMeshes(lo) {
  const tier = Math.max(0, INFANTRY.findIndex((it) => it.id === lo.infantry));
  return { body: 'inf' + tier, arms: 'w_' + (WEAPON_LOOK[lo.weapon] ? lo.weapon : 'rifle') };
}

// Colours of the two kinds of marked ground.
const HAZARD_COLORS = { acid: [0.5, 1.0, 0.2], slam: [1.0, 0.25, 0.18], shell: [1.0, 0.55, 0.15] };

const GATE_COLORS = {
  add: [0.16, 0.6, 1.0],
  neg: [0.95, 0.2, 0.25],
  mul: [1.0, 0.74, 0.12],
  rate: [0.66, 0.4, 1.0],
  dmg: [1.0, 0.5, 0.16],
  locked: [0.5, 0.52, 0.58],
};

// Each enemy gets its own slight size and shade, derived from a number it
// already carries, so the horde does not look stamped out of one mould.
function enemySize(phase) {
  return 1 + 0.09 * Math.sin(phase * 7.3);
}
function enemyShade(col, phase) {
  const k = 0.84 + 0.26 * ((phase * 3.17) % 1);
  return [col[0] * k, col[1] * k, col[2] * k];
}

// Where trooper number i of nVis stands (a sunflower-seed spiral).
function squadSlot(sim, i, nVis) {
  const spread = sim.count <= 48 ? 0.33 : sim.squadR / Math.sqrt(nVis);
  const r = spread * Math.sqrt(i + 0.5);
  const a = i * 2.399963;
  return { x: sim.x + Math.cos(a) * r, z: Math.sin(a) * r };
}

return { ENEMY_LOOK, FAR_Z, FAR_MESH, BOSS_COLOR, bossColor, BOSS_SCALE, WEAPON_LOOK, GATE_COLORS, HAZARD_COLORS, squadMeshes, enemySize, enemyShade, squadSlot };
