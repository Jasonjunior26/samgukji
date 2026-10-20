// samguk_v105.html 에서 DB(도시·도로·세력)·RIVERS·FCOL 을 뽑는다. build.js 가 require 한다.
const fs = require('fs');
const path = require('path');
const SRC = path.join(__dirname, '..', '..', 'samguk_v105.html');

function extract() {
  const lines = fs.readFileSync(SRC, 'utf8').split(/\r?\n/);
  const dbLine = lines.find(l => l.startsWith('const DB={'));
  const DB = JSON.parse(dbLine.slice('const DB='.length).replace(/;\s*$/, ''));
  const fLine = lines.find(l => l.startsWith('const FCOL = ['));
  const FCOL = eval(fLine.slice('const FCOL = '.length).replace(/;\s*$/, ''));
  const ri = lines.findIndex(l => l.startsWith('const RIVERS = ['));
  let rs = '';
  for (let i = ri; i < lines.length; i++) { rs += lines[i] + '\n'; if (/^\s*\];/.test(lines[i])) break; }
  const RIVERS = eval('(' + rs.replace(/^const RIVERS = /, '').replace(/;\s*$/, '') + ')');
  return {
    cities: DB.도시.map(c => ({ n: c.이름, ju: c.주, g: c.등급, x: c.좌표.x, y: c.좌표.y, own: c.소속 || null, t: c.지형, k: c.종류, adj: c.인접 })),
    roads: DB.도로.map(r => ({ a: r.a, b: r.b, w: r.종류 === '수로' })),
    facs: DB.세력.map((f, i) => ({ r: f.군주, home: f.본거지, col: FCOL[i % FCOL.length] })),
    rivers: RIVERS,
    FCOL,
  };
}
module.exports = extract;
if (require.main === module) {
  const d = extract();
  fs.writeFileSync(process.argv[2] || 'data.json', JSON.stringify(d));
  console.log(d.cities.length, d.roads.length, d.facs.length, d.rivers.length);
}
