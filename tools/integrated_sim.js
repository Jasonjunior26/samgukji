// 통합 시험기: v105 코드 위에 v106 이후 설계(뿌리 4개·교역 거점 증폭·전국+세력 2층 물가·소모처 확대·AI 점수 우선순위)를 시험 레이어로 얹어 돌린다.
// html은 건드리지 않는다. 설계 안의 모든 수치는 "가정"이며 docs/통합_시뮬레이션.md 에 기록한다.
// 사용:
//   node tools/integrated_sim.js run '{"mode":"design","games":4,"months":144,"seed":1,"scen":"190","roots":"forced"}' out.json
//   node tools/integrated_sim.js report a.json [b.json ...]
// 모드: base = v105 그대로(대조군) / design = 설계 레이어 켬
// rec:true = 통합_시뮬레이션 §6 권고안 장치(수도 거점 인정·예비금 물가·보유량 항 holdN/holdRate·경륜 연수·차익 상향·군량 하한 foodFloor·뿌리 자동선택 점수를 시나리오 평균으로 정규화). cap/pass 는 따로 지정
// 주요 파라미터(기본값): roots(forced|nat|none) a(1) b(0.3) pass(0.6) cap(0.10 연 상한) hubGain(0.5) land(true) tradeFrac(0.5) openAll(false) noPrice(false)
const fs = require('fs'), vm = require('vm'), path = require('path');
const cmd = process.argv[2];
if (cmd === 'pair') { pair(process.argv.slice(3)); process.exit(0); }
if (cmd === 'cause') { cause(process.argv.slice(3)); process.exit(0); }
if (cmd === 'report') { report(process.argv.slice(3)); process.exit(0); }
const PR = Object.assign({ mode: 'design', games: 4, months: 144, seed: 1, scen: '190', roots: 'forced', a: 1, b: 0.3, pass: 0.6, cap: 0.10, hubGain: 0.5, land: true, tradeFrac: 0.5, openAll: false, noPrice: false, noTrade: false, tradeScale: 1, rec: false, foodFloor: 15, holdN: 12, holdRate: 0.03, r3: false, lux: [40, 70, 100], luxM: [0.10, 0.20, 0.32], luxMer: 1.5, luxCap: 0.6, sinkFrac: 0.7, assign: false, deukBonus: 0.4, popT: [120000, 170000, 230000], popInc: 0.04, popLoy: 0.15, popFind: 0.006, foodBuyN: 0, sinkArm: 0.55, volun: false, volK: 0.03, volCap: 0.04, volTrain: 40, popGrow: 0 }, JSON.parse(process.argv[3] || '{}'));
const OUT = process.argv[4] || '';

const html = fs.readFileSync(path.join(__dirname, '..', 'samguk_v107.html'), 'utf8');
const el = () => new Proxy(function () { }, { get: (t, k) => k === Symbol.toPrimitive ? () => '' : (k === 'length' ? 0 : el()), set: () => true, apply: () => el(), construct: () => el() });
const store = {};
let seed = PR.seed >>> 0; const rnd = () => { seed = (seed + 0x6D2B79F5) >>> 0; let t = seed; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const M = Object.create(Math); M.random = rnd;
const quiet = { log() { }, error() { }, warn() { }, info() { } };
const ctx = { console: quiet, Math: M, Date, JSON, setTimeout: () => 0, clearTimeout() { }, setInterval: () => 0, requestAnimationFrame: () => 0, performance: { now: () => Date.now() },
  localStorage: { getItem: k => store[k] ?? null, setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } },
  document: el(), navigator: { userAgent: 'node' }, location: { reload() { } } };
ctx.window = ctx; vm.createContext(ctx);
[...html.matchAll(/<script(?: [^>]*)?>([\s\S]*?)<\/script>/g)].forEach((m, i) => { try { vm.runInContext(m[1], ctx, { filename: 'block' + i }); } catch (e) { } });
ctx.RND = rnd; ctx.PR = PR; ctx.PRINT = (...a) => console.log(...a);

