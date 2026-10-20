"""외국 병종 그림: 조조전 병사 세트를 팔레트 인덱스 단위로 재채색하고 모자·무기를 덧그려 jojo_units 와 같은 한 줄(64px) 형식으로 만든다.
사용: python -I tools/sprite_foreign.py <RE경로> <출력 폴더> [이름 ...]     (이름 생략 시 5종 전부; RE경로는 C:/... 형식)
  - 진영색 인덱스 = 같은 모양의 세 진영 세트(아군=red·우군=ora·적군=blu) 사이에서 값이 다른 팔레트 인덱스(진영별로 따로 구함)
  - 그 인덱스의 색을 (색상, 채도 배율, 명도 배율)로 바꾼다 (픽셀 모양·명암은 그대로)
  - weapon: 특정 인덱스(무기색)를 다른 색으로 바꿈(총사: 석궁의 금빛 → 총신/개머리 색)
  - cap: 머리 위 덧그림(프레임마다 가장 위 픽셀 위치에 맞춤). flash: 총구 섬광(공격 프레임 f%4==1)
  - 출력: <이름>_{red,ora,blu}.png(한 줄 64 x 1536), _preview.png(전체 한눈에, 확인용)
행 배치(jojo_units.png 와 동일): 이동 11칸×48(아래 정렬, y+16) | 공격 12칸×64 | 특수 5칸×48 = 가로 1536
산출물은 assets/foreign/ (gitignore). 코에이 원본 파생이라 개인 플레이 전용.
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

# 덧그림 도트: 글자→색. 아래 줄이 머리 맨 위 픽셀 줄(+1)에 겹친다. 'T'는 진영 주색(팀색)
CAPS = {
    # 후사르: 높은 털모자 + 흰 깃 + 금 끈
    'hussar': (['..w..', '..ww.', '.fffff', 'ffffff', 'fgggff'], {'f': (58, 40, 30), 'w': (240, 240, 235), 'g': (236, 190, 70)}),
    # 사무라이: 상투 + 머리띠
    'samurai': (['.kk.', 'kkkk', '.kk.', 'wwww'], {'k': (20, 18, 24), 'w': (235, 235, 235)}),
    # 맥궁병: 모자에 꽂은 꿩깃
    'feather': (['..g', '.gw', '.gw', 'ggg'], {'g': (60, 150, 80), 'w': (235, 235, 225)}),
    # 원탁기사: 투구 깃털 장식(진영색)
    'plume': (['..TT.', '.TTTT', 'TTTT.', 'sssss'], {'s': (200, 205, 215)}),
    # 총사: 삼각모 느낌의 검은 모자 + 흰 띠
    'tricorn': (['.kkkk.', 'kkkkkk', 'wwwwww', '.kkkk.'], {'k': (24, 24, 40), 'w': (235, 235, 235)}),
}
# 종류별 정의: 바탕 세트(아군 번호; +1 우군, +2 적군) + 진영색(색상 0~1, 채도 배율, 명도 배율). 진영색 구분을 잃지 않도록 색상은 각 진영 계열 안에서 바꾼다
SPECS = {
    '후사르': dict(base=12, cap='hussar', team=[dict(hue=.97, s=1.0, v=.78), dict(hue=.07, s=1.0, v=.90), dict(hue=.62, s=.95, v=.72)], trim=(.12, .9, 1.15)),
    '맥궁병': dict(base=24, cap='feather', team=[dict(hue=.01, s=.75, v=.68), dict(hue=.08, s=.85, v=.70), dict(hue=.50, s=.70, v=.62)], trim=None),
    '사무라이': dict(base=78, cap='samurai', team=[dict(hue=.99, s=1.0, v=.66), dict(hue=.06, s=1.0, v=.78), dict(hue=.63, s=1.0, v=.62)], trim=None),
    '원탁기사': dict(base=15, cap='plume', team=[dict(hue=.00, s=1.0, v=1.0), dict(hue=.07, s=1.0, v=1.0), dict(hue=.60, s=.95, v=.95)], trim=None),
    '총사': dict(base=21, cap='tricorn', team=[dict(hue=.98, s=.95, v=.82), dict(hue=.07, s=.95, v=.88), dict(hue=.60, s=.95, v=.74)], trim=None,
               weapon={14: (72, 72, 80), 16: (118, 78, 40), 17: (96, 96, 108)}, flash=True),
}
PAD = {}  # 팀색 상수(plume 'T') — make()에서 채움

def team_idx(base, t):
    """진영 t(0~2)의 세트에서, 다른 두 진영 세트와 값이 다른 팔레트 인덱스의 집합 (진영 t 쪽 값)"""
    s = set()
    for blobs in (MOV, ATK, SPC):
        a = blobs[base + t]
        for o in (1, 2):
            b = blobs[base + (t + o) % 3]
            for x, y in zip(a, b):
                if x != y and x: s.add(x)
    return s

def hsv(rgb): return colorsys.rgb_to_hsv(*[c/255 for c in rgb])
def shade(rgb, hue, s, v):
    h, ss, vv = hsv(rgb)
    return tuple(int(round(c*255)) for c in colorsys.hsv_to_rgb(hue, min(1, max(ss, .35)*s), min(1, vv*v)))

def team_map(spec, t):
    tc = spec['team'][t]; mp = {}
    for i in team_idx(spec['base'], t):
        h, s_, v_ = hsv(PAL[i])
        if s_ <= .25: continue  # 회색·은색 같은 무채색은 그대로
        if spec['trim'] and .07 < h < .18: mp[i] = shade(PAL[i], *spec['trim'])
        else: mp[i] = shade(PAL[i], tc['hue'], tc['s'], tc['v'])
    return mp

def frame_img(f, w, remap, wmap):
    im = Image.new('RGBA', (w, w), (0, 0, 0, 0)); px = im.load(); wp = []
    for i, v in enumerate(f):
        if v == 0: continue
        if v in wmap: wp.append((i % w, i // w))
        px[i % w, i // w] = (wmap.get(v) or remap.get(v) or PAL[v]) + (255,)
    return im, wp

def overlay_cap(im, cap, tcol, stand_h):
    art, cols = cap; cols = dict(cols); cols['T'] = tcol
    bb = im.getbbox()
    if not bb or bb[3] - bb[1] < stand_h * .7: return  # 쓰러진 자세 등은 건너뜀
    px = im.load(); y0 = bb[1]
    xs = [x for x in range(im.width) for y in range(y0, y0 + 3) if px[x, y][3]]
    if not xs: return
    cx = sum(xs) // len(xs); h = len(art); w = max(len(r) for r in art)
    oy = y0 + 1 - h  # 맨 아래 줄이 머리 맨 위 +1 줄에 겹침
    for j, row in enumerate(art):
        for i, ch in enumerate(row):
            x, y = cx - w // 2 + i, oy + j
            if ch in cols and 0 <= x < im.width and 0 <= y < im.height: px[x, y] = cols[ch] + (255,)

def overlay_flash(im, wp):
    if len(wp) < 4: return
    bb = im.getbbox(); bx = (bb[0] + bb[2]) / 2; by = (bb[1] + bb[3]) / 2
    tx, ty = max(wp, key=lambda q: (q[0]-bx)**2 + (q[1]-by)**2)
    px = im.load()
    for dx, dy, c in ((0,0,(255,250,200)),(-1,0,(255,220,90)),(1,0,(255,220,90)),(0,-1,(255,220,90)),(0,1,(255,220,90)),
                      (-2,0,(255,150,40)),(2,0,(255,150,40)),(0,-2,(255,150,40)),(0,2,(255,150,40))):
        x, y = tx + dx, ty + dy
        if 0 <= x < im.width and 0 <= y < im.height: px[x, y] = c + (255,)

def make(name, spec):
    out = {}; cap = CAPS[spec['cap']]; wmap = spec.get('weapon', {})
    for t in range(3):
        remap = team_map(spec, t); b = spec['base'] + t
        tcol = shade((200, 0, 0), spec['team'][t]['hue'], 1.0, spec['team'][t]['v'])
        row = Image.new('RGBA', (11*48 + 12*64 + 5*48, 64), (0, 0, 0, 0)); x = 0
        stand = None
        for (blob, w, n, dy, kind) in ((MOV[b], 48, 11, 16, 'm'), (ATK[b], 64, 12, 0, 'a'), (SPC[b], 48, 5, 16, 's')):
            for k in range(n):
                f = blob[k*w*w:(k+1)*w*w]
                im, wp = frame_img(f, w, remap, wmap)
                bb = im.getbbox()
                if stand is None and bb: stand = bb[3] - bb[1]
                overlay_cap(im, cap, tcol, stand or 1)
                if spec.get('flash') and kind == 'a' and k % 4 == 1: overlay_flash(im, wp)
                row.alpha_composite(im, (x, dy)); x += w
        out[t] = row
    return out

if __name__ == '__main__':
    os.makedirs(OUT, exist_ok=True)
    names = sys.argv[3:] or list(SPECS)
    cell = 42
    sheet = Image.new('RGBA', (3 * 4 * cell, len(names) * 50), (70, 90, 70, 255))
    for r, name in enumerate(names):
        rows = make(name, SPECS[name]); tn = ['red', 'ora', 'blu']
        for t, im in rows.items():
            im.save(os.path.join(OUT, f'{name}_{tn[t]}.png'))
            # 이동 남(0)·북(2)·서(4) + 공격 서쪽 프레임 9(f%4==1)
            for c, f in enumerate([im.crop((i*48, 16, i*48+48, 64)) for i in (0, 2, 4)] + [im.crop((11*48 + 9*64 + 8, 8, 11*48 + 10*64 - 8, 56))]):
                sheet.alpha_composite(f.resize((42, 42), Image.NEAREST) if False else f.crop((3,3,45,45)), ((t*4 + c)*cell, r*50))
        print(name, rows[0].size)
    sheet.save(os.path.join(OUT, '_preview.png'))
