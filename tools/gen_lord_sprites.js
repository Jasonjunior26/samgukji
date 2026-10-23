// 군주 전용 스프라이트 생성기 (설계: docs/그래픽_군주_설계.md '게임 연동 명세')
// 입력: samguk_v109.html 의 <script id="jojo-units"> (읽기만)  ->  출력: assets/jojo_lord.png + assets/jojo_lord.json
// 사용: node tools/gen_lord_sprites.js [html경로] [출력폴더]
// 출력 PNG 는 '아군 기준색(원본 빨강 램프)'에 금테·표식을 얹은 18행(6병종 x 3단계). 진영색은 런타임에 lordRecolor 로 칠한다.
const fs = require('fs'), zlib = require('zlib'), path = require('path');
const ROOT = path.join(__dirname, '..');

// ---- PNG 입출력 (node 내장 zlib만) ----
const CT = (() => { const t = []; for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0 } return t })();
function crc(b) { let c = 0xffffffff; for (const x of b) c = CT[(c ^ x) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0 }
function chunk(t, d) { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(t), d]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([l, td, c]) }
function decodePng(buf) {
  let p = 8, w, h, ct, pal, trns, idat = [];
  while (p < buf.length) { const l = buf.readUInt32BE(p), t = buf.toString('latin1', p + 4, p + 8), d = buf.subarray(p + 8, p + 8 + l);
    if (t === 'IHDR') { w = d.readUInt32BE(0); h = d.readUInt32BE(4); ct = d[9] } else if (t === 'PLTE') pal = d; else if (t === 'tRNS') trns = d; else if (t === 'IDAT') idat.push(d); p += 12 + l }
  const raw = zlib.inflateSync(Buffer.concat(idat)); const bpp = ct === 3 ? 1 : ct === 6 ? 4 : 3; const st = w * bpp; const o = Buffer.alloc(st * h);
  for (let y = 0; y < h; y++) { const f = raw[y * (st + 1)]; for (let x = 0; x < st; x++) { const v = raw[y * (st + 1) + 1 + x];
    const a = x >= bpp ? o[y * st + x - bpp] : 0, b = y ? o[(y - 1) * st + x] : 0, c = (x >= bpp && y) ? o[(y - 1) * st + x - bpp] : 0; let r;
    if (f === 0) r = v; else if (f === 1) r = v + a; else if (f === 2) r = v + b; else if (f === 3) r = v + ((a + b) >> 1); else { const pp = a + b - c, pa = Math.abs(pp - a), pb = Math.abs(pp - b), pc = Math.abs(pp - c); r = v + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c) }
    o[y * st + x] = r & 255 } }
  const d = Buffer.alloc(w * h * 4);
  for (let i = 0; i < w * h; i++) { if (ct === 3) { const k = o[i]; d[i * 4] = pal[k * 3]; d[i * 4 + 1] = pal[k * 3 + 1]; d[i * 4 + 2] = pal[k * 3 + 2]; d[i * 4 + 3] = trns && k < trns.length ? trns[k] : 255 } else if (ct === 6) o.copy(d, i * 4, i * 4, i * 4 + 4); else throw new Error('colortype ' + ct) }
  return { w, h, d, pal: ct === 3 ? pal : null };
}
// RGBA -> 인덱스 PNG (0번 = 투명). 반환 {png, colors}
function encodeIndexed(im) {
  const map = new Map(), pal = [[0, 0, 0]]; const idx = Buffer.alloc(im.w * im.h);
  for (let i = 0; i < im.w * im.h; i++) { if (!im.d[i * 4 + 3]) continue; const k = im.d[i * 4] << 16 | im.d[i * 4 + 1] << 8 | im.d[i * 4 + 2]; let j = map.get(k); if (j === undefined) { j = pal.length; pal.push([im.d[i * 4], im.d[i * 4 + 1], im.d[i * 4 + 2]]); map.set(k, j) } idx[i] = j }
  if (pal.length > 256) throw new Error('팔레트 ' + (pal.length - 1) + '색 > 255');
  const raw = Buffer.alloc((im.w + 1) * im.h); for (let y = 0; y < im.h; y++) idx.copy(raw, y * (im.w + 1) + 1, y * im.w, (y + 1) * im.w);
  const ih = Buffer.alloc(13); ih.writeUInt32BE(im.w, 0); ih.writeUInt32BE(im.h, 4); ih[8] = 8; ih[9] = 3;
  const PL = Buffer.from(pal.flat()); const tr = Buffer.from([0]);
  return { png: Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ih), chunk('PLTE', PL), chunk('tRNS', tr), chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]), colors: pal.length - 1 };
}

