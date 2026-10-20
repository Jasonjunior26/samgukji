// 장수 전용 그림을 없앤 뒤(uniq 무시) 병과 × 단계 × 색 모든 조합이 아틀라스 행을 갖는지 확인한다.
// 사용: node tools/jojo_index_check.js
const fs = require('fs');
const h = fs.readFileSync(__dirname + '/../samguk_v107.html', 'utf8');
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