vm.runInContext(`(() => {
  const D = PR.mode === 'design';
  const ROOTS = ['경륜', '강병', '상략', '덕화'];
  const PART = ['kor', 'jpn', 'eeu', 'weu', 'usa'];
  // 가정: 거점 도시와 방면별 상대국 (교역_성향_설계 §3-1, 항구는 TR_PORTS 15곳)
  const PORTS = ['양평', '북평', '남피', '북해', '동래', '낭야', '동해', '광릉', '말릉', '오', '회계', '건안', '남해', '합포', '교지'];
  const LAND = ['대군', '안문', '서평', '무위', '장액', '월수', '운남', '영창'];
  const HUBDIR = { kor: ['양평', '북평', '남피', '북해', '동래'], jpn: ['동래', '북해', '낭야', '동해', '광릉', '말릉', '오', '회계', '건안'],
    eeu: ['대군', '안문', '서평', '무위', '장액'], weu: ['월수', '운남', '영창', '남해', '합포', '교지'], usa: ['건안', '회계', '오', '말릉', '광릉', '동해', '남해', '합포', '교지'] };
  const REGION = {}; ['양평', '북평', '남피', '북해'].forEach(c => REGION[c] = '동북'); ['동래', '낭야', '동해', '광릉', '말릉', '오', '회계', '건안'].forEach(c => REGION[c] = '동남해안'); ['남해', '합포', '교지'].forEach(c => REGION[c] = '남');
  ['대군', '안문'].forEach(c => REGION[c] = '북방'); ['서평', '무위', '장액'].forEach(c => REGION[c] = '서북'); ['월수', '운남', '영창'].forEach(c => REGION[c] = '서남');
  // 이름 있는 군주 손 지정표 (r3 시험 §4-00000, 시나리오 190·200의 실제 세력 id). 지정에 없는 세력만 공식으로 고른다.
  const ASSIGN = { 조조: '경륜', 원소: '경륜', 유표: '경륜', 유우: '경륜', 공융: '경륜', 왕랑: '경륜',
    동탁: '강병', 공손찬: '강병', 마등: '강병', 한수: '강병', 맹획: '강병', 엄백호: '강병',
    손견: '상략', 사섭: '상략', 원술: '상략', 포신: '상략', 공손도: '상략',
    유비: '덕화', 도겸: '덕화', 유언: '덕화', 장로: '덕화' };
  const isCity = c => kindOf(c.n) === '도시';
  const clampN = (v, a, b) => Math.max(a, Math.min(b, v));
  let IT = null, CURF = null;
  const mean = a => a.reduce((s, x) => s + x, 0) / Math.max(1, a.length);

  function hubDirs() { return PR.land ? HUBDIR : Object.fromEntries(Object.entries(HUBDIR).map(([k, v]) => [k, v.filter(c => PORTS.includes(c))])); }
  function hubCount(f, d) { const H = hubDirs()[d]; return H.filter(cn => S.city[cn] && S.city[cn].owner === f).length; }
  function amp(f, d) { const h = hubCount(f, d); return 1 + PR.hubGain * (PR.rec ? Math.max(h, 1) : h); } // rec: 수도를 거점 1곳으로 인정(거점 0개 세력 기본 증폭)
  function price(f) { if (!D || PR.noPrice) return null; return IT.Pn ** PR.a * ((f && IT.Pf[f]) || 1) ** PR.b; }
  function realInc(c) { return Math.round(cityGold(c, (c.owner !== S.player ? DF().inc : 1) * ((c.tax || 30) / 30)) / 3); }

  function chooseRoot(f) {
    if (PR.roots === 'none') return 'none';
    if (PR.roots === 'rot') return ROOTS[(IT.rotN++) % 4];
    if (PR.roots === 'forced') return ROOTS[Math.floor(RND() * 4)];
    if (PR.assign && ASSIGN[f]) return ASSIGN[f];
    const rs = fid => { const g = G(S.fac[fid].ruler); return { 경륜: g.i + g.p, 강병: g.w + g.t, 상략: g.c * 1.6, 덕화: (g.p + g.t + g.c) * 0.7 }; };
    const sc = rs(f);
    if (PR.rec) { // 쏠림 보정: 뿌리별 점수를 시나리오 전체 군주 평균·표준편차로 표준화한 상대 점수로 비교
      if (!IT.rm) { const all = Object.keys(S.fac).filter(x => S.fac[x].alive).map(rs); IT.rm = {}; ROOTS.forEach(r => { const m = mean(all.map(o => o[r])); IT.rm[r] = { m, sd: Math.max(1, Math.sqrt(mean(all.map(o => (o[r] - m) ** 2)))) }; }); }
      ROOTS.forEach(r => sc[r] = (sc[r] - IT.rm[r].m) / IT.rm[r].sd + (PR.assign && r === '덕화' ? PR.deukBonus : 0));
    }
    return ROOTS.reduce((b, r) => sc[r] > sc[b] ? r : b, '경륜');
  }
  function initFac(f) {
    if (IT.st[f]) return;
    IT.st[f] = { root: chooseRoot(f), deg: [0, 0, 0, 0, 0], found: 0, traits: 0, units: 0, vol: [0, 0, 0, 0, 0], spend: {}, food: {}, gain: {}, bw: 0, bl: 0, dw: 0, dl: 0, bank: 0, incSum: 0, extra: { upkeep: 0, sortie: 0, arm: 0 } };
    const inc = citiesOf(f).reduce((s, c) => s + realInc(c), 0); IT.inc0[f] = Math.max(1, inc); IT.Pf[f] = 1;
  }
  const bump = (o, k, v) => { o[k] = (o[k] || 0) + v; };

  // ---- 물가: 전국+세력 2층 ----
  function updatePrice() {
    const cs = Object.values(S.city).filter(c => c.owner && isCity(c)); if (!cs.length) return;
    // 명목 수입 = 실수입 × (1 + pass×(P−1))
    let tot = 0; const byF = {};
    cs.forEach(c => { const p = price(c.owner) || 1; const nom = realInc(c) * (1 + PR.pass * (p - 1)); tot += nom; byF[c.owner] = (byF[c.owner] || 0) + nom; });
    const avg = tot / cs.length; if (!IT.avg0) IT.avg0 = avg;
    const mcap = Math.pow(1 + PR.cap, 1 / 12);
    const tgt = Math.max(1, Math.pow(avg / IT.avg0, 0.6)); IT.Pn = Math.min(tgt, IT.Pn * mcap); IT.nomAvg = avg;
    Object.keys(byF).forEach(f => { if (!IT.st[f]) return; const t = clampN(byF[f] / IT.inc0[f], 1, 4); IT.Pf[f] = Math.min(t, (IT.Pf[f] || 1) * mcap); });
  }

  // ---- 교역 한 달 ----
  function surplusOf(c, f) { return Math.max(0, c.gold - 2 * reserveOf(c, f) - Math.ceil(c.troops / ECO.troopGold)); }
  function drawGold(f, amt) { // 세력 전체에서 부유한 도시 순으로 금을 뺌 (교역 명령은 수도에서 제약 없이)
    const cs = citiesOf(f).filter(isCity).sort((a, b) => surplusOf(b, f) - surplusOf(a, f)); let need = amt;
    for (const c of cs) { const t = Math.min(need, surplusOf(c, f)); c.gold -= t; need -= t; if (need <= 0) break; }
    return need <= 0;
  }
  function budgetOf(f) { return citiesOf(f).filter(isCity).reduce((s, c) => s + surplusOf(c, f), 0) * PR.tradeFrac; }
  function frontCity(f) { const cs = citiesOf(f).filter(isCity); const fr = cs.filter(c => isFront(c.n, f)); const a = fr.length ? fr : cs; return a.sort((x, y) => y.troops - x.troops)[0]; }
  function bestPart(f, st, need) { // 다음 임계에 가까운 상대국 우선, 증폭이 큰 방면 우선
    let best = -1, bs = -1;
    for (let d = 0; d < 5; d++) { if (d === 4 && st.deg.slice(0, 4).reduce((s, x) => s + x, 0) < 150) continue; if (st.deg[d] >= 100) continue;
      const s = amp(f, PART[d]) * (need ? need(d) : 1) + RND() * 0.3; if (s > bs) { bs = s; best = d; } }
    return best;
  }
  function luxSink(f, cs, amt, P) { // 고가품 이익을 군비(전선 도시)·시설에 나눠 씀. 절반씩
    const st = IT.st[f]; st.sink = st.sink || { 군비: 0, 시설: 0 }; st.pool = (st.pool || 0) + amt; let armB = st.pool * PR.sinkArm, facB = st.pool * (1 - PR.sinkArm); // 이익을 풀에 모아 비용이 차면 씀
    const fr = cs.filter(c => isFront(c.n, f)); const pool = fr.length ? fr : cs; installArms();
    for (let k = 0; k < 40 && armB > 0; k++) { const c = pool[k % pool.length]; const t = ['보병', '궁병', '기병'].sort((x, y) => (c.arm[x] || 0) - (c.arm[y] || 0))[0]; const cost = armCost(c, t); if (cost > armB || c.gold < cost + reserveOf(c, f)) break; c.gold -= cost; c.arm[t] = (c.arm[t] || 0) + 3; armB -= cost; st.pool -= cost; st.sink.군비 += cost; }
    const keys = Object.keys(FACS);
    for (const c of cs) { if (facB <= 0) break; c.facs = c.facs || []; if (c.facs.length >= gradeOf(c)) continue; const cost = Math.round(facCost(c) * P); if (cost > facB || c.gold < cost + reserveOf(c, f)) continue;
      const fc = keys.filter(k => !c.facs.includes(k) && canFac(c, k))[Math.floor(RND() * 99) % Math.max(1, keys.length)]; if (!fc) continue; c.gold -= cost; c.facs.push(fc); facB -= cost; st.pool -= cost; st.sink.시설 += cost; }
  }
  function tradeTurn(f) {
    const st = IT.st[f]; if (!st || st.root === 'none') return;
    const cs = citiesOf(f).filter(isCity); if (!cs.length) return;
    const P = price(f) || 1; let budget = budgetOf(f); const root = st.root; const open = r => PR.openAll || root === r;
    const incF = cs.reduce((s, c) => s + realInc(c), 0);
    // 강병 병종: 훈련 가산 (월)
    if (open('강병') && st.units > 0) cs.forEach(c => { if (isFront(c.n, f)) c.train = Math.min(80 + 4 * st.units, c.train + 0.15 * st.units); });
    st.vol = st.vol.map(v => v * 0.9);
    const used = {};
    for (let k = 0; k < 8 && budget > 100; k++) {
      const cand = [];
      const push = (name, unit, w, fn) => { const cost = unit * P; if (cost <= budget) cand.push({ name, cost, sc: w * (0.8 + 0.4 * RND()), fn }); };
      const dtot = st.deg.reduce((s, x) => s + x, 0);
      push('친교', 500, 0.9 * (dtot < 300 ? 1 : 0.6) + (mean(st.deg) < 30 && (open('상략') || open('경륜') || open('강병')) ? 1.0 : 0), () => { const d = bestPart(f, st); if (d < 0) return false; st.deg[d] = Math.min(100, st.deg[d] + 4 * amp(f, PART[d])); return true; });
      if (open('경륜') || open('강병')) push('학습', 400 + (open('경륜') && st.traits < 5 ? 300 : 0) + (open('강병') && st.units < 5 ? 800 : 0), 1.0, () => {
        const d = bestPart(f, st); if (d < 0) return false; st.deg[d] = Math.min(100, st.deg[d] + 3 * amp(f, PART[d]));
        if (open('경륜') && st.deg[d] >= 20 && st.traits < 5) { st.traits++; const g = gensOf(f)[Math.floor(RND() * gensOf(f).length)]; if (g) { const k2 = ['t', 'w', 'i', 'p', 'c'][Math.floor(RND() * 5)]; g[k2] = Math.min(100, g[k2] + 2); } }
        if (open('강병') && st.deg[d] >= 40 && st.units < 5) st.units++;
        return true; });
      if (open('경륜')) { const avail = st.deg.reduce((s, x) => s + (x >= 100 ? 6 : x >= 80 ? 5 : x >= 60 ? 3 : 0), 0) - st.found;
        if (avail > 0) push('인물', 500, 1.6, () => { const cn = capitalOf(f); const g = spawnRandom(cn); g.st = '현역'; g.fac = f; g.loc = cn; g.loy = 70; st.found++; IT.foundTot++; return true; }); }
      if (PR.rec && open('경륜') && st.deg.some(x => x >= 20)) push('연수', 700, 0.9, () => { const gs = gensOf(f); const g = gs[Math.floor(RND() * gs.length)]; if (!g) return false; const k2 = ['t', 'w', 'i', 'p', 'c'][Math.floor(RND() * 5)]; g[k2] = Math.min(100, g[k2] + 1); st.drill = (st.drill || 0) + 1; return true; });
      if (open('상략')) { const dAvg = mean(st.deg); const capT = 1.5 * incF * mean([0, 1, 2, 3].map(d => amp(f, PART[d])));
        if (dAvg > 3) { const x0 = Math.min(budget / P, capT * 0.5); if (x0 > 200) { const o = { name: '차익', cost: 0, sc: 1.5 * (0.8 + 0.4 * RND()), noBudget: 1, fn: () => {
          const vtot = st.vol.reduce((s, v) => s + v, 0); const sat = Math.max(0.2, 1 - vtot / Math.max(1, capT));
          const margin = (PR.rec ? 0.06 + 0.14 * dAvg / 100 : 0.03 + 0.10 * dAvg / 100) * sat; const profit = x0 * margin * P; const fee = 0.01 * x0 * P; cs[0].gold += Math.round(profit - fee); bump(st.gain, '차익', profit); o.cost = fee;
          st.vol[Math.floor(RND() * 4)] += x0; return true; } }; cand.push(o); } }
        const fc = frontCity(f); if (fc) { const mc = mercCost(fc, 2000); const rsv = reserveOf(fc, f); if (fc.gold > mc + rsv * 2 && garrisonCap(fc) - fc.troops > 2000) { const gg = gensIn(fc.n, f).find(g => !g.acted && !g.away && !(g.inj > 0)); if (gg) cand.push({ name: '용병', cost: 0, sc: 1.2 * (0.8 + 0.4 * RND()), fn: () => { const r = cmdMerc(fc.n, gg.n, 2000); if (r.ok) { bump(st.spend, '용병', mc); st.merc = (st.merc || 0) + 2000; } return false; } }); } } }
      if (PR.r3) { // 고가품: 교역도(방면별 최고)가 문턱을 넘을수록 등급 해금. 누구나 판매 가능, 상략은 상위 등급 증폭
        const best = Math.max(...st.deg), tier = PR.lux.filter(x => best >= x).length;
        if (tier > 0) { const mer = root === '상략'; const capL = PR.luxCap * incF * (mer ? PR.luxMer : 1) * tier; st.volL = st.volL || 0;
          const sat = Math.max(0.2, 1 - st.volL / Math.max(1, capL)); const x0 = Math.min(budget / P + capL * 0.5, capL * 0.5);
          if (x0 > 200) { const o = { name: '고가품', cost: 0, sc: 1.4 * (0.8 + 0.4 * RND()), noBudget: 1, fn: () => {
            const mg = PR.luxM[tier - 1] * (mer && tier >= 2 ? PR.luxMer : 1) * sat; const profit = x0 * mg * P, fee = 0.01 * x0 * P;
            cs[0].gold += Math.round(profit - fee); bump(st.gain, '고가품', profit); o.cost = fee; st.volL = st.volL * 0.9 + x0; st.tier = tier;
            luxSink(f, cs, profit * PR.sinkFrac, P); return true; } }; cand.push(o); } } }
      if (open('강병') && st.deg.some(x => x >= 40)) push('물자', 1000, 1.3, () => { const fc = frontCity(f); if (!fc) return false; installArms(); const t = ['보병', '궁병', '기병'].sort((x, y) => (fc.arm[x] || 0) - (fc.arm[y] || 0))[0]; fc.arm[t] = (fc.arm[t] || 0) + 8; fc.train = Math.min(100, fc.train + 2); return true; });
      if (open('덕화')) {
        const lo = cs.slice().sort((x, y) => x.loy - y.loy)[0]; const fd = cs.slice().sort((x, y) => y.food - x.food)[0];
        if (lo && fd.food > 20000 && (!PR.rec || fd.food - 3000 >= Math.ceil(fd.troops / ECO.troopFood) * PR.foodFloor)) push('민생', 600, 1.1, () => { lo.pop = Math.round(lo.pop * 1.01); lo.loy = Math.min(100, lo.loy + 4); fd.food -= 3000; bump(st.food, '민생', 3000); return true; });
        const fcs = cs.filter(c => c.food > Math.ceil(c.troops / ECO.troopFood) * (PR.rec ? PR.foodFloor : 14) + 6000 && isFront(c.n, f)).sort((x, y) => y.food - x.food)[0];
        if (fcs) { installArms(); push('군비화', 300, 1.4, () => { const t = ['보병', '궁병', '기병'].sort((x, y) => (fcs.arm[x] || 0) - (fcs.arm[y] || 0))[0]; fcs.arm[t] = (fcs.arm[t] || 0) + 2; fcs.food -= 6000; bump(st.food, '군비화', 6000); return true; }); }
        // 군량 판매: 잉여 군량(필요 30개월 초과)을 철마다가 아니라 항상 팔 수 있음 (+15%)
        cs.forEach(c => { const need = Math.ceil(c.troops / ECO.troopFood); const ex = c.food - need * (PR.rec ? PR.foodFloor : 30); if (ex > 20000) { const amt = Math.min(50000, Math.floor(ex / 1000) * 1000); const g = Math.floor(amt / 100 * foodPrice(c) * 1.15); c.food -= amt; c.gold += g; bump(st.gain, '군량판매', g); bump(st.food, '군량판매', amt); } });
      }
      if (!cand.length) break;
      cand.forEach(o => { o.sc = o.sc0 !== undefined ? o.sc0 : o.sc; });
      cand.forEach(o => { o.sc *= Math.pow(0.5, used[o.name] || 0) / P; });
      cand.sort((x, y) => y.sc - x.sc); const ch = cand[0]; used[ch.name] = (used[ch.name] || 0) + 1;
      const ok = ch.fn(); if (ok) { st.act = st.act || {}; st.act[ch.name] = (st.act[ch.name] || 0) + 1; }
      if (ch.name === '용병') continue;
      if (ok || ch.noBudget) { if (!ch.noBudget) { drawGold(f, ch.cost); budget -= ch.cost; } bump(st.spend, ch.name, ch.cost); } else break;
    }
  }

  // ---- 한 달 ----
  function month() {
    const pend = endMonth();
    pend.forEach(d => {
      const fc = C(d.from), g0 = fc.gold; let r = null; try { r = autoBattle(d.att, d.from, d.to, d.units); } catch (e) { }
      const df = C(d.to).owner; // 점령 전 소유자는 autoBattle 안에서 바뀌므로 승패만 기록
      const win = !!(r && r.win);  const sa = IT.st[d.att]; if (sa) { win ? sa.bw++ : sa.bl++; }
      const sd = df && IT.st[df]; if (sd) { win ? sd.dl++ : sd.dw++; }
      if (win) fc.food += d.food; else fc.food += d.food;
      if (D && !PR.noPrice) { const sp = Math.max(0, g0 - fc.gold); const ex = Math.min(fc.gold, Math.round(sp * ((price(d.att) || 1) - 1))); if (ex > 0) { fc.gold -= ex; if (sa) sa.extra.sortie += ex; } }
    });
    monthlyUpdate(); IT.month++;
  }
  // 월 갱신 뒤: 비용·수입에 물가 얹기, 교역, 물가 갱신
  { const f = monthlyUpdate; monthlyUpdate = function () {
    const r = f.apply(this, arguments);
    if (D) try {
      if (!IT) return r;
      Object.keys(S.fac).forEach(fid => { if (S.fac[fid].alive && !IT.st[fid]) initFac(fid); });
      if (!PR.noPrice) Object.values(S.city).forEach(c => {
        if (!c.owner || !isCity(c)) return; const p = price(c.owner) || 1; const st = IT.st[c.owner];
        // 소득 전가 (명목 수입 증가)
        const inc = realInc(c); if (st) st.incSum += inc; c.gold += Math.round(inc * PR.pass * (p - 1));
        // 병사 금 유지비 + 도시 행정비 + 도시 유지비(v51)에 물가
        const base = Math.ceil(Math.max(0, c.troops + Math.min(c.merc || 0, c.troops) - 3000) / ECO.troopGold) + (ECO.admin[c.tier] || 0) + upkeepOf(c);
        const ex = Math.round(base * (p - 1));
        if (c.gold >= ex) c.gold -= ex; else { c.gold = 0; const dd = Math.floor(c.troops * 0.02); c.troops -= dd; c.loy = clampN(c.loy - 1, 0, 100); if (st) st.bank++; }
        if (st) st.extra.upkeep += ex;
        if (PR.r3 && st && st.root === '덕화' && c.pop) { const tt = PR.popT.filter(x => c.pop >= x).length; if (tt > 0) { c.gold += Math.round(inc * PR.popInc * tt); c.loy = Math.min(100, c.loy + PR.popLoy * tt); st.popTier = (st.popTier || 0) + tt; st.popN = (st.popN || 0) + 1;
          if (RND() < PR.popFind * tt) { const g = spawnRandom(c.n); g.st = '현역'; g.fac = c.owner; g.loc = c.n; g.loy = 70; st.dFound = (st.dFound || 0) + 1; } } }
        if (PR.popGrow > 0 && st && st.root === '덕화' && c.pop != null) { const mx = popMax(c); if (c.pop < mx) { const dp = Math.round((mx - c.pop) * PR.popGrow * (0.5 + c.loy / 100)); c.pop += dp; st.popGrowSum = (st.popGrowSum || 0) + dp; } } // E안: 덕화 소속 도시 인구 증가율 가산
        if (PR.r3 && PR.foodBuyN > 0 && st && st.root === '덕화') { const need = Math.ceil(c.troops / ECO.troopFood); // 덕화 군량 하한: 하한 밑이면 금으로 사들임
          if (c.food < need * PR.foodBuyN && c.gold > reserveOf(c, c.owner) + 1000) { const amt = Math.min(need * 3, Math.floor((c.gold - reserveOf(c, c.owner)) / foodBuyPrice(c) * 100 / 1000) * 1000); if (amt >= 1000) { try { cmdFoodTrade(c.n, 'buy', amt); st.fbuy = (st.fbuy || 0) + amt; } catch (e) { } } } }
        if (PR.rec) { const exc = c.gold - PR.holdN * inc * p; if (exc > 0) { const h = Math.round(exc * PR.holdRate); c.gold -= h; if (st) st.extra.hold = (st.extra.hold || 0) + h; } } // 보유량 항
      });
      if (!PR.noTrade) Object.keys(S.fac).forEach(fid => { if (S.fac[fid].alive) tradeTurn(fid); });
      updatePrice();
    } catch (e) { IT.err = (IT.err || 0) + 1; IT.lastErr = String(e && e.stack || e).slice(0, 300); }
    return r; }; }
  { const f = aiTurn; aiTurn = function (fid) { CURF = fid; try { return f.apply(this, arguments); } finally { CURF = null; } }; }
  { const f = armCost; armCost = function (c, k) { const v = f.apply(this, arguments); if (D && !PR.noPrice && c && c.owner) { const p = price(c.owner) || 1; return Math.round(v * p / 10) * 10; } return v; }; }
  if (PR.rec) { const f = reserveOf; reserveOf = function (c, fid) { const v = f.apply(this, arguments); return Math.round(v * (D && IT && fid ? price(fid) || 1 : 1)); }; } // 예비금 물가 반영
  const origPrice = priceIdx;
  priceIdx = function () { if (D && !PR.noPrice && IT) { return price(CURF) || 1; } return origPrice(); };

  // ---- 계측: 도시 소유자 변경 원인 태그 (c.took). 동작은 바꾸지 않고 소유자 diff 로만 기록 ----
  const OWN = () => { const o = {}; Object.values(S.city).forEach(c => { o[c.n] = c.owner || null; }); return o; };
  function syncOwn(tag, tagFn) {
    if (!IT || !IT.ow) return;
    Object.values(S.city).forEach(c => { const old = IT.ow[c.n] || null, now = c.owner || null; if (old === now) return;
      const t = (tagFn && tagFn(c, old, now)) || tag; c.took = t; c.tookAt = IT.month; IT.ow[c.n] = now;
      if (now) { const a = (IT.acq[now] = IT.acq[now] || {}); a[t] = (a[t] || 0) + 1; }
      if (old) { const l = (IT.lost[old] = IT.lost[old] || {}); l[t] = (l[t] || 0) + 1; }
      IT.evt[t] = (IT.evt[t] || 0) + 1; });
  }
  function wrapTag(name, tagOf) { const f = globalThis[name]; if (typeof f !== 'function') { PRINT('wrap 실패', name); return; }
    globalThis[name] = function () { const tg = tagOf ? tagOf.apply(this, arguments) : null; const r = f.apply(this, arguments); syncOwn(tg || name); return r; }; }
  wrapTag('captureCity', () => '전투');
  // E안: 덕화 도시가 침략당하면 의용병이 항상 등장. 규모 V = min(인구×(민충/100)×volK, 인구×volCap), 인구에서 빠지고 훈련도는 volTrain으로 섞임. AI 공격·위임 전투 모두 autoBattle을 지난다
  if (PR.volun) { const ab = autoBattle; autoBattle = function (att, fromCn, toCn, units) {
    let vrec = null; try { const tc0 = C(toCn), dfo = tc0 && tc0.owner; if (IT && D && dfo && dfo !== att && IT.st[dfo] && IT.st[dfo].root === '덕화' && tc0.pop > 0) { const V = Math.floor(Math.min(tc0.pop * (tc0.loy / 100) * PR.volK, tc0.pop * PR.volCap) / 100) * 100;
      if (V > 0) { const t0 = tc0.troops; const aT = (units || []).reduce((s, u) => s + u.troops, 0); vrec = { f: dfo, c: toCn, V, t0, aT, pop: tc0.pop, loy: tc0.loy, m: IT.month }; if (!PR.volDry) { tc0.pop -= V; tc0.train = Math.round((tc0.train * t0 + PR.volTrain * V) / (t0 + V)); tc0.troops += V; } } } } catch (e) { vrec = null; }
    const r = ab.apply(this, arguments);
    if (vrec) { vrec.win = !!(r && r.win); (IT.volLog = IT.volLog || []).push(vrec); const sd = IT.st[vrec.f]; if (sd) { sd.vN = (sd.vN || 0) + 1; vrec.win ? sd.vL = (sd.vL || 0) + 1 : sd.vW = (sd.vW || 0) + 1; } }
    return r; }; }

  wrapTag('absorbFaction', () => '항복');
  wrapTag('aiAbsorb', () => '항복');
  wrapTag('rebel', () => '독립');
  wrapTag('cmdScheme', (cn, an, type) => type === '매수' ? '매수' : '계략기타');
  wrapTag('cmdDiplo', (cn, en, tf, type) => type === '매입' ? '매입' : type === '할양' ? '할양' : '항복');
  { const f = monthlyUpdate; monthlyUpdate = function () { const cq = {}; if (IT) Object.values(S.city).forEach(c => { if (c.conq) cq[c.n] = c.conq.from; });
    const r = f.apply(this, arguments); syncOwn('기타', (c, old, now) => (cq[c.n] && cq[c.n] === now) ? '환원' : null); return r; }; }
  { const f = aiTurn; aiTurn = function () { const r = f.apply(this, arguments); syncOwn('기타'); return r; }; }

  // ================= §21 서명 장치 시험 레이어 (PR.devices: "gwisun,idan,tuhang,merc,maesu,dhx" 또는 "all") =================
  // 켜지 않으면 아래 래퍼는 원본을 그대로 부른다(난수 소비 없음). 장치는 별도 난수열(DR)을 써서 기준선과 짝지어 비교하기 쉽게 한다.
  const DVS = String(PR.devices || '').split(',').map(s => s.trim()).filter(Boolean);
  const DV = k => DVS.includes('all') || DVS.includes(k);
  const ANYDV = DVS.length > 0;
  let dseed = ((PR.seed >>> 0) ^ 0x9E3779B9) >>> 0;
  const DR = () => { dseed = (dseed + 0x6D2B79F5) >>> 0; let t = dseed; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const dbump = (k, v) => { IT.dv = IT.dv || {}; IT.dv[k] = (IT.dv[k] || 0) + (v === undefined ? 1 : v); };
  const rootOf = f => (IT && IT.st && IT.st[f] && IT.st[f].root) || 'none';
  const hashN = s => { let h = 0; for (const ch of String(s)) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return h; };
  const KIN = ['부자', '형제', '의형제'];
  function kinOrBond(a, b) { // 혈연·의형제·옛 은인
    if (!a || !b) return false;
    if (RELS.some(x => KIN.includes(x.종류) && x.장수.includes(a) && x.장수.includes(b))) return true;
    const e = S.bond && S.bond[bkey(a, b)]; return !!(e && (e.t.includes('결의 형제') || e.t.includes('은인')));
  }
  const oppAllied = (a, b) => allied(a, b) || hasPact(a, b);

  // ---- 경륜: 포섭도 + 귀순 ----
  function swayGain(ag, gv) {
    let v = 10 + (stat(ag, 'c') - 60) / 4 + (stat(ag, 'i') - stat(gv, 'i')) / 5 - Math.abs(axisOf(ag.n) - axisOf(gv.n)) / 5 - (gv.ui || 0) * (PR.swayUiK === undefined ? 1.5 : PR.swayUiK);
    if (bget(ag.n, gv.n) >= 20 || kinOrBond(ag.n, gv.n)) v += 8; // 인맥(옛 동료·혈연·은인)
    return Math.max(2, v) * (PR.swayMul || 1);
  }
  function swayEntry(f, gn) { S.sway[f] = S.sway[f] || {}; return S.sway[f][gn] || (S.sway[f][gn] = { v: 0, fail: 0 }); }
  function swayAct(f) {
    const cands = [];
    Object.values(S.city).forEach(c => {
      if (!c.owner || c.owner === f || !isCity(c) || !c.gov || oppAllied(f, c.owner)) return;
      const g = G(c.gov); if (!g || g.st !== '현역' || g.fac !== c.owner || isRuler(g) || capitalOf(c.owner) === c.n) return;
      const near = ADJ[c.n].filter(n => S.city[n] && S.city[n].owner === f); if (!near.length) return;
      dbump('swayAdjGov'); if (g.loy < 65) dbump('swayLoyOk'); if ((g.ui || 0) < 12) dbump('swayUiOk'); dbump('swayLoySum', g.loy); dbump('swayUiSum', g.ui || 0);
      if (!PR.swayAll && ((!PR.swayProb && g.loy >= (PR.swayLoy || 60) + 5) || (PR.swayProb && g.loy >= 95) || (g.ui || 0) >= 12)) return;
      const e = S.sway[f] && S.sway[f][g.n];
      cands.push({ c, g, near, sc: (e ? e.v : 0) + (65 - g.loy) / 2 - (g.ui || 0) });
    });
    cands.sort((a, b) => b.sc - a.sc); dbump('swayCall'); dbump('swayCandSum', cands.length);
    let used = 0; const maxA = PR.swayAgents || 2;
    for (const t of cands) {
      if (used >= maxA) break;
      const ags = []; t.near.forEach(n => freeGens(n, f).forEach(g => { if (!isRuler(g) && !g.acted) ags.push(g); }));
      ags.sort((a, b) => stat(b, 'c') - stat(a, 'c'));
      while (ags.length && used < maxA) { const ag = ags.shift(); const e = swayEntry(f, t.g.n); const gn0 = swayGain(ag, t.g); e.v = Math.min(100, e.v + gn0); ag.acted = true; used++; dbump('swayAct'); dbump('swayGainSum', Math.round(gn0)); IT.dv.swayPeak = Math.max(IT.dv.swayPeak || 0, Math.round(e.v)); }
      if (used) break; // 이번 달은 한 표적에 집중
    }
  }
  function guisunExec(f, c, g, o) {
    const ratio = 0.5 + 0.3 * clampN((g.t - 40) / 50, 0, 1);
    const keep = Math.round(c.troops * ratio / 10) * 10, rest = c.troops - keep;
    const cap = capitalOf(o);
    // 나머지는 원 세력 인접 도시로 후퇴, 없으면 소멸
    const back = ADJ[c.n].map(C).filter(x => x.owner === o).sort((a, b) => a.troops - b.troops)[0];
    if (back && rest > 0) { back.troops += Math.min(rest, Math.max(0, garrisonCap(back) - back.troops)); }
    gensIn(c.n, o).forEach(x => {
      if (x === g) return;
      const e = S.sway[f] && S.sway[f][x.n];
      if (e && e.v >= 50 && !isRuler(x)) { joinFac(x, f, c.n, 70); x.guisunAt = IT.month; dbump('guisunJoin'); } else { x.loc = cap || x.loc; dbump('guisunRetreat'); }
    });
    c.owner = f; c.troops = keep; c.gov = g.n; joinFac(g, f, c.n, 75); g.guisunAt = IT.month; IT.low[c.n] = 0;
    Object.keys(S.sway).forEach(ff => { if (S.sway[ff]) delete S.sway[ff][g.n]; });
    syncOwn('귀순'); dbump('guisun');
  }
  function swayStep() {
    S.sway = S.sway || {};
    Object.keys(S.sway).forEach(f => {
      if (!S.fac[f] || !S.fac[f].alive) { delete S.sway[f]; return; }
      Object.keys(S.sway[f] || {}).forEach(gn => {
        const e = S.sway[f][gn]; if (!e || e.v < 100) return;
        const g = G(gn); const c = g && C(g.loc); const o = g && g.fac;
        if (!g || g.st !== '현역' || !o || o === f || !c || c.gov !== gn || c.owner !== o || !S.fac[o] || !S.fac[o].alive) { delete S.sway[f][gn]; return; }
        const ruler = S.fac[o].ruler; const why = [];
        if (!((PR.swayProb ? DR() < clampN((100 - g.loy) / (PR.swayDiv || 60), 0, 1) : g.loy < (PR.swayLoy || 60)) && (g.ui || 0) < 12)) why.push('충성의리');
        if (isRuler(g) || kinOrBond(g.n, ruler) || capitalOf(o) === c.n) why.push('군주수도혈연');
        const opp = gensIn(c.n, o).filter(x => x !== g && x.loy >= 70).reduce((s, x) => s + x.t, 0);
        if (!(opp < g.t * 1.5)) why.push('반대파');
        if (bget(g.n, ruler) >= 80) why.push('관계');
        if (!why.length) { guisunExec(f, c, g, o); return; }
        e.fail++; dbump('swayBlock_' + why[0]);
        if (e.fail >= 3) { e.v = 50; e.fail = 0; dbump('swayReset'); }
      });
    });
    // 월 감소는 판정 뒤에(100 도달 직후 −3 으로 97 이 되어 영영 판정이 안 되던 버그 수정)
    Object.keys(S.sway).forEach(f => { const m = S.sway[f]; Object.keys(m).forEach(gn => { m[gn].v -= 3; if (m[gn].v <= 0) delete m[gn]; }); });
  }
  // 귀순 태수 24개월 이적 확률 절반: 원본의 월 3% 이적 판정에서 절반은 의리를 임시로 올려 건너뛴다
  function halfDefectPre() {
    const tmp = [];
    Object.values(S.gen).forEach(g => { if (g.guisunAt !== undefined && IT.month - g.guisunAt < 24 && g.st === '현역' && g.loy < 55 && (g.ui || 0) < 10 && DR() < 0.5) { tmp.push([g, g.ui || 0]); g.ui = 99; dbump('halfDefect'); } });
    return tmp;
  }

  // ---- 상략: 동맹 이간 ----
  function breakPair(A, B) {
    if (S.fac[A]) { delete S.fac[A].ally[B]; if (S.fac[A].pact) delete S.fac[A].pact[B]; if (S.fac[A].wed) delete S.fac[A].wed[B]; }
    if (S.fac[B]) { delete S.fac[B].ally[A]; if (S.fac[B].pact) delete S.fac[B].pact[A]; if (S.fac[B].wed) delete S.fac[B].wed[A]; }
  }
  function idanTry(f, A, B, ag, c, cost) {
    const pk = A < B ? A + '|' + B : B + '|' + A;
    IT.idCd = IT.idCd || {}; IT.idFac = IT.idFac || {};
    if ((IT.idCd[pk] || 0) > IT.month || (IT.idFac[f] || 0) > IT.month) return false;
    if (c.gold < cost) return false;
    c.gold -= cost; ag.acted = true; IT.idCd[pk] = IT.month + 12; IT.idFac[f] = IT.month + 3;
    const ra = G(S.fac[A].ruler), rb = G(S.fac[B].ruler);
    const wed = (S.fac[A].wed && S.fac[A].wed[B]);
    let p = 20 + (stat(ag, 'i') - Math.max(stat(ra, 'i'), stat(rb, 'i'))) / 2 + hos(A, B) / 3 + (S.spy && S.spy[A] > S.y * 12 + S.m ? 10 : 0) - (wed ? 25 : 0);
    p = clampN(Math.round(p), 0, 70); dbump('idanTry'); dbump('idanGold', cost);
    if (DR() * 100 < p) {
      breakPair(A, B); setHos(A, B, hos(A, B) + 20); IT.noAlly = IT.noAlly || {}; IT.noAlly[pk] = IT.month + 12; dbump('idanOk'); return true;
    }
    setHos(A, f, hos(A, f) + 15); setHos(B, f, hos(B, f) + 15); dbump('idanFail'); return false;
  }
  function idanAI(f) {
    if ((IT.month + hashN(f)) % 6 !== 0) return;
    const F = S.fac[f]; const E = F.lord && F.lord.enemy; dbump('idanCall'); if (!E || !S.fac[E] || !S.fac[E].alive) return; dbump('idanHasEnemy');
    const cs = citiesOf(f).filter(isCity); if (!cs.length) return;
    const surplus = cs.reduce((s, c) => s + Math.max(0, c.gold - reserveOf(c, f)), 0); if (surplus <= 1000) return;
    let X = Object.keys(S.fac[E].ally).filter(x => x !== f && S.fac[x] && S.fac[x].alive && S.fac[E].ally[x] > 0 && S.fac[E].ally[x] < 900)[0]; let A = E;
    if (!X && PR.idanAny) { const pr = []; Object.keys(S.fac).forEach(a => { if (a === f || !S.fac[a].alive) return; Object.keys(S.fac[a].ally || {}).forEach(b => { if (b > a && b !== f && S.fac[b] && S.fac[b].alive && S.fac[a].ally[b] > 0 && S.fac[a].ally[b] < 900 && (lordNeigh(f).includes(a) || lordNeigh(f).includes(b))) pr.push([a, b]); }); }); if (pr.length) { const q = pr[Math.floor(DR() * pr.length)]; A = q[0]; X = q[1]; } }
    if (!X) return; dbump('idanHasAlly');
    const nb = lordNeigh(f); if (!nb.includes(A) && !nb.includes(X)) return;
    const P0 = (D && !PR.noPrice ? price(f) : 1) || 1; const cost = Math.round(400 * P0);
    const rc = cs.slice().sort((a, b) => (b.gold - reserveOf(b, f)) - (a.gold - reserveOf(a, f)))[0]; if (rc.gold - reserveOf(rc, f) < cost) return;
    const ag = gensOf(f).filter(g => !g.acted && !g.away && !(g.inj > 0) && !isRuler(g)).sort((a, b) => stat(b, 'i') - stat(a, 'i'))[0]; if (!ag) return;
    idanTry(f, A, X, ag, rc, cost);
  }
  // ---- 상략: 매수 AI ----
  function maesuAI(f) {
    if ((IT.month + hashN(f)) % 3 !== 0) return;
    const cs = citiesOf(f).filter(isCity); let best = null;
    cs.forEach(c => {
      const gold = c.gold - reserveOf(c, f) - 500; dbump('maesuCityScan'); if (gold <= 0) return; dbump('maesuGoldOk');
      const ag = freeGens(c.n, f).filter(g => !isRuler(g)).sort((a, b) => stat(b, 'i') - stat(a, 'i'))[0]; if (!ag) return;
      ADJ[c.n].forEach(n => { const tc = S.city[n]; if (!tc || !tc.owner || tc.owner === f || !isCity(tc) || oppAllied(f, tc.owner) || !tc.gov) return;
        const tg = G(tc.gov); if (!tg || tg.st !== '현역' || isRuler(tg) || capitalOf(tc.owner) === tc.n) return;
        const price = Math.round(cityPrice(tc) * 0.5 * (PR.maesuK === undefined ? 1 : PR.maesuK) / 100) * 100; dbump('maesuTgt'); dbump('maesuPriceSum', price); dbump('maesuGoldSum', gold); if (price > gold) return; dbump('maesuPriceOk');
        const ch = schemeChance(ag, tg, '매수') + ((PR.maesuBonus && schemeChance(ag, tg, '매수') >= 0) ? PR.maesuBonus : 0); dbump('maesuChSum', ch); if (ch < (PR.maesuMin === undefined ? 35 : PR.maesuMin)) return;
        if (!best || ch > best.ch) best = { c, ag, tc, ch }; });
    });
    if (!best) return;
    const cp0 = cityPrice; if (PR.maesuK !== undefined) cityPrice = c => Math.round(cp0(c) * PR.maesuK / 100) * 100; const sc0 = schemeChance; if (PR.maesuBonus) schemeChance = function (a, t, ty) { const q = sc0.apply(this, arguments); return ty === '매수' && q >= 0 ? Math.min(95, q + PR.maesuBonus) : q; }; let r; try { r = cmdScheme(best.c.n, best.ag.n, '매수', best.tc.n); } finally { cityPrice = cp0; schemeChance = sc0; } dbump('maesuTry'); if (r && r.ok) dbump('maesuOk');
  }
  // ---- 용병: 계약제 + 상략 가중 + 상략 AI ----
  function mercExpire() {
    IT.mercs = (IT.mercs || []).filter(h => {
      if (h.until > IT.month) return true;
      const c = C(h.cn); const x = Math.min(h.amt, c.merc || 0, c.troops); if (x > 0) { c.merc -= x; c.troops -= x; dbump('mercDisbandN', x); } dbump('mercDisband'); return false; });
  }
  function mercAI(f) {
    const cs = citiesOf(f).filter(isCity); const T = cs.reduce((s, c) => s + c.troops, 0), M = cs.reduce((s, c) => s + Math.min(c.merc || 0, c.troops), 0);
    if (M >= 0.3 * T) return;
    const c = cs.filter(x => isFront(x.n, f) && cityThreat(x, f) > 0.8).sort((a, b) => cityThreat(b, f) - cityThreat(a, f))[0]; if (!c) return;
    if (c.gold <= reserveOf(c, f) + mercCost(c, 2000) * 2) return;
    const g = freeGens(c.n, f)[0]; if (!g) return; const amt = Math.min(2000, Math.floor((0.3 * T - M) / 100) * 100); if (amt < 500) return;
    const r = cmdMerc(c.n, g.n, amt); if (r && r.ok) dbump('mercAI');
  }
  { const f = mercCost; mercCost = function (c, amt) { const v = f.apply(this, arguments); return (ANYDV && DV('merc') && c && c.owner && rootOf(c.owner) === '상략') ? Math.round(v * 0.8) : v; }; }
  { const f = cmdMerc; cmdMerc = function (cn, gn, amt) {
    if (!(ANYDV && DV('merc'))) return f.apply(this, arguments);
    const c = C(cn); const t0 = c.troops, tr0 = c.train; const r = f.apply(this, arguments);
    if (r && r.ok) { const got = c.troops - t0;
      if (rootOf(c.owner) === '상략') { c.train = Math.round((tr0 * t0 + 40 * got) / Math.max(1, c.troops)); dbump('mercHire상략'); } else dbump('mercHire기타');
      (IT.mercs = IT.mercs || []).push({ cn, amt: got, until: IT.month + 12 }); }
    return r; }; }

  // ---- 덕화: 덕망 파급 + 민심 투항 ----
  function tuhangStep() {
    const mo = IT.month; IT.low = IT.low || {}; IT.exempt = IT.exempt || {}; IT.tlog = IT.tlog || {};
    // 파급
    const hit = {};
    Object.values(S.city).forEach(c => {
      if (!c.owner || !isCity(c) || rootOf(c.owner) !== '덕화' || c.loy < 80) return;
      ADJ[c.n].forEach(n => { const t = S.city[n]; if (!t || !t.owner || t.owner === c.owner || !isCity(t) || oppAllied(c.owner, t.owner) || t.loy >= c.loy) return;
        if ((hit[n] || 0) >= 2) return; const d = Math.min(0.8, 2 - (hit[n] || 0)); hit[n] = (hit[n] || 0) + d; t.loy = Math.max(0, t.loy - d);
        const mv = Math.round(t.pop * 0.003); if (mv > 0) { t.pop -= mv; c.pop += mv; } dbump('spread'); });
    });
    // 저민충 연속 개월
    Object.values(S.city).forEach(c => { if (!c.owner || !isCity(c)) { IT.low[c.n] = 0; return; } IT.low[c.n] = c.loy < (PR.tuLow || 30) ? (IT.low[c.n] || 0) + 1 : 0; });
    // 투항 판정
    Object.values(S.city).forEach(n => {
      if (!n.owner || !isCity(n) || (IT.low[n.n] || 0) < 4) return;
      const o = n.owner; if (capitalOf(o) === n.n) { dbump('tuhangCapital'); return; }
      if ((IT.exempt[n.n] || 0) > mo) { dbump('tuhangExempt'); return; }
      const nbs = ADJ[n.n].map(C).filter(m => m.owner && m.owner !== o && isCity(m) && rootOf(m.owner) === '덕화' && m.loy >= 70 && !oppAllied(m.owner, o)).sort((a, b) => b.loy - a.loy);
      if (!nbs.length) { dbump('tuhangNoNeighbor'); return; }
      if (!(DR() * 2 * (PR.tuLow || 30) < (PR.tuLow || 30) - n.loy)) return;
      const f = nbs[0].owner;
      if (n.troops >= 0.6 * garrisonCap(n)) { n.loy = Math.max(0, n.loy - 5); dbump('tuhangSuppress'); return; }
      const lg = (IT.tlog[f] = (IT.tlog[f] || []).filter(t => mo - t < 12)); if (lg.length >= 2) { dbump('tuhangCap12'); return; }
      lg.push(mo);
      // 투항 실행
      const cap = capitalOf(o);
      gensIn(n.n, o).forEach(g => { g.loc = cap || g.loc; });
      n.owner = f; n.troops = Math.round(n.troops * 0.3); n.loy = 50; n.gov = null; autoGov(n); n.conq = { from: o, t: S.y * 12 + S.m }; IT.low[n.n] = 0;
      ADJ[n.n].map(C).forEach(m => { if (m.owner === o) IT.exempt[m.n] = mo + 6; });
      syncOwn('투항'); dbump('tuhang'); (IT.dvlog = IT.dvlog || []).push([mo, f, o, n.n]);
    });
  }
  // ---- 덕화 conqEff / 징병 / 법치·덕치 소속 가중 ----
  { const f = conqEff; conqEff = function (c) {
    if (ANYDV && DV('dhx') && c && c.conq && c.owner && rootOf(c.owner) === '덕화') { const t = S.y * 12 + S.m - c.conq.t; const dur = Math.max(12, 18); return t >= dur ? 1 : 0.7 + 0.3 * t / dur; }
    return f.apply(this, arguments); }; }
  { const f = facTroopCap; facTroopCap = function (fid) {
    if (ANYDV && DV('dhx') && rootOf(fid) === '덕화') return Math.floor(citiesOf(fid).reduce((s, c) => s + (c.pop || 0), 0) * Math.min(0.6, ECO.draftShare + 0.10));
    return f.apply(this, arguments); }; }
  { const f = cmdDraft; cmdDraft = function (cn, gn, amt) {
    if (!(ANYDV && DV('dhx'))) return f.apply(this, arguments);
    const c = C(cn); const l0 = c.loy, t0 = c.troops; const r = f.apply(this, arguments);
    if (r && r.ok && c.owner && rootOf(c.owner) === '덕화' && l0 >= 70 && c.troops > t0) c.train = Math.round(c.train + 5 * (c.troops - t0) / c.troops);
    return r; }; }
  function polAdjust() { // 법치(점령지 민충 +2)·덕치(전 도시 +0.6): 덕화 소속 1.0, 그 외 0.6 → 비소속은 차액을 되돌린다
    Object.values(S.city).forEach(c => { if (!c.owner || rootOf(c.owner) === '덕화') return;
      if (c.conq && hasPol(c.owner, '법치')) c.loy = Math.max(0, c.loy - 0.8);
      if (hasPol(c.owner, '덕치')) c.loy = Math.max(0, c.loy - 0.24); });
  }

  // ---- AI 턴 앞에서 장치 행동 배정(AI가 장수를 다 쓰기 전에 설득·이간·매수·용병 담당을 먼저 뽑는다) ----
  { const f = aiTurn; aiTurn = function (fid) {
    if (ANYDV && IT && S.fac[fid] && S.fac[fid].alive) { const rt = rootOf(fid);
      try { if (rt === '경륜' && DV('gwisun')) swayAct(fid); if (rt === '상략') { if (DV('idan')) idanAI(fid); if (DV('maesu')) maesuAI(fid); if (DV('merc')) mercAI(fid); } } catch (e) { IT.err = (IT.err || 0) + 1; IT.lastErr = 'ai ' + String(e && e.stack || e).slice(0, 300); } }
    return f.apply(this, arguments); }; }
  // ---- 작동 확인용 강제 시험(PR.devtest): 3개월째 조건을 강제로 만들어 실행 경로를 지나게 한다. 결과 비교에는 쓰지 않는다 ----
  function devTest() {
    S.sway = S.sway || {};
    if (IT.month === 3 && DV('gwisun')) { let n = 0; Object.keys(S.fac).forEach(f => { if (!S.fac[f].alive || rootOf(f) !== '경륜' || n >= 3) return;
      const c = Object.values(S.city).find(x => x.owner && x.owner !== f && isCity(x) && x.gov && ADJ[x.n].some(a => S.city[a].owner === f) && capitalOf(x.owner) !== x.n && !isRuler(G(x.gov)));
      if (c) { const g = G(c.gov); g.loy = 40; g.ui = 3; swayEntry(f, g.n).v = 110; n++; } }); }
    if (IT.month >= 3 && IT.month < 9 && DV('tuhang')) { Object.values(S.city).forEach(m => { if (!m.owner || rootOf(m.owner) !== '덕화' || !isCity(m)) return;
      m.loy = Math.max(m.loy, 90); ADJ[m.n].forEach(a => { const n = S.city[a]; if (n && n.owner && n.owner !== m.owner && isCity(n) && capitalOf(n.owner) !== n.n && IT.month < 8) { n.loy = 10; if (IT.month === 3) { n.troops = 500; IT.low[n.n] = 3; } } }); }); }
  }
  // ---- 월 갱신에 얹기 ----
  { const f = monthlyUpdate; monthlyUpdate = function () {
    if (!ANYDV || !IT) return f.apply(this, arguments);
    let tmp = [];
    try {
      IT.low = IT.low || {}; if (PR.devtest) devTest();
      if (DV('merc')) mercExpire();
      if (DV('gwisun')) { swayStep(); tmp = halfDefectPre(); }
    } catch (e) { IT.err = (IT.err || 0) + 1; IT.lastErr = 'pre ' + String(e && e.stack || e).slice(0, 300); }
    let r; try { r = f.apply(this, arguments); } finally { tmp.forEach(([g, u]) => { g.ui = u; }); }
    try {
      if (DV('idan') && IT.noAlly) Object.keys(IT.noAlly).forEach(pk => { if (IT.noAlly[pk] > IT.month) { const [a, b] = pk.split('|'); if (S.fac[a] && S.fac[b] && (allied(a, b) || hasPact(a, b))) { breakPair(a, b); dbump('noAllyEnforce'); } } });
      if (DV('merc')) Object.values(S.city).forEach(c => { if (c.owner && rootOf(c.owner) === '상략' && (c.merc || 0) > 0 && c.troops > 0) c.gold += Math.round(0.5 * Math.min(c.merc, c.troops) / ECO.troopGold); });
      if (DV('tuhang')) tuhangStep();
      if (DV('dhx')) polAdjust();
    } catch (e) { IT.err = (IT.err || 0) + 1; IT.lastErr = 'post ' + String(e && e.stack || e).slice(0, 300); }
    return r; }; }

  const snap = fid => { const cs = citiesOf(fid); const ct = cs.filter(isCity); const tr = cs.reduce((s, c) => s + c.troops, 0); const gens = gensOf(fid); const top = gens.map(g => Math.max(g.w, g.t, g.i, g.p)).sort((a, b) => b - a).slice(0, 10);
    const front = ct.filter(c => isFront(c.n, fid)); installArms();
    return { cities: cs.length, troops: tr, gold: cs.reduce((s, c) => s + c.gold, 0), food: cs.reduce((s, c) => s + c.food, 0), gens: gens.length, gq: mean(top), alive: S.fac[fid].alive ? 1 : 0,
      train: mean(ct.map(c => c.train)), arm: mean(front.map(c => mean(Object.values(c.arm || {})))), inc: ct.reduce((s, c) => s + realInc(c), 0), loy: mean(ct.map(c => c.loy)),
      pop: ct.reduce((s, c) => s + (c.pop || 0), 0), nct: ct.length, gm: tr > 0 ? cs.reduce((s, c) => s + c.gold, 0) / (tr / ECO.troopGold) : 0, fm: tr > 0 ? cs.reduce((s, c) => s + c.food, 0) / (tr / ECO.troopFood) : 0 }; };
  function hubMap() { const all = new Set(PORTS.concat(PR.land ? LAND : [])); const o = {}; all.forEach(cn => o[cn] = S.city[cn] ? S.city[cn].owner : null); return o; }

  // ================= 성능 캐시 (동작 불변; PR.nocache 로 끔) =================
  // citiesOf/gensOf 는 매번 전체를 훑는 O(N) 이고 AI 가 O(N²) 로 불러 후반에 느려진다. 소유자·상태 필드에 세터를 달아 버전으로 무효화한다.
  let CV = 0, GV = 0, cMap = null, cVer = -1, cRef = null, gMap = null, gVer = -1, gRef = null, smSet = null, smVer = -1, smRef = null;
  function hookObj(o, keys, bump) { if (Object.prototype.hasOwnProperty.call(o, '__h')) return; Object.defineProperty(o, '__h', { value: 1, enumerable: false });
    keys.forEach(k => { let v = o[k]; Object.defineProperty(o, k, { get() { return v; }, set(x) { if (x !== v) { v = x; bump(); } }, enumerable: true, configurable: true }); }); }
  function cacheBump() { CV++; GV++; }
  if (!PR.nocache) {
    const cOrig = citiesOf, gOrig = gensOf, cmOrig = costMul;
    citiesOf = function (fid) {
      if (cVer !== CV || cRef !== S.city) { Object.values(S.city).forEach(c => hookObj(c, ['owner'], () => { CV++; })); cMap = {}; Object.values(S.city).forEach(c => { if (c.owner) (cMap[c.owner] = cMap[c.owner] || []).push(c); }); cVer = CV; cRef = S.city; }
      if (PR.cachecheck && !globalThis.__bad_citiesOf) { const r = (cMap[fid] || []).map(x => x.n).join(), o = cOrig(fid).map(x => x.n).join(); if (r !== o) { globalThis.__bad_citiesOf = 1; PRINT('캐시불일치 citiesOf', fid, 'm', IT && IT.month, String(new Error().stack).slice(60, 700)); } }
      const a = cMap[fid]; return a ? a.slice() : (fid === undefined || fid === null || fid === '' ? cOrig(fid) : []);
    };
    gensOf = function (fid) {
      if (gVer !== GV || gRef !== S.gen) { Object.values(S.gen).forEach(g => hookObj(g, ['st', 'fac', 'loc'], () => { GV++; })); gMap = {}; Object.values(S.gen).forEach(g => { if (g.st === '현역' && g.fac) (gMap[g.fac] = gMap[g.fac] || []).push(g); }); gVer = GV; gRef = S.gen; }
      if (PR.cachecheck && !globalThis.__bad_gensOf) { const r = (gMap[fid] || []).map(x => x.n).join(), o = gOrig(fid).map(x => x.n).join(); if (r !== o) { globalThis.__bad_gensOf = 1; PRINT('캐시불일치 gensOf', fid, 'm', IT && IT.month, String(new Error().stack).slice(60, 700)); } }
      const a = gMap[fid]; return a ? a.slice() : (fid === undefined || fid === null || fid === '' ? gOrig(fid) : []);
    };
    if (!PR.nocm) costMul = function (c) { // 재정 특기 장수가 그 도시에 (소유 세력 소속으로) 있으면 0.8; 장수 목록 스캔 대신 도시 집합을 캐시
      if (smVer !== GV || smRef !== S.gen) { gensOf('_'); smSet = new Set(); Object.values(S.gen).forEach(x => { if (x.st === '현역' && x.loc && x.fac && hasSk(x, '재정')) smSet.add(x.loc + '|' + x.fac); }); smVer = GV; smRef = S.gen; }
      return c.owner && smSet.has(c.n + '|' + c.owner) ? 0.8 : 1; };
    for (const k of ['makeTalent', 'addCustom', 'spawnRandom', 'pruneDead']) { const f = globalThis[k]; globalThis[k] = function () { try { return f.apply(this, arguments); } finally { GV++; } }; } // S.gen 에 장수를 넣거나 지우는 곳
    for (const k of ['monthlyUpdate', 'aiTurn']) { const f = globalThis[k]; globalThis[k] = function () { cacheBump(); return f.apply(this, arguments); }; }
  }

  function game() {
    newGame('조조', { rand: true, custom: true, scen: PR.scen, diff: 1 });
    S.opt.v4Battle = false;
    IT = { st: {}, inc0: {}, Pf: {}, Pn: 1, avg0: 0, month: 0, foundTot: 0, nomAvg: 0, rotN: 0, acq: {}, lost: {}, evt: {}, ow: null, own50: {}, dead: {}, uni: -1, dv: {}, dvlog: [] };
    const fids = Object.keys(S.fac); fids.forEach(f => { if (citiesOf(f).length) initFac(f); });
    updatePrice(); IT.Pn = 1; Object.keys(IT.Pf).forEach(f => IT.Pf[f] = 1);
    IT.ow = OWN(); const nCity = Object.values(S.city).filter(isCity).length;
    const start = {}; fids.forEach(f => start[f] = snap(f));
    const aiP = aiPickPolicy; aiPickPolicy = function (fid) { return aiP.apply(this, arguments); };
    const TL0 = Date.now();
    const hist = [], hubs = [];
    hubs.push(hubMap());
    for (let i = 0; i < PR.months && !S.over; i++) {
      if (S.fac[S.player].alive) { CURF = S.player; try { aiTurn(S.player); } catch (e) { } CURF = null; }
      month(); syncOwn('기타'); Object.keys(S.fac).forEach(fid => { if (S.fac[fid].alive && !IT.st[fid]) initFac(fid); });
      { const cnt = {}; Object.values(S.city).forEach(c => { if (c.owner && isCity(c)) cnt[c.owner] = (cnt[c.owner] || 0) + 1; });
        Object.keys(cnt).forEach(f => { if (cnt[f] >= nCity / 2 && IT.own50[f] === undefined) IT.own50[f] = i + 1; if (cnt[f] >= nCity && IT.uni < 0) IT.uni = i + 1; });
        Object.keys(S.fac).forEach(f => { if (IT.dead[f] === undefined && IT.st[f] && !cnt[f]) IT.dead[f] = i + 1; }); }
      if (S.over === 'lose' || S.over === 'win') S.over = null;
      if (S.fac[S.player].alive && (!S.fac[S.player].pol || S.m === 1)) { try { aiPickPolicy(S.player); } catch (e) { } }
      if (PR.tlog && i % 6 === 5) PRINT('t', i + 1, Date.now() - TL0);
      if (i % 12 === 11) {
        const snaps = {}; Object.keys(S.fac).forEach(f => { if (IT.st[f]) snaps[f] = snap(f); });
        hist.push({ snaps, Pn: IT.Pn, vanilla: origPrice(), nomAvg: IT.nomAvg, realAvg: worldInc(), alive: Object.keys(S.fac).filter(f => S.fac[f].alive && citiesOf(f).length).length });
        if ((i + 1) % 60 === 0) hubs.push(hubMap());
      }
    }
    hubs.push(hubMap());
    const end = {}; fids.forEach(f => end[f] = snap(f));
    const stOut = {}; Object.keys(IT.st).forEach(f => { const s = IT.st[f]; stOut[f] = { root: s.root, deg: s.deg.map(x => Math.round(x)), found: s.found, traits: s.traits, units: s.units, spend: s.spend, food: s.food, gain: s.gain, bw: s.bw, bl: s.bl, dw: s.dw, dl: s.dl, bank: s.bank, incSum: s.incSum, extra: s.extra, act: s.act || {}, sink: s.sink || {}, dFound: s.dFound || 0, fbuy: s.fbuy || 0, vN: s.vN || 0, vW: s.vW || 0, vL: s.vL || 0, popGrowSum: s.popGrowSum || 0, popTier: s.popTier || 0, popN: s.popN || 0, tier: s.tier || 0, merc: s.merc || 0, Pf: IT.Pf[f], acq: IT.acq[f] || {}, lost: IT.lost[f] || {}, own50: IT.own50[f] === undefined ? -1 : IT.own50[f], dead: IT.dead[f] === undefined ? -1 : IT.dead[f] }; });
    aiPickPolicy = aiP;
    return { params: PR, fids, start, end, hist, hubs, st: stOut, evt: IT.evt, nCity, own50: IT.own50, uni: IT.uni, over: S.over, foundTot: IT.foundTot, dv: IT.dv, dvlog: IT.dvlog || [], err: IT.err || 0, lastErr: IT.lastErr || '', Pn: IT.Pn, volLog: IT.volLog || [] };
  }
  const res = [];
  for (let g = 0; g < PR.games; g++) { res.push(game()); PRINT('판', g + 1, '/', PR.games); }
  globalThis.RESULT = res;
})();`, ctx);

