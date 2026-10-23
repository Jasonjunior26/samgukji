// 교역 친선 Q1 시뮬 (docs/교역_친선_설계.md §2~4, §10). html 미수정. 게임 AI 경제를 굴리고 그 위에 "그림자" 교역 레이어를 얹는다.
// 그림자: 세트 3개(A/B/C)를 같은 게임 위에서 동시에 추적하며 금을 실제로 빼지 않는다(게임 경제에 되먹임 없음). 예산은 월 수입 기준.
// 사용: node tools/trade_pool_sim.js run '{"scen":"190","seed":1,"months":60}' out.json
//       node tools/trade_pool_sim.js solo        (단독 세력 비용 곡선, 게임 불필요)
//       node tools/trade_pool_sim.js report a.json b.json ...
const fs = require('fs'), vm = require('vm'), path = require('path');
const cmd = process.argv[2];
const NAT = ['kor', 'jpn', 'eeu', 'weu', 'usa'];
const DIST = { kor: 1.0, jpn: 1.0, eeu: 1.5, weu: 2.2, usa: 3.0 };
const SETS = { A: { d: 6, c: 200 }, B: { d: 4, c: 200 }, C: { d: 4, c: 120 }, D: { d: 6, c: 40 }, S120: { d: 5, c: 120, kp: 1 }, S90: { d: 5, c: 90, kp: 1 }, S60: { d: 5, c: 60, kp: 1 }, S45: { d: 5, c: 45, kp: 1 }, S30: { d: 5, c: 30, kp: 1 }, S60k200: { d: 5, c: 60 },
  Q_S0: { d: 5, c: 60, kp: 1, st: 'S0' }, Q_S1: { d: 5, c: 60, kp: 1, st: 'S1' }, Q_S2: { d: 5, c: 60, kp: 1, st: 'S2' },
  Q3_A: { d: 5, c: 60, kp: 2, st: 'S2', rule: 'A', imm: 1 }, Q3_B: { d: 5, c: 60, kp: 2, st: 'S2', rule: 'B', imm: 1 }, Q3_A24: { d: 5, c: 60, kp: 2, st: 'S2', rule: 'A', px: 'm24' }, Q3_B24: { d: 5, c: 60, kp: 2, st: 'S2', rule: 'B', px: 'm24' },
  Q_P0: { d: 5, c: 60, kp: 1, st: 'S1', px: 'm0' }, Q_P24: { d: 5, c: 60, kp: 1, st: 'S1', px: 'm24' }, Q_PN: { d: 5, c: 60, kp: 1, st: 'S1', px: 'none' } };
let USE = Object.keys(SETS); try { const a = JSON.parse(process.argv[3] || '{}'); if (a.sets) USE = a.sets; } catch (e) { }
const K = 200, DECAY = 1, BUDGET = 0.5, HUBG = 0.5;
const HUBDIR = { kor: ['양평', '북평', '남피', '북해', '동래'], jpn: ['동래', '북해', '낭야', '동해', '광릉', '말릉', '오', '회계', '건안'],
  eeu: ['대군', '안문', '서평', '무위', '장액'], weu: ['월수', '운남', '영창', '남해', '합포', '교지'], usa: ['건안', '회계', '오', '말릉', '광릉', '동해', '남해', '합포', '교지'] };
const decay = r => r - (r < 20 ? 0.5 : 1) * DECAY;
const costOf = (base, price, nat, rel) => base * price * DIST[nat] * (1 + rel / 50);

