// 세이브 탐침: 세이브 JSON을 게임 코드에 불러 세력별 전선/내륙 도시의 훈련·병력, 군주 성향·국책을 출력 (게임 코드는 안 건드림)
// 사용: node tools/save_probe.js <세이브.json>
const fs = require('fs'), vm = require('vm'), path = require('path');
const file = process.argv[2]; if (!file) { console.log('사용: node tools/save_probe.js <세이브.json>'); process.exit(1); }
const html = fs.readFileSync(path.join(__dirname, '..', 'samguk_v108.html'), 'utf8');
const el = () => new Proxy(function () { }, { get: (t, k) => k === Symbol.toPrimitive ? () => '' : (k === 'length' ? 0 : el()), set: () => true, apply: () => el(), construct: () => el() });
const store = {};
const ctx = { console: { log() { }, error() { }, warn() { }, info() { } }, Math, Date, JSON, setTimeout: () => 0, clearTimeout() { }, setInterval: () => 0, requestAnimationFrame: () => 0, performance: { now: () => Date.now() },
  localStorage: { getItem: k => store[k] ?? null, setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } },
  document: el(), navigator: { userAgent: 'node' }, location: { reload() { } } };
ctx.window = ctx; vm.createContext(ctx);
[...html.matchAll(/<script(?: [^>]*)?>([\s\S]*?)<\/script>/g)].forEach((m, i) => { try { vm.runInContext(m[1], ctx, { filename: 'block' + i }); } catch (e) { } });
ctx.SAVE = fs.readFileSync(file, 'utf8');
vm.runInContext(`(() => {
  S = JSON.parse(SAVE);
  const out = [];
  const mean = a => a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0;
  Object.values(S.fac).filter(F => F.alive).forEach(F => {
    const cs = citiesOf(F.id).filter(c => kindOf(c.n) === '도시');
    const fr = cs.filter(c => isFront(c.n, F.id)), inn = cs.filter(c => !isFront(c.n, F.id));
    const tr = a => a.reduce((s, c) => s + c.troops, 0);
    out.push({ f: F.id, ax: facAx(F.id), pol: (F.pol || []).join('+'), 전선도시: fr.length, 내륙도시: inn.length, 전선훈련: Math.round(mean(fr.map(c => c.train))), 내륙훈련: Math.round(mean(inn.map(c => c.train))), 전선병력: tr(fr), 내륙병력: tr(inn), 내륙병력비: tr(fr) + tr(inn) ? Math.round(100 * tr(inn) / (tr(fr) + tr(inn))) : 0 });
  });
  globalThis.RES = out;
})();`, ctx);
console.log('세력      성향  국책              전선도시/내륙  훈련(전선/내륙)  내륙병력 비중');
ctx.RES.sort((a, b) => (b.전선도시 + b.내륙도시) - (a.전선도시 + a.내륙도시)).forEach(r => console.log(r.f.padEnd(6, ' '), String(r.ax).padStart(5), (r.pol || '-').padEnd(16, ' '), String(r.전선도시).padStart(4), '/', String(r.내륙도시).padStart(3), '       ', String(r.전선훈련).padStart(3), '/', String(r.내륙훈련).padStart(3), '       ', r.내륙병력비 + '%'));
