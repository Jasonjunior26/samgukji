import os, sys
P = os.path.join(os.path.dirname(__file__), '..', 'trade_check.js')
s = open(P, encoding='utf-8', newline='').read().replace(chr(13) + chr(10), chr(10))
def rep(a, b):
    global s
    if s.count(a) != 1: sys.exit('miss: ' + a[:60])
    s = s.replace(a, b)
rep("// 사용: node tools/trade_check.js [개월=24] > docs/sim/v107_s6b_check.txt",
    "// 사용: node tools/trade_check.js [개월=24] [rr] [시드=1] > docs/sim/v107_s6b_check.txt\n//   rr 을 주면 AI 진행 때 뿌리를 세력 순서대로 돌려 배정(6b 방식), 없으면 게임의 실제 배정(S5 지정표·자동 선택).\n// 6c: 갈래 행동 점검(뿌리별 trFxDo 시험 호출)과 진행 뒤 세력별 갈래 집계(S.trade.fx)를 함께 찍는다.")
rep("const MONTHS = +(process.argv[2] || 24);", "const MONTHS = +(process.argv[2] || 24), RR = process.argv[3] === 'rr', SEED = +(process.argv[4] || 1);")
rep("const ctx = mk(1); ctx.MONTHS = MONTHS;", "const ctx = mk(SEED); ctx.MONTHS = MONTHS; ctx.RR = RR;")
rep("newGame('조조'); S.opt.v4Battle = false; // 시나리오 선택 인자는 미확인: 두 판 모두 기본 시나리오(시작 연도 S.y)로 돈다",
    "newGame('조조', { rand: true, custom: false, scen: sc, diff: 1 }); S.opt.v4Battle = false; // 6c: 시나리오 인자(root_sim.js 와 같은 방식)")
rep("    delete S.fac[f0].root;\n", """    delete S.fac[f0].root;
    // 6c 갈래 행동 점검: 뿌리마다 교역도 75(2등급 고가품)로 맞추고 각 행동을 한 번씩 불러 본다(점검 뒤 되돌림)
    { const keep = JSON.stringify(S); ['경륜', '강병', '상략', '덕화'].forEach(root => { S.fac[f0].root = root; T.rel[f0] = { kor: 75, jpn: 30, eeu: 30, weu: 30, usa: 0 }; if (root === '강병') trUnits(f0).push('맥궁병');
      citiesOf(f0).forEach(c => { c.gold += 20000; c.food += 60000; });
      say('  6c ' + root + ': ' + ['drill', 'mat', 'arb', 'lux', 'wel', 'armz'].map(k => { const r = trFxDo(f0, k); return k + (r.ok ? '○ ' + r.msg.slice(0, 60) : '× ' + r.msg.slice(0, 30)); }).join(' | ')); });
      S = JSON.parse(keep); }
""")
rep("const rootsAll = ['경륜', '강병', '상략', '덕화']; fids.forEach((f, i) => { S.fac[f].root = rootsAll[i % 4]; });",
    "const rootsAll = ['경륜', '강병', '상략', '덕화']; if (RR) fids.forEach((f, i) => { S.fac[f].root = rootsAll[i % 4]; });\n    const rc = {}; fids.forEach(f => { const r = S.fac[f].root || '-'; rc[r] = (rc[r] || 0) + 1; }); say('  뿌리 분포 ' + JSON.stringify(rc) + (RR ? ' (rr)' : ' (실제 배정)'));")
rep("    say('  발견된 외국 인물 ",
    """    const fxs = fids.filter(f => S.fac[f].alive).map(f => { const o = (trT().fx || {})[f] || {}; const cs = citiesOf(f).filter(c => kindOf(c.n) === '도시'); const pt = cs.reduce((s, c) => s + trPopTier(c), 0); const tr = cs.length ? Math.round(cs.reduce((s, c) => s + (c.train || 0), 0) / cs.length) : 0;
      return fname(f) + '(' + (S.fac[f].root || '-') + ') 도시' + cs.length + ' 횟수' + JSON.stringify(o.n || {}) + ' 이익' + JSON.stringify(Object.fromEntries(Object.entries(o.gain || {}).map(([k, v]) => [k, Math.round(v)]))) + ' 투자' + JSON.stringify(o.sink || {}) + ' 고가품' + (o.tier || 0) + '등급 개성' + (o.traits || 0) + ' 병종' + trUnits(f).length + ' 훈련평균' + tr + ' 인구구간' + pt; });
    fxs.forEach(x => say('  [6c] ' + x));
    say('  발견된 외국 인물 """)
open(P, 'w', encoding='utf-8', newline='').write(s.replace(chr(10), chr(13) + chr(10)))
print('ok')
