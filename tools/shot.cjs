// Drive the built game in headless Chromium and take screenshots.
const { chromium } = require('playwright');
(async () => {
const [,, saveJson = '{}', outPrefix = 'out/shot', times = '4,9', mode = 'play', ff = '0', until = ''] = process.argv;
const CLIP = process.env.CLIP ? process.env.CLIP.split(',').map(Number) : null;
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const [VW, VH] = (process.env.VIEW || '450x800').split('x').map(Number);
const page = await browser.newPage({ viewport: { width: VW, height: VH }, deviceScaleFactor: +(process.env.DSF || 2) });
const errors = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', (e) => errors.push('PAGEERROR ' + e.message));
await page.addInitScript((s) => {
  window.__HB_LOCK_QUALITY = true;
  const save = JSON.parse(s);
  if (Object.keys(save).length) localStorage.setItem('hordebreak-save-v1', JSON.stringify({ v: 1, level: 1, coins: 0, weapon: 'rifle', infantry: 'recruit', owned: { rifle: true, recruit: true }, upg: { dmg: 0, rate: 0, squad: 0, coin: 0 }, lossStreak: 0, seed: 1, wins: 0, sound: false, seenHelp: true, ...save }));
}, saveJson);
await page.goto('file://' + process.cwd() + '/index.html');
await page.waitForTimeout(1200);
if (mode === 'home') { await page.screenshot({ path: outPrefix + '_home.png' }); }
else if (mode === 'armory') { await page.click('#btn-armory'); await page.waitForTimeout(400); await page.screenshot({ path: outPrefix + '_armory.png' }); }
else {
  await page.click('#btn-start');
  // let the bot steer, as a stand-in for a player
  await page.evaluate((auto) => {
    const hb = window.__hordebreak;
    setInterval(() => { if (hb.state === 'play' && hb.sim) { hb.sim.targetX = hb.botThink(hb.sim); if (auto && hb.sim.charge >= 1) hb.sim.callStrike(); } }, 60);
  }, mode === 'strike');
  // fast-forward the simulation (bot steering) to the moment worth looking at
  await page.evaluate(([ff, until]) => {
    const hb = window.__hordebreak; const s = hb.sim;
    let i = 0;
    const done = () => until === 'hazard' ? s.hazards.some((h) => h.t < 0.9 && h.s - s.p < 14) : until === 'bosshaz' ? s.hazards.some((h) => h.kind === 'slam' && h.t < 0.7) : until === 'charge' ? s.charge >= 1 : until === 'boss' ? s.bossHold : until === 'end' ? false : false;
    while (!s.result && (s.t < ff || (until && !done())) && i < 60 * 200) { if (i++ % 6 === 0) s.targetX = hb.botThink(s); s.step(); s.events.length = 0; }
  }, [+ff, until]);
  let last = 0;
  for (const t of times.split(',').map(Number)) {
    await page.waitForTimeout((t - last) * 1000); last = t;
    await page.screenshot({ path: `${outPrefix}_${t}.png`, ...(CLIP ? { clip: { x: CLIP[0], y: CLIP[1], width: CLIP[2], height: CLIP[3] } } : {}) });
  }
  const info = await page.evaluate(() => { const s = window.__hordebreak.sim; return { t: s.t, count: s.count, lost: s.lost, kills: s.kills, hazards: s.hazards.length, dodged: s.dodged, charge: s.charge, strikes: s.strikes, result: s.result, state: window.__hordebreak.state }; });
  console.log(JSON.stringify(info));
}
console.log('errors:', errors.length ? errors.slice(0, 8) : 'none');
await browser.close();
})();
