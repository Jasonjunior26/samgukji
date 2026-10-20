// 인연·공적 분포 측정기: v105를 Node에서 불러 AI끼리 N개월 돌리고 인연(S.bond)·공적(g.merit) 분포를 낸다. html은 건드리지 않는다.
// 사용: node tools/bond_merit_sim.js [games=3] [months=144] [seed=1] [scen=190] [out.json]
const fs = require('fs'), vm = require('vm'), path = require('path');
const GAMES = +(process.argv[2] || 3), MONTHS = +(process.argv[3] || 144), SEED = +(process.argv[4] || 1), SCEN = process.argv[5] || '190', OUT = process.argv[6] || '';
const html = fs.readFileSync(path.join(__dirname, '..', 'samguk_v105.html'), 'utf8');
const el = () => new Proxy(function () { }, { get: (t, k) => k === Symbol.toPrimitive ? () => '' : (k === 'length' ? 0 : el()), set: () => true, apply: () => el(), construct: () => el() });
const store = {};
let seed = SEED >>> 0; const rnd = () => { seed = (seed + 0x6D2B79F5) >>> 0; let t = seed; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const M = Object.create(Math); M.random = rnd;
const quiet = { log() { }, error() { }, warn() { }, info() { } };
const ctx = { console: quiet, Math: M, Date, JSON, setTimeout: () => 0, clearTimeout() { }, setInterval: () => 0, requestAnimationFrame: () => 0, performance: { now: () => Date.now() },
  localStorage: { getItem: k => store[k] ?? null, setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } },
  document: el(), navigator: { userAgent: 'node' }, location: { reload() { } } };
ctx.window = ctx; vm.createContext(ctx);
[...html.matchAll(/<script(?: [^>]*)?>([\s\S]*?)<\/script>/g)].forEach((m, i) => { try { vm.runInContext(m[1], ctx, { filename: 'block' + i }); } catch (e) { } });
const OVL = require('./bm_overlay'); const OVP = OVL.fromEnv(); OVL.install(ctx, OVP);
ctx.PR = { DUMP: !!process.env.DUMP, OVP, GAMES, MONTHS, SCEN }; ctx.PRINT = (...a) => process.stderr.write(a.join(' ') + '\n');