// ---- 상수 ----
const HEAD = 8;                 // 위쪽 확장(px)
const ROWH = 72;                // 군주 행 높이 (원본 64 + 8)
const LAYOUT = { mov: [0, 48, 11], atk: [528, 64, 12], spc: [1296, 48, 5] }; // [x0, 칸 폭, 칸 수] (원본과 동일)
const CLS = ['보병', '기병', '궁병', '궁기병', '산악병', '책사'];            // 행 = CLS 순서*3 + tier
const SRC_BASE = { 보병: 0, 기병: 9, 궁병: 18, 궁기병: 27, 산악병: 45, 책사: 63 }; // 원본 generic 시작 행 (아군 col 0 = base + 3*tier)
const MARK = { 보병: 'foot', 기병: 'horse', 궁병: 'bow', 궁기병: 'hbow', 산악병: 'mount', 책사: 'sage' };
// 아군 기준 램프(원본): 밝음 -> 어두움 + 외곽선. 런타임 재채색의 열쇠.
const SRC_RAMP = [[231, 0, 0], [195, 0, 0], [154, 0, 1], [110, 0, 0], [74, 0, 0]];
const isRamp = (r, g, b) => r > 60 && r >= g * 2.2 && r >= b * 2.2;
const toneOf = r => { let bi = 0, bd = 1e9; SRC_RAMP.forEach((c, i) => { const d = Math.abs(c[0] - r); if (d < bd) { bd = d; bi = i } }); return bi };
// 기준 금테·표식 색 (원본에 없는 색. 런타임 trim 교체 대상). 키: l 밝음 / m 중간 / d 어둠 / o 표식 외곽선
const GOLD = { l: [255, 230, 120], m: [226, 178, 48], d: [150, 100, 16], o: [58, 36, 0] };

// ---- 색 변주 파라미터 (런타임) ----
// ramp: 5톤(밝음->어둠, 외곽선 포함), trim: 금테 {l,m,d,o} (생략 시 GOLD 그대로)
// 같은 전투에 군주가 둘 이상일 때: 진영 col 의 [0]=기본, [1]=대체(alt). 군주 순번(0,1,..)을 변주 번호로 쓴다.
const VARIANTS = {
  ally:      { ramp: [[212, 112, 255], [160, 66, 216], [112, 36, 160], [72, 18, 106], [38, 8, 66]] },   // 자주(보라 쪽으로 더 진하게, 기존 hue350 탁함 개선)
  allyAlt:   { ramp: [[96, 232, 214], [40, 178, 164], [20, 124, 118], [12, 80, 80], [4, 44, 46]] },     // 청록
  friend:    { ramp: [[255, 178, 40], [240, 128, 8], [190, 84, 4], [132, 52, 2], [78, 28, 0]] },         // 우군 주황(채도 높임, 황토 탁함 개선)
  friendAlt: { ramp: [[190, 236, 70], [128, 190, 30], [84, 138, 14], [52, 90, 6], [26, 52, 0]] },       // 연두
  enemy:     { ramp: [[96, 164, 255], [44, 108, 224], [24, 68, 164], [12, 40, 104], [4, 20, 60]] },       // 파랑
  enemyAlt:  { ramp: [[236, 236, 244], [176, 180, 200], [120, 126, 156], [76, 80, 110], [36, 38, 64]], trim: { l: [255, 214, 120], m: [214, 150, 40], d: [128, 78, 12], o: [40, 22, 0] } }, // 백은(은백) - 파랑 군주 둘째
};
// col(0 아군/1 우군/2 적군) 별 [기본, 대체]
const VARIANT_BY_COL = [['ally', 'allyAlt'], ['friend', 'friendAlt'], ['enemy', 'enemyAlt']];

