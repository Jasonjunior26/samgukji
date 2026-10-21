// 부장 반영 LV 변형 비교 (V4.start 직후 부대 LV 재계산)
// 사용: node tools/lv_sub_sim.js [판수=40]
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
  const sum = n => SK_KEYS.reduce((a, k) => a + stat(G(n), k), 0);
  const subsOf = u => [u.vg, u.st, u.jg].filter(Boolean);
  const mk = fn => u => { if (!u.gen) return u.lv; const L = sum(u.gen), sb = subsOf(u).map(sum); const base = Math.round(L / 12 + 5); const s2 = sb.length ? fn(L, sb) : L; return u.lv + (Math.round(Math.min(s2, 600) / 12 + 5) - base); };
  const V = {
    '현행': u => u.lv,
    '부장 평균 30% 혼합': mk((L, sb) => 0.7 * L + 0.3 * sb.reduce((a, b) => a + b, 0) / sb.length),
    '부장 평균 50% 혼합': mk((L, sb) => 0.5 * L + 0.5 * sb.reduce((a, b) => a + b, 0) / sb.length),
    '부장 합 15% 가산': mk((L, sb) => L + 0.15 * sb.reduce((a, b) => a + b, 0)),
    '현행·부장 제거': u => { u.vg = u.st = u.jg = null; return u.lv; },
    '혼합30%·부장 제거': u => { const v = V['부장 평균 30% 혼합'](u); u.vg = u.st = u.jg = null; return v; },
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
    newGame('조조'); const us = autoUnits(gensIn('초', '조조'), 8000, 5), du = autoUnits(gensOf('동탁').filter(g => g.loc === '낙양').slice(0, 6), 8000, 5);
    V4.start('조조', '초', '진류', us, 4000, 'A', '야전', { dUnits: du });
    const lv = s => V4.W.units.filter(u => u.side === s).map(u => f(u)).join('/');
    console.log(name.padEnd(18), 'LV 공격', lv('A'), '수비', lv('D'));
  }
  for (const [name, f] of Object.entries(V)) for (const sg of [false, true]) for (const size of [8000, 15000]) {
    const r = []; for (let i = 0; i < ${N}; i++) r.push(one(sg, size, f));
    console.log(name.padEnd(18), sg ? '공성' : '야전', size, '공격 승', r.filter(x => x.w === 'A').length + '/' + ${N}, '평균 턴', (r.reduce((s, x) => s + x.t, 0) / ${N}).toFixed(1));
  }
})();`, ctx);
