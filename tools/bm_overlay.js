// 인연·공적 규칙 시험 레이어. html을 고치지 않고 vm 안에서 함수를 덮어써 새 규칙을 시험한다.
// 사용: 시험기가 require 해서 install(ctx, params)를 부르거나, PRESET=new 로 기본안을 쓴다. params가 null이면 v105 그대로(대조군).
// 안 확정 후 html에 반영할 때는 아래 덮어쓰기를 본 코드의 상수·식으로 옮긴다 (docs/인연공적_측정.md 참고).
const vm = require('vm');
// 새 안(초안). 인연은 전투 동행이 가장 크고, 근무·등용·석방은 낮춤. 공적은 성과(격파·MVP·실제 증가량) 기반.
const NEW = {
  // 인연
  bw: 3, bl: 2, rescue: 5, minC: 20, jeal: -2,           // 같은 부대 승/패 +, 구원 +, 결의·생사는 함께 싸운 횟수 minC 이상일 때만
  cohabNear: 1, cohabFar: 0, cohabCap: 25,     // 같은 도시 분기마다 (기질 가까움/멂), 상한
  recruitBond: 8, captJoin: 5, captFree: 8,    // 등용(+30), 포로 귀순(+15), 포로 석방(+25)
  // 공적
  kill: 3, mvp: 8, win: 2,                     // 격파당, 승리팀 MVP, 승리 + 부대가 1격파 이상일 때
  devK: 0.3, loyK: 0.15, armK: 0.1, supK: 0.1, // 내정·민심·군비·토벌은 실제 증가량 × 계수
  scheme: 2, diplo: 2, recruit: 2              // 계략·외교·등용은 성공했을 때만
};
const SRC = `(() => {
  const O = OV; if (!O) return;
  const win_ = globalThis;
  // ---------- 공적: 행동이 아니라 성과로 ----------
  // 기존 공적 가산을 되돌리고(호출 전 값으로 복원) 성과식으로 다시 더한다
  function wrapM(name, gi, gainFn) {
    const f = win_[name]; if (typeof f !== 'function') return;
    win_[name] = function () {
      const a = arguments; const g = G(a[gi]); const m0 = g ? (g.merit || 0) : 0; const snap = gainFn.before ? gainFn.before(a) : null;
      const r = f.apply(this, a);
      if (g && r && r.ok) { g.merit = m0 + gainFn.add(a, snap, r); } else if (g) g.merit = m0;
      return r;
    };
  }
  const cs = a => { const c = C(a[0]); return c ? { dev: c.dev, com: c.com, flood: c.flood, def: c.def, loy: c.loy, band: c.bandit || 0, arm: Object.values(c.arm || {}).reduce((s, x) => s + x, 0) } : null; };
  const df = (a, s, k) => { const c = C(a[0]); const cur = { dev: c.dev, com: c.com, flood: c.flood, def: c.def, loy: c.loy, band: c.bandit || 0, arm: Object.values(c.arm || {}).reduce((x, y) => x + y, 0) }; return { cur, d: k.map(x => cur[x] - s[x]) }; };
  wrapM('cmdDevelop', 1, { before: cs, add: (a, s) => { const { d } = df(a, s, ['dev', 'com', 'flood', 'def']); return Math.max(0, d.reduce((x, y) => x + y, 0)) * O.devK; } });
  wrapM('cmdLoy', 1, { before: cs, add: (a, s) => Math.max(0, df(a, s, ['loy']).d[0]) * O.loyK });
  wrapM('cmdArm', 1, { before: cs, add: (a, s) => Math.max(0, df(a, s, ['arm']).d[0]) * O.armK });
  wrapM('cmdSuppress', 1, { before: cs, add: (a, s) => Math.max(0, -df(a, s, ['band']).d[0]) * O.supK });
  wrapM('cmdScheme', 1, { add: () => O.scheme });
  wrapM('cmdDiplo', 1, { add: () => O.diplo });
  wrapM('cmdRecruit', 1, { add: () => O.recruit });
  // 전투: 출전·패배 0. 격파, 승리팀 MVP, (1격파 이상 부대의) 승리만
  { const f = finishBattle; finishBattle = function () {
    const units = (B && B.units) || []; const win = B && B.over; const before = {}; units.forEach(u => mem(u).forEach(n => { const g = G(n); if (g) before[n] = g.merit || 0; }));
    const r = f.apply(this, arguments);
    const mvp = side => { const b = units.filter(u => u.side === side && u.gen).sort((a, b) => (b.dd + b.k * 1000) - (a.dd + a.k * 1000))[0]; return b ? b.gen : null; };
    const ms = { A: mvp('A'), D: mvp('D') };
    if (O.debug) (globalThis.DBG = globalThis.DBG || []).push(units.map(u => ({ s: u.side, g: u.gen, k: u.k, dd: Math.round(u.dd || 0), tr: u.troops, mx: u.max, ml: mem(u).length })));
    units.forEach(u => mem(u).forEach(n => { const g = G(n); if (!g || before[n] === undefined) return; const w = u.side === win; g.merit = before[n] + u.k * O.kill + (w && ms[u.side] === n ? O.mvp : 0) + (w && u.k > 0 ? O.win : 0); }));
    return r;
  }; }
  // ---------- 인연 ----------
  // 전투: 같은 부대 승/패, 구원. 결의·생사 문턱(minC)은 badd 안 cap으로 막는다
  battleBonds = function (units, winSide, mvp, place, rescue) {
    units.forEach(u => {
      const ns = mem(u).filter(n => G(n) && G(n).st !== '사망'); const won = u.side === winSide;
      for (let i = 0; i < ns.length; i++) for (let j = i + 1; j < ns.length; j++) { const e = bent(ns[i], ns[j]); e.c++; badd(ns[i], ns[j], won ? O.bw : O.bl, e.c === 1 ? place + ' 전투에 함께 나섰다' : null); }
      if (mvp && ns.includes(mvp)) ns.forEach(n => { if (n !== mvp && G(n).pers && G(n).pers.공명 >= 7 && G(mvp).pers.공명 >= 6) badd(n, mvp, O.jeal); });
    });
    (rescue || []).forEach(([a, b]) => { if (G(a) && G(b) && G(a).st !== '사망' && G(b).st !== '사망') badd(a, b, O.rescue, place + ' 전투에서 위기를 구해주었다'); });
  };
  { const f = badd; badd = function (a, b, v, note, tag, cap) {
    if (note) { if (note.includes('의 권유로')) v = O.recruitBond; else if (note.includes('귀순했다')) v = O.captJoin; else if (note.includes('풀어주었다')) v = O.captFree; }
    if (v > 0 && !tag && cap == null && S.bond) { const e = S.bond[bkey(a, b)]; if (e && e.c < O.minC && !(e.t || []).includes('결의') && !(e.t || []).includes('생사')) cap = 99; }
    return f.call(this, a, b, v, note, tag, cap);
  }; }
  // 같은 도시 근무
  monthlyBonds = function () {
    if (!S.bond) initBonds();
    if (S.m % 3 === 0) Object.values(S.city).forEach(c => {
      if (!c.owner) return; const gs = gensIn(c.n, c.owner).filter(g => !g.away); if (gs.length < 2) return;
      const lim = gs.slice(0, 14);
      for (let i = 0; i < lim.length; i++) for (let j = i + 1; j < lim.length; j++) { const a = lim[i], b = lim[j]; const cur = bget(a.n, b.n); if (cur >= 60 && !S.bond[bkey(a.n, b.n)].c) continue; const v = ssDist(a.ss, b.ss) > 60 ? O.cohabFar : O.cohabNear; if (v) badd(a.n, b.n, v, null, null, O.cohabCap); }
    });
    if (S.m === 12) pruneBonds();
  };
})();`;
function install(ctx, params) { ctx.OV = params ? Object.assign({}, NEW, params) : null; vm.runInContext(SRC, ctx, { filename: 'bm_overlay' }); }
function fromEnv() { const p = process.env.PRESET || 'base'; const o = process.env.OV ? JSON.parse(process.env.OV) : null; if (p === 'base' && !o) return null; return Object.assign({}, p === 'new' ? NEW : {}, o || {}); }
module.exports = { install, fromEnv, NEW };
