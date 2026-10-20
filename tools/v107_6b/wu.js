<script id="world-use">
// ===== 세계 교역 5a: 교역품 사용(재료 투입) · 인삼 불로장생 · 매입 포화 · 교역 군단 · AI 교역 성향 =====
// 설계: docs/상거래_2단계_설계.md 4·4-1. 모든 사용은 "그 도시 창고"(trCityCargo)에서 꺼낸다. 총사/후사르/원탁기사 소모는 8단계, 전투 도구(화약통·포도주)는 5b.
const USE_PR = { craftMat: 3, craftCost: 0.7, horsePer: 1000, horseMv: 1, horseMor: 5, ironPer: 1000, ironCost: 0.9, ironTrain: 20, powder: [2, 5], powderGate: 1.5, powderDef: 0.5, silverGold: 300, silverEff: 1.2, spiceRec: 10, glassRel: 1.5, ginseng: 5, ginsengMax: 2, ginsengHint: 3, buyUp: 0.003, buyUpCN: 0.0015, buyMax: 1.8, buyRec: 0.12, aiHorse: 0.06, aiPowder: 0.06 };
const USE_INFO = { 명마: '공방 명마 제작(3개: 등급 +1, 비용 −30%) · 출진 기병 부대(1천 명당 1: 이동 +1, 사기 +5)', 철: '공방 무기 제작(3개: 등급 +1, 비용 −30%) · 징병(1천 명당 1: 비용 −10%, 훈련↑)', 일본도: '장수에게 지급(무력 +2 · 예리: 일기토 유리)', 화약: '공성 출진(2~5개: 성문·성벽 피해 ×1.5) · 수성 때 자동(공성 병기 피해 반감)', 은: '포상(1개 = 금 300 상당, 충성 효율 ×1.2)', 향료: '등용 예물(1개: 성공률 +10)', 유리: '외교 선물(1개: 관계 상승 ×1.5)', 인삼: '장수 복용(5개: 수명 +1년, 장수당 2회)' };
function useHas(cn, g, n) { const c = C(cn); return !!c && ((c.cargo && c.cargo[g]) || 0) >= (n || 1); }
function useTake(cn, g, n) { const cg = trCityCargo(cn); if ((cg[g] || 0) < n) return false; cg[g] -= n; if (cg[g] <= 0) delete cg[g]; return true; }
// ---------- 공방: 명마(명마 제작)·철(무기 제작) 3개 → 등급 판정 +1단계, 비용 −30% ----------
let CR_MAT = null;
function craftMatOf(kind) { return kind === '명마' ? '명마' : kind === '무기' ? '철' : null; }
{ const f = craftCost; craftCost = function (c, kind) { const v = f.apply(this, arguments); return CR_MAT === kind ? Math.round(v * USE_PR.craftCost / 100) * 100 : v; }; }
{ const f = cmdCraft; cmdCraft = function (cn, gn, kind, extra, mat) {
  const m = craftMatOf(kind); const use = !!mat && !!m && useHas(cn, m, USE_PR.craftMat);
  if (mat && m && !use) return { ok: false, msg: `${cn} 창고에 ${m} ${USE_PR.craftMat}개가 필요합니다.` };
  CR_MAT = use ? kind : null; let r; try { r = f.call(this, cn, gn, kind, extra); } finally { CR_MAT = null; }
  if (r && r.ok && use) { useTake(cn, m, USE_PR.craftMat); const x = (S.crafts || []).filter(o => o.city === cn).pop(); if (x) x.mat = m; r.msg += ` 창고 ${m} ${USE_PR.craftMat}개 투입(등급 +1단계, 비용 −30%).`; }
  return r; }; }
{ const f = craftRoll; craftRoll = function (g, c, kind) { const gr = f.apply(this, arguments); const x = S._crafting; return x && x.mat ? Math.min(4, gr + 1) : gr; }; }
{ const f = openCraft; openCraft = function () { f.apply(this, arguments); try { const top = UI.sheets[UI.sheets.length - 1]; const b = top.body; top.body = () => { let h = b(); const m = craftMatOf(UI.f.kind); if (!m || (S.crafts || []).some(x => x.city === UI.city)) return h; const have = (trCityCargo(UI.city)[m] || 0); if (!have) return h; return h + `<div class="kv">재료 투입 (창고 ${m} ${have}개)</div>${btn(`${m} ${USE_PR.craftMat}개 투입<small>등급 판정 +1단계 · 비용 −30%</small>`, 'crMat', '', { p: !!UI.f.mat, s: 1, dis: have < USE_PR.craftMat })}`; }; renderSheet(); } catch (e) { } }; }
ACT.crMat = () => { UI.f.mat = !UI.f.mat; renderSheet(); };
ACT.crGo = () => done(cmdCraft(UI.city, UI.f.g, UI.f.kind, UI.f.extra || 0, !!UI.f.mat));
// ---------- 징병: 철 1천 명당 1개 → 비용 −10%, 신병 훈련 보너스(+20 상당) ----------
let DR_IRON = false;
{ const f = draftCost; draftCost = function (c, amt) { const v = f.apply(this, arguments); return DR_IRON ? Math.round(v * USE_PR.ironCost / 10) * 10 : v; }; }
{ const f = cmdDraft; cmdDraft = function (cn, gn, amt) {
  const c = C(cn); const want = c && (c.owner === S.player ? !!(typeof UI !== 'undefined' && UI.f && UI.f.iron) : true); const use = !!want && useHas(cn, '철', 1);
  DR_IRON = use; const t0 = c ? c.troops : 0; let r; try { r = f.apply(this, arguments); } finally { DR_IRON = false; }
  if (r && r.ok && use) { const got = Math.max(0, c.troops - t0); const n = Math.min(trCityCargo(cn).철 || 0, Math.max(1, Math.ceil(got / USE_PR.ironPer))); useTake(cn, '철', n); const cov = Math.min(got, n * USE_PR.ironPer); const bonus = Math.round(USE_PR.ironTrain * cov / Math.max(1, c.troops)); c.train = clamp(c.train + bonus, 0, 100); r.msg += ` 철 ${n}개 투입(비용 −10%, 훈련 +${bonus}).`; }
  return r; }; }
{ const f = openDraft; openDraft = function () { f.apply(this, arguments); try { if (!UI.f || !UI.f.cfg) return; const have = trCityCargo(UI.city).철 || 0; if (!have) return; const h = UI.f.cfg.head; UI.f.cfg.head = () => `<div class="kv">재료 투입 (창고 철 ${have}개 · 1천 명당 1개)</div>${btn('철 투입<small>징병 비용 −10% · 훈련↑</small>', 'drIron', '', { p: !!UI.f.iron, s: 1 })}` + h(); renderSheet(); } catch (e) { } }; }
ACT.drIron = () => { UI.f.iron = !UI.f.iron; renderSheet(); };
// ---------- 일본도: 창고 → 장수 장비(무기 아이템, 무력 +2, 특성 '예리') ----------
ITRAIT.무기.예리 = '일기토 승률이 오름 (일본도)';
function useSword(cn, gn) {
  const g = G(gn); if (!g || g.st !== '현역' || g.loc !== cn) return { ok: false, msg: '이 도시에 있는 현역 장수에게만 줄 수 있습니다.' };
  if (!useHas(cn, '일본도', 1)) return { ok: false, msg: `${cn} 창고에 일본도가 없습니다.` };
  if (Object.values(S.items).some(it => it.owner === gn && it.tr && it.tr.includes('예리'))) return { ok: false, msg: `${gn}은(는) 이미 일본도를 가지고 있습니다.` };
  useTake(cn, '일본도', 1); let n = '일본도', k = 2; while (S.items[n]) n = `일본도 ${k++}`;
  S.items[n] = { n, kind: '무기', eff: { 무력: 2 }, owner: gn, loc: null, grade: 2, crafted: true, tr: ['예리'], by: '왜' };
  return { ok: true, msg: `${gn}에게 '${n}'을(를) 주었다. 무력 +2 · 예리(일기토 유리).` };
}
function TR_DUEL_FX(u) { try { const g = duelGen(u); return g && Object.values(S.items).some(it => it.owner === g.n && it.tr && it.tr.includes('예리')) ? 8 : 0; } catch (e) { return 0; } }
// ---------- 출진: 명마(기병 부대 1천 명당 1 → 이동 +1·사기 +5) · 화약(공성 2~5개 → 성문·성벽 피해 ×1.5 / 수성이면 공성 병기 피해 반감) ----------
let TR_BFX = null;
function useCavUnits(units) { return (units || []).filter(u => u.gen && (u.form === '봉시' || u.form === '추행')); }
function useHorseNeed(units) { return useCavUnits(units).reduce((s, u) => s + Math.ceil((u.troops || 0) / USE_PR.horsePer), 0); }
function useHorses(cn, units) { let used = 0; useCavUnits(units).sort((a, b) => b.troops - a.troops).forEach(u => { const n = Math.ceil((u.troops || 0) / USE_PR.horsePer); if (n > 0 && useHas(cn, '명마', n)) { useTake(cn, '명마', n); u.horse = true; used += n; } }); return used; }
function TR_UNIT_INIT(u, spec) { if (spec && spec.horse) { u.horse = true; u.mvX = (u.mvX || 0) + USE_PR.horseMv; u.mor = clamp(u.mor + USE_PR.horseMor, 10, 100); } }
function usePowder(cn) { const have = trCityCargo(cn).화약 || 0; if (have < USE_PR.powder[0]) return 0; const n = Math.min(have, R(USE_PR.powder[0], USE_PR.powder[1])); useTake(cn, '화약', n); return n; }
function useBattlePrep(att, fromCn, toCn, units, defMode, wantH, wantP) { // 출진 재료 투입. 반환 { fx, notes, n }
  const fx = {}, notes = []; const tc = C(toCn); const def = tc && tc.owner; const siege = !!def && def !== att && kindOf(toCn) === '도시' && defMode !== '야전';
  if (wantH && units) { const n = useHorses(fromCn, units); if (n) notes.push(`명마 ${n}개 투입(기병 이동 +1·사기 +5)`); }
  if (siege && wantP) { const n = usePowder(fromCn); if (n) { fx.gate = USE_PR.powderGate; fx.gateN = n; notes.push(`화약 ${n}개 투입(성문·성벽 피해 ×1.5)`); } }
  if (siege) { const n = usePowder(toCn); if (n) { fx.sdef = USE_PR.powderDef; fx.sdefN = n; if (def === S.player) news(`${toCn} 수성: 창고 화약 ${n}개로 공성 병기 피해를 반감했다.`); } }
  return { fx, notes };
}
{ const f = startBattle; startBattle = function (att, fromCn, toCn, units, food, playerSide, defMode) {
  let prep = { fx: {}, notes: [] }; try { const me = att === S.player; prep = useBattlePrep(att, fromCn, toCn, units, defMode, me ? !!(UI && UI.f && UI.f.horse) : true, me ? !!(UI && UI.f && UI.f.powder) : true); } catch (e) { }
  TR_BFX = prep.fx; let r; try { r = f.apply(this, arguments); } finally { TR_BFX = null; }
  try { if (B && playerSide) B.v4fx = prep.fx; if (prep.notes.length && att === S.player) news(`${fromCn} 출진: ${prep.notes.join(' · ')}.`); } catch (e) { }
  return r; }; }
{ const f = v4EnterReal; v4EnterReal = function () { TR_BFX = (B && B.v4fx) || null; try { return f.apply(this, arguments); } finally { TR_BFX = null; } }; }
// AI 끼리의 자동 전투: V4 면 같은 훅으로, 옛 공식이면 병력 배율(명마 비율 × 6% · 화약 6%)로 반영
{ const f = autoBattle; autoBattle = function (att, fromCn, toCn, units) {
  let mul = 1, fx = {}; try { if (att !== S.player && units && units.length) { const prep = useBattlePrep(att, fromCn, toCn, units, undefined, true, true); fx = prep.fx; if (!(typeof v4On === 'function' && v4On())) { const tot = units.reduce((s, u) => s + (u.troops || 0), 0) || 1; mul *= 1 + USE_PR.aiHorse * units.filter(u => u.horse).reduce((s, u) => s + (u.troops || 0), 0) / tot; if (fx.gate) mul *= 1 + USE_PR.aiPowder; } } } catch (e) { }
  TR_BFX = fx; try { if (mul === 1) return f.apply(this, arguments); units.forEach(u => { u.troops = Math.round(u.troops * mul); }); try { return f.apply(this, arguments); } finally { units.forEach(u => { u.troops = Math.round(u.troops / mul); }); } } finally { TR_BFX = null; } }; }
