// cpu-prof: 특정 함수의 호출자별 자기 시간. 사용: node tools/prof_callers.js file name [N]
const fs = require('fs'); const p = JSON.parse(fs.readFileSync(process.argv[2], 'utf8')); const nm = process.argv[3], N = +process.argv[4] || 12;
const id2 = new Map(p.nodes.map(n => [n.id, n])), par = new Map(); p.nodes.forEach(n => (n.children || []).forEach(c => par.set(c, n.id)));
const self = new Map(); p.samples.forEach((id, i) => self.set(id, (self.get(id) || 0) + p.timeDeltas[i]));
const by = {}; self.forEach((t, id) => { const n = id2.get(id); if (n.callFrame.functionName !== nm) return; let q = par.get(id), k = '?'; while (q) { const f = id2.get(q).callFrame; if (f.functionName !== nm) { k = f.functionName + ':' + (f.lineNumber + 1); break; } q = par.get(q); } by[k] = (by[k] || 0) + t; });
Object.entries(by).sort((a, b) => b[1] - a[1]).slice(0, N).forEach(([k, t]) => console.log((t / 1e6).toFixed(2).padStart(7), k));
