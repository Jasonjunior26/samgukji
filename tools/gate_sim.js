// 성문 규칙 시험기 (docs/성문_설계.md '검증 계획'). html은 고치지 않고 메모리에서만 문자열 패치한다.
// 사용: node tools/gate_sim.js [판수=60] [out]    (결과는 stdout; 파일로 저장해 head/grep으로 볼 것)
// 규칙 on 의 구현(설계 문서와의 차이는 docs/성문_설계.md '시험기 구현 범위'에 적음):
//  R2 성 안(성곽 상자)↔밖 칸의 부대끼리는 원거리(famOf 2·4·5)만 칠 수 있다. 열린 문('O')이 하나라도 있으면 해제.
//  R3 닫힌 성문('T')은 수비도 못 지난다. 수비 AI가 openOK 일 때 수비 단계 시작에 문 하나를 연다('O').
//  R4 열린 문은 닫히지 않고 공격도 지난다. R5 공격은 기존대로 부숴서만(hitGate).
//  AI openOK: 수비 병력 합 >= RATIO x 공격 병력 합, 또는 공격 원거리 부대가 처음의 절반 이하, 또는 성 밖에 나온 수비 부대가 있음.
//  열린 뒤 수비는 성 밖으로 나갈 수 있음(농성 제한 해제). RATIO=0이면 규칙 R2·R3만(AI는 안 연다)이 아니라 '항상 연다'.
const fs = require('fs'), vm = require('vm'), path = require('path');
let html = fs.readFileSync(path.join(__dirname, '..', 'samguk_v109.html'), 'utf8');
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

// GM: 규칙 상태·계측
const GM = ctx.GM = { on: false, ratio: 1.3, sortie: false, charge: false, S: null, setup(on, ratio, charge) { this.on = on; this.ratio = ratio; this.charge = !!charge; this.sortie = false; this.S = { open: 0, openTurn: null, dOpen: 0, dOpenTurn: null, blocked: 0, deny: 0, queueSum: 0, queueN: 0, outSum: 0, outN: 0, aRanged0: null, gates: [] }; },
  phase(side, W, h) {
    const S = this.S; const alive = s => W.units.filter(u => u.alive && (s === 'D' ? u.side === 'D' : u.side !== 'D'));
    if (S.aRanged0 == null) S.aRanged0 = alive('A').filter(u => [2, 4, 5].includes(h.famOf(u))).length;
    const anyO = h.gateOpen(); if (anyO && S.openTurn == null) { S.openTurn = W.turn; S.open = 1; }
    if (side !== 'D') return;
    const A = alive('A'), D = alive('D'); const tA = A.reduce((s, u) => s + u.troops, 0), tD = D.reduce((s, u) => s + u.troops, 0);
    const aR = A.filter(u => [2, 4, 5].includes(h.famOf(u))).length;
    const outside = D.filter(u => !h.inCastle(u.x, u.y)).length;
    const ok = this.ratio === 0 || tD >= this.ratio * tA || (S.aRanged0 > 0 && aR * 2 <= S.aRanged0) || outside > 0;
    if (ok && !h.gateOpen()) { // 한 번에 한 문: 가장 가까운 적에게 제일 가까운 문
      let best = null; for (let y = 0; y < W.h; y++) for (let x = 0; x < W.w; x++) if (W.map[y][x].t === 'T') { const d = Math.min(...A.map(a => Math.abs(a.x - x) + Math.abs(a.y - y))); if (!best || d < best.d) best = { x, y, d }; }
      if (best) { const c = W.map[best.y][best.x]; c.t = 'O'; c.hp = 0; S.dOpen = 1; S.dOpenTurn = W.turn; S.open = 1; S.openTurn = S.openTurn ?? W.turn; S.gates.push({ x: best.x, y: best.y }); }
    }
    this.sortie = ok && h.gateOpen();
    if (this.charge) D.forEach(u => { if (u.id === W.hq.D) return; if ([2, 4, 5].includes(h.famOf(u))) return; if (this.sortie) { if (u.ai === 3) { u.ai = 1; u._g = 1; } } else if (u._g) { u.ai = 3; u._g = 0; } });
    if (S.dOpen) { // 병목·ZOC 계측: 문 앞 대기 줄, 문 바로 옆의 적(ZOC가 출구를 막음)
      S.outSum += outside / Math.max(1, D.length); S.outN++;
      S.gates.forEach(g => { S.queueSum += D.filter(u => h.inCastle(u.x, u.y) && Math.abs(u.x - g.x) + Math.abs(u.y - g.y) <= 2).length; S.queueN++; if (A.some(a => Math.abs(a.x - g.x) + Math.abs(a.y - g.y) === 1)) S.blocked++; });
    }
  } };

