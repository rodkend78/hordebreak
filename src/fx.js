// Visual effects: everything that reacts to what happened in the simulation
// but never changes it. Bodies thrown back when shot, debris, splats, muzzle
// flashes, smoke trails, explosions, camera shake.
//
// Three kinds of thing live here:
//   chunks  - small solid lumps with gravity (debris, shell casings)
//   corpses - a whole figure knocked off its feet, then sinking away
//   sprites - flat glowing or smoky shapes (flashes, fireballs, rings, splats)
//   flyers  - models on a fixed course (strike aircraft, falling bombs)
//   lobs    - acid blobs in the air between a spitter and the marked ground
// The renderer reads these lists every frame. Math.random is fine here; the
// simulation itself stays deterministic.

const { ENEMY_LOOK, WEAPON_LOOK, GATE_COLORS, bossColor, enemySize, enemyShade, squadSlot } = __m["src/look.js"];
const { INFANTRY, byId, bossName } = __m["src/data.js"];
const rnd = (a, b) => a + Math.random() * (b - a);
const MAX_SPRITES = 1500;
const MAX_CHUNKS = 420;
const MAX_CORPSES = 130;
const FIRE = { core: [1, 0.95, 0.75], ball: [1, 0.55, 0.15], dark: [0.9, 0.22, 0.08] };
const PLASMA = { core: [1, 0.9, 1], ball: [0.95, 0.4, 1], dark: [0.5, 0.2, 0.95] };
const ACID = { core: [0.92, 1, 0.7], ball: [0.5, 0.95, 0.2], dark: [0.15, 0.55, 0.1] };

class Fx {
  constructor() {
    this.reset();
  }

  reset() {
    this.chunks = [];
    this.corpses = [];
    this.sprites = [];
    this.floats = [];
    this.flyers = [];
    this.lobs = [];
    this.slow = 0; // seconds of slow motion left
    this.bossHit = 9; // seconds since the boss last struck: drives its follow-through
    this.shotAge = 9; // seconds since the squad's last volley: drives the firing animation
    this.dodgeT = 0;
    this.shake = [0, 0];
    this.shakeAmt = 0;
    this.squadFlash = 0;
    this.recoil = 0;
    this.screenFlash = 0;
    this.light0 = { x: 0, y: 1, z: 1, col: [1, 0.8, 0.5], i: 0 }; // muzzle flash light
    this.light1 = { x: 0, y: 1, z: 20, col: [1, 0.6, 0.2], i: 0 }; // latest explosion
    this.bossDeath = null;
    this.lastP = null;
    this.trailT = 0;
    this.killBudget = 0;
  }

  // ---- building blocks ----
  sprite(o) {
    if (this.sprites.length >= MAX_SPRITES) return;
    this.sprites.push({
      add: true, shape: 0, flat: 0, x: 0, y: 0.5, z: 0, vx: 0, vy: 0, vz: 0, grav: 0,
      s0: 0.5, s1: 0.5, ar: 1, rot: 0, col: [1, 1, 1], a: 1, life: 0.2, pow: 1, anchored: true, ...o, max: o.life || 0.2, fresh: true,
    });
  }

  chunk(o) {
    if (this.chunks.length >= MAX_CHUNKS) return;
    this.chunks.push({
      mesh: 'chunk', x: 0, y: 0.5, z: 0, vx: 0, vy: 3, vz: 0, s: 0.15, col: [1, 1, 1], yaw: rnd(0, 6), yawV: rnd(-9, 9),
      pitch: rnd(0, 6), pitchV: rnd(-9, 9), life: 0.7, glow: 0, ...o, max: o.life || 0.7,
    });
  }

  debris(x, y, z, n, col, speed, size, life = 0.7) {
    for (let i = 0; i < n; i++) {
      const a = rnd(0, 6.283);
      const sp = speed * rnd(0.35, 1);
      const k = rnd(0.55, 1);
      this.chunk({ x, y, z, vx: Math.cos(a) * sp, vy: rnd(2.5, 2.5 + speed), vz: Math.sin(a) * sp, s: size * rnd(0.6, 1.3), col: [col[0] * k, col[1] * k, col[2] * k], life: life * rnd(0.7, 1.2) });
    }
  }

  sparks(x, y, z, n, col, speed, life = 0.25, size = 0.13) {
    for (let i = 0; i < n; i++) {
      const a = rnd(0, 6.283);
      const sp = speed * rnd(0.3, 1);
      this.sprite({ x, y, z, vx: Math.cos(a) * sp, vy: rnd(1, speed), vz: Math.sin(a) * sp, grav: 13, s0: size, s1: size * 0.3, col, life: life * rnd(0.6, 1.3) });
    }
  }

