// 부장 효과 격리 시험: 주장 능력 동일한 거울 군대에서 A측에만 부장을 붙이고 LV 규칙별 승률 비교
// 사용: node tools/lv_mirror_sim.js [판수=40]
const fs = require('fs'), vm = require('vm'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'samguk_v109.html'), 'utf8');
const el = () => new Proxy(function () { }, { get: (t, k) => k === Symbol.toPrimitive ? () => '' : (k === 'length' ? 0 : el()), set: () => true, apply: () => el(), construct: () => el() });
const store = {};
const ctx = { console, Math, Date, JSON, setTimeout: () => 0, clearTimeout() { }, setInterval: () => 0, requestAnimationFrame: () => 0, performance: { now: () => Date.now() },
  localStorage: { getItem: k => store[k] ?? null, setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } },
  document: el(), navigator: { userAgent: 'node' }, location: { reload() { } } };
ctx.window = ctx; vm.createContext(ctx);
[...html.matchAll(/<script(?: [^>]*)?>([\s\S]*?)<\/script>/g)].forEach((m, i) => { try { vm.runInContext(m[1], ctx, { filename: 'block' + i }); } catch (e) { console.log('block', i, e.message); } });
const N = +(process.argv[2] || 100);
vm.runInContext(`(() => {
  newGame('조조');
  const mkG = (n, o) => { S.gen[n] = Object.assign({}, G('하후돈'), { n, sk: [], inj: 0, away: false, loc: '낙양' }, o); return n; };
  const P = 70;
  ['가1', '가2', '가3', '나1', '나2', '나3'].forEach(n => mkG(n, { t: P, w: P, i: P, p: P, c: P, a: P }));
  mkG('선봉강', { t: 40, w: 90, i: 40, p: 40, c: 40, a: 40 });
  mkG('선봉균', { t: 85, w: 85, i: 85, p: 85, c: 85, a: 85 });
  mkG('참모강', { t: 40, w: 40, i: 90, p: 40, c: 40, a: 40 });
  mkG('참모균', { t: 85, w: 85, i: 85, p: 85, c: 85, a: 85 });
  const subs = { '없음': {}, '선봉(무력만 90)': { vg: '선봉강' }, '선봉(전능력 85)': { vg: '선봉균' }, '참모(지력만 90)': { st: '참모강' }, '참모(전능력 85)': { st: '참모균' }, '선봉강+참모강': { vg: '선봉강', st: '참모강' } };
  const lsum = u => SK_KEYS.reduce((a, k) => a + stat(G(u.gen), k), 0);
  const esum = u => SK_KEYS.reduce((a, k) => a + (['w', 'i', 't'].includes(k) ? uS(u, k) : stat(G(u.gen), k)), 0);
  const rule = { '현행': () => 0, '유효능력 x1': u => (esum(u) - lsum(u)) / 12, '유효능력 x3': u => 3 * (esum(u) - lsum(u)) / 12 };
  function one(sub, rf) {
    newGame('조조'); ['가1', '가2', '가3', '나1', '나2', '나3'].forEach(n => mkG(n, { t: P, w: P, i: P, p: P, c: P, a: P }));
    mkG('선봉강', { t: 40, w: 90, i: 40, p: 40, c: 40, a: 40 }); mkG('선봉균', { t: 85, w: 85, i: 85, p: 85, c: 85, a: 85 }); mkG('참모강', { t: 40, w: 40, i: 90, p: 40, c: 40, a: 40 }); mkG('참모균', { t: 85, w: 85, i: 85, p: 85, c: 85, a: 85 });
    const us = ['가1', '가2', '가3'].map(n => Object.assign({ gen: n, troops: 2666, form: '어린' }, sub));
    const du = ['나1', '나2', '나3'].map(n => ({ gen: n, troops: 2666, form: '어린' }));
    V4.start('조조', '초', '진류', us, 4000, 'A', '야전', { dUnits: du });
    V4.W.units.forEach(u => { if (u.gen) u.lv = Math.round(u.lv + rf(u)); });
    V4.simulate(40); return V4.W.over === 'A' ? 1 : V4.W.over === 'D' ? 0 : 0.5;
  }
  const T = ${N};
  for (const [sn, sub] of Object.entries(subs)) { let line = sn.padEnd(18); for (const [rn, rf] of Object.entries(rule)) { let w = 0; for (let i = 0; i < T; i++) w += one(sub, rf); line += ' | ' + rn + ' ' + w.toFixed(0) + '/' + T; } console.log(line); }
})();`, ctx);
