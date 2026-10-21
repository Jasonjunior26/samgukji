// 뿌리 시험기 (v107 S5): 게임 자체 코드로 플레이어 세력(조조)의 뿌리를 4개로 고정해 돌리고, 도시 수·멸망률·자기 방법 성 비율(c.took 원인 태그)·장치 건수를 잰다.
// 플레이어 포함 전 세력을 AI로 돌린다(v4Battle=false, 옛 autoBattle). AI 세력의 뿌리는 게임 규칙(지정표→자동)대로이며 같은 뿌리의 AI 세력도 표본에 넣는다.
// 사용: node tools/root_sim.js [개월=120] [시드=1,2,3] [시나리오=190] [플레이어=조조] [뿌리=전부, 쉼표로 여럿 예: 덕화]
//      출력은 docs/sim/v107_s5_root.txt 에 저장해 head/grep 으로 본다.
const fs = require('fs'), vm = require('vm'), path = require('path');
const MONTHS = +(process.argv[2] || 120), SEEDS = String(process.argv[3] || '1,2,3').split(',').map(Number), SCEN = process.argv[4] || '190', PLAYER = process.argv[5] || '조조', ONLY = process.argv[6] || '';
const html = fs.readFileSync(path.join(__dirname, '..', 'samguk_v108.html'), 'utf8');
const el = () => new Proxy(function () { }, { get: (t, k) => k === Symbol.toPrimitive ? () => '' : (k === 'length' ? 0 : el()), set: () => true, apply: () => el(), construct: () => el() });
const store = {};
let seed = 1; const rnd = () => { seed = (seed + 0x6D2B79F5) >>> 0; let t = seed; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const M = Object.create(Math); M.random = rnd;
const ctx = { console: { log() { }, error() { }, warn() { }, info() { } }, Math: M, Date, JSON, setTimeout: () => 0, clearTimeout() { }, setInterval: () => 0, requestAnimationFrame: () => 0, performance: { now: () => Date.now() },
  localStorage: { getItem: k => store[k] ?? null, setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } },
  document: el(), navigator: { userAgent: 'node' }, location: { reload() { } } };
ctx.window = ctx; vm.createContext(ctx);
[...html.matchAll(/<script(?: [^>]*)?>([\s\S]*?)<\/script>/g)].forEach((m, i) => { try { vm.runInContext(m[1], ctx, { filename: 'block' + i }); } catch (e) { } });
ctx.SETSEED = s => { seed = s >>> 0; }; ctx.PRINT = (...a) => console.log(...a); ctx.MONTHS = MONTHS; ctx.SEEDS = SEEDS; ctx.SCEN = SCEN; ctx.PLAYER = PLAYER; ctx.ONLY = ONLY; ctx.HASH = !!process.env.RSHASH;

