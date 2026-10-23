// 탐침 F4(이주민): 상한 증가·pop ≤ popMax·교역도 0 강제 시 이탈 개월 수·옛 세이브(imm 없음) 호환
(() => {
  newGame('조조'); const pid = S.player, T = trT(), out = {};
  const mine = () => citiesOf(pid).filter(c => kindOf(c.n) === '도시');
  out.cap = [[0, 0], [40, 0.02], [50, 0.03], [60, 0.04], [100, 0.1]].map(([r, e]) => +immCapOf(r).toFixed(4));
  T.rel[pid] = { kor: 100, jpn: 100 }; out.capBoth = immCap(pid);
  const st = () => immStat(pid); let over = 0, mx = 0;
  const step = () => { monthlyPop(); mine().forEach(c => { if (c.pop > popMax(c) + 1 && (c.imm || 0) > 0) over++; }); };
  const marks = {}; for (let m = 1; m <= 72; m++) { step(); if ([12, 36, 72].includes(m)) marks[m] = +(st().pct * 100).toFixed(2); }
  out.pct = marks; out.over = over; out.peak = st().imm; out.integer = mine().every(c => Number.isInteger(c.pop) && Number.isInteger(c.imm));
  T.rel[pid] = { kor: 0 }; let k = 0; const p0 = st().imm; while (st().imm > p0 * 0.1 && k < 80) { step(); k++; } out.monthsTo10pct = k;
  mine().forEach(c => { delete c.imm; }); out.oldOk = (() => { try { monthlyPop(); return mine().every(c => c.imm === 0 || Number.isInteger(c.imm)); } catch (e) { return e.message; } })();
  return out;
})()
