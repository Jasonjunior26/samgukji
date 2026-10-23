// 자동 전투 보정기: 게임 HTML을 Node에서 불러(화면 없음) 실제 AI 매치업마다
//   - 옛 공식 autoBattle(S.opt.v4Battle = false)과 V4 머리속 전투(v4Battle = true)를 여러 번 돌려 승률·손실·시간을 견주고
//   - winChance(옛 곡선·새 곡선)가 V4 결과를 얼마나 맞히는지 구간표와 로지스틱 회귀 계수(V4WIN 후보)를 찍는다.
// 사용: node tools/battle_calib.js [V4 반복=5] [옛 반복=20] [단계당 매치업 상한=60] [기록 파일(jsonl, 선택)]
//   단계: 새 게임 직후, 12·24·36개월 뒤(플레이어는 가만히, 침공은 위임). 매치업은 aiTurn과 같은 규칙(자유 장수 8명, autoUnits, 성격별 부대 수)에 병력 비율 0.4/0.7/1.0.
const fs = require('fs'), vm = require('vm'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'samguk_v109.html'), 'utf8');
const el = () => new Proxy(function () { }, { get: (t, k) => k === Symbol.toPrimitive ? () => '' : (k === 'length' ? 0 : el()), set: () => true, apply: () => el(), construct: () => el() });
const store = {};
const ctx = { console, Math, Date, JSON, setTimeout: () => 0, clearTimeout() { }, setInterval: () => 0, requestAnimationFrame: () => 0, performance: { now: () => Date.now() },
  localStorage: { getItem: k => store[k] ?? null, setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } },
  document: el(), navigator: { userAgent: 'node' }, location: { reload() { } }, hr: () => Number(process.hrtime.bigint()) / 1e6, OUT: [] };
ctx.window = ctx; vm.createContext(ctx);
[...html.matchAll(/<script(?: [^>]*)?>([\s\S]*?)<\/script>/g)].forEach((m, i) => { try { vm.runInContext(m[1], ctx, { filename: 'block' + i }); } catch (e) { console.log('block', i, e.message); } });
const KV = +(process.argv[2] || 5), KO = +(process.argv[3] || 20), CAP = +(process.argv[4] || 60), FILE = process.argv[5];

// ---------- 1. 수집 ----------
vm.runInContext(`(() => {
  newGame('조조'); S.opt.v4Battle = true;
  let LAST = null; const curve0 = v4WinCurve;
  v4WinCurve = (x, f) => { LAST = { x, aQ: f.aQ, dQ: f.dQ, siege: f.siege, pass: f.pass, wall: f.wall, aT: f.aT, dT: f.dT, ng: f.dg.length, nA: f.nA, nD: f.nD }; return curve0(x, f); };
  const month = () => { const pend = endMonth(); pend.forEach(d => { const r = autoBattle(d.att, d.from, d.to, d.units); if (r.win) C(d.to).food += d.food; else C(d.from).food += d.food; }); monthlyUpdate(); };
  const stage = (label) => {
    const snap = JSON.stringify(S); const ms = [];
    Object.values(S.fac).filter(f => f.alive && f.id !== S.player).forEach(f => citiesOf(f.id).forEach(c => { if (c.troops < 2500) return; const free = freeGens(c.n, f.id).filter(g => !isRuler(g) || gensIn(c.n, f.id).length < 3); if (!free.length) return; ADJ[c.n].map(C).filter(x => x.owner && x.owner !== f.id && x.owner !== S.player && !allied(f.id, x.owner)).forEach(x => ms.push({ fid: f.id, from: c.n, to: x.n })); }));
    for (let i = ms.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [ms[i], ms[j]] = [ms[j], ms[i]]; }
    let done = 0;
    for (const m of ms) { if (done >= ${CAP}) break;
      for (const frac of [0.4, 0.7, 1.0]) {
        S = JSON.parse(snap);
        const c = C(m.from); const free = freeGens(m.from, m.fid).filter(g => !isRuler(g) || gensIn(m.from, m.fid).length < 3).sort((a, b) => (b.t + b.w) - (a.t + a.w)).slice(0, 8);
        const units = autoUnits(free, Math.floor(c.troops * frac), personaUnits(m.fid)); if (!units.length) continue;
        const spec = JSON.stringify(units); const aT = units.reduce((s, u) => s + u.troops, 0); const tc = C(m.to); const dT0 = tc.troops, def = tc.owner;
        LAST = null; S.opt.v4Battle = false; const pOld = winChance(m.fid, m.from, m.to, JSON.parse(spec), 1); S.opt.v4Battle = true;
        const pNew = winChance(m.fid, m.from, m.to, JSON.parse(spec), 1); const feat = LAST;
        const rec = { stage: label, fid: m.fid, from: m.from, to: m.to, def, frac, aT, dT: dT0, wall: tc.def, kind: kindOf(m.to), nA: units.length, pOld, pNew, feat, v4: [], old: [] };
        const one = (useV4) => {
          S = JSON.parse(snap); S.opt.v4Battle = useV4; const c = C(m.from); const us = JSON.parse(spec); c.troops -= aT; const from0 = c.troops; const tc = C(m.to);
          const t0 = hr(); const r = autoBattle(m.fid, m.from, m.to, us); const dt = hr() - t0;
          const surv = r.win ? tc.troops : c.troops - from0; const dSurv = r.win ? 0 : tc.troops;
          return { w: r.win ? 1 : 0, aL: aT - surv, dL: dT0 - dSurv, ms: Math.round(dt), t: r.turns, why: r.why, mode: r.mode };
        };
        for (let i = 0; i < ${KV}; i++) rec.v4.push(one(true));
        for (let i = 0; i < ${KO}; i++) rec.old.push(one(false));
        OUT.push(rec); done++;
      }
    }
    S = JSON.parse(snap); console.error(label, '매치업', ms.length, '기록', done);
  };
  stage('0m'); for (let i = 0; i < 36; i++) { month(); if (i === 11) stage('12m'); if (i === 23) stage('24m'); if (i === 35) stage('36m'); }
})();`, ctx);
const rows = ctx.OUT.filter(r => r.feat && r.v4.length);
if (FILE) fs.writeFileSync(FILE, rows.map(r => JSON.stringify(r)).join('\n'));