  text(str, x, y, z, col, size = 0.9) {
    this.floats.push({ str, x, y, z, col, size, life: 1.1 });
  }

  // A fireball with a flash, shockwave ring, light, smoke, embers and scorch.
  explosion(x, z, r, pal = FIRE, y = 0.6) {
    const big = r >= 1.2;
    this.sprite({ x, y, z, s0: r * 0.7, s1: r * 2.3, col: pal.core, a: 1, life: 0.12 });
    this.sprite({ x, y, z, s0: r * 0.6, s1: r * 1.9, col: pal.ball, a: 0.95, life: 0.3, pow: 1.5 });
    this.sprite({ shape: 1, flat: 1, x, y: 0.05, z, s0: r * 0.5, s1: r * 2.7, col: pal.ball, a: 0.9, life: 0.32, pow: 1.3 });
    this.sprite({ flat: 1, x, y: 0.04, z, s0: r * 2.6, s1: r * 3.4, col: pal.ball, a: 0.5, life: 0.22 });
    this.sparks(x, y, z, big ? 9 : 3, pal.core, 4 + r * 3, 0.45);
    if (big) {
      this.sprite({ x, y: y + 0.2, z, s0: r, s1: r * 2.1, col: pal.dark, a: 0.6, life: 0.45, pow: 2, vy: 1.2 });
      for (let i = 0; i < 5; i++) {
        this.sprite({ add: false, shape: 2, x: x + rnd(-r, r) * 0.5, y: y + rnd(0, 0.6), z: z + rnd(-r, r) * 0.5, vy: rnd(0.8, 2), s0: r * 0.45, s1: r * rnd(1, 1.5), col: [0.22, 0.2, 0.22], a: 0.42, life: rnd(0.6, 1.0), pow: 1.4 });
      }
      this.sprite({ add: false, shape: 2, flat: 1, x, y: 0.03, z, s0: r * 0.9, s1: r * 1.15, col: [0.06, 0.05, 0.06], a: 0.5, life: 3.2, pow: 2 }); // scorch
      this.debris(x, 0.3, z, 4, [0.3, 0.28, 0.3], 5, 0.14);
    }
    if (r * 1.4 > this.light1.i) this.light1 = { x, y: 1.2, z, col: pal.ball, i: Math.min(2.2, r * 1.4) };
    this.shakeAmt = Math.max(this.shakeAmt, Math.min(0.5, r * 0.09));
  }

  // ---- reactions to simulation events ----
  kill(e, sim) {
    const lk = ENEMY_LOOK[e.k];
    const col = enemyShade(lk.col, e.ph);
    const heavy = e.k === 'brute' || e.k === 'giant' || e.k === 'warlord' || e.k === 'brood' || e.k === 'ram' || e.k === 'warder';
    if (e.k === 'spitter') this.explosion(e.x, e.z, 0.9, ACID, 0.9); // its sacs burst
    if (e.k === 'giant') this.slow = Math.max(this.slow, 0.14);
    const full = heavy || (this.killBudget-- > 0 && this.corpses.length < MAX_CORPSES);
    if (e.k === 'bomber') {
      // Its own bomb goes off.
      this.explosion(e.x, e.z, 1.3, FIRE);
      this.debris(e.x, 0.6, e.z, 5, col, 6, 0.2);
      return;
    }
    const size = lk.s * enemySize(e.ph);
    if (full) {
      // The body is thrown back up the road and falls on its back
      // (runners, carried by their own speed, pitch forward instead).
      const fwd = e.k === 'runner' || e.k === 'dire' || e.k === 'whelp' || e.k === 'ram';
      this.corpses.push({
        mesh: lk.mesh, x: e.x, y: 0, z: e.z, s: size, col,
        vx: (e.x - sim.x) * 0.3 + rnd(-1.8, 1.8), vy: (heavy ? rnd(2, 3) : rnd(3.5, 6)) * (e.bombed ? 1.9 : 1), vz: fwd ? rnd(-3, -1) : heavy ? rnd(1.5, 3) : rnd(3.5, 7.5),
        yaw: rnd(-0.5, 0.5), yawV: rnd(-3, 3), pitch: 0, pitchV: (fwd ? 1 : -1) * (heavy ? rnd(2.4, 3.2) : rnd(6, 10)), pitchEnd: fwd ? 1.45 : -1.5,
        t: 0, rest: 0, landed: false, flash: 1, phase: e.ph, walk: lk.walk, heavy, giant: e.k === 'giant',
      });
      this.sprite({ x: e.x, y: 0.7 * size, z: e.z, s0: 0.35 * size, s1: 1.0 * size, col, a: 0.9, life: 0.13 });
      this.sprite({ add: false, shape: 2, flat: 1, x: e.x + rnd(-0.2, 0.2), y: 0.025, z: e.z + rnd(-0.1, 0.5), s0: 0.25 * size, s1: rnd(0.5, 0.8) * size, ar: rnd(0.7, 1.3), rot: rnd(0, 3), col: [col[0] * 0.45, col[1] * 0.3, col[2] * 0.35], a: 0.55, life: rnd(1.8, 2.6), pow: 1.6 });
      this.sparks(e.x, 0.7 * size, e.z, 2, [1, 0.9, 0.6], 4, 0.22, 0.1);
    }
    this.debris(e.x, 0.6 * size, e.z, e.k === 'giant' ? 14 : heavy ? 7 : full ? 2 : 1, col, heavy ? 6 : 4.5, 0.15 * size);
    if (e.k === 'shield') this.chunk({ mesh: 'box', x: e.x, y: 0.8, z: e.z - 0.3, vx: rnd(-3, 3), vy: rnd(4, 6), vz: rnd(2, 5), s: 0.55, sy: 0.8, sz: 0.07, col: [0.24, 0.25, 0.32], life: 0.9 });
    if (heavy) this.shakeAmt = Math.max(this.shakeAmt, e.k === 'giant' ? 0.4 : 0.14);
  }

