// 장수 전용 그림을 없앤 뒤(uniq 무시) 병과 × 단계 × 색 모든 조합이 아틀라스 행을 갖는지 확인한다.
// v107: 외국 병종(JOJO_UNITS.foreign, rows 키 'f'+행) 5종 × 3색도 확인한다.
// 사용: node tools/jojo_index_check.js
const fs = require('fs');
const h = fs.readFileSync(__dirname + '/../samguk_v108.html', 'utf8');
const i = h.indexOf('<script id="jojo-units">'), j = h.indexOf('</script>', i);
const J = new Function(h.slice(i + 24, j) + ';return JOJO_UNITS;')();
const CLS = ['보병', '방진', '기병', '궁병', '궁기병', '산악병', '공성', '책사', '수군'];
let bad = 0, n = 0;
for (const cls of CLS) for (let tier = 0; tier <= 2; tier++) for (let col = 0; col <= 2; col++) {
  const base = J.generic[cls] ?? 0, t = cls === '방진' ? Math.min(2, tier + 1) : tier;
  const idx = J.noTier.includes(base) ? base + col : base + 3 * t + col; n++;
  if (J.rows[String(idx)] == null) { bad++; console.log('행 없음', cls, 'tier', tier, 'col', col, 'idx', idx); }
}
console.log(`조합 ${n}개 중 행 없음 ${bad}개 · 전용 그림 ${Object.keys(J.uniq).length}명(제거 대상)`);
// 외국 병종: 게임 jojoIndex 가 'f' + (foreign[이름] + 색) 을 돌려주므로 그 키가 rows 에 있어야 한다
const F = J.foreign || {}; const FN = ['후사르', '맥궁병', '사무라이', '원탁기사', '총사']; let fbad = 0, fn = 0;
const nrow = Math.max(...Object.values(J.rows)) + 1;
for (const name of FN) {
  if (F[name] == null) { fbad++; console.log('foreign 없음', name); continue; }
  for (let col = 0; col <= 2; col++) { const k = 'f' + (F[name] + col); fn++; const r = J.rows[k]; if (r == null || r >= nrow) { fbad++; console.log('행 없음', name, 'col', col, 'key', k); } }
}
console.log(`외국 병종 ${FN.length}종 등록 ${Object.keys(F).length}종 · 조합 ${fn}개 중 행 없음 ${fbad}개 · 아틀라스 행 ${nrow}` + (Object.keys(F).length ? ` · 첫 행 ${JSON.stringify(F)}` : ' (foreign 없음 — jojo_assets.py --foreign 으로 넣음)'));
if (bad || fbad) process.exitCode = 1;
