// The game rules, with no drawing or sound. It advances in fixed steps and is
// fully deterministic, so the same code can be played by a person (main.js)
// or fast-forwarded by the bot that proves a level is winnable (bot.js).
//
// Positions: x is across the road, z is distance ahead of the squad.
// Things in the level sit at a track position s; their z is s - p, where p is
// how far the squad has marched.

const { ROAD_HALF, SCROLL, DT, VIEW, BULLET_RANGE, MAX_COUNT, ENEMIES, STRIKE_FROM, STRIKE_PER_LEVEL, starsFor, STAR_BONUS } = __m["src/data.js"];
const { mulberry32 } = __m["src/rng.js"];
const FUNNEL = 30; // enemies start converging on the squad at this distance
const GX = 12;
const GZ = VIEW + 4;
const SPIT_FUSE = 1.5; // seconds an acid blob spends in the air
const SPIT_R = 1.25;
const STRIKE_BOMBS = 6;

class Sim {
  constructor(level, loadout, opts = {}) {
    this.L = level;
    this.lo = loadout;
    this.rng = mulberry32((level.seed ^ 0x51ed270b) + level.n * 7919);
    this.record = !!opts.record; // collect events for drawing and sound
    this.events = [];
    this.handicap = opts.handicap ?? 1;
    this.maxStrafe = opts.maxStrafe ?? 18;
    this.t = 0;
    this.p = 0;
    this.x = 0;
    this.targetX = 0;
    this.count = Math.min(MAX_COUNT, loadout.startCount + (opts.bonusUnits | 0));
    this.startCount = this.count;
    this.dmgMul = 1;
    this.rateMul = 1;
    this.extraPellets = 0;
    this.fireT = 0.3;
    this.enemies = [];
    this.bigs = [];
    this.bullets = [];
    this.spawnI = 0;
    this.gates = level.gates.map((g) => ({ ...g, used: false, taken: false }));
    this.barriers = level.barriers.map((b) => ({ ...b, hp: b.maxHp, alive: true, flash: 0 }));
    this.crates = level.crates.map((c) => ({ ...c, hp: c.maxHp, alive: true, flash: 0 }));
    this.boss = level.boss
      ? { x: 0, s: level.boss.s, z: level.boss.s, hp: level.boss.hp, maxHp: level.boss.hp, r: 2.2, flash: 0, spawnT: 2, stun: 0, awake: false, atkT: 3.2 }
      : null;
    this.bossHold = false;
    this.kills = 0;
    this.lost = 0;
    this.result = null;
    // Marked ground that is about to be hit: acid blobs, boss attacks, shellfire.
    this.hazards = [];
    this.shells = (level.shells || []).map((z) => ({ ...z, left: z.count, t: 0.4, on: false }));
    this.dodged = 0;
    // Airstrike: charge fills with kills; the player decides when to spend it.
    let worth = 0;
    for (const s of level.spawns) worth += ENEMIES[s.type].hp;
    if (level.boss) worth += 160;
    this.strikeOn = level.n >= STRIKE_FROM && opts.strike !== false;
    this.chargeNeed = Math.max(60, worth / STRIKE_PER_LEVEL);
    this.charge = 0;
    this.strike = null;
    this.strikes = 0;
    this.gridHead = new Int32Array(GX * GZ);
    this.gridNext = new Int32Array(2048);
  }

  get squadR() {
    return Math.min(2.3, Math.max(0.45, 0.33 * Math.sqrt(this.count)));
  }

  get progress() {
    return Math.min(1, this.p / this.L.length);
  }

  // Current damage per second, used by the bot to judge barriers.
  get dps() {
    return (this.count * this.lo.dmg * this.dmgMul * this.handicap * (this.lo.pellets + this.extraPellets) * this.rateMul) / this.lo.interval;
  }

  emit(e) {
    if (this.record) this.events.push(e);
  }

