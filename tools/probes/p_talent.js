// 탐침 F5(인재 탐색): 이름 고유·발견 유일성·문턱·월 1번·S.gen 개수 불변·cmdSearch 제외·AI 탐색(120개월)
(() => {
  newGame('조조'); const pid = S.player, T = trT(), out = {};
  const fg = Object.values(S.gen).filter(g => g.nat); out.foreign = fg.length; out.uniqueNames = new Set(fg.map(g => g.n)).size === fg.length;
  out.byTier = [1, 2, 3].map(t => fg.filter(g => g.trTier === t).length);
  const n0 = Object.keys(S.gen).length; const cap = capitalOf(pid); C(cap).gold = 99999;
  T.rel[pid] = { kor: 59.4 }; out.tier59 = trOpenTier(trRel(pid, 'kor')); const r0 = trTalent(pid, 'kor', 'gold', cap); out.r0 = r0.ok;
  T.rel[pid].kor = 60; out.tier60 = trOpenTier(60);
  const r1 = trTalent(pid, 'kor', 'gold', cap); out.r1 = r1.ok; const gn = r1.g && r1.g.n; out.found = gn && [S.gen[gn].st, S.gen[gn].found, S.gen[gn].loc === cap, S.gen[gn].trTier];
  out.r2 = trTalent(pid, 'kor', 'gold', cap).ok; // 같은 달 두 번째 거부
  out.genCount = Object.keys(S.gen).length === n0; out.queue = (S.eventQueue || []).length > 0;
  // 60 에서 1등급 6명 모두 소진 -> 이후 '모두 나타났다'
  let cnt = 1; for (let i = 0; i < 10; i++) { S.m = (S.m % 12) + 1; if (S.m === 1) S.y++; const r = trTalent(pid, 'kor', 'gold', cap); if (r.ok) { cnt++; if (S.gen[r.g.n].trTier > 1) out.badTier = true; } else { out.endMsg = r.msg.slice(0, 14); break; } }
  out.tier1All = cnt; out.noDup = new Set(fg.filter(g => g.found).map(g => g.n)).size === fg.filter(g => g.found).length;
  // cmdSearch 가 교역 인재를 못 찾는다
  const h = Object.values(S.gen).filter(g => g.origin === '교역' && g.st === '재야'); h.forEach(g => { g.found = false; g.loc = cap; });
  const ge = gensIn(cap, pid).find(g => !g.acted); if (ge) { for (let i = 0; i < 20; i++) { ge.acted = false; cmdSearch(cap, ge.n); } } out.searchTook = h.filter(g => g.found).length;
  out.pay_food = (() => { C(cap).food = 500000; T.rel[pid].jpn = 60; S.m = (S.m % 12) + 1; const f0 = citiesOf(pid).reduce((a, c) => a + c.food, 0); const r = trTalent(pid, 'jpn', 'food', cap); return [r.ok, f0 - citiesOf(pid).reduce((a, c) => a + c.food, 0) > 0]; })();
  try { UI.city = cap; openWorldTrade(); const b = UI.sheets[UI.sheets.length - 1].body(); out.btn = b.includes('인재 탐색'); openTalent('kor'); out.sheet = UI.sheets[UI.sheets.length - 1].body().length > 80 && UI.sheets[UI.sheets.length - 1].foot().length > 5; } catch (e) { out.err = e.message; }
  return out;
})()
