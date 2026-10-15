"""조조전 원본 전장 지도를 전투 v4에 넣는 도구 (개인 플레이 전용 — 코에이 저작물, 배포 불가).

사용: python -I tools/jojo_maps.py <reverse-engineering-jojo 경로> [품질=70]
  - 고른 지도(HMxx)를 WebP로, 지형표(HEXZMAP)를 글자열로 만들어
  - samguk_v105.html 안 <script id="jojo-maps"> 블록을 새로 써 넣는다.
  - 성문은 원본 GATE 겹침 그림(닫힌 성문, 3×3칸)을 같이 넣는다. 원본 지도에는 성문이 빠져 있다.
지형 글자: 원본 지형 번호 n → String.fromCharCode(65 + n)  (0 평지 … 29 지중)
"""
import sys, os, io, json, re, base64, site
if site.getusersitepackages() not in sys.path:
    sys.path.append(site.getusersitepackages())
RE = sys.argv[1]; Q = int(sys.argv[2]) if len(sys.argv) > 2 else 70
sys.path.insert(0, os.path.join(RE, 'tools'))
from ls12 import read
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)
G = os.path.join(RE, '삼국지 조조전(무설치)', '삼국지 조조전(무설치)', '삼국지 조조전(무설치)')

# 지도 고르기: 번호 → 쓰임 (terr: 이 게임 도시 지형, kind: field 야전 / siege 공성, snow: 겨울 지도)
PICK = {
    0: ('평지', 'field'), 9: ('평지', 'field'), 17: ('평지', 'field'), 36: ('강변', 'field'),
    4: ('산악', 'field'), 20: ('산악', 'field'), 25: ('산악', 'field'),
    3: ('강변', 'field'), 26: ('나루', 'field'), 16: ('강변', 'field'), 34: ('나루', 'field'),
    11: ('남만', 'field'),
    1: ('관문', 'siege'), 2: ('관문', 'siege'), 32: ('관문', 'siege'),
    8: ('평지', 'siege'), 30: ('평지', 'siege'), 42: ('평지', 'siege'), 47: ('산악', 'siege'), 48: ('강변', 'siege'), 7: ('평지', 'siege'),
    14: ('평지', 'siege', 1), 23: ('평지', 'siege', 1), 31: ('강변', 'field', 1),
}


def pal(p):
    p = p + bytes(768 - len(p)); return [c for i in range(256) for c in (p[i * 3 + 1], p[i * 3 + 2], p[i * 3])]


hexz = read(os.path.join(G, 'HEXZMAP.E5')); sp = read(os.path.join(G, 'SPALET.E5')); gates = read(os.path.join(G, 'GATE.E5'))
gidx = json.load(open(os.path.join(RE, 'extracted', 'gfx', 'gate', 'gate_index.json'), encoding='utf8'))


def webp(im):
    b = io.BytesIO(); im.save(b, 'WEBP', quality=Q, method=6); return 'data:image/webp;base64,' + base64.b64encode(b.getvalue()).decode()


maps = {}; total = 0
for k, spec in PICK.items():
    W, H = hexz[k][0] * 16, hexz[k][1] * 16; tw, th = W // 48, H // 48
    hm = open(os.path.join(G, f'HM{k:02d}.E5'), 'rb').read(); out = bytearray(W * H)
    for t in range(len(hm) // 2304):
        by, bx = divmod(t, tw)
        for y in range(48):
            o = (by * 48 + y) * W + bx * 48; out[o:o + 48] = hm[t * 2304 + y * 48:t * 2304 + y * 48 + 48]
    im = Image.frombytes('P', (W, H), bytes(out)); im.putpalette(pal(sp[k])); im = im.convert('RGB')
    terr = ''.join(chr(65 + b) for b in hexz[k][2:2 + tw * th])
    gl = []
    for e, v in gidx.items():
        e = int(e)
        if v['map'] == k and e % 2 == 0:  # 짝수 = 성문이 서 있는 모습
            # GATE 엔트리 = 48×48 칸 9개(칸 순서) → 144×144로 맞춤
            raw = gates[e]; pi = Image.new('P', (144, 144)); pi.putpalette(pal(sp[k]))
            for t in range(9):
                tile = Image.frombytes('P', (48, 48), raw[t * 2304:(t + 1) * 2304]); tile.putpalette(pal(sp[k]))
                pi.paste(tile, ((t % 3) * 48, (t // 3) * 48))
            cx, cy = v['centre_tile_xy']; gl.append({'x': cx, 'y': cy, 'img': webp(pi.convert('RGB'))})
    m = {'w': tw, 'h': th, 'terr': spec[0], 'kind': spec[1], 'snow': len(spec) > 2, 't': terr, 'img': webp(im), 'gates': gl}
    maps[k] = m; total += len(m['img']) + sum(len(g['img']) for g in gl)

block = ('<script id="jojo-maps">\n// 조조전 원본 전장 지도 (개인 플레이 전용, 배포 금지) — tools/jojo_maps.py가 만든 블록\n'
         f'const JOJO_MAPS = {json.dumps(maps, ensure_ascii=False)};\n</script>\n')
html = os.path.join(ROOT, 'samguk_v105.html')
s = open(html, encoding='utf8', newline='').read()
s = re.sub(r'<script id="jojo-maps">[\s\S]*?</script>\n', '', s)
i = s.rindex('</body>'); s = s[:i] + block + s[i:]
open(html, 'w', encoding='utf8', newline='').write(s)
print(f'maps {len(maps)}  embedded {total // 1024}KB  gates {sum(len(m["gates"]) for m in maps.values())}  html {os.path.getsize(html) // 1024}KB')
