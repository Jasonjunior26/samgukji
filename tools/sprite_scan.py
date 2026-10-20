"""조조전 추출 캐시에서 현재 안 쓰는 병사 세트를 훑어 contact sheet 로 저장 (개인 플레이 전용).
사용: python -I tools/sprite_scan.py <RE경로> <jojo_units.json> <출력 png> [--used]
  기본은 안 쓰는 세트(번호 라벨 포함, 이동 프레임 0 = 남쪽), --used 면 쓰는 세트 중 대표만.
"""
import sys, os, json, site
if site.getusersitepackages() not in sys.path:
    sys.path.append(site.getusersitepackages())
from PIL import Image, ImageDraw
RE, JS, OUT = sys.argv[1:4]
C = os.path.join(RE, 'extracted', 'cache')
def entries(n):
    d = os.path.join(C, n); k = int(open(os.path.join(d, '_count')).read())
    return [open(os.path.join(d, f'{i:04d}.bin'), 'rb').read() for i in range(k)]
p = open(os.path.join(C, 'SPALET', '0000.bin'), 'rb').read()[:768]; p += bytes(768 - len(p))
PAL = [(p[i*3+1], p[i*3+2], p[i*3]) for i in range(256)]
MOV = entries('UNIT_MOV')
used = {int(k) for k in json.load(open(JS, encoding='utf8'))['rows']}
want = [i for i in range(len(MOV)) if (i in used) == ('--used' in sys.argv)]
if '--used' in sys.argv: want = [i for i in want if i % 3 == 0 or i < 72][:48]
cols = 9; S = 56
sheet = Image.new('RGBA', (cols * S, ((len(want) + cols - 1) // cols) * (S + 10)), (70, 90, 70, 255))
d = ImageDraw.Draw(sheet)
for n, s in enumerate(want):
    im = Image.frombytes('P', (48, 48), MOV[s][:48*48]); im.putpalette([c for r in PAL for c in r]); im.info['transparency'] = 0
    x, y = (n % cols) * S, (n // cols) * (S + 10)
    sheet.alpha_composite(im.convert('RGBA'), (x + 4, y + 10)); d.text((x + 2, y), str(s), fill=(255, 255, 0, 255))
sheet.save(OUT); print(len(want), sheet.size, want)