// 런타임 재채색: base 가 RGBA(ImageData.data 또는 Buffer) 일 때 제자리 치환. 반환 data.
// 게임에 옮길 때 이 함수 본문을 그대로 복사(의존 없음).
function lordRecolor(data, variant) {
  const R = variant.ramp, T = variant.trim, S = [231, 195, 154, 110, 74];
  const tk = T ? [[255, 230, 120], [226, 178, 48], [150, 100, 16], [58, 36, 0]] : null, tv = T ? [T.l, T.m, T.d, T.o] : null;
  for (let i = 0; i < data.length; i += 4) {
    if (!data[i + 3]) continue;
    const r = data[i], g = data[i + 1], b = data[i + 2];
    if (r > 60 && r >= g * 2.2 && r >= b * 2.2) {
      let bi = 0, bd = 999; for (let k = 0; k < 5; k++) { const d = Math.abs(S[k] - r); if (d < bd) { bd = d; bi = k } }
      const c = R[bi]; data[i] = c[0]; data[i + 1] = c[1]; data[i + 2] = c[2];
    } else if (tk) {
      for (let k = 0; k < 4; k++) if (r === tk[k][0] && g === tk[k][1] && b === tk[k][2]) { data[i] = tv[k][0]; data[i + 1] = tv[k][1]; data[i + 2] = tv[k][2]; break }
    }
  }
  return data;
}

// ---- 프레임 목록 ----
function frameList() {
  const FR = [];
  for (let i = 0; i < 11; i++) FR.push({ k: 'mov', i, sx: LAYOUT.mov[0] + i * 48, s: 48, yo: 16, dir: i < 2 ? 's' : i < 4 ? 'n' : i < 6 ? 'w' : i === 6 ? 's' : i === 7 ? 'n' : i === 8 ? 'w' : 's', sway: i % 2, weak: i >= 9 });
  for (let i = 0; i < 12; i++) FR.push({ k: 'atk', i, sx: LAYOUT.atk[0] + i * 64, s: 64, yo: 0, dir: 'snw'[Math.floor(i / 4)], sway: i % 2, weak: false });
  const sd = ['s', 'n', 'w', 's', 's'];
  for (let i = 0; i < 5; i++) FR.push({ k: 'spc', i, sx: LAYOUT.spc[0] + i * 48, s: 48, yo: 16, dir: sd[i], sway: 0, weak: false });
  return FR;
}
const CELL_H = s => s + HEAD; // 칸 높이: 이동·특수 56, 공격 72

