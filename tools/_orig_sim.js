// 통합 시험기: v105 코드 위에 v106 이후 설계(뿌리 4개·교역 거점 증폭·전국+세력 2층 물가·소모처 확대·AI 점수 우선순위)를 시험 레이어로 얹어 돌린다.
// html은 건드리지 않는다. 설계 안의 모든 수치는 "가정"이며 docs/통합_시뮬레이션.md 에 기록한다.
// 사용:
//   node tools/integrated_sim.js run '{"mode":"design","games":4,"months":144,"seed":1,"scen":"190","roots":"forced"}' out.json
//   node tools/integrated_sim.js report a.json [b.json ...]
// 모드: base = v105 그대로(대조군) / design = 설계 레이어 켬
// 주요 파라미터(기본값): roots(forced|nat|none) a(1) b(0.3) pass(0.6) cap(0.10 연 상한) hubGain(0.5) land(true) tradeFrac(0.5) openAll(false) noPrice(false)
const fs = require('fs'), vm = require('vm'), path = require('path');
const cmd = process.argv[2];
if (cmd === 'cause') { cause(process.argv.slice(3)); process.exit(0); }
if (cmd === 'report') { report(process.argv.slice(3)); process.exit(0); }
const PR = Object.assign({ mode: 'design', games: 4, months: 144, seed: 1, scen: '190', roots: 'forced', a: 1, b: 0.3, pass: 0.6, cap: 0.10, hubGain: 0.5, land: true, tradeFrac: 0.5, openAll: false, noPrice: false, noTrade: false, tradeScale: 1 }, JSON.parse(process.argv[3] || '{}'));
const OUT = process.argv[4] || '';

