// 장치 짝지은 보고 (통합_시뮬레이션 §4-0000000). 사용: node tools/dev_report.js 라벨=파일1,파일2 라벨2=...
const fs = require('fs');
const mean = a => a.reduce((s, x) => s + x, 0) / Math.max(1, a.length);
const f1 = (x, n = 1) => Number.isFinite(x) ? x.toFixed(n) : '-';
const OWNM = { 강병: ['전투'], 경륜: ['귀순'], 상략: ['매수', '매입', '할양', '항복'], 덕화: ['투항'] };
const ROOTS = ['경륜', '강병', '상략', '덕화'];
for (const arg of process.argv.slice(2)) {
  const [label, fl] = arg.split('='); const R = [];
  fl.split(',').forEach(f => JSON.parse(fs.readFileSync(f, 'utf8')).forEach(r => R.push(r)));
  const rows = [];
  R.forEach(r => Object.keys(r.st).forEach(f => { const s = r.st[f], a = r.start[f]; if (!a || a.cities <= 0) return; const b = r.end[f]; const acq = s.acq || {};
    rows.push({ f, root: s.root, acq, nacq: Object.values(acq).reduce((x, y) => x + y, 0), c0: a.cities, c1: b.cities, alive: b.alive && b.cities > 0 }); }));
  const evt = {}; R.forEach(r => Object.entries(r.evt || {}).forEach(([k, v]) => evt[k] = (evt[k] || 0) + v));
  const dv = {}; R.forEach(r => Object.entries(r.dv || {}).forEach(([k, v]) => dv[k] = (dv[k] || 0) + v));
  console.log('\n== ' + label + ' (판 ' + R.length + ', 세력-판 ' + rows.length + ') ==');
  console.log('12년 도시 수(세력 평균) ' + f1(mean(rows.map(x => x.c1)), 2) + ' / 시작 ' + f1(mean(rows.map(x => x.c0)), 2) + ' / 생존율 ' + f1(100 * mean(rows.map(x => x.alive ? 1 : 0))) + '%');
  console.log('뿌리 | n | 자기방법 비율(취득 중) | 도시 증감 | 생존%');
  ROOTS.forEach(rt => { const a = rows.filter(x => x.root === rt); const own = a.reduce((s, x) => s + OWNM[rt].reduce((u, k) => u + (x.acq[k] || 0), 0), 0), all = a.reduce((s, x) => s + x.nacq, 0);
    console.log('  ' + rt + ' | ' + a.length + ' | ' + f1(100 * own / Math.max(1, all)) + '% (' + own + '/' + all + ') | ' + f1(mean(a.map(x => x.c1 - x.c0)), 2) + ' | ' + f1(100 * mean(a.map(x => x.alive ? 1 : 0)), 0)); });
  console.log('원인 합계: ' + Object.entries(evt).sort((a, b) => b[1] - a[1]).map(([k, v]) => k + v).join(' '));
  const pick = ['guisun', 'tuhang', 'idanTry', 'idanOk', 'maesuTgt', 'maesuPriceOk', 'maesuTry', 'maesuOk', 'mercAI', 'swayAct'];
  console.log('장치: ' + pick.map(k => k + '=' + (dv[k] || 0)).join(' '));
}
