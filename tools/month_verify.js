// 월 해시 8종 + 탐침을 한 번에 돌려 기준(tools/month_base.json)과 비교한다. 래퍼 정리(docs/래퍼정리_설계.md) 검증용.
// 사용: node tools/month_verify.js [--save]   (--save: 현재 값을 새 기준으로 기록 — 의도된 동작 변화 때만)
const { execFile } = require('child_process'), fs = require('fs'), path = require('path');
const BASE = path.join(__dirname, 'month_base.json'), MH = path.join(__dirname, 'month_hash.js');
const combos = []; for (const s of [1, 2]) for (const f of ['조조', '유비']) for (const a of ['', '--auto']) combos.push({ s, f, a });
const probes = fs.readdirSync(path.join(__dirname, 'probes')).filter(x => x.endsWith('.js')).map(x => path.join(__dirname, 'probes', x));
const run = args => new Promise(res => execFile('node', [MH, ...args], { env: { ...process.env, PYTHONIOENCODING: 'utf-8' }, maxBuffer: 1 << 26 }, (e, o) => res(String(o).trim().split('\n'))));
(async () => {
  const cur = { hash: {}, probe: {} };
  // 시드는 환경변수라 따로 돌린다
  const rs2 = await Promise.all(combos.map(c => new Promise(res => execFile('node', [MH, '24', c.f, ...(c.a ? [c.a] : [])], { env: { ...process.env, MSEED: String(c.s) }, maxBuffer: 1 << 26 }, (e, o) => { const l = String(o).trim().split('\n'); res([`${c.s}-${c.f}${c.a}`, l.filter(x => x.startsWith('전체') || x.startsWith('예외') || x.startsWith('로드')).join(' / ')]); }))));
  rs2.forEach(([k, v]) => cur.hash[k] = v);
  const pl = await run(['--probe', probes.join(',')]); pl.forEach(l => { const i = l.indexOf(' '); cur.probe[l.slice(0, i)] = l.slice(i + 1); });
  if (process.argv.includes('--save')) { fs.writeFileSync(BASE, JSON.stringify(cur, null, 1)); console.log('기준 저장', BASE); return; }
  const base = JSON.parse(fs.readFileSync(BASE, 'utf8')); let bad = 0;
  for (const g of ['hash', 'probe']) for (const k of new Set([...Object.keys(base[g]), ...Object.keys(cur[g])])) { if (base[g][k] !== cur[g][k]) { bad++; console.log('다름', g, k, '\n  기준', base[g][k], '\n  현재', cur[g][k]); } }
  console.log(bad ? `차이 ${bad}건` : `동일 (해시 ${Object.keys(cur.hash).length} + 탐침 ${Object.keys(cur.probe).length})`);
  process.exit(bad ? 1 : 0);
})();