  shot(sim) {
    const wl = WEAPON_LOOK[sim.lo.weapon] || WEAPON_LOOK.rifle;
    const R = sim.squadR;
    const nVis = Math.min(sim.count, 60);
    const k = Math.min(nVis, 5);
    for (let i = 0; i < k; i++) {
      const s = squadSlot(sim, Math.floor(Math.random() * nVis), nVis);
      const mx = s.x + 0.16, mz = s.z + wl.mz, my = wl.my; // the muzzle of this weapon's model
      this.sprite({ shape: 4, x: mx, y: my, z: mz, s0: wl.flash * 0.75, s1: wl.flash, rot: rnd(0, 3.14), col: wl.col, a: 1, life: 0.055, anchored: false });
      if (wl.casing && Math.random() < 0.45) {
        this.chunk({ mesh: 'box', x: mx, y: 0.75, z: s.z + 0.3, vx: rnd(1.5, 3.2), vy: rnd(2.5, 4), vz: rnd(-1.5, 0.2), s: 0.05, sy: 0.05, sz: 0.12, col: [0.95, 0.75, 0.3], life: 0.5 });
      }
      if (wl.rocket) {
        // Back-blast.
        this.sprite({ add: false, shape: 2, x: s.x + 0.18, y: 0.92, z: s.z - 0.5, vz: -2, vy: 0.8, s0: 0.2, s1: 0.7, col: [0.8, 0.8, 0.82], a: 0.4, life: 0.4, pow: 1.5 });
      }
    }
    // The volley lights the road and the squad for an instant.
    this.sprite({ flat: 1, x: sim.x, y: 0.03, z: R + 0.9, s0: R + 1.4, s1: R + 1.8, col: wl.col, a: 0.3 * wl.light, life: 0.07, anchored: false });
    this.light0 = { x: sim.x, y: 1.3, z: R * 0.6 + 0.8, col: wl.col, i: wl.light };
    this.recoil = 1;
    this.shotAge = 0;
    if (wl.beam) {
      // Railgun: an instant beam hangs in the air behind each slug.
      for (const b of sim.bullets) {
        if (b.dist > 1.5) continue;
        const L = 13;
        const ang = Math.atan2(b.vx, b.vz);
        this.sprite({ shape: 3, flat: 1, x: b.x + Math.sin(ang) * L, y: 0.72, z: b.z + Math.cos(ang) * L, s0: 0.16, s1: 0.05, ar: L / 0.16, fixedLen: L, rot: Math.PI - ang, col: wl.col, a: 0.75, life: 0.2, pow: 1.5 });
      }
      this.sprite({ shape: 1, x: sim.x, y: 0.75, z: R + 0.9, s0: 0.4, s1: R + 1.2, col: wl.col, a: 0.6, life: 0.12, anchored: false });
    }
  }

