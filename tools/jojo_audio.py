"""조조전 원본 효과음(SE*.WAV)과 BGM 파일을 전투 v4 화면에 넣는 도구 (개인 플레이 전용, 배포 금지).

사용:
  python -I tools/jojo_audio.py <reverse-engineering-jojo 경로 또는 WAV 폴더> [--bgm <폴더>] [--table] [--all] [--no-ffmpeg]

  samguk_v107.html 안의 <script id="jojo-sfx"> 블록(효과음)과 <script id="jojo-bgm"> 블록(BGM)을 새로 써 넣는다.
  --bgm 을 주지 않으면 jojo-bgm 블록은 지운다(합성 BGM만 남음).
  --table  : 장면 ↔ 파일 대응표를 마크다운으로 출력한다 (docs/전투_설계_v4.md 에 붙여 넣는 용도).
  --all    : 대응표에 없는 SE·SE_M 파일까지 모두 넣는다 (기본은 대응표에 쓰인 파일만).

인코딩:
  ffmpeg 가 있으면 OGG Opus(모노 24kbps)로, 없으면 순수 파이썬 IMA ADPCM(4비트, 22050Hz, 초당 11KB)으로 줄여 base64 로 넣는다.
  ADPCM 은 게임 쪽 JSND 가 직접 풀어 WebAudio 버퍼로 만든다 (브라우저 디코더에 기대지 않음).

BGM 폴더: 장면 이름으로 된 파일을 찾는다 (mp3/ogg/opus/m4a/wav).
  야전.mp3 공성.ogg 승리.mp3 패배.mp3 적차례.mp3 회의.mp3  (영문 별칭 field/siege/win/lose/enemy/council 도 됨)
  또는 폴더 안 mapping.json: {"야전": "track02.mp3", "siege": "track05.mp3", ...}
  ffmpeg 가 있으면 Opus 64kbps(채널 그대로)로 줄이고, 없으면 mp3/ogg/m4a 는 그대로, wav 는 ADPCM 으로 넣는다.
"""
import sys, os, re, json, glob, base64, struct, wave, shutil, subprocess, tempfile, io

HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)
HTML = os.path.join(ROOT, 'samguk_v107.html')

