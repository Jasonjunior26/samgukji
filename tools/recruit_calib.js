// 등용·합류 확률 보정 검증기 (군주 상성 ssDist 제거 → 노선×인재유형 보정 RC_ROOT)
// 190년 DB: 전 세력 군주(등용자) × 다른 세력 현역·재야 장수 조합(포로·합류는 다른 세력 장수를 가상 포로로 가정).
// 변경 전 = 원식(ssDist/3 항 포함, 현역은 비경륜 ×0.7)을 이 스크립트에 복제. 변경 후 = 게임의 RC_ROOT/rcAdj/rcJoinAdj.
// 사용: node tools/recruit_calib.js [tune]   tune 이면 RC_ROOT.k 를 이분법으로 맞춰 값을 출력(게임 코드에 직접 반영해 둘 것).
// 비교는 래퍼(아이템·정책·재야 exFac 등)를 뺀 본체 식만. 합류의 lp.minus(옛 주군 충성 감점)는 무시(변경 전후 동일 항).
const fs = require('fs'), vm = require('vm'), path = require('path');
const TUNE = process.argv[2] === 'tune';
const html = fs.readFileSync(path.join(__dirname, '..', 'samguk_v107.html'), 'utf8');
const el = () => new Proxy(function () { }, { get: (t, k) => k === Symbol.toPrimitive ? () => '' : (k === 'length' ? 0 : el()), set: () => true, apply: () => el(), construct: () => el() });
const store = {};
let seed = 1; const rnd = () => { seed = (seed + 0x6D2B79F5) >>> 0; let t = seed; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const M = Object.create(Math); M.random = rnd;
const ctx = { console: { log() { }, error() { }, warn() { }, info() { } }, Math: M, Date, JSON, setTimeout: () => 0, clearTimeout() { }, setInterval: () => 0, requestAnimationFrame: () => 0, performance: { now: () => Date.now() },
  localStorage: { getItem: k => store[k] ?? null, setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } },
  document: el(), navigator: { userAgent: 'node' }, location: { reload() { } } };
