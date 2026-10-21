// 국책 시험기: 모든 세력(플레이어 포함)을 AI로 돌려 국책별 채택률·성과를 잼 (게임 코드는 안 건드림)
// 사용: node tools/policy_sim.js [판수=12] [개월=60] [모드=both|nat|forced] [출력.json] [시드=1]
//  nat    — 게임 그대로(aiPickPolicy 원본). 어떤 국책을 몇 번 고르는지(채택률)와 그 나라 성과
//  forced — 세력마다 8개 국책에서 서로 다른 두 분야 조합을 무작위 강제. 세력 고정효과를 빼고 국책별 평균 성과차 계산
const fs = require('fs'), vm = require('vm'), path = require('path');
const N = +(process.argv[2] || 12), MONTHS = +(process.argv[3] || 60), MODE = process.argv[4] || 'both', OUT = process.argv[5] || '', SEED = +(process.argv[6] || 1);
const html = fs.readFileSync(path.join(__dirname, '..', 'samguk_v108.html'), 'utf8');
const el = () => new Proxy(function () { }, { get: (t, k) => k === Symbol.toPrimitive ? () => '' : (k === 'length' ? 0 : el()), set: () => true, apply: () => el(), construct: () => el() });
const store = {};
// 시드 난수: 같은 시드면 같은 게임 (세력 시작 조건·AI 선택 재현)
let seed = SEED >>> 0; const rnd = () => { seed = (seed + 0x6D2B79F5) >>> 0; let t = seed; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const M = Object.create(Math); M.random = rnd;
const quiet = { log() { }, error() { }, warn() { }, info() { } };
const ctx = { console: quiet, Math: M, Date, JSON, setTimeout: () => 0, clearTimeout() { }, setInterval: () => 0, requestAnimationFrame: () => 0, performance: { now: () => Date.now() },
  localStorage: { getItem: k => store[k] ?? null, setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } },
  document: el(), navigator: { userAgent: 'node' }, location: { reload() { } } };
ctx.window = ctx; vm.createContext(ctx);
[...html.matchAll(/<script(?: [^>]*)?>([\s\S]*?)<\/script>/g)].forEach((m, i) => { try { vm.runInContext(m[1], ctx, { filename: 'block' + i }); } catch (e) { } });
ctx.RND = rnd; ctx.N = N; ctx.MONTHS = MONTHS; ctx.MODE = MODE; ctx.PRINT = (...a) => console.log(...a);

vm.runInContext(`(() => {
  const FIELDS = Object.keys(NPOL);
  const month = () => { const pend = endMonth(); pend.forEach(d => { try { const r = autoBattle(d.att, d.from, d.to, d.units); if (r.win) C(d.to).food += d.food; else C(d.from).food += d.food; } catch (e) { } }); monthlyUpdate(); };
  const pick = (a) => a[Math.floor(RND() * a.length)];
  const randPair = () => { const fs = FIELDS.slice(); const a = fs.splice(Math.floor(RND() * fs.length), 1)[0]; const b = pick(fs); return [pick(NPOL[a]), pick(NPOL[b])]; };
  // 세력 상태 한 점: 도시·병력·금·군량·장수 수
  const snap = fid => { const cs = citiesOf(fid).filter(c => kindOf(c.n) === '도시'); return { cities: citiesOf(fid).length, troops: citiesOf(fid).reduce((s, c) => s + c.troops, 0), gold: citiesOf(fid).reduce((s, c) => s + c.gold, 0), food: citiesOf(fid).reduce((s, c) => s + c.food, 0), gens: gensOf(fid).length, alive: S.fac[fid].alive ? 1 : 0 }; };
  function game(forced) {
    newGame('조조');
    S.opt.v4Battle = false;
    const fids = Object.keys(S.fac);
    const start = {}; fids.forEach(f => start[f] = snap(f));
    const orig = aiPickPolicy; const forcedMap = {}; const picks = {};
    if (forced) fids.forEach(f => forcedMap[f] = randPair());
    aiPickPolicy = function (fid) { if (forced) S.fac[fid].pol = forcedMap[fid].slice(); else orig(fid); (picks[fid] = picks[fid] || []).push(S.fac[fid].pol.slice()); };
    const hist = [];
    for (let i = 0; i < MONTHS && !S.over; i++) {
      // 플레이어 세력도 AI로 (엔진은 플레이어를 직접 조종하지 않음)
      if (S.fac[S.player].alive) { try { aiTurn(S.player); } catch (e) { } }
      month();
      // 월 갱신은 플레이어 세력의 국책을 안 고르므로 여기서 첫 달과 매년 1월에 고름
      if (S.fac[S.player].alive && (!S.fac[S.player].pol || S.m === 1)) { try { aiPickPolicy(S.player); } catch (e) { } }
      if (i % 12 === 11) hist.push(fids.map(f => snap(f)));
    }
    // 첫 해 플레이어도 국책을 갖게 (월 갱신은 플레이어를 건너뜀)
    const end = {}; fids.forEach(f => end[f] = snap(f));
    aiPickPolicy = orig;
    return { forced, fids, start, end, picks, forcedMap, hist, over: S.over };
  }
  const res = [];
  for (let g = 0; g < N; g++) {
    if (MODE !== 'forced') res.push(game(false));
    if (MODE !== 'nat') res.push(game(true));
    PRINT('판', g + 1, '/', N);
  }
  globalThis.RESULT = res;
})();`, ctx);