if (OUT) fs.writeFileSync(OUT, JSON.stringify(ctx.RESULT));
console.log('끝', ctx.RESULT.length, '판, 오류', ctx.RESULT.reduce((s, r) => s + r.err, 0), ctx.RESULT[0].lastErr);

// ---------------- 보고 ----------------
function report(files) {
  const mean = a => a.reduce((s, x) => s + x, 0) / Math.max(1, a.length);
  const med = a => { const b = a.slice().sort((x, y) => x - y); return b.length ? b[Math.floor(b.length / 2)] : NaN; };
  const sd = a => { const m = mean(a); return Math.sqrt(mean(a.map(x => (x - m) ** 2))); };
  const f1 = (x, n = 1) => (Number.isFinite(x) ? x.toFixed(n) : '-');
  for (const file of files) {
    const R = JSON.parse(fs.readFileSync(file, 'utf8')); const P = R[0].params;
    console.log('\n===== ' + path.basename(file) + ' ' + JSON.stringify(P) + ' (' + R.length + '판) =====');
    // 1. 연도별 물가·생존·자원
    console.log('[연도] 연 | 전국물가 | (v105 물가) | 명목평균수입 | 실평균수입 | 생존세력 | 금(개월)중앙 | 군량(개월)중앙 | 도시당 금 | 도시당 군량');
    const yrs = Math.max(...R.map(r => r.hist.length));
    for (let y = 0; y < yrs; y++) {
      const rows = []; R.forEach(r => { const h = r.hist[y]; if (h) Object.values(h.snaps).forEach(s => { if (s.cities > 0 && s.troops > 0) rows.push(s); }); });
      const hs = R.map(r => r.hist[y]).filter(Boolean);
      console.log('  ' + String(y + 1).padStart(2) + ' | ' + f1(mean(hs.map(h => h.Pn)), 2) + ' | ' + f1(mean(hs.map(h => h.vanilla)), 2) + ' | ' + f1(mean(hs.map(h => h.nomAvg)), 0) + ' | ' + f1(mean(hs.map(h => h.realAvg)), 0) + ' | ' + f1(mean(hs.map(h => h.alive)), 1) + ' | ' + f1(med(rows.map(s => s.gm)), 0) + ' | ' + f1(med(rows.map(s => s.fm)), 0) + ' | ' + f1(med(rows.map(s => s.gold / s.cities)), 0) + ' | ' + f1(med(rows.map(s => s.food / s.cities)), 0));
    }
    // 2. 뿌리별 성과 (세력 고정효과 제거: 같은 세력의 모든 판 평균과의 차)
    const rows = []; R.forEach(r => r.fids.forEach(f => { if (r.start[f].cities === 0 || !r.st[f]) return; const s = r.st[f], a = r.start[f], b = r.end[f];
      rows.push({ inc: s.incSum, f, root: s.root, dc: b.cities - a.cities, tr: Math.log((b.troops + 1000) / (a.troops + 1000)), alive: b.alive, gm: b.gm, fm: b.fm, gq: b.gq - a.gq, bw: s.bw, bl: s.bl, bank: s.bank, deg: mean(s.deg), found: s.found, ratio: b.cities, spend: Object.values(s.spend).reduce((x, y) => x + y, 0), sp: s.spend, fd: s.food, gn: s.gain, ex: s.extra, units: s.units, merc: s.merc, loy: b.loy, train: b.train, arm: b.arm }); }));
    const byF = {}; rows.forEach(x => (byF[x.f] = byF[x.f] || []).push(x));
    Object.values(byF).forEach(a => { const md = mean(a.map(x => x.dc)), mt = mean(a.map(x => x.tr)); a.forEach(x => { x.ddc = x.dc - md; x.dtr = x.tr - mt; }); });
    const roots = [...new Set(rows.map(x => x.root))];
    console.log('[뿌리별] 뿌리 | 표본 | 도시Δ(고정효과제거) ±오차 | 병력Δlog | 생존% | 최종금(개월)중앙 | 군량(개월)중앙 | 전투승률 | 평균교역도 | 총교역지출 | 장수질Δ | 훈련 | 군비');
    roots.forEach(rt => { const a = rows.filter(x => x.root === rt); const w = a.reduce((s, x) => s + x.bw, 0), l = a.reduce((s, x) => s + x.bl, 0);
      const al = a.filter(x => x.alive); console.log('  ' + rt.padEnd(4) + ' | ' + a.length + ' | ' + f1(mean(a.map(x => x.ddc)), 2) + ' ±' + f1(sd(a.map(x => x.ddc)) / Math.sqrt(a.length), 2) + ' | ' + f1(mean(a.map(x => x.dtr)), 2) + ' | ' + f1(100 * mean(a.map(x => x.alive)), 0) + ' | ' + f1(med(al.map(x => x.gm)), 0) + ' | ' + f1(med(al.map(x => x.fm)), 0) + ' | ' + f1(100 * w / Math.max(1, w + l), 1) + '% (' + (w + l) + ') | ' + f1(mean(a.map(x => x.deg)), 0) + ' | ' + f1(mean(a.map(x => x.spend)), 0) + '(수입대비 ' + f1(100 * a.reduce((s2, x) => s2 + x.spend, 0) / Math.max(1, a.reduce((s2, x) => s2 + x.inc, 0)), 1) + '%) | ' + f1(mean(a.map(x => x.gq)), 1) + ' | ' + f1(mean(a.map(x => x.train)), 0) + ' | ' + f1(mean(a.map(x => x.arm)), 0)); });
    // 3. 갈래별 소모·획득 (판·세력 평균, 뿌리별)
    console.log('[갈래별 지출/획득 평균] 뿌리: 항목=금(군량)');
    roots.forEach(rt => { const a = rows.filter(x => x.root === rt); const keys = {}; a.forEach(x => { Object.entries(x.sp).forEach(([k, v]) => keys['지출.' + k] = (keys['지출.' + k] || 0) + v); Object.entries(x.gn).forEach(([k, v]) => keys['획득.' + k] = (keys['획득.' + k] || 0) + v); Object.entries(x.fd).forEach(([k, v]) => keys['군량.' + k] = (keys['군량.' + k] || 0) + v); });
      console.log('  ' + rt.padEnd(4) + ' 도산비율 ' + f1(100 * mean(a.map(x => x.bank > 0 ? 1 : 0)), 0) + '% ' + Object.entries(keys).map(([k, v]) => k + '=' + f1(v / a.length, 0)).join(' ') + ' | 인물 ' + f1(mean(a.map(x => x.found)), 1) + ' 병종 ' + f1(mean(a.map(x => x.units)), 1) + ' 용병 ' + f1(mean(a.map(x => x.merc)), 0)); });
    console.log('[물가 추가부담 평균(세력당 누적 금)] 유지비 ' + f1(mean(rows.map(x => x.ex.upkeep)), 0) + ' 출정비 ' + f1(mean(rows.map(x => x.ex.sortie)), 0) + ' | 도산(유지비 부족 발생) 세력-판 비율 ' + f1(100 * mean(rows.map(x => x.bank > 0 ? 1 : 0)), 1) + '% 평균횟수 ' + f1(mean(rows.map(x => x.bank)), 1));
    // 4. 거점 쏠림
    const last = R.map(r => r.hubs[r.hubs.length - 1]);
    const reg = { 동북: 0, 동남해안: 0, 남: 0, 북방: 0, 서북: 0, 서남: 0 };
    const REGION = { 양평: '동북', 북평: '동북', 남피: '동북', 북해: '동북', 동래: '동남해안', 낭야: '동남해안', 동해: '동남해안', 광릉: '동남해안', 말릉: '동남해안', 오: '동남해안', 회계: '동남해안', 건안: '동남해안', 남해: '남', 합포: '남', 교지: '남', 대군: '북방', 안문: '북방', 서평: '서북', 무위: '서북', 장액: '서북', 월수: '서남', 운남: '서남', 영창: '서남' };
    const share = { 동북: [], 동남해안: [], 남: [], 북방: [], 서북: [], 서남: [] }; const topShare = [], zeroFacs = [];
    R.forEach(r => { const h = r.hubs[r.hubs.length - 1]; const cnt = {}; Object.entries(h).forEach(([cn, o]) => { if (o) cnt[o] = (cnt[o] || 0) + 1; }); const tot = Object.values(cnt).reduce((s, x) => s + x, 0); const top = Object.values(cnt).sort((a, b) => b - a); topShare.push((top[0] || 0) / Math.max(1, Object.keys(h).length)); zeroFacs.push(r.end ? Object.keys(r.end).filter(f => r.end[f].alive && r.end[f].cities > 0 && !cnt[f]).length / Math.max(1, Object.values(r.end).filter(s => s.alive && s.cities > 0).length) : 0); });
    console.log('[거점] 마지막 시점 한 세력이 가진 거점 비율(최대) 평균 ' + f1(100 * mean(topShare), 0) + '% / 거점 0개인 생존 세력 비율 평균 ' + f1(100 * mean(zeroFacs), 0) + '%');
    // 5. 시기별 병목(세력 중앙값, 뿌리별 금/군량 개월)
    console.log('[시기별 금(개월)/군량(개월) 중앙값: 뿌리별] (년차 3/6/9/12)');
    roots.forEach(rt => { const out = [3, 6, 9, 12].map(y => { const a = []; R.forEach(r => { const h = r.hist[y - 1]; if (h) Object.entries(h.snaps).forEach(([f, s]) => { if (r.st[f] && r.st[f].root === rt && s.cities > 0 && s.troops > 0) a.push(s); }); }); return a.length ? f1(med(a.map(s => s.gm)), 0) + '/' + f1(med(a.map(s => s.fm)), 0) : '-'; }); console.log('  ' + rt.padEnd(4) + ' ' + out.join('  ')); });
    // 6. 통일 속도: 마지막 해 생존 세력수, 최대 도시 수
    console.log('[결과] 판별 최종 생존 세력 / 최대 도시수: ' + R.map(r => { const a = Object.values(r.end).filter(s => s.alive && s.cities > 0); return a.length + '/' + Math.max(...a.map(s => s.cities)); }).join(' '));
    const topRoot = {}; R.forEach(r => { const best = r.fids.filter(f => r.st[f]).sort((a, b) => r.end[b].cities - r.end[a].cities)[0]; const rt = r.st[best].root; topRoot[rt] = (topRoot[rt] || 0) + 1; }); console.log('[최대 세력의 뿌리 분포] ' + JSON.stringify(topRoot));
  }
}