function useSortieHtml() { // 출진 화면: 명마·화약 투입 버튼
  const cn = UI.city, us = ((UI.f && UI.f.units) || []).filter(u => u.gen); const cg = trCityCargo(cn); let h = '';
  const need = useHorseNeed(us); if ((cg.명마 || 0) > 0) h += btn(`명마 투입<small>기병 ${need}개 필요 · 창고 ${cg.명마}개 · 이동 +1·사기 +5</small>`, 'trHorse', '', { p: !!UI.f.horse, s: 1, dis: !need });
  const to = UI.f && UI.f.to; const tc = to && C(to); const siege = tc && tc.owner && tc.owner !== S.player && kindOf(to) === '도시';
  if ((cg.화약 || 0) >= USE_PR.powder[0]) h += btn(`화약 투입<small>2~5개 · 성문·성벽 피해 ×1.5 · 창고 ${cg.화약}개</small>`, 'trPowder', '', { p: !!UI.f.powder, s: 1, dis: !siege });
  return h ? `<div class="kv">재료 투입 (${cn} 창고)</div><div class="grid2">${h}</div>` : '';
}
ACT.trHorse = () => { UI.f.horse = !UI.f.horse; renderSheet(); };
ACT.trPowder = () => { UI.f.powder = !UI.f.powder; renderSheet(); };
{ const f = renderSheet; renderSheet = function () { const r = f.apply(this, arguments); try { const sh = document.querySelector('#sheet'); if (sh && UI.f && UI.f.units && /출정비\(군비 장비\)|출진 \d/.test(sh.textContent) && !sh.querySelector('.matbox')) { const h = useSortieHtml(); if (h) { const anchor = sh.querySelector('.elitebox') || [...sh.querySelectorAll('.sm.dim, .kv')].find(e => /출정비\(군비 장비\)/.test(e.textContent)) || [...sh.querySelectorAll('.kv')].find(e => /출진 /.test(e.textContent)); if (anchor) { const box = document.createElement('div'); box.className = 'matbox'; box.innerHTML = h; anchor.after(box); } } } } catch (e) { } return r; }; }
// ---------- 포상: 은 1개 = 금 300 상당, 충성 효율 ×1.2 (AI 는 창고에 은이 있으면 금 대신 씀) ----------
{ const f = cmdReward; cmdReward = function (cn, tn, what) {
  const c = C(cn), t = G(tn); if (c && c.owner !== S.player && /^gold:/.test(String(what)) && useHas(cn, '은', 1)) what = 'silver:1';
  const m = /^silver:(\d+)$/.exec(String(what)); if (!m || !c || !t) return f.call(this, cn, tn, what);
  const n = +m[1]; if (!useHas(cn, '은', n)) return { ok: false, msg: `${cn} 창고에 은 ${n}개가 필요합니다.` };
  const amt = n * USE_PR.silverGold; c.gold += amt; const before = t.loy; const r = f.call(this, cn, tn, 'gold:' + amt); if (!r || !r.ok) { c.gold -= amt; return r; }
  useTake(cn, '은', n); const extra = Math.round((t.loy - before) * (USE_PR.silverEff - 1)); t.loy = clamp(t.loy + extra, 0, loyCap(t));
  r.msg = r.msg.replace('포상을 받고', `은 ${n}개를 받고`) + ` 은 포상(충성 효율 ×1.2) → ${t.loy}.`; return r; }; }
{ const f = openReward; openReward = function () { f.apply(this, arguments); try { if (!UI.f || !UI.f.cfg) return; if (!citiesOf(S.player).some(c => (c.cargo && c.cargo.은) || 0)) return; const h = UI.f.cfg.head; UI.f.cfg.head = () => h() + `<div class="kv">또는 창고의 은 (받는 장수가 있는 도시 창고에서 · 1개 = 금 300 상당 · 충성 효율 ×1.2)</div><div class="grid2">${[1, 2].map(n => btn(`은 ${n}개`, 'rwW2', 'silver:' + n, { p: UI.f.what === 'silver:' + n, s: 1 })).join('')}</div>`; renderSheet(); } catch (e) { } }; }
// ---------- 등용 예물 향료(+10) · 외교 선물 유리(관계 상승 ×1.5): 사신이 떠나는 도시 창고에서 1개 ----------
let RC_SPICE = false;
{ const f = recruitChance; recruitChance = function () { const p = f.apply(this, arguments); return RC_SPICE && p > 0 ? clamp(p + USE_PR.spiceRec, 0, 95) : p; }; }
{ const f = dispatch; dispatch = function (kind, gn, arg) {
  const g = G(gn); const cn = g && g.loc; const good = arg && arg.spice ? '향료' : arg && arg.glass ? '유리' : null;
  if (good && !(cn && useHas(cn, good, 1))) { arg.spice = arg.glass = false; return f.apply(this, arguments); }
  if (!good) return f.apply(this, arguments);
  const acted0 = g.acted; useTake(cn, good, 1); const r = f.apply(this, arguments);
  if (r && !r.ok && g.acted === acted0) { const cg = trCityCargo(cn); cg[good] = (cg[good] || 0) + 1; } else if (r) r.msg += ` 창고 ${good} 1개 사용.`;
  return r; }; }
{ const f = runEnvoy; runEnvoy = function (kind, g, a) {
  if (kind === 'rec' && a && a.spice) { RC_SPICE = true; let r; try { r = f.apply(this, arguments); } finally { RC_SPICE = false; } if (r) r.msg += ' (향료 예물: 성공률 +10)'; return r; }
  if (kind === 'dip' && a && a.type === '선물' && a.glass) { const tf = a.tf; const h0 = hos(g.fac, tf); const r = f.apply(this, arguments); if (r && r.ok) { const d = h0 - hos(g.fac, tf); if (d > 0) { const x = Math.round(d * (USE_PR.glassRel - 1)); setHos(g.fac, tf, hos(g.fac, tf) - x); r.msg += ` 유리 선물로 관계 상승 ×1.5(적대 −${d + x}).`; } } return r; }
  return f.apply(this, arguments); }; }
{ const base = ACT.recT; ACT.recT = v => { base(v); try { UI.f.spice = false; const top = UI.sheets[UI.sheets.length - 1]; const b = top.body; top.body = () => { const h = b(); const have = trCityCargo(UI.city).향료 || 0; if (!have) return h; const blk = `<div class="kv">향료 예물 (창고 ${have}개 · 성공률 +10)</div>${btn('향료 1개를 함께 보낸다', 'recSpice', '', { p: !!UI.f.spice, s: 1 })}`; const a = '<div class="kv">보낼 장수'; return h.includes(a) ? h.replace(a, blk + a) : h + blk; }; renderSheet(); } catch (e) { } }; }
ACT.recSpice = () => { UI.f.spice = !UI.f.spice; renderSheet(); };
ACT.recGo = () => done(dispatch('rec', UI.f.g, { t: UI.f.t, bonus: UI.f.bonus, promise: UI.f.promise, item: UI.f.gift || null, spice: !!UI.f.spice }));
{ const base = ACT.dpT; ACT.dpT = v => { base(v); try { UI.f.glass = false; const top = UI.sheets[UI.sheets.length - 1]; const b = top.body; top.body = () => { const h = b(); if (UI.f.type !== '선물') return h; const have = trCityCargo(UI.city).유리 || 0; if (!have) return h; const blk = `<div class="kv">유리 선물 (창고 ${have}개 · 관계 상승 ×1.5)</div>${btn('유리 1개를 함께 보낸다', 'dpGlass', '', { p: !!UI.f.glass, s: 1 })}`; const a = '<div class="kv">사신'; return h.includes(a) ? h.replace(a, blk + a) : h + blk; }; renderSheet(); } catch (e) { } }; }
ACT.dpGlass = () => { UI.f.glass = !UI.f.glass; renderSheet(); };
ACT.dpGo = () => done(dispatch('dip', UI.f.g, { tf: UI.f.tf, type: UI.f.type, gold: UI.f.giftItem ? 0 : UI.f.gold, target: UI.f.target, item: UI.f.type === '선물' ? UI.f.giftItem : null, glass: UI.f.type === '선물' && !!UI.f.glass }));
// ---------- 인삼: 불로장생. 장수가 있는 도시 창고에서 5개 → 사망 연도 +1년, 장수당 2회. 사망 3년 안쪽이면 "기력이 쇠했다" 힌트 ----------
function useFrail(g) { return !!(g && g.die && g.st !== '사망' && g.die - S.y <= USE_PR.ginsengHint); }
function useGinseng(gn, cnOpt) {
  const g = G(gn); if (!g || g.st !== '현역') return { ok: false, msg: '현역 장수만 복용할 수 있습니다.' };
  const cn = cnOpt || g.loc; if (!cn || !C(cn) || C(cn).owner !== g.fac) return { ok: false, msg: '자기 세력 도시에 있는 장수만 복용할 수 있습니다.' };
  if ((g.ginseng || 0) >= USE_PR.ginsengMax) return { ok: false, msg: `${gn}은(는) 이미 인삼을 ${USE_PR.ginsengMax}번 복용했습니다. 더는 효과가 없습니다.` };
  if (!g.die) return { ok: false, msg: `${gn}에게는 효과가 없습니다.` };
  if (!useHas(cn, '인삼', USE_PR.ginseng)) return { ok: false, msg: `${cn} 창고에 인삼 ${USE_PR.ginseng}개가 필요합니다.` };
  useTake(cn, '인삼', USE_PR.ginseng); g.ginseng = (g.ginseng || 0) + 1; g.die += 1;
  return { ok: true, msg: `${gn}이(가) 고구려 인삼을 복용했다. 기력이 돌아온 듯하다. (${g.ginseng}/${USE_PR.ginsengMax}회)` };
}
function useAiGinseng(fid) { // AI: 군주 → 1품 → 나머지 순. 자기 도시 창고 어디서든
  const cs = () => citiesOf(fid).filter(c => ((c.cargo && c.cargo.인삼) || 0) >= USE_PR.ginseng); if (!cs().length) return;
  const pri = g => isRuler(g) ? 2 : g.rank === 1 ? 1 : 0;
  gensOf(fid).filter(g => g.st === '현역' && useFrail(g) && (g.ginseng || 0) < USE_PR.ginsengMax).sort((a, b) => pri(b) - pri(a)).forEach(g => { const c = cs()[0]; if (c) useGinseng(g.n, c.n); });
}
{ const f = ACT.genD; ACT.genD = v => { f(v); try { const top = UI.sheets[UI.sheets.length - 1]; const g = G(v); if (!g || g.fac !== S.player || g.st !== '현역') return; const b = top.body; top.body = () => { let h = b(); let add = ''; if (useFrail(g)) add += `<div class="warn sm">${g.n}은(는) 기력이 쇠했다. 오래 버티지 못할지도 모른다.</div>`; const have = g.loc && C(g.loc) ? (trCityCargo(g.loc).인삼 || 0) : 0; if (have || (g.ginseng || 0)) add += `<div class="kv">인삼 (창고 ${have}개 · 복용 ${g.ginseng || 0}/${USE_PR.ginsengMax})</div>${btn(`인삼 복용<small>${g.loc} 창고 인삼 ${USE_PR.ginseng}개 · 수명 +1년</small>`, 'trGinseng', g.n, { p: 1, s: 1, dis: have < USE_PR.ginseng || (g.ginseng || 0) >= USE_PR.ginsengMax })}`; if (!add) return h; const i = h.indexOf('<div class="kv">인연</div>'); return i >= 0 ? h.slice(0, i) + add + h.slice(i) : h + add; }; renderSheet(); } catch (e) { } }; }
ACT.trGinseng = v => { const r = useGinseng(v); toast(r.msg, r.ok); renderSheet(); };
// ---------- 매입 포화: 많이 사면 값이 오른다(매도 포화의 거울). 외국 특산품은 나라 시세(mk), 중국 상품은 도시 bsat. 매달 회복 ----------
function trBsat(cn, g) { const c = C(cn); return (c && c.bsat && c.bsat[g]) || 1; }
const trPBuyCN0 = trPBuyCN;
trPBuyCN = function (cn, g) { return Math.max(1, Math.round(trPBuyCN0(cn, g) * trBsat(cn, g))); };
{ const f = trPrice; trPrice = function (cn, g) { if (TR_CN[g]) return Math.max(1, Math.round(trPBuyCN0(cn, g) * 0.85)); return f.apply(this, arguments); }; } // 되팔기 값은 매입 포화와 무관
function trBuyTot(unit, k0, q, up) { let tot = 0, k = k0; for (let left = q; left > 0; left -= 10) { const n = Math.min(10, left); tot += Math.max(1, Math.round(unit * k)) * n; k = trClamp(k + n * (up || USE_PR.buyUp), 0.4, USE_PR.buyMax); } return { tot, k }; }
function trBuyCost(nat, cn, g, q) { return TR_CN[g] ? trBuyTot(trPBuyCN0(cn, g), trBsat(cn, g), q, USE_PR.buyUpCN) : trBuyTot(TR_NAT[nat].goods[g], trMk(nat, g), q, USE_PR.buyUp); } // 매입 총액(포화 반영) · 끝 포화
{ const f = trDeal; trDeal = function (fid, nat, cn, kind, g, q, box) {
  if (kind !== 'buyFor' && kind !== 'buyCN') return f.apply(this, arguments);
  const c = C(cn), cg = trCityCargo(cn); const n0 = cg[g] || 0; const unit = kind === 'buyCN' ? trPBuyCN(cn, g) : trPBuyFor(nat, g);
  let qq = Math.max(0, Math.min(q, trCityFree(cn))); while (qq > 0 && trBuyCost(nat, cn, g, qq).tot > c.gold) qq = qq > 10 ? qq - 10 : qq - 1; // 포화 반영 총액으로 살 수 있는 만큼만
  if (qq <= 0 && q > 0 && trCityFree(cn) > 0) return { ok: false, msg: '금이 부족합니다.' };
  const k0 = kind === 'buyCN' ? trBsat(cn, g) : trMk(nat, g);
  const r = f.call(this, fid, nat, cn, kind, g, qq, box); if (!r || !r.ok) return r;
  const n = (cg[g] || 0) - n0; if (n <= 0) return r;
  const { tot, k } = trBuyTot(kind === 'buyCN' ? trPBuyCN0(cn, g) : TR_NAT[nat].goods[g], k0, n, kind === 'buyCN' ? USE_PR.buyUpCN : USE_PR.buyUp); const extra = tot - unit * n; if (extra > 0) c.gold -= extra;
  if (kind === 'buyCN') { c.bsat = c.bsat || {}; c.bsat[g] = k; } else { const T = trT(); T.mk[nat] = T.mk[nat] || {}; T.mk[nat][g] = k; }
  if (extra > 0) r.msg = r.msg.replace(/금 [\d,]+에/, `금 ${fmt(tot)}에`) + ` (많이 사서 값이 올랐다: 매입 포화 ×${k.toFixed(2)})`;
  return r; }; }
{ const f = trMonthly; trMonthly = function () { try {
  Object.values(S.city).forEach(c => { if (!c.bsat) return; Object.keys(c.bsat).forEach(g => { c.bsat[g] = Math.max(1, c.bsat[g] - USE_PR.buyRec); if (c.bsat[g] <= 1) delete c.bsat[g]; }); if (!Object.keys(c.bsat).length) delete c.bsat; });
  const T = trT(); Object.keys(TR_NAT).forEach(nat => { const m = T.mk[nat]; if (!m) return; Object.keys(TR_NAT[nat].goods).forEach(g => { if (m[g] > 1) m[g] = Math.max(1, m[g] - USE_PR.buyRec); }); }); // 특산품 매입 포화도 매달 −0.12 회복(그 나라 특산품 시세는 매입에만 쓰임)
} catch (e) { } return f.apply(this, arguments); }; }
// ---------- 4-1: 교역 군단 · AI 군주 교역 성향 ----------
CORPS_POL.교역 = { 징병: 0.6, 개발: 0.7, 상업: 1.3, 치수: 0.6, 성벽: 0.7, 훈련: 0.6, 시주: 1 };
function trIncl(fid) { if (fid === S.player) return 1; if (typeof trTrader === 'function' && trTrader(fid)) return 1; return citiesOf(fid).some(c => trIsPort(c.n)) ? 0.7 : 0.4; } // 해안 군주 1 · 항구 있음 0.7 · 내륙 0.4
function trAiTradeAt(fid, nat, cn, box, st, k) { // 관문 cn 에서 nat 과 한 달 거래. k = 성향(수량 배율). 반환 = 금 변화
  const c = C(cn); const N = TR_NAT[nat]; const g0 = c.gold; if (c.gold < 3000) return 0;
  const capS = trIdleCap(cn); if (capS <= 0) return 0;
  const q1 = Math.min(Math.round(40 * k), trCityFree(cn), capS >= 40 ? Math.ceil(capS / 2) : capS); if (q1 > 0 && trDeal(fid, nat, cn, 'buyCN', N.want, q1, box).ok) trDeal(fid, nat, cn, 'sellTo', N.want, 1e9, box);
  // 쓸 물건 비축(5 단계): 여유가 있는 해안 군주는 관문 창고에 화약·명마·은(기력 쇠한 장수가 있으면 인삼)을 조금 둔다 → 출진·포상에 자동 투입
  if (k >= 0.7 && c.gold > 8000 && trCityFree(cn) >= 40) { const cg = trCityCargo(cn); ['화약', '명마', '은', '인삼'].forEach(g => { if (!N.goods[g] || (cg[g] || 0) >= 5 || !P(40)) return; if (g === '인삼' && !gensOf(fid).some(useFrail)) return; trDeal(fid, nat, cn, 'buyFor', g, 5, box); }); }
  if (c.gold < 3000 || st.sold >= 2 || trIdleCap(cn) < 10 || !P(Math.round(k * 100))) return c.gold - g0;
  const dsts = citiesOf(fid).filter(o => kindOf(o.n) === '도시' && o.n !== cn && hops(cn, o.n) >= 3 && trCityFree(o.n) >= 20).slice(0, 12); let best = null;
  Object.keys(N.goods).forEach(g => dsts.forEach(o => { const r = trRoute(fid, cn, o.n); if (!r.ok || r.risk > 0.3) return; const q = Math.min(Math.round(30 * k), trCityFree(cn), trCityFree(o.n), trIdleCap(cn)); const net = (trSellCity(o.n, g, q, false) - trBuyCost(nat, cn, g, q).tot - r.feeU * q); if (q >= 10 && net > 600 && (!best || net > best.net)) best = { g, to: o.n, q, net }; }));
  if (best && trDeal(fid, nat, cn, 'buyFor', best.g, best.q, box).ok) { trShip(fid, cn, best.to, { [best.g]: best.q }); st.sold++; }
  return c.gold - g0;
}
trAiTrade = function (fid) {
  const box = { v: 0 }, st = { sold: 0 }; const k = trIncl(fid); if (!P(Math.round(Math.min(1, k + 0.3) * 100))) return; // 내륙 군주는 거래를 거르는 달이 있다
  Object.keys(TR_NAT).forEach(nat => { const gs = trGates(fid, nat); if (!gs.length || !trOpenOk(fid, nat)) return; const cn = gs.sort((a, b) => (C(b).com || 0) - (C(a).com || 0))[0]; trAiTradeAt(fid, nat, cn, box, st, k); });
  citiesOf(fid).forEach(c => { if (!c.cargo || !P(25)) return; Object.keys(c.cargo).forEach(g => { if (!TR_CN[g] && !USE_INFO[g] && !Object.keys(TR_NAT).some(x => TR_NAT[x].gates.includes(c.n))) trDeal(fid, null, c.n, 'sellCN', g, 1e9); }); }); // 관문이 아닌 도시의 남은 특산품(쓸 데 없는 것)은 가끔 처분
  try { useAiGinseng(fid); } catch (e) { }
};
{ const f = corpsTurn; corpsTurn = function () { // 교역 군단: 관문 도시마다 빈 장수 1명이 교역을 맡고(행동 소모), AI 교역 논리로 거래한다
  try { (S.corps || []).filter(k => k.policy === '교역' && typeof corpsValid === 'function' && corpsValid(k)).forEach(k => {
    const box = { v: 0 }, st = { sold: 0 }; const rep = [];
    k.cities.filter(cn => trIsGate(cn)).forEach(cn => {
      const g = freeGens(cn, S.player).filter(x => !isRuler(x)).sort((a, b) => stat(b, 'p') - stat(a, 'p'))[0]; if (!g) return;
      let d = 0; Object.keys(TR_NAT).forEach(nat => { if (TR_NAT[nat].gates.includes(cn) && trOpenOk(S.player, nat)) d += trAiTradeAt(S.player, nat, cn, box, st, 1); });
      if (d !== 0) { g.acted = true; addExp(g, 'p', 8); rep.push(`${cn} ${g.n} 교역 금 ${d >= 0 ? '+' : ''}${fmt(d)}`); }
    });
    if (rep.length) news(`${k.name} 교역: ${rep.join(' · ')}`);
  }); } catch (e) { console.warn('corps trade', e); }
  return f.apply(this, arguments); }; }