if (cmd === 'solo') { // 단독 세력(풀 무제한·예산 무제한·물가 1): 100까지 개월·누적 금. 감쇠 포함, 월 1회
  for (const [k, s] of Object.entries(SETS)) if (k.startsWith('S')) for (const h of [0, 1, 2]) { const line = [];
    for (const n of NAT) { let r = 0, g = 0, m = 0; const dl = s.d * (1 + HUBG * h);
      while (r < 100 && m < 400) { m++; r = decay(r); g += costOf(s.c, 1, n, r); r = Math.min(100, r + dl); }
      line.push(n + ' ' + (r >= 100 ? m + '개월' : '미달') + ' 금' + Math.round(g)); }
    console.log('세트' + k + ' (Δ' + s.d + ',비용' + s.c + ') 거점' + h + ': ' + line.join(' | ')); }
  process.exit(0);
}
if (cmd === 'report') { report(process.argv.slice(3)); process.exit(0); }
if (cmd === 'report2') { report2(process.argv.slice(3)); process.exit(0); }

const PR = Object.assign({ sets: USE, games: 1, months: 60, seed: 1, scen: '190' }, JSON.parse(process.argv[3] || '{}'));
const OUT = process.argv[4] || '';
const html = fs.readFileSync(path.join(__dirname, '..', 'samguk_v108.html'), 'utf8');
const el = () => new Proxy(function () { }, { get: (t, k) => k === Symbol.toPrimitive ? () => '' : (k === 'length' ? 0 : el()), set: () => true, apply: () => el(), construct: () => el() });
const store = {};
let seed = PR.seed >>> 0; const rnd = () => { seed = (seed + 0x6D2B79F5) >>> 0; let t = seed; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const M = Object.create(Math); M.random = rnd;
const quiet = { log() { }, error() { }, warn() { }, info() { } };
const ctx = { console: quiet, Math: M, Date, JSON, setTimeout: () => 0, clearTimeout() { }, setInterval: () => 0, requestAnimationFrame: () => 0, performance: { now: () => Date.now() },
  localStorage: { getItem: k => store[k] ?? null, setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } },
  document: el(), navigator: { userAgent: 'node' }, location: { reload() { } } };
ctx.addEventListener = () => {}; ctx.removeEventListener = () => {}; ctx.window = ctx; vm.createContext(ctx);
[...html.matchAll(/<script(?: [^>]*)?>([\s\S]*?)<\/script>/g)].forEach((m, i) => { try { vm.runInContext(m[1], ctx, { filename: 'block' + i }); } catch (e) { } });
ctx.RND = rnd; ctx.PR = PR; ctx.PRINT = (...a) => console.log(...a); ctx.SETS = SETS; ctx.NAT = NAT; ctx.DIST = DIST; ctx.HUBDIR = HUBDIR;
ctx.K = K; ctx.DECAY = DECAY; ctx.BUDGET = BUDGET; ctx.HUBG = HUBG; ctx.decay = decay; ctx.costOf = costOf;

