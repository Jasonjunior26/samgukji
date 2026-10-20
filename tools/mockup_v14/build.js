// v1.4 메인 화면(휴대폰 가로) 정적 목업 빌더.
// 사용: node tools/mockup_v14/build.js   → tools/mockup_v14/mockup.html 생성 + 해안선 검사·WCAG 대비표 출력
// samguk_v105.html 은 읽기만 한다.
const fs = require('fs');
const path = require('path');
const extract = require('./extract');
const D = extract();

// ---------- 세력색: 게임 FCOL(403줄) 그대로, 단 FCOL 20색을 넘는 21~27번째 세력은 게임에서 색이 겹치므로 목업에서만 보충색 ----------
const EXTRA = ['#5ec8b0', '#c070c0', '#d8d040', '#f07848', '#e06898', '#78c858', '#78a8f0'];
D.facs.forEach((f, i) => { f.gameCol = f.col; if (i >= D.FCOL.length) f.col = EXTRA[(i - D.FCOL.length) % EXTRA.length]; });

// ---------- 해안선: 손으로 찍은 조절점 → Catmull-Rom 표본화 ----------
// 시계 방향. 지도 테두리(서·북·남 가장자리)는 땅. 동쪽·남쪽만 해안.
const COAST_CTRL = [
  [1010, 70], [992, 95], [975, 122], [955, 150], [936, 178], [918, 166], [905, 145], [886, 126], [860, 122], [835, 131],
  [812, 140], [790, 148], [772, 164], [760, 190], [758, 215], [770, 238], [790, 250], [812, 256], [838, 262], [870, 274],
  [905, 272], [940, 276], [972, 286], [986, 303], [968, 322], [935, 332], [905, 338], [882, 352], [868, 375], [866, 400],
  [872, 430], [870, 462], [858, 490], [866, 520], [878, 548], [882, 580], [898, 604], [925, 614], [948, 632], [938, 652],
  [948, 684], [962, 714], [955, 745], [930, 764], [944, 790], [938, 822], [916, 850], [898, 880], [886, 912], [866, 938],
  [830, 958], [790, 972], [745, 982], [700, 990], [655, 997], [628, 990], [608, 997], [570, 1001], [530, 1005], [490, 1004],
  [458, 1008], [446, 1024], [432, 1036], [414, 1030], [402, 1014]];
// v2: 지도 밖까지 해안을 이어 붙인다 (한반도, 통킹만→베트남 해안). 지도 안 해안선은 1차와 같다.
const KOREA = [[1320, 40], [1290, 110], [1260, 200], [1230, 280], [1195, 300], [1155, 262], [1130, 200], [1100, 140], [1088, 95], [1060, 62], [1030, 56]];
const TONKIN = [[388, 1000], [362, 999], [342, 1010], [330, 1030], [338, 1070], [358, 1120], [380, 1200], [400, 1500]];
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
const coast = [[-1500, -1500], [2000, -1500], [2000, 30], ...catmull([...KOREA, ...COAST_CTRL, ...TONKIN], 3), [-1500, 1500]];
// 대만·해남(장식용 섬)
const TW = [[958, 885], [975, 900], [980, 930], [968, 962], [952, 975], [942, 950], [944, 912]];
const HN = Array.from({ length: 9 }, (_, i) => { const a = i / 9 * 6.283; return [470 + 42 * Math.cos(a) + 5 * Math.sin(3 * a), 1078 + 28 * Math.sin(a)]; });
const islands = [catmull([...TW, TW[0]], 3), catmull([...HN, HN[0]], 3)];

// ---------- v2: 게임 지도 범위(불규칙한 내륙 경계). 이 밖의 땅은 "지도 밖 땅"으로 옅게 칠한다 ----------
const wob = (t, s) => 12 * Math.sin(t * 0.021 + s) + 8 * Math.sin(t * 0.047 + 2.3 * s) + 5 * Math.sin(t * 0.11 + 3.7 * s);
const inner = [];
for (let x = -40; x <= 1060; x += 25) inner.push([x, -30 + wob(x, 1)]);
inner.push([1080, -20], [1080, 1060]);
for (let x = 1060; x >= -40; x -= 25) inner.push([x, 1048 + wob(x, 2)]);
for (let y = 1030; y >= -10; y -= 25) inner.push([-30 + wob(y, 3), y]);
inner.forEach(p => { p[0] = +p[0].toFixed(1); p[1] = +p[1].toFixed(1); });

