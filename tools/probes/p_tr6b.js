// 탐침 F6b: 기사 질주·복병(숲)·방진·포격·암습 배치를 맞춰 실제 피해 확인
(() => {
  newGame('조조'); startBattle('조조', '초', '진류', autoUnits(gensIn('초', '조조'), 8000, 5), 4000, 'A', '야전'); const out = {};
  const us = B.units.filter(u => u.side === 'A' && u.troops > 0), es = B.units.filter(u => u.side === 'D' && u.troops > 0);
  for (let y = 0; y < BH; y++) for (let x = 0; x < BW; x++) B.map[y][x].t = 'P';
  const set = (n, tile) => { const u = us[0]; u.gen = n; u.acted = false; u.tg = 300; u.troops = u.max; u.x = 5; u.y = 8; u.gdT = 0; u._tacDay = false; B.map[8][5].t = tile || 'P'; es.forEach((o, i) => { o.troops = o.max; o.mor = 80; o.conf = false; o.x = 11 - i; o.y = 1; }); us.slice(1).forEach((o, i) => { o.x = 4; o.y = 8 + i; o.troops = o.max; o.gdT = 0; }); return u; };
  let u = set('제베'); es[0].x = 7; es[0].y = 9; out.gallopStart = [u.x, u.y]; out.gallop = tacUse(u, 2); out.gallopEnd = [u.x, u.y]; out.gallopDmg = es[0].troops < es[0].max;
  u = set('명림답부', 'F'); es[0].x = 6; es[0].y = 8; es[1].x = 5; es[1].y = 9; out.amb = tacUse(u, 3); out.ambDmg = [es[0], es[1]].map(o => o.max - o.troops > 0); out.ambConf = [es[0].conf, es[1].conf];
  u = set('명림답부', 'P'); es[0].x = 6; es[0].y = 8; out.ambNoForest = tacTarget(u, tacOf(u));
  u = set('모치즈키 치요메'); es[0].x = 8; es[0].y = 8; es[0].gen = '장료'; const mor0 = es[0].mor; out.raid = tacUse(u, 2); out.raidPos = [u.x, u.y]; out.raidMor = mor0 - es[0].mor; out.raidDmg = es[0].max - es[0].troops;
  u = set('가레스'); out.ph = tacUse(u, 2); out.phGd = [u.gdT, us[1].gdT, us[1].gdK];
  u = set('율리시스 그랜트'); es[0].x = 8; es[0].y = 8; es[1].x = 9; es[1].y = 8; out.bar = tacUse(u, 2); out.barDmg = [es[0], es[1]].map(o => o.max - o.troops); out.barRefund = u.tg;
  u = set('광개토대왕'); es[0].x = 7; es[0].y = 8; es[1].x = 8; es[1].y = 8; out.pierce = tacUse(u, 2); out.pierceDmg = [es[0], es[1]].map(o => o.max - o.troops); out.refund = u.tg;
  u = set('조지 패튼'); es[0].x = 6; es[0].y = 8; es[1].x = 7; es[1].y = 8; tacUse(u, 2); out.patton = [es[0], es[1]].map(o => o.max - o.troops);
  return out;
})()
