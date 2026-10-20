// 두 결과 JSON 비교(params 제외): 성 소유자(end)·원인별 취득(evt)·도시수. 사용: node tools/sim_eq.js a.json b.json
const fs = require('fs'); const L = f => JSON.parse(fs.readFileSync(f, 'utf8'));
const a = L(process.argv[2]), b = L(process.argv[3]); const strip = r => { const { params, ...o } = r; return JSON.stringify(o); };
a.forEach((r, i) => { const x = strip(r), y = strip(b[i]); console.log('판', i + 1, x === y ? '전체 동일' : '다름', 'evt', JSON.stringify(r.evt) === JSON.stringify(b[i].evt) ? '동일' : '다름', 'end', JSON.stringify(r.end) === JSON.stringify(b[i].end) ? '동일' : '다름', 'uni', r.uni, b[i].uni); });
