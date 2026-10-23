// 6b 교역 점검기(초안): 새 게임(190·200)에서 내륙·항구 세력의 교역 명령 가능 여부, 거점 증폭, 부상 열림, 뿌리 게이트, 24개월 AI 진행 오류를 찍는다.
// 사용: node tools/trade_check.js [개월=24] [rr] [시드=1] > docs/sim/v107_s6b_check.txt
//   rr 을 주면 AI 진행 때 뿌리를 세력 순서대로 돌려 배정(6b 방식), 없으면 게임의 실제 배정(S5 지정표·자동 선택).
// 6c: 갈래 행동 점검(뿌리별 trFxDo 시험 호출)과 진행 뒤 세력별 갈래 집계(S.trade.fx)를 함께 찍는다.
const fs = require('fs'), vm = require('vm'), path = require('path');
const MONTHS = +(process.argv[2] || 24), RR = process.argv[3] === 'rr', SEED = +(process.argv[4] || 1);
const html = fs.readFileSync(path.join(__dirname, '..', 'samguk_v109.html'), 'utf8');
const el = () => new Proxy(function () { }, { get: (t, k) => k === Symbol.toPrimitive ? () => '' : (k === 'length' ? 0 : el()), set: () => true, apply: () => el(), construct: () => el() });
function mk(seedIn) {
  const store = {}; let seed = seedIn >>> 0; const rnd = () => { seed = (seed + 0x6D2B79F5) >>> 0; let t = seed; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const M = Object.create(Math); M.random = rnd; const errs = [];
  const ctx = { console: { log() { }, error() { }, warn(...a) { errs.push(a.map(String).join(' ').slice(0, 160)); }, info() { } }, Math: M, Date, JSON, setTimeout: () => 0, clearTimeout() { }, setInterval: () => 0, requestAnimationFrame: () => 0, performance: { now: () => Date.now() },
    localStorage: { getItem: k => store[k] ?? null, setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } }, document: el(), navigator: { userAgent: 'node' }, location: { reload() { } } };
  ctx.window = ctx; vm.createContext(ctx);
  [...html.matchAll(/<script(?: [^>]*)?>([\s\S]*?)<\/script>/g)].forEach((m, i) => { try { vm.runInContext(m[1], ctx, { filename: 'block' + i }); } catch (e) { } });
  ctx.ERRS = errs; return ctx;
}
const ctx = mk(SEED); ctx.MONTHS = MONTHS; ctx.RR = RR;
const out = vm.runInContext(`(() => {
  const lines = []; const say = s => lines.push(s);
  const month = () => { const pend = endMonth(); pend.forEach(d => { try { const r = autoBattle(d.att, d.from, d.to, d.units); if (r.win) C(d.to).food += d.food; else C(d.from).food += d.food; } catch (e) { } }); monthlyUpdate(); };
  ['190', '200'].forEach(sc => {
    newGame('조조', { rand: true, custom: false, scen: sc, diff: 1 }); S.opt.v4Battle = false; // 6c: 시나리오 인자(root_sim.js 와 같은 방식)
    say('== 판 ' + sc + ' (시작 연도 ' + S.y + ') 세력 ' + Object.keys(S.fac).length);
    const fids = Object.keys(S.fac).filter(f => S.fac[f].alive && citiesOf(f).length);
    const ports = f => citiesOf(f).filter(c => trIsPort(c.n)).map(c => c.n), hubs = f => citiesOf(f).filter(c => trIsHub(c.n)).map(c => c.n);
    const inland = fids.filter(f => !ports(f).length), coast = fids.filter(f => ports(f).length);
    say('항구 세력 ' + coast.map(fname).join('·') + ' / 내륙 세력 ' + inland.map(fname).join('·'));
    const probe = f => { const cn = capitalOf(f); const g = gensIn(cn, f).filter(x => !x.acted && !x.away)[0]; const amps = Object.keys(TR_NAT).map(k => k + ' ×' + trAmp(f, k).toFixed(1) + (trNatOpen(f, k) ? '' : '(잠김)')).join(' ');
      const r = g ? trBanq(g.n, 'kor') : { ok: false, msg: '장수 없음' }; const d = trDeal(f, 'jpn', cn, 'buyFor', '은', 10, { v: 0 });
      say('  ' + fname(f) + ' 수도 ' + cn + ' 거점 ' + (hubs(f).join('·') || '없음') + ' | ' + amps + ' | 한도 ' + fmt(trLimit(f, 'kor')) + ' 잉여 ' + fmt(trSurplus(f)) + ' | 친교: ' + (r.ok ? 'OK 교역도 kor ' + trRel(f, 'kor') : 'X ' + r.msg) + ' | 왜 은 매입: ' + (d.ok ? 'OK ' + d.msg.slice(0, 40) : 'X ' + d.msg.slice(0, 50))); };
    (inland.slice(0, 3).concat(coast.slice(0, 2))).forEach(probe);
    // 부상 열림: 합계 150
    const f0 = fids[0]; const T = trT(); T.rel[f0] = { kor: 40, jpn: 40, eeu: 40, weu: 29 }; say('  usa 열림(합 149): ' + trNatOpen(f0, 'usa') + ' → ' + (T.rel[f0].weu = 30, trNatOpen(f0, 'usa')) + ' (합 150)');
    // 뿌리 게이트
    ['경륜', '강병', '상략', '덕화', null].forEach(root => { S.fac[f0].root = root; say('  뿌리 ' + (root || 'null') + ': ' + ['인물', '개성', '병종', '물자', '차익', '용병', '민생', '보급'].map(k => k + (trOpen(f0, k) ? '○' : '×')).join(' ') + ' | 거래 게이트 buyCN:' + (trDealGate(f0, 'buyCN') || '열림') + ' buyFor:' + (trDealGate(f0, 'buyFor') || '열림') + ' food:' + (trDealGate(f0, 'food') || '열림') + ' sellCN:' + (trDealGate(f0, 'sellCN') || '열림')); });
    delete S.fac[f0].root;
    // 6c 갈래 행동 점검: 뿌리마다 교역도 75(2등급 고가품)로 맞추고 각 행동을 한 번씩 불러 본다(점검 뒤 되돌림)
    { const keep = JSON.stringify(S); ['경륜', '강병', '상략', '덕화'].forEach(root => { S.fac[f0].root = root; T.rel[f0] = { kor: 75, jpn: 30, eeu: 30, weu: 30, usa: 0 }; if (root === '강병') trUnits(f0).push('맥궁병');
      citiesOf(f0).forEach(c => { c.gold += 20000; c.food += 60000; }); delete trT().bud[f0]; if (trT().fx) delete trT().fx[f0]; // 이번 달 한도·횟수 다시 계산
      say('  6c ' + root + ': ' + ['drill', 'mat', 'arb', 'lux', 'wel', 'armz'].map(k => { const r = trFxDo(f0, k); return k + (r.ok ? '○ ' + r.msg.slice(0, 60) : '× ' + r.msg.slice(0, 30)); }).join(' | ')); });
      S = JSON.parse(keep); S.fac[f0].root = RT_ASSIGN[f0] || autoRoot(f0); } // 게이트 점검이 지운 뿌리 되돌림
    // AI 진행
    const rootsAll = ['경륜', '강병', '상략', '덕화']; if (RR) fids.forEach((f, i) => { S.fac[f].root = rootsAll[i % 4]; });
    const rc = {}; fids.forEach(f => { const r = S.fac[f].root || '-'; rc[r] = (rc[r] || 0) + 1; }); say('  뿌리 분포 ' + JSON.stringify(rc) + (RR ? ' (rr)' : ' (실제 배정)'));
    const e0 = ERRS.length; for (let i = 0; i < MONTHS; i++) { if (S.fac[S.player].alive) { try { aiTurn(S.player); } catch (e) { } } month(); }
    const rel = fids.filter(f => S.fac[f].alive).map(f => fname(f) + '(' + (S.fac[f].root || '-') + ') ' + Object.keys(TR_NAT).map(k => trRel(f, k)).join('/') + ' 지출 ' + fmt((trT().bud[f] || {}).spent || 0) + ' 병종 ' + trUnits(f).length);
    say('  ' + MONTHS + '개월 뒤 교역도(kor/jpn/eeu/weu/usa)·마지막 달 지출: ' + rel.slice(0, 12).join(' | '));
    const fxs = fids.filter(f => S.fac[f].alive).map(f => { const o = (trT().fx || {})[f] || {}; const cs = citiesOf(f).filter(c => kindOf(c.n) === '도시'); const pt = cs.reduce((s, c) => s + trPopTier(c), 0); const tr = cs.length ? Math.round(cs.reduce((s, c) => s + (c.train || 0), 0) / cs.length) : 0;
      return fname(f) + '(' + (S.fac[f].root || '-') + ') 도시' + cs.length + ' 횟수' + JSON.stringify(o.n || {}) + ' 이익' + JSON.stringify(Object.fromEntries(Object.entries(o.gain || {}).map(([k, v]) => [k, Math.round(v)]))) + ' 투자' + JSON.stringify(o.sink || {}) + ' 고가품' + (o.tier || 0) + '등급 개성' + (o.traits || 0) + ' 병종' + trUnits(f).length + ' 훈련평균' + tr + ' 인구구간' + pt; });
    fxs.forEach(x => say('  [6c] ' + x));
    say('  발견된 외국 인물 ' + Object.values(S.gen).filter(g => g.nat && g.st !== '미등장').length + '명 · 교역 경고 ' + (ERRS.length - e0) + '건' + (ERRS.length - e0 ? ' 예: ' + ERRS.slice(e0, e0 + 3).join(' / ') : ''));
  });
  return lines.join('\\n');
})()`, ctx);
console.log(out); process.exit(0);
