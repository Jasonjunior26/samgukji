// 탐침 F2(친선): 월 1회·금/군량 지불·거리 배수·T.fr 세이브 유지·시트 렌더 (조조)
(() => {
  newGame('조조'); const pid = S.player, out = {}; const T = trT();
  const cs = citiesOf(pid).filter(c => kindOf(c.n) === '도시'); const cap = C(capitalOf(pid)) || cs[0];
  cs.forEach(c => { c.gold = 50000; c.food = 300000; });
  const gens = gensIn(cap.n, pid).filter(g => !g.acted && !g.away); out.nGen = gens.length;
  out.costs = {}; Object.keys(TR_NAT).forEach(n => { out.costs[n] = frCost(pid, n).gold; });
  const r1 = trFriend(pid, 'kor', gens[0].n, 'gold'); out.r1 = r1.ok;
  const r2 = trFriend(pid, 'kor', gens[1].n, 'gold'); out.r2 = r2.ok; out.r2msg = r2.msg.slice(0, 20);
  out.rel1 = +trRel(pid, 'kor').toFixed(2);
  // 군량 지불: 창고 감소량 = 환산식
  const f0 = cs.reduce((s, c) => s + c.food, 0), g0 = cs.reduce((s, c) => s + c.gold, 0);
  const cost = frCost(pid, 'weu').gold, pl = frFoodPlan(pid, cost);
  const r3 = trFriend(pid, 'weu', gens[2].n, 'food'); out.r3 = r3.ok;
  out.dFood = f0 - cs.reduce((s, c) => s + c.food, 0); out.planFood = pl.food; out.dGold = g0 - cs.reduce((s, c) => s + c.gold, 0); out.costGold = cost;
  // 군량 부족
  cs.forEach(c => { c.food = 0; });
  const r4 = trFriend(pid, 'usa', gens[3].n, 'food'); out.r4 = r4.ok; out.r4msg = r4.msg.slice(0, 14);
  // 세이브 직렬화 후 T.fr 유지
  const j = JSON.parse(JSON.stringify(S.trade)); out.frKept = j.fr[pid] && j.fr[pid].kor === trYm();
  // 다음 달 되면 다시 가능
  S.m = (S.m % 12) + 1; if (S.m === 1) S.y++; out.usedNext = frUsed(pid, 'kor');
  // 월 감쇠가 도는지(중복 trMonthly 수정 확인)
  const before = trRel(pid, 'kor'); trMonthly(); out.decayed = +(before - trRel(pid, 'kor')).toFixed(2);
  // 시트 렌더
  try { UI.city = cap.n; openWorldTrade(); out.sheet = typeof UI.sheets[UI.sheets.length - 1].body() === 'string'; openFriend('jpn'); out.sheet2 = UI.sheets[UI.sheets.length - 1].body().length > 100; out.foot = UI.sheets[UI.sheets.length - 1].foot().length > 10; } catch (e) { out.sheetErr = e.message; }
  return out;
})()
