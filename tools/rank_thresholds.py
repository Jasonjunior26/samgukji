# 문턱 후보 비교: rk_s*.json 덤프(월별 장수 공적·세력 규모)에 슬롯 규칙(rankSlotsT)을 적용해 1~5품·무관직 비율을 낸다.
import json, sys, glob
cands = {'현행': (150, 80, 30, 0, 10), 'B': (100, 60, 30, 12, 3), 'C': (80, 45, 20, 8, 2), 'D': (60, 35, 15, 5, 1), 'E': (60, 30, 12, 4, 1)}
def slots(f, t, ngen):
    n = f['n']
    if t == 1: return 2 + n // 10 + (1 if f['title'] else 0)
    if t == 2: return 4 + n // 5
    if t == 3: return 6 + n // 3
    if t == 4: return n * 2
    return max(2, ngen // 3)
def assign(fac, gens, th):
    by = {}
    for g in gens: by.setdefault(g['f'], []).append(g)
    cnt = [0] * 6
    for f, gs in by.items():
        info = fac.get(f)
        if not info: cnt[0] += len(gs); continue
        gs = sorted(gs, key=lambda g: -(0.7 * g['s'] * 20 + 0.15 * min(200, g['m'])))
        used = [0] * 6; sl = [0] + [slots(info, t, len(gs)) for t in range(1, 6)]
        for g in gs:
            for t in range(1, 6):
                if g['m'] >= th[t - 1] and used[t] < sl[t]: used[t] += 1; cnt[t] += 1; break
            else: cnt[0] += 1
    return cnt
files = sorted(glob.glob(sys.argv[1] if len(sys.argv) > 1 else 'docs/sim/rk_s?.json'))
data = [json.load(open(f, encoding='utf-8'))[0]['dump'] for f in files]
for mo in ['36', '72', '120', '144']:
    print(f'\n== {mo}개월 (시드 {len(data)}개 합산)')
    for name, th in cands.items():
        c = [0] * 6
        for d in data:
            r = assign(d[mo]['fac'], d[mo]['gens'], th); c = [a + b for a, b in zip(c, r)]
        t = sum(c); print(f'{name:3} 문턱{th}  없음 {c[0]/t*100:4.1f}% 1품 {c[1]/t*100:4.1f}% 2품 {c[2]/t*100:4.1f}% 3품 {c[3]/t*100:4.1f}% 4품 {c[4]/t*100:4.1f}% 5품 {c[5]/t*100:4.1f}%  (장수 {t})')
# 공적 분포
for mo in ['36', '72', '120', '144']:
    ms = sorted(g['m'] for d in data for g in d[mo]['gens']); n = len(ms)
    print(f'공적 분포 {mo}개월: p25 {ms[n//4]} p50 {ms[n//2]} p75 {ms[n*3//4]} p90 {ms[n*9//10]} p99 {ms[n*99//100]} max {ms[-1]}')
