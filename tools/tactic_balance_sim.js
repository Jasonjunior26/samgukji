// 신규 전법 뼈대 5종 + 교역 전법 균형 시험 (docs/교역_전법_균형.md). html은 읽기만 한다 — 전법은 이 파일 안의 '모의 구현'.
// 사용: node tools/tactic_balance_sim.js <그룹> [판수=30]    그룹: q1 | q2 | q3 | all
// 전투: battle_sim.js 와 같은 조조(초,진류) vs 동탁(낙양) V4 AI끼리. 판마다 시드를 조건과 무관하게 같게 맞춰 짝지음 비교.
// 모의 전법: 설계서 6-2b 표의 '2단계 기준 초안' 값 × s(개인 1.0 / 교역 0.6). 위력 = V4.forecast 명중 피해(회심 제외) × 배수. 반격 없음.
const fs = require('fs'), vm = require('vm'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'samguk_v108.html'), 'utf8');
const el = () => new Proxy(function () { }, { get: (t, k) => k === Symbol.toPrimitive ? () => '' : (k === 'length' ? 0 : el()), set: () => true, apply: () => el(), construct: () => el() });
const store = {};
let _s = 1;
const SMath = Object.assign(Object.create(Math), { random: () => { _s = (_s + 0x6D2B79F5) >>> 0; let t = _s; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; } });
const ctx = { console, Math: SMath, Date, JSON, setTimeout: () => 0, clearTimeout() { }, setInterval: () => 0, requestAnimationFrame: () => 0, performance: { now: () => Date.now() },
  localStorage: { getItem: k => store[k] ?? null, setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } },
  addEventListener() { }, removeEventListener() { }, matchMedia: () => ({ matches: false, addEventListener() { } }), document: el(), navigator: { userAgent: 'node' }, location: { reload() { } } };
ctx.window = ctx; vm.createContext(ctx);
ctx.__seed = n => { _s = n >>> 0; };
const _log = console.log; console.log = () => { };
[...html.matchAll(/<script(?: [^>]*)?>([\s\S]*?)<\/script>/g)].forEach((m, i) => { try { vm.runInContext(m[1], ctx, { filename: 'block' + i }); } catch (e) { if (process.env.DBG) _log('block', i, e.message); } });
console.log = _log;