ctx.window = ctx; vm.createContext(ctx);
[...html.matchAll(/<script(?: [^>]*)?>([\s\S]*?)<\/script>/g)].forEach((m, i) => { try { vm.runInContext(m[1], ctx, { filename: 'block' + i }); } catch (e) { } });
ctx.PRINT = (...a) => console.log(...a); ctx.TUNE = TUNE;
vm.runInContext(`(() => {
  newGame('조조', { rand: true, custom: false, scen: '190', diff: 1 });
  const ROOTS = ['경륜', '강병', '상략', '덕화'];
  const facs = Object.values(S.fac).filter(f => f.alive && f.ruler);
  const clampN = (x, a, b) => Math.max(a, Math.min(b, x));
  // ---- 조합 만들기 ----
  const combos = { 재야: [], 포로: [], 현역: [], 현역L50: [], 현역L30: [], 합류: [], 항복: [] }; // 현역L50/L30 = 충성이 50/30 으로 떨어진(이간 등) 적 장수 가정. 실제 충성 분포에선 98%가 0%라 보정은 셋을 합쳐 맞춘다.
  const allG = Object.values(S.gen || S.gens || {});
  const gens = (typeof GENS !== 'undefined' && Array.isArray(GENS)) ? GENS : allG;
  const list = gens.length ? gens : Object.keys(S.gen || {}).map(n => G(n));
  facs.forEach(F => {
    const rec = G(F.ruler);
    list.forEach(t => {
      if (!t || t === rec) return;
      if (t.st === '현역' && t.fac && t.fac !== F.id) { if (!isRuler(t)) { combos.현역.push({ F, rec, t }); [50, 30].forEach(L => combos['현역L' + L].push({ F, rec, t: Object.assign(Object.create(t), { loy: L }) })); combos.포로.push({ F, rec, t: Object.assign(Object.create(t), { st: '포로' }) }); combos.합류.push({ F, rec, t }); combos.항복.push({ F, rec, t }); } }
      else if (t.st === '재야') combos.재야.push({ F, rec, t });
    });
  });
  // ---- 원식(변경 전) ----
  const OLD = {
    재야: (rec, t, rk) => 50 + (stat(rec, 'c') - 60) / 2 - ssDist(rec.ss0 === undefined ? rec.ss : rec.ss, t.ss) / 3 - t.ui,
    포로: (rec, t) => 35 + (stat(rec, 'c') - 60) / 2 - ssDist(rec.ss, t.ss) / 3 - t.ui * 2 + (100 - t.loy) / 3,
    현역: (rec, t) => 5 + (stat(rec, 'c') - 60) / 3 - ssDist(rec.ss, t.ss) / 3 - t.ui * 2 + (70 - t.loy)
  };
  const oldVal = (st, c, r) => {
    const { rec, t } = c; if (st.startsWith('현역')) st = '현역';
    if (st === '합류') return clampN(40 - ssDist(rec.ss, t.ss) / 3 - t.ui, 0, 100);
    if (st === '항복') return clampN(Math.round(45 - ssDist(rec.ss, t.ss) / 3 - t.ui * 2 + stat(rec, 'c') / 5), 0, 90);
    let p = OLD[st](rec, t);
    if (st === '재야' && ssDist(rec.ss, t.ss) >= 70) p = Math.min(p, 5);
    let q = clampN(Math.round(p), 0, 95);
    if (st === '현역' && r !== '경륜') q = Math.round(q * 0.7);
    return q;
  };
  const newVal = (st, c, r) => {
    const { F, rec, t } = c; if (st.startsWith('현역')) st = '현역'; const sv = F.root; F.root = r;
    try {
      if (st === '합류') return clampN(40 + RC_ROOT.k.합류 - t.ui + rcJoinAdj(F.id, t), 0, 100);
      if (st === '항복') return clampN(Math.round(45 + RC_ROOT.k.항복 - t.ui * 2 + stat(rec, 'c') / 5 + rcJoinAdj(F.id, t)), 0, 90);
      let p;
      if (st === '재야') p = 50 + RC_ROOT.k.재야 + (stat(rec, 'c') - 60) / 2 - t.ui;
      else if (st === '포로') p = 35 + RC_ROOT.k.포로 + (stat(rec, 'c') - 60) / 2 - t.ui * 2 + (100 - t.loy) / 3;
      else p = 5 + RC_ROOT.k.현역 + (stat(rec, 'c') - 60) / 3 - t.ui * 2 + (70 - t.loy);
      p += rcAdj(F.id, t);
      return clampN(Math.round(p), 0, 95);
    } finally { F.root = sv; }
  };
  const cap = st => st === '항복' ? 90 : st === '합류' ? 100 : 95;
  const stats = (st, fn) => { const out = {}; ROOTS.forEach(r => { let s = 0, z = 0, h = 0, n = 0; combos[st].forEach(c => { const v = fn(st, c, r); s += v; n++; if (v <= 0) z++; if (v >= cap(st)) h++; }); out[r] = { m: s / n, z: z / n, h: h / n, n }; }); return out; };
  const avg = o => ROOTS.reduce((a, r) => a + o[r].m, 0) / 4;
  const oldS = {}, newS = {};
  if (TUNE) { // 상태별로 k 를 이분법으로 맞춘다(4노선 평균 = 변경 전 4노선 평균)
    const pool = st => st === '현역' ? ['현역', '현역L50', '현역L30'] : [st]; const pavg = (st, fn) => pool(st).reduce((a, q) => a + avg(stats(q, fn)), 0) / pool(st).length;
    Object.keys(combos).filter(st => !/^현역L/.test(st)).forEach(st => { const tgt = pavg(st, oldVal); let lo = -40, hi = 10; for (let i = 0; i < 40; i++) { const mid = (lo + hi) / 2; RC_ROOT.k[st] = mid; if (pavg(st, newVal) < tgt) lo = mid; else hi = mid; } RC_ROOT.k[st] = Math.round(((lo + hi) / 2) * 10) / 10; });
    PRINT('TUNED k = ' + JSON.stringify(RC_ROOT.k));
  }
  PRINT('RC_ROOT.k = ' + JSON.stringify(RC_ROOT.k) + '  조합 수 ' + Object.keys(combos).map(k => k + ' ' + combos[k].length).join(' / '));
  PRINT('상태 | 노선 | 변경 전 평균% | 변경 후 평균% | 차이 | 전 0%비율 | 후 0%비율 | 전 상한비율 | 후 상한비율');
  Object.keys(combos).forEach(st => {
    const o = stats(st, oldVal), n = stats(st, newVal);
    ROOTS.forEach(r => PRINT(st + ' | ' + r + ' | ' + o[r].m.toFixed(2) + ' | ' + n[r].m.toFixed(2) + ' | ' + (n[r].m - o[r].m).toFixed(2) + ' | ' + (100 * o[r].z).toFixed(1) + '% | ' + (100 * n[r].z).toFixed(1) + '% | ' + (100 * o[r].h).toFixed(1) + '% | ' + (100 * n[r].h).toFixed(1) + '%'));
    const ao = avg(o), an = avg(n); const gap = x => Math.max(...ROOTS.map(r => x[r].m)) - Math.min(...ROOTS.map(r => x[r].m));
    const bo = ROOTS.filter(r => r !== '경륜').reduce((a, r) => a + o[r].m, 0) / 3, bn = ROOTS.filter(r => r !== '경륜').reduce((a, r) => a + n[r].m, 0) / 3;
    PRINT(st + ' | 4노선평균 | ' + ao.toFixed(2) + ' | ' + an.toFixed(2) + ' | ' + (an - ao).toFixed(2) + ' | 노선 간 격차(최대-최소) 전 ' + gap(o).toFixed(2) + ' 후 ' + gap(n).toFixed(2) + ' | 경륜-비경륜평균 전 ' + (o['경륜'].m - bo).toFixed(2) + ' 후 ' + (n['경륜'].m - bn).toFixed(2));
  });
  // 유형 해당 비율
  const cur = combos.현역.map(c => c.t); const uniq = [...new Set(cur)];
  PRINT('현역 장수 ' + uniq.length + '명 유형 해당: ' + ['상략', '덕화', '강병'].map(r => r + ' ' + uniq.filter(g => rcHas(g, r)).length).join(' / '));
  const rj = combos.재야.map(c => c.t); const uj = [...new Set(rj)];
  PRINT('재야 장수 ' + uj.length + '명 유형 해당: ' + ['상략', '덕화', '강병'].map(r => r + ' ' + uj.filter(g => rcHas(g, r)).length).join(' / '));
})()`, ctx);