const html = fs.readFileSync(path.join(__dirname, '..', 'samguk_v105.html'), 'utf8');
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
  const isCity = c => kindOf(c.n) === '도시';
  const clampN = (v, a, b) => Math.max(a, Math.min(b, v));
  let IT = null, CURF = null;
  const mean = a => a.reduce((s, x) => s + x, 0) / Math.max(1, a.length);

  function hubDirs() { return PR.land ? HUBDIR : Object.fromEntries(Object.entries(HUBDIR).map(([k, v]) => [k, v.filter(c => PORTS.includes(c))])); }
  function hubCount(f, d) { const H = hubDirs()[d]; return H.filter(cn => S.city[cn] && S.city[cn].owner === f).length; }
  function amp(f, d) { return 1 + PR.hubGain * hubCount(f, d); }
  function price(f) { if (!D || PR.noPrice) return null; return IT.Pn ** PR.a * ((f && IT.Pf[f]) || 1) ** PR.b; }
  function realInc(c) { return Math.round(cityGold(c, (c.owner !== S.player ? DF().inc : 1) * ((c.tax || 30) / 30)) / 3); }

  function chooseRoot(f) {
    if (PR.roots === 'none') return 'none';
    if (PR.roots === 'rot') return ROOTS[(IT.rotN++) % 4];
    if (PR.roots === 'forced') return ROOTS[Math.floor(RND() * 4)];
    const g = G(S.fac[f].ruler); const sc = { 경륜: g.i + g.p, 강병: g.w + g.t, 상략: g.c * 1.6, 덕화: (g.p + g.t + g.c) * 0.7 };
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
      if (open('상략')) { const dAvg = mean(st.deg); const capT = 1.5 * incF * mean([0, 1, 2, 3].map(d => amp(f, PART[d])));
        if (dAvg > 3) { const x0 = Math.min(budget / P, capT * 0.5); if (x0 > 200) { const o = { name: '차익', cost: 0, sc: 1.5 * (0.8 + 0.4 * RND()), noBudget: 1, fn: () => {
          const vtot = st.vol.reduce((s, v) => s + v, 0); const sat = Math.max(0.2, 1 - vtot / Math.max(1, capT));
          const margin = (0.03 + 0.10 * dAvg / 100) * sat; const profit = x0 * margin * P; const fee = 0.01 * x0 * P; cs[0].gold += Math.round(profit - fee); bump(st.gain, '차익', profit); o.cost = fee;
          st.vol[Math.floor(RND() * 4)] += x0; return true; } }; cand.push(o); } }
        const fc = frontCity(f); if (fc) { const mc = mercCost(fc, 2000); const rsv = reserveOf(fc, f); if (fc.gold > mc + rsv * 2 && garrisonCap(fc) - fc.troops > 2000) { const gg = gensIn(fc.n, f).find(g => !g.acted && !g.away && !(g.inj > 0)); if (gg) cand.push({ name: '용병', cost: 0, sc: 1.2 * (0.8 + 0.4 * RND()), fn: () => { const r = cmdMerc(fc.n, gg.n, 2000); if (r.ok) { bump(st.spend, '용병', mc); st.merc = (st.merc || 0) + 2000; } return false; } }); } } }
      if (open('강병') && st.deg.some(x => x >= 40)) push('물자', 1000, 1.3, () => { const fc = frontCity(f); if (!fc) return false; installArms(); const t = ['보병', '궁병', '기병'].sort((x, y) => (fc.arm[x] || 0) - (fc.arm[y] || 0))[0]; fc.arm[t] = (fc.arm[t] || 0) + 8; fc.train = Math.min(100, fc.train + 2); return true; });
      if (open('덕화')) {
        const lo = cs.slice().sort((x, y) => x.loy - y.loy)[0]; const fd = cs.slice().sort((x, y) => y.food - x.food)[0];
        if (lo && fd.food > 20000) push('민생', 600, 1.1, () => { lo.pop = Math.round(lo.pop * 1.01); lo.loy = Math.min(100, lo.loy + 4); fd.food -= 3000; bump(st.food, '민생', 3000); return true; });
        const fcs = cs.filter(c => c.food > Math.ceil(c.troops / ECO.troopFood) * 14 + 6000 && isFront(c.n, f)).sort((x, y) => y.food - x.food)[0];
        if (fcs) { installArms(); push('군비화', 300, 1.4, () => { const t = ['보병', '궁병', '기병'].sort((x, y) => (fcs.arm[x] || 0) - (fcs.arm[y] || 0))[0]; fcs.arm[t] = (fcs.arm[t] || 0) + 2; fcs.food -= 6000; bump(st.food, '군비화', 6000); return true; }); }
        // 군량 판매: 잉여 군량(필요 30개월 초과)을 철마다가 아니라 항상 팔 수 있음 (+15%)
        cs.forEach(c => { const need = Math.ceil(c.troops / ECO.troopFood); const ex = c.food - need * 30; if (ex > 20000) { const amt = Math.min(50000, Math.floor(ex / 1000) * 1000); const g = Math.floor(amt / 100 * foodPrice(c) * 1.15); c.food -= amt; c.gold += g; bump(st.gain, '군량판매', g); bump(st.food, '군량판매', amt); } });
      }
      if (!cand.length) break;
      cand.forEach(o => { o.sc = o.sc0 !== undefined ? o.sc0 : o.sc; });
      cand.forEach(o => { o.sc *= Math.pow(0.5, used[o.name] || 0) / P; });
      cand.sort((x, y) => y.sc - x.sc); const ch = cand[0]; used[ch.name] = (used[ch.name] || 0) + 1;
      const ok = ch.fn();
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
      const win = !!(r && r.win); const sa = IT.st[d.att]; if (sa) { win ? sa.bw++ : sa.bl++; }
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
      });
      if (!PR.noTrade) Object.keys(S.fac).forEach(fid => { if (S.fac[fid].alive) tradeTurn(fid); });
      updatePrice();
    } catch (e) { IT.err = (IT.err || 0) + 1; IT.lastErr = String(e && e.stack || e).slice(0, 300); }
    return r; }; }
  { const f = aiTurn; aiTurn = function (fid) { CURF = fid; try { return f.apply(this, arguments); } finally { CURF = null; } }; }
  { const f = armCost; armCost = function (c, k) { const v = f.apply(this, arguments); if (D && !PR.noPrice && c && c.owner) { const p = price(c.owner) || 1; return Math.round(v * p / 10) * 10; } return v; }; }
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
  wrapTag('absorbFaction', () => '항복');
  wrapTag('aiAbsorb', () => '항복');
  wrapTag('rebel', () => '독립');
  wrapTag('cmdScheme', (cn, an, type) => type === '매수' ? '매수' : '계략기타');
  wrapTag('cmdDiplo', (cn, en, tf, type) => type === '매입' ? '매입' : type === '할양' ? '할양' : '항복');
  { const f = monthlyUpdate; monthlyUpdate = function () { const cq = {}; if (IT) Object.values(S.city).forEach(c => { if (c.conq) cq[c.n] = c.conq.from; });
    const r = f.apply(this, arguments); syncOwn('기타', (c, old, now) => (cq[c.n] && cq[c.n] === now) ? '환원' : null); return r; }; }
  { const f = aiTurn; aiTurn = function () { const r = f.apply(this, arguments); syncOwn('기타'); return r; }; }

  const snap = fid => { const cs = citiesOf(fid); const ct = cs.filter(isCity); const tr = cs.reduce((s, c) => s + c.troops, 0); const gens = gensOf(fid); const top = gens.map(g => Math.max(g.w, g.t, g.i, g.p)).sort((a, b) => b - a).slice(0, 10);
    const front = ct.filter(c => isFront(c.n, fid)); installArms();
    return { cities: cs.length, troops: tr, gold: cs.reduce((s, c) => s + c.gold, 0), food: cs.reduce((s, c) => s + c.food, 0), gens: gens.length, gq: mean(top), alive: S.fac[fid].alive ? 1 : 0,
      train: mean(ct.map(c => c.train)), arm: mean(front.map(c => mean(Object.values(c.arm || {})))), inc: ct.reduce((s, c) => s + realInc(c), 0), loy: mean(ct.map(c => c.loy)),
      gm: tr > 0 ? cs.reduce((s, c) => s + c.gold, 0) / (tr / ECO.troopGold) : 0, fm: tr > 0 ? cs.reduce((s, c) => s + c.food, 0) / (tr / ECO.troopFood) : 0 }; };
  function hubMap() { const all = new Set(PORTS.concat(PR.land ? LAND : [])); const o = {}; all.forEach(cn => o[cn] = S.city[cn] ? S.city[cn].owner : null); return o; }

  function game() {
    newGame('조조', { rand: true, custom: true, scen: PR.scen, diff: 1 });
    S.opt.v4Battle = false;
    IT = { st: {}, inc0: {}, Pf: {}, Pn: 1, avg0: 0, month: 0, foundTot: 0, nomAvg: 0, rotN: 0, acq: {}, lost: {}, evt: {}, ow: null, own50: {}, dead: {}, uni: -1 };
    const fids = Object.keys(S.fac); fids.forEach(f => { if (citiesOf(f).length) initFac(f); });
    updatePrice(); IT.Pn = 1; Object.keys(IT.Pf).forEach(f => IT.Pf[f] = 1);
    IT.ow = OWN(); const nCity = Object.values(S.city).filter(isCity).length;
    const start = {}; fids.forEach(f => start[f] = snap(f));
    const aiP = aiPickPolicy; aiPickPolicy = function (fid) { return aiP.apply(this, arguments); };
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
      if (i % 12 === 11) {
        const snaps = {}; Object.keys(S.fac).forEach(f => { if (IT.st[f]) snaps[f] = snap(f); });
        hist.push({ snaps, Pn: IT.Pn, vanilla: origPrice(), nomAvg: IT.nomAvg, realAvg: worldInc(), alive: Object.keys(S.fac).filter(f => S.fac[f].alive && citiesOf(f).length).length });
        if ((i + 1) % 60 === 0) hubs.push(hubMap());
      }
    }
    hubs.push(hubMap());
    const end = {}; fids.forEach(f => end[f] = snap(f));
    const stOut = {}; Object.keys(IT.st).forEach(f => { const s = IT.st[f]; stOut[f] = { root: s.root, deg: s.deg.map(x => Math.round(x)), found: s.found, traits: s.traits, units: s.units, spend: s.spend, food: s.food, gain: s.gain, bw: s.bw, bl: s.bl, dw: s.dw, dl: s.dl, bank: s.bank, incSum: s.incSum, extra: s.extra, merc: s.merc || 0, Pf: IT.Pf[f], acq: IT.acq[f] || {}, lost: IT.lost[f] || {}, own50: IT.own50[f] === undefined ? -1 : IT.own50[f], dead: IT.dead[f] === undefined ? -1 : IT.dead[f] }; });
    aiPickPolicy = aiP;
    return { params: PR, fids, start, end, hist, hubs, st: stOut, evt: IT.evt, nCity, own50: IT.own50, uni: IT.uni, over: S.over, foundTot: IT.foundTot, err: IT.err || 0, lastErr: IT.lastErr || '', Pn: IT.Pn };
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
  console.log('[원인별 취득 비율: 뿌리 라벨별 (시작 시 도시 있던 세력)] 열: ' + ['전투', '매수', '매입', '할양', '항복', '독립', '환원', '기타', '이적'].join(' '));
  ['강병', '경륜', '상략', '덕화'].forEach(rt => { const a = rows.filter(x => x.root === rt && x.start > 0); const k = {}; a.forEach(x => Object.entries(x.acq).forEach(([t, v]) => k[t] = (k[t] || 0) + v)); const all = Object.values(k).reduce((s, x) => s + x, 0);
    console.log('  ' + rt + ' ' + ['전투', '매수', '매입', '할양', '항복', '독립', '환원', '기타', '이적'].map(t => f1(100 * (k[t] || 0) / Math.max(1, all)) + '%').join(' ') + ' (합 ' + all + ', 미열거: ' + Object.keys(k).filter(t => !['전투', '매수', '매입', '할양', '항복', '독립', '환원', '기타', '이적'].includes(t)).map(t => t + k[t]).join(',') + ')'); });
  const u = R.map(r => r.uni), o50 = R.map(r => { const v = Object.values(r.own50 || {}).filter(x => x > 0); return v.length ? Math.min(...v) : -1; });
  console.log('[통일(전 도시 1세력) 달성 판] ' + u.filter(x => x > 0).length + '/' + R.length + ' 개월 ' + u.join(',') + ' | [도시 50% 최초 도달 개월] ' + o50.join(','));
  console.log('[말 시점 생존 세력수] ' + R.map(r => { const l = r.hist[r.hist.length - 1]; return l ? l.alive : '-'; }).join(','));
  console.log('[세력 단위 도시수(말) 분포: 최대 판별] ' + R.map(r => { const l = r.hist[r.hist.length - 1]; return l ? Math.max(...Object.values(l.snaps).map(s => s.cities)) : '-'; }).join(',') + ' / 전체 도시 ' + R[0].nCity);
}