  step() {
    if (this.result) return;
    const dt = DT;
    this.t += dt;

    // 1. Squad slides toward where the player is pointing.
    const R = this.squadR;
    const lim = ROAD_HALF - Math.min(R, 1.2) * 0.6;
    const tx = Math.max(-lim, Math.min(lim, this.targetX));
    const dx = tx - this.x;
    const maxMove = this.maxStrafe * dt;
    this.x += Math.abs(dx) <= maxMove ? dx : Math.sign(dx) * maxMove;

    // 2. March forward (the boss arena stops the march).
    if (!this.bossHold) {
      this.p += SCROLL * dt;
      if (this.p >= this.L.length) {
        this.p = this.L.length;
        if (this.boss) this.bossHold = true;
      }
    }

    // 3. Wake enemies that are now in view.
    const sp = this.L.spawns;
    while (this.spawnI < sp.length && sp[this.spawnI].s - this.p < VIEW) {
      this.spawnEnemy(sp[this.spawnI++]);
    }

    // 4. Fire.
    this.fireT -= dt;
    if (this.fireT <= 0 && this.count > 0) this.volley(R);

    // 5. Enemies advance; anything touching the squad costs troops.
    this.updateEnemies(dt, R);
    if (this.boss) this.updateBoss(dt, R);

    // 6. Bullets fly and hit.
    this.updateBullets(dt);
    if (this.strike) this.updateStrike(dt);
    if (this.shells.length) this.updateShells(dt);
    if (this.hazards.length) this.updateHazards(dt, R);

    // 7. Gates, barriers and crates we have just reached.
    this.updateStatics();

    // 8. Win or lose.
    if (this.count <= 0) {
      this.count = 0;
      this.result = 'lose';
      this.emit({ t: 'lose' });
    } else if (this.boss ? this.boss.hp <= 0 : this.p >= this.L.length) {
      this.result = 'win';
      this.emit({ t: 'win' });
    } else if (this.t > 420) {
      this.result = 'lose';
    }
  }

  spawnEnemy(s) {
    const d = ENEMIES[s.type];
    const e = {
      type: s.type, x: s.x, s: s.s, z: s.s - this.p, hp: s.hp, maxHp: s.hp,
      speed: d.speed, lat: d.lat, r: d.r, dmg: s.dmg,
      off: this.rng() * 2 - 1, phase: this.rng() * 6.28, flash: 0,
    };
    if (s.type === 'spitter') {
      e.cd = 0.4 + this.rng() * 1.6;
      e.spat = 9; // seconds since it last spat: only the animation reads this
    }
    this.enemies.push(e);
  }

  volley(R) {
    const lo = this.lo;
    const interval = lo.interval / this.rateMul;
    this.fireT += interval;
    if (this.fireT < 0) this.fireT = 0;
    const pellets = lo.pellets + this.extraPellets;
    // Only a handful of bullets are simulated; each carries the damage of
    // several troops, so a 300-strong squad costs the same as a 10-strong one.
    const cap = Math.max(3, Math.min(14, Math.floor((70 * interval) / pellets)));
    const B = Math.min(this.count, cap);
    const dmg = (lo.dmg * this.dmgMul * this.handicap * this.count) / B;
    const fan = pellets > 1 ? 0.085 : 0;
    for (let i = 0; i < B; i++) {
      const ox = this.x + (B === 1 ? 0 : ((i + 0.5) / B) * 2 - 1) * R * 0.9 + (this.rng() - 0.5) * 0.3;
      for (let j = 0; j < pellets; j++) {
        const ang = (j - (pellets - 1) / 2) * fan + (this.rng() - 0.5) * lo.spread;
        this.bullets.push({
          x: ox, z: R * 0.6, vx: Math.sin(ang) * lo.speed, vz: Math.cos(ang) * lo.speed,
          dmg, pierce: lo.pierce, splash: lo.splash, dist: 0, skipZ: -1,
        });
      }
    }
    this.emit({ t: 'shot' });
  }

  loseUnits(k, x, z) {
    // k can be fractional: 0.4 means a 40% chance of costing one soldier.
    let hits = Math.floor(k);
    if (this.rng() < k - hits) hits++;
    let dead = 0;
    for (let i = 0; i < hits; i++) if (this.rng() >= this.lo.armor) dead++;
    if (dead > this.count) dead = this.count;
    this.count -= dead;
    this.lost += dead;
    this.emit({ t: 'breach', x, z, n: dead });
  }

