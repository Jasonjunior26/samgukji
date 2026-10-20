"""외국 병종 그림 시제품: 조조전 병사 세트를 팔레트 인덱스 단위로 재채색해 jojo_units 와 같은 한 줄(64px) 형식으로 만든다.
사용: python -I tools/sprite_foreign.py <RE경로> <출력 폴더> [후사르|...]
  - 진영색 인덱스 = 같은 모양의 아군(빨강) 세트와 적군(파랑) 세트에서 값이 다른 팔레트 인덱스
  - 그 인덱스의 색을 (색상 이동, 채도 배율, 명도 배율)로 바꿔 새 팔레트를 만든다 (픽셀 모양은 그대로)
  - 출력: <이름>_{red,ora,blu}.png(한 줄 64 x 1536), <이름>_sheet.png(기존과 나란히 확인용)
행 배치(jojo_units.png 와 동일): 이동 11칸×48(아래 정렬, y+16) | 공격 12칸×64 | 특수 5칸×48 = 가로 1536
"""
import sys, os, colorsys, site
if site.getusersitepackages() not in sys.path:
    sys.path.append(site.getusersitepackages())
from PIL import Image

RE, OUT = sys.argv[1], sys.argv[2]
C = os.path.join(RE, 'extracted', 'cache')
def entries(n):
    d = os.path.join(C, n); k = int(open(os.path.join(d, '_count')).read())
    return [open(os.path.join(d, f'{i:04d}.bin'), 'rb').read() for i in range(k)]
p = open(os.path.join(C, 'SPALET', '0000.bin'), 'rb').read()[:768]; p += bytes(768 - len(p))
PAL = [(p[i*3+1], p[i*3+2], p[i*3]) for i in range(256)]
MOV, ATK, SPC = entries('UNIT_MOV'), entries('UNIT_ATK'), entries('UNIT_SPC')

# 종류별 정의: 바탕 세트(아군/우군/적군 3장 묶음의 첫 번호) + 진영색→새 색
# 색은 (목표 색상 0~1, 채도 배율, 명도 배율). 후사르 = 짙은 청 돌만 + 금빛 장식(아군=진홍 돌만)
SPECS = {
    '후사르': dict(base=12, team=[  # 기병 2단계(경기병 느낌)
        dict(hue=.60, s=1.0, v=.85),   # 아군: 짙은 청
        dict(hue=.00, s=.9,  v=.80),   # 우군(주황 세트): 진홍
        dict(hue=.78, s=.8,  v=.80),   # 적군: 자주
    ], trim=(.12, .9, 1.15)),           # 팔레트에서 노랑·금 계열(장식)은 색을 더 밝게 (색상 유지)
}

def team_idx(base):
    """아군(base)와 적군(base+2) 세트에서 값이 다른 팔레트 인덱스의 집합"""
    s = set()
    for blobs, w in ((MOV, 48), (ATK, 64), (SPC, 48)):
        a, b = blobs[base], blobs[base + 2]
        for x, y in zip(a, b):
            if x != y: s.add(x); s.add(y)
    return s

def frames(blob, w, n): return [blob[i*w*w:(i+1)*w*w] for i in range(n)]

def render(blobs_by_kind, remap):
    """remap: {인덱스: (r,g,b)}. 한 줄 이미지를 돌려준다"""
    row = Image.new('RGBA', (11*48 + 12*64 + 5*48, 64), (0, 0, 0, 0)); x = 0
    for (blob, w, n, dy) in blobs_by_kind:
        for f in frames(blob, w, n):
            im = Image.new('RGBA', (w, w), (0, 0, 0, 0)); px = im.load()
            for i, v in enumerate(f):
                if v == 0: continue
                px[i % w, i // w] = remap.get(v, PAL[v]) + (255,)
            row.alpha_composite(im, (x, dy)); x += w
    return row

def shade(rgb, hue, s, v):
    h, ss, vv = colorsys.rgb_to_hsv(*[c/255 for c in rgb])
    return tuple(int(round(c*255)) for c in colorsys.hsv_to_rgb(hue, min(1, max(ss, .35)*s), min(1, vv*v)))

def make(name, spec):
    ti = team_idx(spec['base']); out = {}
    for t, tc in enumerate(spec['team']):
        b = spec['base'] + t
        # 아군 세트의 진영색 인덱스를 새 색으로 (명암은 원래 색의 명도·채도를 따름)
        src = team_idx(spec['base'])
        mp = {i: shade(PAL[i], tc['hue'], tc['s'], tc['v']) for i in src
              if colorsys.rgb_to_hsv(*[c/255 for c in PAL[i]])[1] > .25}  # 회색·갈색 같은 무채색은 그대로
        # 노랑/금 계열(색상 .08~.18)은 장식으로 남김
        for i in list(mp):
            h = colorsys.rgb_to_hsv(*[c/255 for c in PAL[i]])[0]
            if .07 < h < .18: mp[i] = shade(PAL[i], spec['trim'][0], spec['trim'][1], spec['trim'][2])
        kinds = [(MOV[b], 48, 11, 16), (ATK[b], 64, 12, 0), (SPC[b], 48, 5, 16)]
        out[t] = render(kinds, mp)
    return out

if __name__ == '__main__':
    os.makedirs(OUT, exist_ok=True)
    name = sys.argv[3] if len(sys.argv) > 3 else '후사르'
    spec = SPECS[name]; rows = make(name, spec)
    names = ['red', 'ora', 'blu']
    for t, im in rows.items(): im.save(os.path.join(OUT, f'{name}_{names[t]}.png'))
    # 확인용: 기존 기병 2단계(12~14) 한 줄 + 신규 3색, 각각 이동 프레임 0(남) 2(북) 4(서) 와 공격 프레임 0
    def pick(row):
        return [row.crop((i*48, 16, i*48+48, 64)) for i in (0, 2, 4)] + [row.crop((11*48, 0, 11*48+64, 64))]
    base_rows = [render([(MOV[b], 48, 11, 16), (ATK[b], 64, 12, 0), (SPC[b], 48, 5, 16)], {}) for b in (12, 13, 14)]
    sheet = Image.new('RGBA', (4*60+4, 6*70), (70, 90, 70, 255))
    for r, row in enumerate(base_rows + [rows[0], rows[1], rows[2]]):
        for c, f in enumerate(pick(row)): sheet.alpha_composite(f, (c*60 + 4, r*70 + 4))
    sheet = sheet.resize((sheet.width*1, sheet.height*1)); sheet.save(os.path.join(OUT, f'{name}_sheet.png'))
    print(name, 'row', rows[0].size, 'team idx', len(team_idx(spec['base'])))
