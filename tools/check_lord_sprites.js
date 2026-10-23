// 군주 스프라이트 검사: node tools/check_lord_sprites.js [html] [assets폴더]   (하나라도 어기면 종료코드 1)
const fs = require('fs'), path = require('path');
const G = require('./gen_lord_sprites.js');
const ROOT = path.join(__dirname, '..');
const html = process.argv[2] || path.join(ROOT, 'samguk_v108.html'), dir = process.argv[3] || path.join(ROOT, 'assets');
const { J, A } = G.loadJojo(html);
const png = fs.readFileSync(path.join(dir, 'jojo_lord.png')), meta = JSON.parse(fs.readFileSync(path.join(dir, 'jojo_lord.json'), 'utf8'));
const L = G.decodePng(png);
let fail = 0; const bad = (m) => { fail++; if (fail <= 12) console.log('FAIL', m) };
const FR = G.frameList();

// 1) 크기·프레임 수
const nrows = G.CLS.length * 3;
if (L.w !== 1536 || L.h !== nrows * G.ROWH) bad('PNG 크기 ' + L.w + 'x' + L.h + ' != 1536x' + nrows * G.ROWH);
if (meta.rows !== nrows || meta.row !== G.ROWH) bad('meta 행 수/높이');
let nfr = 0; for (const r in meta.anchors) { nfr += meta.anchors[r].length; if (meta.anchors[r].length !== 28) bad('행 ' + r + ' 프레임 ' + meta.anchors[r].length) }
if (nfr !== nrows * 28) bad('프레임 총수 ' + nfr);
if (meta.mov[3] !== 56 || meta.atk[3] !== 72 || meta.spc[3] !== 56) bad('칸 높이');

// 2) 원본 픽셀 소실 0 / 비램프 색 보존 / 맨 윗줄 침범 0 / 금테·표식 외 변경 없음
let lost = 0, changed = 0, topHit = 0, collide = 0, markPx = 0;
const gold = Object.values(G.GOLD).map(c => c.join(','));
G.CLS.forEach((c, ci) => { for (let t = 0; t < 3; t++) {
  const srcRow = J.rows[String(G.SRC_BASE[c] + 3 * t)], dstRow = ci * 3 + t;
  FR.forEach(f => {
    const ch = f.s + G.HEAD, y0 = dstRow * G.ROWH + G.ROWH - ch;
    for (let y = 0; y < ch; y++) for (let x = 0; x < f.s; x++) {
      const di = ((y0 + y) * L.w + f.sx + x) * 4, a = L.d[di + 3];
      if (y === 0 && a) topHit++;
      const sy = y - G.HEAD; let sa = 0, sr = 0, sg = 0, sb = 0;
      if (sy >= 0) { const si = ((srcRow * 64 + f.yo + sy) * A.w + f.sx + x) * 4; sa = A.d[si + 3]; sr = A.d[si]; sg = A.d[si + 1]; sb = A.d[si + 2] }
      if (sa) {
        if (!a) { lost++; continue }
        const same = L.d[di] === sr && L.d[di + 1] === sg && L.d[di + 2] === sb;
        if (!same) { if (gold.includes([L.d[di], L.d[di + 1], L.d[di + 2]].join(',')) || (L.d[di] === 231 && L.d[di + 1] === 0)) changed++; /* 금테·표식이 덮은 곳 */ else bad('원본 색 변경 ' + c + t + ' f' + f.k + f.i + ' (' + x + ',' + y + ')') }
        if (gold.includes([sr, sg, sb].join(','))) collide++;
      } else if (a) markPx++;
    }
  });
} });
if (lost) bad('원본 픽셀 소실 ' + lost);
if (topHit) bad('칸 맨 윗줄 침범 ' + topHit);
if (collide) bad('원본에 금/외곽 기준색과 같은 색 ' + collide + '(런타임 trim 교체와 충돌)');

// 3) 팔레트 255색 이하 + 램프 톤 정수 일치 + 변주별 재채색 후에도 255색 이하
if (!L.pal) bad('인덱스 PNG 아님'); else if (L.pal.length / 3 - 1 > 255) bad('팔레트 초과');
const cnt = d => { const s = new Set(); for (let i = 0; i < d.length; i += 4) if (d[i + 3]) s.add(d[i] << 16 | d[i + 1] << 8 | d[i + 2]); return s.size };
const baseColors = cnt(L.d);
const vc = {};
for (const k in G.VARIANTS) { const d = Buffer.from(L.d); G.lordRecolor(d, G.VARIANTS[k]); vc[k] = cnt(d); if (vc[k] > 255) bad('변주 ' + k + ' ' + vc[k] + '색'); }
// 재채색 후 램프(빨강 기준색) 잔존 검사
for (const k in G.VARIANTS) { const d = Buffer.from(L.d); G.lordRecolor(d, G.VARIANTS[k]); let rem = 0; for (let i = 0; i < d.length; i += 4) if (d[i + 3] && G.SRC_RAMP.some(c => c[0] === d[i] && c[1] === d[i + 1] && c[2] === d[i + 2])) rem++; if (rem) bad('변주 ' + k + ' 에 기준 램프 잔존 ' + rem) }
const anchorFb = 0;
console.log(fail ? 'FAIL ' + fail : 'OK', '| 행', nrows, '프레임', nfr, '| 금테로 바뀐 램프', changed, '| 추가 표식 px', markPx, '| 기준색', baseColors, '| 변주 최대색', Math.max(...Object.values(vc)));
process.exit(fail ? 1 : 0);
