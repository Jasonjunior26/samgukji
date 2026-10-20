// cpu-prof 요약: 자기 시간 상위 함수. 사용: node tools/prof_top.js file.cpuprofile [N]
const fs = require('fs'); const p = JSON.parse(fs.readFileSync(process.argv[2], 'utf8')); const N = +process.argv[3] || 25;
const dt = p.timeDeltas, id2 = new Map(p.nodes.map(n => [n.id, n])); const self = new Map();
p.samples.forEach((id, i) => self.set(id, (self.get(id) || 0) + dt[i]));
const by = {}; let tot = 0;
self.forEach((t, id) => { const f = id2.get(id).callFrame; const k = `${f.functionName || '(anon)'} ${f.url.split(/[\/]/).pop()}:${f.lineNumber + 1}`; by[k] = (by[k] || 0) + t; tot += t; });
console.log('총', (tot / 1e6).toFixed(1) + 's');
Object.entries(by).sort((a, b) => b[1] - a[1]).slice(0, N).forEach(([k, t]) => console.log((t / 1e6).toFixed(2).padStart(7), k));