  hit(e, sim) {
    const wl = WEAPON_LOOK[sim.lo.weapon] || WEAPON_LOOK.rifle;
    this.sprite({ x: e.x, y: 0.75, z: e.z, s0: 0.2, s1: 0.6, col: wl.col, a: 0.9, life: 0.08 });
    for (let i = 0; i < 2; i++) {
      this.sprite({ x: e.x, y: 0.75, z: e.z, vx: rnd(-3, 3), vy: rnd(1.5, 5), vz: rnd(-6, -1), grav: 14, s0: 0.1, s1: 0.03, col: wl.col, life: rnd(0.12, 0.25) });
    }
    if (wl.beam) this.sprite({ shape: 1, x: e.x, y: 0.75, z: e.z, s0: 0.15, s1: 0.7, col: wl.col, a: 0.8, life: 0.12 });
  }

  squadLoss(sim, n, radial) {
    const col = byId(INFANTRY, sim.lo.infantry).color;
    const k = Math.min(n, radial ? 14 : 3);
    for (let i = 0; i < k && this.corpses.length < MAX_CORPSES + 20; i++) {
      const a = rnd(0, 6.283);
      const r = sim.squadR * rnd(0.2, 1);
      this.corpses.push({
        mesh: 'soldier', x: sim.x + Math.cos(a) * r, y: 0, z: Math.sin(a) * r * 0.6 + (radial ? 0 : sim.squadR * 0.5), s: 0.92, col,
        vx: radial ? Math.cos(a) * rnd(3, 7) : rnd(-2, 2), vy: rnd(4, 7), vz: radial ? Math.sin(a) * rnd(3, 7) - 2 : rnd(-6, -3),
        yaw: rnd(-1, 1), yawV: rnd(-5, 5), pitch: 0, pitchV: rnd(6, 10), pitchEnd: 1.5,
        t: 0, rest: 0, landed: false, flash: 1, phase: a, walk: 0, heavy: false, giant: false,
      });
    }
    this.sparks(sim.x, 0.8, sim.squadR * 0.5, 4, [0.5, 0.8, 1], 5, 0.3);
  }

  // Marked ground goes off: acid splashes, a boss slam erupts along its strip.
  blast(e, sim, anyHit) {
    const mid = (e.x0 + e.x1) / 2;
    const w = e.x1 - e.x0;
    if (e.kind === 'charge') {
      // A ram thunders through: dust and stone, and a jolt if it caught the squad.
      this.debris(mid, 0.3, e.z, 9, [0.34, 0.32, 0.34], 8, 0.2);
      this.sprite({ add: false, shape: 2, x: mid, y: 0.5, z: e.z, vy: 1.2, s0: 0.9, s1: 2.6, col: [0.6, 0.58, 0.56], a: 0.4, life: 0.6, pow: 1.4 });
      this.sprite({ flat: 1, x: mid, y: 0.05, z: e.z, s0: w * 0.6, s1: w * 0.9, ar: (e.zr * 2) / w, col: [1, 0.8, 0.3], a: 0.7, life: 0.2 });
      this.shakeAmt = Math.max(this.shakeAmt, e.hit ? 0.6 : 0.25);
      if (!e.hit && this.dodgeT <= 0 && sim.count > 0) {
        this.text('DODGED', sim.x, 2.3, 0.6, '#8dffb8', 0.8);
        this.dodgeT = 0.6;
      }
    } else if (e.kind === 'shell') {
      this.explosion(mid, e.z, 1.7, FIRE, 0.5);
      this.debris(mid, 0.3, e.z, 6, [0.3, 0.28, 0.3], 7, 0.2);
      this.shakeAmt = Math.max(this.shakeAmt, e.hit ? 0.5 : 0.3);
    } else if (e.kind === 'acid') {
      this.explosion(mid, e.z, 1.25, ACID, 0.4);
      this.sprite({ add: false, shape: 2, flat: 1, x: mid, y: 0.03, z: e.z, s0: 1.1, s1: 1.5, col: [0.16, 0.42, 0.08], a: 0.6, life: 2.6, pow: 1.6 });
      this.sparks(mid, 0.3, e.z, 8, ACID.core, 6, 0.5, 0.14);
    } else {
      const n = Math.max(2, Math.round((w * e.zr) / 5));
      for (let i = 0; i < n; i++) this.explosion(e.x0 + rnd(0.15, 0.85) * w, e.z + rnd(-0.8, 0.8) * e.zr, rnd(1.2, 1.7), FIRE, 0.5);
      this.sprite({ flat: 1, x: mid, y: 0.05, z: e.z, s0: w * 0.6, s1: w * 0.7, ar: (e.zr * 2) / w, col: [1, 0.5, 0.25], a: 0.8, life: 0.25 });
      this.debris(mid, 0.3, e.z, 8, [0.3, 0.28, 0.3], 7, 0.2);
      this.shakeAmt = Math.max(this.shakeAmt, e.hit ? 0.7 : 0.4);
      if (!anyHit && this.dodgeT <= 0 && sim.count > 0) {
        this.text('DODGED', sim.x, 2.3, 0.6, '#8dffb8', 0.8);
        this.dodgeT = 0.6;
      }
    }
    if (e.hit) this.squadFlash = 1;
  }