vm.runInContext(`(() => {
  const ROOTS = ['경륜', '강병', '상략', '덕화'];
  const OWNM = { 강병: ['전투'], 경륜: ['귀순'], 상략: ['매수', '매입', '할양', '항복'], 덕화: ['투항'] };
  const isCity = c => kindOf(c.n) === '도시';
  const DV = {}; const bump = k => { DV[k] = (DV[k] || 0) + 1; };
  // 장치 건수 계측(결과를 바꾸지 않음)
  { const f = cmdIdan; cmdIdan = function () { const r = f.apply(this, arguments); if (r && r.msg && /통했다/.test(r.msg)) bump('이간성공'); if (r && r.msg && /들통|통했다/.test(r.msg)) bump('이간시도'); return r; }; }
  { const f = cmdSway; cmdSway = function () { const r = f.apply(this, arguments); if (r && r.ok) bump('설득'); return r; }; }
  { const f = guisunExec; guisunExec = function () { bump('귀순'); return f.apply(this, arguments); }; }
  { const f = cmdMerc; cmdMerc = function (cn) { const c = C(cn); const r = f.apply(this, arguments); if (r && r.ok) bump(rootOf(c.owner) === '상략' ? '용병(상략)' : '용병(기타)'); return r; }; }
  { const f = cmdScheme; cmdScheme = function (cn, an, type) { const r = f.apply(this, arguments); if (type === '매수') { bump('매수시도'); if (r && r.ok) bump('매수성공'); } return r; }; }
  const month = () => { const pend = endMonth(); pend.forEach(d => { try { const r = autoBattle(d.att, d.from, d.to, d.units); if (r.win) C(d.to).food += d.food; else C(d.from).food += d.food; } catch (e) { } }); monthlyUpdate(); };
  const rows = []; const T0 = Date.now(); const VOLS = [];
  const RUN = ONLY ? ROOTS.filter(r => ONLY.split(',').includes(r)) : ROOTS; // 플레이어 뿌리 필터(전 세력 합산은 그대로 ROOTS 기준)
  for (const root of RUN) for (const sd of SEEDS) {
    SETSEED(sd); Object.keys(DV).forEach(k => delete DV[k]);
    newGame(PLAYER, { rand: true, custom: false, scen: SCEN, diff: 1 }); S.opt.v4Battle = false;
    S.fac[S.player].root = root;
    const start = {}; Object.keys(S.fac).forEach(f => { if (S.fac[f].alive) start[f] = { c: citiesOf(f).filter(isCity).length, root: S.fac[f].root }; });
    const nCity = Object.values(S.city).filter(isCity).length; const dead = {}; let err = 0;
    const t0 = Date.now();
    for (let i = 0; i < MONTHS; i++) {
      try { if (S.fac[S.player].alive) { if (!S.fac[S.player].pol || S.m === 1) aiPickPolicy(S.player); aiTurn(S.player); } month(); } catch (e) { err++; }
      Object.keys(start).forEach(f => { if (dead[f] === undefined && !citiesOf(f).length) dead[f] = i + 1; });
      if (S.over === 'lose' || S.over === 'win') S.over = null;
    }
    const line = [];
    Object.keys(start).forEach(f => { const st = (S.rootStat || {})[f] || {}; const rt = start[f].root; const own = rt ? OWNM[rt].reduce((u, k) => u + (st[k] || 0), 0) : 0; const all = Object.entries(st).reduce((u, [k, v]) => u + (k === '빈 땅' ? 0 : v), 0);
      rows.push({ root, sd, f, rt, player: f === S.player, c0: start[f].c, c1: citiesOf(f).filter(isCity).length, dead: dead[f] || 0, own, all, st }); });
    const p = rows.filter(r => r.root === root && r.sd === sd && r.player)[0];
    PRINT('[' + root + ' s' + sd + '] 플레이어 도시 ' + p.c0 + '→' + p.c1 + (p.dead ? ' 멸망 ' + p.dead + '개월' : '') + ' 자기방법 ' + p.own + '/' + p.all + ' 태그 ' + JSON.stringify(p.st) + ' | 장치 ' + JSON.stringify(DV) + ' | 오류 ' + err + ' | 의용병 ' + JSON.stringify(S.vol || {}) + ' | ' + Math.round((Date.now() - t0) / 1000) + 's'); VOLS.push(S.vol || {}); // v107 6d: S.vol = {n 발동, sum, max, maxPop, big 인구25만↑ 건, b20 V 2만↑ 건, rep 격퇴, popSum 인구 가산}
    if (HASH) { const j = JSON.stringify(S); let h = 2166136261; for (let q = 0; q < j.length; q++) { h ^= j.charCodeAt(q); h = Math.imul(h, 16777619); } PRINT('  상태 해시 ' + (h >>> 0).toString(16) + ' 길이 ' + j.length); } // RSHASH=1: 최적화 전후 동일성 확인용
  }
  PRINT('\\n== 플레이어(' + PLAYER + ') 뿌리별, ' + MONTHS + '개월, 시드 ' + SEEDS.join(',') + ', 시나리오 ' + SCEN + ' ==');
  const mean = a => a.reduce((s, x) => s + x, 0) / Math.max(1, a.length); const f1 = (x, n = 1) => x.toFixed(n);
  const pl = RUN.map(rt => { const a = rows.filter(r => r.root === rt && r.player); return { rt, n: a.length, c1: mean(a.map(r => r.c1)), dead: mean(a.map(r => r.dead ? 1 : 0)), own: a.reduce((s, r) => s + r.own, 0), all: a.reduce((s, r) => s + r.all, 0) }; });
  const avgC = mean(pl.map(x => x.c1)), avgD = mean(pl.map(x => x.dead));
  PRINT('뿌리 | 판 | 끝 도시 수(평균) | 4뿌리 평균 대비 | 멸망률 | 자기 방법 비율');
  pl.forEach(x => PRINT('  ' + x.rt + ' | ' + x.n + ' | ' + f1(x.c1, 2) + ' | ' + f1(100 * (x.c1 / Math.max(0.01, avgC) - 1)) + '% | ' + f1(100 * x.dead, 0) + '% | ' + f1(100 * x.own / Math.max(1, x.all)) + '% (' + x.own + '/' + x.all + ')'));
  PRINT('4뿌리 평균 도시 ' + f1(avgC, 2) + ' · 멸망률 평균 ' + f1(100 * avgD, 0) + '% · 기준: 도시 ±15%, 멸망률 다른 뿌리 평균의 2배 미만, 자기 방법 30%↑(기록만)');
  PRINT('\\n== 전 세력(AI 포함) 뿌리별 합산 (세력-판) ==');
  PRINT('뿌리 | 세력-판 | 시작 도시 | 끝 도시 | 멸망률 | 자기 방법 비율');
  ROOTS.forEach(rt => { const a = rows.filter(r => r.rt === rt); const own = a.reduce((s, r) => s + r.own, 0), all = a.reduce((s, r) => s + r.all, 0);
    PRINT('  ' + rt + ' | ' + a.length + ' | ' + f1(mean(a.map(r => r.c0)), 2) + ' | ' + f1(mean(a.map(r => r.c1)), 2) + ' | ' + f1(100 * mean(a.map(r => r.dead ? 1 : 0)), 0) + '% | ' + f1(100 * own / Math.max(1, all)) + '% (' + own + '/' + all + ')'); });
  const tags = {}; rows.forEach(r => Object.entries(r.st).forEach(([k, v]) => tags[k] = (tags[k] || 0) + v)); PRINT('원인 태그 합계: ' + JSON.stringify(tags));
  { const k = ['n', 'sum', 'max', 'maxPop', 'big', 'b20', 'rep', 'popSum', 'thr']; const T = {}; k.forEach(x => T[x] = x === 'max' || x === 'maxPop' ? Math.max(0, ...VOLS.map(v => v[x] || 0)) : VOLS.reduce((u, v) => u + (v[x] || 0), 0)); PRINT('의용병 합계(전 세력, ' + VOLS.length + '판): 발동 ' + T.n + ' (판당 ' + (T.n / Math.max(1, VOLS.length)).toFixed(1) + ') · 평균 ' + Math.round(T.sum / Math.max(1, T.n)) + ' · 최대 ' + T.max + ' · 최대 인구 ' + T.maxPop + ' · 인구 25만↑ 도시 발동 ' + T.big + '건 · 2만↑ ' + T.b20 + '건 · 자동 전투 격퇴 ' + T.rep + '/' + T.n + ' (' + Math.round(100 * T.rep / Math.max(1, T.n)) + '%) · 위협 소집 ' + T.thr + '건 · 인구 가산 합 ' + T.popSum); } // v107 6d
  PRINT('총 ' + Math.round((Date.now() - T0) / 1000) + 's');
})()`, ctx);
process.exit(0);
