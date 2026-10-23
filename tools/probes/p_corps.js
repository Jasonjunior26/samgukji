// 탐침 P1·P4(군단): 군단 도시 맡기기 요약(S.autoSum)이 일반 도시 맡기기 요약에 지워지는지, 군단 도시 자동 훈련에 군단장 보너스가 들어가는지
(() => {
  newGame('조조'); const pid = S.player, out = {};
  { // 도시 2개로 만든다: 수도에서 가장 가까운 다른 도시를 플레이어 소유로(탐침용 조작)
    const cap = capitalOf(pid); const near = Object.values(S.city).filter(c => kindOf(c.n) === '도시' && c.owner !== pid).sort((x, y) => hops(cap, x.n) - hops(cap, y.n))[0];
    near.owner = pid; if (typeof memoBump === 'function') memoBump();
  }
  const mine = citiesOf(pid).filter(c => kindOf(c.n) === '도시'); out.cities = mine.length;
  if (mine.length < 2) return out;
  const ck = mine[0], cn = mine[1]; // ck: 군단 도시, cn: 일반 맡기기 도시
  const leader = Object.values(S.gen).filter(g => g.st === '현역' && g.fac === pid && !isRuler(g))[0]; if (leader) leader.rank = 2; // 군단장은 3품 이내여야 한다
  out.leader = leader && leader.n; if (!leader) return out;
  leader.loc = ck.n;
  S.corps = [{ name: '시험군', leader: leader.n, cities: [ck.n], policy: '내정', target: null, targetFac: null }];
  mine.forEach(c => { c.autoKeep = c.n === cn.n; c.autoMil = c.n === cn.n; });
  ck.gold = 30000; ck.food = 90000; cn.gold = 30000; cn.food = 90000; ck.train = 40; cn.train = 40;
  endMonth();
  out.autoSum = S.autoSum; out.ckTrain = ck.train; out.cnTrain = cn.train; out.corpsOfAfter = !!corpsOf(ck.n);
  return out;
})()