vm.runInContext(`(() => {
  const isCity = c => kindOf(c.n) === '도시';
  const realInc = c => Math.round(cityGold(c, (c.owner !== S.player ? DF().inc : 1) * ((c.tax || 30) / 30)) / 3) + ECO.cityBase;
  let seed2 = (PR.seed * 7919 + 17) >>> 0; const R2 = () => { seed2 = (seed2 + 0x9E3779B9) >>> 0; let t = seed2; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const netInc = c => realInc(c) - Math.ceil(c.troops / ECO.troopGold) - (ECO.admin[c.tier] || 0);
  const hubCount = (f, n) => HUBDIR[n].filter(cn => S.city[cn] && S.city[cn].owner === f).length;
  const origPrice = priceIdx;
  let T = null, MO = 0, ERR = '';
  function mk(n0) { const o = {}; PR.sets.forEach(k => { o[k] = { K: SETS[k].kp ? K * Math.max(SETS[k].kp === 2 ? 1.5 : 1, n0 / 12) : K, rel: {}, first100: {}, sp: {}, gained: 0, cut: 0, snap: {}, tal: {}, fr: {} }; NAT.forEach(n => o[k].rel[n] = {}); }); return o; }
  function raise(t, f, n, dl) {
    const R = t.rel[n]; const before = R[f] || 0; let v = Math.min(100, before + dl); R[f] = v;
    const ids = Object.keys(R); let tot = 0; ids.forEach(i => tot += R[i]);
    let ex = tot - t.K;
    if (ex > 1e-9) { let os = 0; ids.forEach(i => { if (i !== f) os += R[i]; });
      if (os > 0) { const c = Math.min(ex, os); ids.forEach(i => { if (i !== f) R[i] -= c * R[i] / os; }); t.cut += c; ex -= c; }
      if (ex > 1e-9) { R[f] -= ex; } }
    t.gained += Math.max(0, R[f] - before);
  }
  // ---- Q2: 개성·전략 ----
  let PX = null; const PERS = {};
  const hashU = (str, j) => { let h = 2166136261 ^ j; for (const ch of String(str)) { h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0; } h = Math.imul(h ^ (h >>> 15), 2246822507) >>> 0; h = Math.imul(h ^ (h >>> 13), 3266489909) >>> 0; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
  function persOf(f) { if (f === PX) return { w: 1, fr: 0.5, taste: NAT.map(() => 1) };
    return PERS[f] || (PERS[f] = { w: 0.7 + 0.6 * hashU(f + PR.seed, 1), fr: 0.35 + 0.3 * hashU(f + PR.seed, 2), taste: NAT.map((n, i) => 0.85 + 0.3 * hashU(f + PR.seed + n, 3 + i)) }); }
  function rankOf(t, n, f) { const R = t.rel[n]; const me = R[f] || 0; let r = 1; Object.keys(R).forEach(i => { if (i !== f && R[i] > me) r++; }); return r; }
  function stratStep(t, s, f, inc, net, hubs, P, mo) {
    const pr = persOf(f); const ST = (t.stt = t.stt || {}); const q = (ST[f] = ST[f] || { foc: [], low: {}, ban: {}, done: {} });
    if (f === PX) { if (s.px === 'none') return; if (s.px === 'm24' && mo < 24) return; }
    const sc = n => (Math.pow(1 / DIST[n], pr.w) * (1 + HUBG * hubs[n]) * pr.taste[NAT.indexOf(n)]);
    const cand = () => NAT.filter(n => !q.foc.includes(n) && !((q.ban[n] || 0) > mo)).sort((a, b) => sc(b) - sc(a));
    const rel = n => t.rel[n][f] || 0;
    const pl = f === PX && !!s.px; // 플레이어 대리(px 세트): 포기·정지 규칙 없이 주력만 밀어붙임
    const s2 = s.st === 'S2' && !pl;
    if (s2) { q.foc.slice().forEach(n => { if (rankOf(t, n, f) > 5 && rel(n) < 30) { q.ban[n] = mo + 12; q.foc.splice(q.foc.indexOf(n), 1); t.skips = (t.skips || 0) + 1; } }); }
    q.foc.slice().forEach(n => { if ((q.low[n] || 0) >= 12) { q.ban[n] = mo + 24; q.foc.splice(q.foc.indexOf(n), 1); q.low[n] = 0; t.switches = (t.switches || 0) + 1; } });
    if (q.foc.length === 0 || (q.foc.length < 5 && q.foc.every(n => q.done[n]))) { let c = cand(); if (s2) c = c.filter(n => !(rankOf(t, n, f) > 5 && rel(n) < 30)); if (c.length) q.foc.push(c[0]); }
    let budget = pr.fr * net, spent = 0, dem = 0;
    for (const n of q.foc) { const r = rel(n); if (r >= 100) continue;
      if (s.rule === 'B' && !pl) { let c80 = 0; Object.keys(t.rel[n]).forEach(i => { if (i !== f && t.rel[n][i] >= 79.999) c80++; }); if (r >= 80 || c80 >= 3) { q.done[n] = true; continue; } }
      else if (s2 && r >= 80) { let c100 = 0; Object.keys(t.rel[n]).forEach(i => { if (i !== f && t.rel[n][i] >= 99.999) c100++; }); if (c100 >= 2) continue; }
      const c = costOf(s.c, P, n, r); dem += c;
      if (c <= budget) { budget -= c; spent += c; t.fr[f] = (t.fr[f] || 0) + c; raise(t, f, n, s.d * (1 + HUBG * hubs[n]));
        const r2 = rel(n); q.low[n] = r2 < 20 ? (q.low[n] || 0) + 1 : 0; if (r2 >= 80) q.done[n] = true; } }
    const best = NAT.filter(n => rel(n) >= 60).sort((a, b) => rel(b) - rel(a))[0];
    if (best) { const c2 = s.c * P * DIST[best] * 2; dem += c2; if (c2 <= budget) { budget -= c2; spent += c2; t.tal[f] = (t.tal[f] || 0) + c2; } }
    const a = (t.sp[f] = t.sp[f] || { inc: 0, net: 0, spent: 0, dem: 0, n: 0, over: 0 }); a.inc += inc; a.net += net; a.spent += spent; a.dem += dem; a.n++; if (dem > inc) a.over++; if (dem > pr.fr * net + 1e-9 && dem > 0) a.blk = (a.blk || 0) + 1;
  }
  const VAR = { V1: { tab: [2, 4, 7, 10], tot: 10, lv: 0.08 }, V2: { tab: [1, 2, 3.5, 5], tot: 5, lv: 0.08 }, V3: { tab: [2, 4, 7, 10], tot: 10, lv: 0.04 }, Z: { tab: [2, 4, 7, 10], tot: 10, lv: 0.08, zero: 36 } };
  const capOf = (tab, r) => { if (r < 40) return 0; if (r >= 100) return tab[3]; const x = [40, 60, 80, 100]; let i = 0; while (r >= x[i + 1]) i++; return tab[i] + (tab[i + 1] - tab[i]) * (r - x[i]) / 20; };
  function immStep(t, s, mo, alive) {
    const I = (t.imm = t.imm || {}), A = (t.imA = t.imA || {}), G = (t.imG = t.imG || {}), B = (t.imB = t.imB || {});
    Object.keys(VAR).forEach(vk => { const v = VAR[vk]; const M = (I[vk] = I[vk] || {}); const bk = (B[vk] = B[vk] || { el: 0, blk: 0 }); let gb = 0, gi = 0;
      alive.forEach(f => { let fb = 0, fi = 0;
        let cap = 0; NAT.forEach(n => { cap += capOf(v.tab, (v.zero && mo >= v.zero) ? 0 : (t.rel[n][f] || 0)); }); cap = Math.min(v.tot, cap) / 100;
        citiesOf(f).filter(isCity).forEach(c => { if (c.pop == null) initPop(c); const base = c.pop; let im = M[c.n] || 0; const tg = base * cap;
          if (im < tg) { let add = Math.min(base * 0.02 / 12, tg - im); const room = popMax(c) - base - im; bk.el++; if (room < add) { bk.blk++; add = Math.max(0, room); } im += add; }
          else if (im > tg) im -= (im - tg) * v.lv;
          M[c.n] = im; fb += base; fi += im; });
        gb += fb; gi += fi;
        if ([12, 36, 60, 72].includes(mo)) { const a = (A[mo] = A[mo] || {}); (a[vk] = a[vk] || []).push([Math.round(fb), Math.round(fi), (t.ever && t.ever[f] >= 40 - 1e-9) ? 1 : 0, f]); } });
      (G[vk] = G[vk] || {})[mo] = [Math.round(gb), Math.round(gi)]; });
  }
  function step(mo) {
    const alive = Object.keys(S.fac).filter(f => S.fac[f].alive && citiesOf(f).filter(isCity).length);
    const P = origPrice();
    Object.keys(T).forEach(k => { const t = T[k];
      NAT.forEach(n => { Object.keys(t.rel[n]).forEach(f => { if (!alive.includes(f)) { delete t.rel[n][f]; return; } t.rel[n][f] = Math.max(0, decay(t.rel[n][f])); }); });
    });
    if (!PX && mo === 1) { const l = alive.map(f => [f, citiesOf(f).filter(isCity).reduce((x, c) => x + realInc(c), 0)]).filter(x => x[1] > 0).sort((a, b) => a[1] - b[1]); if (l.length) PX = l[Math.floor(l.length / 2)][0]; }
    const order = alive.slice().sort(() => R2() - 0.5);
    for (const f of order) {
      const inc = citiesOf(f).filter(isCity).reduce((s, c) => s + realInc(c), 0); if (inc <= 0) continue; const net = Math.max(0, citiesOf(f).filter(isCity).reduce((s, c) => s + netInc(c), 0));
      const hubs = {}; NAT.forEach(n => hubs[n] = hubCount(f, n));
      Object.keys(T).forEach(k => { const t = T[k], s = SETS[k]; if (s.st === 'S1' || s.st === 'S2') { stratStep(t, s, f, inc, net, hubs, P, mo); return; } let budget = BUDGET * net, spent = 0, dem = 0;
        const sc = NAT.map(n => { const rel = t.rel[n][f] || 0; let tot = 0; Object.values(t.rel[n]).forEach(x => tot += x);
          return { n, rel, s: (1 / DIST[n]) * (1 + rel / 100) * (tot < 0.9 * t.K ? 1.3 : 1) }; }).sort((a, b) => b.s - a.s);
        for (const o of sc) { const rel = o.rel; if (rel >= 100) continue; const c = costOf(s.c, P, o.n, rel); dem += c;
          if (c <= budget) { budget -= c; spent += c; t.fr[f] = (t.fr[f] || 0) + c; raise(t, f, o.n, s.d * (1 + HUBG * hubs[o.n])); } }
        const best = NAT.filter(n => (t.rel[n][f] || 0) >= 60).sort((a, b) => t.rel[b][f] - t.rel[a][f])[0];
        if (best) { const c2 = s.c * P * DIST[best] * 2; dem += c2; if (c2 <= budget) { budget -= c2; spent += c2; t.tal[f] = (t.tal[f] || 0) + c2; } }
        const a = (t.sp[f] = t.sp[f] || { inc: 0, net: 0, spent: 0, dem: 0, n: 0, over: 0 }); a.inc += inc; a.net += net; a.spent += spent; a.dem += dem; a.n++; if (dem > inc) a.over++; if (dem + 1e-9 > BUDGET * net + 1e-9 && dem > 0) a.blk = (a.blk || 0) + 1;
      });
    }
    Object.keys(T).forEach(k => { const t = T[k];
      NAT.forEach(n => Object.keys(t.rel[n]).forEach(f => { if (t.rel[n][f] >= 99.999 && t.first100[n + '|' + f] === undefined) t.first100[n + '|' + f] = mo; }));
      if ([12, 24, 36, 48, 60].includes(mo) && PX) { t.pxr = t.pxr || {}; const o = { rel: {}, rank: {} }; NAT.forEach(n => { o.rel[n] = +(t.rel[n][PX] || 0).toFixed(1); o.rank[n] = t.rel[n][PX] !== undefined ? rankOf(t, n, PX) : null; }); o.alive = alive.includes(PX); t.pxr[mo] = o; }
      Object.keys(t.rel.kor).concat(Object.keys(t.rel.jpn), Object.keys(t.rel.eeu), Object.keys(t.rel.weu), Object.keys(t.rel.usa)).forEach(f => { const m = Math.max(...NAT.map(n => t.rel[n][f] || 0)); t.ever = t.ever || {}; if (!(t.ever[f] >= m)) t.ever[f] = m; });
      if (mo === 60) { const fin = { n: alive.length, ever: [0, 0, 0], at: [0, 0, 0] }; alive.forEach(f => { const m = Math.max(...NAT.map(n => t.rel[n][f] || 0)); [40, 60, 80].forEach((th, i) => { if (m >= th - 1e-9) fin.at[i]++; if ((t.ever[f] || 0) >= th - 1e-9) fin.ever[i]++; }); }); t.fin = fin; }
      if ([12, 36, 60].includes(mo)) { t.top2 = t.top2 || {}; t.top2[mo] = {}; NAT.forEach(n => { const v = Object.values(t.rel[n]).sort((a, b) => b - a); const tot = v.reduce((a, b) => a + b, 0); t.top2[mo][n] = tot > 0 ? (v[0] + (v[1] || 0)) / tot : 0; }); }
      if ([12, 36, 60].includes(mo)) { const sn = {}; NAT.forEach(n => { sn[n] = [40, 60, 80, 100].map(th => Object.values(t.rel[n]).filter(x => x >= th - 1e-9).length); }); t.snap[mo] = sn; }
    });
    Object.keys(T).forEach(k => { if (SETS[k].imm) immStep(T[k], SETS[k], mo, alive.filter(f => citiesOf(f).filter(isCity).length)); });
  }
  { const f = monthlyUpdate; monthlyUpdate = function () { const r = f.apply(this, arguments); if (T) { try { MO++; step(MO); } catch (e) { ERR = String(e && e.stack || e).slice(0, 300); } } return r; }; }
  newGame('조조', { rand: true, custom: true, scen: PR.scen, diff: 1 });
  S.opt.v4Battle = false;
  const nF = Object.keys(S.fac).filter(f => citiesOf(f).length).length; T = mk(nF);
  for (let i = 0; i < PR.months && !S.over; i++) {
    if (S.fac[S.player].alive) { try { aiTurn(S.player); } catch (e) { } }
    const pend = endMonth();
    pend.forEach(d => { try { autoBattle(d.att, d.from, d.to, d.units); } catch (e) { } });
    monthlyUpdate();
    if (S.over === 'lose' || S.over === 'win') S.over = null;
  }
  const out = { scen: PR.scen, seed: PR.seed, nF, err: ERR, mo: MO, sets: {} };
  PR.sets.forEach(k => { const t = T[k]; out.sets[k] = { K: t.K, first100: t.first100, sp: t.sp, tal: t.tal, fr: t.fr, gained: t.gained, cut: t.cut, snap: t.snap, rel60: t.rel, top2: t.top2, fin: t.fin, pxr: t.pxr, imA: t.imA, imG: t.imG, imB: t.imB, skips: t.skips || 0, switches: t.switches || 0 }; });
  out.px = PX;
  globalThis.RESULT = out;
})();`, ctx);
if (OUT) fs.writeFileSync(OUT, JSON.stringify(ctx.RESULT));
console.log('끝', PR.scen, PR.seed, '세력', ctx.RESULT.nF, '월', ctx.RESULT.mo, '오류', ctx.RESULT.err);

