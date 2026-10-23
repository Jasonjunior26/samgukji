// 탐침 F6: 외국 인재 60명 · 전법 T2 행 일치 · 이름 고유 · 옛 전투(B)에서 60개 전법 시전(오류 0)
(() => {
  newGame('조조'); const out = {}; const fg = Object.values(S.gen).filter(g => g.nat);
  out.foreign = fg.length; out.unique = new Set(fg.map(g => g.n)).size === fg.length;
  out.tiers = ['kor', 'jpn', 'eeu', 'weu', 'usa'].map(n => [1, 2, 3].map(t => fg.filter(g => g.nat === n && g.trTier === t).length).join('/')).join(' ');
  out.tacMissing = fg.filter(g => !T2[g.n]).map(g => g.n); out.tacExtra = Object.keys(TR_TAC).filter(n => !S.gen[n] || !S.gen[n].nat);
  const names = Object.values(TR_TAC).map(r => r[0]); out.tacNameUnique = new Set(names).size === names.length;
  const others = new Set(Object.keys(T2).filter(k => !TR_TAC[k]).map(k => T2[k][0])); out.tacNameClash = names.filter(n => others.has(n));
  const sks = new Set(); Object.values(S.gen).filter(g => !g.nat).forEach(g => (g.sk || []).forEach(s => sks.add(s))); out.badSk = [...new Set(fg.flatMap(g => g.sk).filter(s => !sks.has(s)))];
  // 시전
  const errs = [], res = {}; const cities = Object.keys(S.city);
  startBattle('조조', '초', '진류', autoUnits(gensIn('초', '조조'), 8000, 5), 4000, 'A', '야전');
  const names2 = Object.keys(TR_TAC);
  names2.forEach(n => {
    try {
      const g = S.gen[n]; const us = B.units.filter(u => u.side === 'A' && u.troops > 0), es = B.units.filter(u => u.side === 'D' && u.troops > 0);
      const u = us[0]; u.gen = n; u.acted = false; u.moved = false; u.tg = 300; u.troops = u.max; u.x = 5; u.y = 8; u.gdT = 0; u._tacDay = false;
      const mk = (o, x, y) => { o.x = x; o.y = y; o.troops = o.max; o.mor = 80; o.conf = false; o.acted = false; };
      es.forEach((o, i) => mk(o, 5 + (i === 0 ? 1 : i), 7 - (i > 0 ? 1 : 0))); // 첫 적 (6,7)... 거리 2
      es[0].x = 6; es[0].y = 8; if (es[1]) { es[1].x = 7; es[1].y = 8; } us.slice(1).forEach((o, i) => { o.x = 4; o.y = 8 + i; o.troops = o.max; });
      B.map[8][5].t = 'F'; B.map[8][6].t = 'P'; B.map[8][7].t = 'P';
      const before = es.map(o => o.troops).concat(us.map(o => o.mor)).join(',');
      const t = tacOf(u); const tg = tacTarget(u, t); if (!tg) { res[n] = 'noTarget'; return; }
      const ok = tacUse(u, 2); const after = es.map(o => o.troops).concat(us.map(o => o.mor)).join(',');
      res[n] = ok ? (before !== after ? 'ok' : 'okSame') : 'false';
    } catch (e) { errs.push(n + ': ' + e.message); }
  });
  out.errs = errs.slice(0, 6); const cnt = {}; Object.values(res).forEach(v => cnt[v] = (cnt[v] || 0) + 1); out.res = cnt; out.noTarget = Object.keys(res).filter(k => res[k] === 'noTarget'); out.same = Object.keys(res).filter(k => res[k] === 'okSame'); out.fail = Object.keys(res).filter(k => res[k] === 'false');
  return out;
})()
