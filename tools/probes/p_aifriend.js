// 탐침 F3(AI 친선): 190·200 시나리오 120개월 뒤 나라별 교역도 점유 분포. 마지막 식 값이 출력된다.
(() => {
  const out = {};
  for (const scen of ['190', '200']) {
    newGame(scen === '190' ? '조조' : '조조', { rand: true, custom: true, scen, diff: 1 }); const T = trT(); const r = { K: trK(), maxSum: 0, exc: 0 }; const snap = {};
    for (let i = 0; i < 120; i++) {
      try { endMonth(); UI.queue = []; monthlyUpdate(); } catch (e) { r.exc++; r.err = e.message.slice(0, 80); }
      Object.keys(TR_NAT).forEach(n => { r.maxSum = Math.max(r.maxSum, trPoolSum(n)); });
      if (S.over) break;
      if (i === 59 || i === 119) { const o = {}; Object.keys(TR_NAT).forEach(n => { const v = Object.keys(T.rel).map(f => T.rel[f][n] || 0).filter(x => x > 0).sort((a, b) => b - a); o[n] = [v.length, v.filter(x => x >= 40).length, v.filter(x => x >= 80).length, v.filter(x => x >= 99.9).length, Math.round(v[0] || 0), Math.round(v.reduce((a, b) => a + b, 0))]; }); snap[i + 1] = o; }
    }
    r.talent = Object.values(S.gen).filter(g => g.origin === '교역' && g.found).length; r.maxSum = Math.round(r.maxSum); r.snap = snap; r.alive = Object.values(S.fac).filter(f => f.alive).length; out[scen] = r;
  }
  return out;
})()
