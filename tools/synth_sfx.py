"""새 효과음을 순수 파이썬으로 합성해 WAV(22050Hz·16비트·모노)로 저장한다. 외부 라이브러리·샘플 불필요.
사용: python -I tools/synth_sfx.py <출력 폴더> [이름 ...]    이름: gun hoof coin gate_open (생략하면 전부)
규약(기존 jojo-sfx 와 같음): 22050Hz 모노, 최대 진폭 0.9×32767 로 정규화, 길이 0.2~1.3초.
  jojo_audio.py 의 normalize/ADPCM 부호화를 그대로 거치므로 WAV 를 SEnn.WAV 자리에 넣거나 --extra 로 읽게 하면 같은 블록에 들어간다.
시드 고정(재현 가능). 소리 성격은 수치(길이·피크·RMS)로만 확인했다 — 청취 검증은 사용자.
"""
import sys, os, math, random, struct, wave
SR = 22050

def lp(x, fc):  # 1극 저역통과
    a = 1 - math.exp(-2 * math.pi * fc / SR); y = 0; out = []
    for v in x: y += a * (v - y); out.append(y)
    return out
def hp(x, fc): l = lp(x, fc); return [a - b for a, b in zip(x, l)]
def env(n, a, d):  # 지수 감쇠 (a초 상승, 시정수 d초)
    na = max(1, int(a * SR)); return [(i / na if i < na else math.exp(-(i - na) / (d * SR))) for i in range(n)]
def noise(n, rnd): return [rnd.uniform(-1, 1) for _ in range(n)]
def mix(*tr):
    n = max(len(t) for t in tr); o = [0.0] * n
    for t in tr:
        for i, v in enumerate(t): o[i] += v
    return o
def norm(x, peak=0.9):
    m = max(1e-9, max(abs(v) for v in x)); return [int(max(-32767, min(32767, v / m * peak * 32767))) for v in x]
def shaped(x, e): return [a * b for a, b in zip(x, e)]
def tone(f0, f1, n, rnd=None):  # 주파수가 f0→f1 로 내려가는 사인
    ph = 0; o = []
    for i in range(n):
        f = f0 * (f1 / f0) ** (i / n); ph += 2 * math.pi * f / SR; o.append(math.sin(ph))
    return o

def gun(rnd):  # 화승총: 날카로운 폭음 + 저음 쿵 + 화약 연기 쉭 꼬리 + 약한 반향
    n = int(.75 * SR)
    crack = shaped(hp(noise(n, rnd), 900), env(n, .0005, .018))
    boom = shaped(lp(noise(n, rnd), 500), env(n, .001, .09))
    thump = shaped(tone(140, 45, n), env(n, .001, .06))
    hiss = shaped(lp(hp(noise(n, rnd), 2500), 6000), env(n, .02, .15))
    dry = mix([v * 1.0 for v in crack], [v * 1.3 for v in boom], [v * 1.0 for v in thump], [v * .12 for v in hiss])
    d = int(.09 * SR); echo = [0.0] * d + [v * .22 for v in lp(dry, 1800)]  # 반향
    return mix(dry, echo)

def hoof(rnd):  # 말발굽 질주: 4박 갤럽 (쿵-따닥-쿵)
    n = int(.9 * SR); o = [0.0] * n
    for t in (0, .13, .23, .45, .58, .68):
        i0 = int(t * SR); m = int(.09 * SR)
        hit = mix(shaped(tone(220, 90, m), env(m, .001, .025)), shaped(hp(lp(noise(m, rnd), 3500), 600), env(m, .0005, .012)))
        for i, v in enumerate(hit):
            if i0 + i < n: o[i0 + i] += v * (1.0 if t in (0, .45) else .7)
    return o

def coin(rnd):  # 교역 거래음: 짤랑 두 번 (금속 배음 합)
    n = int(.6 * SR); o = [0.0] * n
    for t, f in ((0, 2637), (.09, 3520)):
        i0 = int(t * SR)
        for k, (m_, a_) in enumerate(((1, 1), (2.76, .5), (5.4, .3), (8.9, .15))):
            for i in range(n - i0):
                o[i0 + i] += a_ * math.sin(2 * math.pi * f * m_ * i / SR) * math.exp(-i / (SR * (.14 - .02 * k)))
    return o

def gate_open(rnd):  # 성문 열림: 낮은 끼익 + 빗장 쿵 (기존 gate.break 와 구별)
    n = int(1.0 * SR); ph = 0; cr = []
    for i in range(n):
        f = 70 + 25 * math.sin(i / SR * 9) + 40 * (i / n); ph += 2 * math.pi * f / SR
        cr.append((math.sin(ph) + .5 * math.sin(2.02 * ph) + .3 * (1 if math.sin(3.1 * ph) > 0 else -1)) * min(1, i / (.1 * SR)) * math.exp(-max(0, i - .5 * SR) / (.2 * SR)))
    bar = [0.0] * n; i0 = int(.05 * SR); m = int(.2 * SR)
    for i, v in enumerate(shaped(tone(120, 50, m), env(m, .001, .06))): bar[i0 + i] = v * 1.6
    return mix(lp(cr, 900), shaped(lp(noise(n, rnd), 400), [.15 * e for e in env(n, .05, .3)]), bar)

SOUNDS = {'gun': gun, 'hoof': hoof, 'coin': coin, 'gate_open': gate_open}

def write(path, pcm):
    w = wave.open(path, 'wb'); w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes(struct.pack('<%dh' % len(pcm), *pcm)); w.close()

if __name__ == '__main__':
    out = sys.argv[1]; os.makedirs(out, exist_ok=True)
    for name in (sys.argv[2:] or SOUNDS):
        pcm = norm(SOUNDS[name](random.Random(20261020)))
        write(os.path.join(out, name + '.wav'), pcm); print(name, '%.2fs' % (len(pcm) / SR), 'peak', max(map(abs, pcm)))
