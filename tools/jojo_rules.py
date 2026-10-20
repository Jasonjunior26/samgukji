"""조조전 원본 규칙 표(병과·지형·책략·범위)를 전투 v4에 넣는 도구 (개인 플레이 전용).

사용: python -I tools/jojo_rules.py <reverse-engineering-jojo 경로>
  samguk_v107.html 안 <script id="jojo-rules"> 블록을 새로 써 넣는다.
위력·명중 보정은 docs/formulas.md §4.2·4.3 (EXE에서 읽은 값)을 옮겼다.
"""
import sys, os, json, re
RE = sys.argv[1]
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)
D = os.path.join(RE, 'extracted', 'data')
J = lambda n: json.load(open(os.path.join(D, n), encoding='utf8'))
C, T, S, A = J('classes.json'), J('terrain.json'), J('strategies.json'), J('areas.json')
FAM = C['families']
GL = {'C': 1, 'B': 2, 'A': 3, 'S': 4}

classes = []
for c in C['classes']:
    g = c['grades']
    classes.append({'id': c['id'], 'n': c['name'], 'fam': c['family_id'], 'tier': c['tier'], 'mv': c['move'], 'rg': c['attack_hitarea'],
                    'gr': [g[k]['letter'] for k in ('공격력', '방어력', '정신력', '순발력', '사기')], 'hpl': c['hp_per_level'], 'mpl': c['mp_per_level']})
terrain = []
for t in T['terrain']:
    terrain.append({'id': t['id'], 'n': t['name'], 'eff': [t['effect_pct_by_family'][f] for f in FAM],
                    'cost': [(t['move_cost_by_family'][f] if t['move_cost_by_family'][f] is not None else 99) for f in FAM],
                    'el': [k for k, v in t['strategy_allowed'].items() if v]})
# 위력 (power/10) — formulas.md §4.3
POW = {7: [0, 3, 5, 8, 0xb, 0xf, 0x11, 0x14, 0x21, 0x40], 9: [1, 4, 6, 0x10, 0x12], 5: [2, 7, 0xa, 0xd, 0x16, 0x23], 4: [0xc, 0x22], 2: [0xe, 0x24], 12: [0x13, 0x26], 10: [0x41]}
POWER = {i: p for p, ids in POW.items() for i in ids}
# 명중 보정 (분자, 분모) — §4.2
HM = {}
for ids, m in [([1, 2, 6, 7, 0xb, 0xd, 0xe, 0x10, 0x16, 0x17, 0x19, 0x21, 0x32, 0x34], [9, 10]),
               ([3, 8, 0x12, 0x18, 0x1a, 0x1b, 0x1d, 0x1f, 0x22, 0x23, 0x25, 0x36, 0x38], [4, 5]),
               ([4, 0x14, 0x1c, 0x1e, 0x24], [3, 5]), ([0x20], [1, 2]), ([9], [1, 3]), ([0x15], [1, 2]), ([0x2f], [9, 10])]:
    for i in ids: HM[i] = m
SURE = set(range(0x26, 0x2e)) | {0x2e, 0x30, 0x35, 0x37, 0x39, 0x43}
strats = []
for s in S['strategies']:
    i = s['id']
    strats.append({'id': i, 'n': s['name'], 'ty': s['effect_type'], 'el': s.get('element'), 'tg': s['target'], 'rg': s['range_hitarea'], 'ar': s['area_effarea'],
                   'mp': s['mp_cost'], 'learn': {str(x['class_id']): x['level'] for x in s['learned_by']}, 'pw': POWER.get(i, 0),
                   'hm': [1, 1] if i in SURE else HM.get(i, [1, 1]), 'sure': i in SURE})
hit = {str(h['id']): h['cells'] for h in A['hitarea']}
eff = {str(h['id']): h['cells'] for h in A['effarea']}
rules = {'fam': FAM, 'classes': classes, 'terrain': terrain, 'strats': strats, 'hit': hit, 'eff': eff}
block = ('<script id="jojo-rules">\n// 조조전 원본 규칙 표 (병과·지형·책략·범위) — tools/jojo_rules.py가 만든 블록\n'
         f'const JOJO_RULES = {json.dumps(rules, ensure_ascii=False, separators=(",", ":"))};\n</script>\n')
html = os.path.join(ROOT, 'samguk_v107.html')
s = open(html, encoding='utf8', newline='').read()
s = re.sub(r'<script id="jojo-rules">[\s\S]*?</script>\n', '', s)
# 규칙은 전투 코드보다 앞에서 읽히도록 jojo-units 앞(없으면 </body> 앞)에
i = s.find('<script id="jojo-units">'); i = i if i >= 0 else s.rindex('</body>')
s = s[:i] + block + s[i:]
open(html, 'w', encoding='utf8', newline='').write(s)
print('rules', len(classes), 'classes', len(terrain), 'terrain', len(strats), 'strats', len(block) // 1024, 'KB')
