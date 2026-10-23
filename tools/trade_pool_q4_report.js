// Q4 이주민 그림자 집계. 사용: node tools/trade_pool_q4_report.js a.json b.json ... (trade_pool_sim.js run 결과, 세트 Q3_A/Q3_B, 72개월)
const fs = require('fs'); const R = process.argv.slice(2).map(f => JSON.parse(fs.readFileSync(f, 'utf8')));
const f1 = (x, n = 1) => Number.isFinite(x) ? x.toFixed(n) : '-';
const med = a => { const b = a.slice().sort((x, y) => x - y); return b.length ? b[Math.floor(b.length / 2)] : NaN; };
for (const scen of [...new Set(R.map(r => r.scen))]) for (const k of ['Q3_A', 'Q3_B']) {
  const rs = R.filter(r => r.scen === scen && r.sets[k] && r.sets[k].imA); if (!rs.length) continue;
  console.log('\n######## 시나리오 ' + scen + ' 규칙 ' + k + ' (시드 ' + rs.map(r => r.seed) + ') ########');
  for (const v of ['V1', 'V2', 'V3']) {
    console.log('--- ' + v + ' ---');
    for (const mo of [12, 36, 60, 72]) {
      const rows = []; rs.forEach(r => (r.sets[k].imA[mo] && r.sets[k].imA[mo][v] || []).forEach(x => rows.push(x)));
      const g = (flag) => { const q = rows.filter(x => x[2] === flag); const sb = q.reduce((s, x) => s + x[0], 0), si = q.reduce((s, x) => s + x[1], 0); return { n: q.length, up: 100 * si / Math.max(1, sb), med: 100 * med(q.map(x => x[1] / Math.max(1, x[0]))), max: 100 * Math.max(...q.map(x => x[1] / Math.max(1, x[0])), 0) }; };
      const a = g(1), b = g(0), all = rows.map(x => x[1] / Math.max(1, x[0]));
      const gl = rs.map(r => r.sets[k].imG[v][mo]); const gb = gl.reduce((s, x) => s + x[0], 0), gi = gl.reduce((s, x) => s + x[1], 0);
      const g12 = rs.map(r => r.sets[k].imG[v][12][0]).reduce((s, x) => s + x, 0);
      console.log('월' + mo + ': 40+ 닿음 ' + a.n + '세력 총인구 +' + f1(a.up) + '% | 못 닿음 ' + b.n + '세력 +' + f1(b.up) + '% | 전체 이주민비율 중앙 ' + f1(100 * med(all)) + '% 최대 ' + f1(100 * Math.max(...all, 0)) + '% | 전 세력 합: 이주민 ' + f1(100 * gi / gb) + '%, 원 인구는 월12 대비 ' + f1(100 * (gb / g12 - 1)) + '%');
    }
    const bk = rs.map(r => r.sets[k].imB[v]); const el = bk.reduce((s, x) => s + x.el, 0), bl = bk.reduce((s, x) => s + x.blk, 0);
    console.log('② 도시 인구 상한에 막힌 도시-달 ' + f1(100 * bl / Math.max(1, el)) + '% (유입 가능 도시-달 ' + el + ')');
  }
  const z = rs.map(r => r.sets[k].imG.Z), s36 = rs.reduce((s, r, i) => s + z[i][36][1], 0);
  const ser = []; for (let mo = 36; mo <= 72; mo += 4) ser.push(mo + ':' + f1(100 * rs.reduce((s, r, i) => s + z[i][mo][1], 0) / s36, 1) + '%');
  console.log('③ 월36 교역도 강제 0, 전 세력 이주민 합 / 월36 값: ' + ser.join(' ') + ' (월36 절대량 ' + s36 + ')');
  let m10 = null, m1 = null; for (let mo = 36; mo <= 72; mo++) { const x = rs.reduce((s, r, i) => s + z[i][mo][1], 0) / s36; if (m10 === null && x < 0.1) m10 = mo - 36; if (m1 === null && x < 0.01) m1 = mo - 36; }
  console.log('③ 10% 아래 ' + (m10 === null ? '72개월까지 미도달' : m10 + '개월 후') + ', 1% 아래 ' + (m1 === null ? '72개월까지 미도달' : m1 + '개월 후'));
}
