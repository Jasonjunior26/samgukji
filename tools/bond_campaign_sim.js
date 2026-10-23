// 연속 출전 시험: 플레이어가 같은 장수들을 계속 출전시킬 때 인연·공적이 몇 번째 전투에서 어디까지 오르는지 잰다.
// 사용: node tools/bond_campaign_sim.js [전투수=40] [부대원수=3] [시드=1] [사교가=0|1]
const fs = require('fs'), vm = require('vm'), path = require('path');
const N = +(process.argv[2] || 40), K = +(process.argv[3] || 3), SEED = +(process.argv[4] || 1), SOC = +(process.argv[5] || 0);
const html = fs.readFileSync(path.join(__dirname, '..', 'samguk_v109.html'), 'utf8');
const el = () => new Proxy(function () { }, { get: (t, k) => k === Symbol.toPrimitive ? () => '' : (k === 'length' ? 0 : el()), set: () => true, apply: () => el(), construct: () => el() });
const store = {};
let seed = SEED >>> 0; const rnd = () => { seed = (seed + 0x6D2B79F5) >>> 0; let t = seed; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const M = Object.create(Math); M.random = rnd;
const ctx = { console: { log() { }, error() { }, warn() { }, info() { } }, Math: M, Date, JSON, setTimeout: () => 0, clearTimeout() { }, setInterval: () => 0, requestAnimationFrame: () => 0, performance: { now: () => Date.now() },
  localStorage: { getItem: k => store[k] ?? null, setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } },
  document: el(), navigator: { userAgent: 'node' }, location: { reload() { } } };
ctx.window = ctx; vm.createContext(ctx);
[...html.matchAll(/<script(?: [^>]*)?>([\s\S]*?)<\/script>/g)].forEach((m, i) => { try { vm.runInContext(m[1], ctx, { filename: 'block' + i }); } catch (e) { } });
const OVL = require('./bm_overlay'); const OVP = OVL.fromEnv(); OVL.install(ctx, OVP);
ctx.PR = { N, K, SOC, DEF: +(process.env.DEF || 5) }; ctx.ENEMY = +(process.env.ENEMY || 5000); ctx.PRINT = (...a) => console.log(...a);
vm.runInContext(`(() => {
  newGame('조조');
  const home = '초'; const names = gensIn(home, '조조').filter(g => !isRuler(g)).sort((a, b) => (b.t + b.w + b.i) - (a.t + a.w + a.i)).slice(0, PR.K).map(g => g.n);
  if (PR.SOC) G(names[0]).tr = (G(names[0]).tr || []).concat(['사교가']);
  const pairs = []; for (let i = 0; i < names.length; i++) for (let j = i + 1; j < names.length; j++) pairs.push([names[i], names[j]]);
  PRINT('부대원', names.join(','), '사교가', PR.SOC);
  const dg = Object.values(S.gen).filter(g => g.fac === '동탁' && g.loc === '낙양').sort((a, b) => (b.t + b.w) - (a.t + a.w)).slice(0, PR.DEF).map(g => g.n);
  const first = {}; const rows = [];
  for (let n = 1; n <= PR.N; n++) {
    // 매번 같은 조건: 부대원 되살리고 병력 채우고, 적 도시 복구
    names.forEach(x => { const g = G(x); g.st = '현역'; g.fac = '조조'; g.loc = home; g.inj = 0; g.away = null; });
    C(home).troops = 20000; C(home).owner = '조조'; C('진류').owner = '동탁'; C('진류').troops = ENEMY; C('진류').loy = 60;
    gensOf('동탁').concat(Object.values(S.gen).filter(g => g.fac === '동탁' || g.capFrom === '동탁')).slice(0, 0); dg.forEach(x => { const g = G(x); g.st = '현역'; g.fac = '동탁'; g.loc = '진류'; g.inj = 0; g.away = null; });
    const us = autoUnits(names.map(x => G(x)), 9000, 5);
    let res = null; try { res = v4AutoBattle('조조', home, '진류', us); } catch (e) { PRINT('err', e.message); }
    const win = !!(res && res.win);
    const st = pairs.map(([a, b]) => bget(a, b)); const mer = names.map(x => G(x).merit || 0);
    pairs.forEach(([a, b], i) => { const e = S.bond[bkey(a, b)]; [30, 60, 100].forEach(th => { const k = th + ':' + i; if (st[i] >= th && first[k] === undefined) first[k] = n; }); });
    rows.push({ n, win, st, mer, tags: pairs.map(([a, b]) => (S.bond[bkey(a, b)] || { t: [] }).t.join('/')) });
  }
  rows.forEach(r => { if (r.n <= 5 || r.n % 5 === 0) PRINT('전투', r.n, r.win ? '승' : '패', '인연', r.st.join(','), '공적', r.mer.join(','), r.tags.join(' | ')); });
  PRINT('인연 30/60/100 도달 전투 수(쌍별):', JSON.stringify(first));
  const w = rows.filter(r => r.win).length; PRINT('승률', w + '/' + rows.length);
  // 관직 문턱 도달 전투 수 (공적 기준)
  const th = { '5품(10)': 10, '3품(30)': 30, '2품(80)': 80, '1품(150)': 150 };
  Object.entries(th).forEach(([k, v]) => { const r = rows.find(x => Math.max(...x.mer) >= v); const r2 = rows.find(x => Math.min(...x.mer) >= v); PRINT(k, '최대공적자 도달', r ? r.n : '미도달', '전원 도달', r2 ? r2.n : '미도달'); });
})();`, ctx);

if (process.env.DBGOUT) console.log(JSON.stringify((ctx.DBG||[]).slice(0,4)));
