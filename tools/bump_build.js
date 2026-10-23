// BUILD 갱신: samguk_v109.html 의 const BUILD, version.json, docs/README.md 의 현재 BUILD 를 한 번에 맞춘다.
// 사용: node tools/bump_build.js   (현재 시각 사용)   /   node tools/bump_build.js "v109" "2026-10-22 23:30"
const fs = require('fs'), path = require('path'), root = path.resolve(__dirname, '..');
const d = new Date(), p = n => String(n).padStart(2, '0');
const ver = process.argv[2] || 'v109', ts = process.argv[3] || `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
const build = `${ver} · ${ts}`;
function edit(f, re, to) { const fp = path.join(root, f); const s = fs.readFileSync(fp, 'utf8'); if (!re.test(s)) throw new Error(f + ': 패턴 없음'); fs.writeFileSync(fp, s.replace(re, to)); }
edit('samguk_v109.html', /const BUILD = '[^']*';/, `const BUILD = '${build}';`);
edit('docs/README.md', /`BUILD = '[^']*'`/, `\`BUILD = '${build}'\``);
fs.writeFileSync(path.join(root, 'version.json'), JSON.stringify({ build }) + '\n');
console.log(build);