// ---------- v2: 주요 산맥 (중심선 + 반폭 w). 관문이 조각 사이 틈에 오게 나눴다 ----------
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
  const ridge = c.filter((_, i) => i >= 2 && i <= n - 3);
  return { n: r.n, poly: [...left, ...right.reverse()], ridge, ticks };
});
// 산맥이 도시를 덮는지 검사 (중심선까지 거리 < 반폭+8 이면 경고)
{
  const bad = [];
  for (const r of RANGES) for (const ct of D.cities) { let m = 1e9; for (let i = 0; i < r.p.length - 1; i++) m = Math.min(m, segDistF(ct.x, ct.y, r.p[i], r.p[i + 1])); if (m < r.w + 8) bad.push(`${r.n}~${ct.n}(${m.toFixed(0)})`); }
  console.log('산맥이 덮는 도시:', bad.join(' ') || '없음');
}
function segDistF(px, py, [ax, ay], [bx, by]) { const dx = bx - ax, dy = by - ay; let t = ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy || 1); t = Math.max(0, Math.min(1, t)); return Math.hypot(px - ax - t * dx, py - ay - t * dy); }

function inPoly(x, y, P) { let c = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) { const [xi, yi] = P[i], [xj, yj] = P[j]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c; } return c; }
function segDist(px, py, [ax, ay], [bx, by]) { const dx = bx - ax, dy = by - ay; let t = ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy || 1); t = Math.max(0, Math.min(1, t)); return Math.hypot(px - ax - t * dx, py - ay - t * dy); }
function coastDist(x, y) { let m = 1e9; for (let i = 2; i < coast.length - 2; i++) m = Math.min(m, segDist(x, y, coast[i], coast[i + 1])); return m; }

console.log(`해안선 점 ${coast.length}개 (섬 ${islands[0].length}개)`);
const outside = D.cities.filter(c => !inPoly(c.x, c.y, coast));
console.log('해안선 밖 도시:', outside.length ? outside.map(c => c.n).join(',') : '없음');
const COASTAL = ['양평', '북평', '남피', '낙안', '북해', '동래', '낭야', '동해', '광릉', '오', '회계', '건안', '남해', '합포', '교지'];
console.log('해안 도시→해안 거리:', COASTAL.map(n => { const c = D.cities.find(q => q.n === n); return n + Math.round(coastDist(c.x, c.y)); }).join(' '));
const near = D.cities.filter(c => coastDist(c.x, c.y) < 14).map(c => c.n);
console.log('해안에 너무 붙은(<14) 도시:', near.join(',') || '없음');