vm.runInContext(`(() => {
  const pct = (a, p) => { if (!a.length) return 0; const b = a.slice().sort((x, y) => x - y); return b[Math.min(b.length - 1, Math.floor(b.length * p))]; };
  function snap(i) {
    const live = Object.values(S.gen).filter(g => g.st === '현역' && g.fac);
    const merits = live.map(g => g.merit || 0);
    const rk = [0, 0, 0, 0, 0, 0]; live.forEach(g => { if (!isRuler(g)) rk[g.rank || 0]++; });
    const bs = Object.entries(S.bond || {}).filter(([k, e]) => { const [a, b] = k.split('|'); return G(a) && G(b) && G(a).st === '현역' && G(b).st === '현역'; }).map(([k, e]) => e);
    const pos = bs.filter(e => e.v > 0).map(e => e.v);
    const tags = {}; bs.forEach(e => e.t.forEach(t => tags[t] = (tags[t] || 0) + 1));
    // 장수별 결의/생사 상대 수
    const bro = {}; Object.entries(S.bond || {}).forEach(([k, e]) => { if (e.t.includes('결의') || e.t.includes('생사')) { const [a, b] = k.split('|'); bro[a] = (bro[a] || 0) + 1; bro[b] = (bro[b] || 0) + 1; } });
    const broN = Object.values(bro);
    // 같은 세력 내 장수별 인연 30+ 상대 수
    const cnt30 = {}; Object.entries(S.bond || {}).forEach(([k, e]) => { if (e.v >= 30) { const [a, b] = k.split('|'); if (G(a) && G(b) && G(a).fac && G(a).fac === G(b).fac) { cnt30[a] = (cnt30[a] || 0) + 1; cnt30[b] = (cnt30[b] || 0) + 1; } } });
    const c30 = live.map(g => cnt30[g.n] || 0);
    return { m: i, live: live.length, pairs: bs.length, pos: pos.length, b30: pos.filter(v => v >= 30).length, b60: pos.filter(v => v >= 60).length, b100: pos.filter(v => v >= 100).length, neg: bs.filter(e => e.v <= -20).length,
      tags, broGens: broN.length, broMax: broN.length ? Math.max(...broN) : 0, c30avg: c30.reduce((s, x) => s + x, 0) / Math.max(1, c30.length), c30p90: pct(c30, 0.9),
      merit: { p50: pct(merits, 0.5), p90: pct(merits, 0.9), max: Math.max(0, ...merits), zero: merits.filter(x => !x).length }, rk, battles: S._bm ? S._bm.n : 0 };
  }
  function game() {
    newGame('조조', { rand: true, custom: true, scen: PR.SCEN, diff: 1 });
    S._bm = { n: 0, w: 0 }; const MS = { 플레이어턴: 0, 타세력턴: 0, 전투: 0, 월갱신: 0 }; const BS = { 전투: 0, 월갱신: 0, 그외: 0 };
    const msum = () => { let t = 0; for (const g of Object.values(S.gen)) t += g.merit || 0; return t; };
    const bsum = () => { let t = 0; for (const e of Object.values(S.bond || {})) t += e.v > 0 ? e.v : 0; return t; };
    const hist = []; const BYCMD = {}; const wrapped = [];
    ['cmdDevelop', 'cmdSuppress', 'cmdLoy', 'cmdArm', 'cmdScheme', 'cmdDiplo', 'cmdRecruit', 'plotAfter'].forEach(nm => { try { const f = eval(nm); const w = function () { const a = msum(); const r = f.apply(this, arguments); const d = msum() - a; const e = BYCMD[nm] || (BYCMD[nm] = { calls: 0, merit: 0 }); e.calls++; e.merit += d; return r; }; eval(nm + ' = w'); } catch (e) { } });
    // 전투 횟수를 센다
    for (let i = 0; i < PR.MONTHS && !S.over; i++) {
      let m0 = msum(), b0 = bsum();
      if (S.fac[S.player].alive) { try { aiTurn(S.player); } catch (e) { } }
      let m1 = msum(); MS.플레이어턴 += m1 - m0;
      const pend = endMonth(); let m2 = msum(); MS.타세력턴 += m2 - m1; let b2 = bsum(); BS.그외 += b2 - b0;
      pend.forEach(d => { try { const r = autoBattle(d.att, d.from, d.to, d.units); S._bm.n++; if (r && r.win) S._bm.w++; } catch (e) { } });
      let m3 = msum(), b3 = bsum(); MS.전투 += m3 - m2; BS.전투 += b3 - b2;
      monthlyUpdate(); MS.월갱신 += msum() - m3; BS.월갱신 += bsum() - b3;
      if (S.over === 'lose' || S.over === 'win') S.over = null;
      if (S.fac[S.player].alive && (!S.fac[S.player].pol || S.m === 1)) { try { aiPickPolicy(S.player); } catch (e) { } }
      for (const g of Object.values(S.gen)) if (g._m0 === undefined && g.st === '현역') { g._m0 = g.merit || 0; g._t0 = i; }
      if (PR.DUMP && [35, 71, 119, 143].includes(i)) { const cn = {}; Object.values(S.city).forEach(c => { if (c.owner && kindOf(c.n) === '도시') cn[c.owner] = (cn[c.owner] || 0) + 1; });
        (S.dump = S.dump || {})[i + 1] = { fac: Object.fromEntries(Object.keys(cn).map(f => [f, { n: cn[f], title: !!S.fac[f].title, gens: gensOf(f).length }])), gens: Object.values(S.gen).filter(g => g.st === '현역' && g.fac && !isRuler(g)).map(g => ({ f: g.fac, m: Math.round((g.merit || 0) * 10) / 10, s: curStars(g), r: g.rank || 0, a: ageOf(g) || 0 })) }; }
      if (i % 12 === 11) hist.push(snap(i + 1));
    }
    // 상위 장수 기록: 공적 상위 10, 전투 횟수 대비
    // 획득 공적(시작값 제외) — 5년 이상 활동한 현역 장수 기준, 연평균
    const ep = Object.values(S.gen).filter(g => g.st === '현역' && g._m0 !== undefined && PR.MONTHS - g._t0 >= 60 && !isRuler(g)).map(g => ({ n: g.n, e: (g.merit || 0) - g._m0, y: (PR.MONTHS - g._t0) / 12, mil: isMil(g) }));
    const per = a => a.map(x => x.e / x.y);
    const earned = { n: ep.length, perYear: { p50: pct(per(ep), 0.5), p90: pct(per(ep), 0.9), max: Math.max(0, ...per(ep)) }, total: { p50: pct(ep.map(x => x.e), 0.5), p90: pct(ep.map(x => x.e), 0.9), max: Math.max(0, ...ep.map(x => x.e)) },
      mil: { n: ep.filter(x => x.mil).length, perYear90: pct(per(ep.filter(x => x.mil)), 0.9) }, civ: { n: ep.filter(x => !x.mil).length, perYear90: pct(per(ep.filter(x => !x.mil)), 0.9) } };
    const top = Object.values(S.gen).filter(g => g.merit).sort((a, b) => b.merit - a.merit).slice(0, 10).map(g => ({ n: g.n, merit: g.merit, b: (g.rec && g.rec.b) || 0, rank: g.rank || 0, st: g.st }));
    const topB = Object.entries(S.bond || {}).sort((a, b) => b[1].v - a[1].v).slice(0, 10).map(([k, e]) => ({ k, v: e.v, c: e.c, t: e.t.join(',') }));
    const bc = Object.values(S.gen).map(g => (g.rec && g.rec.b) || 0).filter(x => x);
    return { dump: S.dump, earned, BYCMD, MS, BS, hist, top, topB, battleGens: bc.length, battleP50: pct(bc, 0.5), battleP90: pct(bc, 0.9), battleMax: Math.max(0, ...bc), battles: S._bm.n, bwin: S._bm.w };
  }
  const res = []; for (let g = 0; g < PR.GAMES; g++) { res.push(game()); PRINT('판', g + 1, '/', PR.GAMES); }
  globalThis.RESULT = res;
})();`, ctx);
if (OUT) fs.writeFileSync(OUT, JSON.stringify(ctx.RESULT));
const R = ctx.RESULT;
for (const [gi, r] of R.entries()) {
  console.log(`\n== 판 ${gi + 1}: 전투 ${r.battles}회(승 ${r.bwin}), 출전 경험 장수 ${r.battleGens}명, 출전수 p50 ${r.battleP50} p90 ${r.battleP90} 최대 ${r.battleMax}`);
  console.log('개월 | 생존 | 쌍 | 인연30+ 60+ 100 앙숙 | 결의 장수/최대 | 1인당 30+상대 avg/p90 | 공적 p50/p90/max/0 | 관직 없음·5·4·3·2·1품');
  r.hist.forEach(h => { if (h.m % 24 === 0 || h.m === MONTHS) console.log(`${h.m} | ${h.live} | ${h.pairs} | ${h.b30} ${h.b60} ${h.b100} ${h.neg} | ${h.broGens}/${h.broMax} | ${h.c30avg.toFixed(1)}/${h.c30p90} | ${h.merit.p50}/${h.merit.p90}/${h.merit.max}/${h.merit.zero} | ${h.rk.join('·')} | tags ${JSON.stringify(h.tags)}`); });
  { const q = r.earned; const f = x => x.toFixed(1); console.log(`획득 공적(5년+ 활동 ${q.n}명): 연평균 p50 ${f(q.perYear.p50)} p90 ${f(q.perYear.p90)} 최대 ${f(q.perYear.max)} / 누계 p50 ${f(q.total.p50)} p90 ${f(q.total.p90)} 최대 ${f(q.total.max)} / 무관 p90 ${f(q.mil.perYear90)}(${q.mil.n}) 문관 p90 ${f(q.civ.perYear90)}(${q.civ.n})`); }
  console.log('명령별 공적(호출수/공적):', JSON.stringify(r.BYCMD));
  console.log('공적 증가 출처(합계):', JSON.stringify(r.MS), ' 인연(양수 합) 증가:', JSON.stringify(r.BS));
  console.log('공적 상위:', r.top.slice(0, 6).map(t => `${t.n} ${t.merit}(출전${t.b},${t.rank}품${t.st === '현역' ? '' : ',' + t.st})`).join(' / '));
  console.log('인연 상위:', r.topB.slice(0, 5).map(t => `${t.k} ${t.v}(${t.c}회 ${t.t})`).join(' / '));
}
