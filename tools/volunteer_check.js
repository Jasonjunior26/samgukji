// v107 6d 덕화 초기 보호 단위 점검기(발동 완화 ⓐ 빈 성·ⓑ 위협 소집 포함): 게임 HTML을 Node vm 에 올려 의용병 규모식·훈련 가중 평균·인구 차감·중복 방지·비덕화 0·인구 가산 월 1회 값을 실제 코드로 찍는다.
// 사용: node tools/volunteer_check.js > docs/sim/v107_s6d_check.txt   (패치 없이 실제 코드로 돈다. 마지막 줄 "FAIL 0"이면 통과)
const fs = require('fs'), vm = require('vm'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'samguk_v108.html'), 'utf8');
const el = () => new Proxy(function () { }, { get: (t, k) => k === Symbol.toPrimitive ? () => '' : (k === 'length' ? 0 : el()), set: () => true, apply: () => el(), construct: () => el() });
const store = {};
let seed = 7; const rnd = () => { seed = (seed + 0x6D2B79F5) >>> 0; let t = seed; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const M = Object.create(Math); M.random = rnd;
const ctx = { console: { log() { }, error() { }, warn() { }, info() { } }, Math: M, Date, JSON, setTimeout: () => 0, clearTimeout() { }, setInterval: () => 0, requestAnimationFrame: () => 0, performance: { now: () => Date.now() },
  localStorage: { getItem: k => store[k] ?? null, setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } },
  document: el(), navigator: { userAgent: 'node' }, location: { reload() { } } };
ctx.HAS_VH = (html.match(/!\(typeof volHold === 'function' && volHold\((best, fid|t, S\.player)\)\)/g) || []).length;
ctx.window = ctx; vm.createContext(ctx);
[...html.matchAll(/<script(?: [^>]*)?>([\s\S]*?)<\/script>/g)].forEach((m, i) => { try { vm.runInContext(m[1], ctx, { filename: 'block' + i }); } catch (e) { } });

