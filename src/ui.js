// Menus and the heads-up display, built as ordinary HTML on top of the canvas.

const { WEAPONS, INFANTRY, ENEMIES, ENEMY_TIPS, STRIKE_FROM, STAR_BONUS, SHELL_FROM, zoneOf, shopOffers, loadoutOf, byId, isBossLevel, bossName, levelReward, fmt } = __m["src/data.js"];
const { THUMBS } = __m["src/thumbs.js"];
const qs = (sel, root = document) => root.querySelector(sel);
const thumb = (id) => (THUMBS[id] ? `<img class="thumb" src="${THUMBS[id]}" alt="" width="56" height="56">` : '');

function buildUI(root) {
  root.innerHTML = `
  <div id="hud" class="hud" hidden>
    <div class="hud-top">
      <button id="btn-pause" class="icon-btn" aria-label="Pause">II</button>
      <div class="hud-level"><span id="hud-level">Level 1</span>
        <div class="bar"><div id="hud-progress" class="bar-fill"></div></div>
      </div>
      <div class="coin-pill"><i class="coin"></i><span id="hud-coins">0</span></div>
    </div>
    <div id="boss-bar" class="boss-bar" hidden><span>BOSS</span><div class="bar foe"><div id="boss-fill" class="bar-fill"></div></div></div>
    <div id="hud-buffs" class="buffs"></div>
    <button id="btn-strike" class="strike" hidden aria-label="Call airstrike"><span class="strike-fill"></span><span class="strike-label">Strike<kbd class="strike-key">Space</kbd></span></button>
    <div id="toast" class="toast" hidden></div>
    <div id="hint" class="hint" hidden></div>
  </div>

  <section id="screen-home" class="screen home" hidden>
    <div class="topline">
      <div class="coin-pill"><i class="coin"></i><span data-coins>0</span></div>
      <div class="tools">
        <button id="btn-full" class="icon-btn" aria-label="Fullscreen" hidden><svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path d="M2 6V2h4M10 2h4v4M14 10v4h-4M6 14H2v-4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
        <button id="btn-sound" class="icon-btn" aria-label="Sound">♪</button>
      </div>
    </div>
    <div class="spacer"></div>
    <div class="panel">
      <h1 class="title">HORDE<span>BREAK</span></h1>
      <p id="home-level" class="level-line">Level 1</p>
      <p id="home-brief" class="brief"></p>
      <dl id="home-kit" class="kit"></dl>
      <button id="btn-start" class="btn primary">Start battle</button>
      <button id="btn-armory" class="btn">Armory <span id="armory-badge" class="badge" hidden></span></button>
    </div>
  </section>

  <section id="screen-armory" class="screen armory" hidden>
    <div class="topline solid">
      <button id="btn-back" class="btn small">Back</button>
      <h2>Armory</h2>
      <div class="coin-pill"><i class="coin"></i><span data-coins>0</span></div>
    </div>
    <div id="armory-list" class="list"></div>
  </section>

  <section id="screen-result" class="screen result" hidden>
    <div class="spacer"></div>
    <div class="panel">
      <div id="result-stars" class="stars" hidden></div>
      <h2 id="result-title" class="verdict">Victory</h2>
      <p id="result-sub" class="brief"></p>
      <div class="reward"><i class="coin"></i><span id="result-coins">+0</span></div>
      <dl id="result-stats" class="kit"></dl>
      <div id="result-unlocks" class="unlocks"></div>
      <button id="btn-next" class="btn primary">Next level</button>
      <button id="btn-result-armory" class="btn">Armory <span id="armory-badge-2" class="badge" hidden></span></button>
    </div>
  </section>

  <section id="screen-pause" class="screen pause" hidden>
    <div class="panel">
      <h2 class="verdict small">Paused</h2>
      <button id="btn-resume" class="btn primary">Resume</button>
      <button id="btn-quit" class="btn">Leave battle</button>
      <p class="keys">Steer with the mouse or A / D. Space calls the airstrike, P pauses, F toggles fullscreen.</p>
    </div>
  </section>`;
}

function show(id) {
  for (const s of document.querySelectorAll('.screen')) s.hidden = s.id !== id;
  qs('#hud').hidden = id !== null && id !== 'screen-pause';
}

function setCoins(save) {
  for (const el of document.querySelectorAll('[data-coins]')) el.textContent = fmt(save.coins);
}

function affordableCount(save) {
  let n = 0;
  for (const o of shopOffers(save)) {
    if (o.locked || o.cost > save.coins) continue;
    if (o.kind === 'upgrade' ? !o.maxed : !o.owned) n++;
  }
  return n;
}

