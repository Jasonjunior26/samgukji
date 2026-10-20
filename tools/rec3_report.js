// rec3 보고: 통합_시뮬레이션 §4-00000 지표. 사용: node tools/rec3_report.js 라벨=파일1,파일2 라벨2=파일...
// 지표: 자기 방법 비율, 도시 수·생존율(뿌리별), 금 사용처 비중, 덕화 인구·영입·군량, 도산 비율, 고가품 이익
const fs = require('fs');
const mean = a => a.reduce((s, x) => s + x, 0) / Math.max(1, a.length);
const med = a => { const b = a.slice().sort((x, y) => x - y); return b.length ? b[Math.floor(b.length / 2)] : NaN; };
const f1 = (x, n = 1) => Number.isFinite(x) ? x.toFixed(n) : '-';
const OWN = { 경륜: ['인물', '연수'], 강병: ['물자'], 상략: ['차익', '용병'], 덕화: ['민생', '군비화'] };
const ALLX = [].concat(...Object.values(OWN), ['친교', '학습', '고가품']); // 자기 방법 비율 = 뿌리 고유 행동 / (고유 + 친교·학습·고가품) 횟수
const TRADE = ['친교', '학습', '인물', '연수', '차익', '민생'];
const ROOTS = ['경륜', '강병', '상략', '덕화'];
for (const arg of process.argv.slice(2)) {
  const [label, fl] = arg.split('='); const rows = [];
  fl.split(',').forEach(file => JSON.parse(fs.readFileSync(file, 'utf8')).forEach(r => r.fids.forEach(f => {
    if (r.start[f].cities === 0 || !r.st[f]) return; const s = r.st[f], a = r.start[f], b = r.end[f];
    rows.push({ f, scen: r.params.scen, root: s.root, s, a, b, alive: b.cities > 0 && b.alive ? 1 : 0, dc: b.cities - a.cities }); })));
  console.log('\n=== ' + label + ' (세력-판 ' + rows.length + ') ===');
  console.log('도산 비율(유지비 부족) ' + f1(100 * mean(rows.map(x => x.s.bank > 0 ? 1 : 0)), 1) + '%  | 세력 12년 도시 수 평균 ' + f1(mean(rows.map(x => x.b.cities)), 2) + ' (시작 ' + f1(mean(rows.map(x => x.a.cities)), 2) + ')  | 전체 생존율 ' + f1(100 * mean(rows.map(x => x.alive)), 1) + '%');
  console.log('뿌리 | n | 생존율 | 도시Δ | 자기방법비율 | 인물(경륜+덕화) | 고가품이익 | 금(개월분)중앙 | 군량(개월분)중앙');
  ROOTS.forEach(rt => { const a = rows.filter(x => x.root === rt); if (!a.length) return;
    const sh = a.map(x => { const o = ALLX.reduce((t, k) => t + (x.s.act[k] || 0), 0); const m = OWN[rt].reduce((t, k) => t + (x.s.act[k] || 0), 0); return o > 0 ? m / o : null; }).filter(v => v !== null);
    const al = a.filter(x => x.alive);
    console.log(rt + ' | ' + a.length + ' | ' + f1(100 * mean(a.map(x => x.alive)), 0) + '% | ' + f1(mean(a.map(x => x.dc)), 2) + ' | ' + f1(100 * mean(sh), 0) + '% (n=' + sh.length + ') | ' + f1(mean(a.map(x => x.s.found + x.s.dFound)), 1) + ' | ' + f1(mean(a.map(x => x.s.gain['고가품'] || 0)), 0) + ' | ' + f1(med(al.map(x => x.b.gm)), 0) + ' | ' + f1(med(al.map(x => x.b.fm)), 1)); });
  // 금 사용처 (레이어가 추적하는 지출만)
  const sum = k => rows.reduce((t, x) => t + k(x), 0);
  const arm = sum(x => (x.s.spend['물자'] || 0) + (x.s.spend['군비화'] || 0) + (x.s.sink['군비'] || 0)), fac = sum(x => x.s.sink['시설'] || 0), tr = sum(x => TRADE.reduce((t, k) => t + (x.s.spend[k] || 0), 0)), tot = arm + fac + tr;
  console.log('금 사용처(레이어 추적분, 세력-판 합) 군비 ' + f1(100 * arm / tot, 0) + '% 시설 ' + f1(100 * fac / tot, 0) + '% 교역 ' + f1(100 * tr / tot, 0) + '%  (총 ' + f1(tot, 0) + ')');
  const dk = rows.filter(x => x.root === '덕화');
  console.log('덕화 인구 변화(끝/시작) ' + f1(mean(dk.map(x => x.a.pop > 0 ? x.b.pop / x.a.pop : NaN).filter(Number.isFinite)), 2) + ' | 덕화 도시당 인구 끝 ' + f1(mean(dk.filter(x => x.b.nct).map(x => x.b.pop / x.b.nct)), 0) + ' | 군량 구매(천) ' + f1(mean(dk.map(x => (x.s.fbuy || 0) / 1000)), 0) + ' | 덕화 인구 구간버프 도시-월 ' + f1(mean(dk.map(x => x.s.popN)), 0) + ' | 구간버프 영입 ' + f1(mean(dk.map(x => x.s.dFound)), 2));
  const lux = rows.filter(x => x.s.gain['고가품'] > 0);
  console.log('고가품 판매 세력-판 ' + lux.length + ' | 평균 이익 ' + f1(mean(lux.map(x => x.s.gain['고가품'])), 0) + ' | 평균 최고 등급 ' + f1(mean(lux.map(x => x.s.tier)), 2) + ' | 등급별 n ' + [1, 2, 3].map(t => lux.filter(x => x.s.tier === t).length).join('/'));
  ['190', '200'].forEach(sc => { const a = rows.filter(x => x.scen === sc); if (a.length) console.log('시나리오 ' + sc + ': 도산 ' + f1(100 * mean(a.map(x => x.s.bank > 0 ? 1 : 0)), 1) + '% 생존 ' + f1(100 * mean(a.map(x => x.alive)), 1) + '% 도시 ' + f1(mean(a.map(x => x.b.cities)), 2) + ' 금중앙 ' + f1(med(a.filter(x => x.alive).map(x => x.b.gm)), 0) + ' 군량중앙 ' + f1(med(a.filter(x => x.alive).map(x => x.b.fm)), 1)); });
  // 군주별 (이름 있는 지정 세력) 자기 방법 비율
  const by = {}; rows.forEach(x => { (by[x.f] = by[x.f] || []).push(x); });
  const names = Object.keys(by).filter(k => by[k].length >= 2).map(k => { const a = by[k]; const rt = a[0].root; const sh = a.map(x => { const o = ALLX.reduce((t, kk) => t + (x.s.act[kk] || 0), 0); const m = OWN[x.root].reduce((t, kk) => t + (x.s.act[kk] || 0), 0); return o > 0 ? m / o : null; }).filter(v => v !== null); return k + '(' + rt[0] + ') ' + (sh.length ? f1(100 * mean(sh), 0) + '%' : '-') + ' 생존' + f1(100 * mean(a.map(x => x.alive)), 0) + '%'; });
  if (process.env.BYLORD) console.log('군주별: ' + names.join(' / '));
}