function report(files) {
  const R = files.map(f => JSON.parse(fs.readFileSync(f, 'utf8')));
  const mean = a => a.reduce((s, x) => s + x, 0) / Math.max(1, a.length);
  const q = (a, p) => { const b = a.slice().sort((x, y) => x - y); return b.length ? b[Math.min(b.length - 1, Math.floor(p * b.length))] : NaN; };
  const f1 = (x, n = 1) => Number.isFinite(x) ? x.toFixed(n) : '-';
  for (const scen of [...new Set(R.map(r => r.scen))]) for (const k of Object.keys(R[0].sets)) {
    const rs = R.filter(r => r.scen === scen);
    console.log('\n=== 시나리오 ' + scen + ' 세트' + k + ' (Δ' + SETS[k].d + ', 비용' + SETS[k].c + ') 시드 ' + rs.map(r => r.seed) + ' 시작세력 ' + rs.map(r => r.nF) + ' ===');
    for (const n of NAT) { const mo = [], tot = []; let reach = 0; rs.forEach(r => { const s = r.sets[k]; const ks = Object.keys(s.first100).filter(x => x.startsWith(n + '|')); ks.forEach(x => mo.push(s.first100[x])); reach += ks.length; tot.push(Object.values(s.rel60[n]).reduce((a, b) => a + b, 0)); });
      console.log('①' + n + ' 거리' + DIST[n] + ': 100 도달 세력 ' + f1(reach / rs.length) + '개/판, 평균 ' + f1(mean(mo)) + '개월(도달분) | 60개월 시점 풀 합 평균 ' + f1(mean(tot))); }
    const act = [], dem = [], over = []; rs.forEach(r => { const s = r.sets[k]; Object.keys(s.sp).forEach(f => { const a = s.sp[f]; if (a.n < 12) return; act.push(a.spent / a.inc); dem.push(a.dem / a.inc); over.push(a.over / a.n); }); });
    console.log('②실지출/수입(예산한도 ' + BUDGET + ') 중앙 ' + f1(100 * q(act, .5)) + '% 상위10% ' + f1(100 * q(act, .9)) + '% 최대 ' + f1(100 * Math.max(...act)) + '% (세력 ' + act.length + ')');
    const actN = []; rs.forEach(r => { const s = r.sets[k]; Object.keys(s.sp).forEach(f => { const a = s.sp[f]; if (a.n >= 12 && a.net > 0) actN.push(a.spent / a.net); }); });
    console.log('②실지출/순이익 중앙 ' + f1(100 * q(actN, .5)) + '% 상위10% ' + f1(100 * q(actN, .9)) + '% (순이익>0 세력 ' + actN.length + ')');
    console.log('②수요(예산 무제한 가정)/수입 중앙 ' + f1(100 * q(dem, .5)) + '% 상위10% ' + f1(100 * q(dem, .9)) + '% 최대 ' + f1(100 * Math.max(...dem)) + '%');
    const blk = [], talS = [], frS = []; rs.forEach(r => { const s = r.sets[k]; Object.keys(s.sp).forEach(f => { const a = s.sp[f]; if (a.n < 12) return; blk.push((a.blk || 0) / a.n); talS.push((s.tal[f] || 0) / a.inc); frS.push((s.fr[f] || 0) / a.inc); }); });
    console.log('②예산에 막힌 세력-달 비율 ' + f1(100 * mean(blk)) + '% | 친선 지출/총수입 평균 ' + f1(100 * mean(frS)) + '% 인재탐색 지출/총수입 평균 ' + f1(100 * mean(talS)) + '% (K ' + rs.map(r => Math.round(r.sets[k].K)) + ')');
    console.log('⑤수요>수입인 세력-달 비율 ' + f1(100 * mean(over)) + '% | 그 달이 절반 넘는 세력 ' + f1(100 * mean(over.map(x => x > 0.5 ? 1 : 0))) + '%');
    for (const mo of [12, 36, 60]) { const row = []; [0, 1, 2, 3].forEach(i => { const all = []; rs.forEach(r => { const sn = r.sets[k].snap[mo]; if (sn) NAT.forEach(n => all.push(sn[n][i])); }); row.push(['40', '60', '80', '100'][i] + '+: 평균 ' + f1(mean(all)) + ' 최대 ' + Math.max(...all)); });
      console.log('③월' + mo + ' 나라당 ' + row.join(' | ')); }
    const g = mean(rs.map(r => r.sets[k].gained)), c = mean(rs.map(r => r.sets[k].cut)); console.log('④풀 차감 손실/상승 총량 = ' + f1(100 * c / Math.max(1e-9, g)) + '% (상승 ' + f1(g, 0) + ', 차감 ' + f1(c, 0) + ')');
  }
}


