# -*- coding: utf-8 -*-
# v107 6b 빌드 스크립트: v106 world-trade·world-use 블록을 선박 제거·거점·뿌리 게이트로 고쳐 samguk_v107.html 에 넣는다.
import io, re, sys
SP = r'C:/Users/USER/AppData/Local/Temp/claude/C--Users-USER-orca-projects-samgukji/fb9bd854-1722-422a-8fdc-d3225fc01b8f/scratchpad'
HTML = r'C:/Users/USER/orca/projects/samgukji/.claude/worktrees/agent-ad9696a798be2eda0/samguk_v107.html'

def rd(p): return io.open(p, encoding='utf-8').read().split('\n')
wt = rd(SP + '/wt.js'); wu = rd(SP + '/wu.js'); v106 = rd(SP + '/v106.html'); html = rd(HTML)
# 1-based helpers
def L(arr, n): return arr[n - 1]
def must(arr, n, sub):
    if sub not in L(arr, n): raise SystemExit('expect L%d to contain %r, got: %s' % (n, sub, L(arr, n)[:120]))
def setl(arr, n, sub, new): must(arr, n, sub); arr[n - 1] = new
def dell(arr, n, sub): must(arr, n, sub); arr[n - 1] = None

# ---------------- world-trade (wt.js) ----------------
dell(wt, 1, '<script id="world-trade">')
setl(wt, 2, '===== 세계 교역', '// ===== 세계 교역 (v107 6b): 누구나 고구려·왜·서역·대진·부상과 상거래·학습·친교 → 교역도(세력×나라 0~100). 거점(항구 15 + 육로 8)이 증폭, 뿌리(경륜·강병·상략·덕화)가 갈래 보상을 막는다. v106 world-trade·world-use 이식, 선박·조선소·대상 제거. 설계: docs/교역_성향_설계.md §3·§5, docs/v107_빌드명세.md 7-3 =====')
# trInit: v1 세이브 세력 공용 화물 → 본거지 창고 (관문 참조 제거)
setl(wt, 44, 'T.cargo', "  if (T.cargo) { Object.keys(T.cargo).forEach(fid => { const cg = T.cargo[fid] || {}; if (!Object.keys(cg).length || !S.fac[fid]) return; const cn = capitalOf(fid) || (citiesOf(fid)[0] || {}).n; if (!cn) return; const dst = trCityCargo(cn); Object.keys(cg).forEach(g => { if (cg[g] > 0) dst[g] = (dst[g] || 0) + cg[g]; }); }); delete T.cargo; }")
dell(wt, 52, 'trFleetInit')
# 관문 폐지: trGates/trOpenOk/trLockWhy → trNatOpen/trLockWhy(부상만)
dell(wt, 58, 'function trGates')
setl(wt, 60, 'function trOpenOk', "function trNatOpen(fid, nat) { return !TR_NAT[nat].far || trSum(fid) >= TR6B.usaSum; } // 부상(usa): 다른 나라 교역도 합계 150 이상 (v1 규칙 복원)")
setl(wt, 61, 'function trLockWhy', "function trLockWhy(fid, nat) { if (TR_NAT[nat].far && trSum(fid) < TR6B.usaSum) return `동쪽 대양 저편의 부상은 다른 네 나라 교역도 합계가 ${TR6B.usaSum} 이상이어야 찾아옵니다 (지금 ${trSum(fid)})`; return null; }")
# 교역도 가산: 거점 증폭을 곱한다
setl(wt, 104, 'const T = trT(); T.rel[fid]', "  if (v > 0) v = Math.max(1, Math.round(v * trAmp(fid, nat))); // 6b: 거점 증폭\n  const T = trT(); T.rel[fid] = T.rel[fid] || {}; const old = T.rel[fid][nat] || 0; const nv = trClamp(old + v, 0, 100); T.rel[fid][nat] = nv;")
# 인물 발견은 경륜 '인물' 갈래
setl(wt, 108, 'TR_TIER.forEach', "  if (!trOpen(fid, '인물')) return; // 6b 뿌리 게이트: 인물 갈래가 닫힌 세력은 발견 없음\n  TR_TIER.forEach(([th, tier]) => {")
# trDeal 전체 교체 (121~135) → 6b 절에서 새로 선언
for n in range(121, 136): wt[n - 1] = None
# trStudy·trBanq (136~153) → 6b 절에서 새로 선언
for n in range(136, 154): wt[n - 1] = None
# 수송: 연안 항로 = 항구끼리, 1개월, 약탈 적음(TR6B.coastRisk), 선박 없음
setl(wt, 162, "if (mode === 'sea')", "  if (mode === 'sea') { if (!sea) return { ok: false, why: '두 도시가 모두 항구여야 합니다.' }; return { ok: true, mode, mo: 1, hops: h, path: [from, to], risk: TR6B.coastRisk, danger: ['연안'], feeU: TR_PR.feeSea, sea }; }")
dell(wt, 172, '4단계: 항로 수송은')
dell(wt, 173, "r.mode === 'sea' && trIdleCap")
setl(wt, 174, 'const fee = r.feeU * n', "  const fee = Math.round(r.feeU * n * trPriceMul(fid)); if (trAvail(fid, from) < fee) return { ok: false, msg: `수송비 금 ${fmt(fee)}이(가) 부족합니다.` };")
setl(wt, 176, 'c.gold -= fee;', "  trPay(fid, from, fee, true); Object.keys(load).forEach(k => { src[k] -= load[k]; if (src[k] <= 0) delete src[k]; });")
setl(wt, 341, '금 200으로 술자리를 엽니다', L(wt, 341).replace('금 200으로 술자리를 엽니다', '금 ${fmt(Math.round(TR6B.banq * trPriceMul(S.player)))}(물가 반영)으로 술자리를 엽니다').replace('교역도 +3~5 (매력이 높을수록)', '교역도 +3~5 (매력이 높을수록) × 거점 증폭'))
dell(wt, 177, 'let ships = null')
setl(wt, 178, 'trT().convoys.push', "  trT().convoys.push({ from, to, fac: fid, cargo: load, left: r.mo, mode: r.mode, risk: r.risk, path: r.path, gen: gn || null, y: S.y, m: S.m });")
setl(wt, 179, 'return { ok: true, msg: `${from} → ${to}', "  return { ok: true, msg: `${from} → ${to} ${r.mode === 'sea' ? '연안 항로' : '육로'}로 화물 ${n}개 출발 (${r.mo}개월, 수송비 ${fmt(fee)}${r.risk ? `, 약탈 위험 ${Math.round(r.risk * 100)}%` : ''}).`, mo: r.mo, mode: r.mode };")
dell(wt, 186, 'v.ships && v.ships.length')
# AI v1 trAiTrade (193~206) 삭제 → world-use 의 trAiTrade 로
for n in range(193, 207): wt[n - 1] = None
# trMonthly (207~234) → 6b 절에서 새로 선언 (235 monthlyUpdate 래퍼는 유지)
for n in range(207, 235): wt[n - 1] = None
must(wt, 235, 'monthlyUpdate = function')
# 특수 병종·정예 전투 훅(236~239)은 6c 범위 → 이름만 남김
setl(wt, 236, '특수 병종: ELITE_REG', "// ---------- 특수 병종·외국 개성의 전투 반영(eliteName 치환·TR_FX·TR_UNIT_FX·총사 출정비)은 6c 범위 밖: trUnitFx() 빈 훅만 둔다 ----------")
setl(wt, 237, 'eliteName = function', "function trUnitFx() { return null; } // 6c: trUnits(fid) 해금 병종을 출진 정예(eliteName)로 바꾸는 자리")
dell(wt, 238, 'calcDmgX = function')
dell(wt, 239, 'applyElite = function')
# UI: 교역 막대 (관문·선단 없이 모든 나라)
setl(wt, 241, 'render = function', "{ const f = render; render = function () { const r = f.apply(this, arguments); try { if (UI.scr === 'main' && UI.city && C(UI.city) && C(UI.city).owner === S.player && S.trade && kindOf(UI.city) === '도시') { const nats = Object.keys(TR_NAT).filter(k => trNatOpen(S.player, k)); const cmds = document.querySelector('[data-a=\"cmd\"]'); const box = cmds && cmds.parentElement; const inc = trIncoming(UI.city); const st = `창고 ${trCityN(UI.city)}/${trCityCap(UI.city)}${inc ? ` (+${inc} 오는 중)` : ''}${trIsPort(UI.city) ? ' · 항구' : trIsHub(UI.city) ? ' · 거점' : ''}`; if (box && !document.querySelector('#app .trbar')) box.insertAdjacentHTML('afterend', `<button type=\"button\" class=\"opsbar trbar\" data-a=\"trOpen\"><span><b>교역</b> ${nats.map(k => `${TR_NAT[k].n} ${trRel(S.player, k)}`).join(' · ')} · ${st}</span><span>›</span></button>`); } } catch (e) { } return r; }; }")
dell(wt, 247, 'const fl = trHarbor(cn)')
setl(wt, 248, 'return `<div class="kv">${cn} 창고', "  return `<div class=\"kv\">${cn} 창고 ${trCityN(cn)}/${trCityCap(cn)}${trIsPort(cn) ? ' · 항구' : trIsHub(cn) ? ' · 거점' : ''}</div><div class=\"pn sm\">${items}</div>${conv}`;")
# openWorldTrade (250~265) → 6b 절에서 새로 선언
for n in range(250, 266): wt[n - 1] = None
setl(wt, 268, 'ACT.trMode', "ACT.trMode = v => ({ 상거래: openTrMarket, 학습: openTrStudy, 친교: openTrBanq, 시세표: openTrPrices, 수송: openTrShip }[v])();")
# openTrMarket (271~294) → 6b 절에서 새로 선언
for n in range(271, 295): wt[n - 1] = None
setl(wt, 318, "연안 항로<small>1개월 · 약탈 없음", L(wt, 318).replace('연안 항로<small>1개월 · 약탈 없음</small>', '연안 항로<small>1개월 · 약탈 적음</small>'))
# openTrStudy (328~336) → 6b 절에서 새로 선언
for n in range(328, 337): wt[n - 1] = None
dell(wt, 345, '</script>')