const N = +(process.argv[2] || 60);
const wilson = (k, n) => { const z = 1.96, p = k / n, d = 1 + z * z / n, c = p + z * z / (2 * n), s = z * Math.sqrt(p * (1 - p) / n + z * z / (4 * n * n)); return [(c - s) / d, (c + s) / d]; };
ctx.__N = N;
const run = (siege, size, mapId, on, ratio, charge, i) => vm.runInContext(`(() => {
  GM.setup(${on}, ${ratio}, ${!!charge}); newGame('조조');
  const us = autoUnits(gensIn('초', '조조'), ${size}, 5);
  const du = autoUnits(gensOf('동탁').filter(g => g.loc === '낙양').slice(0, 6), ${size}, 5);
  V4.start('조조', '초', '진류', us, 4000, 'A', ${siege ? "'농성'" : "'야전'"}, { dUnits: du${mapId != null ? ', mapId: ' + mapId : ''} });
  let T = 0; V4.W.map.forEach(r => r.forEach(c => { if (c.t === 'T') T++; }));
  V4.simulate(40); const W = V4.W; return { w: W.over, why: W.why, t: W.turn, S: GM.S, T, lim: /제한 턴/.test(W.why || '') };
})()`, ctx);
const MAPS = [2, 8, 23, 30, 42, 48]; // 성문 칸(T)이 있는 공성 지도
function cond(label, siege, size, maps, on, ratio, charge) {
  const r = []; for (let i = 0; i < N; i++) { seed = 1000 + i * 7919; const mp = maps ? maps[i % maps.length] : null; r.push(run(siege, size, mp, on, ratio, charge, i)); }
  const k = r.filter(x => x.w === 'A').length, [lo, hi] = wilson(k, N); const avgT = r.reduce((s, x) => s + x.t, 0) / N;
  const sd = Math.sqrt(r.reduce((s, x) => s + (x.t - avgT) ** 2, 0) / (N - 1)), se = sd / Math.sqrt(N);
  const dOp = r.filter(x => x.S.dOpen), anyOp = r.filter(x => x.S.open), lim = r.filter(x => x.lim).length;
  const avg = (a, f) => a.length ? (a.reduce((s, x) => s + f(x), 0) / a.length) : NaN;
  const q = dOp.filter(x => x.S.queueN); const noT = r.filter(x => x.T === 0).length;
  console.log(`${label} | 공격승 ${k}/${N} (${(100 * k / N).toFixed(0)}%, 95% ${(100 * lo).toFixed(0)}~${(100 * hi).toFixed(0)}) | 턴 ${avgT.toFixed(1)}±${(1.96 * se).toFixed(1)} | 제한턴종료 ${lim} | 문열림 ${anyOp.length} (수비가 엶 ${dOp.length}, 첫열림 턴 ${avg(anyOp, x => x.S.openTurn).toFixed(1)}) | 문없는지도 ${noT} | R2 거부 ${avg(r, x => x.S.deny).toFixed(1)}회/판` +
    (dOp.length ? ` | 병목: 문 2칸 내 줄 ${avg(q, x => x.S.queueSum / x.S.queueN).toFixed(2)}부대, 성밖 비율 ${(100 * avg(dOp.filter(x => x.S.outN), x => x.S.outSum / x.S.outN)).toFixed(0)}%, 문 앞 적 접촉(ZOC) ${avg(dOp, x => x.S.blocked).toFixed(2)}회/판` : ''));
}
const quick = process.argv[3] === 'quick';
for (const size of [8000, 15000]) {
  console.log('--- 공성 문 있는 지도 ' + JSON.stringify(MAPS) + ' size ' + size + ' ---');
  cond('OFF', true, size, MAPS, false, 0, false);
  cond('ON 규칙만(안 열음, 출격X)', true, size, MAPS, true, 99, false);
  for (const rt of [1.3, 1.15, 1.0, 0]) cond('ON ratio ' + rt + (rt === 0 ? '(항상)' : '') + ' 열고 출격', true, size, MAPS, true, rt, true);
  cond('ON ratio 1.0 열기만(출격X)', true, size, MAPS, true, 1.0, false);
}
if (!quick) {
  for (const size of [8000, 15000]) { console.log('--- 공성 지도 무작위(기준선과 같은 조건) size ' + size + ' ---'); cond('OFF', true, size, null, false, 0, false); cond('ON ratio 1.3 열고 출격', true, size, null, true, 1.3, true); }
  console.log('--- 야전 지도 무작위 size 8000 ---'); cond('OFF', false, 8000, null, false, 0, false); cond('ON ratio 1.3 열고 출격', false, 8000, null, true, 1.3, true);
}