// ---------- 창고 화면 [사용] 버튼 → 해당 명령으로 ----------
{ const f = trStoreHtml; trStoreHtml = function (cn) { let h = f.apply(this, arguments); try { if (C(cn).owner !== S.player) return h; const cg = trCityCargo(cn); const gs = Object.keys(cg).filter(g => cg[g] > 0 && USE_INFO[g]); if (gs.length) h += `<div class="kv">사용 (팔지 않고 쓰기)</div><div class="grid2">${gs.map(g => btn(`${g} 사용<small>${USE_INFO[g]}</small>`, 'trUse', g, { s: 1 })).join('')}</div>`; } catch (e) { } return h; }; }
function useGenPick(title, cn, act, note, pri) { // 도시 안 내 장수 고르기(일본도 지급·인삼 복용)
  openSheet(title, () => { const gs = gensIn(cn, S.player).filter(g => g.st === '현역').sort((a, b) => (pri ? pri(b) - pri(a) : 0)); return `<div class="dim sm">${note}</div>${gs.length ? gs.map(g => genRow(g, `무${stat(g, 'w')} 통${stat(g, 't')}`, act, g.n, false, pri && pri(g) ? '<span class="warn">기력이 쇠했다</span>' : '')).join('') : noGen()}`; }, () => btn('닫기', 'close', '', { p: 1 }));
}
ACT.trUse = g => {
  const cn = UI.city; closeAll();
  if (g === '명마' || g === '철') { const kind = g === '명마' ? '명마' : '무기'; openSheet(`${g} 사용`, () => `<div class="dim sm">${USE_INFO[g]}</div><div class="grid2">${btn(`공방 ${kind} 제작<small>${g} 3개 투입</small>`, 'trUseGo', 'craft:' + kind)}${btn(g === '명마' ? '출진<small>기병 부대에 명마</small>' : '징병<small>철 투입</small>', 'trUseGo', g === '명마' ? 'sortie:horse' : 'draft')}</div>`, () => btn('닫기', 'close', '', { p: 1 })); return; }
  if (g === '일본도') return useGenPick(`${cn} · 일본도 지급`, cn, 'trSword', '받을 장수를 고르세요. 무력 +2 · 예리(일기토 유리). 창고 일본도 ' + (trCityCargo(cn).일본도 || 0) + '개');
  if (g === '인삼') return useGenPick(`${cn} · 인삼 복용`, cn, 'trGinsengPick', `복용할 장수를 고르세요. 인삼 ${USE_PR.ginseng}개로 수명 +1년(장수당 ${USE_PR.ginsengMax}회). 창고 인삼 ${trCityCargo(cn).인삼 || 0}개`, g2 => useFrail(g2) ? 1 : 0);
  if (g === '화약') return ACT.trUseGo('sortie:powder');
  if (g === '은') { openReward(); UI.f.what = 'silver:1'; renderSheet(); toast('포상 화면: 은 1개 = 금 300 상당, 충성 효율 ×1.2', true); return; }
  if (g === '향료') { openRecruit(); toast('등용 대상을 고른 뒤 [향료 1개를 함께 보낸다]를 켜세요 (+10).', true); return; }
  if (g === '유리') { openDiplo(); toast("외교 '선물'에서 [유리 1개를 함께 보낸다]를 켜세요 (관계 상승 ×1.5).", true); return; }
};
ACT.trUseGo = v => { closeAll(); if (v.startsWith('craft:')) { openCraft(); UI.f.kind = v.slice(6); UI.f.mat = true; renderSheet(); } else if (v === 'draft') { openDraft(); UI.f.iron = true; renderSheet(); } else { openSortie(); if (v === 'sortie:horse') UI.f.horse = true; if (v === 'sortie:powder') UI.f.powder = true; renderSheet(); } };
ACT.trSword = v => { const r = useSword(UI.city, v); toast(r.msg, r.ok); if (r.ok) { closeAll(); render(); } };
ACT.trGinsengPick = v => { const r = useGinseng(v); toast(r.msg, r.ok); renderSheet(); };
</script>