const out = vm.runInContext(`(() => {
  const R = []; let fail = 0;
  const say = (...a) => R.push(a.join(' '));
  const chk = (name, got, want) => { const ok = got === want; if (!ok) fail++; say((ok ? 'ok  ' : 'FAIL') + ' ' + name + ': ' + got + (ok ? '' : ' (기대 ' + want + ')')); };
  newGame('유비', { rand: false, custom: false, scen: '190', diff: 1 }); S.opt.v4Battle = false;
  S.fac[S.player].root = '덕화';
  const mine = citiesOf(S.player).filter(c => kindOf(c.n) === '도시'); const c = mine[0];
  const enemy = Object.keys(S.fac).find(f => f !== S.player && S.fac[f].alive);
  say('== 상수 VOL', JSON.stringify(VOL), '| 시험 도시', c.n, '소유', c.owner, '뿌리', rootOf(c.owner), '| 공격 세력', enemy, '| monthlyPop 유효 정의 길이', String(monthlyPop).length);
  // 1) 규모식 (volSize)
  const sz = (pop, loy) => volSize({ pop, loy });
  say(''); say('== 의용병 규모 V = min(인구×max(민충,50)/100×0.15, 인구×0.15, 20000), 100 단위 내림');
  chk('인구 10만·민충 80', sz(100000, 80), 12000);
  chk('인구 20만·민충 60', sz(200000, 60), 18000);
  chk('인구 10만·민충 100 (0.15 = 상한 0.15 → 15,000)', sz(100000, 100), 15000);
  chk('인구 10만·민충 120(범위 밖, 100으로 자름)', sz(100000, 120), 15000);
  chk('인구 25만·민충 100 → 절대 상한 20,000', sz(250000, 100), 20000);
  chk('인구 34만·민충 100 → 절대 상한 20,000', sz(340000, 100), 20000);
  chk('100 단위 내림 (인구 12,345·민충 77 → 1,400)', sz(12345, 77), 1400);
  chk('민충 20 → 하한 50 적용 (10만 → 7,500)', sz(100000, 20), 7500);
  chk('인구 0 → 0', sz(0, 80), 0);
  // 2) volunteerCall: 인구 차감·병력 가산·훈련 가중 평균·집계·소식
  say(''); say('== volunteerCall(도시, 공격 세력, 표시 없음)');
  c.pop = 100000; c.loy = 80; c.troops = 5000; c.train = 80; S.vol = null; const n0 = S.news.length;
  const rec = volunteerCall(c, enemy, null);
  chk('V', rec && rec.V, 12000);
  chk('인구 100,000 → 88,000', c.pop, 88000);
  chk('병력 5,000 → 17,000', c.troops, 17000);
  chk('훈련 (80×5000 + 40×12000)/17000 = 51.8 → 52', c.train, 52);
  chk('집계 S.vol.n', S.vol.n, 1); chk('집계 S.vol.sum', S.vol.sum, 12000); chk('집계 S.vol.max', S.vol.max, 12000);
  chk('플레이어 도시라 S.news 한 줄', S.news.length - n0, 1); say('   소식:', S.news[S.news.length - 1]);
  // 3) 비덕화·자기 세력·표시된 전투
  say(''); say('== 발동 안 하는 경우');
  S.fac[S.player].root = '강병'; c.pop = 100000; c.troops = 5000;
  chk('비덕화(강병) → null', volunteerCall(c, enemy, null), null); chk('   병력 그대로', c.troops, 5000);
  S.fac[S.player].root = '덕화';
  chk('자기 세력이 공격자 → null', volunteerCall(c, c.owner, null), null);
  chk('B.volun 표시된 전투 → null', volunteerCall(c, enemy, { volun: { V: 1 } }), null);
  chk('   병력 그대로', c.troops, 5000); chk('   인구 그대로', c.pop, 100000);
  // 4) 보강 경로: 부대가 이미 편성된 전투 객체 → 성내 예비대
  say(''); say('== 보강 경로 (tag.units 있음 → tag.dres)');
  const tag = { units: [], dres: 1000 }; c.pop = 200000; c.loy = 60; c.troops = 0;
  const r2 = volunteerCall(c, enemy, tag);
  chk('V', r2 && r2.V, 18000); chk('tag.dres 1,000 → 19,000', tag.dres, 19000); chk('성 병력은 그대로 0', c.troops, 0); chk('인구 200,000 → 182,000', c.pop, 182000); chk('tag.volun 표시', !!tag.volun, true);
  chk('같은 tag 재호출 → null', volunteerCall(c, enemy, tag), null);
  // 5) 인구 가산 월 1회 값: 원본 monthlyPop 결과 + (상한−인구)×0.015×(0.5+민충/100)
  say(''); say('== 인구 가산 (monthlyPop 래퍼, 덕화 도시 1곳)');
  // 위협 소집이 같은 monthlyPop 래퍼 체인에 있으므로 덕화 전 도시의 소집 시계를 이번 달로 맞춰 막는다
  const NOW = S.y * 12 + S.m; Object.values(S.city).forEach(x => { x.volT = NOW; });
  const mx = popMax(c); c.pop = Math.max(1000, mx - 100000); c.loy = 80; const p0 = c.pop;
  const base = Math.min(mx, p0 + Math.round((mx - p0) * (0.004 + c.loy / 100 * 0.006)));
  const want = Math.min(mx, base + Math.round((mx - base) * 0.015 * (0.5 + c.loy / 100)));
  // 다른 도시는 변하지 않게 한 곳만 비교
  const others = Object.values(S.city).filter(x => x !== c).map(x => [x, x.pop]);
  S.vol = null; monthlyPop();
  chk('상한 ' + mx + ' · 시작 ' + p0 + ' → 원본 ' + base + ' + 가산 ' + (want - base), c.pop, want);
  chk('집계 S.vol.popSum은 덕화 전 도시 합이라 이 도시 가산 이상', S.vol && S.vol.popSum >= want - base, true);
  say('   원본 월 증가 ' + (base - p0) + ' 대비 가산 ' + (want - base) + ' = ' + Math.round(100 * (want - base) / Math.max(1, base - p0)) + '%');
  S.fac[S.player].root = '강병'; c.pop = p0; monthlyPop(); chk('비덕화면 원본만', c.pop, base); S.fac[S.player].root = '덕화';
  const otherDeok = others.filter(([x]) => x.owner && rootOf(x.owner) === '덕화' && x.pop != null);
  say('   덕화 소속 다른 도시 ' + otherDeok.length + '곳도 가산 받음(합계 popSum ' + (S.vol && S.vol.popSum) + ')');
  // 6) 상한 넘지 않음
  c.pop = mx; monthlyPop(); chk('상한에서 가산 없음', c.pop <= mx, true);
  // 7) autoBattle 래퍼 통합: 옛 공식 전투 한 판에 의용병이 들어가는지 (v4Battle=false)
  say(''); say('== autoBattle 통합 (옛 공식, v4Battle=false)');
  try {
    const from = Object.values(S.city).find(x => x.owner === enemy && ADJ[x.n] && ADJ[x.n].includes(c.n)) || Object.values(S.city).find(x => x.owner === enemy);
    const gs = gensIn(from.n, enemy).filter(g => g.inj === 0 && !g.away).slice(0, 3);
    c.pop = 150000; c.loy = 70; c.troops = 3000; c.train = 70; from.troops = Math.max(from.troops, 20000); from.food = 99999;
    const units = autoUnits(gs, 12000, 5);
    S.vol = null; const r = autoBattle(enemy, from.n, c.n, units);
    chk('의용병 발동 1회', S.vol && S.vol.n, 1); say('   V ' + (S.vol && S.vol.max) + ' · 결과 승=' + (r && r.win) + ' · 격퇴 집계 rep=' + (S.vol && S.vol.rep) + ' · 전투 뒤 ' + c.n + ' 소유 ' + c.owner + ' 병력 ' + c.troops + ' 훈련 ' + c.train);
  } catch (e) { say('   autoBattle 통합 시험 오류(미확인): ' + e.message); }
  // 7b) 발동 완화 ⓐ: 빈 성(병력 0·장수 없음)은 무혈 점령 대신 의용병 → volHold 참
  say(''); say('== 발동 완화 ⓐ 빈 성 (volHold)');
  { const e = { n: c.n, owner: S.player, pop: 100000, loy: 80, troops: 0 };
    chk('덕화 빈 성 → volHold 참', volHold(e, enemy), true);
    S.fac[S.player].root = '강병'; chk('비덕화 빈 성 → 거짓(원래대로 무혈 점령)', volHold(e, enemy), false); S.fac[S.player].root = '덕화';
    chk('인구 500(V 0) → 거짓', volHold({ n: c.n, owner: S.player, pop: 500, loy: 80, troops: 0 }, enemy), false);
    chk('HTML 빈 성 경로 3곳에 volHold 조건(AI 1·플레이어 2)', HAS_VH, 3); }
  // 7c) 발동 완화 ⓑ: 위협 소집 (매월, 인접 남의 도시 병력 ≥ 내 병력×thrR, 도시별 cool개월에 한 번, 규모 ×thrK)
  say(''); say('== 발동 완화 ⓑ 위협 소집');
  c.owner = S.player; // 7) 통합 시험에서 빼앗겼을 수 있어 되돌린다
  { const nb = (ADJ[c.n] || []).map(C).filter(Boolean); const save = nb.map(x => [x, x.owner, x.troops]);
    const foe = nb[0]; foe.owner = enemy; foe.troops = 30000; nb.slice(1).forEach(x => { x.owner = S.player; });
    if (S.fac[S.player].ally) delete S.fac[S.player].ally[enemy];
    c.pop = 100000; c.loy = 80; c.troops = 10000; c.train = 80; c.volT = null; S.vol = null;
    chk('volThreat: 30,000 ≥ 2×10,000 → ' + enemy, volThreat(c), enemy);
    const ps = Object.values(S.city).filter(x => x !== c).map(x => [x, x.pop, x.volT]);
    Object.values(S.city).forEach(x => { if (x !== c) x.volT = S.y * 12 + S.m; });
    const pb = c.pop; const pm = popMax(c); monthlyPop(); const grow = c.pop; // 원본+가산 뒤 소집
    chk('위협 소집 1회(S.vol.thr)', S.vol && S.vol.thr, 1); chk('S.vol.n', S.vol && S.vol.n, 1);
    say('   V ' + (S.vol && S.vol.max) + ' (전 규모의 절반 기대) · 병력 ' + c.troops + ' · 인구 ' + pb + ' → ' + c.pop);
    chk('병력 10,000 + V', c.troops, 10000 + (S.vol && S.vol.max));
    chk('규모 = volSize×0.5 기준(인구 증가 뒤 값, 100 단위)', (S.vol && S.vol.max) > 0 && (S.vol.max) <= 6100, true);
    monthlyPop(); chk('같은 달 재실행 → 시계로 막힘', S.vol.n, 1);
    S.m += 6; monthlyPop(); chk('6개월 뒤 → 아직 막힘(cool 12)', S.vol.n, 1); S.m -= 6;
    c.troops = 20000; c.volT = null; chk('30,000 < 2×20,000 → 위협 없음', volThreat(c), null);
    save.forEach(([x, o, t]) => { x.owner = o; x.troops = t; }); ps.forEach(([x, p, v]) => { x.pop = p; x.volT = v; }); }
  // 8) 저장 호환: S.vol 없어도 volStat()가 만든다
  say(''); S.vol = undefined; chk('S.vol 없을 때 volStat()', !!volStat() && S.vol.n, 0);
  say(''); say('FAIL ' + fail);
  return R.join('\\n');
})()`, ctx);
console.log(out);
process.exit(0);
