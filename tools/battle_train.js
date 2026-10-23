// 전투 v4 훈련도 시험기: 게임 HTML을 Node에서 불러 훈련도 조합별로 AI끼리 공성·야전을 돌림 (화면 없음)
// 사용: node tools/battle_train.js [판수=100] [공격 병력=12000] [수비 병력=공격과 같음]
// v4.10(v107)부터 훈련도 계수가 게임 코드(dmgJ) 안에 있으므로 패치 없이 실제 코드로 잰다.
// (v105 때는 두 번째 인수로 하한 LO를 받아 메모리에서 dmgJ를 패치했다 — 이제 인수는 병력으로 바뀜)
const fs = require('fs'), vm = require('vm'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'samguk_v109.html'), 'utf8');
const el = () => new Proxy(function () { }, { get: (t, k) => k === Symbol.toPrimitive ? () => '' : (k === 'length' ? 0 : el()), set: () => true, apply: () => el(), construct: () => el() });
const store = {};
const ctx = { console, Math, Date, JSON, setTimeout: () => 0, clearTimeout() { }, setInterval: () => 0, requestAnimationFrame: () => 0, performance: { now: () => Date.now() },
  localStorage: { getItem: k => store[k] ?? null, setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } },
  document: el(), navigator: { userAgent: 'node' }, location: { reload() { } } };
ctx.window = ctx; vm.createContext(ctx);
[...html.matchAll(/<script(?: [^>]*)?>([\s\S]*?)<\/script>/g)].forEach((m, i) => { try { vm.runInContext(m[1], ctx, { filename: 'block' + i }); } catch (e) { console.log('block', i, e.message); } });
const N = +(process.argv[2] || 100), SIZE = +(process.argv[3] || 12000), DSIZE = +(process.argv[4] || SIZE);
vm.runInContext(`(() => {
  function one(siege, size, ta, td) {
    newGame('조조'); C('초').train = ta; C('진류').train = td;
    const us = autoUnits(gensIn('초', '조조'), size, 5);
    const du = autoUnits(gensOf('동탁').filter(g => g.loc === '낙양').slice(0, 6), ${DSIZE}, 5);
    V4.start('조조', '초', '진류', us, 4000, 'A', siege ? '농성' : '야전', { dUnits: du });
    V4.simulate(40); const W = V4.W; return [W.over === 'A' ? 1 : 0, W.turn];
  }
  for (const sg of [false, true]) for (const [ta, td] of [[70,70],[100,40],[40,100],[100,100],[40,40]]) {
    let w = 0, t = 0; for (let i = 0; i < ${N}; i++) { const r = one(sg, ${SIZE}, ta, td); w += r[0]; t += r[1]; }
    console.log(sg ? '공성' : '야전', '공격훈련', ta, '수비훈련', td, '공격 승', w + '/' + ${N}, '평균 턴', (t / ${N}).toFixed(1));
  }
})();`, ctx);