  updateEnemies(dt, R) {
    const en = this.enemies;
    const head = this.gridHead;
    head.fill(-1);
    if (this.gridNext.length < en.length + 64) this.gridNext = new Int32Array(en.length * 2 + 64);
    const next = this.gridNext;
    this.bigs.length = 0;
    let w = 0;
    for (let i = 0; i < en.length; i++) {
      const e = en[i];
      if (e.hp <= 0) continue;
      e.s -= e.speed * dt;
      e.z = e.s - this.p;
      if (e.flash > 0) e.flash -= dt * 6;
      if (e.z < FUNNEL) {
        // Close enough to notice the squad: pour toward it.
        const want = this.x + e.off * (R + 0.5);
        const d = want - e.x;
        const mv = e.lat * dt;
        e.x += Math.abs(d) <= mv ? d : Math.sign(d) * mv;
      }
      if (e.cd !== undefined) {
        e.cd -= dt;
        e.spat += dt;
        if (e.cd <= 0 && e.z > 9 && e.z < 38) this.spit(e);
      }
      const reach = R + e.r;
      if (e.z <= reach * 0.8 && e.z > -1.5 && Math.abs(e.x - this.x) <= reach) {
        this.loseUnits(e.dmg, e.x, e.z);
        if (e.type === 'bomber') this.emit({ t: 'boom', x: e.x, z: e.z, r: 1.6, bomber: true });
        e.hp = 0;
        continue;
      }
      if (e.z < -4) {
        e.hp = 0;
        continue;
      }
      en[w] = e;
      if (e.r > 0.9) this.bigs.push(e);
      else if (e.z >= 0 && e.z < GZ) {
        let cx = Math.floor(e.x + 6);
        cx = cx < 0 ? 0 : cx >= GX ? GX - 1 : cx;
        const cell = cx + Math.floor(e.z) * GX;
        next[w] = head[cell];
        head[cell] = w;
      }
      w++;
    }
    en.length = w;
  }

  // A spitter lobs a blob at where the squad will be when it lands. The spot
  // is marked on the road at once, so there is time to step aside.
  spit(e) {
    e.cd = 3.0 + this.rng() * 1.2;
    e.spat = 0;
    const lim = ROAD_HALF - SPIT_R * 0.6;
    const x = Math.max(-lim, Math.min(lim, this.x));
    const ahead = this.bossHold ? 0 : SCROLL * SPIT_FUSE;
    this.hazards.push({ kind: 'acid', x0: x - SPIT_R, x1: x + SPIT_R, s: this.p + ahead, zr: SPIT_R, t: SPIT_FUSE, t0: SPIT_FUSE, share: 0.12, min: 1.5 });
    this.emit({ t: 'spit', x: e.x, z: e.z, tx: x, tz: ahead, fuse: SPIT_FUSE });
  }

  // Shellfire: while the squad is in a shelled stretch, a round is called in
  // every so often on the spot the squad will reach when it lands.
  updateShells(dt) {
    for (const z of this.shells) {
      if (z.left <= 0 || this.p < z.s || this.bossHold) continue;
      if (!z.on) {
        z.on = true;
        this.emit({ t: 'shelling' });
      }
      z.t -= dt;
      if (z.t > 0) continue;
      z.t = z.every;
      z.left--;
      const fuse = 1.3;
      const r = 1.35;
      const lim = ROAD_HALF - r * 0.6;
      const x = Math.max(-lim, Math.min(lim, this.x + (this.rng() - 0.5) * 0.8));
      this.hazards.push({ kind: 'shell', x0: x - r, x1: x + r, s: this.p + SCROLL * fuse, zr: r, t: fuse, t0: fuse, share: 0.1, min: 1.5 });
      this.emit({ t: 'shell', x, z: SCROLL * fuse, fuse });
    }
  }

  // How much of the squad's width stands on a hazard (0..1).
  overlap(h, x = this.x, R = this.squadR) {
    const z = h.s - this.p;
    if (Math.abs(z) > h.zr + R * 0.5) return 0;
    const w = Math.min(x + R, h.x1) - Math.max(x - R, h.x0);
    return w <= 0.12 ? 0 : Math.min(1, w / (2 * R));
  }

  updateHazards(dt, R) {
    const hz = this.hazards;
    let w = 0;
    for (const h of hz) {
      h.t -= dt;
      if (h.t > 0) {
        hz[w++] = h;
        continue;
      }
      const f = this.overlap(h, this.x, R);
      const z = h.s - this.p;
      this.emit({ t: 'blast', kind: h.kind, x0: h.x0, x1: h.x1, z, zr: h.zr, hit: f > 0 });
      if (f > 0 && this.count > 0) this.loseUnits(Math.max(h.min, this.count * h.share) * f, (Math.max(h.x0, this.x - R) + Math.min(h.x1, this.x + R)) / 2, 0.3);
      else this.dodged++;
    }
    hz.length = w;
  }