function report2(files) {
  const R = files.map(f => JSON.parse(fs.readFileSync(f, 'utf8')));
  const mean = a => a.reduce((s, x) => s + x, 0) / Math.max(1, a.length);
  const f1 = (x, n = 1) => Number.isFinite(x) ? x.toFixed(n) : '-';
  const ks = Object.keys(R[0].sets);
  for (const scen of [...new Set(R.map(r => r.scen))]) {
    const rs = R.filter(r => r.scen === scen);
    console.log('\n########## 시나리오 ' + scen + ' (시작 세력 ' + rs.map(r => r.nF) + ', 프록시 ' + rs.map(r => r.px) + ', K ' + rs.map(r => Math.round(r.sets[ks[0]].K)) + ') ##########');
    for (const k of ks) {
      console.log('\n--- ' + k + ' ---');
      for (const mo of [12, 36, 60]) { const row = [], n80 = [], t2 = [];
        [0, 1, 2, 3].forEach(i => { const all = []; rs.forEach(r => { const sn = r.sets[k].snap[mo]; if (sn) NAT.forEach(n => all.push(sn[n][i])); }); row.push(['40', '60', '80', '100'][i] + '+ 평균 ' + f1(mean(all)) + ' 최대 ' + Math.max(...all)); });
        rs.forEach(r => { const sn = r.sets[k].snap[mo]; if (sn) n80.push(NAT.filter(n => sn[n][2] > 0).length); const tp = r.sets[k].top2 && r.sets[k].top2[mo]; if (tp) NAT.forEach(n => t2.push(tp[n])); });
        console.log('①월' + mo + ' 나라당 ' + row.join(' | ') + ' | 상위2 점유율 ' + f1(100 * mean(t2), 0) + '% | 80+ 세력 있는 나라 수 ' + f1(mean(n80)) + '/5');
      }
      const g = mean(rs.map(r => r.sets[k].gained)), c = mean(rs.map(r => r.sets[k].cut));
      console.log('②풀 차감/상승 ' + f1(100 * c / Math.max(1e-9, g)) + '% (상승 ' + f1(g, 0) + ' 차감 ' + f1(c, 0) + ')');
      const fin = rs.map(r => r.sets[k].fin).filter(Boolean); const tot = fin.reduce((s, x) => s + x.n, 0);
      console.log('④월60 생존 세력 중 40+/60+/80+ 도달 비율: 지금 ' + [0, 1, 2].map(i => f1(100 * fin.reduce((s, x) => s + x.at[i], 0) / tot, 0) + '%').join('/') + ' | 60개월 중 한 번이라도 ' + [0, 1, 2].map(i => f1(100 * fin.reduce((s, x) => s + x.ever[i], 0) / tot, 0) + '%').join('/'));
      const fr = [], tl = [], bk = []; rs.forEach(r => { const s = r.sets[k]; Object.keys(s.sp).forEach(f => { const a = s.sp[f]; if (a.n < 12) return; fr.push((s.fr[f] || 0) / a.inc); tl.push((s.tal[f] || 0) / a.inc); bk.push((a.blk || 0) / a.n); }); });
      console.log('지출: 친선/총수입 ' + f1(100 * mean(fr)) + '% 인재 ' + f1(100 * mean(tl)) + '% 막힘 ' + f1(100 * mean(bk), 0) + '% | 포기(S2) ' + f1(mean(rs.map(r => r.sets[k].skips)), 0) + ' 갈아탐 ' + f1(mean(rs.map(r => r.sets[k].switches)), 0));
      const px = rs.map(r => { const o = r.sets[k].pxr && r.sets[k].pxr[60]; if (!o) return r.seed + ':n/a'; return r.seed + ':' + r.px + (o.alive ? '' : '(멸망)') + ' ' + NAT.map(n => n + ' ' + o.rel[n] + (o.rank[n] ? '(#' + o.rank[n] + ')' : '')).join(' '); });
      console.log('③프록시 월60: ' + px.join(' || '));
      if (k === 'Q_P24') { const px36 = rs.map(r => { const o = r.sets[k].pxr && r.sets[k].pxr[36]; return o ? r.seed + ' m36 ' + NAT.map(n => o.rel[n]).join('/') : ''; }); console.log('   (P24) ' + px36.join(' | ')); }
    }
  }
}
