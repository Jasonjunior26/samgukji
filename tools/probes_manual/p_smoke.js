// 탐침 F8: 190·200 시나리오 120개월 스모크 (예외·NaN·교역 지표)
(() => {
  const out = {};
  for (const sc of ['190', '200']) {
    newGame('조조', { rand: true, custom: true, scen: sc, diff: 1 }); citiesOf(S.player).forEach(c => { c.autoKeep = true; c.autoMil = true; });
    let ex = [], nan = 0; const T0 = Date.now();
    for (let i = 0; i < 120; i++) {
      try { endMonth(); } catch (e) { ex.push('E ' + S.y + '-' + S.m + ' ' + String(e.message).slice(0, 80)); }
      try { UI.queue = []; monthlyUpdate(); } catch (e) { ex.push('M ' + S.y + '-' + S.m + ' ' + String(e.message).slice(0, 80)); }
      if (i % 12 === 11) { Object.values(S.city).forEach(c => ['gold', 'food', 'troops', 'pop', 'imm'].forEach(k => { if (c[k] != null && !Number.isFinite(c[k])) nan++; })); }
      if (S.over) break;
    }
    const tr = S.trade; out[sc] = { ym: S.y + '-' + S.m, ex: ex.length, exs: ex.slice(0, 3), nan, rel: tr.rel[S.player], found: Object.values(S.gen).filter(g => g.origin === '교역' && g.found !== false && g.st !== '미등장').length, imm: Object.values(S.city).reduce((a, c) => a + (c.imm || 0), 0), warnCons: 0 };
  }
  return out;
})()
