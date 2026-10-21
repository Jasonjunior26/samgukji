// v107 S7 (UI v1.4) 빌드 도구: 지도 바탕 데이터 MAP_BASE 를 만들고 tools/s7_ui.html 블록을 samguk_v108.html 에 넣는다.
// 사용: node tools/s7_build.js        (다시 돌리면 <!-- v107 S7 --> ~ <!-- /v107 S7 --> 사이를 통째로 바꾼다)
//       node tools/s7_build.js --data  (MAP_BASE 크기·점 개수만 출력)
// 해안선·산맥·계절 팔레트는 목업 tools/mockup_v14/build.js(4차)에서 그대로 옮겼다. 흐림 필터용 데이터는 없다.
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const HTML = path.join(ROOT, 'samguk_v108.html');
const SRC = path.join(__dirname, 's7_ui.html');

function catmull(pts, seg) {
  const out = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
    for (let s = 0; s < seg; s++) {
      const t = s / seg, t2 = t * t, t3 = t2 * t;
      const f = k => 0.5 * ((2 * p1[k]) + (-p0[k] + p2[k]) * t + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t2 + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * t3);
      out.push([+f(0).toFixed(1), +f(1).toFixed(1)]);
    }
  }
  out.push(pts[pts.length - 1]);
  return out;
}
// ---- 해안선 (build.js COAST_CTRL·KOREA·TONKIN 그대로) ----
const COAST_CTRL = [
  [1010, 70], [992, 95], [975, 122], [955, 150], [936, 178], [918, 166], [905, 145], [886, 126], [860, 122], [835, 131],
  [812, 140], [790, 148], [772, 164], [760, 190], [758, 215], [770, 238], [790, 250], [812, 256], [838, 262], [870, 274],
  [905, 272], [940, 276], [972, 286], [986, 303], [968, 322], [935, 332], [905, 338], [882, 352], [868, 375], [866, 400],
  [872, 430], [870, 462], [858, 490], [866, 520], [878, 548], [882, 580], [898, 604], [925, 614], [948, 632], [938, 652],
  [948, 684], [962, 714], [955, 745], [930, 764], [944, 790], [938, 822], [916, 850], [898, 880], [886, 912], [866, 938],
  [830, 958], [790, 972], [745, 982], [700, 990], [655, 997], [628, 990], [608, 997], [570, 1001], [530, 1005], [490, 1004],
  [458, 1008], [446, 1024], [432, 1036], [414, 1030], [402, 1014]];
