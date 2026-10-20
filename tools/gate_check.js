// 성문 규칙(v4.11) 점검기: 게임 HTML을 Node vm 에 올려 원본 지도별 성곽·성문 수, 자동 성문·틈 메우기, 수비 AI 열기(병력비 1.3)를 찍는다.
// 사용: node tools/gate_check.js > docs/sim/v107_s3_gate_check.txt   (패치 없이 실제 코드로 돈다)
const fs = require('fs'), vm = require('vm'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'samguk_v107.html'), 'utf8');
const el = () => new Proxy(function () { }, { get: (t, k) => k === Symbol.toPrimitive ? () => '' : (k === 'length' ? 0 : el()), set: () => true, apply: () => el(), construct: () => el() });
const store = {};
let seed = 7; const rnd = () => { seed = (seed + 0x6D2B79F5) >>> 0; let t = seed; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const M = Object.create(Math); M.random = rnd;
const ctx = { console: { log() { }, error() { }, warn() { }, info() { } }, Math: M, Date, JSON, setTimeout: () => 0, clearTimeout() { }, setInterval: () => 0, requestAnimationFrame: () => 0, performance: { now: () => Date.now() },
  localStorage: { getItem: k => store[k] ?? null, setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } },
  document: el(), navigator: { userAgent: 'node' }, location: { reload() { } } };
ctx.window = ctx; vm.createContext(ctx);
[...html.matchAll(/<script(?: [^>]*)?>([\s\S]*?)<\/script>/g)].forEach((m, i) => { try { vm.runInContext(m[1], ctx, { filename: 'block' + i }); } catch (e) { } });

