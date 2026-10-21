# v107 6c 빌드: 6b 블록 몇 곳 수정 + 6c 블록(block6c.html)을 S5 블록 뒤에 삽입. CRLF 유지.
# 사용: python tools/v107_6c/build6c.py
import os, sys
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
HTML = os.path.join(ROOT, 'samguk_v107.html')
BLOCK = os.path.join(os.path.dirname(__file__), 'block6c.html')
s = open(HTML, encoding='utf-8', newline='').read()
if '<!-- v107 6c ' in s:
    sys.exit('already built')
blk = open(BLOCK, encoding='utf-8', newline='').read().replace('\r\n', '\n').replace('\n', '\r\n')

def rep(old, new, n=1):
    global s
    c = s.count(old)
    if c != n:
        sys.exit(f'count {c} != {n}: {old[:80]}')
    s = s.replace(old, new)

# 1) AI 친교: 한 달 aiBanqN 개 나라만(교역도 100 미만, 증폭 큰 순). 6b는 열린 나라 전부 → 교역도 1 하한 반올림으로 10년 뒤 대부분 100 포화
rep("aiBanq: 2, aiStudyP: 20, aiFoodKeepMo: 24,", "aiBanq: 2, aiBanqN: 1, aiStudyP: 20, aiFoodKeepMo: 18,")
rep("  nats.forEach(nat => {\r\n    const N = TR_NAT[nat]; const cost = Math.round(TR6B.banq * m);\r\n    if (trLeft(fid, nat) >= cost && trPay(fid, cn, cost)) trGain(fid, nat, TR6B.aiBanq, cn);",
    "  let banqN = 0; // 6c: 친교는 한 달 aiBanqN 나라만 (가정)\r\n  nats.forEach(nat => {\r\n    const N = TR_NAT[nat]; const cost = Math.round(TR6B.banq * m);\r\n    if (banqN < TR6B.aiBanqN && trRel(fid, nat) < 100 && trLeft(fid, nat) >= cost && trPay(fid, cn, cost)) { trGain(fid, nat, TR6B.aiBanq, cn); banqN++; }")
# 2) 개성 학습 완료 → 능력 +2 (세력당 5회, 6c trTraitBonus)
rep("g.tr = g.tr || []; g.tr.push(N.trait); trGain(fid, nat, 4, cn); } }", "g.tr = g.tr || []; g.tr.push(N.trait); try { trTraitBonus(fid, g); } catch (e) { } trGain(fid, nat, 4, cn); } }")
rep("if (s.kind === '개성') { g.tr = g.tr || []; if (!g.tr.includes(N.trait)) g.tr.push(N.trait); got = `개성 ${N.trait}`; }",
    "if (s.kind === '개성') { g.tr = g.tr || []; if (!g.tr.includes(N.trait)) g.tr.push(N.trait); got = `개성 ${N.trait}`; try { got += trTraitBonus(fid, g); } catch (e) { } }")
# 3) 인물 발견: TR_GENS 가 이미 다른 세력에 나왔으면 spawnRandom 으로 3/2/1명 (시험기 모델: 세력마다 발견)
rep("const gs = Object.values(S.gen).filter(g => g.nat === nat && g.trTier === tier && g.st === '미등장'); if (!gs.length) return;",
    "let gs = Object.values(S.gen).filter(g => g.nat === nat && g.trTier === tier && g.st === '미등장'); if (!gs.length) { gs = []; for (let i = 0; i < [3, 2, 1][tier - 1]; i++) { try { const x = spawnRandom(cn); if (x) { x.loc = cn; x.st = '재야'; gs.push(x); } } catch (e) { } } if (gs.length) { const names = gs.map(g => g.n).join('·'); if (fid === S.player) news(`${TR_NAT[nat].n}과(와)의 교역(교역도 ${th})으로 ${names}이(가) ${cn}에 찾아왔다 (재야).`); } return; }")
# 4) 교역 창에 갈래 단추
rep("${trStoreHtml(UI.city)}${tools}", "${trStoreHtml(UI.city)}${tools}${typeof trFxHtml === 'function' ? trFxHtml(fid) : ''}")
rep("const d = UI.f.kind === '개성' ? `${TRAITS[N.trait][1]} · 돌아온 장수가 익힙니다 (전투 반영은 6c).`", "const d = UI.f.kind === '개성' ? `${TRAITS[N.trait][1]} · 돌아온 장수가 익히고 능력 하나가 +2 (세력당 5번까지, 전투 반영은 범위 밖).`")
# 5) 6c 블록: S5 블록 끝(</script>) 다음, 전투 v4 블록 앞
anchor = "\r\n</script>\r\n<script>\r\n// ===== 전투 v4 (조조전식) 규칙 핵심 v2"
rep(anchor, "\r\n</script>\r\n" + blk.rstrip('\r\n') + "\r\n<script>\r\n// ===== 전투 v4 (조조전식) 규칙 핵심 v2")
open(HTML, 'w', encoding='utf-8', newline='').write(s)
print('ok')
