// LV 영향 시험기: V4.start 직후 부대 LV을 변형해 승률 비교 (게임 코드는 안 건드림)
// 사용: node tools/lv_sim.js [판수=40]
const fs = require('fs'), vm = require('vm'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'samguk_v108.html'), 'utf8');
const el = () => new Proxy(function () { }, { get: (t, k) => k === Symbol.toPrimitive ? () => '' : (k === 'length' ? 0 : el()), set: () => true, apply: () => el(), construct: () => el() });
const store = {};
const ctx = { console, Math, Date, JSON, setTimeout: () => 0, clearTimeout() { }, setInterval: () => 0, requestAnimationFrame: () => 0, performance: { now: () => Date.now() },
  localStorage: { getItem: k => store[k] ?? null, setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } },
  document: el(), navigator: { userAgent: 'node' }, location: { reload() { } } };
ctx.window = ctx; vm.createContext(ctx);
[...html.matchAll(/<script(?: [^>]*)?>([\s\S]*?)<\/script>/g)].forEach((m, i) => { try { vm.runInContext(m[1], ctx, { filename: 'block' + i }); } catch (e) { console.log('block', i, e.message); } });
const N = +(process.argv[2] || 40);
vm.runInContext(`(() => {
  const V = {
    '현행': l => l,
    'LV 고정30': l => 30,
    'LV 압축 x0.5': l => Math.round(30 + (l - 30) * 0.5),
    'LV 피해 x0.6': l => Math.round(l * 0.6),
    '병졸 LV 12→22': l => l === 12 ? 22 : l,
  };
  function one(siege, size, f) {
    newGame('조조');
    const us = autoUnits(gensIn('초', '조조'), size, 5);
    const du = autoUnits(gensOf('동탁').filter(g => g.loc === '낙양').slice(0, 6), size, 5);
    V4.start('조조', '초', '진류', us, 4000, 'A', siege ? '농성' : '야전', { dUnits: du });
    V4.W.units.forEach(u => { u.lv = f(u.lv); });
    V4.simulate(40); const W = V4.W;
    return { w: W.over, t: W.turn, lvs: W.units.map(u => u.lv) };
  }
  const lvInfo = {};
  for (const [name, f] of Object.entries(V)) for (const sg of [false, true]) for (const size of [8000, 15000]) {
    const r = []; for (let i = 0; i < ${N}; i++) r.push(one(sg, size, f));
    console.log(name.padEnd(14), sg ? '공성' : '야전', size, '공격 승', r.filter(x => x.w === 'A').length + '/' + ${N}, '평균 턴', (r.reduce((s, x) => s + x.t, 0) / ${N}).toFixed(1));
  }
  newGame('조조'); const us = autoUnits(gensIn('초', '조조'), 8000, 5), du = autoUnits(gensOf('동탁').filter(g => g.loc === '낙양').slice(0, 6), 8000, 5);
  V4.start('조조', '초', '진류', us, 4000, 'A', '야전', { dUnits: du });
  console.log('현행 LV 공격측', V4.W.units.filter(u => u.side === 'A').map(u => u.gen + ':' + u.lv).join(' '));
  console.log('현행 LV 수비측', V4.W.units.filter(u => u.side === 'D').map(u => u.gen + ':' + u.lv).join(' '));
})();`, ctx);
