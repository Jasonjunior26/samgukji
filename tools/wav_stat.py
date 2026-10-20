"""WAV 길이·피크·RMS 출력 (효과음 비교용). 사용: python -I tools/wav_stat.py a.wav b.wav ..."""
import sys, os, wave, struct, math
for p in sys.argv[1:]:
    w = wave.open(p); n = w.getnframes(); sr = w.getframerate(); sw = w.getsampwidth(); r = w.readframes(n)
    s = struct.unpack('<%dh' % (len(r) // 2), r) if sw == 2 else [(b - 128) << 8 for b in r]
    print(os.path.basename(p), sr, w.getnchannels(), sw * 8, '%.2fs' % (n / sr), 'peak', max(map(abs, s)), 'rms', int(math.sqrt(sum(v * v for v in s) / len(s))))
