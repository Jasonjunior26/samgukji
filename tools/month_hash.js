// 월 진행 상태 해시: 같은 시드로 N달을 끝낸 뒤 S 상태 해시를 찍는다. 래퍼 정리 전후 비교용(게임 파일은 고치지 않음).
// 사용: node tools/month_hash.js [달수=12] [세력=조조] [--auto] [--game 경로.html] [--dump 파일.json] [--probe a.js,b.js]
//   --probe: 월 진행 대신 탐침 파일(tools/probes/*.js, 마지막 식 값을 JSON 출력)을 같은 vm 에서 실행한다(MSEED 고정).
//   MSEED 환경변수(기본 1)로 Math.random 고정 (battle_sim.js 의 BSEED 와 같은 mulberry32). Date 는 고정 시각으로 바꾼다.
//   한 달 = endMonth() → 대기 방어전(UI.queue)은 버림(regress_check A5 와 같음) → monthlyUpdate().
//   --auto: 플레이어 도시를 모두 맡기기(autoKeep·autoMil)로 둬서 cityAutoRun·endMonth 맡기기 경로까지 돈다.
//   출력: 달마다 "y-m 해시 금합 병력합 장수수" 한 줄, 마지막에 전체 해시. 차이가 나면 --dump 두 개를 diff 한다.
const fs = require('fs'), vm = require('vm'), path = require('path'), crypto = require('crypto');
const A = process.argv.slice(2), opt = (k, d) => { const i = A.indexOf(k); return i >= 0 ? A[i + 1] : d; };
const pos = A.filter((x, i) => !x.startsWith('--') && !(i > 0 && ['--game', '--dump', '--probe'].includes(A[i - 1])));
const N = +(pos[0] || 12), FAC = pos[1] || '조조';
const GAME = path.resolve(opt('--game', path.join(__dirname, '..', 'samguk_v108.html'))), DUMP = opt('--dump', '');
const html = fs.readFileSync(GAME, 'utf8');
const el = () => new Proxy(function () { }, { get: (t, k) => k === Symbol.toPrimitive ? () => '' : (k === 'length' ? 0 : el()), set: () => true, apply: () => el(), construct: () => el() });
const store = {}; const SEED = +(process.env.MSEED ?? 1); let _s = SEED >>> 0;
const rnd = () => { _s = (_s + 0x6D2B79F5) >>> 0; let t = _s; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; };
const SMath = Object.assign(Object.create(Math), { random: rnd });
const T0 = Date.UTC(2026, 0, 1); class FDate extends Date { constructor(...a) { super(...(a.length ? a : [T0])); } static now() { return T0; } }
const ctx = { console: { log() { }, warn() { }, error() { }, info() { } }, Math: SMath, Date: FDate, JSON, setTimeout: () => 0, clearTimeout() { }, setInterval: () => 0, clearInterval() { }, requestAnimationFrame: () => 0, performance: { now: () => 0 },
  localStorage: { getItem: k => store[k] ?? null, setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } },
  document: el(), navigator: { userAgent: 'node' }, location: { reload() { }, search: '', href: '' }, fetch: () => new Promise(() => { }) };
ctx.window = ctx; ctx.addEventListener = ctx.removeEventListener = () => { }; vm.createContext(ctx);
const errs = [];
[...html.matchAll(/<script(?: [^>]*)?>([\s\S]*?)<\/script>/g)].forEach((m, i) => { try { vm.runInContext(m[1], ctx, { filename: 'block' + i }); } catch (e) { errs.push('block' + i + ': ' + e.message); } });
if (errs.length) console.log("로드 에러:", errs.join(" | ").slice(0, 900));
const PROBE = opt('--probe', '');
if (PROBE) { const files = PROBE.split(','); files.forEach(f => { let r; try { r = vm.runInContext(fs.readFileSync(f, 'utf8'), ctx, { filename: f }); } catch (e) { r = 'ERR ' + e.message; } console.log(path.basename(f), JSON.stringify(r)); }); process.exit(0); }
const out = vm.runInContext(`(() => {
  const L = []; let ex = [];
  newGame(${JSON.stringify(FAC)}); if (${A.includes("--auto")}) citiesOf(S.player).forEach(c => { c.autoKeep = true; c.autoMil = true; });
  const h = o => JSON.stringify(o, (k, v) => typeof v === 'number' && !Number.isFinite(v) ? 'NaN:' + v : v);
  for (let i = 0; i < ${N}; i++) {
    try { endMonth(); } catch (e) { ex.push('endMonth ' + S.y + '-' + S.m + ' ' + e.message); }
    try { UI.queue = []; monthlyUpdate(); } catch (e) { ex.push('monthlyUpdate ' + S.y + '-' + S.m + ' ' + e.message); }
    const cs = Object.values(S.city); L.push([S.y + '-' + S.m, h(S), cs.reduce((a, c) => a + (c.gold || 0), 0), cs.reduce((a, c) => a + (c.troops || 0), 0), Object.values(S.gen).filter(g => g.st === '현역').length]);
    if (S.over) break;
  }
  return JSON.stringify({ L, ex, S: ${DUMP ? 'h(S)' : 'null'} });
})()`, ctx);
const R = JSON.parse(out); const H = s => crypto.createHash('sha1').update(s).digest('hex').slice(0, 12);
if (errs.length) console.log('로드 에러:', errs.join(' | ').slice(0, 600));
R.L.forEach(([ym, s, g, t, n]) => console.log(ym, H(s), '금', g, '병력', t, '장수', n));
if (R.ex.length) console.log('예외', R.ex.length, R.ex.slice(0, 5).join(' | ').slice(0, 800));
console.log('전체', H(R.L.map(x => x[1]).join('|')), 'seed', SEED, 'months', R.L.length);
if (DUMP) fs.writeFileSync(DUMP, JSON.stringify(JSON.parse(R.S), null, 1));