const res = ctx.RESULT;
if (OUT) fs.writeFileSync(OUT, JSON.stringify(res));
const mean = a => a.reduce((s, x) => s + x, 0) / Math.max(1, a.length);
const sd = a => { const m = mean(a); return Math.sqrt(mean(a.map(x => (x - m) ** 2))); };
// 성과 점수: 끝 도시 수 − 시작 도시 수 (살아남은 세력만 아니라 멸망도 포함해 0으로 침)
const score = (r, f) => r.end[f].cities - r.start[f].cities;
const troopsRatio = (r, f) => Math.log((r.end[f].troops + 1000) / (r.start[f].troops + 1000));

// 1. 자연 채택률
const nat = res.filter(r => !r.forced);
if (nat.length) {
  const cnt = {}; let tot = 0;
  nat.forEach(r => Object.keys(r.picks).forEach(f => r.picks[f].forEach(p => { p.forEach(x => cnt[x] = (cnt[x] || 0) + 1); tot += p.length; })));
  console.log('\n[자연] 국책 채택 횟수 (AI가 해마다 고른 총 ' + tot + '개)');
  Object.entries(cnt).sort((a, b) => b[1] - a[1]).forEach(([k, v]) => console.log('  ' + k.padEnd(8, ' ') + String(v).padStart(6) + '  ' + (100 * v / tot).toFixed(1) + '%'));
  console.log('  → 세력별로 고정된 조합 수:', new Set(nat.flatMap(r => Object.values(r.picks).map(p => (p[0] || []).join('+')))).size, '가지');
}

// 2. 강제 배정 효과 (세력 고정효과 제거)
const fr = res.filter(r => r.forced);
if (fr.length) {
  const rows = [];
  fr.forEach(r => r.fids.forEach(f => { if (r.start[f].cities === 0) return; rows.push({ f, pol: r.forcedMap[f], d: score(r, f), t: troopsRatio(r, f), alive: r.end[f].alive }); }));
  const byF = {}; rows.forEach(x => (byF[x.f] = byF[x.f] || []).push(x));
  Object.values(byF).forEach(a => { const md = mean(a.map(x => x.d)), mt = mean(a.map(x => x.t)); a.forEach(x => { x.dd = x.d - md; x.tt = x.t - mt; }); });
  const byP = {}; rows.forEach(x => x.pol.forEach(p => (byP[p] = byP[p] || []).push(x)));
  console.log('\n[강제] 국책별 성과 (세력 평균 대비 도시 수 변화 / 병력 로그비 변화 / 생존율), 판수 ' + fr.length + ', 세력-판 ' + rows.length);
  console.log('  ' + '국책'.padEnd(8, ' ') + '표본'.padStart(5) + '  도시Δ'.padStart(9) + '  ±오차'.padStart(8) + '  병력Δ'.padStart(9) + '  생존');
  Object.entries(byP).sort((a, b) => mean(b[1].map(x => x.dd)) - mean(a[1].map(x => x.dd))).forEach(([p, a]) => {
    const se = sd(a.map(x => x.dd)) / Math.sqrt(a.length);
    console.log('  ' + p.padEnd(8, ' ') + String(a.length).padStart(5) + ('  ' + mean(a.map(x => x.dd)).toFixed(2)).padStart(9) + ('  ' + se.toFixed(2)).padStart(8) + ('  ' + mean(a.map(x => x.tt)).toFixed(2)).padStart(9) + '  ' + (100 * mean(a.map(x => x.alive))).toFixed(0) + '%');
  });
  // 분야 쌍
  const byPair = {}; rows.forEach(x => { const k = x.pol.slice().sort().join('+'); (byPair[k] = byPair[k] || []).push(x); });
  const top = Object.entries(byPair).filter(([k, a]) => a.length >= 4).sort((a, b) => mean(b[1].map(x => x.dd)) - mean(a[1].map(x => x.dd)));
  console.log('\n[강제] 조합 상·하위 (표본 4 이상)');
  top.slice(0, 5).concat(top.slice(-5)).forEach(([k, a]) => console.log('  ' + k.padEnd(18, ' ') + String(a.length).padStart(4) + ('  ' + mean(a.map(x => x.dd)).toFixed(2)).padStart(8)));
}

// 3. 자원 쌓임: 해마다 살아 있는 세력의 금·군량이 병력 월 유지비(금=병력/250, 군량=병력/20)의 몇 개월분인지 중앙값
const med = a => { const b = a.slice().sort((x, y) => x - y); return b.length ? b[Math.floor(b.length / 2)] : NaN; };
const nat2 = res.filter(r => !r.forced && r.hist && r.hist.length);
if (nat2.length) {
  console.log('\n[자원] 해마다 중앙값 (금·군량 몇 개월분 / 도시당 금·군량 / 생존 세력 수), 판수 ' + nat2.length);
  const yrs = Math.max(...nat2.map(r => r.hist.length));
  for (let y = 0; y < yrs; y++) {
    const rows = []; nat2.forEach(r => { const h = r.hist[y]; if (h) h.forEach(s => { if (s.cities > 0 && s.troops > 0) rows.push(s); }); });
    if (!rows.length) continue;
    console.log('  ' + String(y + 1).padStart(2) + '년차  금 ' + med(rows.map(s => s.gold / (s.troops / 250))).toFixed(0).padStart(5) + '개월  군량 ' + med(rows.map(s => s.food / (s.troops / 20))).toFixed(0).padStart(5) + '개월  도시당 금 ' + med(rows.map(s => s.gold / s.cities)).toFixed(0).padStart(6) + ' 군량 ' + med(rows.map(s => s.food / s.cities)).toFixed(0).padStart(7) + '  세력 ' + (rows.length / nat2.length).toFixed(1));
  }
}