// ---------- 2. 표와 회귀 ----------
const mean = a => a.reduce((s, x) => s + x, 0) / Math.max(1, a.length);
rows.forEach(r => { r.x = r.feat.x; r.v4w = mean(r.v4.map(o => o.w)); r.oldw = mean(r.old.map(o => o.w)); r.v4aL = mean(r.v4.map(o => o.aL)) / r.aT; r.v4dL = mean(r.v4.map(o => o.dL)) / Math.max(1, r.dT); r.oldaL = mean(r.old.map(o => o.aL)) / r.aT; r.olddL = mean(r.old.map(o => o.dL)) / Math.max(1, r.dT); r.ms = mean(r.v4.map(o => o.ms)); r.turns = mean(r.v4.map(o => o.t || 0)); r.siege = r.feat.siege ? 1 : 0; r.mil = r.feat.ng === 0 ? 1 : 0; r.timeout = mean(r.v4.map(o => /제한 턴/.test(o.why || '') ? 1 : 0)); });
console.log('매치업', rows.length, 'V4 판수', rows.reduce((s, r) => s + r.v4.length, 0));
console.log('전체 공격 승률: 옛 예측', mean(rows.map(r => r.pOld)).toFixed(3), '옛 실제', mean(rows.map(r => r.oldw)).toFixed(3), '새 예측', mean(rows.map(r => r.pNew)).toFixed(3), 'V4 실제', mean(rows.map(r => r.v4w)).toFixed(3));
console.log('손실 비율(공격/수비): 옛', mean(rows.map(r => r.oldaL)).toFixed(3), mean(rows.map(r => r.olddL)).toFixed(3), '| V4', mean(rows.map(r => r.v4aL)).toFixed(3), mean(rows.map(r => r.v4dL)).toFixed(3));
console.log('V4 한 판 평균', mean(rows.map(r => r.ms)).toFixed(0) + 'ms', '평균 턴', mean(rows.map(r => r.turns)).toFixed(1), '제한턴 비율', mean(rows.map(r => r.timeout)).toFixed(3));
const ll = k => mean(rows.map(r => r.v4w * Math.log(r[k] + 1e-9) + (1 - r.v4w) * Math.log(1 - r[k] + 1e-9)));
const mae = k => mean(rows.map(r => Math.abs(r[k] - r.v4w)));
console.log('V4 결과 맞힘 — 평균 로그우도: 옛', ll('pOld').toFixed(4), '새', ll('pNew').toFixed(4), '| 평균 절대 오차: 옛', mae('pOld').toFixed(3), '새', mae('pNew').toFixed(3));
console.log('\nx=ln(aQ/dQ) 구간 | n | 옛 예측 | 옛 실제 | 새 예측 | V4 실제 | V4 공격손실 | V4 수비손실');
const bins = [-9, -1.5, -1, -0.5, -0.25, 0, 0.25, 0.5, 1, 9];
for (let i = 0; i < bins.length - 1; i++) { const g = rows.filter(r => r.x >= bins[i] && r.x < bins[i + 1]); if (!g.length) continue; console.log(`[${bins[i]}, ${bins[i + 1]}) | ${g.length} | ${mean(g.map(r => r.pOld)).toFixed(2)} | ${mean(g.map(r => r.oldw)).toFixed(2)} | ${mean(g.map(r => r.pNew)).toFixed(2)} | ${mean(g.map(r => r.v4w)).toFixed(2)} | ${mean(g.map(r => r.v4aL)).toFixed(2)} | ${mean(g.map(r => r.v4dL)).toFixed(2)}`); }
console.log('\n새 예측 구간 | n | 새 예측 | V4 실제 | 옛 예측');
const pb = [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.01];
for (let i = 0; i < pb.length - 1; i++) { const g = rows.filter(r => r.pNew >= pb[i] && r.pNew < pb[i + 1]); if (!g.length) continue; console.log(`[${pb[i].toFixed(1)}, ${pb[i + 1].toFixed(1)}) | ${g.length} | ${mean(g.map(r => r.pNew)).toFixed(2)} | ${mean(g.map(r => r.v4w)).toFixed(2)} | ${mean(g.map(r => r.pOld)).toFixed(2)}`); }
console.log('\n야전/농성:', [0, 1].map(s => { const g = rows.filter(r => r.siege === s); return `${s ? '농성' : '야전'} n=${g.length} 옛 ${mean(g.map(r => r.pOld)).toFixed(2)} 새 ${mean(g.map(r => r.pNew)).toFixed(2)} V4 ${mean(g.map(r => r.v4w)).toFixed(2)}`; }).join(' | '));
console.log('장수 있음/병졸만:', [0, 1].map(s => { const g = rows.filter(r => r.mil === s); return `${s ? '병졸만' : '장수 있음'} n=${g.length} 옛 ${mean(g.map(r => r.pOld)).toFixed(2)} 새 ${mean(g.map(r => r.pNew)).toFixed(2)} V4 ${mean(g.map(r => r.v4w)).toFixed(2)}`; }).join(' | '));
// 로지스틱 회귀 (뉴턴법): V4WIN 후보 계수
function fit(feats, name) {
  const X = rows.map(r => [1, ...feats(r)]), Y = rows.map(r => r.v4w), Wt = rows.map(r => r.v4.length); const d = X[0].length; let b = new Array(d).fill(0);
  for (let it = 0; it < 50; it++) {
    const g = new Array(d).fill(0), H = Array.from({ length: d }, () => new Array(d).fill(0));
    X.forEach((x, i) => { const z = x.reduce((s, v, j) => s + v * b[j], 0); const p = 1 / (1 + Math.exp(-z)); const e = Wt[i] * (p - Y[i]); const w = Wt[i] * p * (1 - p) + 1e-6; for (let j = 0; j < d; j++) { g[j] += e * x[j]; for (let k = 0; k < d; k++) H[j][k] += w * x[j] * x[k]; } });
    const A = H.map((r, i) => [...r, g[i]]); for (let i = 0; i < d; i++) { let p = i; for (let k = i + 1; k < d; k++) if (Math.abs(A[k][i]) > Math.abs(A[p][i])) p = k; [A[i], A[p]] = [A[p], A[i]]; for (let k = 0; k < d; k++) { if (k === i) continue; const f = A[k][i] / A[i][i]; for (let j = i; j <= d; j++) A[k][j] -= f * A[i][j]; } }
    const step = A.map((r, i) => r[d] / r[i]); b = b.map((v, j) => v - step[j]); if (Math.max(...step.map(Math.abs)) < 1e-8) break;
  }
  const l = X.reduce((s, x, i) => { const p = 1 / (1 + Math.exp(-x.reduce((q, v, j) => q + v * b[j], 0))); return s + Wt[i] * (Y[i] * Math.log(p + 1e-9) + (1 - Y[i]) * Math.log(1 - p + 1e-9)); }, 0) / Wt.reduce((s, w) => s + w, 0);
  console.log(name, '계수 =', b.map(v => v.toFixed(3)).join(', '), '평균 로그우도', l.toFixed(4));
}
console.log('\n회귀 (이 자료로 다시 맞춘 계수 — V4WIN = { b0, x, siege, militia } 순서):');
fit(r => [r.x], 'x만');
fit(r => [r.x, r.siege], 'x+농성');
fit(r => [r.x, r.siege, r.mil], 'x+농성+병졸만 (채택한 꼴)');
