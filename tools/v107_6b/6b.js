// ========== 6b: 거점·증폭 · 뿌리 게이트 · 세력 단위 한도 · 물가 · 명령 · AI 뿌리별 교역도 · 화면 (docs/v107_빌드명세.md 7-3) ==========
// 수치는 "가정"(시험기 통합_시뮬레이션.md §2 모델에서 옮김): hubGain 0.5(확정) · usaSum 150(확정) · tradeFrac 0.5(가정) · coastRisk 0.03(가정) · AI 친교 2/월·학습 확률 20%(가정)
const TR6B = { hubGain: 0.5, usaSum: 150, tradeFrac: 0.5, coastRisk: 0.03, banq: 200, study: { 개성: 300, 병종: 800 }, studyMo: { 개성: 2, 병종: 3 }, studyRel: { 개성: 20, 병종: 40 }, aiBanq: 2, aiStudyP: 20, aiFoodKeepMo: 24, aiFoodMax: 5000, gainPer: 300, gainMax: 6, gainBox: 10 };
const TR_LAND = ['대군', '안문', '서평', '무위', '장액', '월수', '운남', '영창']; // 육로 거점 8곳 (교역_성향_설계.md §3-1)
const TR_HUB = { kor: ['양평', '북평', '남피', '북해', '동래'], jpn: ['동래', '북해', '낭야', '동해', '광릉', '말릉', '오', '회계', '건안'], eeu: ['대군', '안문', '서평', '무위', '장액'], weu: ['월수', '운남', '영창', '남해', '합포', '교지'], usa: ['건안', '회계', '오', '말릉', '광릉', '동해', '남해', '합포', '교지'] }; // 방면↔거점 (통합_시뮬레이션.md §2, 가정)
const TR_ROOT_BR = { 경륜: ['인물', '개성'], 강병: ['병종', '물자'], 상략: ['차익', '용병'], 덕화: ['민생', '보급'] }; // 뿌리 → 열린 갈래 2개 (교역_성향_설계.md §4)
const TR_BR_N = { 인물: '인물(외국 인재 발견)', 개성: '개성(외국 개성 학습)', 병종: '병종(특수 병종 학습)', 물자: '물자(특산품 구매)', 차익: '차익(상거래)', 용병: '용병', 민생: '민생', 보급: '보급(군량 교환)' };
// 뿌리 상태는 항목 5(S5)가 만든다. 여기서는 rootOf(fid) 가 있으면 그것을, 없으면 S.fac[fid].root 를 보고, null 이면 모든 갈래 열림.
function trRoot(fid) { try { if (typeof rootOf === 'function') { const r = rootOf(fid); if (r) return r; } } catch (e) { } const F = S && S.fac && S.fac[fid]; return (F && F.root) || null; }
function trOpen(fid, kind) { const r = trRoot(fid); if (!r || !TR_ROOT_BR[r]) return true; return TR_ROOT_BR[r].includes(kind); } // 닫힌 갈래는 완전히 막는다
function trRootName(fid) { return trRoot(fid) || '뿌리 미정'; }
// ---------- 거점·증폭 ----------
function trIsHub(cn) { return TR_PORTS.includes(cn) || TR_LAND.includes(cn); }
function trHubs(fid, nat) { return (TR_HUB[nat] || []).filter(cn => C(cn) && C(cn).owner === fid); }
function trAmp(fid, nat) { return 1 + TR6B.hubGain * Math.max(trHubs(fid, nat).length, 1); } // 수도를 거점 1곳으로 인정(거점 0개도 ×1.5)
// ---------- 세력 단위 한도 · 물가 · 지불 ----------
function trPriceMul(fid) { let p = 1; try { p = priceIdx(); } catch (e) { } try { p *= facPriceMul(fid); } catch (e) { } return p > 0 ? p : 1; } // 물가(세력) = 전국 × 세력 (6a)
function trSurplusCity(c, fid) { return Math.max(0, (c.gold || 0) - 2 * reserveOf(c, fid) - Math.ceil((c.troops || 0) / ECO.troopGold)); } // 예비금×2 + 병력 금 유지비 초과분
function trSurplus(fid) { return citiesOf(fid).filter(c => kindOf(c.n) === '도시').reduce((s, c) => s + trSurplusCity(c, fid), 0); }
function trYm() { return S.y * 12 + (S.m || 1); }
function trBudget(fid) { const T = trT(); T.bud = T.bud || {}; const b = T.bud[fid]; const ym = trYm(); if (b && b.ym === ym) return b.v; const v = Math.round(trSurplus(fid) * TR6B.tradeFrac); T.bud[fid] = { ym, v, spent: 0, earned: 0 }; return v; } // 달 첫 계산 때의 잉여금 50% (그 달 고정)
function trStat(fid) { trBudget(fid); return trT().bud[fid]; }
function trLimit(fid, nat) { return Math.round(trBudget(fid) * (nat ? trAmp(fid, nat) : 1)); }
function trLeft(fid, nat) { return Math.max(0, trLimit(fid, nat) - trStat(fid).spent); }
function trAvail(fid, cn) { const c = C(cn); return (c ? c.gold : 0) + citiesOf(fid).filter(o => o.n !== cn && kindOf(o.n) === '도시').reduce((s, o) => s + trSurplusCity(o, fid), 0); } // 이 도시 금 + 다른 도시 잉여금
function trPay(fid, cn, amt, noLimit) { // 명령 도시 금을 먼저 쓰고 모자라면 잉여금 많은 도시에서 자동 인출. noLimit 이면 월 한도에 안 셈(수송비)
  amt = Math.round(amt); if (amt <= 0) return true; if (trAvail(fid, cn) < amt) return false; const c = C(cn); const t = Math.min(c.gold, amt); c.gold -= t; let need = amt - t;
  if (need > 0) citiesOf(fid).filter(o => o.n !== cn && kindOf(o.n) === '도시').sort((a, b) => trSurplusCity(b, fid) - trSurplusCity(a, fid)).forEach(o => { if (need <= 0) return; const x = Math.min(need, trSurplusCity(o, fid)); o.gold -= x; need -= x; });
  if (!noLimit) trStat(fid).spent += amt; return true;
}
function trEarn(fid, cn, amt) { C(cn).gold += amt; trStat(fid).earned += amt; }
// ---------- 명령: 상거래 ----------
function trDealGate(fid, kind) { if (kind === 'sellCN') return null; if (kind === 'food') return trOpen(fid, '보급') ? null : '보급'; if (kind === 'buyFor') return trOpen(fid, '차익') || trOpen(fid, '물자') ? null : '물자'; return trOpen(fid, '차익') ? null : '차익'; } // 닫힌 갈래 이름 또는 null
function trDeal(fid, nat, cn, kind, g, q, gainBox) {
  const c = C(cn); const cg = trCityCargo(cn); const free = trCityFree(cn); let gold = 0, val = 0, msg = ''; const m = trPriceMul(fid);
  const gate = trDealGate(fid, kind); if (gate) return { ok: false, msg: `${trRootName(fid)} 뿌리에는 ${TR_BR_N[gate]} 갈래가 닫혀 있습니다.` };
  if (nat && kind !== 'sellCN' && !trNatOpen(fid, nat)) return { ok: false, msg: trLockWhy(fid, nat) };
  if (kind === 'buyCN' || kind === 'buyFor') { // 매입: 물가 × 매입 포화(많이 사면 오름), 금은 세력 잉여금에서, 이번 달 한도 안에서
    const unit = kind === 'buyCN' ? trPBuyCN0(cn, g) : TR_NAT[nat].goods[g]; const k0 = kind === 'buyCN' ? trBsat(cn, g) : trMk(nat, g); const up = kind === 'buyCN' ? USE_PR.buyUpCN : USE_PR.buyUp;
    const lim = Math.min(trAvail(fid, cn), trLeft(fid, nat)); let qq = Math.max(0, Math.min(Math.floor(q), free)); let tot = 0, k = k0;
    while (qq > 0) { const r = trBuyTot(unit, k0, qq, up); tot = Math.round(r.tot * m); k = r.k; if (tot <= lim) break; qq = qq > 10 ? qq - 10 : qq - 1; }
    if (qq <= 0) return { ok: false, msg: free <= 0 ? `${cn} 창고가 가득 찼습니다 (${trCityN(cn)}/${trCityCap(cn)}).` : trAvail(fid, cn) < Math.round(unit * k0 * m) ? '금이 부족합니다.' : `이번 달 교역 한도(금 ${fmt(trLimit(fid, nat))}, 남은 ${fmt(trLeft(fid, nat))})를 넘습니다.` };
    trPay(fid, cn, tot); gold = -tot; q = qq; cg[g] = (cg[g] || 0) + q;
    if (kind === 'buyCN') { c.bsat = c.bsat || {}; c.bsat[g] = k; msg = `${g} ${q}개를 금 ${fmt(tot)}에 사들여 ${cn} 창고에 넣었다.`; }
    else { const T = trT(); T.mk[nat] = T.mk[nat] || {}; T.mk[nat][g] = k; val = tot; msg = `${TR_NAT[nat].n}의 ${g} ${q}개를 금 ${fmt(tot)}에 사들여 ${cn} 창고에 넣었다.`; }
    if (k > k0 + 0.01) msg += ` (매입 포화 ×${k.toFixed(2)})`;
  }
  else if (kind === 'sellTo') { q = Math.min(q, cg[g] || 0); if (q <= 0) return { ok: false, msg: `${cn} 창고에 ${g}이(가) 없습니다.` }; const p = trPSellTo(nat, g); if (!p) return { ok: false, msg: `${TR_NAT[nat].n}은(는) 자기 나라 ${g}을(를) 사지 않습니다.` }; gold = p * q; val = gold; cg[g] -= q; trSat(nat, g, -q * 0.004); trEarn(fid, cn, gold); msg = `${TR_NAT[nat].n} 상인이 ${g} ${q}개를 금 ${fmt(gold)}에 사 갔다.${!TR_CN[g] ? ' (중계무역)' : ''}`; }
  else if (kind === 'sellCN') { q = Math.min(q, cg[g] || 0); if (q <= 0) return { ok: false, msg: `${cn} 창고에 ${g}이(가) 없습니다.` }; gold = trSellCity(cn, g, q, true); cg[g] -= q; if (!TR_CN[g]) trSat('cn', g, -q * TR_PR.mkDrop); trEarn(fid, cn, gold); msg = `${cn} 저자에서 ${g} ${q}개를 금 ${fmt(gold)}에 팔았다.`; }
  else if (kind === 'food') { if (!TR_NAT[nat].food) return { ok: false, msg: '이 나라는 군량을 사지 않습니다.' }; q = Math.min(q, c.food - 1000); if (q < 100) return { ok: false, msg: '군량은 1,000을 남기고 100 이상 팔 수 있습니다.' }; q = Math.floor(q / 100) * 100; const p = trPFood(nat); gold = Math.round(p * q / 100); val = gold; c.food -= q; trSat(nat, '군량', -q / 100 * 0.004); trEarn(fid, cn, gold); msg = `군량 ${fmt(q)}을(를) ${TR_NAT[nat].n}에 금 ${fmt(gold)}에 넘겼다.`; }
  else return { ok: false, msg: '알 수 없는 거래입니다.' };
  if (cg[g] != null && cg[g] <= 0) delete cg[g];
  let gain = 0; if (val > 0 && nat) { gain = trClamp(Math.ceil(val / TR6B.gainPer), 1, TR6B.gainMax); if (gainBox) { gain = Math.min(gain, Math.max(0, TR6B.gainBox - gainBox.v)); gainBox.v += gain; } if (gain > 0) gain = trGain(fid, nat, gain, cn); }
  return { ok: true, msg: msg + (gain ? ` 교역도 +${gain}.` : ''), q, gold };
}
// ---------- 명령: 학습 (경륜=개성, 강병=병종) · 친교 (전부) ----------
function trStudy(gn, nat, kind) {
  const g = G(gn); const fid = g.fac; const N = TR_NAT[nat]; const rel = trRel(fid, nat); const cn = g.loc;
  if (g.acted || g.away) return { ok: false, msg: '이 장수는 이번 달 행동할 수 없습니다.' };
  if (!trNatOpen(fid, nat)) return { ok: false, msg: trLockWhy(fid, nat) };
  if (!trOpen(fid, kind)) return { ok: false, msg: `${trRootName(fid)} 뿌리에는 ${TR_BR_N[kind]} 갈래가 닫혀 있습니다.` };
  if (rel < TR6B.studyRel[kind]) return { ok: false, msg: `교역도 ${TR6B.studyRel[kind]} 이상이어야 합니다.` };
  if (kind === '개성' && hasTr(g, N.trait)) return { ok: false, msg: `${gn}은(는) 이미 ${N.trait}을(를) 익혔습니다.` };
  if (kind === '병종' && trUnits(fid).includes(N.unit.n)) return { ok: false, msg: `${N.unit.n}은(는) 이미 해금되었습니다.` };
  const mo = TR6B.studyMo[kind], cost = Math.round(TR6B.study[kind] * trPriceMul(fid));
  if (trLeft(fid, nat) < cost) return { ok: false, msg: `이번 달 교역 한도(남은 금 ${fmt(trLeft(fid, nat))})가 모자랍니다 (${fmt(cost)} 필요).` };
  if (!trPay(fid, cn, cost)) return { ok: false, msg: `금이 부족합니다 (${fmt(cost)} 필요).` };
  g.away = { type: '학습', left: mo, dest: N.n }; g.acted = true; trT().study.push({ g: gn, nat, kind, left: mo, cn, fid });
  const gn2 = trGain(fid, nat, 4, cn);
  return { ok: true, msg: `${gn}이(가) ${N.n}(으)로 ${mo}개월 학습을 떠났다 (${kind === '개성' ? N.trait : N.unit.n}, 금 ${fmt(cost)}). 교역도 +${gn2}.` };
}
function trBanq(gn, nat) {
  const g = G(gn); const fid = g.fac; const N = TR_NAT[nat]; const cn = g.loc;
  if (g.acted || g.away) return { ok: false, msg: '이 장수는 이번 달 행동할 수 없습니다.' };
  if (!trNatOpen(fid, nat)) return { ok: false, msg: trLockWhy(fid, nat) };
  const cost = Math.round(TR6B.banq * trPriceMul(fid));
  if (trLeft(fid, nat) < cost) return { ok: false, msg: `이번 달 교역 한도(남은 금 ${fmt(trLeft(fid, nat))})가 모자랍니다 (${fmt(cost)} 필요).` };
  if (!trPay(fid, cn, cost)) return { ok: false, msg: `금이 부족합니다 (${fmt(cost)} 필요).` };
  g.acted = true; addExp(g, 'c', 20); const v = trGain(fid, nat, 3 + Math.floor(stat(g, 'c') / 40), cn);
  return { ok: true, msg: `${gn}이(가) ${N.n} 사람들과 술자리를 열었다 (금 ${fmt(cost)}). ${pick(N.banq)} 교역도 +${v}.` };
}
// ---------- 갈래 효과 자리 (6c·6d 범위 밖: 이름만) ----------
function trBranchFx(fid, kind) { return trOpen(fid, kind) ? 1 : 0; } // 6c: 갈래별 효과 배율(차익 이익률·용병·민생·군량 군비화 등)을 여기서 돌려준다
function trMercHook() { return null; } // 6c 상략 '용병'
function trWelfareHook() { return null; } // 6c/6d 덕화 '민생'
// ---------- AI: 뿌리별 교역도 증가 (v106 일괄 +2/월 대체) ----------
function trAiCity(fid) { const hubs = citiesOf(fid).filter(c => kindOf(c.n) === '도시' && trIsHub(c.n)).sort((a, b) => (b.com || 0) - (a.com || 0)); if (hubs[0]) return hubs[0].n; const cap = capitalOf(fid); if (cap && kindOf(cap) === '도시') return cap; const cs = citiesOf(fid).filter(c => kindOf(c.n) === '도시'); return cs[0] ? cs[0].n : null; }
function trIncl(fid) { if (fid === S.player) return 1; const r = trRoot(fid); if (r === '상략') return 1; if (r === '강병') return 0.7; return citiesOf(fid).some(c => trIsHub(c.n)) ? 0.7 : 0.4; } // 상거래 성향: 상략 1 · 강병 0.7 · 거점 보유 0.7 · 그 외 0.4
function trAiMonthly(fid) {
  const cn = trAiCity(fid); if (!cn) return; const m = trPriceMul(fid); const box = { v: 0 };
  const nats = Object.keys(TR_NAT).filter(k => trNatOpen(fid, k)).sort((a, b) => trAmp(fid, b) - trAmp(fid, a));
  nats.forEach(nat => {
    const N = TR_NAT[nat]; const cost = Math.round(TR6B.banq * m);
    if (trLeft(fid, nat) >= cost && trPay(fid, cn, cost)) trGain(fid, nat, TR6B.aiBanq, cn); // 친교(전부): 금 200×물가 → +2×증폭
    const rel = trRel(fid, nat);
    if (trOpen(fid, '개성') && rel >= TR6B.studyRel.개성 && P(TR6B.aiStudyP)) { const g = gensOf(fid).find(x => x.st === '현역' && !x.away && !isRuler(x) && !hasTr(x, N.trait)); const c2 = Math.round(TR6B.study.개성 * m); if (g && trLeft(fid, nat) >= c2 && trPay(fid, cn, c2)) { g.tr = g.tr || []; g.tr.push(N.trait); trGain(fid, nat, 4, cn); } } // 경륜: 학습(개성)은 바로 익힘(단순화)
    if (trOpen(fid, '병종') && rel >= TR6B.studyRel.병종 && !trUnits(fid).includes(N.unit.n) && P(TR6B.aiStudyP)) { const c2 = Math.round(TR6B.study.병종 * m); if (trLeft(fid, nat) >= c2 && trPay(fid, cn, c2)) { trUnits(fid).push(N.unit.n); trGain(fid, nat, 4, cn); world(`${fname(fid)}이(가) ${N.n}에서 ${N.unit.n} 전술을 들여왔다.`, 2, [cn]); } } // 강병: 학습(병종)
    if (trOpen(fid, '보급') && N.food) { const fc = citiesOf(fid).filter(c => kindOf(c.n) === '도시').sort((a, b) => b.food - a.food)[0]; if (fc) { const need = Math.ceil(fc.troops / ECO.troopFood) * TR6B.aiFoodKeepMo; const q = Math.min(TR6B.aiFoodMax, fc.food - need); if (q >= 1000) trDeal(fid, nat, fc.n, 'food', '군량', Math.floor(q / 100) * 100, box); } } // 덕화: 군량 교환(24개월분 초과분)
  });
  try { trAiTrade(fid); } catch (e) { console.warn('trAi', e); } // 상략(차익)·강병(물자): 상거래
}
function trAiTradeAt(fid, nat, cn, box, st, k) { // 도시 cn 에서 nat 과 한 달 거래. k = 성향(수량 배율). 반환 = 세력 금 변화(이번 달 누적 기준)
  const c = C(cn); const N = TR_NAT[nat]; if (!trNatOpen(fid, nat)) return 0; const S0 = trStat(fid); const g0 = S0.earned - S0.spent;
  if (trOpen(fid, '차익')) { const q1 = Math.min(Math.round(40 * k), trCityFree(cn)); if (q1 > 0 && trDeal(fid, nat, cn, 'buyCN', N.want, q1, box).ok) trDeal(fid, nat, cn, 'sellTo', N.want, 1e9, box); }
  if (trOpen(fid, '물자') && k >= 0.7 && trCityFree(cn) >= 40) { const cg = trCityCargo(cn); ['명마', '은', '인삼', '철'].forEach(g => { if (!N.goods[g] || (cg[g] || 0) >= 5 || !P(40)) return; if (g === '인삼' && !gensOf(fid).some(useFrail)) return; trDeal(fid, nat, cn, 'buyFor', g, 5, box); }); } // 물자 비축(공방·포상·인삼용)
  if (!trOpen(fid, '차익') || st.sold >= 2 || !P(Math.round(k * 100))) return (S0.earned - S0.spent) - g0;
  const dsts = citiesOf(fid).filter(o => kindOf(o.n) === '도시' && o.n !== cn && hops(cn, o.n) >= 3 && trCityFree(o.n) >= 20).slice(0, 12); let best = null;
  Object.keys(N.goods).forEach(g => dsts.forEach(o => { const r = trRoute(fid, cn, o.n); if (!r.ok || r.risk > 0.3) return; const q = Math.min(Math.round(30 * k), trCityFree(cn), trCityFree(o.n)); const net = (trSellCity(o.n, g, q, false) - trBuyCost(nat, cn, g, q).tot * trPriceMul(fid) - r.feeU * q); if (q >= 10 && net > 600 && (!best || net > best.net)) best = { g, to: o.n, q, net }; }));
  if (best) { const r = trDeal(fid, nat, cn, 'buyFor', best.g, best.q, box); if (r.ok) { trShip(fid, cn, best.to, { [best.g]: r.q || best.q }); st.sold++; } }
  return (S0.earned - S0.spent) - g0;
}
function trAiTrade(fid) {
  const box = { v: 0 }, st = { sold: 0 }; const k = trIncl(fid); if (!(trOpen(fid, '차익') || trOpen(fid, '물자'))) return; if (!P(Math.round(Math.min(1, k + 0.3) * 100))) return;
  const cn = trAiCity(fid); if (!cn) return;
  Object.keys(TR_NAT).forEach(nat => trAiTradeAt(fid, nat, cn, box, st, k));
  citiesOf(fid).forEach(c => { if (!c.cargo || !P(25)) return; Object.keys(c.cargo).forEach(g => { if (!TR_CN[g] && !USE_INFO[g]) trDeal(fid, null, c.n, 'sellCN', g, 1e9); }); }); // 쓸 데 없는 특산품은 가끔 처분
  try { useAiGinseng(fid); } catch (e) { }
}
{ const f = corpsTurn; corpsTurn = function () { // 교역 군단: 군단 도시 중 거점·상업 높은 2곳에서 빈 장수 1명이 교역을 맡고(행동 소모) AI 교역 논리로 거래
  try { (S.corps || []).filter(k => k.policy === '교역' && typeof corpsValid === 'function' && corpsValid(k)).forEach(k => {
    const box = { v: 0 }, st = { sold: 0 }; const rep = [];
    k.cities.filter(cn => kindOf(cn) === '도시').sort((a, b) => ((trIsHub(b) ? 1 : 0) - (trIsHub(a) ? 1 : 0)) || ((C(b).com || 0) - (C(a).com || 0))).slice(0, 2).forEach(cn => {
      const g = freeGens(cn, S.player).filter(x => !isRuler(x)).sort((a, b) => stat(b, 'p') - stat(a, 'p'))[0]; if (!g) return;
      let d = 0; Object.keys(TR_NAT).forEach(nat => { d += trAiTradeAt(S.player, nat, cn, box, st, 1); });
      if (d !== 0) { g.acted = true; addExp(g, 'p', 8); rep.push(`${cn} ${g.n} 교역 금 ${d >= 0 ? '+' : ''}${fmt(d)}`); }
    });
    if (rep.length) news(`${k.name} 교역: ${rep.join(' · ')}`);
  }); } catch (e) { console.warn('corps trade', e); }
  return f.apply(this, arguments); }; }