  // Airstrike: three aircraft cross the screen and their bombs fall in rows.
  strikeRun(sim) {
    for (const [dx, dz] of [[0, 0], [-3.4, -6], [3.4, -6]]) {
      this.flyers.push({ mesh: 'jet', x: sim.x * 0.3 + dx, y: 7.5, z: -16 + dz, vx: 0, vy: 0, vz: 58, s: 1.35, life: 1.6, delay: 0, shadow: 2.2 });
    }
    for (let i = 0; i < 6; i++) {
      for (const x of [-3.3, 0, 3.3]) {
        const fall = 0.42;
        this.flyers.push({ mesh: 'rocket', x: x + rnd(-0.4, 0.4), y: 8.6, z: 4 + i * 5.4 - 5 * fall + rnd(-0.6, 0.6), vx: 0, vy: -20, vz: 5, s: 1.7, pitch: -1.3, life: fall, delay: 0.6 + i * 0.13 - fall, shadow: 0 });
      }
    }
  }

  bomb(e) {
    for (const x of [-3.3, 0, 3.3]) this.explosion(x + rnd(-0.5, 0.5), e.z + rnd(-0.8, 0.8), rnd(2.0, 2.6), FIRE, 0.7);
    this.sprite({ shape: 1, flat: 1, x: 0, y: 0.05, z: e.z, s0: 2, s1: 9, col: [1, 0.7, 0.4], a: 0.8, life: 0.4 });
    this.debris(rnd(-3, 3), 0.4, e.z, 6, [0.28, 0.27, 0.3], 9, 0.24, 1.0);
    this.shakeAmt = Math.max(this.shakeAmt, 0.55);
  }

