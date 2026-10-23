// 탐침 P2: 총동원령 환급 (징병 6000 + 자동 진휼 300). 정상은 정책 없음 -390 / 총동원령 -363(징병비 90의 30% 환급).
// 뿌리가 총동원령 소속이 아니면(polW 0.6) 환급 60% = 약 -373.
(() => {
  const out = [];
  for (const [label, pol, root] of [['정책없음', false, null], ['총동원령(뿌리 없음)', true, null], ['총동원령(소속 뿌리)', true, RT_POL['총동원령']], ['총동원령(비소속 뿌리)', true, Object.values(RT_POL).find(r => r !== RT_POL['총동원령'])]]) {
    newGame('조조'); const cn = capitalOf(S.player), c = C(cn); const g = gensIn(cn, S.player)[0];
    c.loy = 75; c.gold = 20000; c.food = 10; S._auto = cn; if (pol) S.fac[S.player].pol = ['총동원령']; if (root) S.fac[S.player].root = root;
    const g0 = c.gold, t0 = c.troops, l0 = c.loy; const r = cmdDraft(cn, g.n, 6000); S._auto = null;
    out.push([label, polW(S.player, '총동원령'), '금', c.gold - g0, '병력', c.troops - t0, '민충', l0 + '->' + c.loy, r && r.ok]);
  }
  return out;
})()
