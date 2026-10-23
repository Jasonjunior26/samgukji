// 탐침 F7: V4 교역 전법 5종 (교역도 80 조건). 마지막 식 값을 JSON 출력
(() => {
  const out = {}; newGame('조조'); const fid = '조조';
  ['kor', 'jpn', 'eeu', 'weu', 'usa'].forEach(n => { S.trade.rel[fid] = S.trade.rel[fid] || {}; S.trade.rel[fid][n] = 80; });
  const mk = () => { const us = autoUnits(gensIn('초', '조조'), 8000, 5), du = autoUnits(gensOf('동탁').filter(g => g.loc === '낙양').slice(0, 6), 8000, 5);
    V4.start('조조', '초', '진류', us, 4000, 'A', '야전', { dUnits: du }); const W = V4.W;
    for (let y = 0; y < W.h; y++) for (let x = 0; x < W.w; x++) { const c = W.map[y][x]; if (c.t !== 'P') c.t = 'P'; }
    return W; };
  let W = mk(); out.kinds = W.trad.A.kinds; out.left = W.trad.A.left; out.defKinds = W.trad.D.kinds;
  const us = () => W.units.filter(u => u.alive && u.side === 'A'), es = () => W.units.filter(u => u.alive && u.side === 'D');
  const place = (u, x, y) => { u.x = x; u.y = y; u.acted = false; u.moved = false; u.sts = {}; };
  const reset = () => { W = mk(); W.trad.A.left = 2; const a = us(), e = es(); a.forEach((u, i) => place(u, 1 + i, 1)); e.forEach((u, i) => place(u, 1 + i, 12)); return [a, e]; };
  const hp = o => o.troops;
  // 복병 (숲 칸)
  let [a, e] = reset(); W.map[3][3].t = 'F'; place(a[0], 3, 3); place(e[0], 4, 3); place(e[1], 3, 5); const b0 = [hp(e[0]), hp(e[1])];
  out.ambK = V4.tradKinds(a[0]).map(k => [k.kind, k.ok]); out.amb = V4.tradUse(a[0], 'ambush'); out.ambDmg = [b0[0] - hp(e[0]), b0[1] - hp(e[1])]; out.ambStuck = [e[0].tradStuck, e[1].tradStuck]; out.left1 = W.trad.A.left;
  V4.beginPhase('D'); out.stuckD1 = [!!e[0].sts.stuck, !!e[1].sts.stuck]; V4.beginPhase('D'); out.stuckD2 = [!!e[0].sts.stuck, !!e[1].sts.stuck];
  // 암습
  [a, e] = reset(); place(a[0], 3, 3); place(e[0], 6, 3); const r0 = hp(e[0]), m0 = e[0].mor; out.raid = V4.tradUse(a[0], 'raid'); out.raidDmg = r0 - hp(e[0]); out.raidMor = m0 - e[0].mor; out.raidPos = [a[0].x, a[0].y];
  // 기사 질주
  [a, e] = reset(); place(a[0], 3, 3); place(e[0], 6, 4); const g0 = hp(e[0]); out.gallop = V4.tradUse(a[0], 'gallop'); out.gallopDmg = g0 - hp(e[0]); out.gallopPos = [a[0].x, a[0].y];
  // 방진
  [a, e] = reset(); place(a[0], 3, 3); place(a[1], 4, 3); place(a[2], 3, 4); place(e[0], 5, 4); out.ph = V4.tradUse(a[0], 'phalanx'); out.phGd = [a[0].gdLeft, a[1].gdLeft, a[1].gdK];
  { [a, e] = reset(); place(a[0], 3, 3); place(a[1], 4, 3); place(a[2], 3, 4); place(e[0], 5, 3); W.trad.D = { left: 2, kinds: ['barrage'] }; const t = a[1].troops, tt = [a[0].troops, a[2].troops]; V4.tradUse(e[0], 'barrage'); const n0 = t - a[1].troops; a[1].troops = t; e[0].acted = false; a[1].gdLeft = 2; a[1].gdK = 0.3; V4.tradUse(e[0], 'barrage'); const n1 = t - a[1].troops; out.phRatio = [n0, n1, +(n1 / n0).toFixed(3)]; }
  // 포격
  [a, e] = reset(); place(a[0], 3, 3); place(e[0], 6, 3); place(e[1], 7, 3); const q0 = [hp(e[0]), hp(e[1])]; out.bar = V4.tradUse(a[0], 'barrage'); out.barDmg = [q0[0] - hp(e[0]), q0[1] - hp(e[1])];
  // 횟수 소진
  [a, e] = reset(); place(a[0], 3, 3); place(a[1], 4, 3); place(e[0], 6, 3); out.use1 = V4.tradUse(a[0], 'barrage'); out.use2 = V4.tradUse(a[1], 'barrage'); place(a[2], 3, 4); out.use3 = V4.tradUse(a[2], 'barrage'); out.left = W.trad.A.left;
  // 교역 0이면 불가
  S.trade.rel[fid] = {}; W = mk(); out.noKinds = V4.tradKinds(us()[0]).length; out.noUse = V4.tradUse(us()[0], 'barrage');
  // AI 시뮬: 양측 교역 전법 있는 상태에서 20판 오류 없음
  S.trade.rel[fid] = { kor: 80, jpn: 80, eeu: 80, weu: 80, usa: 80 }; let err = 0, used = 0, ok = 0;
  for (let i = 0; i < 20; i++) { try { W = mk(); V4.simulate(40); ok++; used += (W.ev.filter(x => x.t === 'trad').length); } catch (ex) { err++; out.err = String(ex.stack).slice(0, 300); } }
  out.sim = { ok, err, used };
  return out;
})()
