// 전투 v4 시험기: 게임 HTML을 Node에서 불러 AI끼리 전투를 돌림 (화면 없음)
// 사용: node tools/battle_sim.js [판수=20] [log]
const fs = require('fs'), vm = require('vm'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'samguk_v105.html'), 'utf8');
const el = () => new Proxy(function () { }, { get: (t, k) => k === Symbol.toPrimitive ? () => '' : (k === 'length' ? 0 : el()), set: () => true, apply: () => el(), construct: () => el() });
const store = {};
const ctx = { console, Math, Date, JSON, setTimeout: () => 0, clearTimeout() { }, setInterval: () => 0, requestAnimationFrame: () => 0, performance: { now: () => Date.now() },
  localStorage: { getItem: k => store[k] ?? null, setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } },
  document: el(), navigator: { userAgent: 'node' }, location: { reload() { } } };
ctx.window = ctx; vm.createContext(ctx);
[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].forEach((m, i) => { try { vm.runInContext(m[1], ctx, { filename: 'block' + i }); } catch (e) { console.log('block', i, e.message); } });
const N = +(process.argv[2] || 20), showLog = process.argv[3] === 'log';
vm.runInContext(`(() => {
  function one(siege, size, show) {
    newGame('조조');
    const us = autoUnits(gensIn('초', '조조'), size, 5);
    const du = autoUnits(gensOf('동탁').filter(g => g.loc === '낙양').slice(0, 6), size, 5);
    V4.start('조조', '초', '진류', us, 4000, 'A', siege ? '농성' : '야전', { dUnits: du });
    V4.simulate(40); const W = V4.W; if (show) console.log(W.log.join(String.fromCharCode(10)));
    return { w: W.over, why: W.why, t: W.turn };
  }
  if (${showLog}) one(true, 12000, true);
  for (const sg of [false, true]) for (const size of [8000, 15000]) {
    const r = []; for (let i = 0; i < ${N}; i++) r.push(one(sg, size)); const why = {}; r.forEach(x => why[x.why] = (why[x.why] || 0) + 1);
    console.log(sg ? '공성' : '야전', size, '공격 승', r.filter(x => x.w === 'A').length + '/' + ${N}, '평균 턴', (r.reduce((s, x) => s + x.t, 0) / ${N}).toFixed(1), JSON.stringify(why));
  }
})();`, ctx);
