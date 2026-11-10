// Headless balance run: a player who wins and spends sensibly, levels 1..N.
import fs from 'fs';
const __m = {};
for (const name of ['src/data.js','src/rng.js','src/sim.js','src/levelgen.js','src/bot.js']) {
  __m[name] = new Function('__m', fs.readFileSync(name,'utf8'))(__m);
}
const D = __m['src/data.js'], B = __m['src/bot.js'], S = __m['src/sim.js'];
const N = +(process.argv[2]||30);
const save = D.newSave();
const rows=[];
let t0=Date.now();
for (let n=1;n<=N;n++){
  save.level=n;
  D.autoSpend(save);
  const lo=D.loadoutOf(save);
  const t=Date.now();
  const plan=B.planLevel(n, save.seed, lo, {wall:D.canUpgrade(save)});
  const ms=Date.now()-t;
  // "human-ish" run: full damage, faster hands
  const run=B.botPlay(plan.level, lo, {handicap:1, maxStrafe:14, thinkEvery:4});
  // a sloppy player: reacts every 0.4s, slow hands, never calls a strike
  const slop=B.botPlay(plan.level, lo, {handicap:0.95, maxStrafe:7, thinkEvery:24});
  const coins=S.coinsEarned(run, lo.coinMul);
  rows.push({n, mercy:plan.mercy, ok:plan.verified, botLeft:plan.botLeft, res:run.result, left:run.count, lost:run.lost, dodged:run.dodged, slop:slop.result==='win'?'win':'L'+Math.round(slop.progress*100), slopLost:slop.lost, slopLeft:slop.count, spit:plan.level.spawns.filter(x=>x.type==='spitter').length, t:+run.t.toFixed(0), planMs:ms, w:save.weapon});
  if (run.result==='win'){ save.coins+=coins; save.seed=(save.seed*31+17)%99991; }
  else { save.coins+=coins; n--; save.lossStreak=(save.lossStreak||0)+1; if(save.lossStreak>6){n++;save.lossStreak=0;} continue; }
}
console.table(rows);
console.log('total ms', Date.now()-t0);