// ---- 전투 안에서 도는 모의 전법 (vm 안) ----
const BAL = process.env.DSET === 'bal';
vm.runInContext(`
var TB = (() => {
  const md = (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
  const isD = u => u.side === 'D';
  const foes = u => V4.W.units.filter(o => o.alive && isD(o) !== isD(u));
  const mates = u => V4.W.units.filter(o => o.alive && isD(o) === isD(u));
  const free = (u, x, y) => { const c = V4.at(x, y); return c && !V4.W.units.some(o => o.alive && o.x === x && o.y === y) && V4.moveCost(u, c) < 99 && !'TLKOZY'.includes(c.t); };
  const NB4 = [[1, 0], [-1, 0], [0, 1], [0, -1]], NB8 = NB4.concat([[1, 1], [1, -1], [-1, 1], [-1, -1]]);
  const fc = (u, d, m) => Math.round(V4.forecast(u, d).dmg * m);
  function hurt(d, n, by) { // V4 hurt 와 같은 식 (private 이라 복제)
    n = Math.min(d.troops, Math.round(n)); if (n <= 0) return 0; d.troops -= n; d.wd += Math.round(n * 0.3); d.dt += n; if (by) by.dd += n;
    d.mor = Math.max(0, Math.min(100, d.mor - Math.round(n / Math.max(1, d.max) * 25)));
    if (d.troops <= 0 || d.mor <= 0) { d.alive = false; d.fled = d.troops > 0; if (by) by.k++; }
    return n;
  }
  const seeAt = (u, x, y, fn) => { const ox = u.x, oy = u.y; u.x = x; u.y = y; try { return fn(); } finally { u.x = ox; u.y = oy; } };
  const PLAN = {
    gangta(u, P) { let b = null; foes(u).filter(o => md(u, o) <= 2).forEach(o => { const v = fc(u, o, 2.2 * P.s); if (!b || v > b.val) b = { val: v, run: () => ({ dmg: hurt(o, v, u) }) }; }); return b; },
    dolpa(u, P) { let b = null; foes(u).filter(o => md(u, o) <= 4).forEach(o => {
        const cell = md(u, o) <= 1 ? { x: u.x, y: u.y } : NB4.map(([dx, dy]) => ({ x: o.x + dx, y: o.y + dy })).filter(c => free(u, c.x, c.y)).sort((a, c) => md(a, u) - md(c, u))[0]; if (!cell) return;
        const v = seeAt(u, cell.x, cell.y, () => fc(u, o, 1.6 * P.s)); if (!b || v > b.val) b = { val: v, run: () => { u.x = cell.x; u.y = cell.y; return { dmg: hurt(o, fc(u, o, 1.6 * P.s), u) }; } }; }); return b; },
    bokbyeong(u, P) { const t = V4.at(u.x, u.y).t; if (!P.ignoreCond && !'FM'.includes(t)) return null; const R = P.r || 2; const ts = foes(u).filter(o => md(u, o) <= R); if (!ts.length) return null;
      const vs = ts.map(o => [o, fc(u, o, 0.7 * 2.2 * P.s)]); const val = vs.reduce((a, [, v]) => a + v, 0);
      return { val, run: () => { let n = 0; vs.forEach(([o, v]) => { n += hurt(o, v, u); if (o.alive) { o.sts.conf = true; o.confT = 1; } }); return { dmg: n }; } }; },
    amseup(u, P) { let b = null; const K = P.k != null ? P.k : 1.2 * 2.2; foes(u).filter(o => md(u, o) <= 4).forEach(o => {
        const cells = NB8.map(([dx, dy]) => ({ x: o.x + dx, y: o.y + dy })).filter(c => free(u, c.x, c.y) && md(c, u) <= 5); if (!cells.length && md(u, o) > 1) return;
        const adj = c0 => foes(u).filter(q => q !== o && md(q, c0) <= 1).length; const cell = md(u, o) <= 1 ? { x: u.x, y: u.y } : cells.sort((a, c) => adj(a) - adj(c))[0];
        const v = seeAt(u, cell.x, cell.y, () => fc(u, o, K * P.s)); const w = v * (o.gen ? 1.5 : 1);
        if (!b || w > b.w) b = { w, val: v, run: () => { u.x = cell.x; u.y = cell.y; const n = hurt(o, fc(u, o, K * P.s), u); if (o.alive) { o.mor = Math.max(0, o.mor - 15); if (o.mor <= 0) { o.alive = false; o.fled = true; u.k++; } } return { dmg: n }; } }; }); return b; },
    gisa(u, P) { let b = null; NB4.forEach(([dx, dy]) => { const pth = []; for (let i = 1; i <= 3; i++) { const c = { x: u.x + dx * i, y: u.y + dy * i }; if (!free(u, c.x, c.y)) break; pth.push(c); } if (pth.length < 3) return;
        const arr = foes(u).filter(o => pth.some(c => md(c, o) <= 1)); if (!arr.length) return;
        const end = pth[2]; const vs = arr.map(o => seeAt(u, end.x, end.y, () => fc(u, o, 0.4 * 1.9 * P.s))); const val = vs.reduce((a, v) => a + v, 0);
        if (!b || val > b.val) b = { val, run: () => { u.x = end.x; u.y = end.y; let n = 0; arr.forEach((o, i) => { n += hurt(o, vs[i], u); }); return { dmg: n }; } }; }); return b; },
    bangjin(u, P) { const box = mates(u).filter(o => Math.max(Math.abs(o.x - u.x), Math.abs(o.y - u.y)) <= 2); const near = foes(u).filter(o => md(u, o) <= 3); if (box.length < (P.min || 2) || !near.length) return null;
      return { val: box.length * 300, run: () => { box.forEach(o => { o.gdLeft = 2; o.gdK = P.gd; }); return { dmg: 0 }; } }; },
    pogyeok(u, P) { let b = null; const p = (P.p || 1.6) * P.s; foes(u).filter(o => md(u, o) <= 5).forEach(o => { const side = foes(u).filter(q => q !== o && md(q, o) <= 1);
        const v0 = fc(u, o, p), vs = side.map(q => [q, fc(u, q, p * 0.5)]); const val = v0 + vs.reduce((a, [, v]) => a + v, 0);
        if (!b || val > b.val) b = { val, run: () => { let n = hurt(o, v0, u); vs.forEach(([q, v]) => { n += hurt(q, v, u); }); return { dmg: n }; } }; }); return b; },
  };
  function play(cfg, size, siege, seed) {
    __seed(seed);
    newGame('조조');
    const us = ${BAL} ? autoUnits(gensOf('조조'), size, 5) : autoUnits(gensIn('초', '조조'), size, 5), du = ${BAL} ? autoUnits(gensOf('원소'), size, 5) : autoUnits(gensOf('동탁').filter(g => g.loc === '낙양').slice(0, 6), size, 5);
    V4.start('조조', '초', '진류', us, 4000, 'A', siege ? '농성' : '야전', { dUnits: du });
    const W = V4.W; const init = { A: 0, D: 0 }; W.units.forEach(u => { init[isD(u) ? 'D' : 'A'] += u.max; });
    const st = { A: { left: cfg.A ? cfg.A.uses : 0, used: 0, dmg: 0 }, D: { left: cfg.D ? cfg.D.uses : 0, used: 0, dmg: 0 } };
    const sdk = u => isD(u) ? 'D' : 'A';
    let g = 0;
    while (!W.over && g++ < 120) {
      const side = W.phase, key = side === 'D' ? 'D' : 'A', P = cfg[key], S = st[key];
      W.units.forEach(u => { if (u.alive && u.confT > 0 && isD(u) === (side === 'D')) { u.sts.conf = true; u.confT--; } });
      if (P && S.left > 0) {
        let best = null; const thr = (P.thr || 0.03) * init[key === 'A' ? 'D' : 'A'];
        W.units.filter(u => u.alive && !u.acted && sdk(u) === key && u.gen).forEach(u => { const pl = PLAN[P.skill](u, P); if (pl && pl.val >= thr && (!best || (pl.w || pl.val) > (best.pl.w || best.pl.val))) best = { u, pl }; });
        if (best) { const r = best.pl.run(); best.u.acted = true; best.u.moved = true; S.left--; S.used++; S.dmg += r.dmg || 0; V4.check(); }
      }
      const q = V4.aiQueue(side);
      for (const u of q) { if (W.over) break; if (!u.alive || u.acted) continue;
        const sh = W.units.filter(o => o.alive && o.gdLeft > 0).map(o => ({ o, t: o.troops, m: o.mor }));
        V4.aiAct(u);
        sh.forEach(s => { const o = s.o; const lost = s.t - o.troops; if (lost > 0) { // 방진: 받은 피해의 gdK 만큼 돌려줌 (근사)
            const back = Math.round(lost * o.gdK); if (back > 0) { const was = o.alive; o.troops += back; o.wd = Math.max(0, o.wd - Math.round(back * 0.3)); o.dt -= back; const dm = s.m - o.mor; if (dm > 0) o.mor = Math.min(100, o.mor + Math.round(dm * o.gdK));
              if (!was && o.troops > 0 && o.mor > 0) { o.alive = true; o.fled = false; } } } });
        if (V4.check()) break; }
      if (W.over) break;
      W.units.forEach(o => { if (o.gdLeft > 0 && isD(o) !== (side === 'D')) o.gdLeft--; });
      V4.endPhase();
    }
    const lossF = k => { let m = 0, t = 0; W.units.forEach(u => { if (sdk(u) === k) { m += u.max; t += u.alive ? u.troops : 0; } }); return 1 - t / m; };
    return { w: W.over === 'A' ? 1 : 0, turn: W.turn, la: lossF('A'), ld: lossF('D'), ua: st.A.used, ud: st.D.used, da: st.A.dmg, dd: st.D.dmg, iD: init.D };
  }
  return { play };
})();
`, ctx);