# ---------------------------------------------------------------------------
# 장면 ↔ 파일 대응표 (근거: docs/scripts.md 효과음 절, extracted/asm/decomp_all.txt 의 sub_4768a0 호출, MEFF 헤더 sound id)
#   key   : 게임 코드(JSND)가 부르는 장면 이름
#   c     : 파일 (SE23 → SE23.WAV, M00 → SE_M_00.WAV)
#   v     : 재생 음량 배율 (파일은 모두 최대 진폭 0.9 로 맞춰 넣음)
#   s4    : 4배속일 때 'skip' = 건너뜀 (없으면 0.5초로 잘라 재생)
#   conf  : 확인됨 = EXE/스크립트/MEFF 헤더에서 그 용도로 쓰이는 것을 확인 / 추정 = 소리 성격·비슷한 용도에서 고름
# ---------------------------------------------------------------------------
SCENES = [
    # 이동 (EXE sub_4414fb: 지형·병과 계열별 반복 재생 효과음)
    dict(key='move.foot',   label='이동 발소리 (보병 등 기본)',        c='SE23', v=.55, s4='skip', conf='확인됨', note='sub_4414fb 기본값 0x17'),
    dict(key='move.horse',  label='이동 말발굽 (군주·기병·궁기병·기마책사·서량기병)', c='SE24', v=.55, s4='skip', conf='확인됨', note='sub_4414fb 계열 0,3,4,11,13 → 0x18'),
    dict(key='move.cart',   label='이동 수레 (포차·물자대·식량대)',    c='SE25', v=.55, s4='skip', conf='확인됨', note='sub_4414fb 계열 5,21,22 → 0x19 (선인 20 은 무음)'),
    dict(key='move.snow',   label='이동 설원',                          c='SE26', v=.55, s4='skip', conf='확인됨', note='sub_4414fb 지형 7 → 0x1a'),
    dict(key='move.forest', label='이동 숲',                            c='SE27', v=.5,  s4='skip', conf='확인됨', note='sub_4414fb 지형 2 → 0x1b'),
    dict(key='move.marsh',  label='이동 습지',                          c='SE28', v=.55, s4='skip', conf='확인됨', note='sub_4414fb 지형 10 → 0x1c'),
    dict(key='move.water',  label='이동 여울·대하',                     c='SE29', v=.55, s4='skip', conf='확인됨', note='sub_4414fb 지형 9,13 → 0x1d'),
    # 공격 (EXE sub_404849 공격 연출 단계 2·8·충돌 단계)
    dict(key='swing.spear', label='공격 휘두름 (창·몽둥이 등 기본)',    c='SE32', v=.8,  s4='skip', conf='확인됨', note='0x404c87 기본 0x20'),
    dict(key='swing.blade', label='공격 휘두름 (칼: 군주·보병·적병·풍수사·도사·황건적·해적·제독)', c='SE34', v=.8, s4='skip', conf='확인됨', note='0x404c55 sub_442242 계열 → 0x22; 스크립트 컷신도 포즈 14 와 함께 씀'),
    dict(key='swing.bow',   label='활시위 (궁병·궁기병)',               c='SE37', v=.8,  s4='skip', conf='확인됨', note='0x404c77 계열 2,4 → 0x25'),
    dict(key='arrow',       label='화살 날아감',                        c='SE33', v=.7,  conf='확인됨', note='0x404dbd 투사체 회전 연출과 함께 0x21'),
    dict(key='hit',         label='명중',                               c='SE35', v=.9,  conf='확인됨', note='피해가 있을 때 0x23+x (35/36); 스크립트 컷신도 피격 포즈와 함께 35 를 씀'),
    dict(key='crit',        label='회심 명중',                          c='SE36', v=1.0, conf='추정',   note='35/36 중 16비트로 더 무거운 36 을 회심에'),
    dict(key='critFlash',   label='회심 기세 (번쩍)',                   c='SE39', v=.6,  s4='skip', conf='추정',   note='원본은 책략 이름 표시·레벨업 때의 반짝임 0x27'),
    dict(key='miss',        label='회피',                               c='SE30', v=.8,  conf='확인됨', note='피해 0 일 때 0x1e+x (30/31)'),
    dict(key='block',       label='막기',                               c='SE31', v=.8,  conf='확인됨', note='30/31 중 일기토 맞부딪힘에도 쓰는 0x1f'),
    dict(key='wipe',        label='부대 전멸(사라짐)',                  c='SE07', v=.9,  conf='확인됨', note='0x4051af 병력 0 → 부대 지우며 7'),
    # 성문
    dict(key='gate.hit',    label='성문 타격',                          c='SE38', v=.9,  conf='추정',   note='컷신에서 큰 타격(허저)에 쓰는 38'),
    dict(key='gate.break',  label='성문 붕괴',                          c='SE22', v=1.0, conf='추정',   note='sub_443f20 쓰러짐 연출의 0x16; 16비트 낮은 굉음'),
    # 퇴각·차례·결과
    dict(key='rout',        label='퇴각',                               c='SE16', v=.9,  conf='확인됨', note='unit_retreat 0x10'),
    dict(key='turn',        label='차례 시작 (아군·적군 표시)',         c='SE15', v=.7,  s4='skip', conf='추정',   note='원본에 차례 효과음 없음; 부대 등장음 0xf 를 빌림'),
    dict(key='plan',        label='작전 표시',                          c='SE39', v=.6,  s4='skip', conf='추정',   note='책략 이름 표시의 반짝임 0x27'),
    dict(key='win',         label='승리',                               c='SE12', v=.9,  conf='추정',   note='원본 승리는 CD BGM; 클래스 업(item_class_up 0xc) 팡파레를 빌림'),
    dict(key='lose',        label='패배',                               c='SE20', v=.8,  conf='추정',   note='컷신 "징∼ 징∼"(퇴각 징) 20'),
    # 일기토 (docs/scripts.md DUEL_ACTION·DUEL_ATTACK)
    dict(key='duel.swing',  label='일기토 휘두름',                      c='SE07', v=.8,  s4='skip', conf='확인됨', note='DUEL_ACTION 9·10 공격 휘두르기 SE7'),
    dict(key='duel.hit',    label='일기토 타격',                        c='SE36', v=1.0, conf='확인됨', note='DUEL_ATTACK 맞부딪힘 0x24'),
    dict(key='duel.block',  label='일기토 막음',                        c='SE31', v=.8,  conf='확인됨', note='DUEL_ATTACK 맞부딪힘 0x1f'),
    # 메뉴 (EXE 자습 장면·창 열기)
    dict(key='menu.cursor', label='부대 고르기(커서)',                  c='SE00', v=.6,  s4='skip', conf='추정',   note='자습 장면 클릭 뒤 0'),
    dict(key='menu.ok',     label='메뉴 선택(확인)',                    c='SE01', v=.6,  s4='skip', conf='추정',   note='자습 장면 1'),
    dict(key='menu.cancel', label='메뉴 취소',                          c='SE02', v=.6,  s4='skip', conf='추정',   note='자습 장면 2'),
    dict(key='menu.open',   label='창 열림 (명령·작전 회의)',           c='SE09', v=.6,  s4='skip', conf='확인됨', note='sub_46dcfb 창 만들며 9'),
    # 책략 (EXE sub_423f6e: 동작 8 → 이름 표시 0x27 → MEFF 헤더의 sound id = SE_M_xx)
    dict(key='spell.cast',  label='책략 동작',                          c='SE08', v=.7,  s4='skip', conf='확인됨', note='sub_423f6e 0x424024 → 8'),
    dict(key='spell.name',  label='책략 이름 표시',                     c='SE39', v=.6,  s4='skip', conf='확인됨', note='sub_423f6e 0x4242cc → 0x27'),
    dict(key='spell.fire',  label='책략 불 (한 칸)',                    c='M00',  v=.9,  conf='확인됨', note='MEFF_00 작은 불길 sound 0'),
    dict(key='spell.fire2', label='책략 불 (범위)',                     c='M01',  v=.9,  conf='확인됨', note='MEFF_01 큰 불길 sound 1 (MEFF_57 불기둥도 1)'),
    dict(key='spell.water', label='책략 물 (한 칸)',                    c='M02',  v=.9,  conf='확인됨', note='MEFF_02 물기둥 sound 2'),
    dict(key='spell.water2',label='책략 물 (범위)',                     c='M03',  v=.9,  conf='확인됨', note='MEFF_03 큰 파도 sound 3'),
    dict(key='spell.wind',  label='책략 바람 (한 칸)',                  c='M04',  v=.9,  conf='확인됨', note='MEFF_04 바람 칼날 sound 4'),
    dict(key='spell.wind2', label='책략 바람 (범위)',                   c='M05',  v=.9,  conf='확인됨', note='MEFF_05 큰 바람 칼날 sound 5'),
    dict(key='spell.earth', label='책략 땅 (한 칸)',                    c='M06',  v=.9,  conf='확인됨', note='MEFF_06 낙석 sound 6'),
    dict(key='spell.earth2',label='책략 땅 (범위)',                     c='M07',  v=.9,  conf='확인됨', note='MEFF_07 낙석 sound 7'),
    dict(key='spell.earth3',label='책략 땅 (큰 범위)',                  c='M08',  v=.9,  conf='확인됨', note='MEFF_08 큰 바위 sound 8'),
    dict(key='spell.heal',  label='책략 회복 (HP·MP·상태)',             c='M20',  v=.8,  conf='추정',   note='MEFF_25 녹색 고리 sound 20'),
    dict(key='spell.buff',  label='책략 능력 상승·재행동·이동 상승',    c='M33',  v=.8,  conf='추정',   note='MEFF_34~38 다섯 색 반짝임 sound 33'),
    dict(key='spell.debuff',label='책략 능력 하락·흡수',                c='M22',  v=.8,  conf='추정',   note='MEFF_18~21 소용돌이 구 sound 22'),
    dict(key='spell.status',label='책략 상태 이상 (독·부동 등)',        c='M18',  v=.8,  conf='추정',   note='MEFF_22 번개+푸른 불 sound 18'),
    dict(key='spell.confuse',label='책략 혼란·모래폭풍',                c='M19',  v=.8,  conf='추정',   note='MEFF_23/24 회오리 sound 19'),
    dict(key='spell.weather',label='책략 날씨 변화',                    c='M34',  v=.8,  conf='확인됨', note='strat_do_weather 0x4262a3 → 0x86'),
    dict(key='spell.miss',  label='책략 실패(MISS)',                    c='M31',  v=.8,  conf='확인됨', note='MEFF_45 "MISS" 그림 sound 31'),
    dict(key='spell.summon0',label='사신 청룡',                         c='M13',  v=.9,  conf='추정',   note='MCALL06 sound 13 (MCALL05 주작=12 만 그림으로 확인)'),
    dict(key='spell.summon1',label='사신 주작',                         c='M12',  v=.9,  conf='확인됨', note='MCALL05 봉황 그림 sound 12'),
    dict(key='spell.summon2',label='사신 백호',                         c='M14',  v=.9,  conf='추정',   note='MCALL07 sound 14'),
    dict(key='spell.summon3',label='사신 현무',                         c='M15',  v=.9,  conf='추정',   note='MCALL08 sound 15'),
    dict(key='fire',        label='작전 화공 불길',                     c='M01',  v=.9,  conf='추정',   note='큰 불길 MEFF_01 의 소리'),
]
BGM_KEYS = {  # 장면 키 ← 파일 이름(확장자 제외) 별칭
    'field': ['야전', 'field'], 'siege': ['공성', 'siege'], 'enemy': ['적차례', '적_차례', 'enemy'],
    'win': ['승리', 'win'], 'lose': ['패배', 'lose'], 'council': ['회의', '작전회의', 'council'],
}
BGM_ONCE = {'win', 'lose'}
AUDIO_EXT = ['.mp3', '.ogg', '.opus', '.m4a', '.wav', '.oga', '.webm']

