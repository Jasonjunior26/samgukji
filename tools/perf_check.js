// citiesOf 캐시 점검기 (v107 성능 수정): 캐시 결과가 원래 식(전체 도시 훑기)과 항상 같은지, 저장 JSON이 그대로인지 본다.
// 사용: node tools/perf_check.js  → FAIL 0 이어야 한다.
const fs = require('fs'), vm = require('vm'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'samguk_v108.html'), 'utf8');
const el = () => new Proxy(function () { }, { get: (t, k) => k === Symbol.toPrimitive ? () => '' : (k === 'length' ? 0 : el()), set: () => true, apply: () => el(), construct: () => el() });
const store = {};
const ctx = { console: { log() { }, error() { }, warn() { }, info() { } }, Math, Date, JSON, setTimeout: () => 0, clearTimeout() { }, setInterval: () => 0, requestAnimationFrame: () => 0, performance: { now: () => Date.now() },
  localStorage: { getItem: k => store[k] ?? null, setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } },
  document: el(), navigator: { userAgent: 'node' }, location: { reload() { } } };
ctx.window = ctx; vm.createContext(ctx);
[...html.matchAll(/<script(?: [^>]*)?>([\s\S]*?)<\/script>/g)].forEach(m => { try { vm.runInContext(m[1], ctx); } catch (e) { } });
ctx.PRINT = (...a) => console.log(...a);
vm.runInContext(`(() => {
  let fail = 0, n = 0; const ok = (c, m) => { n++; if (!c) { fail++; PRINT('FAIL', m); } };
  const ref = f => Object.values(S.city).filter(c => c.owner === f).map(c => c.n).join(',');
  const same = tag => Object.keys(S.fac).concat([null, undefined, '없는세력']).forEach(f => ok(citiesOf(f).map(c => c.n).join(',') === ref(f), tag + ' ' + f));
  newGame('유비', { rand: false, custom: false, scen: '190', diff: 1 });
  const j0 = JSON.stringify(S); citiesOf(S.player); ok(JSON.stringify(S) === j0, '설치 뒤 저장 JSON 동일');
  ok(!Object.keys(S.city[Object.keys(S.city)[0]]).some(k => k.startsWith('_')), '보이는 새 키 없음');
  same('시작');
  const ids = Object.keys(S.fac), cs = Object.values(S.city);
  for (let i = 0; i < 300; i++) { const c = cs[(i * 37) % cs.length]; c.owner = i % 7 === 0 ? null : ids[(i * 13) % ids.length]; if (i % 25 === 0) same('변경 ' + i); }
  same('변경 뒤');
  const a = citiesOf(S.player); a.sort((x, y) => (x.n < y.n ? 1 : -1)); a.push({ n: '가짜' }); same('반환 배열을 바꿔도 캐시 영향 없음');
  const j1 = JSON.stringify(S); S = JSON.parse(j1); same('불러오기 뒤'); ok(JSON.stringify(S) === j1, '불러오기 왕복 JSON 동일');
  const c0 = Object.values(S.city)[0]; const was = c0.owner; c0.owner = '없는세력'; same('불러오기 뒤 변경'); c0.owner = was;
  newGame('조조', { rand: true, custom: false, scen: '200', diff: 1 }); same('새 게임(200)');
  for (let i = 0; i < 6; i++) { try { endMonth(); monthlyUpdate && 0; } catch (e) { } } same('6개월 진행 뒤');
  PRINT('검사 ' + n + '건 · FAIL ' + fail);
})();`, ctx);
