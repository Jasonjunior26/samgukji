// 물가 시험기(v107 6a): 게임 코드를 Node vm 으로 읽어 전 세력을 AI 로 N개월 돌리며 전국·세력 물가, 금 보유 개월, 유지비 부족(도산) 비율을 해마다 찍는다.
// 사용: node tools/price_sim.js [개월=120] [시드=1,2,3] [모드=both|on|off]
//  on  — 6a 그대로(전국 물가 월 상한 + 세력 물가 + 소득 전가 + 유지비·군비·출정비·예비금 물가)
//  off — 6a 끔(세력 물가 1, 전국 상한 해제 → S2 그대로의 물가·비용). 비교 기준선
const fs = require('fs'), vm = require('vm'), path = require('path');
const MONTHS = +(process.argv[2] || 120), SEEDS = (process.argv[3] || '1,2,3').split(',').map(Number), MODE = process.argv[4] || 'both';
const html = fs.readFileSync(path.join(__dirname, '..', 'samguk_v109.html'), 'utf8');
const el = () => new Proxy(function () { }, { get: (t, k) => k === Symbol.toPrimitive ? () => '' : (k === 'length' ? 0 : el()), set: () => true, apply: () => el(), construct: () => el() });
function run(seedIn, on) {
  const store = {}; let seed = seedIn >>> 0; const rnd = () => { seed = (seed + 0x6D2B79F5) >>> 0; let t = seed; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const M = Object.create(Math); M.random = rnd;
  const ctx = { console: { log() { }, error() { }, warn() { }, info() { } }, Math: M, Date, JSON, setTimeout: () => 0, clearTimeout() { }, setInterval: () => 0, requestAnimationFrame: () => 0, performance: { now: () => Date.now() },
    localStorage: { getItem: k => store[k] ?? null, setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } },
    document: el(), navigator: { userAgent: 'node' }, location: { reload() { } } };
  ctx.window = ctx; vm.createContext(ctx);
  [...html.matchAll(/<script(?: [^>]*)?>([\s\S]*?)<\/script>/g)].forEach((m, i) => { try { vm.runInContext(m[1], ctx, { filename: 'block' + i }); } catch (e) { } });
  ctx.MONTHS = MONTHS; ctx.ON = on;
  return vm.runInContext(`(() => {
    if (!ON) { P2.cap = 1e9; P2.mcap = 1e9; facPriceIdx = () => 1; facPriceMul = () => 1; } // 6a 끔: 세력 물가 1, 전국 상한 해제
    const month = () => { const pend = endMonth(); pend.forEach(d => { try { const r = autoBattle(d.att, d.from, d.to, d.units); if (r.win) C(d.to).food += d.food; else C(d.from).food += d.food; } catch (e) { } }); monthlyUpdate(); };
    // 원본 유지비 부족(도산) 집계: monthlyUpkeep 직전에 비용보다 금이 적은 도시 세기
    const bank = {}; { const f = monthlyUpkeep; monthlyUpkeep = function () { Object.values(S.city).forEach(c => { if (!c.owner) return; const cost = Math.ceil(Math.max(0, c.troops + Math.min(c.merc || 0, c.troops) - 3000) / ECO.troopGold) + (ECO.admin[c.tier] || 0); if (c.gold < cost) bank[c.owner] = (bank[c.owner] || 0) + 1; }); return f.apply(this, arguments); }; }
    const shortP2 = {}; { const f = monthlyUpdate; monthlyUpdate = function () { const b = S.p2 ? S.p2.short : 0; const r = f.apply(this, arguments); const a = S.p2 ? S.p2.short : 0; if (a > b) shortP2._ = (shortP2._ || 0) + (a - b); return r; }; }
    newGame('조조'); S.opt.v4Battle = false;
    const fids = Object.keys(S.fac); const yrs = [];
    const med = a => { if (!a.length) return 0; const s = a.slice().sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };
    let overM = 0; for (let i = 0; i < MONTHS; i++) { if (S.over && !overM) overM = i; // 플레이어 세력이 죽어도(S.over) 계속 돌림
      if (S.fac[S.player].alive) { try { aiTurn(S.player); } catch (e) { } }
      month();
      if (S.fac[S.player].alive && (!S.fac[S.player].pol || S.m === 1)) { try { aiPickPolicy(S.player); } catch (e) { } }
      if (i % 12 === 11) {
        const alive = fids.filter(f => S.fac[f].alive && citiesOf(f).length);
        const pf = alive.map(f => facPriceIdx(f)); const gm = alive.map(f => { const cs = citiesOf(f); const g = cs.reduce((s, c) => s + c.gold, 0), t = cs.reduce((s, c) => s + c.troops, 0); return t > 0 ? g / (t / 250) : 0; });
        yrs.push({ y: yrs.length + 1, pn: S.pIdx || 1, pn2: S.pIdx2 || 1, pfMed: med(pf), pfMax: Math.max(...pf, 1), alive: alive.length, goldMo: med(gm), goldCity: med(alive.map(f => citiesOf(f).reduce((s, c) => s + c.gold, 0) / citiesOf(f).length)), bankN: Object.keys(bank).length, bankSum: Object.values(bank).reduce((s, v) => s + v, 0), shortP2: shortP2._ || 0, pass: S.p2 ? S.p2.pass : 0, extra: S.p2 ? S.p2.extra : 0 });
      }
    }
    return { yrs, nFac: fids.length, over: overM };
  })()`, ctx);
}
const f2 = v => (Math.round(v * 100) / 100).toFixed(2);
const modes = MODE === 'both' ? ['off', 'on'] : [MODE];
const all = {};
modes.forEach(mode => { all[mode] = []; SEEDS.forEach(sd => { const r = run(sd, mode === 'on'); all[mode].push(r);
  console.log(`\n[${mode}] 시드 ${sd}  세력 ${r.nFac}  ${r.over ? '(플레이어 종료 ' + r.over + '개월)' : ''}`);
  console.log('  연 | 전국물가(원식) | 전국물가(상한) | 세력물가 중앙 | 최대 | 생존 | 금(개월) 중앙 | 도시당 금 | 도산 세력 수(원본 유지비 부족) | 누적 횟수 | 물가 유지비 부족 횟수 | 전가 누적 | 추가 유지비 누적');
  r.yrs.forEach(y => console.log('  ' + String(y.y).padStart(2) + ' | ' + f2(y.pn).padStart(6) + ' | ' + f2(y.pn2).padStart(6) + ' | ' + f2(y.pfMed).padStart(6) + ' | ' + f2(y.pfMax).padStart(5) + ' | ' + String(y.alive).padStart(3) + ' | ' + String(Math.round(y.goldMo)).padStart(5) + ' | ' + String(Math.round(y.goldCity)).padStart(6) + ' | ' + String(y.bankN).padStart(3) + ' | ' + String(y.bankSum).padStart(5) + ' | ' + String(y.shortP2).padStart(5) + ' | ' + String(y.pass).padStart(7) + ' | ' + String(y.extra).padStart(7)));
}); });
console.log('\n[요약] 모드 | 10년차 전국물가(상한) 평균 | 세력물가 중앙 평균 | 생존 평균 | 금(개월) 평균 | 도산 세력 비율(세력-판, 원본 부족 1회 이상) | 물가 부족 횟수 합');
modes.forEach(mode => { const rs = all[mode]; const last = rs.map(r => r.yrs[r.yrs.length - 1]).filter(Boolean); const mean = a => a.reduce((s, v) => s + v, 0) / Math.max(1, a.length);
  console.log(`  ${mode} | ${f2(mean(last.map(y => y.pn2)))} | ${f2(mean(last.map(y => y.pfMed)))} | ${f2(mean(last.map(y => y.alive)))} | ${Math.round(mean(last.map(y => y.goldMo)))} | ${f2(100 * mean(rs.map((r, i) => last[i].bankN / r.nFac)))}% | ${last.reduce((s, y) => s + y.shortP2, 0)}`); });
process.exit(0);
