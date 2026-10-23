// 탐침 F4(훈련 상한 TRAIN_MAX): 훈련도 90에서 cmdTrain 8번 — 기본 / 조련가 / 정예주의 / 철 / 덕화 징병 보정이 상한(100, 정예주의 120)을 넘는지
(() => {
  newGame('조조'); const pid = S.player, out = {}; const cap = capitalOf(pid); const c = C(cap);
  const gens = Object.values(S.gen).filter(g => g.st === '현역' && g.fac === pid && !isRuler(g));
  const run = (label, setup) => {
    c.train = 90; c.gold = 90000; c.food = 90000; c.troops = 30000; c.pop = 200000; c.loy = 90; const g = gens[0]; g.loc = cap; g.tr = (g.tr || []).filter(t => t !== '조련가'); setup && setup(g);
    const seq = []; for (let i = 0; i < 8; i++) { gens.forEach(x => x.acted = false); S.fac[pid].cmdCount = 0; const r = cmdTrain(cap, g.n); seq.push(r && r.ok ? c.train : 'X'); } out[label] = seq.join(',');
  };
  const polsave = S.fac[pid].pol; 
  run('기본'); run('조련가', g => { g.tr = (g.tr || []).concat('조련가'); });
  S.fac[pid].pol = (Array.isArray(polsave) ? polsave.slice() : []).concat('정예주의'); if (typeof memoBump === 'function') memoBump(); out.pol정예 = hasPol(pid, '정예주의');
  run('정예주의'); run('정예+조련가', g => { g.tr = (g.tr || []).concat('조련가'); });
  S.fac[pid].pol = polsave; if (typeof memoBump === 'function') memoBump(); out.pol해제 = !hasPol(pid, '정예주의');
  { c.train = 99; c.gold = 90000; c.troops = 30000; c.pop = 200000; c.loy = 90; const g = gens[0]; gens.forEach(x => x.acted = false); out.덕화징병 = (() => { const rs = rootOf; rootOf = f => f === pid ? '덕화' : rs(f); try { const t0 = c.troops; c.train = 99; draftExec(cap, g.n, 3000); } finally { rootOf = rs; } return c.train; })(); }
  return out;
})()
