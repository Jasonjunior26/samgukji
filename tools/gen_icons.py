"""교역 물품 13종 실루엣, 뿌리 4개 인장, 갈래 8개 점, 상대국 5개 인장을 절차 SVG 로 만든다 (외부 자산 불필요, 이모지 불사용).
사용: python -I tools/gen_icons.py <출력 폴더>     예) assets/icons  → goods/*.svg, roots/*.svg, branches/*.svg, nations/*.svg, _preview.html
규약: 물품 viewBox 16x16 단색(사치품=금 #c9a227, 군수품=청 #3f6fa8, 기타=회갈 #8a7a5a) — path 의 fill 속성 하나만 바꾸면 색 교체 가능.
인장은 64x64 원형(바탕색 + 흰 글자), 글자는 SVG <text> (폰트 의존 — 게임에 넣을 땐 인라인 SVG 로 쓰면 게임 글꼴을 따른다).
"""
import sys, os
OUT = sys.argv[1]
LUX, MIL, MISC = '#c9a227', '#3f6fa8', '#8a7a5a'
GOODS = {  # 이름: (분류색, path d) — 16x16, 단색
    '유리': (LUX, 'M8 1 14 6 8 15 2 6Z M2 6h12'),
    '향료': (LUX, 'M3 9h10l-1.5 5h-7Z M7 2c2 1 0 2.5 1.2 4H9.6C8.6 4.5 10.5 3.5 8 1.5Z M2 8h12v1H2Z'),
    '은': (LUX, 'M1 8h14l-3 5H4Z M5 8c0-3 6-3 6 0Z'),
    '담배': (MISC, 'M2 11h9v2H2Z M11 5h3v8h-3Z M12 2c1 1 0 2 1 3h-1.5c-.5-1 .5-2-.5-3Z'),
    '비단': (LUX, 'M2 4h12v8H2Z M2 4a2 2 0 0 0 0 8Z M14 4a2 2 0 0 1 0 8Z M4 6h8v1H4Z M4 9h8v1H4Z'),
    '도자기': (LUX, 'M6 1h4v2c3 1 4 4 3 8-.3 2-2 4-5 4s-4.7-2-5-4c-1-4 0-7 3-8Z'),
    '차': (MISC, 'M2 6h10v3a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4Z M12 7h2.5v2.5H12Z M4 3c1 1-1 1 0 2h1c-1-1 1-1 0-2Z M8 3c1 1-1 1 0 2h1c-1-1 1-1 0-2Z'),
    '인삼': (MISC, 'M8 1a2 2 0 1 1 0 4 2 2 0 0 1 0-4Z M5 6h6l-1 3 3 5h-2l-2-3-1 4H7l-1-4-2 3H3l3-5Z'),
    '명마': (MIL, 'M3 14 5 7 4 2l3 2 3-1 3 5-2 1-2-2-1 2v7Z'),
    '철': (MIL, 'M2 11h12v3H2Z M4 7h8v3H4Z M6 3h4v3H6Z'),
    '일본도': (MIL, 'M14 1l1 1-8 9-1.5-1.5Z M3 10l3 3-1.5 1.5-3-3Z M4 12.5 6 11l1 1-1.5 1.5Z'),
    '화약': (MIL, 'M4 6h8v8H4Z M8 6V3l3-2 M3 8h10 M3 12h10'),
    '모피': (MISC, 'M2 3l3 1 3-2 3 2 3-1-1 5 1 3-3 1-3 3-3-3-3-1 1-3Z'),
    '포도주': (LUX, 'M7 1h2v4l2 3v7H5V8l2-3Z'),
}
ROOTS = {'경륜': ('經綸', '#2f5d9e'), '강병': ('强兵', '#b03a2e'), '상략': ('商略', '#b8901f'), '덕화': ('德化', '#3b7d4f')}
BRANCHES = {'인물': ('人', '#2f5d9e'), '개성': ('性', '#7a4f9e'), '병종': ('兵', '#b03a2e'), '물자': ('物', '#8a7a5a'),
            '차익': ('利', '#b8901f'), '용병': ('傭', '#c0652e'), '민생': ('民', '#3b7d4f'), '보급': ('補', '#3a8a8a')}
NATIONS = {'고구려': ('高', '#8b2f2f'), '왜': ('倭', '#c9c9c9'), '서역': ('西', '#c08a2f'), '대진': ('秦', '#6a3d9a'), '부상': ('扶', '#2f8a8a')}

def svg(w, h, body): return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" width="{w}" height="{h}">{body}</svg>'
def seal(txt, col, size=2):  # 원형 인장
    fs = 22 if len(txt) == 2 else 38
    t = (f'<text x="32" y="29" font-size="{fs}" fill="#fff" text-anchor="middle" font-weight="700" font-family="serif">{txt[0]}</text>'
         f'<text x="32" y="52" font-size="{fs}" fill="#fff" text-anchor="middle" font-weight="700" font-family="serif">{txt[1]}</text>') if len(txt) == 2 else \
        f'<text x="32" y="46" font-size="{fs}" fill="#fff" text-anchor="middle" font-weight="700" font-family="serif">{txt}</text>'
    return svg(64, 64, f'<circle cx="32" cy="32" r="30" fill="{col}"/><circle cx="32" cy="32" r="26" fill="none" stroke="#fff" stroke-opacity=".55" stroke-width="2"/>' + t)
def band(txt, col):  # 상대국: 위쪽 색 띠 + 한 글자 인장
    return svg(64, 64, f'<rect x="2" y="2" width="60" height="14" rx="3" fill="{col}"/><circle cx="32" cy="40" r="20" fill="{col}"/>'
               f'<text x="32" y="50" font-size="26" fill="#fff" text-anchor="middle" font-weight="700" font-family="serif">{txt}</text>')

def put(d, name, s):
    os.makedirs(os.path.join(OUT, d), exist_ok=True)
    open(os.path.join(OUT, d, name + '.svg'), 'w', encoding='utf-8').write(s)

if __name__ == '__main__':
    prev = ['<meta charset="utf-8"><body style="background:#2b3a2e;color:#fff;font:12px sans-serif"><div style="display:flex;flex-wrap:wrap;gap:6px">']
    for n, (col, d) in GOODS.items():
        s = svg(16, 16, f'<path fill="{col}" fill-rule="evenodd" d="{d}"/>'); put('goods', n, s)
        prev.append(f'<div style="background:#e8dfc8;padding:4px;text-align:center;color:#222;width:56px"><div style="zoom:3">{s}</div>{n}</div>')
    for n, (t, c) in ROOTS.items(): s = seal(t, c); put('roots', n, s); prev.append(f'<div style="zoom:1">{s}</div>')
    for n, (t, c) in BRANCHES.items(): s = seal(t, c); put('branches', n, s); prev.append(f'<div style="zoom:.5">{s}</div>')
    for n, (t, c) in NATIONS.items(): s = band(t, c); put('nations', n, s); prev.append(f'<div style="zoom:.8">{s}</div>')
    prev.append('</div>')
    open(os.path.join(OUT, '_preview.html'), 'w', encoding='utf-8').write('\n'.join(prev))
    print('goods', len(GOODS), 'roots', len(ROOTS), 'branches', len(BRANCHES), 'nations', len(NATIONS))
