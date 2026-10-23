// 부장 역할별 LV 변형 비교 (선봉=무력, 참모=지력 등 유효능력치만 LV에 반영)
// 사용: node tools/lv_role_sim.js [판수=40]
const fs = require('fs'), vm = require('vm'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'samguk_v109.html'), 'utf8');
const el = () => new Proxy(function () { }, { get: (t, k) => k === Symbol.toPrimitive ? () => '' : (k === 'length' ? 0 : el()), set: () => true, apply: () => el(), construct: () => el() });
const store = {};
const ctx = { console, Math, Date, JSON, setTimeout: () => 0, clearTimeout() { }, setInterval: () => 0, requestAnimationFrame: () => 0, performance: { now: () => Date.now() },
  localStorage: { getItem: k => store[k] ?? null, setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } },
  document: el(), navigator: { userAgent: 'node' }, location: { reload() { } } };
ctx.window = ctx; vm.createContext(ctx);
[...html.matchAll(/<script(?: [^>]*)?>([\s\S]*?)<\/script>/g)].forEach((m, i) => { try { vm.runInContext(m[1], ctx, { filename: 'block' + i }); } catch (e) { console.log('block', i, e.message); } });
const N = +(process.argv[2] || 40);
vm.runInContext(`(() => {
  const Lsum = u => SK_KEYS.reduce((a, k) => a + stat(G(u.gen), k), 0);
  const Esum = u => SK_KEYS.reduce((a, k) => a + (['w', 'i', 't'].includes(k) ? uS(u, k) : stat(G(u.gen), k)), 0);
  const mk = m => u => { if (!u.gen) return u.lv; const L = Lsum(u), s2 = L + m * (Esum(u) - L); return u.lv + (Math.round(s2 / 12 + 5) - Math.round(L / 12 + 5)); };
  const V = {
    '현행': u => u.lv,
    '유효능력 x1': mk(1),
    '유효능력 x2': mk(2),
    '유효능력 x3': mk(3),
    '현행·부장 제거': u => { u.vg = u.st = u.jg = null; return u.lv; },
    '유효x2·부장 제거': u => { u.vg = u.st = u.jg = null; return u.lv; },
  };
  function one(siege, size, f) {
    newGame('조조');
    const us = autoUnits(gensIn('초', '조조'), size, 5);
    const du = autoUnits(gensOf('동탁').filter(g => g.loc === '낙양').slice(0, 6), size, 5);
    V4.start('조조', '초', '진류', us, 4000, 'A', siege ? '농성' : '야전', { dUnits: du });
    V4.W.units.forEach(u => { u.lv = f(u); });
    V4.simulate(40); return { w: V4.W.over, t: V4.W.turn };
  }
  for (const [name, f] of Object.entries(V)) {
    if (name === '유효x2·부장 제거') continue;
    newGame('조조'); const us = autoUnits(gensIn('초', '조조'), 8000, 5), du = autoUnits(gensOf('동탁').filter(g => g.loc === '낙양').slice(0, 6), 8000, 5);
    V4.start('조조', '초', '진류', us, 4000, 'A', '야전', { dUnits: du });
    const lv = s => V4.W.units.filter(u => u.side === s).map(u => f(u)).join('/');
    console.log(name.padEnd(18), 'LV 공격', lv('A'), '수비', lv('D'));
  }
  for (const [name, f] of Object.entries(V)) { if (name === '유효x2·부장 제거') continue; for (const sg of [false, true]) for (const size of [8000, 15000]) {
    const r = []; for (let i = 0; i < ${N}; i++) r.push(one(sg, size, f));
    console.log(name.padEnd(18), sg ? '공성' : '야전', size, '공격 승', r.filter(x => x.w === 'A').length + '/' + ${N}, '평균 턴', (r.reduce((s, x) => s + x.t, 0) / ${N}).toFixed(1));
  } }
})();`, ctx);