const out = vm.runInContext(`(() => {
  const R = [];
  const say = (...a) => R.push(a.join(' '));
  const cnt = (W, t) => { let n = 0; W.map.forEach(r => r.forEach(c => { if (c.t === t) n++; })); return n; };
  // 1) 원본 지도 목록: 종류·크기·성곽 칸·성문 자리
  const ids = Object.keys(JOJO_MAPS).map(Number).sort((a, b) => a - b);
  say("== 원본 지도 (id kind terr w×h gates)");
  ids.forEach(id => { const jm = JOJO_MAPS[id]; say(id, jm.kind, jm.terr, jm.w + '×' + jm.h, 'gates', (jm.gates || []).length); });
  // 2) 지도별 V4.start 결과
  newGame('조조');
  const mk = (size) => ({ us: autoUnits(gensIn('초', '조조'), size, 5), du: autoUnits(gensOf('동탁').filter(g => g.loc === '낙양').slice(0, 6), size, 5) });
  const run = (id, mode, size, defTroops) => { const { us, du } = mk(size); const o = { dUnits: du, mapId: id }; if (defTroops) o.dUnits = autoUnits(gensOf('동탁').filter(g => g.loc === '낙양').slice(0, 6), defTroops, 5);
    V4.start('조조', '초', '진류', us, 4000, null, mode, o); return V4.W; };
  say(''); say('== 지도별 시작 상태 (id 모드 castle T O 자동문 틈메움 수비안/밖 공격안/밖)');
  const castleMaps = [], noGate = [];
  ids.forEach(id => { const jm = JOJO_MAPS[id]; const mode = jm.kind === 'siege' ? '농성' : '야전'; const W = run(id, mode, 8000);
    const c = W.castle; const inC = s => W.units.filter(u => u.side === s && V4.inCastle(u.x, u.y)).length, outC = s => W.units.filter(u => u.side === s && !V4.inCastle(u.x, u.y)).length;
    if (c) castleMaps.push(id); if (c && W.siege && W.autoGate) noGate.push(id);
    say(id, W.mode, c ? c.x0 + ',' + c.y0 + '-' + c.x1 + ',' + c.y1 : '-', 'T', cnt(W, 'T'), 'O', cnt(W, 'O'), W.autoGate ? '자동문 ' + W.autoGate.x + ',' + W.autoGate.y + '(' + W.autoGate.side + ')' : '-', W.autoGate ? '틈 ' + W.autoGate.filled : '-', '수비', inC('D') + '/' + outC('D'), '공격', inC('A') + '/' + outC('A')); });
  say('성곽 있는 지도:', castleMaps.join(' ')); say('공성 자동문 지도(원래 T 0개):', noGate.join(' '));
  // 3) 야전 작은 성 11·16·17·20: 야전으로 시작하면 자동문·틈 메우기 없음
  say(''); say('== 야전 작은 성 (11·16·17·20) 야전 시작');
  [11, 16, 17, 20].forEach(id => { const W = run(id, '야전', 8000); say(id, 'siege', W.siege, 'castle', !!W.castle, 'T', cnt(W, 'T'), 'autoGate', !!W.autoGate, '수비 성안', W.units.filter(u => u.side === 'D' && V4.inCastle(u.x, u.y)).length); });
  // 4) 수비 AI 열기: 문 있는 공성 지도에서 수비 병력을 공격의 2배 / 같게 하고 10턴 돌림
  say(''); say('== 수비 AI 열기 (병력비 1.3): 지도 수비배율 → 열림턴 aiOpened sortie 승자 턴');
  const gateMaps = ids.filter(id => JOJO_MAPS[id].kind === 'siege');
  let opened2 = 0, opened1 = 0, n2 = 0, n1 = 0;
  gateMaps.forEach(id => { [2.0, 1.0].forEach(mul => { const W = run(id, '농성', 8000, 8000 * mul); if (!W.castle) return; const hasT = cnt(W, 'T') > 0; if (!hasT) return;
    const ev0 = W.ev.length; V4.simulate(12); const ev = W.ev.find(e => e.t === 'open'); const ot = ev ? W.log.findIndex(l => /열었다/.test(l)) : -1;
    if (mul === 2) { n2++; if (W.aiOpened) opened2++; } else { n1++; if (W.aiOpened) opened1++; }
    say(id, 'x' + mul, ev ? '열림(' + ev.x + ',' + ev.y + ')' : '안 열림', 'aiOpened', W.aiOpened || 0, 'sortie', !!W.sortie, '승', W.over || '-', '턴', W.turn); }); });
  say('수비 2배: 열린 판', opened2 + '/' + n2, '· 수비 1배: 열린 판', opened1 + '/' + n1);
  // 5) R2 점검: 성 안 수비 근접 부대가 성 밖 적을 칠 수 있는지 (문 닫힘) — canHit 직접 호출
  say(''); say('== R2 점검 (문 닫힘·열림일 때 성 안 근접 ↔ 성 밖 근접 canHit)');
  { const W = run(2, '농성', 8000); const d = W.units.find(u => u.side === 'D' && ![2, 4, 5].includes(V4.famOf(u)) && V4.inCastle(u.x, u.y)); const a = W.units.find(u => u.side === 'A' && ![2, 4, 5].includes(V4.famOf(u)));
    if (d && a) { const ox = a.x, oy = a.y; a.x = d.x + 1; a.y = d.y; // 적을 수비 옆으로 옮겨(성 안) → 같은 쪽이므로 가능
      const same = V4.canHit(d, a.x, a.y); // 적을 성 밖으로: 수비를 성벽 바로 안쪽, 적을 바로 바깥에
      const C = W.castle; d.x = C.x0 + 1; d.y = Math.floor((C.y0 + C.y1) / 2); a.x = C.x0 - 1; a.y = d.y; const near = Math.abs(a.x - d.x) === 2; d.x = C.x0; // 성벽 칸 위치(통행 불가지만 판정만)
      const cross = V4.canHit(d, a.x, a.y); const o = W.map.flat().find(c => c.t === 'T'); const t0 = o && o.t; if (o) o.t = 'O'; const crossOpen = V4.canHit(d, a.x, a.y); if (o) o.t = t0;
      say('같은 쪽 인접:', same, '· 안↔밖 인접(문 닫힘):', cross, '· 안↔밖 인접(문 열림):', crossOpen, '(수비 병종 fam', V4.famOf(d) + ')'); } else say('표본 부대 없음'); }
  // 6) moveCost: 닫힌 T 는 AI 수비(ai 3)·공격 모두 99, 플레이어 수비(ai 7)만 1
  { const W = run(2, '농성', 8000); const t = { t: 'T', hp: 100 }; const d = W.units.find(u => u.side === 'D'), a = W.units.find(u => u.side === 'A'); const ai0 = d.ai;
    d.ai = 3; const c3 = V4.moveCost(d, t); d.ai = 7; const c7 = V4.moveCost(d, t); d.ai = ai0; const ca = V4.moveCost(a, t); const co = V4.moveCost(a, { t: 'O', hp: 0 });
    say(''); say('== moveCost 닫힌 T: 수비 AI', c3, '수비 플레이어', c7, '공격', ca, '· 열린 O 공격', co); }
  return R.join(String.fromCharCode(10));
})()`, ctx);
console.log(out);
process.exit(0);
