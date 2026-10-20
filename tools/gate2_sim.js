// 성문 규칙 2차 시험기 (docs/성문_설계.md 2차). 1차 gate_sim.js 의 패치를 재사용하고 열기 기준·복귀·자동 문 지정을 추가. html 은 메모리에서만 패치.
// 사용: node tools/gate2_sim.js [판수=60] [구간 1|2|3|12|123]  (REC 환경변수로 3구간 규칙 JSON 지정)
const fs = require('fs'), vm = require('vm'), path = require('path');
let html = fs.readFileSync(path.join(__dirname, '..', 'samguk_v105.html'), 'utf8');
function patch(re, f) { if (!re.test(html)) throw new Error('patch anchor not found: ' + re); html = html.replace(re, f); }
// 패치1: canHit 에 성벽 규칙
patch(/function canHit\(u, tx, ty, fx, fy\) \{/, m => `function wallOk(u, tx, ty, fx, fy) { if (!W || !W.castle) return true; const o = unitAt(tx, ty); if (!o) return true; const x = fx == null ? u.x : fx, y = fy == null ? u.y : fy; if (inCastle(x, y) === inCastle(tx, ty)) return true; if ([2, 4, 5].includes(famOf(u))) return true; if (gateOpen()) return true; if (globalThis.GM && GM.S) GM.S.deny++; return false; }
  function canHit(u, tx, ty, fx, fy) { if (globalThis.GM && GM.on && !wallOk(u, tx, ty, fx, fy)) return false; return canHit0(u, tx, ty, fx, fy); }
  function canHit0(u, tx, ty, fx, fy) {`);
// 패치2: 닫힌 문은 수비도 못 지난다
patch(/if \(c\.t === 'T'\) return u\.side === 'D' \? 1 : 99;/, `if (c.t === 'T') return u.side === 'D' && !(globalThis.GM && GM.on) ? 1 : 99;`);
// 패치3: 수비 단계 시작 훅
patch(/function beginPhase\(side\) \{/, `function beginPhase(side) { if (globalThis.GM && GM.on) GM.phase(side, W, { inCastle, famOf, gateOpen, md });`);
// 패치4: 문이 열려 있고 열 만한 때만 수비가 성 밖으로 나감
patch(/if \(W\.siege && team\(u\) === 'D'\) rs = rs\.filter\(c => W\.castle \? inCastle\(c\.x, c\.y\) : true\);/,
  `if (W.siege && team(u) === 'D' && !(globalThis.GM && GM.on && GM.sortie)) rs = rs.filter(c => W.castle ? inCastle(c.x, c.y) : true);`);

const el = () => new Proxy(function () { }, { get: (t, k) => k === Symbol.toPrimitive ? () => '' : (k === 'length' ? 0 : el()), set: () => true, apply: () => el(), construct: () => el() });
const store = {};
// 시드 난수 (OFF/ON 을 같은 시드로 짝지어 비교)
let seed = 1; const rand = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
const M = Object.create(Math); M.random = rand;
const ctx = { console, Math: M, Date, JSON, setTimeout: () => 0, clearTimeout() { }, setInterval: () => 0, requestAnimationFrame: () => 0, performance: { now: () => Date.now() },
  localStorage: { getItem: k => store[k] ?? null, setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } },
  document: el(), navigator: { userAgent: 'node' }, location: { reload() { } } };
ctx.window = ctx; vm.createContext(ctx);
[...html.matchAll(/<script(?: [^>]*)?>([\s\S]*?)<\/script>/g)].forEach((m, i) => { try { vm.runInContext(m[1], ctx, { filename: 'block' + i }); } catch (e) { if (!/addEventListener/.test(e.message)) console.log('block', i, e.message); } });

// ---- 2차: 열기 기준 / 복귀 규칙 / 자동 문 지정 ----
// 규칙 객체 R = { open: 'ratio'|'ratioMor'|'ratioGate'|'never', th, ret: 'none'|'turns'|'threat', retN, retTh }
// 열기 기준: ratio=수비합>=th*공격합 / ratioMor=ratio 이고 수비 평균사기>=공격 평균사기 / ratioGate=수비합>=th*공격합 이고 문 내구<=50%
// 복귀: turns=문 연 뒤 retN턴이 지나면 출격 해제(근접은 농성 AI로 되돌려 성 안으로) / threat=수비합<retTh*공격합 이면 해제(한 번 해제하면 재출격 안 함)
const GM = ctx.GM = { on: false, R: null, sortie: false, charge: false, S: null, auto: null,
  setup(on, R) { this.on = on; this.R = R; this.charge = !!(R && R.open !== 'never'); this.sortie = false; this.ended = false;
    this.S = { openTurn: null, dOpen: 0, dOpenTurn: null, deny: 0, outSum: 0, outN: 0, outAfter: 0, outAfterN: 0, gateOcc: 0, gateT: 0, exitBlk: 0, exitN: 0, gates: [], aRanged0: null, tD0: null, autoMade: 0, autoGap: 0, autoReach: 0 }; },
  phase(side, W, h) {
    const S = this.S, R = this.R; const alive = s => W.units.filter(u => u.alive && (s === 'D' ? u.side === 'D' : u.side !== 'D'));
    if (side !== 'D') return;
    const A = alive('A'), D = alive('D'); const tA = A.reduce((s, u) => s + u.troops, 0), tD = D.reduce((s, u) => s + u.troops, 0);
    const mor = a => a.length ? a.reduce((s, u) => s + (u.mor ?? 50), 0) / a.length : 0;
    // 문 점유·출구 막힘 계측 (문이 열린 뒤)
    const gates = []; for (let y = 0; y < W.h; y++) for (let x = 0; x < W.w; x++) { const t = W.map[y][x].t; if (t === 'O') gates.push({ x, y }); }
    if (gates.length && S.openTurn == null) S.openTurn = W.turn;
    if (R && R.open !== 'never' && !h.gateOpen() && !this.ended) {
      let ok = false;
      if (R.open === 'ratio') ok = tD >= R.th * tA;
      else if (R.open === 'ratioMor') ok = tD >= R.th * tA && mor(D) >= mor(A);
      else if (R.open === 'ratioGate') { let g = null; W.map.forEach(r => r.forEach(c => { if (c.t === 'T' && (!g || c.hp < g.hp)) g = c; })); ok = !!g && tD >= R.th * tA && g.hp <= 0.5 * g.max; }
      if (ok) { let best = null; for (let y = 0; y < W.h; y++) for (let x = 0; x < W.w; x++) if (W.map[y][x].t === 'T') { const d = Math.min(...A.map(a => Math.abs(a.x - x) + Math.abs(a.y - y))); if (!best || d < best.d) best = { x, y, d }; }
        if (best) { const c = W.map[best.y][best.x]; c.t = 'O'; c.hp = 0; S.dOpen = 1; S.dOpenTurn = W.turn; S.openTurn = S.openTurn ?? W.turn; S.gates.push({ x: best.x, y: best.y }); this.sortie = true; } }
    }
    if (S.dOpen && this.sortie) { // 복귀 판정
      if (R.ret === 'turns' && W.turn - S.dOpenTurn >= R.retN) { this.sortie = false; this.ended = true; }
      if (R.ret === 'threat' && tD < R.retTh * tA) { this.sortie = false; this.ended = true; }
    }
    if (this.charge) D.forEach(u => { if (u.id === W.hq.D) return; if ([2, 4, 5].includes(h.famOf(u))) return; if (this.sortie) { if (u.ai === 3) { u.ai = 1; u._g = 1; } } else if (u._g) { u.ai = 3; u._g = 0; } });
    if (S.dOpen) {
      const outside = D.filter(u => !h.inCastle(u.x, u.y)).length; S.outSum += outside / Math.max(1, D.length); S.outN++;
      if (this.ended) { S.outAfter += outside / Math.max(1, D.length); S.outAfterN++; }
      S.gates.forEach(g => { S.gateT++; if (W.units.some(u => u.alive && u.x === g.x && u.y === g.y)) S.gateOcc++;
        // 출구 막힘: 문 칸의 4방 이웃 중 성 밖 칸이 모두 적 부대 점유거나 적 바로 옆(접촉)이면 막힘으로 센다
        const outs = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => ({ x: g.x + dx, y: g.y + dy })).filter(p => W.map[p.y] && W.map[p.y][p.x] && !h.inCastle(p.x, p.y) && !['L', 'T', 'W'].includes(W.map[p.y][p.x].t));
        S.exitN++; if (outs.length && outs.every(p => A.some(a => Math.abs(a.x - p.x) + Math.abs(a.y - p.y) <= 1))) S.exitBlk++; });
    }
  },
  // 문 없는 지도 자동 문 지정: 성곽 상자 둘레의 성벽(L) 칸 중 mode 'near'=공격 중심에 가장 가까운 칸, 'mid'=적이 오는 쪽 변의 한가운데 칸
  autoGate(W, mode) {
    if (!W.castle) return false; let hasT = false; W.map.forEach(r => r.forEach(c => { if (c.t === 'T' || c.t === 'O') hasT = true; })); if (hasT) return false;
    const C = W.castle, A = W.units.filter(u => u.alive && u.side !== 'D'); if (!A.length) return false;
    const ax = A.reduce((s, u) => s + u.x, 0) / A.length, ay = A.reduce((s, u) => s + u.y, 0) / A.length;
    const cx = (C.x0 + C.x1) / 2, cy = (C.y0 + C.y1) / 2, hw = (C.x1 - C.x0 + 1) / 2, hh = (C.y1 - C.y0 + 1) / 2;
    const dx = (ax - cx) / hw, dy = (ay - cy) / hh; const side = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'E' : 'W') : (dy > 0 ? 'S' : 'N');
    const per = []; for (let y = C.y0; y <= C.y1; y++) for (let x = C.x0; x <= C.x1; x++) if ((x === C.x0 || x === C.x1 || y === C.y0 || y === C.y1) && W.map[y][x].t === 'L') per.push({ x, y });
    if (!per.length) return false;
    const pass = (x, y) => W.map[y] && W.map[y][x] && !['L', 'T', 'O', 'W', 'M'].includes(W.map[y][x].t);
    const reach = p => { const n4 = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([a, b]) => ({ x: p.x + a, y: p.y + b })); const ins = n4.some(q => q.x >= C.x0 && q.x <= C.x1 && q.y >= C.y0 && q.y <= C.y1 && pass(q.x, q.y)), out = n4.some(q => !(q.x >= C.x0 && q.x <= C.x1 && q.y >= C.y0 && q.y <= C.y1) && pass(q.x, q.y)); return ins && out; };
    let cand = per.filter(reach); const reachable = cand.length > 0; if (!cand.length) cand = per;
    let pick;
    if (mode === 'near') pick = cand.reduce((b, p) => (!b || Math.abs(p.x - ax) + Math.abs(p.y - ay) < Math.abs(b.x - ax) + Math.abs(b.y - ay)) ? p : b, null);
    else { const sidePts = cand.filter(p => side === 'E' ? p.x === C.x1 : side === 'W' ? p.x === C.x0 : side === 'S' ? p.y === C.y1 : p.y === C.y0); const pool = sidePts.length ? sidePts : cand;
      const mx = side === 'E' ? C.x1 : side === 'W' ? C.x0 : cx, my = side === 'S' ? C.y1 : side === 'N' ? C.y0 : cy; pick = pool.reduce((b, p) => (!b || Math.abs(p.x - mx) + Math.abs(p.y - my) < Math.abs(b.x - mx) + Math.abs(b.y - my)) ? p : b, null); }
    const c = W.map[pick.y][pick.x]; c.t = 'T'; c.hp = c.max = 900;
    let gap = 0; for (let y = C.y0; y <= C.y1; y++) for (let x = C.x0; x <= C.x1; x++) if ((x === C.x0 || x === C.x1 || y === C.y0 || y === C.y1) && !['L', 'T', 'O'].includes(W.map[y][x].t) && pass(x, y)) gap++;
    this.S.autoMade = 1; this.S.autoGap = gap; this.S.autoReach = reachable ? 1 : 0; return true;
  } };

