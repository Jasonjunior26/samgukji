// 탐침 S3-g: 징병 창 미리보기(s112DraftSim) ↔ 실제 cmdDraft 일치 (모병가 유무·금 부족·민충 낮음 격자)
(() => {
  const out = [];
  for (const [loy, gold, want] of [[75, 20000, 1500], [75, 20000, 99999], [30, 20000, 3000], [19, 20000, 1000], [75, 300, 3000], [60, 5000, 2200]]) {
    for (const mb of [false, true]) {
      newGame('조조'); const cn = capitalOf(S.player), c = C(cn); UI.city = cn; UI.f = { keep: true, iron: false }; c.loy = loy; c.gold = gold; c.food = 99999;
      const gs = gensIn(cn, S.player); gs.forEach((g, i) => { g.acted = false; g.tr = (g.tr || []).filter(t => t !== '모병가'); if (mb && i === 0) g.tr.push('모병가'); });
      if (mb) { try { gs[0].traits = (gs[0].traits || []).concat(['모병가']); } catch (e) { } }
      const sim = s112DraftSim(want); const p0 = c.pop, t0 = c.troops, g0 = c.gold, l0 = c.loy;
      sim.plan.forEach(p => { cmdDraft(cn, p.g.n, p.amt); });
      out.push([loy, gold, want, mb, 'sim', sim.total, sim.gold, sim.pop, sim.loy, sim.why, 'act', c.troops - t0, g0 - c.gold, c.pop, c.loy, p0, l0, hasTr(gs[0], '모병가')]);
    }
  }
  return out;
})()
