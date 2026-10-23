// 탐침 F5(덕치 민충): 덕치 세력 도시 민충이 정수로 유지되는지, 12개월 평균 상승량이 +0.6/월 근처인지
(() => {
  newGame('조조'); const pid = S.player, out = {}; S.fac[pid].pol = ['덕치', '법치'].slice(0, 1); if (typeof memoBump === 'function') memoBump();
  const cs = citiesOf(pid); cs.forEach(c => { c.loy = 50; });
  const l0 = cs.reduce((s, c) => s + c.loy, 0); let frac = 0;
  for (let i = 0; i < 12; i++) { endMonth(); UI.queue = []; monthlyUpdate(); frac += citiesOf(pid).filter(c => !Number.isInteger(c.loy)).length; }
  const cs2 = citiesOf(pid); out.n = cs.length; out.fracCityMonths = frac; out.loyAvg = +(cs2.reduce((s, c) => s + c.loy, 0) / cs2.length).toFixed(2);
  return out;
})()
