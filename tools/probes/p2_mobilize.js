// 탐침 P2: 총동원령 환급 (징병 6000 + 자동 진휼. 기준 정책없음 금 -390, 총동원령 -273, 민충 75->87, 병력 +1200)
(() => {
  const out = [];
  for (const pol of [false, true]) {
    newGame('조조'); const cn = capitalOf(S.player), c = C(cn); const g = gensIn(cn, S.player)[0];
    c.loy = 75; c.gold = 20000; c.food = 10; S._auto = cn; if (pol) S.fac[S.player].pol = ['총동원령'];
    const g0 = c.gold, t0 = c.troops, l0 = c.loy; const r = cmdDraft(cn, g.n, 6000); S._auto = null;
    out.push([pol ? '총동원령' : '정책없음', '금', c.gold - g0, '병력', c.troops - t0, '민충', l0 + '->' + c.loy, r && r.ok]);
  }
  return out;
})()
