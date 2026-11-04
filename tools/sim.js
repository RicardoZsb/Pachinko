// 无界面批量模拟：随机角度 / 随机力度；拨杆为自动弹射
// 用法：node tools/sim.js [每张图局数=200] [地图=ABC]
const fs = require('fs'), path = require('path');
global.PB = {};
eval(fs.readFileSync(path.join(__dirname, '../src/core.js'), 'utf8'));
const PB = global.PB;

function run(map, n, over) {
  const cfg = JSON.parse(JSON.stringify(PB.DEFAULTS));
  if (over) over(cfg);
  const scores = [], shotDur = [], spawns = [], timeouts = [], flips = [];
  let maxBalls = 0;
  const rnd = PB.mulberry32(123);
  for (let k = 0; k < n; k++) {
    const g = new PB.Game(cfg, map, 1000 + k);
    let guard = 0, shotStart = 0, spawned = 0, to = 0, fl = 0;
    while (g.phase !== 'over' && guard++ < 480 * 200) {
      if (g.phase === 'aim') {
        g.setAim((rnd() * 2 - 1) * PB.AIM_MAX);
        g.fire(rnd());
        shotStart = g.t;
      }
      g.step(1 / 480);
      maxBalls = Math.max(maxBalls, g.balls.length + g.pending.length);
      for (const e of g.events) {
        if (e.type === 'spawn') spawned += e.n;
        if (e.type === 'sfx' && e.name === 'flipAuto') fl++;
        if (e.type === 'shotEnd') { shotDur.push(g.t - shotStart); if (e.timedOut) to++; }
      }
      g.events.length = 0;
    }
    scores.push(g.score); spawns.push(spawned); timeouts.push(to); flips.push(fl);
  }
  scores.sort((a, b) => a - b);
  const pct = p => scores[Math.min(scores.length - 1, Math.floor(p * scores.length))];
  const mean = a => a.reduce((s, v) => s + v, 0) / a.length;
  const tgt = cfg.targets[map];
  return {
    map, n, mean: Math.round(mean(scores)), p10: pct(0.1), p25: pct(0.25), p50: pct(0.5), p75: pct(0.75), p90: pct(0.9),
    target: tgt, passRate: (scores.filter(s => s >= tgt).length / n * 100).toFixed(1) + '%',
    shotSec: mean(shotDur).toFixed(1), timeout: (mean(timeouts) / cfg.shots * 100).toFixed(0) + '%',
    newBalls: mean(spawns).toFixed(1), flips: mean(flips).toFixed(1), maxBalls
  };
}
module.exports = { run, PB };
if (require.main === module) {
  const N = +(process.argv[2] || 200), maps = (process.argv[3] || 'ABC').split('');
  console.table(maps.map(m => run(m, N)));
}