// ---------- 계절 팔레트 (지도에만 반영) ----------
const SEASONS = {
  newyear: { ko: '설', mon: 1, sea: '#5a4256', band: '#9a7a8e', plain: '#efd2ae', river_land: '#ecc8a0', mount: '#d4a88c', south: '#c4a878', ridge: '#7a4a3a', tint: '#e0503c' },
  spring:  { ko: '봄', mon: 3, sea: '#41637f', band: '#8fb4cc', plain: '#f0d8dc', river_land: '#d6e8c0', mount: '#cdb8bc', south: '#a8cc94', ridge: '#7a6068', tint: '#f4a0b8' },
  summer:  { ko: '여름', mon: 6, sea: '#2a6470', band: '#5e9aa4', plain: '#b4d496', river_land: '#a4cc8c', mount: '#a0b484', south: '#8cb474', ridge: '#4a5a38', tint: '#3ea84a' },
  autumn:  { ko: '가을', mon: 9, sea: '#4c5058', band: '#8a8a8a', plain: '#eec68a', river_land: '#e8be7c', mount: '#cc9a64', south: '#bc9a58', ridge: '#7a4e28', tint: '#e8803a' },
  winter:  { ko: '겨울', mon: 12, sea: '#465f78', band: '#9ab8d2', plain: '#f0f3f6', river_land: '#e2eaf2', mount: '#c8d2dc', south: '#b8c8cc', ridge: '#5c6a7a', tint: '#9cc4ec' },
};
// 계절과 무관한 고정색
const FIX = {
  ui_bg: '#0f1428', ui_panel: '#151c38', ui_card: '#1c2547', ui_line: '#2c3866', ui_text: '#ece8dc', ui_muted: '#aab2cf', gold: '#ffd75e', gold2: '#c9a24a', btn_text: '#1a1305',
  label_bg: [12, 16, 32, 0.84], label_text: '#ffffff',
  river: '#0e2c4e', road: '#2e2a24', water: '#7cc8ff', water_case: '#0d2a48', sel_road: '#ffd75e', sel_case: '#1a1404', border: '#1c1a2a',
  icon_outer: '#0b0f1e', icon_inner: '#ffffff', terr_alpha: 0.35,
  free_fill: '#a7acb6', free_outer: '#1f232b', free_alpha: 0.92,
};
// v3: 영토 칠을 진하게. 세력색을 지도용으로 깊게(명도 상한·채도 증폭) 바꾼 tcol 을, 계절 틴트를 크게 줄인 중립 땅(terr_base) 위에 TERR_A 로 칠한다.
const EV = (k, d) => process.env[k] !== undefined ? +process.env[k] : d;
const TERR_A = EV('TA', 0.64);         // 세력색 불투명도
const BASE_A = EV('BA', 0.97);        // 영토 아래 중립 땅의 불투명도(지형 셀 색이 조금 비치게)
const NEUTRAL = '#e9e5dc';            // 중립 밝은 땅
const BASE_SEASON = EV('BS', 0.22);   // 중립 땅에 남기는 계절 땅색 비율
const T_LMAX = EV('TL', 45), T_CK = EV('TC', 1.7);   // 지도용 세력색 명도 상한·채도 배율
const FREE_LMIN = EV('FL', 89), FREE_CMAX = EV('FC', 3); // 무주지 땅: 명도 하한·채도 상한 (계절 색상은 유지)
FIX.terr_alpha = TERR_A; FIX.base_alpha = BASE_A;

// ---------- 색 공간: sRGB → Lab, CIEDE2000 ----------
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
function de2000(c1, c2) {
  const [L1, a1, b1] = rgb2lab(c1), [L2, a2, b2] = rgb2lab(c2);
  const rad = Math.PI / 180, C1 = Math.hypot(a1, b1), C2 = Math.hypot(a2, b2), Cb = (C1 + C2) / 2;
  const G = 0.5 * (1 - Math.sqrt(Cb ** 7 / (Cb ** 7 + 25 ** 7)));
  const ap1 = (1 + G) * a1, ap2 = (1 + G) * a2, Cp1 = Math.hypot(ap1, b1), Cp2 = Math.hypot(ap2, b2);
  const hp = (b, a) => { if (!a && !b) return 0; const h = Math.atan2(b, a) / rad; return h < 0 ? h + 360 : h; };
  const h1 = hp(b1, ap1), h2 = hp(b2, ap2), dL = L2 - L1, dC = Cp2 - Cp1;
  let dh = 0; if (Cp1 * Cp2) { dh = h2 - h1; if (dh > 180) dh -= 360; else if (dh < -180) dh += 360; }
  const dH = 2 * Math.sqrt(Cp1 * Cp2) * Math.sin(dh / 2 * rad), Lb = (L1 + L2) / 2, Cpb = (Cp1 + Cp2) / 2;
  let hb = h1 + h2; if (Cp1 * Cp2) { if (Math.abs(h1 - h2) > 180) hb += h1 + h2 < 360 ? 360 : -360; hb /= 2; }
  const T = 1 - 0.17 * Math.cos((hb - 30) * rad) + 0.24 * Math.cos(2 * hb * rad) + 0.32 * Math.cos((3 * hb + 6) * rad) - 0.2 * Math.cos((4 * hb - 63) * rad);
  const dTh = 30 * Math.exp(-(((hb - 275) / 25) ** 2)), RC = 2 * Math.sqrt(Cpb ** 7 / (Cpb ** 7 + 25 ** 7));
  const SL = 1 + 0.015 * (Lb - 50) ** 2 / Math.sqrt(20 + (Lb - 50) ** 2), SC = 1 + 0.045 * Cpb, SH = 1 + 0.015 * Cpb * T, RT = -Math.sin(2 * dTh * rad) * RC;
  return Math.sqrt((dL / SL) ** 2 + (dC / SC) ** 2 + (dH / SH) ** 2 + RT * (dC / SC) * (dH / SH));
}
// 지도 영토용 세력색: 명도 상한 T_LMAX, 채도 ×T_CK (최소 채도 보장은 하지 않는다 — 흰 세력은 회색이 된다)
function deepen(h) { const [L, a, b] = rgb2lab(hex(h)); return toHex(lab2rgb([Math.min(L, T_LMAX), a * T_CK, b * T_CK])); }
// 무주지 땅: 색상(hue)은 계절 그대로, 명도는 하한까지 올리고 채도는 상한으로 자른다 → 진한 영토와 명도·채도로 갈린다
function lift(h) { const [L, a, b] = rgb2lab(hex(h)), C = Math.hypot(a, b), k = C > FREE_CMAX ? FREE_CMAX / C : 1; return toHex(lab2rgb([Math.max(L, FREE_LMIN), a * k, b * k])); }

