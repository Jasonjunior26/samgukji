// 탐침 F10(물가 전가): 플레이어 세력 물가 지수를 강제로 2로 두고 한 달 — 전가 소득(pass)·유지비 추가분(extra)·부족(short)·금 합
(() => {
  newGame('조조'); const pid = S.player, out = {}; const F = S.fac[pid]; facPriceInit(pid); F.pf = 2; const nm = S.y * 12 + S.m + 1; F.pfM = nm; S.p2 = { pass: 0, extra: 0, short: 0 };
  Object.values(S.city).forEach(c => { if (c.owner === pid) c.troops = Math.max(c.troops, 6000); });
  const g0 = citiesOf(pid).reduce((s, c) => s + c.gold, 0); UI.queue = []; monthlyUpdate();
  out.p = +facPriceIdx(pid).toFixed(3); out.p2 = S.p2; out.dGold = citiesOf(pid).reduce((s, c) => s + c.gold, 0) - g0; out.n = citiesOf(pid).length;
  return out;
})()