// ---------------- 원인 태그 보고 (§21-8 기준선) ----------------
// 사용: node tools/integrated_sim.js cause a.json [b.json ...]
// 뿌리별 "자기 방법" = 강병:전투 / 경륜:귀순(v105 없음→0) / 상략:매수+매입+할양+항복 / 덕화:투항(v105 없음→0)
function cause(files) {
  const mean = a => a.reduce((s, x) => s + x, 0) / Math.max(1, a.length);
  const med = a => { const b = a.slice().sort((x, y) => x - y); return b.length ? (b.length % 2 ? b[(b.length - 1) / 2] : (b[b.length / 2 - 1] + b[b.length / 2]) / 2) : NaN; };
  const f1 = (x, n = 1) => (Number.isFinite(x) ? x.toFixed(n) : '-');
  const OWNM = { 강병: ['전투'], 경륜: ['귀순'], 상략: ['매수', '매입', '할양', '항복'], 덕화: ['투항'] };
  const R = []; files.forEach(f => JSON.parse(fs.readFileSync(f, 'utf8')).forEach(r => R.push(r)));
  console.log('판 ' + R.length + ' / 개월 ' + R[0].params.months + ' / mode ' + R[0].params.mode);
  const tot = {}; R.forEach(r => Object.entries(r.evt || {}).forEach(([k, v]) => tot[k] = (tot[k] || 0) + v));
  const T = Object.values(tot).reduce((s, x) => s + x, 0);
  console.log('[소유자 변경 원인 합계(전 세력)] ' + Object.entries(tot).sort((a, b) => b[1] - a[1]).map(([k, v]) => k + ' ' + v + ' (' + f1(100 * v / T) + '%)').join(' | '));
  const rows = []; R.forEach((r, gi) => Object.keys(r.st).forEach(f => { const s = r.st[f]; const hs = r.hist; const last = hs[hs.length - 1]; const sn = last && last.snaps[f];
    const acq = s.acq || {}; const nacq = Object.values(acq).reduce((a, b) => a + b, 0);
    rows.push({ g: gi, f, root: s.root, acq, nacq, c30: sn ? sn.cities : 0, alive: sn ? sn.alive : 0, own50: s.own50, dead: s.dead, start: r.start[f] ? r.start[f].cities : -1 }); }));
  console.log('[뿌리별 라벨(무작위 순환; v105는 뿌리가 동작에 영향 없음 → 라벨 잡음)] 뿌리 | 표본 | 성 취득합 | 자기방법 비율 | 도시수(말) 중앙/평균 | 멸망% | 도시50%도달%');
  ['강병', '경륜', '상략', '덕화'].forEach(rt => { const a = rows.filter(x => x.root === rt && x.start > 0); const own = a.reduce((s, x) => s + OWNM[rt].reduce((u, k) => u + (x.acq[k] || 0), 0), 0), all = a.reduce((s, x) => s + x.nacq, 0);
    console.log('  ' + rt + ' | ' + a.length + ' | ' + all + ' | ' + f1(100 * own / Math.max(1, all)) + '% | ' + f1(med(a.map(x => x.c30)), 1) + '/' + f1(mean(a.map(x => x.c30)), 2) + ' | ' + f1(100 * mean(a.map(x => x.alive ? 0 : 1)), 0) + '% | ' + f1(100 * mean(a.map(x => x.own50 > 0 ? 1 : 0)), 1) + '%'); });
  console.log('[원인별 취득 비율: 뿌리 라벨별 (시작 시 도시 있던 세력)] 열: ' + ['전투', '귀순', '매수', '매입', '할양', '항복', '투항', '독립', '환원', '기타', '이적'].join(' '));
  ['강병', '경륜', '상략', '덕화'].forEach(rt => { const a = rows.filter(x => x.root === rt && x.start > 0); const k = {}; a.forEach(x => Object.entries(x.acq).forEach(([t, v]) => k[t] = (k[t] || 0) + v)); const all = Object.values(k).reduce((s, x) => s + x, 0);
    console.log('  ' + rt + ' ' + ['전투', '귀순', '매수', '매입', '할양', '항복', '투항', '독립', '환원', '기타', '이적'].map(t => f1(100 * (k[t] || 0) / Math.max(1, all)) + '%').join(' ') + ' (합 ' + all + ', 미열거: ' + Object.keys(k).filter(t => !['전투', '귀순', '매수', '매입', '할양', '항복', '투항', '독립', '환원', '기타', '이적'].includes(t)).map(t => t + k[t]).join(',') + ')'); });
  const dvt = {}; R.forEach(r => Object.entries(r.dv || {}).forEach(([k, v]) => dvt[k] = (dvt[k] || 0) + v));
  if (Object.keys(dvt).length) console.log('[장치 발동 합계] ' + Object.entries(dvt).map(([k, v]) => k + ' ' + v).join(' | '));
  console.log('[판별 오류] ' + R.map(r => r.err).join(','));
  const u = R.map(r => r.uni), o50 = R.map(r => { const v = Object.values(r.own50 || {}).filter(x => x > 0); return v.length ? Math.min(...v) : -1; });
  console.log('[통일(전 도시 1세력) 달성 판] ' + u.filter(x => x > 0).length + '/' + R.length + ' 개월 ' + u.join(',') + ' | [도시 50% 최초 도달 개월] ' + o50.join(','));
  console.log('[말 시점 생존 세력수] ' + R.map(r => { const l = r.hist[r.hist.length - 1]; return l ? l.alive : '-'; }).join(','));
  console.log('[세력 단위 도시수(말) 분포: 최대 판별] ' + R.map(r => { const l = r.hist[r.hist.length - 1]; return l ? Math.max(...Object.values(l.snaps).map(s => s.cities)) : '-'; }).join(',') + ' / 전체 도시 ' + R[0].nCity);
}