// ---------- 매달 ----------
function trMonthly() {
  const T = trT();
  Object.keys(T.mk).forEach(k => Object.keys(T.mk[k]).forEach(g => { T.mk[k][g] = trClamp(T.mk[k][g] + (1 - T.mk[k][g]) * 0.15 + (Math.random() * 0.2 - 0.1), 0.4, 1.8); }));
  T.study = T.study.filter(s => {
    const g = G(s.g); if (!g || g.st !== '현역' || !g.away || g.away.type !== '학습') return false;
    s.left--; g.away.left = s.left; if (s.left > 0) return true;
    g.away = null; const N = TR_NAT[s.nat]; const fid = g.fac; let got = '';
    if (s.kind === '개성') { g.tr = g.tr || []; if (!g.tr.includes(N.trait)) g.tr.push(N.trait); got = `개성 ${N.trait}`; }
    else { if (!trUnits(fid).includes(N.unit.n)) trUnits(fid).push(N.unit.n); got = `특수 병종 ${N.unit.n}(${N.unit.f}) 해금`; }
    const cn = C(s.cn) && C(s.cn).owner === fid ? s.cn : (capitalOf(fid) || g.loc); g.loc = cn; const v = trGain(fid, s.nat, 8, cn);
    if (fid === S.player) news(`${g.n}이(가) ${N.n} 학습을 마치고 ${cn}으로 돌아왔다: ${got}. 교역도 +${v}.`);
    return false;
  });
  Object.values(S.city).forEach(c => { if (c.sat) Object.keys(c.sat).forEach(g => { c.sat[g] = trClamp(c.sat[g] + TR_PR.satRec, TR_PR.satMin, 1); if (c.sat[g] >= 1) delete c.sat[g]; }); }); // 도시 포화 회복
  trConvoyTick();
  Object.keys(S.fac).forEach(fid => { if (fid === S.player || !S.fac[fid].alive) return; try { trAiMonthly(fid); } catch (e) { console.warn('trAi', e); } });
}
// ---------- 화면 ----------
function openWorldTrade() {
  const fid = S.player; const nats = Object.keys(TR_NAT); UI.f = { nat: nats.find(k => trNatOpen(fid, k)) || nats[0] };
  openSheet(`${UI.city} · 교역`, () => {
    const tools = `<div class="grid3">${btn('상거래<small>사고 팔기</small>', 'trMode', '상거래')}${btn('시세표<small>도시별 판매가</small>', 'trMode', '시세표')}${btn('수송<small>육로·연안 항로</small>', 'trMode', '수송', { dis: !trCityN(UI.city) })}</div>`;
    const k = UI.f.nat, N = TR_NAT[k], rel = trRel(fid, k), why = trLockWhy(fid, k); const root = trRoot(fid); const hubs = trHubs(fid, k);
    const tabs = `<div class="grid${trClamp(nats.length, 2, 4)}">${nats.map(n => btn(`${TR_NAT[n].n}<small>${trNatOpen(fid, n) ? `교역도 ${trRel(fid, n)} · ×${trAmp(fid, n).toFixed(1)}` : '잠김'}</small>`, 'trNat', n, { p: n === k, s: 1 })).join('')}</div>`;
    const steps = [[TR6B.studyRel.개성, `학습: 개성 ${N.trait}`, '개성'], [TR6B.studyRel.병종, `학습: 특수 병종 ${N.unit.n}`, '병종'], [60, '1단계 인물 3명 발견', '인물'], [80, '2단계 인물 2명 발견', '인물'], [100, '전설 인물 발견', '인물']].map(([t, d, br]) => `<div class="${rel >= t && trOpen(fid, br) ? '' : 'dim'} sm">${rel >= t ? '✓' : '○'} ${t} · ${d}${trOpen(fid, br) ? '' : ' (뿌리로 닫힘)'}</div>`).join('');
    const found = Object.values(S.gen).filter(g => g.nat === k && g.st !== '미등장').map(g => `${g.n}(${g.st === '현역' ? fname(g.fac) : g.st})`).join(', ');
    const info = `<div class="dim sm">거점 ${hubs.length ? hubs.join('·') : '없음(수도를 1곳으로 침)'} → 증폭 ×${trAmp(fid, k).toFixed(1)} (이 방면 거점: ${TR_HUB[k].join('·')}) · 교역도 상승과 거래 한도에 곱해집니다.</div><div class="dim sm">${root ? `뿌리 ${root}: 열린 갈래 ${TR_ROOT_BR[root].join('·')}` : '뿌리 미정: 모든 갈래 열림'} · 이번 달 한도 금 ${fmt(trLimit(fid, k))} (쓴 금 ${fmt(trStat(fid).spent)}) · 물가 ×${trPriceMul(fid).toFixed(2)}</div>`;
    return `${tabs}<div class="pn"><b>${N.n}</b> · 교역도 ${rel}/100${trBar(rel)}<small>특산품 ${Object.keys(N.goods).join('·')} · 원하는 중국 상품 ${N.want}${N.food ? ' · 군량도 사 줌' : ''} · 특수 병종 ${N.unit.n}(${N.unit.f})${trUnits(fid).includes(N.unit.n) ? ' 해금' : ''}</small></div>${info}
    ${why ? `<div class="warn sm">${why}</div>` : ''}<div class="kv">단계</div>${steps}${found ? `<div class="dim sm">발견된 인물: ${found}</div>` : ''}
    ${trStoreHtml(UI.city)}${tools}
    <div class="grid2">${btn('학습<small>2~3개월 사절</small>', 'trMode', '학습', { dis: !!why || rel < TR6B.studyRel.개성 || !(trOpen(fid, '개성') || trOpen(fid, '병종')) })}${btn(`친교<small>금 ${fmt(Math.round(TR6B.banq * trPriceMul(fid)))} · 교역도↑</small>`, 'trMode', '친교', { dis: !!why })}</div>`;
  });
}
function openTrMarket() {
  const nat = UI.f.nat || null; UI.f = { nat, g: null, mode: '상거래', ses: false, gain: { v: 0 } }; const N = nat && TR_NAT[nat];
  openSheet(`${N ? N.n : UI.city} · 상거래`, () => {
    const fid = S.player, cn = UI.city, c = C(cn), cg = trCityCargo(cn); const m = trPriceMul(fid); const pm = v => Math.round(v * m);
    if (!UI.f.ses) return `<div class="kv">거래를 맡길 장수 (행동 1회 · 거래는 여러 번 가능)</div>${trGenList(UI.f.g)}`;
    const qb = (kind, g, qs) => qs.map(q => btn(q === 'all' ? '전부' : q, 'trDeal', `${kind}|${g}|${q}`, { s: 1 })).join('');
    const rows = []; const arb = trOpen(fid, '차익'), mat = trOpen(fid, '물자'), sup = trOpen(fid, '보급');
    const sellRows = () => { const have = Object.keys(cg).filter(g => !TR_CN[g] && cg[g] > 0); rows.push(`<div class="kv">창고의 특산품 · ${cn} 저자에 판다 (팔수록 포화로 값이 내려가고 매달 회복)</div>${have.length ? have.map(g => { const p = trPriceParts(cn, g); return `<div class="pn"><b>${g}</b> 창고 ${cg[g]} <small class="dim">${TR_CAT_N[TR_CAT[g]]}</small><small>저자 ${trPrice(cn, g)}금/개 · 거리 ×${p.dist.toFixed(2)}(${p.hops}칸) 수요 ×${p.demand.toFixed(2)} 포화 ×${p.sat.toFixed(2)}</small><div class="grid2">${qb('sellCN', g, [10, 'all'])}</div></div>`; }).join('') : '<div class="dim sm">특산품이 없습니다.</div>'}`); };
    const head = `<div class="kv">${UI.f.g} · 금 ${fmt(c.gold)} · 군량 ${fmt(c.food)} · 창고 ${trCityN(cn)}/${trCityCap(cn)}${N ? ` · 교역도 ${trRel(fid, nat)} (이번 거래 +${UI.f.gain.v}/${TR6B.gainBox})` : ''}</div><div class="pn sm">이번 달 교역 한도 금 <b>${fmt(trLimit(fid, nat))}</b> · 남은 금 ${fmt(trLeft(fid, nat))} · 쓸 수 있는 금 ${fmt(trAvail(fid, cn))} (이 도시 금 + 다른 도시 잉여금에서 자동 인출) · 물가 ×${m.toFixed(2)}</div>`;
    if (!N || !trNatOpen(fid, nat)) { if (arb) { rows.push(`<div class="kv">중국 상품 · ${cn}에서 산다</div>`); Object.keys(TR_CN).forEach(g => rows.push(`<div class="pn"><b>${g}</b> 창고 ${cg[g] || 0}<small>매입 ${pm(trPBuyCN(cn, g))}금/개 · 되팔기 ${trPrice(cn, g)}금/개</small><div class="grid4">${qb('buyCN', g, [10, 50])}${qb('sellCN', g, [10, 'all'])}</div></div>`)); } sellRows(); return head + rows.join(''); }
    if (!arb && !mat && !sup) rows.push(`<div class="warn sm">${trRootName(fid)} 뿌리에는 상거래(차익)·물자·보급 갈래가 모두 닫혀 있어 외국과 거래할 수 없습니다. 창고 물건을 저자에 팔 수만 있습니다.</div>`);
    if (arb) { rows.push(`<div class="kv">중국 상품 · ${cn}에서 사서 ${N.n}에 판다</div>`); Object.keys(TR_CN).forEach(g => rows.push(`<div class="pn"><b>${g}</b> 창고 ${cg[g] || 0}${N.want === g ? ' · <span class="fcs">원함</span>' : ''}<small>매입 ${pm(trPBuyCN(cn, g))}금/개 · ${N.n} 매도 ${trPSellTo(nat, g)}금/개</small><div class="grid4">${qb('buyCN', g, [10, 50])}${qb('sellTo', g, [10, 'all'])}</div></div>`)); }
    if (arb || mat) { rows.push(`<div class="kv">${N.n} 특산품 · ${N.n}에서 사서 ${arb ? '중국 도시 저자에 판다 (멀리 큰 도시로 옮기면 비싸다 — 시세표)' : '창고에 둔다 (강병 물자: 구매만)'}</div>`); Object.keys(N.goods).forEach(g => rows.push(`<div class="pn"><b>${g}</b> 창고 ${cg[g] || 0} <small class="dim">${TR_CAT_N[TR_CAT[g]]}</small><small>${N.n} 매입 ${pm(trPBuyFor(nat, g))}금/개 · ${cn} 저자 ${trPrice(cn, g)}금/개</small><div class="grid4">${qb('buyFor', g, [10, 50])}${qb('sellCN', g, [10, 'all'])}</div></div>`)); }
    if (arb) { const other = Object.keys(cg).filter(g => !TR_CN[g] && !N.goods[g] && cg[g] > 0); if (other.length) rows.push(`<div class="kv">다른 나라 특산품 · 중계무역: ${N.n} 상인이 비싸게 사 준다</div>${other.map(g => `<div class="pn"><b>${g}</b> 창고 ${cg[g]}<small>${N.n} 매도 ${trPSellTo(nat, g)}금/개 · ${cn} 저자 ${trPrice(cn, g)}금/개</small><div class="grid4">${qb('sellTo', g, [10, 'all'])}${qb('sellCN', g, [10, 'all'])}</div></div>`).join('')}`); }
    if (N.food && sup) rows.push(`<div class="kv">군량 · ${N.n}이(가) 사 간다 (100당 금 ${trPFood(nat)}, 1,000은 남김)</div><div class="grid3">${qb('food', '군량', [1000, 3000, 10000])}</div>`);
    if (!arb) sellRows();
    return `${head}<div class="dim sm">시세는 매달 ±10% 움직이고, 많이 팔면 값이 떨어지고 많이 사면 값이 오릅니다. 왼쪽 두 칸은 사기, 오른쪽 두 칸은 팔기.</div>${rows.join('')}`;
  }, () => UI.f.ses ? btn('거래 마침', 'trEnd', '', { p: 1 }) : btn(UI.f.g ? `${UI.f.g}에게 거래를 맡긴다` : '장수를 고르세요', 'trSes', '', { p: 1, dis: !UI.f.g }));
}
function openTrStudy() {
  const nat = UI.f.nat; const fid = S.player; const o1 = trOpen(fid, '개성'), o2 = trOpen(fid, '병종'); UI.f = { nat, g: null, mode: '학습', kind: o1 ? '개성' : '병종' };
  openSheet(`${TR_NAT[nat].n} · 학습`, () => {
    const N = TR_NAT[nat], rel = trRel(fid, nat), have = trUnits(fid).includes(N.unit.n); const m = trPriceMul(fid);
    const tabs = `<div class="grid2">${btn(`개성 ${N.trait}<small>교역도 ${TR6B.studyRel.개성} · 금 ${fmt(Math.round(TR6B.study.개성 * m))} · ${TR6B.studyMo.개성}개월${o1 ? '' : ' · 뿌리로 닫힘'}</small>`, 'trKind', '개성', { p: UI.f.kind === '개성', s: 1, dis: !o1 || rel < TR6B.studyRel.개성 })}${btn(`병종 ${N.unit.n}<small>교역도 ${TR6B.studyRel.병종} · 금 ${fmt(Math.round(TR6B.study.병종 * m))} · ${TR6B.studyMo.병종}개월${have ? ' · 해금됨' : ''}${o2 ? '' : ' · 뿌리로 닫힘'}</small>`, 'trKind', '병종', { p: UI.f.kind === '병종', s: 1, dis: !o2 || rel < TR6B.studyRel.병종 || have })}</div>`;
    const d = UI.f.kind === '개성' ? `${TRAITS[N.trait][1]} · 돌아온 장수가 익힙니다 (전투 반영은 6c).` : `${N.unit.n}(${N.unit.f}) · 세력 단위로 해금됩니다 (출진 정예 반영은 6c).`;
    return `${tabs}<div class="dim sm">${d} 떠날 때 교역도 +4×증폭, 돌아올 때 +8×증폭.</div><div class="kv">보낼 장수 (군주 제외)</div>${trGenList(UI.f.g)}`;
  }, () => btn(UI.f.g ? `${UI.f.g}을(를) 보낸다` : '장수를 고르세요', 'trStudyGo', '', { p: 1, dis: !UI.f.g }));
}
