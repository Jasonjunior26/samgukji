// 모든 인라인 <script> 블록이 new vm.Script 로 구문 통과하는지 확인
const fs = require('fs'), vm = require('vm'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', '..', 'samguk_v107.html'), 'utf8');
let n = 0, bad = 0;
for (const m of html.matchAll(/<script(?: [^>]*)?>([\s\S]*?)<\/script>/g)) { n++; try { new vm.Script(m[1], { filename: 'block' + (n - 1) }); } catch (e) { bad++; console.log('block', n - 1, String(e).slice(0, 200)); } }
console.log(`script 블록 ${n}개 · 구문 오류 ${bad}`);