  // Consume the simulation's event list. `sound` plays effects, `toast`
  // shows a banner.
  handle(sim, sound, toast) {
    const ev = sim.events;
    this.killBudget = 16; // full death effects per frame; the rest are lighter
    let hits = 0;
    let booms = 0;
    // One boss move can mark several patches: it only counts as dodged if all of them missed.
    const slamHit = ev.some((e) => e.t === 'blast' && e.kind === 'slam' && e.hit);
    for (const e of ev) {
      switch (e.t) {
        case 'shot': this.shot(sim); sound.shot(sim.lo.weapon); break;
        case 'hit': if (hits++ < 10) this.hit(e, sim); break;
        case 'kill': this.kill(e, sim); sound.play('kill'); break;
        case 'gate': {
          const col = e.good ? GATE_COLORS.add : GATE_COLORS.neg;
          this.text(e.text, e.x, 2.2, 1, e.good ? '#8dffb8' : '#ff8a8a', 1.0);
          this.sprite({ shape: 1, flat: 1, x: sim.x, y: 0.05, z: 0.3, s0: 0.6, s1: sim.squadR + 2.4, col, a: 0.9, life: 0.4, pow: 1.4, anchored: false });
          this.sprite({ x: sim.x, y: 1, z: 0.3, s0: 1, s1: sim.squadR + 2, col, a: 0.55, life: 0.25, anchored: false });
          this.sparks(sim.x, 1, 0.3, 10, col, 6, 0.5, 0.16);
          sound.play(e.good ? 'gate' : 'bad');
          break;
        }
        case 'crate':
          this.text(e.text, e.x, 2.4, e.z, '#ffe27a', 0.9);
          this.debris(e.x, 0.8, e.z, 10, [0.18, 0.72, 0.5], 6, 0.24);
          this.debris(e.x, 0.8, e.z, 5, [1, 0.86, 0.3], 6, 0.18);
          this.sprite({ x: e.x, y: 0.9, z: e.z, s0: 0.6, s1: 2.6, col: [1, 0.9, 0.5], a: 0.9, life: 0.25 });
          this.sprite({ shape: 1, flat: 1, x: e.x, y: 0.05, z: e.z, s0: 0.5, s1: 3, col: [1, 0.86, 0.3], a: 0.9, life: 0.35 });
          this.sparks(e.x, 0.9, e.z, 12, [1, 0.9, 0.5], 7, 0.5, 0.16);
          sound.play('crate');
          break;
        case 'locked': this.text('LOCKED', e.x, 1.8, 1, '#c9cfdd', 0.7); sound.play('locked'); break;
        case 'barrier':
          this.text('OPEN!', e.x, 2.2, e.z, '#ffe27a', 1.0);
          this.debris(e.x, 0.6, e.z, 12, [0.25, 0.27, 0.33], 6, 0.26, 0.9);
          this.debris(e.x, 0.9, e.z, 6, [1, 0.8, 0.1], 6, 0.16);
          this.sprite({ add: false, shape: 2, x: e.x, y: 0.6, z: e.z, vy: 1, s0: 0.8, s1: 2.4, col: [0.7, 0.7, 0.74], a: 0.45, life: 0.6, pow: 1.5 });
          this.sprite({ shape: 1, flat: 1, x: e.x, y: 0.05, z: e.z, s0: 0.5, s1: 3, col: [1, 0.8, 0.1], a: 0.8, life: 0.3 });
          this.shakeAmt = Math.max(this.shakeAmt, 0.25);
          sound.play('barrier');
          break;
        case 'breach':
          if (e.n > 0) {
            this.text('−' + e.n, sim.x + rnd(-0.5, 0.5), 1.6, 0.6, '#ff7b7b', 0.75);
            this.squadLoss(sim, e.n, false);
            this.squadFlash = 0.7;
            this.shakeAmt = Math.max(this.shakeAmt, 0.12);
            sound.play('breach');
          }
          break;
        case 'boom':
          if (booms++ < (e.r >= 1.2 ? 4 : 2)) this.explosion(e.x, e.z, e.r, sim.lo.weapon === 'plasma' && !e.bomber ? PLASMA : FIRE);
          sound.play('boom');
          break;
        case 'slam':
          this.text('−' + e.n, sim.x, 2, 0.6, '#ff7b7b', 1.2);
          this.squadLoss(sim, e.n, true);
          this.bossHit = 0;
          this.sprite({ shape: 1, flat: 1, x: sim.x, y: 0.05, z: 1, s0: 1, s1: 9, col: [1, 0.5, 0.3], a: 0.9, life: 0.45 });
          this.sprite({ add: false, shape: 2, flat: 1, x: sim.x, y: 0.03, z: 1.5, s0: 2, s1: 2.6, col: [0.08, 0.06, 0.08], a: 0.45, life: 3 });
          this.squadFlash = 1;
          this.shakeAmt = 0.8;
          sound.play('slam');
          break;
        case 'boss': toast(bossName(sim.L.n) + ' is here', 2200); sound.play('boss'); break;
        case 'spit':
          this.lobs.push({ x0: e.x, z0: e.z, x1: e.tx, z1: e.tz, t: 0, fuse: e.fuse, h: e.big ? 3.4 : 2.4, big: !!e.big });
          this.sprite({ x: e.x, y: e.big ? 3.5 : 1.3, z: e.z - (e.big ? 1.8 : 0.5), s0: e.big ? 0.7 : 0.3, s1: e.big ? 2.0 : 0.9, col: ACID.ball, a: 0.9, life: 0.15 });
          sound.play('spit');
          break;
        case 'blast': if (e.boss) this.bossHit = 0; this.blast(e, sim, e.kind === 'slam' ? slamHit : e.hit); sound.play(e.kind === 'acid' ? 'splash' : e.kind === 'shell' ? 'boom' : 'slam'); break;
        case 'bosscast': sound.play('warn'); break;
        case 'charge': sound.play('warn'); break; // a ram has marked its lane
        case 'hatch':
          // A clutch splits open.
          this.sprite({ x: e.x, y: 1.0, z: e.z, s0: 0.5, s1: 2.2, col: [1, 0.9, 0.45], a: 0.9, life: 0.22 });
          this.sparks(e.x, 0.9, e.z, 10, [1, 0.92, 0.5], 6, 0.5, 0.14);
          this.debris(e.x, 0.8, e.z, 5, [1, 0.9, 0.5], 5, 0.14);
          break;
        case 'shelling': toast('Incoming shellfire', 1800); sound.play('warn'); break;
        case 'shell':
          // The round itself, falling onto its mark.
          this.flyers.push({ mesh: 'rocket', x: e.x, y: 9.4, z: e.z - 2.2, vx: 0, vy: -20, vz: 5, s: 1.9, pitch: -1.3, life: 0.44, delay: e.fuse - 0.44, shadow: 0 });
          break;
        case 'strike': this.strikeRun(sim); sound.play('jet'); break;
        case 'bomb': this.bomb(e); sound.play('boom'); break;
        case 'bossdown':
          this.bossDeath = { x: e.x, z: e.z, t: 0, next: 0, done: false, col: bossColor(sim.L.n) };
          this.shakeAmt = 0.5;
          this.slow = 1.0; // the killing blow lands in slow motion
          sound.play('boom');
          break;
      }
    }
    ev.length = 0;
  }