// ---------- WCAG 대비 ----------
const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
const toHex = a => '#' + a.map(v => Math.round(v).toString(16).padStart(2, '0')).join('');
const mix = (fg, bg, a) => fg.map((v, i) => v * a + bg[i] * (1 - a));
const lum = c => { const [r, g, b] = c.map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const cr = (a, b) => { const la = lum(a), lb = lum(b); return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05); };
const LAND_T = ['plain', 'river_land', 'mount', 'south'];
// ---------- v4: 세력색 점검·대체 ----------
// 규칙: 영토색에 회색·흰색 불허. 원래 색의 Lab 채도 < ICON_CMIN 이면 아이콘·영토 모두 유채색으로 대체.
//       지도용 세력색(tcol)은 채도 ≥ MAP_CMIN. 이웃 세력끼리 tcol CIEDE2000 ≥ NB_DE 가 안 되면 뒤쪽(번호 큰) 세력을 대체.
const ICON_CMIN = 30, MAP_CMIN = 35, NB_DE = 15, KEEP = new Set(['조조']);
const chroma = h => { const [, a, b] = rgb2lab(hex(h)); return Math.hypot(a, b); };
function mapCol(h) { // 명도 상한 T_LMAX, 채도 ×T_CK, 채도 하한 MAP_CMIN(색상 유지)
  const [L, a, b] = rgb2lab(hex(h)), C = Math.hypot(a, b) || 1;
  let C2 = Math.max(C * T_CK, MAP_CMIN), L2 = Math.min(L, T_LMAX), out;
  for (let k = 0; k < 12; k++) { out = toHex(lab2rgb([L2, a / C * C2, b / C * C2])); if (chroma(out) >= MAP_CMIN) break; C2 += 6; if (k > 5) L2 += 2; } // 색역 밖으로 잘려 채도가 모자라면 더 밀어 준다
  return out;
}
// 이웃 세력: 도시 인접 목록 + 도로로 이어진 도시의 주인이 다른 경우
const NB = {}; D.facs.forEach(f => NB[f.r] = new Set());
{ const own = {}; D.cities.forEach(c => own[c.n] = c.own);
  const link = (x, y) => { const a = own[x], b = own[y]; if (a && b && a !== b) { NB[a].add(b); NB[b].add(a); } };
  D.cities.forEach(c => (c.adj || []).forEach(o => link(c.n, typeof o === 'string' ? o : o.이름 || o.n)));
  D.roads.forEach(r => link(r.a, r.b)); }
