// 탐침 P3: 은 포상 금 변화 (기준 +240 하후돈 / +250 하후연 / +250 조인, 금 300 포상은 -60)
(() => {
  newGame('조조'); const cn = capitalOf(S.player), out = [];
  const gs = gensIn(cn, S.player).slice(0, 3);
  gs.forEach(t => { const c = C(cn); c.cargo = { 은: 1 }; c.gold = 5000; t.loy = 60; t.rewards = []; const g0 = c.gold, l0 = t.loy; const r = cmdReward(cn, t.n, 'silver:1'); out.push([t.n, '금', c.gold - g0, '충성', t.loy - l0, !!(r && r.ok), c.cargo && c.cargo.은]); });
  const t = gs[0], c = C(cn); c.gold = 5000; t.loy = 60; t.rewards = []; const g0 = c.gold; const r = cmdReward(cn, t.n, 'gold:300'); out.push(['gold300', c.gold - g0, t.loy - 60, !!(r && r.ok)]);
  { // AI 세력 도시: 금 포상 요청이 창고에 은이 있으면 은 포상으로 바뀐다(cmdReward 안)
    const fid = Object.keys(S.fac).find(f => f !== S.player && S.fac[f].alive && citiesOf(f).length); const ac = citiesOf(fid)[0], ag = gensIn(ac.n, fid)[0];
    if (ag) { ac.cargo = { 은: 2 }; ac.gold = 5000; ag.loy = 60; ag.rewards = []; const g0 = ac.gold, l0 = ag.loy; const r = cmdReward(ac.n, ag.n, 'gold:100'); out.push(['AI', '금', ac.gold - g0, '충성', ag.loy - l0, !!(r && r.ok), ac.cargo.은]); }
  }
  return out;
})()