# ---------------- world-use (wu.js) ----------------
dell(wu, 1, '<script id="world-use">')
setl(wu, 2, '===== 세계 교역 5a', "// ===== 교역품 사용(v106 5a 이식): 공방 재료 · 징병 철 · 일본도 · 은 포상 · 향료·유리 · 인삼 · 매입 포화 · 교역 군단 · AI 교역. 출진 명마·화약 투입(V4 훅)은 6c 범위 밖 =====")
setl(wu, 5, 'const USE_INFO', "const USE_INFO = { 명마: '공방 명마 제작(3개: 등급 +1, 비용 −30%)', 철: '공방 무기 제작(3개: 등급 +1, 비용 −30%) · 징병(1천 명당 1: 비용 −10%, 훈련↑)', 일본도: '장수에게 지급(무력 +2 · 예리: 일기토 유리)', 은: '포상(1개 = 금 300 상당, 충성 효율 ×1.2)', 향료: '등용 예물(1개: 성공률 +10)', 유리: '외교 선물(1개: 관계 상승 ×1.5)', 인삼: '장수 복용(5개: 수명 +1년, 장수당 2회)' };")
# 출진 명마·화약 (43~76) → 빈 훅
setl(wu, 43, '출진: 명마', "// ---------- 출진 명마·화약 투입(startBattle·autoBattle 래퍼, TR_UNIT_INIT, useSortieHtml)은 6c 범위 밖: useBattlePrep() 빈 훅만 ----------")
setl(wu, 44, 'let TR_BFX', "let TR_BFX = null; function useBattlePrep() { return { fx: {}, notes: [] }; } function TR_UNIT_INIT() { }")
for n in range(45, 77): wu[n - 1] = None
# 매입 포화 trDeal 래퍼 (131~142) → 6b trDeal 안에 합침
for n in range(131, 143): wu[n - 1] = None
must(wu, 143, 'trMonthly = function')
# trIncl·trAiTradeAt·trAiTrade·corpsTurn (149~178) → 6b 절에서 새로 선언
for n in range(149, 179): wu[n - 1] = None
# 창고 [사용]: 명마는 공방만, 화약 없음, 출진 분기 없음
setl(wu, 186, "if (g === '명마' || g === '철')", "  if (g === '명마' || g === '철') { const kind = g === '명마' ? '명마' : '무기'; openSheet(`${g} 사용`, () => `<div class=\"dim sm\">${USE_INFO[g]}</div><div class=\"grid2\">${btn(`공방 ${kind} 제작<small>${g} 3개 투입</small>`, 'trUseGo', 'craft:' + kind)}${g === '철' ? btn('징병<small>철 투입</small>', 'trUseGo', 'draft') : ''}</div>`, () => btn('닫기', 'close', '', { p: 1 })); return; }")
dell(wu, 189, "if (g === '화약')")
setl(wu, 194, 'ACT.trUseGo', "ACT.trUseGo = v => { closeAll(); if (v.startsWith('craft:')) { openCraft(); UI.f.kind = v.slice(6); UI.f.mat = true; renderSheet(); } else if (v === 'draft') { openDraft(); UI.f.iron = true; renderSheet(); } };")
dell(wu, 197, '</script>')