const N = +(process.argv[2] || 60); const only = process.argv[3] || '';
const wilson = (k, n) => { const z = 1.96, p = k / n, d = 1 + z * z / n, c = p + z * z / (2 * n), s = z * Math.sqrt(p * (1 - p) / n + z * z / (4 * n * n)); return [(c - s) / d, (c + s) / d]; };
const DSIZE = 8000;
const run = (mapId, aMul, on, R, autoMode) => vm.runInContext(`(() => {
  GM.setup(${on}, ${JSON.stringify(R)}); newGame('조조');
  const us = autoUnits(gensIn('초', '조조'), ${Math.round(DSIZE * aMul)}, 5);
  const du = autoUnits(gensOf('동탁').filter(g => g.loc === '낙양').slice(0, 6), ${DSIZE}, 5);
  V4.start('조조', '초', '진류', us, 4000, 'A', '농성', { dUnits: du${mapId != null ? ', mapId: ' + mapId : ''} });
  let T0 = 0; V4.W.map.forEach(r => r.forEach(c => { if (c.t === 'T') T0++; }));
  ${autoMode ? `if (GM.on) GM.autoGate(V4.W, '${autoMode}');` : ''}
  V4.simulate(40); const W = V4.W; return { w: W.over, t: W.turn, S: GM.S, T0 };
})()`, ctx);
const MAPS = [2, 8, 23, 30, 42, 48];
const avg = (a, f) => a.length ? a.reduce((s, x) => s + f(x), 0) / a.length : NaN;
function cond(label, maps, aMul, on, R, autoMode) {
  const r = []; for (let i = 0; i < N; i++) { seed = 1000 + i * 7919; r.push(run(maps ? maps[i % maps.length] : null, aMul, on, R, autoMode)); }
  const k = r.filter(x => x.w === 'A').length, [lo, hi] = wilson(k, N), avgT = avg(r, x => x.t);
  const sd = Math.sqrt(r.reduce((s, x) => s + (x.t - avgT) ** 2, 0) / (N - 1)), se = sd / Math.sqrt(N);
  const d = r.filter(x => x.S.dOpen), af = r.filter(x => x.S.outAfterN);
  let line = `${label} | 공격승 ${k}/${N} (${(100 * k / N).toFixed(0)}%, ${(100 * lo).toFixed(0)}~${(100 * hi).toFixed(0)}) | 턴 ${avgT.toFixed(1)}±${(1.96 * se).toFixed(1)} | 문 열린 판 ${d.length}/${N} (${(100 * d.length / N).toFixed(0)}%, 첫 열림 턴 ${avg(d, x => x.S.dOpenTurn).toFixed(1)})`;
  if (d.length) line += ` | 성밖비율(출격중 평균) ${(100 * avg(d.filter(x => x.S.outN), x => x.S.outSum / x.S.outN)).toFixed(0)}%` + (af.length ? `, 복귀뒤 ${(100 * avg(af, x => x.S.outAfter / x.S.outAfterN)).toFixed(0)}%(${af.length}판)` : '') + ` | 문칸 점유 ${(100 * avg(d.filter(x => x.S.gateT), x => x.S.gateOcc / x.S.gateT)).toFixed(0)}%턴, 출구막힘 ${(100 * avg(d.filter(x => x.S.exitN), x => x.S.exitBlk / x.S.exitN)).toFixed(0)}%턴`;
  if (autoMode) { const m = r.filter(x => x.S.autoMade); line += ` | 자동문 ${m.length}/${N}판(원래 문 없음 ${r.filter(x => x.T0 === 0).length}), 통행가능 ${m.filter(x => x.S.autoReach).length}, 벽 틈 평균 ${avg(m, x => x.S.autoGap).toFixed(1)}칸`; }
  console.log(line); return { k, N, d: d.length };
}
const MULS = [1.0, 1.3, 1.6, 2.0]; // 공격/수비 병력 배수
const section = n => !only || only.includes(n);
if (section('1')) { // ① 열기 기준 비교 (문 있는 공성 지도 6개), 열고 출격(복귀 없음)
  const rules = [['K1 병력비>=1.0', { open: 'ratio', th: 1.0, ret: 'none' }], ['K2 병력비>=1.3', { open: 'ratio', th: 1.3, ret: 'none' }], ['K3 병력비>=0.8', { open: 'ratio', th: 0.8, ret: 'none' }],
    ['K4 병력비>=1.0+사기>=적', { open: 'ratioMor', th: 1.0, ret: 'none' }], ['K5 병력비>=0.6+문내구<=50%', { open: 'ratioGate', th: 0.6, ret: 'none' }]];
  for (const m of MULS) { console.log(`--- ① 공격 병력 x${m} (수비/공격 병력비 ${(1 / m).toFixed(2)}) ---`); cond('OFF(현행)', MAPS, m, false, null); cond('ON 규칙만(안 엶)', MAPS, m, true, { open: 'never' }); for (const [l, R] of rules) cond('ON ' + l, MAPS, m, true, R); }
}
if (section('2')) { // ② 복귀 규칙: 같은 열기 기준(K3 병력비>=0.8, K5)에서 복귀 비교
  const base = [['K3', { open: 'ratio', th: 0.8 }], ['K5', { open: 'ratioGate', th: 0.6 }]];
  const rets = [['복귀없음', { ret: 'none' }], ['2턴뒤 복귀', { ret: 'turns', retN: 2 }], ['4턴뒤 복귀', { ret: 'turns', retN: 4 }], ['위협시(병력비<0.7) 복귀', { ret: 'threat', retTh: 0.7 }], ['위협시(병력비<0.9) 복귀', { ret: 'threat', retTh: 0.9 }]];
  for (const m of [1.0, 1.3, 1.6]) { console.log(`--- ② 공격 병력 x${m} ---`); cond('OFF(현행)', MAPS, m, false, null); for (const [bl, b] of base) for (const [rl, r] of rets) cond(`ON ${bl} ${rl}`, MAPS, m, true, Object.assign({}, b, r)); }
}
if (section('3')) { // ③ 문 없는 지도 자동 문 지정: 무작위 공성 지도, 최종 규칙(REC)로 비교
  const REC = JSON.parse(process.env.REC || '{"open":"ratio","th":0.8,"ret":"none"}');
  for (const m of [1.0, 1.6]) { console.log(`--- ③ 무작위 공성 지도, 공격 x${m}, 규칙 ${JSON.stringify(REC)} ---`); cond('OFF(현행)', null, m, false, null);
    cond('ON 규칙만, 자동문 없음', null, m, true, { open: 'never' }); cond('ON 규칙만, 자동문 near(가까운 칸)', null, m, true, { open: 'never' }, 'near'); cond('ON 규칙만, 자동문 mid(적 쪽 변 한가운데)', null, m, true, { open: 'never' }, 'mid');
    cond('ON REC, 자동문 mid', null, m, true, REC, 'mid'); }
}