// 짝지어 비교: node tools/integrated_sim.js pair 'base1.json,base2.json' 'dev1.json,dev2.json'  (파일은 같은 시드 순서)
function pair(args) {
  const mean = a => a.reduce((s, x) => s + x, 0) / Math.max(1, a.length);
  const f1 = (x, n = 1) => (Number.isFinite(x) ? x.toFixed(n) : '-');
  const load = l => l.split(',').flatMap(f => JSON.parse(fs.readFileSync(f, 'utf8')));
  const [A, B] = [load(args[0]), load(args[1])];
  const sum = R => { const o = {}; ['강병', '경륜', '상략', '덕화'].forEach(rt => o[rt] = { n: 0, c: 0, dead: 0, surv: [] });
    R.forEach(r => { const hs = r.hist[r.hist.length - 1]; Object.keys(r.st).forEach(f => { const s = r.st[f]; if (!r.start[f] || r.start[f].cities <= 0) return; const sn = hs && hs.snaps[f]; const c = sn ? sn.cities : 0; const o1 = o[s.root]; if (!o1) return; o1.n++; o1.c += c; if (!(sn && sn.alive)) o1.dead++; else o1.surv.push(c); }); }); return o; };
  const sa = sum(A), sb = sum(B);
  console.log('판 ' + A.length + ' vs ' + B.length + ' | 열: 뿌리 | 표본 | 평균 도시(기준→장치) | 멸망%(기준→장치) | 생존 평균 도시');
  let ta = 0, tb = 0, na = 0, nb = 0;
  Object.keys(sa).forEach(rt => { const a = sa[rt], b = sb[rt]; ta += a.c; tb += b.c; na += a.n; nb += b.n;
    console.log('  ' + rt + ' | ' + a.n + '/' + b.n + ' | ' + f1(a.c / a.n, 2) + ' → ' + f1(b.c / b.n, 2) + ' | ' + f1(100 * a.dead / a.n, 0) + '% → ' + f1(100 * b.dead / b.n, 0) + '% | ' + f1(mean(a.surv), 2) + ' → ' + f1(mean(b.surv), 2)); });
  const dead = o => Object.values(o).reduce((s, x) => s + x.dead, 0), nn = o => Object.values(o).reduce((s, x) => s + x.n, 0);
  console.log('  전체 멸망률 ' + f1(100 * dead(sa) / nn(sa)) + '% → ' + f1(100 * dead(sb) / nn(sb)) + '%');
  const dr = o => Object.entries(o).map(([k, x]) => x.dead / Math.max(1, x.n)); const ra = dr(sa), rb = dr(sb);
  const rel = r => { const m = r.map((x, i) => mean(r.filter((_, j) => j !== i))); return Math.max(...r.map((x, i) => m[i] > 0 ? x / m[i] : 0)); };
  console.log('  멸망률 최대/다른평균 비 ' + f1(rel(ra), 2) + ' → ' + f1(rel(rb), 2));
  console.log('  판별 말 생존 세력 / 최대 세력 도시: ' + A.map((r, i) => { const l = r.hist[r.hist.length - 1], m = B[i].hist[B[i].hist.length - 1]; const mx = h => Math.max(...Object.values(h.snaps).map(s => s.cities)); return 's' + (r.params.seed) + ' ' + l.alive + '→' + m.alive + ' / ' + mx(l) + '→' + mx(m); }).join(' | '));
}
