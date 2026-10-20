// 전투 v4 시험기: 게임 HTML을 Node에서 불러 AI끼리 전투를 돌림 (화면 없음)
// 사용: node tools/battle_sim.js [판수=20] [log]
const fs = require('fs'), vm = require('vm'), path = require('path');
let html = fs.readFileSync(path.join(__dirname, '..', 'samguk_v107.html'), 'utf8');
// 메모리에서만 패치(파일은 그대로): 훈련도 위력 계수 k = LO + (1-LO)*훈련/100 를 dmgJ 끝에 곱함
const RE = /(if \(counter\) dmg = Math\.max\(Math\.floor\(dmg \* 3 \/ 4\), 1\);)(\s*return dmg;)/;
if (!RE.test(html)) throw new Error('patch anchor not found');
html = html.replace(RE, (m, a, b) => a + " if (globalThis.TRLO < 1) { const tr = (team(a) === 'A' ? C(W.from) : C(W.to)).train; dmg = Math.max(1, Math.round(dmg * (globalThis.TRLO + (1 - globalThis.TRLO) * Math.min(100, tr) / 100))); }" + b);
const el = () => new Proxy(function () { }, { get: (t, k) => k === Symbol.toPrimitive ? () => '' : (k === 'length' ? 0 : el()), set: () => true, apply: () => el(), construct: () => el() });
const store = {};
const ctx = { console, Math, Date, JSON, setTimeout: () => 0, clearTimeout() { }, setInterval: () => 0, requestAnimationFrame: () => 0, performance: { now: () => Date.now() },
  localStorage: { getItem: k => store[k] ?? null, setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } },
  document: el(), navigator: { userAgent: 'node' }, location: { reload() { } } };
ctx.window = ctx; vm.createContext(ctx);
[...html.matchAll(/<script(?: [^>]*)?>([\s\S]*?)<\/script>/g)].forEach((m, i) => { try { vm.runInContext(m[1], ctx, { filename: 'block' + i }); } catch (e) { console.log('block', i, e.message); } });
const N = +(process.argv[2] || 100); ctx.TRLO = +(process.argv[3] || 1);
vm.runInContext(`(() => {
  function one(siege, size, ta, td) {
    newGame('조조'); C('초').train = ta; C('진류').train = td;
    const us = autoUnits(gensIn('초', '조조'), size, 5);
    const du = autoUnits(gensOf('동탁').filter(g => g.loc === '낙양').slice(0, 6), size, 5);
    V4.start('조조', '초', '진류', us, 4000, 'A', siege ? '농성' : '야전', { dUnits: du });
    V4.simulate(40); const W = V4.W; return W.over === 'A' ? 1 : 0;
  }
  for (const sg of [false, true]) for (const [ta, td] of [[70,70],[100,40],[40,100],[100,100],[40,40]]) {
    let w = 0; for (let i = 0; i < ${N}; i++) w += one(sg, 12000, ta, td);
    console.log(sg ? '공성' : '야전', '공격훈련', ta, '수비훈련', td, '공격 승', w + '/' + ${N});
  }
})();`, ctx);
