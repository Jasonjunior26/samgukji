// 탐침 F8: 옛 세이브(화물·호송·학습 있는 형식) 로드 -> trMigrateOld 환산, 이후 12개월 오류 없음
(() => {
  newGame('조조'); const out = {}; const pid = S.player; const cs = citiesOf(pid); out.ncity = cs.length; const c0 = cs[0], c1 = Object.values(S.city).find(c => c.n !== c0.n);
  const g0 = c0.gold, g1 = c1.gold; c0.cargo = { 비단: 10, 철: 5, 화약: 2, 없는물건: 9 }; c0.sat = { 비단: 3 }; c0.bsat = { 철: 1 };
  const T = S.trade; T.mk = { x: 1 }; T.unit = 3; T.study = {}; T.convoys = [{ from: c1.n, to: c0.n, cargo: { 인삼: 4 } }]; T.cargo = {}; T.cargo[pid] = { 은: 3 };
  const gen = Object.values(S.gen).find(g => g.loc === c0.n && g.st !== '미등장'); if (gen) gen.away = { type: '학습', left: 3 };
  const exp0 = 10 * 60 + 5 * 40 + 2 * 130, exp1 = 4 * 80 + 3 * 100;
  const sv = JSON.stringify(S); S = JSON.parse(sv); postLoad();
  const k0 = C(c0.n), k1 = C(c1.n); const capc = C(capitalOf(pid));
  out.gold0 = k0.gold - g0; out.gold1 = k1.gold - g1; out.exp = [exp0, exp1]; out.cargoGone = !k0.cargo && !k0.sat && !k0.bsat;
  out.cleaned = !S.trade.mk && !S.trade.convoys && !S.trade.cargo && !S.trade.unit && !S.trade.study; out.awayCleared = gen ? !(S.gen[gen.n].away && S.gen[gen.n].away.type === '학습') : null;
  out.hasNew = !!S.trade.rel && !!S.trade.fr && Object.values(S.city).every(c => c.imm != null) && !!S.gen['광개토대왕'] ;
  // 매우 옛 세이브: S.trade 자체 없음
  delete S.trade; S = JSON.parse(JSON.stringify(S)); postLoad(); out.noTrade = !!S.trade && !!S.trade.rel;
  let err = 0; for (let m = 0; m < 12; m++) { try { endMonth(); UI.queue = []; monthlyUpdate(); } catch (e) { err++; out.err = String(e.stack).slice(0, 200); } } out.err12 = err;
  return out;
})()