// ---- 실행·통계 ----
const SC = [['야전', 8000, false], ['야전', 15000, false], ['공성', 15000, true]];
function run(cfg, n) {
  const out = []; const per = Math.ceil(n / 3);
  SC.forEach(([nm, size, sg], si) => { for (let i = 0; i < per; i++) { const seed = 1000 * (si + 1) + i + 1; ctx.__cfg = cfg; out.push(Object.assign(vm.runInContext(`TB.play(__cfg, ${size}, ${sg}, ${seed})`, ctx), { sc: si, i })); } });
  return out;
}
const mean = a => a.reduce((s, x) => s + x, 0) / Math.max(1, a.length);
const sd = a => { const m = mean(a); return Math.sqrt(mean(a.map(x => (x - m) ** 2))); };
const se = a => sd(a) / Math.sqrt(Math.max(1, a.length));
function fitLogit(rows) { let a = 0, b = 0; for (let it = 0; it < 60; it++) { let g0 = 0, g1 = 0, h00 = 1e-6, h01 = 0, h11 = 1e-6; rows.forEach(r => { const m = r.ld - r.la, p = 1 / (1 + Math.exp(-(a + b * m))); g0 += r.w - p; g1 += (r.w - p) * m; const v = p * (1 - p); h00 += v; h01 += v * m; h11 += v * m * m; }); const det = h00 * h11 - h01 * h01; if (Math.abs(det) < 1e-12) break; a += (h11 * g0 - h01 * g1) / det; b += (-h01 * g0 + h00 * g1) / det; } return { a, b }; }
const pc = (x, d = 1) => (x * 100).toFixed(d);
function table(names, results, ctrlName, fit) {
  const c = results[ctrlName];
  const wr = r => mean(r.map(x => x.w)), adj = r => mean(r.map(x => 1 / (1 + Math.exp(-(fit.a + fit.b * (x.ld - x.la))))));
  _log('| 조건 | 승률% | 보정승률% | Δ보정%p(±SE) | 적손실% | Δ적손실%p(±SE) | 내손실% | Δ마진%p(±SE) | 평균턴 | 사용/판 | 전법피해/적병력% |');
  _log('|---|---|---|---|---|---|---|---|---|---|---|');
  names.forEach(nm => { const r = results[nm], isC = nm === ctrlName; const pa = x => 1 / (1 + Math.exp(-(fit.a + fit.b * (x.ld - x.la)))), dad = r.map((x, i) => pa(x) - pa(c[i])); const dl = r.map((x, i) => x.ld - c[i].ld), dm = r.map((x, i) => (x.ld - x.la) - (c[i].ld - c[i].la));
    const ud = r.some(x => x.ud > 0) ? '(수비측) ' : '';
    _log(`| ${nm} | ${pc(wr(r), 0)} | ${pc(adj(r))} | ${isC ? '-' : ((adj(r) - adj(c)) * 100).toFixed(1) + '±' + (se(dad) * 100).toFixed(1)} | ${pc(mean(r.map(x => x.ld)))} | ${isC ? '-' : (mean(dl) * 100).toFixed(1) + '±' + (se(dl) * 100).toFixed(1)} | ${pc(mean(r.map(x => x.la)))} | ${isC ? '-' : (mean(dm) * 100).toFixed(1) + '±' + (se(dm) * 100).toFixed(1)} | ${mean(r.map(x => x.turn)).toFixed(1)} | ${ud}${mean(r.map(x => x.ua + x.ud)).toFixed(2)} | ${pc(mean(r.map(x => (x.da + x.dd) / x.iD)))} |`); });
}
const group = process.argv[2] || 'q1', N = +(process.argv[3] || 30);
const U = 2;
const mk = (skill, s, extra) => ({ A: Object.assign({ skill, s, uses: U }, extra || {}), D: null });
const CTRL = '대조(전법 없음)';
const CONDS = {
  q1: { [CTRL]: { A: null, D: null },
    '기존 강타2 100%': mk('gangta', 1), '기존 돌파2 100%': mk('dolpa', 1),
    '복병 100%': mk('bokbyeong', 1), '복병 100%(숲조건 무시)': mk('bokbyeong', 1, { ignoreCond: true }),
    '암습 100%(강타2.2x1.2)': mk('amseup', 1), '암습 100%(배수 1.2 그대로)': mk('amseup', 1, { k: 1.2 }),
    '기사질주 100%': mk('gisa', 1), '방진 100%(30%)': mk('bangjin', 1, { gd: 0.30 }),
    '포격 100%(p=1.6)': mk('pogyeok', 1), '포격 100%(p=2.2)': mk('pogyeok', 1, { p: 2.2 }) },
  q2: { [CTRL]: { A: null, D: null },
    '교역 복병 60%': mk('bokbyeong', 0.6), '교역 복병 60%(숲 무시)': mk('bokbyeong', 0.6, { ignoreCond: true }),
    '교역 암습 60%': mk('amseup', 0.6), '교역 기사질주 60%': mk('gisa', 0.6),
    '교역 방진 18%(30%x0.6)': mk('bangjin', 1, { gd: 0.18 }), '교역 방진 30% 그대로': mk('bangjin', 1, { gd: 0.30 }),
    '교역 포격 60%': mk('pogyeok', 0.6) },
  q3: { [CTRL]: { A: null, D: null },
    '방진 30% x2회(설계: 자신 외 아군 1+)': mk('bangjin', 1, { gd: 0.30 }), '방진 30% 최소3부대': mk('bangjin', 1, { gd: 0.30, min: 3 }),
    '방진 20% x2회': mk('bangjin', 1, { gd: 0.20 }), '방진 25% x2회': mk('bangjin', 1, { gd: 0.25 }),
    '방진 30% x4회': { A: { skill: 'bangjin', s: 1, uses: 4, gd: 0.30 }, D: null },
    '참고 45% x2회': mk('bangjin', 1, { gd: 0.45 }), '방진 30% 수비측 사용': { A: null, D: { skill: 'bangjin', s: 1, uses: U, gd: 0.30 } } },
};
CONDS.q4 = { [CTRL]: { A: null, D: null } };
[0.2, 0.3, 0.4, 0.5].forEach(k => { CONDS.q4['교역 암습 ' + k * 100 + '%'] = mk('amseup', k); CONDS.q4['교역 포격 ' + k * 100 + '%'] = mk('pogyeok', k); CONDS.q4['교역 복병(숲무시) ' + k * 100 + '%'] = mk('bokbyeong', k, { ignoreCond: true }); });
CONDS.q4['교역 기사질주 100%'] = mk('gisa', 1);
const groups = group === 'all' ? ['q1', 'q2', 'q3', 'q4'] : [group];
const all = {}; const t0 = Date.now();
for (const gname of groups) { const cs = CONDS[gname]; const res = {}; Object.keys(cs).forEach(nm => { res[nm] = run(cs[nm], N); }); all[gname] = res; }
const pool = []; groups.forEach(g => Object.values(all[g]).forEach(r => r.forEach(x => pool.push(x)))); const fit = fitLogit(pool);
_log(`# 전법 균형 시험 장면=${BAL ? 'S2 큰 편성(조조 전 장수 vs 원소 전 장수, 각 최대 5부대)' : 'S1 기본(낙양 장수 2부대, battle_sim 동일)'} 그룹=${group} 조건당 ${N}판(시나리오 3종 균등: 야전8000/야전15000/공성15000, 시드 조건 간 동일), 사용측=공격측 A(조조), 사용 횟수 전투당 ${U}회`);
_log(`# 마진 로지스틱(승패~적손실-내손실) a=${fit.a.toFixed(3)} b=${fit.b.toFixed(2)} (${pool.length}판 합산 적합), 경과 ${((Date.now() - t0) / 1000).toFixed(0)}초`);
groups.forEach(g => { _log(`\n## ${g}`); table(Object.keys(CONDS[g]), all[g], CTRL, fit); });
if (process.env.RAW) fs.writeFileSync(process.env.RAW, JSON.stringify(all));
