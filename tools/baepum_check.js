// 덕화 베풂 파급(v1.2) 점검기: 덕화 세력(기본 조조, 190) 이웃의 민충·월 합계 상한·투항 건수를 베풂 켬/끔으로 같은 시드에서 비교한다.
// 사용: node tools/baepum_check.js [개월=24] [시드목록=1,2,3] [모드=ai|push] [덕화세력=조조] > out.txt
//   ai   : 덕화 세력도 AI(aiTurn)가 알아서 진휼·시주 (자연 발생분)
//   push : 매달 AI 턴 전에 덕화 세력 모든 도시가 가용 장수 1명으로 진휼을 한 번 더 호출 (플레이어가 열심히 쓰는 경우)
const fs = require('fs'), vm = require('vm'), path = require('path');
const MONTHS = +(process.argv[2] || 24), SEEDS = (process.argv[3] || '1,2,3').split(',').map(Number), MODE = process.argv[4] || 'ai', DH = process.argv[5] || '조조';
const html = fs.readFileSync(path.join(__dirname, '..', 'samguk_v109.html'), 'utf8');
const el = () => new Proxy(function () { }, { get: (t, k) => k === Symbol.toPrimitive ? () => '' : (k === 'length' ? 0 : el()), set: () => true, apply: () => el(), construct: () => el() });
function mk(seedIn) {
  const store = {}; let seed = seedIn >>> 0; const rnd = () => { seed = (seed + 0x6D2B79F5) >>> 0; let t = seed; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const M = Object.create(Math); M.random = rnd; const errs = [];
  const ctx = { console: { log() { }, error() { }, warn(...a) { errs.push(a.map(String).join(' ').slice(0, 160)); }, info() { } }, Math: M, Date, JSON, setTimeout: () => 0, clearTimeout() { }, setInterval: () => 0, requestAnimationFrame: () => 0, performance: { now: () => Date.now() },
    localStorage: { getItem: k => store[k] ?? null, setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } }, document: el(), navigator: { userAgent: 'node' }, location: { reload() { } } };
  ctx.window = ctx; vm.createContext(ctx);
  [...html.matchAll(/<script(?: [^>]*)?>([\s\S]*?)<\/script>/g)].forEach((m, i) => { try { vm.runInContext(m[1], ctx, { filename: 'block' + i }); } catch (e) { } });
  ctx.ERRS = errs; return ctx;
}
const lines = [];
for (const sd of SEEDS) for (const on of [true, false]) {
  const ctx = mk(sd); ctx.MONTHS = MONTHS; ctx.ON = on; ctx.MODE = MODE; ctx.DH = DH;
  const out = vm.runInContext(`(() => {
    const month = () => { const pend = endMonth(); pend.forEach(d => { try { const r = autoBattle(d.att, d.from, d.to, d.units); if (r.win) C(d.to).food += d.food; else C(d.from).food += d.food; } catch (e) { } }); monthlyUpdate(); };
    newGame(DH, { rand: true, custom: false, scen: '190', diff: 1 }); S.opt.v4Battle = false; S.fac[S.player].root = '덕화'; BAEPUM.on = ON;
    const st = { calls: 0, ripple: 0, drops: [], maxB: 0, maxBT: 0, err: 0, capBreak: 0, calls100: 0 };
    const isDH = f => rootOf(f) === '덕화';
    { const f = cmdLoy; cmdLoy = function (cn, gn, kind) {
      const c = C(cn); const tg = (c && c.owner && isDH(c.owner)) ? baepumTargets(c) : []; const b4 = tg.map(t => t.loy); const l0 = c ? c.loy : 0; const r = f.apply(this, arguments);
      if (r && r.ok && tg.length) { st.calls++; if (l0 >= 100) st.calls100++; tg.forEach((t, i) => { const d = b4[i] - t.loy; if (d > 0) { st.ripple++; st.drops.push(d); } }); }
      try { const bp = rtSt().bp; if (bp && bp.mo === rtMo()) Object.keys(bp.b).forEach(n => { st.maxB = Math.max(st.maxB, bp.b[n]); const tot = bp.b[n] + (bp.t[n] || 0); st.maxBT = Math.max(st.maxBT, tot); if (bp.b[n] > BAEPUM.mon + 1e-9 || tot > BAEPUM.tot + 1e-9) st.capBreak++; }); } catch (e) { }
      return r; }; }
    const mids = []; const tuh0 = () => Object.values(S.rootStat || {}).reduce((u, s) => u + (s['투항'] || 0), 0);
    const loyAvg = () => { const t = []; Object.values(S.city).forEach(c => { if (c.owner && c.owner !== S.player && kindOf(c.n) === '도시' && ADJ[c.n].some(a => S.city[a] && S.city[a].owner === S.player)) t.push(c.loy); }); return t.length ? t.reduce((a, b) => a + b, 0) / t.length : null; };
    const first = loyAvg(); const nb0 = (() => { let n = 0; Object.values(S.city).forEach(c => { if (c.owner && c.owner !== S.player && kindOf(c.n) === '도시' && ADJ[c.n].some(a => S.city[a] && S.city[a].owner === S.player)) n++; }); return n; })();
    for (let i = 0; i < MONTHS; i++) {
      try {
        if (MODE === 'push' && S.fac[S.player].alive) citiesOf(S.player).filter(c => kindOf(c.n) === '도시').forEach(c => { const g = gensIn(c.n, S.player).filter(x => !x.acted && !x.away).sort((a, b) => stat(b, 'c') - stat(a, 'c'))[0]; if (g) cmdLoy(c.n, g.n, '진휼'); });
        if (S.fac[S.player].alive) { if (!S.fac[S.player].pol || S.m === 1) aiPickPolicy(S.player); aiTurn(S.player); } month();
      } catch (e) { st.err++; }
      if (S.over === 'lose' || S.over === 'win') S.over = null;
      if (i % 6 === 5) mids.push(Math.round((loyAvg() || 0) * 10) / 10);
    }
    const mean = a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0;
    return JSON.stringify({ calls: st.calls, calls100: st.calls100, ripple: st.ripple, avgDrop: Math.round(mean(st.drops) * 100) / 100, maxDrop: Math.max(0, ...st.drops), maxB: st.maxB, maxBT: st.maxBT, capBreak: st.capBreak, 투항: tuh0(), 투항덕화: ((S.rootStat || {})[S.player] || {})['투항'] || 0, err: st.err, nb0, loy0: first && Math.round(first * 10) / 10, loyMid: mids, dhCities: citiesOf(S.player).length });
  })()`, ctx);
  lines.push(`[${MODE} 시드${sd} 베풂${on ? '켬' : '끔'}] ${out} errs=${ctx.ERRS.length}`);
  console.log(lines[lines.length - 1]);
}
