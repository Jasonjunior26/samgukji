// 탐침 F6(둔전제 원거리 할증): 모든 도시를 플레이어 소유·둔전제로 두고 군량을 civFood 바로 위로 맞춘 뒤 한 달 — 원거리(수도에서 5칸 초과) 도시의 기근 횟수·군량 합
(() => {
  newGame('조조'); const pid = S.player, out = {}; S.fac[pid].pol = ['둔전제']; Object.values(S.city).forEach(c => { c.owner = pid; }); if (typeof memoBump === 'function') memoBump();
  const cs = citiesOf(pid).filter(c => kindOf(c.n) === '도시'); const far = cs.filter(c => capDist(c) > 4);
  cs.forEach(c => { c.troops = 30000; c.famine = 0; c.food = civFood(c) + 5; });
  UI.queue = []; monthlyUpdate();
  out.n = cs.length; out.far = far.length; out.famineFar = far.reduce((s, c) => s + (c.famine || 0), 0); out.famineNear = cs.filter(c => capDist(c) <= 4).reduce((s, c) => s + (c.famine || 0), 0); out.foodFar = far.reduce((s, c) => s + c.food, 0);
  return out;
})()