function setBadges(save) {
  const n = affordableCount(save);
  for (const id of ['#armory-badge', '#armory-badge-2']) {
    const el = qs(id);
    el.hidden = n === 0;
    el.textContent = n;
  }
}

function renderHome(save, plan) {
  setCoins(save);
  setBadges(save);
  const lo = loadoutOf(save);
  const boss = isBossLevel(save.level);
  qs('#home-level').innerHTML = `Level ${save.level} <span class="zone">${zoneOf(save.level).title}</span>${boss ? ' <b class="tag foe">Boss</b>' : ''}`;
  const eased = plan && plan.mercy < 1;
  const walled = plan && !plan.verified;
  qs('#btn-armory').classList.toggle('nudge', !!walled);
  // The first time an enemy (or the airstrike) appears, the briefing says what it does.
  const newcomer = Object.keys(ENEMIES).find((k) => ENEMIES[k].from === save.level && ENEMY_TIPS[k]);
  qs('#home-brief').textContent = walled
    ? 'This horde outguns your squad. Spend your coins in the armory before you march.'
    : boss
    ? `${bossName(save.level)} waits at the end of the road. It marks the ground before it strikes: get off it, and bring the boss down before it reaches the squad.`
    : newcomer
    ? `New enemy: ${ENEMIES[newcomer].name}. ${ENEMY_TIPS[newcomer]}`
    : save.level === STRIKE_FROM
    ? 'Air support is on call. Kills charge the Strike button; tap it to bomb the road ahead.'
    : save.level === SHELL_FROM
    ? 'New ground: Nightline. Stretches of this road are shelled. Keep moving off the marked ground.'
    : eased
      ? 'Scouts thinned the horde to match your squad. Stronger gear earns the full reward.'
      : `Reach the finish line. Clearing this level pays about ${fmt(levelReward(save.level) * lo.coinMul)} coins.`;
  qs('#home-kit').innerHTML = `
    <div class="has-thumb">${thumb(save.weapon)}<dt>Weapon</dt><dd>${byId(WEAPONS, save.weapon).name}</dd></div>
    <div class="has-thumb">${thumb(save.infantry)}<dt>Troops</dt><dd>${byId(INFANTRY, save.infantry).name}</dd></div>
    <div><dt>Squad</dt><dd class="big">${lo.startCount}</dd></div>`;
  qs('#btn-sound').classList.toggle('off', !save.sound);
}

function nextUnlock(save) {
  let best = null;
  for (const it of [...WEAPONS, ...INFANTRY]) {
    if (it.unlock > save.level && (!best || it.unlock < best.unlock)) best = it;
  }
  return best;
}

function renderArmory(save, onBuy) {
  setCoins(save);
  const list = qs('#armory-list');
  const offers = shopOffers(save);
  const row = (o, i) => {
    const it = o.item;
    let action;
    let cls = '';
    if (o.locked) {
      action = `<span class="lock">Level ${it.unlock}</span>`;
      cls = 'locked';
    } else if (o.kind === 'upgrade') {
      action = o.maxed
        ? '<span class="lock">Maxed</span>'
        : `<button class="btn small buy" data-i="${i}" ${o.cost > save.coins ? 'disabled' : ''}><i class="coin"></i>${fmt(o.cost)}</button>`;
    } else if (o.equipped) {
      action = '<span class="equipped">Equipped</span>';
      cls = 'active';
    } else if (o.owned) {
      action = `<button class="btn small" data-i="${i}">Equip</button>`;
    } else {
      action = `<button class="btn small buy" data-i="${i}" ${o.cost > save.coins ? 'disabled' : ''}><i class="coin"></i>${fmt(o.cost)}</button>`;
    }
    let stat = it.desc;
    if (o.kind === 'weapon') stat = `${it.desc} <em>${((it.dmg * it.pellets) / it.interval).toFixed(1)} damage/s per soldier</em>`;
    if (o.kind === 'upgrade') stat = `${it.desc} <em>Level ${o.lvl}</em>`;
    return `<div class="row ${cls}">${o.kind === 'upgrade' ? '' : thumb(it.id)}<div class="row-text"><strong>${it.name}</strong><span>${stat}</span></div>${action}</div>`;
  };
  // Each kind is its own shelf: stacked on a phone, side by side on a wide screen.
  const section = (title, kind) =>
    `<section class="shelf"><h3>${title}</h3>` + offers.map((o, i) => (o.kind === kind ? row(o, i) : '')).join('') + '</section>';
  const nu = nextUnlock(save);
  list.innerHTML =
    (nu ? `<p class="next-unlock">Next unlock: <b>${nu.name}</b> at level ${nu.unlock}</p>` : '') +
    section('Weapons', 'weapon') + section('Infantry', 'infantry') + section('Upgrades', 'upgrade');
  for (const btn of list.querySelectorAll('button[data-i]')) {
    btn.addEventListener('click', () => onBuy(offers[+btn.dataset.i]));
  }
}