const KOREA = [[1320, 40], [1290, 110], [1260, 200], [1230, 280], [1195, 300], [1155, 262], [1130, 200], [1100, 140], [1088, 95], [1060, 62], [1030, 56]];
const TONKIN = [[388, 1000], [362, 999], [342, 1010], [330, 1030], [338, 1070], [358, 1120], [380, 1200], [400, 1500]];
const coast = [[-1500, -1500], [2000, -1500], [2000, 30], ...catmull([...KOREA, ...COAST_CTRL, ...TONKIN], 3), [-1500, 1500]];
const TW = [[958, 885], [975, 900], [980, 930], [968, 962], [952, 975], [942, 950], [944, 912]];
const HN = Array.from({ length: 9 }, (_, i) => { const a = i / 9 * 6.283; return [+(470 + 42 * Math.cos(a) + 5 * Math.sin(3 * a)).toFixed(1), +(1078 + 28 * Math.sin(a)).toFixed(1)]; });
const islands = [catmull([...TW, TW[0]], 3), catmull([...HN, HN[0]], 3)];
// ---- 게임 지도 범위(불규칙 내륙 경계) ----
const wob = (t, s) => 12 * Math.sin(t * 0.021 + s) + 8 * Math.sin(t * 0.047 + 2.3 * s) + 5 * Math.sin(t * 0.11 + 3.7 * s);
const inner = [];
for (let x = -40; x <= 1060; x += 25) inner.push([x, -30 + wob(x, 1)]);
inner.push([1080, -20], [1080, 1060]);
for (let x = 1060; x >= -40; x -= 25) inner.push([x, 1048 + wob(x, 2)]);
for (let y = 1030; y >= -10; y -= 25) inner.push([-30 + wob(y, 3), y]);
inner.forEach(p => { p[0] = +p[0].toFixed(1); p[1] = +p[1].toFixed(1); });
// ---- 산맥 13조각 ----
const RANGES = [
  { n: '태항산', w: 9, p: [[452, 188], [468, 196], [482, 202]] },
  { n: '태항산', w: 12, p: [[515, 236], [523, 268], [518, 300], [500, 338]] },
  { n: '태항산', w: 8, p: [[466, 362], [448, 370], [428, 376]] },
  { n: '연산', w: 12, p: [[575, 92], [620, 80], [665, 76], [715, 72], [765, 72]] },
  { n: '진령', w: 12, p: [[165, 505], [196, 500], [225, 500]] },
  { n: '진령', w: 10, p: [[308, 526], [328, 522], [344, 521]] },
  { n: '진령', w: 10, p: [[384, 522], [402, 527], [420, 533]] },
  { n: '대파산', w: 12, p: [[222, 603], [252, 606], [284, 610]] },
  { n: '대파산', w: 12, p: [[328, 616], [345, 621], [362, 622]] },
  { n: '곤륜', w: 14, p: [[18, 420], [60, 468], [78, 540], [60, 610], [24, 662]] },
  { n: '기련산', w: 9, p: [[30, 232], [66, 244], [102, 258]] },
  { n: '남령·무이', w: 10, p: [[415, 928], [505, 924], [555, 921], [600, 926], [690, 915], [750, 885], [790, 840], [815, 800]] },
  { n: '형산', w: 10, p: [[490, 833], [502, 848], [512, 866]] },
];
function polyLen(P) { let L = 0; for (let i = 1; i < P.length; i++) L += Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]); return L; }
const ranges = RANGES.map(r => {
  const c = catmull(r.p, 6), n = c.length, L = polyLen(c);
  let acc = 0; const left = [], right = [], ticks = [];
  for (let i = 0; i < n; i++) {
    if (i) acc += Math.hypot(c[i][0] - c[i - 1][0], c[i][1] - c[i - 1][1]);
    const a = c[Math.max(0, i - 1)], b = c[Math.min(n - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], dl = Math.hypot(dx, dy) || 1;
    const nx = -dy / dl, ny = dx / dl, t = acc / L, hw = r.w * Math.max(0.3, Math.pow(Math.sin(Math.PI * t), 0.55));
    left.push([+(c[i][0] + nx * hw).toFixed(1), +(c[i][1] + ny * hw).toFixed(1)]);
    right.push([+(c[i][0] - nx * hw).toFixed(1), +(c[i][1] - ny * hw).toFixed(1)]);
    if (i % 2 === 1 && t > 0.12 && t < 0.88) ticks.push([c[i][0], c[i][1], +(c[i][0] + (nx * 0.8 + dx / dl * 0.5) * hw * 0.8).toFixed(1), +(c[i][1] + (ny * 0.8 + dy / dl * 0.5) * hw * 0.8).toFixed(1)]);
  }
  return { poly: [...left, ...right.reverse()], ridge: c.filter((_, i) => i >= 2 && i <= n - 3), ticks };
});
// ---- 계절 팔레트 (4차: 무주지·영토 아래 땅은 흰색·옅은 회색, 계절감은 바다·띠·지도 밖·산맥·비네트) ----
const SEASONS = {
  newyear: { sea: '#5a4256', band: '#9a7a8e', plain: '#efd2ae', river_land: '#ecc8a0', mount: '#d4a88c', south: '#c4a878', ridge: '#7a4a3a', tint: '#e0503c' },
  spring: { sea: '#41637f', band: '#8fb4cc', plain: '#f0d8dc', river_land: '#d6e8c0', mount: '#cdb8bc', south: '#a8cc94', ridge: '#7a6068', tint: '#f4a0b8' },
  summer: { sea: '#2a6470', band: '#5e9aa4', plain: '#b4d496', river_land: '#a4cc8c', mount: '#a0b484', south: '#8cb474', ridge: '#4a5a38', tint: '#3ea84a' },
  autumn: { sea: '#4c5058', band: '#8a8a8a', plain: '#eec68a', river_land: '#e8be7c', mount: '#cc9a64', south: '#bc9a58', ridge: '#7a4e28', tint: '#e8803a' },
  winter: { sea: '#465f78', band: '#9ab8d2', plain: '#f0f3f6', river_land: '#e2eaf2', mount: '#c8d2dc', south: '#b8c8cc', ridge: '#5c6a7a', tint: '#9cc4ec' },
};
const lin = v => { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
const unlin = v => 255 * (v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(v, 1 / 2.4) - 0.055);
function rgb2lab(c) {
  const [r, g, b] = c.map(lin);
  const X = (0.4124 * r + 0.3576 * g + 0.1805 * b) / 0.95047, Y = 0.2126 * r + 0.7152 * g + 0.0722 * b, Z = (0.0193 * r + 0.1192 * g + 0.9505 * b) / 1.08883;
  const f = t => t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116;
  return [116 * f(Y) - 16, 500 * (f(X) - f(Y)), 200 * (f(Y) - f(Z))];
}
function lab2rgb([L, a, b]) {
  const fy = (L + 16) / 116, fx = fy + a / 500, fz = fy - b / 200;
  const g = t => t ** 3 > 0.008856 ? t ** 3 : (t - 16 / 116) / 7.787;
  const X = g(fx) * 0.95047, Y = g(fy), Z = g(fz) * 1.08883;
  const r = 3.2406 * X - 1.5372 * Y - 0.4986 * Z, gg = -0.9689 * X + 1.8758 * Y + 0.0415 * Z, bb = 0.0557 * X - 0.2040 * Y + 1.0570 * Z;
  return [r, gg, bb].map(v => Math.max(0, Math.min(255, unlin(Math.max(0, v)))));
}
const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
const toHex = a => '#' + a.map(v => Math.round(v).toString(16).padStart(2, '0')).join('');
const mix = (fg, bg, a) => fg.map((v, i) => v * a + bg[i] * (1 - a));
const WHITE_L = { plain: 96, river_land: 94.5, mount: 91, south: 93 }, FREE_CMAX = 3;
function whiten(h, L) { const [, a, b] = rgb2lab(hex(h)), C = Math.hypot(a, b), k = C > FREE_CMAX ? FREE_CMAX / C : 1; return toHex(lab2rgb([L, a * k, b * k])); }
for (const S of Object.values(SEASONS)) {
  const raw = { plain: S.plain, mount: S.mount };
  for (const t of Object.keys(WHITE_L)) S[t] = whiten(S[t], WHITE_L[t]);
  S.range = toHex(mix(hex(S.ridge), hex(raw.mount), 0.42));
  S.offmap = toHex(mix(hex('#b0aeaa'), hex(raw.plain), 0.45));
  S.fog = toHex(mix(hex(S.offmap), hex(S.sea), 0.45));
  S.terr_base = S.plain;
}
const r1 = a => a.map(p => [Math.round(p[0] * 10) / 10, Math.round(p[1] * 10) / 10]);
const MAP_BASE = { coast: r1(coast), islands: islands.map(r1), inner, ranges, seasons: SEASONS };

if (process.argv.includes('--data')) {
  const s = JSON.stringify(MAP_BASE);
  console.log('MAP_BASE', (s.length / 1024).toFixed(1) + 'KB', '해안선 점', coast.length, '섬', islands.map(i => i.length).join('/'), '범위선', inner.length, '산맥', ranges.length);
  process.exit(0);
}
// ---- 블록 삽입 ----
const html = fs.readFileSync(HTML, 'utf8');
const NL = html.includes('\r\n') ? '\r\n' : '\n';
let block = fs.readFileSync(SRC, 'utf8').replace(/\r\n/g, '\n').replace('/*__MAP_BASE__*/null', JSON.stringify(MAP_BASE)).trimEnd();
block = block.split('\n').join(NL);
const B0 = '<!-- v107 S7 UI v1.4', B1 = '<!-- /v107 S7 -->';
let out;
const i0 = html.indexOf(B0);
if (i0 >= 0) {
  const i1 = html.indexOf(B1, i0); if (i1 < 0) throw new Error('끝 표지 없음');
  out = html.slice(0, i0) + block + html.slice(i1 + B1.length);
} else {
  // S5 뿌리 블록(ACT.rootMenu 가 있는 <script>) 바로 뒤에 넣는다
  const a = html.indexOf('ACT.rootMenu = () => openRootMenu();'); if (a < 0) throw new Error('S5 앵커 없음');
  const e = html.indexOf('</script>', a) + '</script>'.length;
  out = html.slice(0, e) + NL + block + html.slice(e);
}
fs.writeFileSync(HTML, out);
const ln = out.slice(0, out.indexOf(B0)).split('\n').length;
console.log('S7 블록', ln, '~', ln + block.split('\n').length - 1, '줄,', (block.length / 1024).toFixed(1) + 'KB');