  // The boss marks ground and then smashes it. Higher tiers know more moves.
  bossAttack(b) {
    const tier = this.L.boss.tier;
    const fuse = Math.max(1.25, 1.75 - tier * 0.06);
    const moves = ['smash'];
    if (tier >= 2) moves.push('sweep');
    if (tier >= 3) moves.push('pincer', 'spine');
    const move = moves[Math.floor(this.rng() * moves.length)];
    const add = (x0, x1, zc, zr, share) => this.hazards.push({ kind: 'slam', x0, x1, s: this.p + zc, zr, t: fuse, t0: fuse, share, min: 2 });
    if (move === 'smash') {
      // One blast on the squad, one beside it: there is always a way out.
      const side = this.x > 0 ? -1 : 1;
      add(this.x - 1.7, this.x + 1.7, 0, 1.9, 0.2);
      const x2 = Math.max(-ROAD_HALF + 1.6, Math.min(ROAD_HALF - 1.6, this.x - side * 3.6));
      add(x2 - 1.5, x2 + 1.5, 0, 1.7, 0.2);
    } else if (move === 'sweep') {
      // The half of the road the squad is standing on.
      if (this.x > 0) add(-0.4, ROAD_HALF, 2, 5, 0.22);
      else add(-ROAD_HALF, 0.4, 2, 5, 0.22);
    } else if (move === 'pincer') {
      add(-ROAD_HALF, -1.9, 2, 5, 0.22);
      add(1.9, ROAD_HALF, 2, 5, 0.22);
    } else {
      add(-1.9, 1.9, 2, 5, 0.22);
    }
    this.emit({ t: 'bosscast', move, x: b.x, z: b.z });
  }

  callStrike() {
    if (!this.strikeOn || this.charge < 1 || this.strike || this.result) return false;
    this.charge = 0;
    this.strikes++;
    this.strike = { t: 0, i: 0 };
    this.emit({ t: 'strike' });
    return true;
  }

  // Bombs walk up the road, one band at a time.
  updateStrike(dt) {
    const st = this.strike;
    st.t += dt;
    while (st.i < STRIKE_BOMBS && st.t >= 0.6 + st.i * 0.13) {
      const z = 4 + st.i * 5.4;
      const dmg = 14 * this.L.hpUnit;
      for (const e of this.enemies) {
        if (e.hp > 0 && Math.abs(e.z - z) <= 3.1) this.damageEnemy(e, dmg, true);
      }
      this.emit({ t: 'bomb', z, i: st.i });
      st.i++;
    }
    if (st.i >= STRIKE_BOMBS) {
      const b = this.boss;
      if (b && b.hp > 0 && b.awake && b.z < 40) {
        b.hp -= b.maxHp * 0.07;
        b.flash = 1;
        b.stun = Math.max(b.stun, 1.0);
        if (b.hp <= 0) this.emit({ t: 'bossdown', x: b.x, z: b.z });
      }
      this.strike = null;
    }
  }

  updateBoss(dt, R) {
    const b = this.boss;
    if (b.hp <= 0) return;
    if (b.flash > 0) b.flash -= dt * 6;
    b.z = b.s - this.p;
    if (b.z > VIEW) return;
    if (!b.awake) {
      b.awake = true;
      this.emit({ t: 'boss' });
    }
    if (b.stun > 0) b.stun -= dt;
    else if (this.bossHold) b.s -= this.L.boss.speed * dt;
    const d = this.x - b.x;
    b.x += Math.sign(d) * Math.min(Math.abs(d), 1.3 * dt);
    b.z = b.s - this.p;
    // Minion waves.
    b.spawnT -= dt;
    if (b.spawnT <= 0 && b.z > 9) {
      b.spawnT = this.L.boss.minionEvery;
      const k = this.L.boss.minions;
      for (let i = 0; i < k; i++) {
        const x = Math.max(-4.5, Math.min(4.5, b.x + (this.rng() * 2 - 1) * 4));
        this.spawnEnemy({ type: 'grunt', x, s: b.s - 2.2 - this.rng() * 2.5, hp: this.L.boss.minionHp, dmg: ENEMIES.grunt.dmg });
      }
    }
    // Marked attacks, once the squad has stopped to fight.
    if (this.bossHold && b.stun <= 0 && b.z > R + 4) {
      b.atkT -= dt;
      if (b.atkT <= 0) {
        b.atkT = Math.max(2.8, 4.8 - this.L.boss.tier * 0.3);
        this.bossAttack(b);
      }
    }
    // Slam: a heavy hit, then the boss staggers back so there is another chance.
    if (b.z <= R + 1.3) {
      const k = Math.max(3, Math.ceil(this.count * 0.25));
      this.count = Math.max(0, this.count - k);
      this.lost += k;
      b.s += 10;
      b.stun = 1.2;
      this.emit({ t: 'slam', x: b.x, z: b.z, n: k });
    }
  }