new6b = io.open(SP + '/6b.js', encoding='utf-8').read().rstrip('\n').split('\n')
block = ['<!-- v107 6b 교역 개편·거점·뿌리 게이트 (v106 world-trade·world-use 이식, 선박 제거) -->', '<script>'] + [x for x in wt if x is not None] + [x for x in wu if x is not None] + new6b + ['</script>']
body = '\n'.join(block)
for bad in ['trFleet', 'trUseShips', 'needShip', 'world-ships', 'trIdleCap', 'trShipMonthly', 'trHarbor', 'trLandGate', 'trGates', 'trOpenOk', 'openTrYard', 'trFleetInit']:
    if bad in body: raise SystemExit('ship/gate ref left: ' + bad)

# ---------------- html: 삽입·정예 다중 지정 ----------------
if any('v107 6b 교역 개편' in x for x in html): raise SystemExit('already built')
anchor = html.index('<!-- v107 6a 2층 물가 -->')
# 정예 다중 지정 (본문 교체 1): 5927~5933
a = next(i for i, x in enumerate(html) if x.startswith('// 출진 때 정예 지정: UI.f.elite = '))
b = next(i for i, x in enumerate(html) if x.startswith('// ---------- 9. 내각 8석'))
va = next(i for i, x in enumerate(v106) if x.startswith('// 출진 때 정예 지정 (v106: 다중 지정'))
vb = next(i for i, x in enumerate(v106) if x.startswith('// ---------- 9. 내각 8석'))
print('elite body: html %d-%d (%d lines) <- v106 %d-%d (%d lines)' % (a + 1, b, b - a, va + 1, vb, vb - va))
# 정예 UI (본문 교체 2): eliteSelHtml ~ renderSheet 래퍼
c = next(i for i, x in enumerate(html) if x.startswith('function eliteSelHtml()'))
assert html[c + 1].startswith('ACT.eliteT = ') and html[c + 2].startswith('{ const f = renderSheet;')
vc = next(i for i, x in enumerate(v106) if x.startswith('// 정예 출정비에 쓸 수 있는 금'))
assert v106[vc + 2].startswith('function eliteSelHtml()') and v106[vc + 7].startswith('{ const f = renderSheet;')
print('elite ui: html %d-%d <- v106 %d-%d' % (c + 1, c + 3, vc + 1, vc + 8))
assert a < b < c < anchor
out = html[:a] + v106[va:vb] + html[b:c] + v106[vc:vc + 8] + html[c + 3:anchor] + block + html[anchor:]
io.open(HTML, 'w', encoding='utf-8', newline='\n').write('\n'.join(out))
print('block lines', len(block), 'inserted before old line', anchor + 1, '-> new anchor line', anchor + 1 + len(block) + (vb - va) - (b - a) + 8 - 3)
print('total lines', len(out))