// ---- 프레임 변환 ----
const getp = (im, x, y) => { const i = (y * im.w + x) * 4; return [im.d[i], im.d[i + 1], im.d[i + 2], im.d[i + 3]] };
function convertFrame(A, srcRow, f) {
  const W = f.s, H = f.s + HEAD, out = Buffer.alloc(W * H * 4), ramp = new Uint8Array(W * H), mark = new Uint8Array(W * H);
  const setp = (x, y, c, isMark) => { if (x < 0 || y < 0 || x >= W || y >= H) return; const i = (y * W + x) * 4; out[i] = c[0]; out[i + 1] = c[1]; out[i + 2] = c[2]; out[i + 3] = 255; if (isMark) mark[y * W + x] = 1 };
  const opq = (x, y) => x >= 0 && y >= 0 && x < W && y < H && out[(y * W + x) * 4 + 3] > 0;
  for (let y = 0; y < f.s; y++) for (let x = 0; x < f.s; x++) {
    const [r, g, b, a] = getp(A, f.sx + x, srcRow * 64 + f.yo + y); if (!a) continue;
    setp(x, y + HEAD, [r, g, b]); if (isRamp(r, g, b)) ramp[(y + HEAD) * W + x] = 1;
  }
  const rp = (x, y) => x >= 0 && y >= 0 && x < W && y < H && ramp[y * W + x];
  // 금테: 아래가 램프가 아닌 하단 자락 램프 픽셀
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (rp(x, y) && !rp(x, y + 1) && y > HEAD + f.s * 0.45) setp(x, y, GOLD.m, false);
  // 앵커: 램프 픽셀이 2개 이상인 맨 윗줄(투구 꼭대기). 못 찾으면 불투명 맨 윗줄(폴백)
  let ht = -1, cx = 0, fallback = false;
  for (let y = 0; y < H && ht < 0; y++) { const xs = []; for (let x = 0; x < W; x++) if (rp(x, y)) xs.push(x); if (xs.length >= 2) { ht = y; cx = Math.round(xs.reduce((a, b) => a + b) / xs.length) } }
  if (ht < 0) { fallback = true; for (let y = 0; y < H && ht < 0; y++) { const xs = []; for (let x = 0; x < W; x++) if (opq(x, y)) xs.push(x); if (xs.length) { ht = y; cx = Math.round(xs.reduce((a, b) => a + b) / xs.length) } } }
  return { out, W, H, ht, cx, fallback, ramp, mark, setp, opq, rp };
}
// 병종별 표식. 램프색 강조(RAMPL)는 원본 기준색을 써서 런타임에 진영색으로 바뀐다.
const RAMPL = SRC_RAMP[0], RAMPM = SRC_RAMP[1];
function drawMark(F, f, cls) {
  const { setp, ht, cx } = F; if (ht < 0) return;
  const sw = f.sway ? 1 : 0, lean = f.dir === 'w' ? -1 : 0, wk = f.weak ? 1 : 0; // 서쪽 프레임은 뒤(오른쪽)로 기울지 않고 진행 반대로 눕는다: lean<0 -> 왼쪽 앞으로
  const L = GOLD.l, M = GOLD.m, D = GOLD.d, d = (x, y, c) => setp(x, y, c, true);
  const kind = MARK[cls];
  if (kind === 'horse' || kind === 'hbow') { // 꿩깃(기병) / 궁기병은 깃 + 머리띠
    const n = 6 + wk;
    for (let k = 1; k <= n; k++) { const ox = Math.round(k / 4 * (lean + sw)) * (k > 2 ? 1 : 0); const w = k <= 2 ? 3 : k <= n - 1 ? 2 : 1; for (let q = 0; q < w; q++) d(cx - (w >> 1) + q + ox, ht - k, k >= n - 1 ? RAMPL : q === 0 ? M : L) }
    d(cx, ht, D); d(cx + 1, ht, M);
    if (kind === 'hbow') for (let x = -2; x <= 2; x++) d(cx + x, ht + 1, x === 0 ? L : M);
  } else if (kind === 'foot' || kind === 'mount') { // 금관 3봉 (산악병은 양옆 뿔 추가)
    for (let x = -2; x <= 2; x++) d(cx + x, ht, M); for (const x of [-2, 0, 2]) { d(cx + x, ht - 1, L); d(cx + x, ht - 2, M) }
    d(cx, ht - 3, RAMPL); d(cx, ht - 4, L); if (wk) d(cx, ht - 5, M); d(cx - 1, ht + 1, D); d(cx + 1, ht + 1, D);
    if (kind === 'mount') { d(cx - 3, ht, M); d(cx - 4, ht - 1, L); d(cx + 3, ht, M); d(cx + 4, ht - 1, L) }
  } else if (kind === 'bow') { // 금 머리띠 + 깃
    for (let x = -2; x <= 2; x++) d(cx + x, ht + 1, M); d(cx, ht + 1, L);
    const n = 6 + wk; for (let k = 1; k <= n; k++) d(cx + 1 + Math.round(k / 3) + (sw && k > 3 ? 1 : 0) + (lean ? -2 * Math.round(k / 3) : 0), ht - k, k > n - 2 ? RAMPL : L); d(cx + 1, ht, M);
  } else if (kind === 'sage') { // 평천관: 판 + 구슬
    for (let x = -3; x <= 3; x++) { d(cx + x, ht - 1, M); d(cx + x, ht - 2, x % 2 ? L : M) }
    d(cx - 3, ht, RAMPL); d(cx + 3, ht, RAMPL); d(cx - 3, ht + 1, RAMPL); d(cx + 3, ht + 1, RAMPL); d(cx, ht - 3, L); if (wk) d(cx, ht - 4, M);
  }
  // 표식 외곽선: 표식 옆의 빈 칸에만 어두운 갈색 (1배율 가독성)
  const add = []; for (let y = 0; y < F.H; y++) for (let x = 0; x < F.W; x++) if (F.mark[y * F.W + x]) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const X = x + dx, Y = y + dy; if (X >= 0 && Y >= 0 && X < F.W && Y < F.H && !F.opq(X, Y)) add.push([X, Y]) }
  for (const [X, Y] of add) setp(X, Y, GOLD.o, false);
}

function loadJojo(htmlPath) {
  const h = fs.readFileSync(htmlPath, 'utf8'); const i = h.indexOf('<script id="jojo-units">'), j = h.indexOf('</script>', i);
  if (i < 0) throw new Error('jojo-units 블록 없음');
  const J = new Function(h.slice(i + 24, j) + ';return JOJO_UNITS;')();
  return { J, A: decodePng(Buffer.from(J.img.split(',')[1], 'base64')) };
}