D.facs.forEach(f => { f.orig = f.col; f.tcol = mapCol(f.col); });
const facBy = Object.fromEntries(D.facs.map(f => [f.r, f]));
function pickHue(f) { // 후보: 색상 4° 간격 × 지도용 명도 38/45 × 채도 45/60. 이웃 최소 ΔE 와 전체 최소 ΔE 를 함께 최대화. 아이콘 색은 같은 색상의 밝은 판(L72)
  let best = null;
  for (const [TL, TC] of [[45, 50], [38, 50], [45, 62], [38, 62]]) for (let h = 0; h < 360; h += 4) {
    const r = h * Math.PI / 180, t = toHex(lab2rgb([TL, TC * Math.cos(r), TC * Math.sin(r)]));
    if (chroma(t) < MAP_CMIN + 5) continue;
    let nb = 1e9, all = 1e9;
    for (const g of D.facs) { if (g === f) continue; const d = de2000(hex(t), hex(g.tcol)); all = Math.min(all, d); if (NB[f.r].has(g.r)) nb = Math.min(nb, d); }
    const sc = Math.min(nb, 40) + 1.2 * Math.min(all, 30);
    if (!best || sc > best.sc) best = { sc, t, icon: toHex(lab2rgb([72, 52 * Math.cos(r), 52 * Math.sin(r)])) };
  }
  return best;
}
const replaced = [];
const replace = (f, why) => { const b = pickHue(f); replaced.push({ r: f.r, why, from: f.col, to: b.icon, tcol: b.t }); f.col = b.icon; f.tcol = b.t; };
for (const f of D.facs) if (chroma(f.col) < ICON_CMIN) replace(f, `채도 ${chroma(f.col).toFixed(0)}`);
for (const f of D.facs) if (!replaced.some(x => x.r === f.r) && chroma(f.tcol) < MAP_CMIN) replace(f, `지도용 채도 ${chroma(f.tcol).toFixed(0)}`);
for (let pass = 0; pass < 4; pass++) {
  let bad = null;
  D.facs.forEach((f, i) => NB[f.r].forEach(n => { const g = facBy[n], j = D.facs.indexOf(g); if (j < i) return; const d = de2000(hex(f.tcol), hex(g.tcol)); if (d < NB_DE && (!bad || d < bad.d)) bad = { f, g, d }; }));
  if (!bad) break;
  const v = KEEP.has(bad.g.r) ? bad.f : bad.g;
  replace(v, `이웃 ${(v === bad.g ? bad.f : bad.g).r}와 ΔE ${bad.d.toFixed(1)}`);
}
// 이웃이 아니어도 거의 같은 색(ΔE < ALL_DE)은 번호 큰 쪽을 대체 (21번째 이후 세력은 게임 FCOL 이 겹쳐 목업 보충색을 쓰는 중)
const ALL_DE = 8, done = new Set();
for (let pass = 0; pass < 10; pass++) {
  let bad = null;
  D.facs.forEach((f, i) => D.facs.forEach((g, j) => { if (j <= i || j < D.FCOL.length || done.has(g.r)) return; const d = de2000(hex(f.tcol), hex(g.tcol)); if (d < ALL_DE && (!bad || d < bad.d)) bad = { f, g, d }; }));
  if (!bad) break;
  const v = bad.g; done.add(v.r); // 게임 FCOL 원색(1~20번째)은 채도·이웃 규칙에 걸릴 때만 바꾼다
  replace(v, `${(v === bad.g ? bad.f : bad.g).r}와 거의 같은 색 ΔE ${bad.d.toFixed(1)}`);
}
// 세력색 검사표
let nbMin = { d: 1e9 }, allMin = { d: 1e9 };
D.facs.forEach((f, i) => D.facs.forEach((g, j) => { if (j <= i) return; const d = de2000(hex(f.tcol), hex(g.tcol)); if (d < allMin.d) allMin = { d, a: f.r, b: g.r }; if (NB[f.r].has(g.r) && d < nbMin.d) nbMin = { d, a: f.r, b: g.r }; }));
const tcMin = D.facs.reduce((m, f) => chroma(f.tcol) < m.c ? { c: chroma(f.tcol), r: f.r } : m, { c: 1e9 });
let facTbl = `\n## 세력색 (v4: 회색·흰색 불허)\n\n규칙: 원래 색 Lab 채도 < ${ICON_CMIN} → 대체, 지도용 색 채도 ≥ ${MAP_CMIN}, 이웃 세력 지도용 색 ΔE00 ≥ ${NB_DE} 목표.\n\n| 세력 | 이유 | 원래 색 | 새 아이콘 색 | 지도용 색 |\n|---|---|---|---|---|\n`;
const fin = {}; for (const x of replaced) { if (fin[x.r]) { fin[x.r].why += ' → ' + x.why; fin[x.r].to = x.to; fin[x.r].tcol = x.tcol; } else fin[x.r] = { ...x, from: facBy[x.r].orig }; }
for (const x of Object.values(fin)) facTbl +=`| ${x.r} | ${x.why} | ${x.from} | ${x.to} | ${x.tcol} |\n`;
facTbl += `\n지도용 색 최소 채도: ${tcMin.c.toFixed(1)} (${tcMin.r}) · 이웃 세력 최소 ΔE00: ${nbMin.d.toFixed(1)} (${nbMin.a}–${nbMin.b}) · 전체 세력 쌍 최소 ΔE00: ${allMin.d.toFixed(1)} (${allMin.a}–${allMin.b})\n`;
console.log(facTbl);
// 영토 칠 결과색: 지형 땅 L 위에 중립 땅(BASE_A) → 세력 tcol(TERR_A). 산맥 면은 중립 땅 아래라 영토 안에서는 거의 안 보인다.
const terrOver = (f, L, S) => mix(hex(f.tcol), mix(hex(S.terr_base), L, BASE_A), TERR_A);
function landSet(S) { // 무주지 땅 4종 + 산맥 면 + 모든 세력 영토 결과색
  const out = [];
  for (const t of [...LAND_T, 'range']) { const L = hex(S[t]); out.push(L); for (const f of D.facs) out.push(terrOver(f, L, S)); }
  return out;
}
// v4: 무주지 땅은 흰색·옅은 회색. 계절 색상은 채도 FREE_CMAX 이하로만 남긴다. 영토 아래 중립 땅도 같은 흰색.
const WHITE_L = { plain: 96, river_land: 94.5, mount: 91, south: 93 };
function whiten(h, L) { const [, a, b] = rgb2lab(hex(h)), C = Math.hypot(a, b), k = C > FREE_CMAX ? FREE_CMAX / C : 1; return toHex(lab2rgb([L, a * k, b * k])); }
for (const S of Object.values(SEASONS)) {
  S.raw = { plain: S.plain, mount: S.mount };
  for (const t of LAND_T) S[t] = whiten(S[t], WHITE_L[t]);
  S.range = toHex(mix(hex(S.ridge), hex(S.raw.mount), 0.42));
  S.offmap = toHex(mix(hex('#b0aeaa'), hex(S.raw.plain), 0.45));
  S.fog = toHex(mix(hex(S.offmap), hex(S.sea), 0.45));
  S.terr_base = S.plain;
}
// v3: 세력 영토 vs 무주지 땅 색차 (CIEDE2000). 영토 아래 지형 4종 × 무주지 지형 4종 중 최소
const deRows = [];
for (const [k, S] of Object.entries(SEASONS)) {
  let worst = { de: 1e9 }; const perFac = [];
  for (const f of D.facs) {
    let m = { de: 1e9 };
    for (const tu of LAND_T) for (const tf of LAND_T) { const d = de2000(terrOver(f, hex(S[tu]), S), hex(S[tf])); if (d < m.de) m = { de: d, tu, tf }; }
    perFac.push([f.r, m.de]); if (m.de < worst.de) worst = { ...m, f: f.r };
  }
  perFac.sort((a, b) => a[1] - b[1]);
  deRows.push({ ko: S.ko, worst, low: perFac.slice(0, 4) });
}
const minOver = (set, fn) => set.reduce((m, x) => Math.min(m, fn(x)), 1e9);
const rows = [];
let worst = { text: 1e9, line: 1e9 };
for (const [k, S] of Object.entries(SEASONS)) {
  const lands = landSet(S);
  const [lr, lg, lb, la] = FIX.label_bg;
  const r = {
    계절: S.ko,
    '이름표 글자/바탕': minOver(lands, L => cr(hex(FIX.label_text), mix([lr, lg, lb], L, la))),
    '선택이름표 금/바탕': minOver(lands, L => cr(hex(FIX.gold), mix([lr, lg, lb], L, la))),
    '패널 글자': cr(hex(FIX.ui_text), hex(FIX.ui_panel)),
    '패널 흐린글자': Math.min(cr(hex(FIX.ui_muted), hex(FIX.ui_panel)), cr(hex(FIX.ui_muted), hex(FIX.ui_card))),
    '끝내기 단추': cr(hex(FIX.btn_text), hex(FIX.gold2)),
    '강/땅': minOver(lands, L => cr(hex(FIX.river), L)),
    '육로/땅': minOver(lands, L => cr(hex(FIX.road), L)),
    '수로 테/땅': minOver(lands, L => cr(hex(FIX.water_case), L)),
    '수로 하늘/테': cr(hex(FIX.water), hex(FIX.water_case)),
    '수로 하늘/바다': cr(hex(FIX.water), hex(S.sea)),
    '선택길 테/땅': minOver(lands, L => cr(hex(FIX.sel_case), L)),
    '선택길 노랑/테': cr(hex(FIX.sel_road), hex(FIX.sel_case)),
    '세력경계/땅': minOver(lands, L => cr(hex(FIX.border), L)),
    '아이콘 바깥테/땅': minOver(lands, L => cr(hex(FIX.icon_outer), L)),
    '무주아이콘 테/땅': minOver(lands, L => cr(mix(hex(FIX.free_outer), L, FIX.free_alpha), L)),
    '땅/바다': cr(hex(S.plain), hex(S.sea)),
  };
  rows.push(r);
}
const TEXT_KEYS = ['이름표 글자/바탕', '선택이름표 금/바탕', '패널 글자', '패널 흐린글자', '끝내기 단추'];
const cols = Object.keys(rows[0]);
let tbl = '| ' + cols.join(' | ') + ' |\n|' + cols.map(() => '---').join('|') + '|\n';
for (const r of rows) tbl += '| ' + cols.map(c => typeof r[c] === 'number' ? r[c].toFixed(2) + (r[c] < (TEXT_KEYS.includes(c) ? 4.5 : 3) ? '✗' : '') : r[c]).join(' | ') + ' |\n';
const fails = [];
for (const r of rows) for (const c of cols) if (typeof r[c] === 'number' && r[c] < (TEXT_KEYS.includes(c) ? 4.5 : 3)) fails.push(r.계절 + ':' + c + '=' + r[c].toFixed(2));
console.log('\nWCAG 대비 (글자 4.5↑, 선·아이콘 3↑)\n' + tbl);
console.log('미달:', fails.length ? fails.join(', ') : '없음');
let deTbl = `\n## 세력 영토 vs 무주지 땅 색차 (CIEDE2000, 목표 ≥ 20)\n\n영토 = 지형 땅 → 중립 흰 땅(무주지 평지와 같은 색, 불투명 ${BASE_A}) → 지도용 세력색(명도≤${T_LMAX}, 채도×${T_CK}, 불투명 ${TERR_A}); 무주지 땅은 흰색·옅은 회색(명도 91~96, 채도≤${FREE_CMAX}). 영토 아래 지형 4종 × 무주지 지형 4종 중 최소.\n\n| 계절 | 최소 ΔE00 | 최소 세력(영토 아래→무주지 지형) | 낮은 4세력 |\n|---|---|---|---|\n`;
for (const r of deRows) deTbl += `| ${r.ko} | ${r.worst.de.toFixed(1)}${r.worst.de < 20 ? '✗' : ''} | ${r.worst.f} (${r.worst.tu}→${r.worst.tf}) | ${r.low.map(([n, d]) => n + ' ' + d.toFixed(1)).join(', ')} |\n`;
const des = deRows.map(r => r.worst.de);
deTbl += `\n계절 간 최소 ΔE 범위: ${Math.min(...des).toFixed(1)} ~ ${Math.max(...des).toFixed(1)} (차 ${(Math.max(...des) - Math.min(...des)).toFixed(1)})\n`;
console.log(deTbl);
fs.writeFileSync(path.join(__dirname, 'contrast.md'), '# v1.4 목업 대비 검사 (build.js 자동 생성)\n\n' + tbl + '\n미달: ' + (fails.join(', ') || '없음') + '\n' + deTbl + facTbl);

// ---------- 내보내기 ----------
const DATA = {
  cities: D.cities.map(({ n, ju, g, x, y, own, t, k }) => ({ n, ju, g, x, y, own, t, k })),
  roads: D.roads, facs: D.facs.map(({ r, home, col, tcol }) => ({ r, home, col, tcol })), rivers: D.rivers,
  coast, islands, inner, ranges, seasons: SEASONS, fix: { ...FIX, label_bg: `rgba(${FIX.label_bg.join(',')})` },
};
const tpl = fs.readFileSync(path.join(__dirname, 'template.html'), 'utf8');
const out = tpl.replace('/*__DATA__*/null', JSON.stringify(DATA));
fs.writeFileSync(path.join(__dirname, 'mockup.html'), out);
console.log('\n→ mockup.html', (out.length / 1024).toFixed(1) + 'KB');
