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
  [458, 1007], [446, 1020]];
const TONKIN = [[398, 1020], [400, 1006], [382, 999], [355, 1000], [338, 1010], [332, 1020]];
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
const coast = [[-10, -10], [1010, -10], ...catmull(COAST_CTRL, 3), ...catmull(TONKIN, 2), [-10, 1020]];
// 대만(장식용 섬)
const TW = [[958, 885], [975, 900], [980, 930], [968, 962], [952, 975], [942, 950], [944, 912]];
const islands = [catmull([...TW, TW[0]], 3)];

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
  newyear: { ko: '설', mon: 1, sea: '#4b5470', band: '#7d86a3', plain: '#e6d6c3', river_land: '#dcd6bd', mount: '#c8b2a2', south: '#a9ad8a', ridge: '#7a5f52', tint: '#d9776a' },
  spring:  { ko: '봄', mon: 3, sea: '#46627a', band: '#7b97ad', plain: '#e3d8c8', river_land: '#d6dcc0', mount: '#c3b5a8', south: '#9db58f', ridge: '#76675c', tint: '#f0a8b8' },
  summer:  { ko: '여름', mon: 6, sea: '#3a6276', band: '#6e98aa', plain: '#d2dbb4', river_land: '#c3d6ae', mount: '#adb291', south: '#93b083', ridge: '#5e6448', tint: '#6fbf6a' },
  autumn:  { ko: '가을', mon: 9, sea: '#475d6b', band: '#7a909c', plain: '#e2d2a8', river_land: '#d8d2a6', mount: '#c2a882', south: '#a5a274', ridge: '#7a6040', tint: '#d9a04a' },
  winter:  { ko: '겨울', mon: 12, sea: '#4f5f6d', band: '#8394a2', plain: '#e8e9e8', river_land: '#dfe3e3', mount: '#c6cacd', south: '#adbaae', ridge: '#6c737a', tint: '#cfe0ee' },
};
// 계절과 무관한 고정색
const FIX = {
  ui_bg: '#0f1428', ui_panel: '#151c38', ui_card: '#1c2547', ui_line: '#2c3866', ui_text: '#ece8dc', ui_muted: '#aab2cf', gold: '#ffd75e', gold2: '#c9a24a', btn_text: '#1a1305',
  label_bg: [12, 16, 32, 0.84], label_text: '#ffffff',
  river: '#163a63', road: '#2e2a24', water: '#7cc8ff', water_case: '#0d2a48', sel_road: '#ffd75e', sel_case: '#1a1404', border: '#1c1a2a',
  icon_outer: '#0b0f1e', icon_inner: '#ffffff', terr_alpha: 0.35,
};

// ---------- WCAG 대비 ----------
const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
const toHex = a => '#' + a.map(v => Math.round(v).toString(16).padStart(2, '0')).join('');
const mix = (fg, bg, a) => fg.map((v, i) => v * a + bg[i] * (1 - a));
const lum = c => { const [r, g, b] = c.map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const cr = (a, b) => { const la = lum(a), lb = lum(b); return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05); };
function landSet(S) { // 땅 4종 × (무주지 + 세력색 0.35)
  const out = [];
  for (const t of ['plain', 'river_land', 'mount', 'south']) { const L = hex(S[t]); out.push(L); for (const f of D.facs) out.push(mix(hex(f.col), L, FIX.terr_alpha)); }
  return out;
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
fs.writeFileSync(path.join(__dirname, 'contrast.md'), '# v1.4 목업 대비 검사 (build.js 자동 생성)\n\n' + tbl + '\n미달: ' + (fails.join(', ') || '없음') + '\n');

// ---------- 내보내기 ----------
const DATA = {
  cities: D.cities.map(({ n, ju, g, x, y, own, t, k }) => ({ n, ju, g, x, y, own, t, k })),
  roads: D.roads, facs: D.facs.map(({ r, home, col }) => ({ r, home, col })), rivers: D.rivers,
  coast, islands, seasons: SEASONS, fix: { ...FIX, label_bg: `rgba(${FIX.label_bg.join(',')})` },
};
const tpl = fs.readFileSync(path.join(__dirname, 'template.html'), 'utf8');
const out = tpl.replace('/*__DATA__*/null', JSON.stringify(DATA));
fs.writeFileSync(path.join(__dirname, 'mockup.html'), out);
console.log('\n→ mockup.html', (out.length / 1024).toFixed(1) + 'KB');
