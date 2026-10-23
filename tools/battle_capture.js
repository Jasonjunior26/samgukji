// 전투 v4 사로잡힘 점검기 (게임 HTML을 Node에서 불러 AI끼리 전투)
// 사용: node tools/battle_capture.js [판수=40]
const fs = require('fs'), vm = require('vm'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'samguk_v109.html'), 'utf8');
const el = () => new Proxy(function () { }, { get: (t, k) => k === Symbol.toPrimitive ? () => '' : (k === 'length' ? 0 : el()), set: () => true, apply: () => el(), construct: () => el() });
const store = {};
const ctx = { console, Math, Date, JSON, setTimeout: () => 0, clearTimeout() { }, setInterval: () => 0, requestAnimationFrame: () => 0, performance: { now: () => Date.now() },
  localStorage: { getItem: k => store[k] ?? null, setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } },
  document: el(), navigator: { userAgent: 'node' }, location: { reload() { } } };
ctx.window = ctx; vm.createContext(ctx);
[...html.matchAll(/<script(?: [^>]*)?>([\s\S]*?)<\/script>/g)].forEach((m, i) => { try { vm.runInContext(m[1], ctx, { filename: 'block' + i }); } catch (e) { console.log('block', i, e.message); } });
// 사로잡힘 점검: 이긴 편 장수가 전투 중 잡혔는데 승패와 무관하게 포로로 남는 경우를 센다 (게임 코드는 읽기만 함)
const N = +(process.argv[2] || 40);
vm.runInContext(`(() => {
  const team = u => u.side === 'D' ? 'D' : 'A';
  let games = 0, hit = 0, winLost = 0, loseGot = 0, ex = null;
  for (const sg of [false, true]) for (let i = 0; i < ${N}; i++) {
    newGame('조조');
    const us = autoUnits(gensIn('초', '조조'), 12000, 5);
    const du = autoUnits(gensOf('동탁').filter(g => g.loc === '낙양').slice(0, 6), 12000, 5);
    V4.start('조조', '초', '진류', us, 4000, 'A', sg ? '농성' : '야전', { dUnits: du });
    V4.simulate(40); const W = V4.W; games++;
    const sideOf = n => { const u = W.units.find(u => [u.gen, u.vg, u.st, u.jg].includes(n)); return u && u.side; };
    // 이긴 편 장수가 상대에게 잡힌 기록 = 이겼는데도 포로가 될 대상
    const bad = W.captured.filter(c => sideOf(c.n) === W.over && c.by !== W.over);
    if (bad.length) { hit++; winLost += bad.length; if (!ex) ex = { over: W.over, why: W.why, bad: bad.map(b => b.n + '←' + b.by) }; }
    loseGot += W.captured.filter(c => sideOf(c.n) !== W.over && c.by === W.over).length;
  }
  console.log('판', games, '/ 이긴 편 장수가 포로 기록된 판', hit, '/ 그런 장수 수', winLost, '/ (정상)진 편 포로', loseGot, JSON.stringify(ex));
})();`, ctx);
