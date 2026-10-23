// 회귀 점검기: UI 경로(미리보기·시트·탭)와 규칙(cmd*)이 어긋나는지, 상한·NaN 이 깨지는지 한 번씩 훑는다. 게임 파일은 고치지 않는다.
// 사용:  node tools/regress_check.js [--out 결과파일] [--only A1,A3] [--game 경로.html] [--json]
//   - 헤드리스 Chrome 에 samguk_v108.html 을 직접 열고(Runtime.evaluate, tools/s7_cdp.js 와 같은 CDP 방식) 게임 전역을 호출한다.
//     s7_harness.html 을 거치지 않는 이유: iframe 없이 let/const 전역(S, UI, ACT)에 바로 닿고 결과를 JSON 으로 받기 위해서.
//   - 판수 최소: newGame('조조') 후 항목마다 한 번씩, 월 끝내기 3번이 가장 오래 걸린다(전체 약 30~60초).
// 점검 항목(ID):
//   A1 명령별 미리보기 vs 실제 (징병 s112DraftSim↔cmdDraft/dsGo, 개발·상업·치수·성벽·시주·진휼·훈련·포상·수련·유학 plan↔run,
//      서원·시설·승급 표시 금액↔지출, 용병 라벨↔지출, 덕화 베풂 미리보기↔파급)
//   A2 상한·범위 불변식 (민충·훈련·내정 0~100, 음수 금지, 월 징병 ≤ 인구 3%(모병가 +30%), BAEPUM.mon/tot, 시설 칸≤등급, 서원≤5)
//   A3 시트/탭 연결 (각 탭 행이 시트를 여는지, 시트 body 에러, devTabM 막대 잔재, ACT 에 없는 죽은 단추, 도달 불가 시트)
//   A4 래퍼 체인 (소스 grep: 함수별 정의·덧씌움 수, 자동(S._auto·AI)/수동(UI) 한정 래퍼 목록)
//   A5 월 끝내기 3번 에러·NaN 스캔 + 끝난 뒤 불변식
// 출력: PASS / WARN / FAIL 표. 전체는 결과 파일(기본 %TEMP%/regress_check.txt)에 저장, 콘솔에는 요약과 FAIL/WARN 만.
//   WARN = 어긋남이 있으나 ±1 반올림 수준이거나 구조상 의심. FAIL = 규칙 위반·에러·불일치.
// 환경: Windows, Chrome 경로는 아래 CH. 종료코드 0=FAIL 없음, 1=FAIL 있음.
const { spawn } = require('child_process'), path = require('path'), fs = require('fs'), os = require('os');
const A = process.argv.slice(2), opt = (k, d) => { const i = A.indexOf(k); return i >= 0 ? A[i + 1] : d; };
const GAME = path.resolve(opt('--game', path.join(__dirname, '..', 'samguk_v108.html'))), OUT = opt('--out', path.join(os.tmpdir(), 'regress_check.txt'));
const ONLY = (opt('--only', '') || '').split(',').filter(Boolean);
const CH = 'C:/Program Files/Google/Chrome/Application/chrome.exe', PORT = 9300 + Math.floor(Math.random() * 500), prof = fs.mkdtempSync(path.join(os.tmpdir(), 'rc-'));