function renderResult(save, info) {
  setCoins(save);
  setBadges(save);
  const win = info.win;
  const title = qs('#result-title');
  title.textContent = win ? 'Victory' : 'Defeat';
  title.classList.toggle('lose', !win);
  let sub;
  if (win) {
    sub = `Level ${info.level} cleared with ${info.survivors} ${info.survivors === 1 ? 'soldier' : 'soldiers'} standing.`;
    if (info.walled) sub += ' The next horde outguns your squad: visit the armory first.';
  } else if (info.walled) {
    sub = 'Your squad is outgunned. Spend your coins in the armory to break through.';
  } else if (info.streak >= 2) {
    sub = 'The horde will be lighter next time.';
  } else {
    sub = `The squad fell ${Math.round(info.progress * 100)}% of the way through. You keep the coins you earned.`;
  }
  if (win && STAR_BONUS[info.stars] > 0) sub += ` Medal bonus: +${Math.round(STAR_BONUS[info.stars] * 100)}% coins.`;
  qs('#result-sub').textContent = sub;
  const stars = qs('#result-stars');
  stars.hidden = !win;
  stars.setAttribute('aria-label', `${info.stars} of 3 medals`);
  stars.innerHTML = [1, 2, 3].map((i) => `<i class="${i <= info.stars ? 'on' : ''}" style="animation-delay:${i * 0.12}s"></i>`).join('');
  qs('#btn-result-armory').classList.toggle('nudge', info.walled);
  qs('#result-coins').textContent = '+' + fmt(info.coins);
  qs('#result-stats').innerHTML = `
    <div><dt>Enemies down</dt><dd>${fmt(info.kills)}</dd></div>
    <div><dt>Troops lost</dt><dd>${fmt(info.lost)}</dd></div>
    <div><dt>Best squad</dt><dd>${fmt(info.peak)}</dd></div>`;
  qs('#result-unlocks').innerHTML = info.unlocks.length
    ? `<p>New in the armory</p>` + info.unlocks.map((u) => `<span class="tag">${u}</span>`).join('')
    : '';
  qs('#btn-next').textContent = win ? 'Next level' : 'Try again';
}

function updateHud(sim, save, coinsSoFar) {
  qs('#hud-level').textContent = 'Level ' + sim.L.n;
  qs('#hud-progress').style.width = (sim.progress * 100).toFixed(1) + '%';
  qs('#hud-coins').textContent = fmt(coinsSoFar);
  const boss = sim.boss;
  const bb = qs('#boss-bar');
  if (boss && boss.awake) {
    bb.hidden = false;
    qs('#boss-fill').style.width = Math.max(0, (boss.hp / boss.maxHp) * 100).toFixed(1) + '%';
  } else bb.hidden = true;
  const chips = [];
  if (sim.dmgMul > 1.001) chips.push(`<span class="chip dmg">DMG ×${sim.dmgMul.toFixed(2)}</span>`);
  if (sim.rateMul > 1.001) chips.push(`<span class="chip rate">RATE ×${sim.rateMul.toFixed(2)}</span>`);
  if (sim.extraPellets) chips.push(`<span class="chip multi">+${sim.extraPellets} BARREL</span>`);
  // Airstrike: the button fills as kills charge it.
  const sb = qs('#btn-strike');
  if (sb.hidden !== !sim.strikeOn) sb.hidden = !sim.strikeOn;
  if (sim.strikeOn) {
    const pct = Math.round(sim.charge * 100);
    if (sb.dataset.p !== String(pct)) {
      sb.dataset.p = pct;
      sb.style.setProperty('--p', pct + '%');
      sb.classList.toggle('ready', pct >= 100);
      sb.setAttribute('aria-disabled', pct >= 100 ? 'false' : 'true');
    }
  }
  const html = chips.join('');
  const buffs = qs('#hud-buffs');
  if (buffs.dataset.h !== html) {
    buffs.dataset.h = html;
    buffs.innerHTML = html;
  }
}

let toastTimer = 0;
function toast(text, ms = 1600) {
  const t = qs('#toast');
  t.textContent = text;
  t.hidden = false;
  t.classList.remove('pop');
  void t.offsetWidth;
  t.classList.add('pop');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (t.hidden = true), ms);
}

function setHint(on, mouse) {
  const h = qs('#hint');
  if (on) h.innerHTML = (mouse ? 'Move the mouse to steer, or use A and D.' : 'Drag left and right to steer.') + '<br>Your squad fires on its own.';
  h.hidden = !on;
}

return { buildUI, show, renderHome, renderArmory, renderResult, updateHud, toast, setHint };