// 주의: 원본 행 번호 = 게임의 '그림 번호'(generic 시작 + 3*tier + col). 아틀라스 행은 J.rows[그림 번호].
function build(htmlPath) {
  const { J, A } = loadJojo(htmlPath);
  // 원본 행 구조 확인 (J.generic 의 값은 '그림 번호', 아틀라스 행은 J.rows[번호])
  for (const c of CLS) if (J.generic[c] !== SRC_BASE[c]) throw new Error('generic[' + c + '] = ' + J.generic[c] + ' (기대 ' + SRC_BASE[c] + ')');
  const FR = frameList(), nrows = CLS.length * 3, out = { w: 1536, h: nrows * ROWH, d: Buffer.alloc(1536 * nrows * ROWH * 4) };
  const stats = { frames: 0, fallback: 0, anchors: [] };
  const anchors = {};
  CLS.forEach((c, ci) => { for (let t = 0; t < 3; t++) {
    const srcRow = J.rows[String(SRC_BASE[c] + 3 * t)], dstRow = ci * 3 + t; const anc = [];
    FR.forEach((f, fi) => {
      const F = convertFrame(A, srcRow, f); drawMark(F, f, c); stats.frames++; if (F.fallback) stats.fallback++;
      anc.push([F.ht, F.cx]);
      const ch = f.s + HEAD, y0 = dstRow * ROWH + ROWH - ch; // 칸은 행 아래 정렬
      for (let y = 0; y < ch; y++) for (let x = 0; x < f.s; x++) { const si = (y * F.W + x) * 4; if (!F.out[si + 3]) continue; const di = ((y0 + y) * out.w + f.sx + x) * 4; out.d[di] = F.out[si]; out.d[di + 1] = F.out[si + 1]; out.d[di + 2] = F.out[si + 2]; out.d[di + 3] = 255 }
    });
    anchors[dstRow] = anc;
  } });
  const enc = encodeIndexed(out);
  const meta = {
    version: 1, row: ROWH, rows: nrows, w: 1536, head: HEAD, cls: CLS, rowIndex: '병종순번*3 + tier (색은 런타임)',
    // [x0, 칸 폭, 칸 수, 칸 높이, 행 안 y]  (행 안 y = 칸 윗변)
    mov: [0, 48, 11, 56, ROWH - 56], atk: [528, 64, 12, 72, 0], spc: [1296, 48, 5, 56, ROWH - 56],
    srcBase: SRC_BASE, mark: MARK, srcRamp: SRC_RAMP, gold: GOLD, variants: VARIANTS, variantByCol: VARIANT_BY_COL,
    colors: enc.colors, anchors /* 행 -> [프레임 28개][머리 꼭대기 y(칸 안), 중심 x] */,
  };
  return { png: enc.png, meta, out, stats, A, J, FR };
}

module.exports = { build, loadJojo, decodePng, encodeIndexed, lordRecolor, frameList, VARIANTS, VARIANT_BY_COL, GOLD, SRC_RAMP, CLS, SRC_BASE, ROWH, HEAD, isRamp };

if (require.main === module) {
  const html = process.argv[2] || path.join(ROOT, 'samguk_v109.html'), outDir = process.argv[3] || path.join(ROOT, 'assets');
  const r = build(html); fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'jojo_lord.png'), r.png); fs.writeFileSync(path.join(outDir, 'jojo_lord.json'), JSON.stringify(r.meta));
  // HTML 에 넣을 블록 본문(<script id="jojo-lord"> 안). anchors·gold 설명용 키는 빼서 작게.
  const bm = Object.assign({}, r.meta); delete bm.anchors; delete bm.rowIndex;
  fs.writeFileSync(path.join(outDir, 'jojo_lord_block.js'), 'const JOJO_LORD = ' + JSON.stringify(Object.assign(bm, { img: 'data:image/png;base64,' + r.png.toString('base64') })) + ';\n');
  console.log('rows', r.meta.rows, 'frames', r.stats.frames, 'anchor-fallback', r.stats.fallback, 'colors', r.meta.colors, 'png bytes', r.png.length, '->', outDir);
}