// ---------- A4: 소스 grep (노드 쪽) ----------
function wrapperScan() {
  const L = fs.readFileSync(GAME, 'utf8').split('\n'), NAMES = ['cmdDraft', 'cmdLoy', 'cmdRelief', 'cmdCharity', 'cmdDevelop', 'cmdTrain', 'cmdReward', 'cmdMerc', 'cmdBuild', 'cmdAcademy', 'cmdUpgrade', 'cityAutoRun', 'draftCap', 'devCost', 'openDraft', 'openDevMulti', 'openMerc', 'openFacility', 'endMonth', 'monthlyUpdate'];
  const AUTO = /S\._auto|AI_ECON_CTX|AUTO_DRAFT|!==\s*S\.player|isAI/, MAN = /UI\.f\b|UI\.city|===\s*S\.player|S7\.land|renderSheet|toast\(/;
  const rows = [];
  for (const n of NAMES) {
    const decl = new RegExp('^\\s*(?:async\\s+)?function\\s+' + n + '\\s*\\('), cst = new RegExp('(?:const|let)\\s+\\w+\\s*=\\s*' + n + '\\s*;'), asg = new RegExp('\\b' + n + '\\s*=\\s*function');
    let d = 0, w = 0; const lines = [], scopes = [];
    L.forEach((s, i) => {
      if (s.length > 20000) return;
      if (decl.test(s)) { d++; lines.push(i + 1 + 'D'); return; }
      if (cst.test(s) || (asg.test(s) && !/^\s*\/\//.test(s))) {
        w++; const blk = L.slice(i, i + 8).join('\n').slice(0, 1800); const a = AUTO.test(blk), m = MAN.test(blk);
        const sc = a && !m ? '자동한정' : m && !a ? '수동한정' : a && m ? '둘다분기' : '공통'; scopes.push(sc); lines.push(i + 1 + (sc === '공통' ? '' : '[' + sc + ']'));
      }
    });
    rows.push({ name: n, decl: d, wrap: w, auto: scopes.filter(x => x === '자동한정').length, man: scopes.filter(x => x === '수동한정').length, both: scopes.filter(x => x === '둘다분기').length, lines: lines.join(' ') });
  }
  return rows;
}

// ---------- 페이지 쪽 점검 (Chrome 안에서 실행) ----------
const PAGE = async function (ONLY) {
  const R = [], errs = [];
  window.addEventListener('error', e => errs.push('E:' + String(e.message).slice(0, 120)));
  const oe = console.error; console.error = (...a) => { errs.push('C:' + a.map(String).join(' ').slice(0, 140)); };
  const want = id => !ONLY.length || ONLY.some(o => id.startsWith(o));
  const T = async (id, name, fn) => {
    if (!want(id)) return; errs.length = 0; const t0 = performance.now(); const out = [];
    const rep = (s, d) => out.push({ s, d });
    try { await fn(rep); } catch (e) { out.push({ s: 'FAIL', d: '예외 ' + String(e && e.stack || e).split('\n').slice(0, 2).join(' / ').slice(0, 220) }); }
    if (errs.length) out.push({ s: 'FAIL', d: 'errs: ' + errs.slice(0, 3).join(' ; ') });
    const rank = { FAIL: 2, WARN: 1, PASS: 0 }; const worst = out.reduce((a, x) => rank[x.s] > rank[a] ? x.s : a, 'PASS');
    R.push({ id, name, s: worst, d: out.map(x => (x.s === 'PASS' ? '' : x.s + ': ') + x.d).join(' || ') || '이상 없음', ms: Math.round(performance.now() - t0) });
  };
  const fresh = (root) => { newGame('조조'); UI.scr = 'main'; UI.city = capitalOf(S.player); UI.sheets = []; UI.f = {}; if (root) S.fac[S.player].root = root; render(); const c = C(UI.city); c.gold = 200000; c.food = 200000; return c; };
  const sn = c => ({ gold: c.gold, food: c.food, pop: c.pop, troops: c.troops, loy: c.loy, dev: c.dev, com: c.com, flood: c.flood, def: c.def, train: c.train, acad: c.acad || 0 });
  const body = () => { const t = UI.sheets[UI.sheets.length - 1]; return t ? t.body() : ''; };
  const btns = h => [...h.matchAll(/data-a="([^"]+)" data-v="([^"]*)"/g)].map(m => [m[1], m[2]]);
  const num = s => +String(s).replace(/,/g, '');
  const inv = (tag, rep) => {
    const bad = [], hi = {};
    for (const n in S.city) { const c = S.city[n];
      for (const k of ['pop', 'troops', 'gold', 'food']) { if (c[k] != null && (typeof c[k] !== 'number' || isNaN(c[k]))) bad.push(`${n}.${k}=NaN`); else if (c[k] < 0) bad.push(`${n}.${k}=${c[k]}`); }
      for (const k of ['loy', 'train', 'dev', 'com', 'flood', 'def']) { if (c[k] == null) continue; if (typeof c[k] !== 'number' || isNaN(c[k])) bad.push(`${n}.${k}=NaN`); else if (c[k] < 0 || (k === 'loy' && c[k] > 100.0001) || (k === 'def' && c[k] > devMax(c, '성벽') + 0.001)) bad.push(`${n}.${k}=${c[k]}`); else if (k === 'train' && c[k] > 100.0001) hi.train = Math.max(hi.train || 0, c[k]); }
      if ((c.acad || 0) > 5) bad.push(`${n}.acad=${c.acad}`); if (c.owner && kindOf(n) === '도시' && (c.facs || []).length > gradeOf(c)) bad.push(`${n}.시설 ${(c.facs || []).length}>${gradeOf(c)}`);
      for (const k in c) if (typeof c[k] === 'number' && isNaN(c[k])) bad.push(`${n}.${k}=NaN`); }
    for (const gn in S.gen) { const g = S.gen[gn]; for (const k in g) { if (typeof g[k] === 'number' && isNaN(g[k])) bad.push(`장수 ${gn}.${k}=NaN`); } if (g.loy != null && (g.loy < 0 || g.loy > 100.0001)) bad.push(`장수 ${gn}.loy=${g.loy}`); if (g.st) for (const k in g.st) if (typeof g.st[k] === 'number' && isNaN(g.st[k])) bad.push(`장수 ${gn}.st.${k}=NaN`); }
    if (hi.train) rep('WARN', `[${tag}] 훈련도 ${Math.round(hi.train)} > 100 - 상한 없이 점감만(cmdTrain 5100줄 v*=100/train), 설계 의도 미확인`);
    if (bad.length) rep('FAIL', `[${tag}] 불변식 ${bad.length}건: ` + [...new Set(bad)].slice(0, 6).join(', ')); return bad.length;
  };

  // ===== A1 =====
  await T('A1.1', '징병: s112DraftSim ↔ dsGo(cmdDraft)', rep => {
    for (const w of [1000, 'max']) {
      const c = fresh(); c.loy = 90; openDraft(); const q = w === 'max' ? UI.f.dmax : w; UI.f.dq = q; const pop0 = c.pop; const sim = s112DraftSim(q), b = sn(c); ACT.dsGo(); const a = sn(c);
      const exp = { troops: b.troops + sim.total, gold: b.gold - sim.gold, pop: b.pop - sim.total, loy: sim.loy };
      const diff = ['troops', 'gold', 'pop', 'loy'].filter(k => Math.abs(a[k] - exp[k]) > 1).map(k => `${k} 기대 ${exp[k]} 실제 ${a[k]}`);
      if (diff.length) rep('FAIL', `징병 want=${w}: ` + diff.join(', ')); else rep('PASS', `징병 want=${w} 일치(+${sim.total})`);
      if (a.troops - b.troops > Math.floor(pop0 * 0.03 * 1.3) + 100) rep('FAIL', `월 징병 ${a.troops - b.troops} > 인구 ${pop0} 의 3%(×1.3)`);
      if (w === 'max') { closeAll(); openDraft(); const m2 = UI.f.dmax; const used = a.troops - b.troops; if (used + m2 > Math.floor(pop0 * 0.03 * 1.3) + 100) rep('FAIL', `같은 달 두 번째 징병이 한도를 넘김: 1차 ${used} + 잔여 ${m2} > ${Math.floor(pop0 * 0.03 * 1.3)}`); }
    }
  });
  await T('A1.2', '징병: cmdDraft 직접 호출 월 한도(자동·다른 경로)', rep => {
    const c = fresh(); c.loy = 90; const pop0 = c.pop, t0 = c.troops; let n = 0; for (const g of freeList()) { const r = cmdDraft(c.n, g.n, draftCap(c)); if (r && r.ok) n++; }
    const got = c.troops - t0, lim = Math.floor(pop0 * 0.03 * 1.3);
    if (got > lim + 100) rep('WARN', `cmdDraft 를 장수 ${n}명에게 직접 부르면 한 달 +${got} (인구 3% 한도 ${lim}) — 월 한도(_drN)가 UI 시트(dsGo)에만 있어 AI·자동·다른 호출 경로엔 없음`); else rep('PASS', `cmdDraft 직접 ${n}명 +${got} ≤ ${lim}`);
  });
  const KINDS = [['개발', () => ACT.s7dev('개발'), 'dev'], ['상업', () => ACT.s7dev('상업'), 'com'], ['치수', () => ACT.s7dev('치수'), 'flood'], ['성벽', () => ACT.s7dev('성벽'), 'def'], ['시주', () => ACT.s7dev('시주'), 'loy'], ['진휼', () => ACT.s7dev('진휼'), 'loy'], ['훈련', () => ACT.sub('훈련'), 'train'], ['포상', () => ACT.sub('포상'), null], ['수련', () => ACT.sub('수련'), null], ['유학', () => ACT.sub('유학'), null]];
  for (const [k, op, fld] of KINDS) await T('A1.m.' + k, `${k}: plan(미리보기) ↔ run`, rep => {
    for (const n of [1, 3]) {
      const c = fresh(); c.loy = 50; c.dev = c.com = c.flood = c.def = 20; c.train = 40; op(); const cfg = UI.f.cfg; if (!cfg) { rep('FAIL', '시트에 cfg(openMulti) 없음'); return; }
      const sel = []; for (const x of cfg.list()) { if (sel.length >= n) break; if (!cfg.plan(sel).blocked(x.g.n)) sel.push(x.g.n); }
      const info = String(cfg.plan(sel).info).replace(/<[^>]+>/g, ''); const b = sn(c); const oks = sel.map(g => { const r = cfg.run(g); return r && r.ok; }); const a = sn(c); const bad = []; let lvOff = false;
      let m;
      if (fld && (m = info.match(/→ 약 (\d+)/))) { const d = a[fld] - +m[1]; const dv = ['dev', 'com', 'flood', 'def', 'train'].includes(fld); if (d < 0 || d > (dv ? n : 0)) bad.push(['FAIL', `${fld} 약속 ${m[1]} 실제 ${a[fld]}`]); else if (d) bad.push(['WARN', `${fld} 약속 ${m[1]} 실제 ${a[fld]} (+${d}, ${n}명) - 실행 쪽 무작위·추가 보너스(cmdDevelop R(0,1), cmdTrain 래퍼 6327·6564)가 미리보기에 없음`]); lvOff = d !== 0; }
      if ((m = info.match(/남는 금 ([\d,]+)/)) && Math.abs(a.gold - num(m[1])) > 1) bad.push([lvOff ? 'WARN' : 'FAIL', `금 약속 ${m[1]} 실제 ${a.gold}`]);
      if ((m = info.match(/남는 군량 ([\d,]+)/)) && Math.abs(a.food - num(m[1])) > 1) bad.push(['FAIL', `군량 약속 ${m[1]} 실제 ${a.food}`]);
      if ((m = info.match(/금 ([\d,]+) 소모/)) && Math.abs(b.gold - a.gold - num(m[1])) > 1) bad.push(['FAIL', `금 소모 약속 ${m[1]} 실제 ${b.gold - a.gold}`]);
      if (oks.some(x => !x)) bad.push(['FAIL', `plan 은 통과인데 run 실패 ${oks.join(',')}`]);
      bad.forEach(x => rep(x[0], `${k} n=${n}: ${x[1]}`)); closeAll();
    }
  });
  await T('A1.s', '서원·시설·승급: 표시 금액 ↔ 지출', rep => {
    let c = fresh(); ACT.s7dev('서원'); const ac = acadCost(c); const t = body(); const g0 = c.gold; ACT.acGo(); if (!t.includes(fmt(ac))) rep('FAIL', `서원 시트에 금액 ${fmt(ac)} 표시 없음`); if (g0 - c.gold !== ac) rep('FAIL', `서원 표시 ${ac} 실제 지출 ${g0 - c.gold}`);
    c = fresh(); closeAll(); ACT.s7dev('시설'); UI.f.fac = '농장'; const fc = Math.round(facCost(c) * (1 - cabEff(S.player, '건설') * 0.1)); const g1 = c.gold; ACT.facGo(); if (g1 - c.gold !== fc) rep('FAIL', `시설 표시 ${fc} 실제 지출 ${g1 - c.gold}`);
    c = fresh(); c.pop = 1e6; c.dev = c.com = c.flood = 100; c.loy = 90; const gr = gradeReady(c); if (gr && gr.ok) { openGradeUp(); const bt = body(); const g2 = c.gold; cmdUpgrade(c.n); if (g2 - c.gold !== gr.cost) rep('FAIL', `승급 비용 ${gr.cost} 실제 ${g2 - c.gold}`); if (!bt.includes(fmt(gr.cost))) rep('WARN', `승급 시트에 비용 ${fmt(gr.cost)} 표시 없음`); } else rep('WARN', '승급 조건을 만들지 못해 미확인');
  });
  await T('A1.merc', '용병: 라벨(맡긴다 N명·금) ↔ 실제', rep => {
    const c = fresh(); ACT.sub('용병'); c.troops = Math.max(0, garrisonCap(c) - 500); UI.f.amt = 10000; UI.f.g = freeList()[0].n; renderSheet(); const shown = body(), foot = (document.querySelector('#sheet .shf') || {}).textContent || ''; const b = sn(c); ACT.mcGo(); const a = sn(c), got = a.troops - b.troops;
    if (foot.includes('10,000명') || !foot.includes(fmt(got))) rep('FAIL', `용병 맡긴다 문구 ${foot.trim()} 인데 실제 +${fmt(got)}명 (라벨이 한도 반영 안 함)`);
    if (got !== 500 || b.gold - a.gold !== mercCost(c, 500) && b.gold - a.gold > 0 && false) rep('WARN', `용병 실제 +${got}명`);
  });
  await T('A1.bp', '덕화 베풂: 미리보기 ↔ 파급, BAEPUM.mon/tot', rep => {
    const c = fresh('덕화'); const cn = Object.keys(S.city).find(n => { const x = S.city[n]; return x.owner === S.player && baepumTargets(x).length; }); if (!cn) { rep('WARN', '적 도시와 접한 아군 도시 없음 — 미확인'); return; }
    UI.city = cn; const cc = C(cn); cc.gold = 1e6; cc.food = 1e6; cc.loy = 85; ACT.s7dev('진휼'); const cfg = UI.f.cfg; const sel = []; for (const x of cfg.list()) { if (sel.length >= 8) break; if (!cfg.plan(sel).blocked(x.g.n)) sel.push(x.g.n); }
    const info = String(cfg.plan(sel).info).replace(/<[^>]+>/g, ''); const m = info.match(/민충 −([\d.]+)/); const t0 = baepumTargets(cc), l0 = t0.map(t => t.loy); sel.forEach(g => cfg.run(g));
    const drops = t0.map((t, i) => l0[i] - t.loy), mx = Math.max(...drops);
    if (mx > BAEPUM.mon + 0.001) rep('FAIL', `이달 한 도시 민충 −${mx} > BAEPUM.mon ${BAEPUM.mon}`); else rep('PASS', `이달 최대 −${mx} ≤ ${BAEPUM.mon}`);
    if (m && Math.abs(+m[1] - mx) > 0.11) rep('WARN', `미리보기 베풂 −${m[1]} 실제 최대 −${mx} (도시별 ${drops.map(x => Math.round(x * 10) / 10).join('/')}, 장수 ${sel.length}명)`);
    const bp = baepumBp(rtSt(), rtMo()); if (Object.keys(bp.b || {}).some(k => (bp.b[k] || 0) + ((bp.t || {})[k] || 0) > BAEPUM.tot + 0.001)) rep('FAIL', `누적 한도 BAEPUM.tot ${BAEPUM.tot} 초과`);
  });

  // ===== A2 =====
  await T('A2.1', '상한: 민충·훈련·내정 100 초과/음수 금지 (cmd 직접 호출)', rep => {
    let c = fresh(); c.loy = 99; c.train = 99; c.dev = c.com = c.flood = c.def = 99; for (const g of freeList().slice(0, 6)) { cmdLoy(c.n, g.n, '진휼'); cmdCharity(c.n, g.n); cmdTrain(c.n, g.n); }
    for (const k of ['개발', '상업', '치수', '성벽']) for (const g of freeList().slice(0, 4)) { try { cmdDevelop(c.n, g.n, k); } catch (e) { } } inv('상한 99→', rep);
    c = fresh(); c.gold = 10; c.food = 10; c.loy = 50; for (const g of freeList().slice(0, 6)) { cmdLoy(c.n, g.n, '진휼'); cmdCharity(c.n, g.n); cmdTrain(c.n, g.n); cmdDevelop(c.n, g.n, '개발'); cmdReward(c.n, g.n, 500); } inv('자금 부족', rep); if (c.gold < 0 || c.food < 0) rep('FAIL', `금 ${c.gold} 군량 ${c.food}`);
  });
  await T('A2.4', '보호 장치: 금·군량 0 에서 지출 명령 직접 호출 (음수·무료 실행 금지)', rep => {
    const c = fresh(); const gl = freeList().slice(), nb = ADJ[c.n].map(C).find(x => x && x.owner === S.player), res = [];
    c.gold = 0; c.food = 0; const g0 = () => gl.find(g => !g.acted) || (gl.forEach(g => g.acted = false), gl[0]);
    const tries = { cmdArm: () => cmdArm(c.n, g0().n, '보병'), cmdBuild: () => cmdBuild(c.n, g0().n, '농장'), cmdAcademy: () => cmdAcademy(c.n, g0().n), cmdMerc: () => cmdMerc(c.n, g0().n, 1000), cmdTower: () => cmdTower(c.n), cmdCraft: () => cmdCraft(c.n, g0().n, '목검', 0, false), cmdDraft: () => cmdDraft(c.n, g0().n, 1000), cmdTrain: () => cmdTrain(c.n, g0().n), cmdLoy: () => cmdLoy(c.n, g0().n, '진휼'), cmdCharity: () => cmdCharity(c.n, g0().n), cmdFoodBuy: () => cmdFoodTrade(c.n, 'buy', 5000), cmdFoodSell: () => cmdFoodTrade(c.n, 'sell', 5000), cmdReward: () => cmdReward(c.n, g0().n, 500) };
    for (const k in tries) { const t0 = c.troops; try { const r = tries[k](); if (r && r.ok) res.push(k + '(ok:' + String(r.msg).slice(0, 24) + ')'); } catch (e) { res.push(k + ' 예외 ' + String(e).slice(0, 40)); } }
    if (c.gold < 0 || c.food < 0) rep('FAIL', `금 ${c.gold} 군량 ${c.food} 음수`); if (res.length) rep('WARN', `금·군량 0 인데 성공 처리된 명령: ${res.join(', ')}`);
    if (nb) { c.gold = 100; c.food = 100; c.troops = 100; const r = cmdMove(c.n, nb.n, [], 1e6, 1e6, 1e6); if (c.gold < 0 || c.food < 0 || c.troops < 0 || nb.gold > 1e5) rep('FAIL', `cmdMove 초과 이동 후 음수/복제 ${c.gold}/${c.food}/${c.troops}`); const r2 = cmdMoveAll(c.n, nb.n, [], 5, 1e6, 1e6); if (r2 && r2.ok) rep('FAIL', 'cmdMoveAll 이 보유량 초과 이동을 허용'); }
    inv('보호 장치', rep);
  });
  await T('A2.5', '자동 경로에만 있는 보호: 군량 부족 도시의 수동 징병', rep => {
    const c = fresh(); c.loy = 90; c.food = 0; openDraft(); UI.f.dq = UI.f.dmax; const t0 = c.troops; ACT.dsGo(); const got = c.troops - t0;
    if (got > 0 && foodRoom(c) <= 0) rep('WARN', `군량 0 도시에서 수동 징병 +${got} 가 막히지 않음(자동 경로는 AUTO_DRAFT 6461줄 foodRoom<300 이면 거절, 수동 시트는 미리보기 문구만)`); else rep('PASS', `군량 0 징병 +${got}`);
  });
  await T('A2.6', '훈련도 100 초과 도시에서 훈련해도 값이 줄지 않음(조련가·정예주의)', rep => {
    const c = fresh(); const g = freeList()[0]; g.tr = (g.tr || []).concat('조련가'); c.train = 115; const r = cmdTrain(c.n, g.n);
    if (c.train < 115) rep('FAIL', `조련가가 훈련 115 도시를 훈련시켰더니 ${c.train} 로 깎임 (메시지: ${String(r.msg).slice(0, 50)}) - cmdTrain 래퍼 6564줄 clamp(…,0,100)`);
    const c2 = fresh(); const g2 = freeList()[0]; c2.train = 119; cmdTrain(c2.n, g2.n); if (c2.train < 119) rep('FAIL', `일반 장수 훈련 119→${c2.train}`);
  });
  await T('A2.2', '상한: 시설 칸 ≤ 등급, 서원 ≤ 5', rep => {
    const c = fresh(); const names = ['농장', '시장', '병영', '훈련장', '성채', '창고', '역참', '병기창', '조선소', '공방']; let k = 0;
    for (const f of names) { const g = freeList()[k++ % freeList().length]; if (g) { g.acted = false; cmdBuild(c.n, g.n, f); } }
    for (let i = 0; i < 8; i++) { const g = freeList()[i % freeList().length]; if (g) { g.acted = false; cmdAcademy(c.n, g.n); } }
    if ((c.facs || []).length > gradeOf(c)) rep('FAIL', `시설 ${(c.facs || []).length} > 등급 ${gradeOf(c)}`); if ((c.acad || 0) > 5) rep('FAIL', `서원 ${c.acad} > 5`);
    for (let i = 0; i < 10; i++) if (freeList().length) { UI.city = c.n; ACT.acGo(); } if ((c.acad || 0) > 5) rep('FAIL', `서원 acGo 반복 후 ${c.acad} > 5`);
  });
  await T('A2.3', '상한: 징병 후 인구·병력 음수/주둔 한도', rep => {
    const c = fresh(); c.loy = 100; c.pop = 3000; c.troops = 0; openDraft(); UI.f.dq = UI.f.dmax; ACT.dsGo(); if (c.pop < 0 || c.troops < 0) rep('FAIL', `pop ${c.pop} troops ${c.troops}`);
    if (c.troops > garrisonCap(c) + 100) rep('FAIL', `병력 ${c.troops} > 주둔 한도 ${garrisonCap(c)}`); inv('징병 후', rep);
  });

  // ===== A3 =====
  await T('A3.1', '탭 행 → 시트 연결·에러·devTabM·죽은 단추', rep => {
    const c = fresh(); const dead = new Set(), tabbar = [], empty = []; const probe = (label, fn) => { UI.sheets = []; UI.f = {}; errs.length = 0; try { fn(); } catch (e) { rep('FAIL', `${label}: 예외 ${String(e).slice(0, 80)}`); return; }
      const top = UI.sheets[UI.sheets.length - 1]; if (!top) { empty.push(label); return; } let h = ''; try { h = top.body(); if (top.foot) h += top.foot(); } catch (e) { rep('FAIL', `${label}: body 예외 ${String(e).slice(0, 80)}`); return; }
      if (/data-a="devTabM"/.test(h)) tabbar.push(label + '(devTabM)'); if (/data-a="devTab"/.test(h)) tabbar.push(label + '(devTab)');
      btns(h).forEach(([a]) => { if (typeof ACT[a] !== 'function') dead.add(a + '@' + label); }); if (errs.length) rep('FAIL', `${label}: ${errs.slice(0, 2).join(';')}`); };
    for (const t of ['군사', '인사', '계략']) { const sh = s7Capture(t); const b = sh.body(); btns(b).forEach(([a, v]) => { if (a === 'sub') probe(t + '/' + v, () => ACT.sub(v)); else dead.add(a + '@' + t + '(sub 아님)'); }); }
    ['개발', '상업', '치수', '성벽', '시주', '진휼', '세율', '시설'].forEach(v => probe('내정/' + v, () => ACT.s7dev(v))); probe('국책', () => ACT.s7pol()); probe('교역', () => ACT.cmd('교역')); probe('교역/시장', () => ACT.trOpen());
    ['장수', '도시', '세력', '목표', '도감', '기록'].forEach(v => probe('자료/' + v, () => ACT.info(v))); probe('설정', () => ACT.sys()); probe('노선', () => ACT.rootMenu());
    Object.keys(S.fac).filter(f => f !== S.player).slice(0, 3).forEach(f => probe('외교/' + f, () => ACT.dpT(f)));
    for (const v of ['openWorldTrade', 'openFriend']) { errs.length = 0; UI.sheets = []; try { if (v === 'openFriend') UI.f = { nat: 'kor' }; v === 'openFriend' ? openFriend('kor') : (window[v] ? window[v]() : eval(v + '()')); } catch (e) { rep('FAIL', `${v} 예외 ${e.message}`); } }
    if (tabbar.length) rep('FAIL', `시트 안 내정 탭 막대 잔재: ${tabbar.join(', ')}`); if (dead.size) rep('FAIL', `ACT 에 없는 죽은 단추: ${[...dead].slice(0, 6).join(', ')}`); if (empty.length) rep('WARN', `시트가 안 열리는 행: ${empty.join(', ')}`);
    closeAll();
  });
  await T('A3.2', '내정 탭 행 ↔ 열린 시트 이름·설명 일치', rep => {
    const c = fresh(); S7.tab = '내정'; const h = s7TabBody('내정', c, true); const rows = [...h.matchAll(/data-a="s7dev" data-v="([^"]*)"[^>]*><span class="grow"><b>([^<]*)<\/b>(?:<small>([^<]*)<\/small>)?/g)];
    if (!rows.length) rep('FAIL', '내정 탭 행을 못 찾음');
    rows.forEach(m => { UI.sheets = []; UI.f = {}; ACT.s7dev(m[1]); const t = UI.sheets[UI.sheets.length - 1]; if (!t) { rep('FAIL', `행 '${m[2]}' 시트 안 열림`); return; } const ti = t.title; if (!ti.includes(m[1] === '시설' ? '시설' : m[2])) rep(m[1] === '세율' ? 'WARN' : 'FAIL', `행 '${m[2]}'(${m[1]}) → 시트 '${ti}'`); });
    const fac = rows.find(m => m[1] === '시설'); const desc = fac ? fac[3] || '' : ''; UI.sheets = []; ACT.s7dev('시설'); const fb = body();
    const promised = ['서원', '승급', '공방', '매매'].filter(x => desc.includes(x)); const missing = promised.filter(x => !(x === '서원' ? /facAcad/ : x === '공방' ? /data-v="공방"/ : /__none__/).test(fb));
    if (missing.length) rep('FAIL', `내정 탭 '도시 시설' 설명이 약속한 ${missing.join('·')} 로 갈 단추가 시설 시트에 없음 (설명: ${desc})`); closeAll();
  });
  await T('A3.3', '도달 불가 시트(opener 에 닿는 단추가 없음)', rep => {
    const c = fresh(); const names = ['openGradeUp', 'openCraft', 'openTrade', 'openFacility', 'openMerc', 'openTutor', 'openDrill', 'openMentor', 'openStudy', 'openAppoint', 'openReward', 'openRecruit', 'openAcademy', 'openResearch'];
    const hit = {}; const orig = {}; names.forEach(n => { if (typeof window[n] === 'function') { orig[n] = window[n]; window[n] = function () { hit[n] = 1; return orig[n].apply(this, arguments); }; } });
    const NAV = new Set(['cmd', 'sub', 's7dev', 's7cmd', 'facAcad', 's11mode', 's7pol', 'trOpen', 'info', 'devTab', 'devTabM', 's7tab']); const visited = new Set();
    const walk = (h, depth) => { if (depth > 3) return; for (const [a, v] of btns(h)) { const key = a + ':' + v; if (!NAV.has(a) || visited.has(key)) continue; visited.add(key); UI.sheets = []; UI.f = {}; try { ACT[a](v); } catch (e) { continue; } const t = UI.sheets[UI.sheets.length - 1]; if (t) { let b = ''; try { b = t.body(); } catch (e) { } walk(b, depth + 1); } } };
    S.fac[S.player].root = S.fac[S.player].root || '경륜';
    for (const t of ['군사', '내정', '인사', '외교', '계략', '교역', '자료']) { try { walk(s7TabBody(t, c, true), 0); } catch (e) { } }
    names.forEach(n => { if (orig[n]) window[n] = orig[n]; }); const unreach = names.filter(n => orig[n] && !hit[n]);
    closeAll(); if (unreach.length) rep('FAIL', `탭·시트 단추를 따라 열 수 없는 시트: ${unreach.join(', ')} (devTabM 막대 제거 후 진입 단추 없음 의심)`); else rep('PASS', '모두 도달 가능');
  });

  // ===== A5 =====
  await T('A5', '월 끝내기 3번: 에러·NaN·불변식', rep => {
    fresh(); closeAll(); const y0 = S.y * 12 + S.m; const ms = [];
    for (let i = 0; i < 3; i++) { const t0 = performance.now(); try { closeAll(); endMonth(); UI.queue = []; monthlyUpdate(); UI.scr = 'main'; render(); } catch (e) { rep('FAIL', `월 ${i + 1} 예외 ${String(e && e.stack || e).split('\n').slice(0, 2).join(' / ').slice(0, 200)}`); break; } ms.push(Math.round(performance.now() - t0)); inv('월' + (i + 1), rep); }
    if (S.y * 12 + S.m - y0 < 3) rep('WARN', `달이 ${S.y * 12 + S.m - y0}개월만 진행 — ${ms.join('/')}ms`); else rep('PASS', `3개월 ${ms.join('/')}ms`);
  });
  console.error = oe; return JSON.stringify(R);
};

// ---------- CDP 실행 ----------
const sl = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const t00 = Date.now(); const wrap = wrapperScan();
  const ch = spawn(CH, ['--headless=new', '--disable-gpu', '--allow-file-access-from-files', '--window-size=1000,500', `--remote-debugging-port=${PORT}`, `--user-data-dir=${prof}`, 'about:blank'], { stdio: 'ignore' });
  let R = [], fatal = '';
  try {
    let tabs; for (let i = 0; i < 50; i++) { try { tabs = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json(); if (tabs.length) break; } catch (e) { } await sl(200); }
    const t = tabs.find(x => x.type === 'page'), ws = new WebSocket(t.webSocketDebuggerUrl); let id = 0; const pend = {};
    ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && pend[m.id]) { pend[m.id](m); delete pend[m.id]; } };
    await new Promise(r => ws.onopen = r);
    const cmd = (method, params = {}) => new Promise(r => { const i = ++id; pend[i] = r; ws.send(JSON.stringify({ id: i, method, params })); });
    await cmd('Emulation.setDeviceMetricsOverride', { width: 1000, height: 500, deviceScaleFactor: 1, mobile: false });
    await cmd('Page.navigate', { url: 'file:///' + GAME.replace(/\\/g, '/') }); await sl(4000);
    for (let i = 0; i < 20; i++) { const r = await cmd('Runtime.evaluate', { expression: "typeof newGame==='function'&&typeof ACT==='object'", returnByValue: true }); if (r.result.result.value) break; await sl(500); }
    const r = await cmd('Runtime.evaluate', { expression: `(${PAGE.toString()})(${JSON.stringify(ONLY)})`, awaitPromise: true, returnByValue: true, timeout: 240000 });
    if (r.result.exceptionDetails) fatal = JSON.stringify(r.result.exceptionDetails).slice(0, 600); else R = JSON.parse(r.result.result.value);
    ws.close();
  } catch (e) { fatal = String(e); }
  ch.kill(); setTimeout(() => { try { fs.rmSync(prof, { recursive: true, force: true }); } catch (e) { } }, 500);
  const lines = ['# regress_check ' + new Date().toISOString() + ' game=' + path.basename(GAME), ''];
  if (fatal) lines.push('FATAL ' + fatal);
  if (!ONLY.length || ONLY.some(o => 'A4'.startsWith(o))) {
    const heavy = wrap.filter(w => w.wrap >= 8).map(w => `${w.name}(${w.wrap}겹)`), mixed = wrap.filter(w => w.auto + w.man > 0).map(w => `${w.name}(자동${w.auto}/수동${w.man}/분기${w.both})`);
    R.push({ id: 'A4', name: '래퍼 체인 겹 수·자동/수동 규칙 분리', s: heavy.length ? 'WARN' : 'PASS', ms: 0, d: `덧씌움 8겹 이상: ${heavy.join(', ') || '없음'}; 자동·수동 한정 래퍼가 있는 함수: ${mixed.join(', ')}` });
  }
  lines.push('| ID | 결과 | 항목 | ms | 내용 |', '|---|---|---|---|---|'); R.forEach(x => lines.push(`| ${x.id} | ${x.s} | ${x.name} | ${x.ms} | ${x.d.replace(/\|/g, '/')} |`));
  if (!ONLY.length || ONLY.some(o => 'A4'.startsWith(o))) { lines.push('', '## A4 래퍼 체인 (소스 grep)', '| 함수 | 선언 | 덧씌움 | 자동한정 | 수동한정 | 둘다분기 | 줄 |', '|---|---|---|---|---|---|---|'); wrap.forEach(w => lines.push(`| ${w.name} | ${w.decl} | ${w.wrap} | ${w.auto} | ${w.man} | ${w.both} | ${w.lines} |`)); }
  fs.writeFileSync(OUT, lines.join('\n'), 'utf8');
  const cnt = s => R.filter(x => x.s === s).length;
  console.log(`regress_check: PASS ${cnt('PASS')} / WARN ${cnt('WARN')} / FAIL ${cnt('FAIL')}  (${((Date.now() - t00) / 1000).toFixed(0)}초) → ${OUT}`);
  if (fatal) console.log('FATAL', fatal);
  R.forEach(x => console.log(`${x.s.padEnd(4)} ${x.id.padEnd(8)} ${x.name}${x.s === 'PASS' ? '' : ' :: ' + x.d.slice(0, 260)}`));
  setTimeout(() => process.exit(cnt('FAIL') || fatal ? 1 : 0), 700);
})();