  damageEnemy(e, d, bombed) {
    e.hp -= d;
    e.flash = 1;
    if (e.hp <= 0) {
      this.kills++;
      if (this.strikeOn && !bombed) this.charge = Math.min(1, this.charge + ENEMIES[e.type].hp / this.chargeNeed);
      this.emit({ t: 'kill', x: e.x, z: e.z, k: e.type, ph: e.phase, bombed });
    }
  }

  explode(x, z, r, dmg) {
    const head = this.gridHead;
    const next = this.gridNext;
    const en = this.enemies;
    const r2 = r * r;
    const z0 = Math.max(0, Math.floor(z - r));
    const z1 = Math.min(GZ - 1, Math.floor(z + r));
    const x0 = Math.max(0, Math.floor(x + 6 - r));
    const x1 = Math.min(GX - 1, Math.floor(x + 6 + r));
    for (let cz = z0; cz <= z1; cz++) {
      for (let cx = x0; cx <= x1; cx++) {
        for (let i = head[cx + cz * GX]; i >= 0; i = next[i]) {
          const e = en[i];
          if (e.hp <= 0) continue;
          const ddx = e.x - x;
          const ddz = e.z - z;
          if (ddx * ddx + ddz * ddz <= r2) this.damageEnemy(e, dmg);
        }
      }
    }
    for (const e of this.bigs) {
      if (e.hp <= 0) continue;
      const ddx = e.x - x;
      const ddz = e.z - z;
      if (ddx * ddx + ddz * ddz <= (r + e.r) * (r + e.r)) this.damageEnemy(e, dmg);
    }
    this.emit({ t: 'boom', x, z, r });
  }

  updateBullets(dt) {
    const bl = this.bullets;
    const head = this.gridHead;
    const next = this.gridNext;
    const en = this.enemies;
    const p = this.p;
    let w = 0;
    outer: for (let i = 0; i < bl.length; i++) {
      const b = bl[i];
      b.x += b.vx * dt;
      b.z += b.vz * dt;
      b.dist += b.vz * dt;
      if (b.dist > BULLET_RANGE || b.x < -ROAD_HALF - 0.5 || b.x > ROAD_HALF + 0.5) continue;

      // Barriers and crates soak up bullets.
      for (const bar of this.barriers) {
        if (!bar.alive) continue;
        const bz = bar.s - p;
        if (b.z > bz - 0.35 && b.z < bz + 0.5 && b.x >= bar.x0 && b.x <= bar.x1) {
          bar.hp -= b.dmg;
          bar.flash = 1;
          if (bar.hp <= 0) {
            bar.alive = false;
            this.emit({ t: 'barrier', x: (bar.x0 + bar.x1) / 2, z: bz });
          } else this.emit({ t: 'hit', x: b.x, z: bz });
          continue outer;
        }
      }
      for (const c of this.crates) {
        if (!c.alive) continue;
        const cz = c.s - p;
        if (cz < 0.5 || Math.abs(b.z - cz) > 0.9 || Math.abs(b.x - c.x) > 0.95) continue;
        c.hp -= b.dmg;
        c.flash = 1;
        if (c.hp <= 0) {
          c.alive = false;
          this.applyBonus(c.kind, c.val, c.x, cz, true);
        } else this.emit({ t: 'hit', x: b.x, z: cz });
        continue outer;
      }

      // The boss.
      const bo = this.boss;
      if (bo && bo.hp > 0 && Math.abs(b.x - bo.x) < bo.r && Math.abs(b.z - bo.z) < 1.2) {
        if (b.splash > 0) this.explode(b.x, b.z, b.splash, b.dmg);
        if (this.strikeOn) this.charge = Math.min(1, this.charge + (Math.min(b.dmg, bo.hp) / bo.maxHp) * 1.4);
        bo.hp -= b.dmg;
        bo.flash = 1;
        this.emit({ t: 'hit', x: b.x, z: b.z });
        if (bo.hp <= 0) this.emit({ t: 'bossdown', x: bo.x, z: bo.z });
        continue;
      }

      // Giants and other large bodies.
      for (const e of this.bigs) {
        if (e.hp <= 0) continue;
        if (Math.abs(b.x - e.x) < e.r && Math.abs(b.z - e.z) < e.r) {
          if (b.splash > 0) this.explode(b.x, b.z, b.splash, b.dmg);
          else {
            const d = Math.min(b.dmg, e.hp);
            this.damageEnemy(e, d);
            b.dmg -= d;
            this.emit({ t: 'hit', x: b.x, z: b.z });
            if (e.hp <= 0 && b.dmg > 0.001) break; // leftover damage carries on
          }
          continue outer;
        }
      }

      // The crowd, looked up through the grid.
      if (b.z >= 0 && b.z < GZ) {
        let cx = Math.floor(b.x + 6);
        cx = cx < 0 ? 0 : cx >= GX ? GX - 1 : cx;
        const cz = Math.floor(b.z);
        for (let gz = cz - 1; gz <= cz + 1; gz++) {
          if (gz < 0 || gz >= GZ) continue;
          for (let gx = cx - 1; gx <= cx + 1; gx++) {
            if (gx < 0 || gx >= GX) continue;
            for (let k = head[gx + gz * GX]; k >= 0; k = next[k]) {
              const e = en[k];
              if (e.hp <= 0 || e.z < b.skipZ) continue;
              if (Math.abs(b.x - e.x) < e.r + 0.14 && Math.abs(b.z - e.z) < e.r + 0.38) {
                if (b.splash > 0) {
                  this.explode(b.x, b.z, b.splash, b.dmg);
                  if (b.pierce > 0) {
                    b.pierce--;
                    b.skipZ = b.z + b.splash;
                    continue;
                  }
                  continue outer;
                }
                const d = Math.min(b.dmg, e.hp);
                this.damageEnemy(e, d);
                if (b.pierce > 0) {
                  // Piercing rounds keep their full damage for the next body.
                  b.pierce--;
                  b.skipZ = e.z + e.r + 0.2;
                  continue;
                }
                // A normal bullet stops in a body it could not kill; leftover
                // damage from a kill carries on to whoever is behind.
                b.dmg -= d;
                if (e.hp > 0 || b.dmg <= 0.001) {
                  this.emit({ t: 'hit', x: b.x, z: b.z });
                  continue outer;
                }
              }
            }
          }
        }
      }
      bl[w++] = b;
    }
    bl.length = w;
  }