  update(dt, sim, sound) {
    // The squad marches, so anything left lying on the road slides back.
    const dp = this.lastP === null || !sim ? 0 : Math.max(0, sim.p - this.lastP);
    if (sim) this.lastP = sim.p;

    let w = 0;
    for (const q of this.chunks) {
      q.life -= dt;
      if (q.life <= 0) continue;
      q.vy -= 16 * dt;
      q.x += q.vx * dt;
      q.y += q.vy * dt;
      q.z += q.vz * dt - dp;
      q.yaw += q.yawV * dt;
      q.pitch += q.pitchV * dt;
      if (q.y < 0.06) {
        q.y = 0.06;
        q.vy *= -0.38;
        q.vx *= 0.6;
        q.vz *= 0.6;
        q.yawV *= 0.5;
        q.pitchV *= 0.5;
      }
      this.chunks[w++] = q;
    }
    this.chunks.length = w;

    w = 0;
    for (const c of this.corpses) {
      c.t += dt;
      c.flash = Math.max(0, c.flash - dt * 7);
      c.z -= dp;
      if (!c.landed) {
        c.vy -= 17 * dt;
        c.x += c.vx * dt;
        c.y += c.vy * dt;
        c.z += c.vz * dt;
        c.yaw += c.yawV * dt;
        c.pitch += c.pitchV * dt;
        if (c.pitchV < 0 ? c.pitch < c.pitchEnd : c.pitch > c.pitchEnd) c.pitch = c.pitchEnd;
        if (c.y <= 0 && c.vy < 0) {
          c.y = 0;
          c.landed = true;
          c.pitch = c.pitchEnd;
          if (c.heavy) {
            // A heavy body lands with a thud and a ring of dust.
            const r = c.giant ? 2.4 : 1.2;
            this.sprite({ add: false, shape: 2, flat: 1, x: c.x, y: 0.04, z: c.z, s0: r * 0.6, s1: r * 1.8, col: [0.75, 0.74, 0.78], a: 0.4, life: 0.5, pow: 1.5 });
            this.sprite({ shape: 1, flat: 1, x: c.x, y: 0.05, z: c.z, s0: r * 0.5, s1: r * 2.2, col: [1, 0.9, 0.8], a: 0.5, life: 0.3 });
            this.shakeAmt = Math.max(this.shakeAmt, c.giant ? 0.5 : 0.18);
            if (sound && c.giant) sound.play('slam');
          }
        }
      } else {
        c.rest += dt;
        c.x += c.vx * dt * Math.max(0, 1 - c.rest * 4);
        c.z += c.vz * dt * Math.max(0, 1 - c.rest * 4);
        if (c.rest > 0.35) c.y -= dt * 0.9 * c.s; // sink into the road
        if (c.rest > 0.95) continue;
      }
      if (c.z < -8) continue;
      this.corpses[w++] = c;
    }
    this.corpses.length = w;

    w = 0;
    for (const s of this.sprites) {
      // Every sprite is drawn at least once, even on a slow frame.
      if (s.fresh) s.fresh = false;
      else s.life -= dt;
      if (s.life <= 0) continue;
      s.vy -= s.grav * dt;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.z += s.vz * dt - (s.anchored ? dp : 0);
      if (s.grav && s.y < 0.05) {
        s.y = 0.05;
        s.vy *= -0.3;
      }
      this.sprites[w++] = s;
    }
    this.sprites.length = w;

    w = 0;
    for (const f of this.flyers) {
      if (f.delay > 0) {
        f.delay -= dt;
        f.z -= dp;
      } else {
        f.life -= dt;
        if (f.life <= 0) continue;
        f.x += f.vx * dt;
        f.y += f.vy * dt;
        f.z += f.vz * dt - dp;
      }
      this.flyers[w++] = f;
    }
    this.flyers.length = w;

    w = 0;
    for (const l of this.lobs) {
      l.t += dt;
      l.z0 -= dp;
      l.z1 -= dp;
      if (l.t >= l.fuse) continue;
      if (Math.random() < 0.5) {
        const u = l.t / l.fuse;
        this.sprite({ x: l.x0 + (l.x1 - l.x0) * u, y: 1.2 * (1 - u) + 0.2 * u + l.h * 4 * u * (1 - u), z: l.z0 + (l.z1 - l.z0) * u, s0: 0.22, s1: 0.05, col: ACID.ball, a: 0.6, life: 0.22 });
      }
      this.lobs[w++] = l;
    }
    this.lobs.length = w;
    this.dodgeT = Math.max(0, this.dodgeT - dt);
    this.bossHit += dt;
    this.shotAge += dt;

    w = 0;
    for (const f of this.floats) {
      f.life -= dt;
      if (f.life <= 0) continue;
      f.y += 1.6 * dt;
      this.floats[w++] = f;
    }
    this.floats.length = w;

    // Smoke behind rockets, afterglow behind plasma bolts.
    if (sim && sim.bullets.length) {
      const wl = WEAPON_LOOK[sim.lo.weapon];
      if (wl && (wl.rocket || wl.orb)) {
        this.trailT += dt;
        if (this.trailT > 0.034) {
          this.trailT = 0;
          for (const b of sim.bullets) {
            if (wl.rocket) {
              this.sprite({ add: false, shape: 2, x: b.x + rnd(-0.05, 0.05), y: 0.74, z: b.z - 0.45, vy: rnd(0.3, 0.9), s0: 0.16, s1: rnd(0.45, 0.7), col: [0.78, 0.78, 0.8], a: 0.3, life: rnd(0.35, 0.55), pow: 1.4 });
            } else {
              this.sprite({ x: b.x, y: 0.72, z: b.z - 0.3, s0: 0.3, s1: 0.08, col: wl.col, a: 0.5, life: 0.14 });
            }
          }
        }
      }
    }

    // The boss does not just vanish: it burns, then blows apart.
    const bd = this.bossDeath;
    if (bd && !bd.done) {
      bd.t += dt;
      bd.z -= dp;
      bd.next -= dt;
      if (bd.next <= 0) {
        bd.next = 0.09;
        this.explosion(bd.x + rnd(-1.6, 1.6), bd.z + rnd(-0.6, 0.6), rnd(0.6, 1.1), FIRE, rnd(0.6, 3.6));
        this.debris(bd.x + rnd(-1, 1), rnd(1, 3), bd.z, 2, bd.col, 6, 0.3, 1);
        if (sound) sound.play('boom');
      }
      if (bd.t > 1.25) {
        bd.done = true;
        this.explosion(bd.x, bd.z, 4, FIRE, 1.8);
        this.explosion(bd.x, bd.z, 2.2, FIRE, 0.6);
        this.sprite({ shape: 1, flat: 1, x: bd.x, y: 0.05, z: bd.z, s0: 2, s1: 16, col: [1, 0.8, 0.5], a: 1, life: 0.6 });
        this.debris(bd.x, 1.8, bd.z, 46, bd.col, 11, 0.4, 1.3);
        this.debris(bd.x, 1.8, bd.z, 14, [0.24, 0.25, 0.32], 10, 0.35, 1.3);
        this.sparks(bd.x, 2, bd.z, 30, [1, 0.9, 0.6], 12, 0.8, 0.2);
        this.screenFlash = 1;
        this.shakeAmt = 1.1;
        if (sound) sound.play('slam');
      }
    }

    this.shakeAmt *= Math.pow(0.02, dt);
    this.shake[0] = (Math.random() - 0.5) * this.shakeAmt;
    this.shake[1] = (Math.random() - 0.5) * this.shakeAmt;
    this.squadFlash = Math.max(0, this.squadFlash - dt * 3);
    this.recoil = Math.max(0, this.recoil - dt * 14);
    this.screenFlash = Math.max(0, this.screenFlash - dt * 2.2);
    this.light0.i *= Math.pow(0.000001, dt);
    this.light1.i *= Math.pow(0.004, dt);
  }
}

return { Fx };