def clip_file(c):
    return 'SE_M_%s.WAV' % c[1:] if c.startswith('M') else c + '.WAV'

# ---------------------------------------------------------------------------
# WAV 읽기 → 16비트 모노 샘플 목록 (순수 파이썬)
def read_wav(path):
    w = wave.open(path, 'rb'); ch, sw, sr, n = w.getnchannels(), w.getsampwidth(), w.getframerate(), w.getnframes()
    raw = w.readframes(n); w.close()
    if sw == 1: s = [(b - 128) << 8 for b in raw]
    elif sw == 2: s = list(struct.unpack('<%dh' % (len(raw) // 2), raw))
    else: raise ValueError('지원하지 않는 샘플 폭 %d: %s' % (sw, path))
    if ch > 1: s = [sum(s[i:i + ch]) // ch for i in range(0, len(s) - ch + 1, ch)]
    return s, sr

def resample(s, sr, to):
    if sr == to or not s: return s
    r = sr / to; n = int(len(s) / r); out = []
    for i in range(n):
        p = i * r; j = int(p); f = p - j
        a = s[j]; b = s[j + 1] if j + 1 < len(s) else a
        out.append(int(a + (b - a) * f))
    return out

def normalize(s, peak=0.9):
    mx = max(1, max(abs(v) for v in s)); g = peak * 32767 / mx
    if g > 8: g = 8  # 거의 무음인 파일은 과하게 키우지 않음
    return [max(-32768, min(32767, int(v * g))) for v in s]

# IMA ADPCM (4비트) 부호화 — 게임 쪽 JSND.decodeAdpcm 과 같은 표·순서 (낮은 니블이 먼저)
STEP = [7, 8, 9, 10, 11, 12, 13, 14, 16, 17, 19, 21, 23, 25, 28, 31, 34, 37, 41, 45, 50, 55, 60, 66, 73, 80, 88, 97, 107, 118, 130, 143, 157, 173, 190, 209, 230, 253, 279, 307, 337, 371, 408, 449, 494, 544, 598, 658, 724, 796, 876, 963, 1060, 1166, 1282, 1411, 1552, 1707, 1878, 2066, 2272, 2499, 2749, 3024, 3327, 3660, 4026, 4428, 4871, 5358, 5894, 6484, 7132, 7845, 8630, 9493, 10442, 11487, 12635, 13899, 15289, 16818, 18500, 20350, 22385, 24623, 27086, 29794, 32767]
IDX = [-1, -1, -1, -1, 2, 4, 6, 8]

def adpcm_encode(s):
    pred, idx = 0, 0; out = bytearray(); nib = []
    for v in s:
        step = STEP[idx]; diff = v - pred; code = 0
        if diff < 0: code = 8; diff = -diff
        d = step >> 3
        if diff >= step: code |= 4; diff -= step; d += step
        if diff >= step >> 1: code |= 2; diff -= step >> 1; d += step >> 1
        if diff >= step >> 2: code |= 1; d += step >> 2
        pred = pred - d if code & 8 else pred + d
        pred = max(-32768, min(32767, pred)); idx = max(0, min(88, idx + IDX[code & 7]))
        nib.append(code)
        if len(nib) == 2: out.append(nib[0] | (nib[1] << 4)); nib = []
    if nib: out.append(nib[0])
    return bytes(out)

def adpcm_decode(b, n):  # 시험용 (JS 디코더와 비교)
    pred, idx = 0, 0; out = []
    for byte in b:
        for h in (0, 1):
            if len(out) >= n: break
            code = (byte >> 4) if h else (byte & 15); step = STEP[idx]; d = step >> 3
            if code & 4: d += step
            if code & 2: d += step >> 1
            if code & 1: d += step >> 2
            pred = pred - d if code & 8 else pred + d
            pred = max(-32768, min(32767, pred)); idx = max(0, min(88, idx + IDX[code & 7])); out.append(pred)
    return out

# ---------------------------------------------------------------------------
FFMPEG = shutil.which('ffmpeg')

def ffmpeg_opus(src, bitrate, mono):
    fd, out = tempfile.mkstemp(suffix='.ogg'); os.close(fd)
    cmd = [FFMPEG, '-y', '-loglevel', 'error', '-i', src] + (['-ac', '1', '-ar', '24000'] if mono else []) + ['-c:a', 'libopus', '-b:a', bitrate, '-vbr', 'on', out]
    subprocess.run(cmd, check=True); data = open(out, 'rb').read(); os.remove(out); return data

def encode_sfx(path, use_ffmpeg):
    """효과음 한 개 → 블록에 넣을 dict"""
    if use_ffmpeg:
        s, sr = read_wav(path); s = normalize(resample(s, sr, 22050))
        fd, tmp = tempfile.mkstemp(suffix='.wav'); os.close(fd)
        w = wave.open(tmp, 'wb'); w.setnchannels(1); w.setsampwidth(2); w.setframerate(22050); w.writeframes(struct.pack('<%dh' % len(s), *s)); w.close()
        try: data = ffmpeg_opus(tmp, '24k', True)
        finally: os.remove(tmp)
        return {'f': 'ogg', 'd': base64.b64encode(data).decode('ascii')}
    s, sr = read_wav(path); s = normalize(resample(s, sr, 22050))
    return {'f': 'adpcm', 'sr': 22050, 'n': len(s), 'd': base64.b64encode(adpcm_encode(s)).decode('ascii')}

def encode_bgm(path, use_ffmpeg):
    ext = os.path.splitext(path)[1].lower()
    if use_ffmpeg:
        data = ffmpeg_opus(path, '64k', False); return {'f': 'ogg', 'd': base64.b64encode(data).decode('ascii')}
    if ext == '.wav':
        s, sr = read_wav(path); s = normalize(resample(s, sr, 22050))
        return {'f': 'adpcm', 'sr': 22050, 'n': len(s), 'd': base64.b64encode(adpcm_encode(s)).decode('ascii')}
    mime = {'.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.oga': 'audio/ogg', '.opus': 'audio/ogg', '.m4a': 'audio/mp4', '.webm': 'audio/webm'}.get(ext)
    if not mime: raise ValueError('지원하지 않는 BGM 형식: ' + path)
    return {'f': mime.split('/')[1] if mime != 'audio/mpeg' else 'mp3', 'mime': mime, 'd': base64.b64encode(open(path, 'rb').read()).decode('ascii')}

# ---------------------------------------------------------------------------
def find_wav_dir(p):
    if os.path.isfile(os.path.join(p, 'SE00.WAV')): return p
    for root, dirs, files in os.walk(p):
        if 'SE00.WAV' in files or 'se00.wav' in files: return root
        if root.count(os.sep) - p.count(os.sep) > 5: dirs[:] = []
    raise SystemExit('SE00.WAV 를 찾지 못했습니다: ' + p)

def find_bgm_files(folder):
    found = {}
    mp = os.path.join(folder, 'mapping.json')
    if os.path.isfile(mp):
        for k, v in json.load(open(mp, encoding='utf8')).items():
            key = next((kk for kk, al in BGM_KEYS.items() if k in al or k == kk), None)
            if key and os.path.isfile(os.path.join(folder, v)): found[key] = os.path.join(folder, v)
    for f in sorted(os.listdir(folder)):
        stem, ext = os.path.splitext(f)
        if ext.lower() not in AUDIO_EXT: continue
        key = next((kk for kk, al in BGM_KEYS.items() if stem in al or stem.lower() == kk), None)
        if key and key not in found: found[key] = os.path.join(folder, f)
    return found

def replace_block(html, bid, block):
    # 블록은 줄 머리에서 시작한다 (주석 속에 같은 글자가 있어도 건드리지 않도록 줄 머리만 찾음)
    html = re.sub(r'(?m)^<script id="%s">[^\n]*\n(?:[^\n]*\n)*?</script>\r?\n' % bid, '', html)
    if not block: return html
    m = re.search(r'(?m)^<script id="jojo-rules">', html); i = m.start() if m else html.rindex('</body>')
    return html[:i] + block + html[i:]

def table_md():
    rows = ['| 장면 | 키 | 파일 | 신뢰 | 근거 |', '|---|---|---|---|---|']
    for s in SCENES: rows.append('| %s | `%s` | %s | %s | %s |' % (s['label'], s['key'], clip_file(s['c']), s['conf'], s['note']))
    return '\n'.join(rows)

def main():
    args = sys.argv[1:]
    if '--table' in args: print(table_md()); return
    if not args or args[0].startswith('-'): print(__doc__); return
    src = find_wav_dir(args[0]); use_ff = bool(FFMPEG) and '--no-ffmpeg' not in args
    bgm_dir = args[args.index('--bgm') + 1] if '--bgm' in args else None
    print('WAV 폴더:', src); print('ffmpeg:', FFMPEG if use_ff else '없음 → IMA ADPCM')
    # ---- 효과음 ----
    want = []
    for s in SCENES:
        if s['c'] not in want: want.append(s['c'])
    if '--all' in args:
        for f in sorted(os.listdir(src)):
            m = re.match(r'^(SE)(\d\d)\.WAV$|^SE_M_(\d\d)\.WAV$', f, re.I)
            if m: c = ('M' + m.group(3)) if m.group(3) else ('SE' + m.group(2))
            if m and c not in want: want.append(c)
    clips = {}; raw_total = 0
    for c in want:
        p = os.path.join(src, clip_file(c)); raw_total += os.path.getsize(p); clips[c] = encode_sfx(p, use_ff)
    smap = {s['key']: {k: s[k] for k in ('c', 'v', 's4', 'conf') if k in s} for s in SCENES}
    sfx = {'fmt': 'ogg' if use_ff else 'adpcm', 'map': smap, 'clips': clips}
    block = ('<script id="jojo-sfx">\n// 조조전 원본 효과음 (개인 플레이 전용) — tools/jojo_audio.py가 만든 블록. 장면 대응표는 docs/전투_설계_v4.md 「효과음·BGM」\n'
             'const JOJO_SFX = %s;\n</script>\n' % json.dumps(sfx, ensure_ascii=False, separators=(',', ':')))
    html = open(HTML, encoding='utf8', newline='').read(); before = len(html.encode('utf8'))
    html = replace_block(html, 'jojo-sfx', block)
    print('효과음 %d개: 원본 %dKB → 블록 %dKB' % (len(clips), raw_total // 1024, len(block.encode('utf8')) // 1024))
    # ---- BGM ----
    bblock = ''
    if bgm_dir:
        files = find_bgm_files(bgm_dir)
        if not files: raise SystemExit('BGM 폴더에 장면 이름 파일이 없습니다: ' + bgm_dir)
        bgm = {}
        for k, p in files.items():
            e = encode_bgm(p, use_ff); e['loop'] = k not in BGM_ONCE; e['src'] = os.path.basename(p); bgm[k] = e
            print('BGM %s ← %s (%dKB)' % (k, os.path.basename(p), len(e['d']) * 3 // 4 // 1024))
        bblock = ('<script id="jojo-bgm">\n// 조조전 원본 BGM (개인 플레이 전용) — tools/jojo_audio.py --bgm 이 만든 블록\n'
                  'const JOJO_BGM = %s;\n</script>\n' % json.dumps(bgm, ensure_ascii=False, separators=(',', ':')))
    html = replace_block(html, 'jojo-bgm', bblock)
    if not bgm_dir: print('BGM 블록 없음 (--bgm <폴더> 로 넣음)')
    open(HTML, 'w', encoding='utf8', newline='').write(html)
    print('samguk_v107.html %dKB → %dKB' % (before // 1024, len(html.encode('utf8')) // 1024))

if __name__ == '__main__':
    main()
