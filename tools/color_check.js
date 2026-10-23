// 세력색 검증기 (v107 세력색): 5개 시나리오 시작 상태에서 인접 세력 쌍·전체 쌍의 지도색(S7COL.mapCol 보정 후) CIE Lab ΔE 를 잰다.
// 사용: node tools/color_check.js > out.txt ; head out.txt   (인자 없으면 190/194/200/207/219 전부)
// 통과 기준: 인접 쌍 ΔE 최솟값 ≥ 25, 전체 쌍 ΔE<15 개수 0(가능하면). 새 게임 시작 직후 + fixFacCols()(렌더 때 도는 중복 보정) 뒤 상태를 잰다.
const fs = require('fs'), vm = require('vm'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'samguk_v109.html'), 'utf8');
const el = () => new Proxy(function () { }, { get: (t, k) => k === Symbol.toPrimitive ? () => '' : (k === 'length' ? 0 : el()), set: () => true, apply: () => el(), construct: () => el() });
const store = {};
const ctx = { console: { log() { }, error() { }, warn() { }, info() { } }, Math, Date, JSON, setTimeout: () => 0, clearTimeout() { }, setInterval: () => 0, requestAnimationFrame: () => 0, performance: { now: () => 0 },
  localStorage: { getItem: k => store[k] ?? null, setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } },
  document: el(), navigator: { userAgent: 'node' }, location: { reload() { } } };
ctx.window = ctx; vm.createContext(ctx);
[...html.matchAll(/<script(?: [^>]*)?>([\s\S]*?)<\/script>/g)].forEach(m => { try { vm.runInContext(m[1], ctx); } catch (e) { } });
const run = s => vm.runInContext(s, ctx);
const lab = h => { const f = run('S7COL').hex(h); const lin = v => { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; const [r, g, b] = f.map(lin); const X = (0.4124 * r + 0.3576 * g + 0.1805 * b) / 0.95047, Y = 0.2126 * r + 0.7152 * g + 0.0722 * b, Z = (0.0193 * r + 0.1192 * g + 0.9505 * b) / 1.08883; const q = t => t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116; return [116 * q(Y) - 16, 500 * (q(X) - q(Y)), 200 * (q(Y) - q(Z))]; };
const dE = (a, b) => { const x = lab(a), y = lab(b); return Math.hypot(x[0] - y[0], x[1] - y[1], x[2] - y[2]); };
const DB = run('DB'), mapCol = h => run('S7COL').mapCol(h);
const scens = process.argv.slice(2).length ? process.argv.slice(2) : ['190', '194', '200', '207', '219'];
const info = JSON.parse(run(`JSON.stringify({fcol:FCOL.length,fixed:Object.keys(FAC_COL).length})`));
console.log(`FCOL ${info.fcol}색, 고정표 ${info.fixed}명`);
let bad = 0;
for (const scen of scens) {
  const pid = scen === "190" ? DB.세력[0].군주 : DB.시나리오[scen].세력[0].id;
  run(`newGame(${JSON.stringify(pid)}, { rand: false, custom: false, scen: ${JSON.stringify(scen)}, diff: 1 }); if (typeof fixFacCols === 'function') fixFacCols();`);
  const fac = JSON.parse(run('JSON.stringify(Object.values(S.fac).map(f=>({id:f.id,col:f.col})))')), own = JSON.parse(run('JSON.stringify(Object.values(S.city).map(c=>[c.n,c.owner]))')).reduce((o, [n, w]) => (o[n] = w, o), {});
  const has = new Set(Object.values(own).filter(Boolean)), live = fac.filter(f => has.has(f.id)), col = {}; fac.forEach(f => col[f.id] = f.col);
  const adj = new Set(); DB.도시.forEach(c => (c.인접 || []).forEach(n => { const a = own[c.이름], b = own[n]; if (a && b && a !== b) adj.add([a, b].sort().join('|')); }));
  let minAdj = 1e9, minPair = '', nAdj25 = 0; adj.forEach(k => { const [a, b] = k.split('|'), e = dE(mapCol(col[a]), mapCol(col[b])); if (e < 25) nAdj25++; if (e < minAdj) { minAdj = e; minPair = a + '-' + b; } });
  const lowAll = []; for (let i = 0; i < live.length; i++) for (let j = i + 1; j < live.length; j++) { const e = dE(mapCol(live[i].col), mapCol(live[j].col)); if (e < 15) lowAll.push(`${live[i].id}-${live[j].id}(${e.toFixed(1)})`); }
  const exact = live.length - new Set(live.map(f => f.col)).size;
  const gray = live.filter(f => run('S7COL').chroma(f.col) < 20).map(f => f.id);
  console.log(`${scen}년: 세력 ${live.length}, 인접쌍 ${adj.size}, 인접 ΔE 최솟값 ${minAdj.toFixed(1)} (${minPair}), 인접 ΔE<25 ${nAdj25}쌍, 전체 ΔE<15 ${lowAll.length}쌍, 원색 중복 ${exact}, 저채도 ${gray.length}`);
  if (lowAll.length) console.log('   <15: ' + lowAll.slice(0, 12).join(' '));
  if (minAdj < 25 || exact || gray.length) bad++;
}
// 중간 등장(rebel/foundFaction 이 쓰는 pickFacCol): 200년 빈 성마다 새 세력을 가정해 이웃과의 ΔE 를 본다.
{
  run(`newGame('조조', { rand: false, custom: false, scen: '200', diff: 1 });`);
  const col = JSON.parse(run('JSON.stringify(Object.fromEntries(Object.values(S.fac).map(f=>[f.id,f.col])))'));
  const empties = JSON.parse(run(`JSON.stringify(Object.values(S.city).filter(c=>!c.owner).map(c=>[c.n,[...facAdjOfCity(c.n,'x')]]).filter(x=>x[1].length))`));
  let mn = 1e9, mc = '';
  for (const [cn, ad] of empties) { const c = run(`pickFacCol('신세력', facAdjOfCity(${JSON.stringify(cn)}, '신세력'))`); for (const a of ad) { const e = dE(mapCol(c), mapCol(col[a])); if (e < mn) { mn = e; mc = cn + '-' + a; } } }
  console.log(`중간 등장 가정(200년 빈 성 ${empties.length}곳): 이웃과 ΔE 최솟값 ${mn.toFixed(1)} (${mc})`);
}
console.log(bad ? `FAIL ${bad}개 시나리오가 인접 25 미달/중복/저채도` : 'OK 인접 ΔE≥25, 중복·저채도 없음');