  applyBonus(kind, val, x, z, fromCrate) {
    let text = '';
    if (kind === 'add' || kind === 'squad') {
      const before = this.count;
      this.count = Math.max(1, Math.min(MAX_COUNT, this.count + val));
      text = (val >= 0 ? '+' : '') + (this.count - before || val);
    } else if (kind === 'mul') {
      this.count = Math.min(MAX_COUNT, Math.round(this.count * val));
      text = '×' + val;
    } else if (kind === 'rate') {
      this.rateMul *= val;
      text = 'FIRE RATE +' + Math.round((val - 1) * 100) + '%';
    } else if (kind === 'dmg') {
      this.dmgMul *= val;
      text = 'DAMAGE +' + Math.round((val - 1) * 100) + '%';
    } else if (kind === 'multi') {
      this.extraPellets++;
      text = 'EXTRA BARREL';
    }
    this.emit({ t: fromCrate ? 'crate' : 'gate', x, z, text, good: !(kind === 'add' && val < 0) });
  }

  updateStatics() {
    const p = this.p;
    for (const g of this.gates) {
      if (g.used || g.s - p > 0) continue;
      g.used = true;
      if (this.x < g.x0 || this.x >= g.x1) continue;
      if (g.bar >= 0 && this.barriers[g.bar].alive) {
        this.emit({ t: 'locked', x: (g.x0 + g.x1) / 2, z: 0 });
        continue;
      }
      g.taken = true;
      this.applyBonus(g.kind, g.val, (g.x0 + g.x1) / 2, 0, false);
    }
  }
}

// What the squad has gained so far, for the result screen.
function coinsEarned(sim, coinMul) {
  const L = sim.L;
  const total = Math.max(1, L.spawns.length);
  const killShare = Math.min(1, sim.kills / total);
  const base = sim.result === 'win' ? L.reward * (0.7 + 0.3 * killShare) : L.reward * Math.max(0.12, 0.3 * Math.max(killShare, sim.progress * 0.8));
  // Eased levels pay a little less, so upgrading stays worthwhile.
  const eased = 0.75 + 0.25 * Math.min(1, L.mercy);
  // Bringing the squad home nearly whole pays a bonus.
  const medal = sim.result === 'win' ? 1 + STAR_BONUS[starsFor(sim.lost, sim.count)] : 1;
  return Math.max(1, Math.round(base * coinMul * eased * medal));
}

return { Sim, coinsEarned };
