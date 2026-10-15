"""조조전 원본 그림을 전투 v4에 넣는 도구 (개인 플레이 전용 — 원본 그림은 코에이 저작물이라 배포 불가).

사용: python -I tools/jojo_assets.py <reverse-engineering-jojo 경로>
  1) 원본 UNIT_MOV/ATK/SPC에서 필요한 병사 그림만 골라 한 장(assets/jojo_units.png)으로 묶고
  2) 장수 이름 → 그림 번호, 병과 → 그림 번호 표(assets/jojo_units.json)를 만든 뒤
  3) samguk_v105.html 안 <script id="jojo-units"> 블록을 새로 써 넣는다 (그림은 data URL로 내장).

한 줄(높이 64) 배치: 이동 11칸 × 48 | 공격 12칸 × 64 | 특수 5칸 × 48 (48칸은 발밑 맞춰 아래 정렬).
"""
import sys, os, json, base64, io, re, site
if site.getusersitepackages() not in sys.path:
    sys.path.append(site.getusersitepackages())
from PIL import Image

RE = sys.argv[1]
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)
CACHE = os.path.join(RE, 'extracted', 'cache')


def entries(name):
    d = os.path.join(CACHE, name); n = int(open(os.path.join(d, '_count')).read())
    return [open(os.path.join(d, f'{i:04d}.bin'), 'rb').read() for i in range(n)]


def palette():
    p = open(os.path.join(CACHE, 'SPALET', '0000.bin'), 'rb').read()[:768]
    p = p + bytes(768 - len(p))
    return [(p[i * 3 + 1], p[i * 3 + 2], p[i * 3]) for i in range(256)]


PAL = palette()
MOV, ATK, SPC = entries('UNIT_MOV'), entries('UNIT_ATK'), entries('UNIT_SPC')
DATA0 = open(os.path.join(CACHE, 'DATA', '0000.bin'), 'rb').read()
GEN = json.load(open(os.path.join(RE, 'extracted', 'data', 'generals.json'), encoding='utf8'))['generals']
CLS = json.load(open(os.path.join(RE, 'extracted', 'data', 'classes.json'), encoding='utf8'))['classes']


def frame(blob, i, w, h):
    px = blob[i * w * h:(i + 1) * w * h]
    im = Image.frombytes('P', (w, h), px); im.putpalette([c for rgb in PAL for c in rgb])
    im.info['transparency'] = 0
    return im.convert('RGBA')


# 우리 병과 → 조조전 그림 묶음 (번호 = 묶음 + 3×단계 + 색, 색: 0 아군 · 1 우군 · 2 적군)
GENERIC = {'보병': 0, '방진': 0, '기병': 9, '궁병': 18, '궁기병': 27, '산악병': 45, '공성': 54, '책사': 63, '수군': 96}
NO_TIER = {96}  # 단계 없이 색만 3가지
# 조조전 계열 → 맞는 우리 병과 무리 (고유 그림을 쓸 수 있는 경우)
FAM_GROUP = {'군주': 'any', '기병': 'horse', '궁기병': 'horse', '기마책사': 'horse', '서량기병': 'horse',
             '보병': 'foot', '무도가': 'foot', '적병': 'foot', '해적': 'foot', '곰부대': 'foot', '맹호대': 'foot', '황건적': 'foot', '무희': 'foot',
             '궁병': 'bow', '책사': 'sage', '풍수사': 'sage', '도사': 'sage', '주술사': 'sage', '선인': 'sage', '제독': 'foot', '황제': 'foot', '민중': 'foot'}
TRIPLE = {108, 111, 114, 117, 120}  # 단계별로 3장이 이어지는 고유 그림
ALIAS = {'제갈양': '제갈량'}

uniq = {}
for i in range(162):
    n = DATA0[i * 32:i * 32 + 12].split(b'\0')[0].decode('cp949')
    us = GEN[i]['unit_sprite']
    if us['player'] != us['enemy']:
        continue  # 색이 나뉘는 일반 그림
    fam = CLS[GEN[i]['class_id']]['family']
    uniq[ALIAS.get(n, n)] = {'s': us['player'], 'g': FAM_GROUP.get(fam, 'foot'), 'tri': us['player'] in TRIPLE}

need = set()
for base in GENERIC.values():
    need.update(range(base, base + (3 if base in NO_TIER else 9)))
for u in uniq.values():
    need.update(range(u['s'], u['s'] + (3 if u['tri'] else 1)))
need = sorted(need)

ROW = 64; W = 11 * 48 + 12 * 64 + 5 * 48
atlas = Image.new('RGBA', (W, ROW * len(need)), (0, 0, 0, 0))
for r, s in enumerate(need):
    y = r * ROW; x = 0
    for i in range(11): atlas.paste(frame(MOV[s], i, 48, 48), (x, y + 16)); x += 48
    for i in range(12): atlas.paste(frame(ATK[s], i, 64, 64), (x, y)); x += 64
    for i in range(5): atlas.paste(frame(SPC[s], i, 48, 48), (x, y + 16)); x += 48

os.makedirs(os.path.join(ROOT, 'assets'), exist_ok=True)
png = os.path.join(ROOT, 'assets', 'jojo_units.png')
q = atlas.quantize(colors=255, method=Image.Quantize.FASTOCTREE, dither=Image.Dither.NONE)
# 투명 유지: 알파 0 픽셀을 한 색 번호로 모아 투명 처리
a = atlas.getchannel('A'); qq = q.copy(); px = qq.load(); ap = a.load(); used = set(q.getdata())
tidx = 255 if 255 not in used else max(used) + 1
pal = qq.getpalette()[:768]; pal += [0] * (768 - len(pal)); qq.putpalette(pal)
for yy in range(qq.height):
    for xx in range(qq.width):
        if ap[xx, yy] == 0: px[xx, yy] = tidx
qq.save(png, optimize=True, transparency=tidx)
meta = {'row': ROW, 'rows': {str(s): r for r, s in enumerate(need)}, 'generic': GENERIC, 'noTier': sorted(NO_TIER), 'uniq': uniq,
        'layout': {'mov': [0, 48, 11], 'atk': [528, 64, 12], 'spc': [1296, 48, 5]}}
json.dump(meta, open(os.path.join(ROOT, 'assets', 'jojo_units.json'), 'w', encoding='utf8'), ensure_ascii=False, indent=1)

b64 = base64.b64encode(open(png, 'rb').read()).decode()
block = ('<script id="jojo-units">\n// 조조전 원본 병사 그림 (개인 플레이 전용, 배포 금지) — tools/jojo_assets.py가 만든 블록\n'
         f'const JOJO_UNITS = {json.dumps({**meta, "img": "data:image/png;base64," + b64}, ensure_ascii=False)};\n</script>\n')
html = os.path.join(ROOT, 'samguk_v105.html')
s = open(html, encoding='utf8', newline='').read()
s = re.sub(r'<script id="jojo-units">[\s\S]*?</script>\n', '', s)
i = s.rindex('</body>')
s = s[:i] + block + s[i:]
open(html, 'w', encoding='utf8', newline='').write(s)
print(f'sprites {len(need)}  atlas {atlas.size}  png {os.path.getsize(png) // 1024}KB  base64 {len(b64) // 1024}KB  uniq {len(uniq)}')
