<script id="world-trade">
// ===== 세계 교역: 관문 도시에서 고구려·왜·서역·대진·부상과 상거래·학습·친교 → 교역도(세력×나라 0~100) → 외국 인물 발견(재야) · 설계: docs/세계교역_설계.md =====
const TR_NAT = {
  kor: { n: '고구려', gates: ['양평', '북평', '동래'], goods: { 인삼: 80, 철: 40 }, want: '도자기', food: true, trait: '산성수비', unit: { n: '맥궁병', f: '궁병' }, banq: ['마을 어른들이 가야금을 뜯으며 술잔을 돌렸다.', '산성 위에서 말린 고기와 탁주로 밤을 보냈다.', '활쏘기 내기에서 져 준 덕에 분위기가 풀렸다.'] },
  jpn: { n: '왜', gates: ['동래', '북해', '오', '회계'], goods: { 은: 100, 일본도: 90 }, want: '비단', food: true, trait: '인술', unit: { n: '사무라이', f: '보병' }, banq: ['바닷가에서 생선을 구워 술을 나눴다. 말은 통하지 않아도 노래는 통했다.', '무사들이 칼춤을 보여 주고 우리 장수가 시를 읊었다.', '섬나라 사절이 거북 등껍질 점을 치며 길조라 했다.'] },
  eeu: { n: '서역', gates: ['무위', '장액'], goods: { 명마: 120, 모피: 60 }, want: '차', trait: '공포', unit: { n: '후사르', f: '기병' }, banq: ['천막 안에서 말젖술을 돌리며 늑대 사냥 이야기를 들었다.', '기마 재주를 겨루고 양고기 꼬치를 나눴다.', '먼 서쪽 성채와 피 묻은 깃발 이야기가 밤새 이어졌다.'] },
  weu: { n: '대진', gates: ['남해', '합포', '교지'], goods: { 유리: 90, 향료: 110 }, want: '비단', trait: '기사도', unit: { n: '원탁기사', f: '기병' }, banq: ['포도주를 처음 맛본 장수가 얼굴이 붉어졌다.', '둥근 탁자에 둘러앉아 서로의 왕 이야기를 나눴다.', '마상 창 시합을 구경하고 상인들과 밤늦게 떠들었다.'] },
  usa: { n: '부상', gates: ['회계', '남해'], goods: { 화약: 130, 담배: 70 }, want: '차', trait: '속사', unit: { n: '총사', f: '궁병' }, far: true, banq: ['동쪽 대양 저편에서 온 사람들과 담배 연기 속에서 패를 돌렸다.', '화약 소리로 밤하늘을 밝히는 축제를 보았다.', '모닥불 가에서 말 타는 법을 서로 가르쳤다.'] }
};
const TR_CN = { 비단: 60, 도자기: 40, 차: 30 }; // 중국 상품 기준가(금/개)
const TR_TIER = [[60, 1], [80, 2], [100, 3]];
const TR_UNIT_FX = { 맥궁병: 1.2, 사무라이: 1.25, 후사르: 1.3, 원탁기사: 1.3, 총사: 1.4 }; // 자동 전투 피해 배율 (V4에서는 절반)
// 외국 인물: [나라, 단계, 이름, 통, 무, 지, 정, 매, 안, 특기, 발견 때 나이]
const TR_GENS = [
  ['kor', 1, '양만춘', 88, 82, 74, 55, 70, 62, ['철벽', '신궁'], 30], ['kor', 1, '계백', 85, 88, 66, 48, 74, 55, ['돌격', '독전'], 28], ['kor', 1, '온달', 74, 86, 52, 40, 72, 45, ['일기', '기습'], 24],
  ['kor', 2, '을지문덕', 94, 80, 92, 78, 82, 80, ['신산', '매복', '지휘'], 34], ['kor', 2, '김유신', 92, 86, 84, 80, 86, 78, ['지휘', '고무', '철벽'], 30], ['kor', 3, '광개토대왕', 98, 92, 80, 88, 96, 85, ['돌격', '지휘', '위압'], 26],
  ['jpn', 1, '핫토리 한조', 70, 88, 78, 40, 60, 70, ['기습', '정찰'], 28], ['jpn', 1, '혼다 다다카쓰', 84, 95, 58, 42, 72, 50, ['무쌍', '일기'], 30], ['jpn', 1, '다케나카 한베에', 76, 45, 94, 82, 70, 80, ['신산', '간파'], 30],
  ['jpn', 2, '사나다 유키무라', 90, 93, 76, 50, 84, 62, ['돌격', '무쌍', '철벽'], 28], ['jpn', 2, '히미코', 72, 30, 90, 92, 98, 88, ['인덕', '명성', '신산'], 35], ['jpn', 3, '오다 노부나가', 97, 85, 92, 90, 88, 94, ['지휘', '위압', '신궁'], 32],
  ['eeu', 1, '후냐디 야노시', 88, 84, 70, 66, 74, 65, ['돌격', '지휘'], 36], ['eeu', 1, '슈테판 대공', 84, 78, 80, 82, 76, 70, ['철벽', '매복'], 33], ['eeu', 1, '에르제베트 바토리', 60, 55, 82, 70, 78, 74, ['화계', '혼란'], 28],
  ['eeu', 2, '스칸데르베그', 93, 90, 82, 70, 84, 72, ['무쌍', '매복', '고무'], 34], ['eeu', 2, '얀 3세 소비에스키', 95, 86, 80, 78, 85, 76, ['돌격', '지휘', '독전'], 36], ['eeu', 3, '블라드 3세', 92, 94, 88, 70, 60, 80, ['위압', '기습', '화계'], 30],
  ['weu', 1, '가웨인', 80, 90, 60, 50, 76, 55, ['일기', '돌격'], 26], ['weu', 1, '트리스탄', 74, 88, 66, 55, 82, 58, ['신궁', '일기'], 25], ['weu', 1, '베디비어', 82, 80, 72, 74, 74, 66, ['호위', '철벽'], 32],
  ['weu', 2, '랜슬롯', 90, 98, 70, 56, 86, 60, ['무쌍', '일기', '돌격'], 28], ['weu', 2, '멀린', 70, 30, 100, 88, 80, 96, ['신산', '간파', '의술'], 50], ['weu', 3, '아서', 98, 93, 80, 86, 98, 84, ['지휘', '고무', '위압'], 28],
  ['usa', 1, '애니 오클리', 62, 88, 66, 50, 80, 60, ['신궁'], 24], ['usa', 1, '와일드 빌 히콕', 70, 90, 62, 45, 68, 58, ['일기', '기습'], 30], ['usa', 1, '닥 홀리데이', 60, 86, 76, 48, 64, 62, ['의술', '기습'], 28],
  ['usa', 2, '와이어트 어프', 86, 92, 70, 66, 78, 70, ['신궁', '위압', '호위'], 30], ['usa', 2, '시팅 불', 90, 78, 86, 74, 92, 80, ['매복', '고무', '인덕'], 40], ['usa', 3, '율리시스 그랜트', 98, 82, 88, 84, 86, 82, ['지휘', '공성', '보급'], 40]
];
// 외국 개성 (TRAITS 에 추가 · 효과는 TR_FX 로 V4 전투에 반영)
Object.assign(TRAITS, { 산성수비: ['교역', '고구려 산성 수비술 · 수비 전투에서 방어 +15%'], 인술: ['교역', '왜의 인술 · 전투에서 지력 +12%·회피 +6%'], 공포: ['교역', '서역의 공포 전술 · 공격·회피 +6%'], 기사도: ['교역', '대진 기사도 · 기병 공격 +10%, 방어 +6%'], 속사: ['교역', '부상 속사 · 궁병 공격 +12%'] });
function TR_FX(u, k) {
  const out = []; try { const g = u.gen && G(u.gen); const tr = (g && g.tr) || [];
    if (k === 'A' && tr.includes('기사도') && u.cls === '기병') out.push(['기사도', 1.1]); if (k === 'D' && tr.includes('기사도')) out.push(['기사도', 1.06]);
    if (k === 'D' && tr.includes('산성수비') && u.side === 'D') out.push(['산성수비', 1.15]);
    if (k === 'A' && tr.includes('속사') && u.cls === '궁병') out.push(['속사', 1.12]);
    if (k === 'I' && tr.includes('인술')) out.push(['인술', 1.12]); if (k === 'E' && tr.includes('인술')) out.push(['인술', 1.06]);
    if ((k === 'A' || k === 'E') && tr.includes('공포')) out.push(['공포', 1.06]);
    if (k === 'A' && u.elite && TR_UNIT_FX[u.eliteName]) out.push([u.eliteName, Math.round((1 + (TR_UNIT_FX[u.eliteName] - 1) / 2) * 100) / 100]); } catch (e) { }
  return out;
}
// ---------- 상태 ----------
function trInit() {
  S.trade = S.trade || {}; const T = S.trade; T.rel = T.rel || {}; T.mk = T.mk || {}; T.unit = T.unit || {}; T.study = T.study || []; T.convoys = T.convoys || [];
  Object.keys(TR_NAT).forEach(k => { T.mk[k] = T.mk[k] || {}; Object.keys(TR_NAT[k].goods).concat(Object.keys(TR_CN), ['군량']).forEach(g => { if (T.mk[k][g] == null) T.mk[k][g] = 1; }); });
  T.mk.cn = T.mk.cn || {}; Object.keys(TR_NAT).forEach(k => Object.keys(TR_NAT[k].goods).forEach(g => { if (T.mk.cn[g] == null) T.mk.cn[g] = 1; }));
  // v1 세이브: 세력 공용 화물(T.cargo[fid]) → 본거지(없으면 첫 관문) 도시 창고로 옮김
  if (T.cargo) { Object.keys(T.cargo).forEach(fid => { const cg = T.cargo[fid] || {}; if (!Object.keys(cg).length || !S.fac[fid]) return; const gates = []; Object.keys(TR_NAT).forEach(k => trGates(fid, k).forEach(c => gates.push(c))); const cn = capitalOf(fid) || gates[0]; if (!cn) return; const dst = trCityCargo(cn); Object.keys(cg).forEach(g => { if (cg[g] > 0) dst[g] = (dst[g] || 0) + cg[g]; }); }); delete T.cargo; }
  TR_GENS.forEach(([nat, tier, n, t, w, i, p, c, a, sk, age]) => {
    if (S.gen[n]) { if (S.gen[n].nat == null) { S.gen[n].nat = nat; S.gen[n].trTier = tier; S.gen[n].trAge = age; } return; }
    const o = makeGen({ n, t, w, i, p, c, a, sk: sk.slice(), loc: TR_NAT[nat].gates[0], born: null, die: 9999, face: randFace(w >= i) });
    o.st = '미등장'; o.appear = '교역'; o.found = false; o.tr = [TR_NAT[nat].trait]; o.nat = nat; o.trTier = tier; o.trAge = age; o.origin = '교역'; o.merit = 0;
    try { o.fm = autoForms(o); } catch (e) { o.fm = ['어린', '방원']; }
    S.gen[n] = o;
  });
  try { trFleetInit(); } catch (e) { console.warn('fleet', e); } // 4단계: 시작 선단(구버전 세이브도 한 번만)
}
{ const f = newGame; newGame = function () { const r = f.apply(this, arguments); try { trInit(); } catch (e) { } return r; }; }
{ const f = postLoad; postLoad = function () { const r = f.apply(this, arguments); try { if (S) trInit(); } catch (e) { } return r; }; }
const trT = () => (S.trade || (trInit(), S.trade));
function trRel(fid, nat) { const T = trT(); return (T.rel[fid] && T.rel[fid][nat]) || 0; }
function trGates(fid, nat) { return TR_NAT[nat].gates.filter(cn => C(cn) && C(cn).owner === fid); }
function trSum(fid) { return Object.keys(TR_NAT).filter(k => !TR_NAT[k].far).reduce((s, k) => s + trRel(fid, k), 0); }
function trOpenOk(fid, nat) { if (!trGates(fid, nat).length) return false; return TR_NAT[nat].far ? trSum(fid) >= 150 : true; }
function trLockWhy(fid, nat) { if (!trGates(fid, nat).length) return `관문(${TR_NAT[nat].gates.join('·')})을 보유해야 합니다`; if (TR_NAT[nat].far && trSum(fid) < 150) return `동쪽 대양 원정 · 다른 나라 교역도 합계 ${trSum(fid)}/150`; return null; }
// ---------- 도시 창고 (v2) : 물건은 도시별 창고 city.cargo = {품목: 수량} 에 쌓인다 ----------
function trCityCargo(cn) { const c = C(cn); return c.cargo = c.cargo || {}; }
function trCityN(cn) { return Object.values(trCityCargo(cn)).reduce((s, v) => s + v, 0); }
function trCityCap(cn) { const c = C(cn); let gr = 2; try { gr = gradeOf(c); } catch (e) { gr = c.tier === 1 ? 4 : c.tier === 2 ? 3 : c.tier === 3 ? 2 : 1; } return 20 + gr * 25 + Math.floor(trClamp(c.com || 0, 0, 150) / 2); } // 등급 2·상업 30 → 85, 등급 5·상업 100 → 195
function trIncoming(cn) { return trT().convoys.filter(v => v.to === cn).reduce((s, v) => s + Object.values(v.cargo).reduce((a, b) => a + b, 0), 0); }
function trCityFree(cn) { return Math.max(0, trCityCap(cn) - trCityN(cn) - trIncoming(cn)); }
function trCargo(fid) { const o = {}; citiesOf(fid).forEach(c => Object.keys(c.cargo || {}).forEach(g => { if (c.cargo[g] > 0) o[g] = (o[g] || 0) + c.cargo[g]; })); return o; } // 세력 전체 합계(읽기 전용)
function trCargoN(fid) { return Object.values(trCargo(fid)).reduce((s, v) => s + v, 0); }
function trCap(fid) { return citiesOf(fid).filter(c => kindOf(c.n) === '도시').reduce((s, c) => s + trCityCap(c.n), 0); }
function trUnits(fid) { const T = trT(); return T.unit[fid] = T.unit[fid] || []; }
const trClamp = (v, a, b) => Math.max(a, Math.min(b, v));
// ---------- 시세 (v2: 도시별) 판매가 = 기본가 × 1.15 × 거리 보너스 × 도시 수요 × 포화도 × 시세 변동 ----------
const TR_CAT = { 유리: 'lux', 향료: 'lux', 은: 'lux', 담배: 'lux', 비단: 'lux', 도자기: 'lux', 차: 'lux', 인삼: 'lux', 명마: 'mil', 철: 'mil', 일본도: 'mil', 화약: 'mil', 모피: 'mil' };
const TR_CAT_N = { lux: '사치품', mil: '군수품' };
// 항구: 바다 쪽 관문(고구려·왜·대진·부상) + 해안 도시(DB 에 해안 표식이 없어 지리로 고름). 서역 관문(무위·장액)은 내륙이라 항구가 아니다
// 다른 나라 특산품을 외국 시장에 팔면(중계무역) 기본가 × reexport · 중국 저자에 팔면 중국 전체 시세(mk.cn)가 개당 mkDrop 내려감
const TR_PORTS = ['양평', '북평', '남피', '북해', '동래', '낭야', '동해', '광릉', '말릉', '오', '회계', '건안', '남해', '합포', '교지'];
const TR_PR = { perHop: 0.1, maxDist: 1.9, satDrop: 0.006, satMin: 0.4, satRec: 0.12, feeLand: 2, feeSea: 3, landPer: 3, reexport: 1.9, mkDrop: 0.0005, risk: { foreign: 0.12, border: 0.04, loss: [0.3, 0.6] } };
function trOrigin(g) { return Object.keys(TR_NAT).find(k => TR_NAT[k].goods[g]) || (TR_CN[g] ? 'cn' : null); }
function trBase(g) { const k = trOrigin(g); return k === 'cn' ? TR_CN[g] : k ? TR_NAT[k].goods[g] : 0; }
function trGoodHops(cn, g) { const k = trOrigin(g); if (!k || k === 'cn') return 0; return Math.min(...TR_NAT[k].gates.map(x => hops(x, cn))); }
function trDistF(cn, g) { return Math.min(TR_PR.maxDist, 1 + TR_PR.perHop * Math.min(trGoodHops(cn, g), 20)); }
function trIsPort(cn) { return TR_PORTS.includes(cn); }
function trIsBig(c) { try { return gradeOf(c) >= 4; } catch (e) { return c.tier === 1; } }
function trIsFrontier(c) { let gr = 2; try { gr = gradeOf(c); } catch (e) { } return c.terr === '산악' || gr <= 1 || (ADJ[c.n] || []).some(x => { const o = C(x); return o && o.owner && o.owner !== c.owner && !allied(c.owner, o.owner); }); }
function trDemand(cn, g) { const c = C(cn); const cat = TR_CAT[g] || 'lux'; const big = trIsBig(c), fr = trIsFrontier(c); const d = cat === 'lux' ? (big ? 1.3 : fr ? 0.85 : 1) : (fr ? 1.25 : big ? 0.9 : 1); return d * (0.85 + trClamp(c.com || 0, 0, 120) / 400); }
function trSatF(cn, g) { const c = C(cn); return (c.sat && c.sat[g] != null) ? c.sat[g] : 1; }
function trSatCity(cn, g, d) { const c = C(cn); c.sat = c.sat || {}; c.sat[g] = trClamp((c.sat[g] == null ? 1 : c.sat[g]) + d, TR_PR.satMin, 1); }
function trPrice(cn, g) { if (TR_CN[g]) return Math.max(1, Math.round(trPBuyCN(cn, g) * 0.85)); return Math.max(1, Math.round(trBase(g) * 1.15 * trDistF(cn, g) * trDemand(cn, g) * trSatF(cn, g) * trMk('cn', g))); } // 그 도시 저자가 사 주는 값
function trPriceParts(cn, g) { return { dist: trDistF(cn, g), hops: trGoodHops(cn, g), demand: trDemand(cn, g), sat: trSatF(cn, g), mk: trMk('cn', g) }; }
function trMk(nat, g) { const T = trT(); return (T.mk[nat] && T.mk[nat][g]) || 1; }
function trPBuyCN(cn, g) { return Math.max(1, Math.round(TR_CN[g] * (1.3 - trClamp(C(cn).com || 0, 0, 100) / 200))); } // 중국 상품을 자기 도시에서 사는 값(상업↑ 싸다)
function trPSellTo(nat, g) { // 그 나라가 사 주는 값: 중국 상품(원하는 것 1.8배) · 다른 나라 특산품은 중계무역으로 1.6배 · 자기 특산품은 안 사 줌(0)
  if (TR_CN[g]) return Math.max(1, Math.round(TR_CN[g] * (TR_NAT[nat].want === g ? 1.8 : 1.25) * trMk(nat, g)));
  const k = trOrigin(g); if (!k || k === nat) return 0; return Math.max(1, Math.round(trBase(g) * TR_PR.reexport * trMk(nat, g)));
}
function trPBuyFor(nat, g) { return Math.max(1, Math.round(TR_NAT[nat].goods[g] * trMk(nat, g))); } // 특산품을 그 나라에서 사는 값
function trPSellCN(cn, g) { return trPrice(cn, g); } // (v1 이름 호환) 특산품을 중국 도시에서 파는 값
function trPFood(nat) { return Math.max(1, Math.round(20 * trMk(nat, '군량'))); } // 군량 100 → 금
function trSat(nat, g, d) { const T = trT(); T.mk[nat] = T.mk[nat] || {}; T.mk[nat][g] = trClamp((T.mk[nat][g] || 1) + d, 0.4, 1.8); }
// ---------- 교역도 · 인물 발견 ----------
function trGain(fid, nat, v, cn) {
  const T = trT(); T.rel[fid] = T.rel[fid] || {}; const old = T.rel[fid][nat] || 0; const nv = trClamp(old + v, 0, 100); T.rel[fid][nat] = nv;
  if (nv > old) trCheck(fid, nat, cn, old, nv); return nv - old;
}
function trCheck(fid, nat, cn, old, nv) {
  TR_TIER.forEach(([th, tier]) => {
    if (old >= th || nv < th) return;
    const gs = Object.values(S.gen).filter(g => g.nat === nat && g.trTier === tier && g.st === '미등장'); if (!gs.length) return;
    gs.forEach(g => { g.st = '재야'; g.found = true; g.loc = cn; g.appear = S.y; g.born = S.y - (g.trAge || 30); g.die = g.born + R(58, 78); g.loy = 70; try { initGrowth(g); } catch (e) { } try { addKn(g.n, 60); } catch (e) { } });
    const names = gs.map(g => g.n).join('·'); const N = TR_NAT[nat];
    if (fid === S.player) { const id = `trade_${nat}_${tier}`; SMETA[id] = ['바다 건너 온 인재', 'field']; storyEvent(id, `${N.n}과(와)의 교역이 깊어져(교역도 ${th}) ${tier === 3 ? '전설의 인물' : '이름난 인물'} ${names}이(가) ${cn}에 머물고 있다는 소식이 왔다. 등용 명령으로 데려올 수 있다.`, gs[0].n); news(`${N.n} 인물 ${names}이(가) ${cn}에 나타났다 (재야).`); }
    else world(`${N.n}에서 온 ${names}이(가) ${cn}에 머물고 있다는 소문이 돈다.`, 2, [cn]);
  });
}
// ---------- 명령 ----------
function trStart(gn) { const g = G(gn); if (!g || g.acted || g.away) return { ok: false, msg: '이 장수는 이번 달 행동할 수 없습니다.' }; g.acted = true; addExp(g, 'p', 10); addExp(g, 'a', 6); return { ok: true, msg: `${gn}이(가) 교역을 시작했다.` }; }
// 도시 저자에 q개를 팔 때 받는 총액(팔수록 포화로 값이 내려감) · 실제로 팔면 apply=true
function trSellCity(cn, g, q, apply) { let tot = 0; const c = C(cn); const sat0 = trSatF(cn, g); let sat = sat0; const step = 10; for (let left = q; left > 0; left -= step) { const n = Math.min(step, left); const p = TR_CN[g] ? trPrice(cn, g) : Math.max(1, Math.round(trBase(g) * 1.15 * trDistF(cn, g) * trDemand(cn, g) * sat * trMk('cn', g))); tot += p * n; sat = trClamp(sat - n * TR_PR.satDrop, TR_PR.satMin, 1); } if (apply) { c.sat = c.sat || {}; c.sat[g] = sat; } return tot; }
function trDeal(fid, nat, cn, kind, g, q, gainBox) {
  const c = C(cn); const cg = trCityCargo(cn); const free = trCityFree(cn); let gold = 0, val = 0, msg = '';
  // 4단계: 외국과 오가는 거래(매도·특산품 매입·군량)는 그 도시에 정박한 쉬는 배(육로 관문은 대상)의 적재량만큼만. 군량은 100 = 1 적재
  const needShip = kind === 'sellTo' || kind === 'buyFor' || kind === 'food'; const sUnit = kind === 'food' ? 100 : 1; let used = null;
  if (needShip) { const capS = trIdleCap(cn); if (capS <= 0) return { ok: false, msg: `${cn}에 쉬는 ${trLandGate(cn) ? '대상' : '배'}이(가) 없습니다. 조선소에서 만들거나 다음 달을 기다리세요.` }; q = Math.min(q, capS * sUnit); }
  if (kind === 'buyCN') { const p = trPBuyCN(cn, g); q = Math.min(q, Math.floor(c.gold / p), free); if (q <= 0) return { ok: false, msg: c.gold < p ? '금이 부족합니다.' : `${cn} 창고가 가득 찼습니다 (${trCityN(cn)}/${trCityCap(cn)}).` }; gold = -p * q; cg[g] = (cg[g] || 0) + q; msg = `${g} ${q}개를 금 ${fmt(-gold)}에 사들여 ${cn} 창고에 넣었다.`; }
  else if (kind === 'sellTo') { q = Math.min(q, cg[g] || 0); if (q <= 0) return { ok: false, msg: `${cn} 창고에 ${g}이(가) 없습니다.` }; const p = trPSellTo(nat, g); if (!p) return { ok: false, msg: `${TR_NAT[nat].n}은(는) 자기 나라 ${g}을(를) 사지 않습니다.` }; gold = p * q; val = gold; cg[g] -= q; trSat(nat, g, -q * 0.004); msg = `${TR_NAT[nat].n} 상인이 ${g} ${q}개를 금 ${fmt(gold)}에 사 갔다.${!TR_CN[g] ? ' (중계무역)' : ''}`; }
  else if (kind === 'buyFor') { const p = trPBuyFor(nat, g); q = Math.min(q, Math.floor(c.gold / p), free); if (q <= 0) return { ok: false, msg: c.gold < p ? '금이 부족합니다.' : `${cn} 창고가 가득 찼습니다 (${trCityN(cn)}/${trCityCap(cn)}).` }; gold = -p * q; val = -gold; cg[g] = (cg[g] || 0) + q; trSat(nat, g, q * 0.002); msg = `${TR_NAT[nat].n}의 ${g} ${q}개를 금 ${fmt(-gold)}에 사들여 ${cn} 창고에 넣었다.`; }
  else if (kind === 'sellCN') { q = Math.min(q, cg[g] || 0); if (q <= 0) return { ok: false, msg: `${cn} 창고에 ${g}이(가) 없습니다.` }; gold = trSellCity(cn, g, q, true); cg[g] -= q; if (!TR_CN[g]) trSat('cn', g, -q * TR_PR.mkDrop); msg = `${cn} 저자에서 ${g} ${q}개를 금 ${fmt(gold)}에 팔았다.`; }
  else if (kind === 'food') { if (!TR_NAT[nat].food) return { ok: false, msg: '이 나라는 군량을 사지 않습니다.' }; q = Math.min(q, c.food - 1000); if (q < 100) return { ok: false, msg: '군량은 1,000을 남기고 100 이상 팔 수 있습니다.' }; q = Math.floor(q / 100) * 100; const p = trPFood(nat); gold = Math.round(p * q / 100); val = gold; c.food -= q; trSat(nat, '군량', -q / 100 * 0.004); msg = `군량 ${fmt(q)}을(를) ${TR_NAT[nat].n}에 금 ${fmt(gold)}에 넘겼다.`; }
  c.gold += gold; if (cg[g] != null && cg[g] <= 0) delete cg[g];
  if (needShip && q > 0) { used = trUseShips(cn, Math.ceil(q / sUnit), TR_NAT[nat] && TR_NAT[nat].far ? 2 : 1); if (used) msg += ` ${trLandGate(cn) ? '대상' : '배'} ${used.length}척 사용.`; }
  let gain = 0; if (val > 0) { gain = trClamp(Math.ceil(val / 300), 1, 6); if (gainBox) { gain = Math.min(gain, Math.max(0, 10 - gainBox.v)); gainBox.v += gain; } gain = trGain(fid, nat, gain, cn); }
  return { ok: true, msg: msg + (gain ? ` 교역도 +${gain}.` : '') };
}
function trStudy(gn, nat, kind) {
  const g = G(gn); const c = C(g.loc); const fid = g.fac; const N = TR_NAT[nat]; const rel = trRel(fid, nat);
  if (g.acted || g.away) return { ok: false, msg: '이 장수는 이번 달 행동할 수 없습니다.' };
  if (kind === '개성') { if (rel < 20) return { ok: false, msg: '교역도 20 이상이어야 합니다.' }; if (hasTr(g, N.trait)) return { ok: false, msg: `${gn}은(는) 이미 ${N.trait}을(를) 익혔습니다.` }; }
  else { if (rel < 40) return { ok: false, msg: '교역도 40 이상이어야 합니다.' }; if (trUnits(fid).includes(N.unit.n)) return { ok: false, msg: `${N.unit.n}은(는) 이미 해금되었습니다.` }; }
  const mo = kind === '개성' ? 2 : 3, cost = kind === '개성' ? 300 : 800;
  if (!spend(c, cost)) return { ok: false, msg: `금이 부족합니다 (${cost} 필요).` };
  g.away = { type: '학습', left: mo, dest: N.n }; g.acted = true; trT().study.push({ g: gn, nat, kind, left: mo, cn: g.loc, fid });
  const gn2 = trGain(fid, nat, 4, g.loc);
  return { ok: true, msg: `${gn}이(가) ${N.n}(으)로 ${mo}개월 학습을 떠났다 (${kind === '개성' ? N.trait : N.unit.n}). 교역도 +${gn2}.` };
}
function trBanq(gn, nat) {
  const g = G(gn); const c = C(g.loc); const fid = g.fac; const N = TR_NAT[nat];
  if (g.acted || g.away) return { ok: false, msg: '이 장수는 이번 달 행동할 수 없습니다.' };
  if (!spend(c, 200)) return { ok: false, msg: '금이 부족합니다 (200 필요).' };
  g.acted = true; addExp(g, 'c', 20); const v = trGain(fid, nat, 3 + Math.floor(stat(g, 'c') / 40), g.loc);
  return { ok: true, msg: `${gn}이(가) ${N.n} 사람들과 술자리를 열었다. ${pick(N.banq)} 교역도 +${v}.` };
}
// ---------- 수송 (v2): 육로(길 따라 몇 달, 적 접경 약탈) · 연안 항로(항구끼리 1개월, 약탈 없음) · S.trade.convoys ----------
function trHostile(fid, o) { return !!(o && o.owner && o.owner !== fid && !allied(fid, o.owner)); }
function trPath(fid, a, b) { // 최단 경로(내 도시를 우선 지남)
  const path = [a]; let x = a, guard = 0; while (x !== b && guard++ < 40) { const h = hops(x, b); const nx = (ADJ[x] || []).filter(y => hops(y, b) === h - 1); if (!nx.length) return null; nx.sort((p, q) => (C(q).owner === fid ? 1 : 0) - (C(p).owner === fid ? 1 : 0)); x = nx[0]; path.push(x); } return x === b ? path : null;
}
function trRoute(fid, from, to, mode) {
  if (from === to) return { ok: false, why: '같은 도시입니다.' }; const t = C(to); if (!t || t.owner !== fid) return { ok: false, why: '내 도시로만 보낼 수 있습니다.' }; if (kindOf(to) !== '도시') return { ok: false, why: '관문·나루에는 창고가 없습니다.' };
  const sea = trIsPort(from) && trIsPort(to); const h = hops(from, to); if (!mode) mode = sea ? 'sea' : 'land';
  if (mode === 'sea') { if (!sea) return { ok: false, why: '두 도시가 모두 항구여야 합니다.' }; return { ok: true, mode, mo: 1, hops: h, path: [from, to], risk: 0, feeU: TR_PR.feeSea, sea }; }
  if (h >= 99) return { ok: false, why: '길이 이어져 있지 않습니다.' }; const path = trPath(fid, from, to); if (!path) return { ok: false, why: '길을 찾지 못했습니다.' };
  let safe = 1; const danger = []; path.slice(1, -1).forEach(x => { const o = C(x); if (trHostile(fid, o)) { safe *= 1 - TR_PR.risk.foreign; danger.push(x + '(타국)'); } else if ((ADJ[x] || []).some(y => trHostile(fid, C(y)))) { safe *= 1 - TR_PR.risk.border; danger.push(x); } });
  return { ok: true, mode, mo: Math.max(1, Math.ceil(h / TR_PR.landPer)), hops: h, path, risk: Math.round((1 - safe) * 100) / 100, danger, feeU: TR_PR.feeLand * h, sea };
}
function trPlunderMod(v) { return 1; } // 6단계 훅: 호송 장수(v.gen)의 통솔로 약탈 확률을 줄인다
function trShip(fid, from, to, cargo, mode, gn) {
  let r = trRoute(fid, from, to, mode); if (!r.ok) return { ok: false, msg: r.why }; const src = trCityCargo(from); const c = C(from);
  const load = {}; Object.keys(cargo || {}).forEach(g => { const q = Math.min(Math.floor(cargo[g] || 0), src[g] || 0); if (q > 0) load[g] = q; }); const n = Object.values(load).reduce((s, v) => s + v, 0);
  if (!n) return { ok: false, msg: '보낼 물건이 없습니다.' }; const free = trCityFree(to); if (n > free) return { ok: false, msg: `${to} 창고 빈자리가 ${free}칸뿐입니다 (오는 중인 화물 포함).` };
  // 4단계: 항로 수송은 출발 항구의 쉬는 배에 실을 만큼만. 방식을 정하지 않았으면(AI) 배가 모자랄 때 육로로 돌린다
  if (r.mode === 'sea' && trIdleCap(from) < n) { const alt = !mode && hops(from, to) < 99 ? trRoute(fid, from, to, 'land') : null; if (alt && alt.ok) r = alt; else return { ok: false, msg: `${from}에 쉬는 배 적재량이 ${trIdleCap(from)}뿐입니다 (${n} 필요). 조선소에서 배를 만들거나 육로로 보내세요.` }; }
  const fee = r.feeU * n; if (c.gold < fee) return { ok: false, msg: `수송비 금 ${fmt(fee)}이(가) 부족합니다.` };
  let g = null; if (gn) { g = G(gn); if (!g || g.acted || g.away) return { ok: false, msg: '이 장수는 이번 달 행동할 수 없습니다.' }; g.acted = true; addExp(g, 't', 6); }
  c.gold -= fee; Object.keys(load).forEach(k => { src[k] -= load[k]; if (src[k] <= 0) delete src[k]; });
  let ships = null; if (r.mode === 'sea') { const used = trUseShips(from, n, 1) || []; const fl = trFleet(from); used.forEach(s => { const i = fl.indexOf(s); if (i >= 0) fl.splice(i, 1); }); ships = used.map(s => ({ t: s.t, id: s.id })); } // 배는 화물과 함께 떠나 도착 항구에 정박
  trT().convoys.push({ from, to, fac: fid, cargo: load, left: r.mo, mode: r.mode, risk: r.risk, path: r.path, gen: gn || null, ships, y: S.y, m: S.m });
  return { ok: true, msg: `${from} → ${to} ${r.mode === 'sea' ? '연안 항로' : '육로'}로 화물 ${n}개 출발 (${r.mo}개월, 수송비 ${fmt(fee)}${ships ? `, 배 ${ships.length}척` : ''}${r.risk ? `, 약탈 위험 ${Math.round(r.risk * 100)}%` : ''}).`, mo: r.mo, mode: r.mode };
}
function trConvoyTick() {
  const T = trT(); T.convoys = T.convoys.filter(v => {
    if (--v.left > 0) return true; let tgt = C(v.to); if (!tgt || tgt.owner !== v.fac) { const own = citiesOf(v.fac).filter(c => kindOf(c.n) === '도시').sort((a, b) => hops(v.to, a.n) - hops(v.to, b.n)); tgt = own[0]; } if (!tgt) return false;
    let lost = ''; if (v.risk > 0 && Math.random() < v.risk * trPlunderMod(v)) { const r = TR_PR.risk.loss[0] + Math.random() * (TR_PR.risk.loss[1] - TR_PR.risk.loss[0]); Object.keys(v.cargo).forEach(g => { v.cargo[g] -= Math.round(v.cargo[g] * r); if (v.cargo[g] <= 0) delete v.cargo[g]; }); lost = ` 도중에 약탈을 당해 ${Math.round(r * 100)}%를 잃었다.`; }
    const dst = trCityCargo(tgt.n); Object.keys(v.cargo).forEach(g => { dst[g] = (dst[g] || 0) + v.cargo[g]; });
    if (v.ships && v.ships.length) { let port = trIsPort(tgt.n) ? tgt.n : null; if (!port) { const ps = citiesOf(v.fac).filter(c => trIsPort(c.n)).sort((a, b) => hops(tgt.n, a.n) - hops(tgt.n, b.n)); port = ps[0] ? ps[0].n : null; } if (port) v.ships.forEach(s => trFleet(port).push({ t: s.t, id: s.id, busy: 0 })); } // 배는 도착 항구에 정박(항구를 잃었으면 가장 가까운 내 항구)
    const desc = Object.entries(v.cargo).map(([g, n]) => `${g} ${n}`).join('·') || '아무것도';
    if (v.fac === S.player) news(`${v.from}에서 보낸 화물(${desc})이 ${tgt.n}에 도착했다.${tgt.n !== v.to ? ` (${v.to}을(를) 잃어 방향을 돌림)` : ''}${lost}`);
    else try { Object.keys(v.cargo).forEach(g => { if (!TR_CN[g]) trDeal(v.fac, null, tgt.n, 'sellCN', g, 1e9); }); } catch (e) { } // AI 는 도착한 특산품을 그 도시 저자에 바로 판다
    return false;
  });
}
// ---------- AI (v2): 관문 도시에서 중국 상품 → 외국 매도, 특산품은 값 좋은 자기 도시로 수송 ----------
function trAiTrade(fid) {
  const box = { v: 0 }; let sold = 0;
  Object.keys(TR_NAT).forEach(nat => {
    const gs = trGates(fid, nat); if (!gs.length || !trOpenOk(fid, nat)) return; const cn = gs.sort((a, b) => (C(b).com || 0) - (C(a).com || 0))[0]; const c = C(cn); const N = TR_NAT[nat]; if (c.gold < 3000) return;
    const capS = trIdleCap(cn); if (capS <= 0) return; // 4단계: 쉬는 배 적재량 안에서. 절반은 중국 상품 매도, 나머지는 특산품 매입에 쓴다
    const q1 = Math.min(40, trCityFree(cn), capS >= 40 ? Math.ceil(capS / 2) : capS); if (q1 > 0 && trDeal(fid, nat, cn, 'buyCN', N.want, q1, box).ok) trDeal(fid, nat, cn, 'sellTo', N.want, 1e9, box);
    if (c.gold < 3000 || sold >= 2 || trIdleCap(cn) < 10) return;
    const dsts = citiesOf(fid).filter(o => kindOf(o.n) === '도시' && o.n !== cn && hops(cn, o.n) >= 3 && trCityFree(o.n) >= 20).slice(0, 12); let best = null;
    Object.keys(N.goods).forEach(g => dsts.forEach(o => { const r = trRoute(fid, cn, o.n); if (!r.ok || r.risk > 0.3) return; const q = Math.min(30, trCityFree(cn), trCityFree(o.n), trIdleCap(cn)); const net = (trSellCity(o.n, g, q, false) - trPBuyFor(nat, g) * q - r.feeU * q); if (q >= 10 && net > 600 && (!best || net > best.net)) best = { g, to: o.n, q, net }; }));
    if (best && trDeal(fid, nat, cn, 'buyFor', best.g, best.q, box).ok) { trShip(fid, cn, best.to, { [best.g]: best.q }); sold++; }
  });
  citiesOf(fid).forEach(c => { if (!c.cargo || !P(25)) return; Object.keys(c.cargo).forEach(g => { if (!TR_CN[g] && !Object.keys(TR_NAT).some(k => TR_NAT[k].gates.includes(c.n))) trDeal(fid, null, c.n, 'sellCN', g, 1e9); }); }); // 관문이 아닌 도시에 남은 특산품은 가끔 처분
}
// ---------- 매달 ----------
function trMonthly() {
  const T = trT();
  Object.keys(T.mk).forEach(k => Object.keys(T.mk[k]).forEach(g => { T.mk[k][g] = trClamp(T.mk[k][g] + (1 - T.mk[k][g]) * 0.15 + (Math.random() * 0.2 - 0.1), 0.4, 1.8); }));
  T.study = T.study.filter(s => {
    const g = G(s.g); if (!g || g.st !== '현역' || !g.away || g.away.type !== '학습') return false;
    s.left--; g.away.left = s.left; if (s.left > 0) return true;
    g.away = null; const N = TR_NAT[s.nat]; const fid = g.fac; let got = '';
    if (s.kind === '개성') { g.tr = g.tr || []; if (!g.tr.includes(N.trait)) g.tr.push(N.trait); got = `개성 ${N.trait}`; }
    else { if (!trUnits(fid).includes(N.unit.n)) trUnits(fid).push(N.unit.n); got = `특수 병종 ${N.unit.n}(${N.unit.f}) 해금`; }
    const cn = C(s.cn).owner === fid ? s.cn : (capitalOf(fid) || g.loc); g.loc = cn; trGain(fid, s.nat, 8, cn);
    if (fid === S.player) news(`${g.n}이(가) ${N.n} 학습을 마치고 ${cn}으로 돌아왔다: ${got}. 교역도 +8.`);
    return false;
  });
  Object.values(S.city).forEach(c => { if (c.sat) Object.keys(c.sat).forEach(g => { c.sat[g] = trClamp(c.sat[g] + TR_PR.satRec, TR_PR.satMin, 1); if (c.sat[g] >= 1) delete c.sat[g]; }); }); // 도시 포화 회복
  trConvoyTick();
  try { trShipMonthly(); } catch (e) { console.warn('ships', e); } // 4단계: 배 휴식·건조·유지비·AI 건조
  Object.keys(S.fac).forEach(fid => {
    if (fid === S.player || !S.fac[fid].alive) return;
    Object.keys(TR_NAT).forEach(nat => {
      const gs = trGates(fid, nat); if (!gs.length || !trOpenOk(fid, nat)) return;
      const cn = gs.sort((a, b) => (C(b).com || 0) - (C(a).com || 0))[0];
      trGain(fid, nat, 2 + ((C(cn).com || 0) >= 40 ? 1 : 0) + (gs.length > 1 ? 1 : 0), cn);
      if (trRel(fid, nat) >= 40 && !trUnits(fid).includes(TR_NAT[nat].unit.n) && P(20)) { trUnits(fid).push(TR_NAT[nat].unit.n); world(`${fname(fid)}이(가) ${TR_NAT[nat].n}에서 ${TR_NAT[nat].unit.n} 전술을 들여왔다.`, 2, [cn]); }
    });
    try { trAiTrade(fid); } catch (e) { console.warn('trAi', e); }
  });
}
{ const f = monthlyUpdate; monthlyUpdate = function () { const r = f.apply(this, arguments); try { trMonthly(); } catch (e) { console.warn('trade', e); } return r; }; }
// ---------- 특수 병종: ELITE_REG 방식 · 세력 단위 해금 ----------
{ const f = eliteName; eliteName = function (cn, fl) { try { const o = C(cn) && C(cn).owner; if (o && S.trade) { const k = Object.keys(TR_NAT).find(k => TR_NAT[k].unit.f === fl && trUnits(o).includes(TR_NAT[k].unit.n)); if (k) return TR_NAT[k].unit.n; } } catch (e) { } return f.apply(this, arguments); }; }
{ const f = calcDmgX; calcDmgX = function (a, d, ranged, why) { let v = f.apply(this, arguments); if (a && a.elite && TR_UNIT_FX[a.eliteName]) v = Math.round(v * TR_UNIT_FX[a.eliteName]); return v; }; }
{ const f = applyElite; applyElite = function (units, fromCn, idx) { const fee = f.apply(this, arguments); try { if (fee) { const c = C(fromCn); const ex = units.filter(u => u.elite && u.eliteName === '총사').reduce((s, u) => s + Math.round(eliteFee(fromCn, u) * 0.5), 0); if (ex && c.gold >= ex) { c.gold -= ex; return fee + ex; } } } catch (e) { } return fee; }; }
// ---------- UI ----------
{ const f = render; render = function () { const r = f.apply(this, arguments); try { if (UI.scr === 'main' && UI.city && C(UI.city) && C(UI.city).owner === S.player && S.trade && kindOf(UI.city) === '도시') { const nats = Object.keys(TR_NAT).filter(k => TR_NAT[k].gates.includes(UI.city)); const cmds = document.querySelector('[data-a="cmd"]'); const box = cmds && cmds.parentElement; const inc = trIncoming(UI.city); const st = `창고 ${trCityN(UI.city)}/${trCityCap(UI.city)}${inc ? ` (+${inc} 오는 중)` : ''}${trIsPort(UI.city) ? ' · 항구' : ''}${trHarbor(UI.city) ? ` · ${trLandGate(UI.city) ? '대상' : '배'} ${trFleet(UI.city).length}척` : ''}`; if (box && !document.querySelector('#app .trbar')) box.insertAdjacentHTML('afterend', `<button type="button" class="opsbar trbar" data-a="trOpen"><span><b>교역</b> ${nats.length ? nats.map(k => `${TR_NAT[k].n} ${trOpenOk(S.player, k) ? '교역도 ' + trRel(S.player, k) : '잠김'}`).join(' · ') + ' · ' : ''}${st}</span><span>›</span></button>`); } } catch (e) { } return r; }; }
function trBar(v) { return `<div class="bar" style="height:9px;margin:4px 0"><span style="width:${v}%;background:${v >= 60 ? '#ffd84a' : '#6aa0c8'}"></span></div>`; }
function trStoreHtml(cn) { // 도시 창고 요약 + 오는 중인 화물
  const cg = trCityCargo(cn); const inc = trT().convoys.filter(v => v.to === cn && v.fac === S.player); const out = trT().convoys.filter(v => v.from === cn && v.fac === S.player);
  const items = Object.entries(cg).filter(([g, n]) => n > 0).map(([g, n]) => `${g} ${n}<small class="dim">(${TR_CN[g] ? '중국' : TR_NAT[trOrigin(g)].n}·${TR_CAT_N[TR_CAT[g]] || ''} · 저자 ${trPrice(cn, g)}금)</small>`).join(' · ') || '비어 있음';
  const conv = inc.concat(out).map(v => `<div class="dim sm">${v.from} → ${v.to} ${v.mode === 'sea' ? '항로' : '육로'} · ${Object.entries(v.cargo).map(([g, n]) => g + ' ' + n).join('·')} · ${v.left}개월 뒤${v.risk ? ` · 약탈 위험 ${Math.round(v.risk * 100)}%` : ''}</div>`).join('');
  const fl = trHarbor(cn) ? ` · ${trLandGate(cn) ? '대상' : '배'} ${trFleet(cn).length}척 (쉬는 적재 ${trIdleCap(cn)})` : '';
  return `<div class="kv">${cn} 창고 ${trCityN(cn)}/${trCityCap(cn)}${trIsPort(cn) ? ' · 항구' : ''}${fl}</div><div class="pn sm">${items}</div>${conv}`;
}
function openWorldTrade() {
  const nats = Object.keys(TR_NAT).filter(k => TR_NAT[k].gates.includes(UI.city)); const fid = S.player;
  UI.f = { nat: nats.find(k => trOpenOk(fid, k)) || nats[0] || null };
  openSheet(`${UI.city} · 교역`, () => {
    const hb = trHarbor(UI.city); const tools = `<div class="grid${hb ? 4 : 3}">${btn('상거래<small>사고 팔기</small>', 'trMode', '상거래')}${btn('시세표<small>도시별 판매가</small>', 'trMode', '시세표')}${btn('수송<small>육로·항로</small>', 'trMode', '수송', { dis: !trCityN(UI.city) })}${hb ? btn(`조선소<small>${trLandGate(UI.city) ? '대상' : '배'} ${trFleet(UI.city).length}척 · 건조</small>`, 'trMode', '조선소') : ''}</div>`;
    if (!nats.length) return `<div class="dim sm">관문 도시가 아니어서 외국 상인은 오지 않습니다. 창고 물건을 이 도시 저자에 팔거나(상거래), 다른 도시로 옮길 수 있습니다(수송).</div>${trStoreHtml(UI.city)}${tools}`;
    const k = UI.f.nat, N = TR_NAT[k], rel = trRel(fid, k), why = trLockWhy(fid, k);
    const tabs = `<div class="grid${trClamp(nats.length, 2, 4)}">${nats.map(n => btn(`${TR_NAT[n].n}<small>${trOpenOk(fid, n) ? '교역도 ' + trRel(fid, n) : '잠김'}</small>`, 'trNat', n, { p: n === k, s: 1 })).join('')}</div>`;
    const steps = [[20, `학습: 개성 ${N.trait}`], [40, `학습: 특수 병종 ${N.unit.n}`], [60, '1단계 인물 3명 발견'], [80, '2단계 인물 2명 발견'], [100, '전설 인물 발견']].map(([t, d]) => `<div class="${rel >= t ? '' : 'dim'} sm">${rel >= t ? '✓' : '○'} ${t} · ${d}</div>`).join('');
    const found = Object.values(S.gen).filter(g => g.nat === k && g.st !== '미등장').map(g => `${g.n}(${g.st === '현역' ? fname(g.fac) : g.st})`).join(', ');
    return `${tabs}<div class="pn"><b>${N.n}</b> · 교역도 ${rel}/100${trBar(rel)}<small>특산품 ${Object.keys(N.goods).join('·')} · 원하는 중국 상품 ${N.want}${N.food ? ' · 군량도 사 줌' : ''} · 특수 병종 ${N.unit.n}(${N.unit.f})${trUnits(fid).includes(N.unit.n) ? ' 해금' : ''}</small></div>
    ${why ? `<div class="warn sm">${why}</div>` : ''}<div class="kv">단계</div>${steps}${found ? `<div class="dim sm">발견된 인물: ${found}</div>` : ''}
    ${trStoreHtml(UI.city)}${tools}
    <div class="grid2">${btn('학습<small>2~3개월 사절</small>', 'trMode', '학습', { dis: !!why || rel < 20 })}${btn('친교<small>금 200 · 교역도↑</small>', 'trMode', '친교', { dis: !!why })}</div>`;
  });
}
ACT.trOpen = () => openWorldTrade();
ACT.trNat = v => { UI.f.nat = v; renderSheet(); };
ACT.trMode = v => ({ 상거래: openTrMarket, 학습: openTrStudy, 친교: openTrBanq, 시세표: openTrPrices, 수송: openTrShip, 조선소: openTrYard }[v])();
ACT.trPick = v => { UI.f.g = v; renderSheet(); };
function trGenList(sel) { const gs = freeList().filter(g => !isRuler(g) || UI.f.mode === '상거래'); return gs.length ? gs.sort((a, b) => stat(b, 'p') + stat(b, 'c') - stat(a, 'p') - stat(a, 'c')).map(g => genRow(g, `정${stat(g, 'p')} 매${stat(g, 'c')}`, 'trPick', g.n, sel === g.n)).join('') : noGen(); }
function openTrMarket() {
  const nat = UI.f.nat || null; UI.f = { nat, g: null, mode: '상거래', ses: false, gain: { v: 0 } }; const N = nat && TR_NAT[nat];
  openSheet(`${N ? N.n : UI.city} · 상거래`, () => {
    const fid = S.player, cn = UI.city, c = C(cn), cg = trCityCargo(cn);
    if (!UI.f.ses) return `<div class="kv">거래를 맡길 장수 (행동 1회 · 거래는 여러 번 가능)</div>${trGenList(UI.f.g)}`;
    const qb = (kind, g, qs) => qs.map(q => btn(q === 'all' ? '전부' : q, 'trDeal', `${kind}|${g}|${q}`, { s: 1 })).join('');
    const rows = [];
    if (!N) { // 관문이 아닌 도시: 중국 상품 매입 + 창고 특산품을 저자에 판다
      rows.push(`<div class="kv">중국 상품 · ${cn}에서 사서 관문 도시로 보낸다</div>`);
      Object.keys(TR_CN).forEach(g => rows.push(`<div class="pn"><b>${g}</b> 창고 ${cg[g] || 0}<small>매입 ${trPBuyCN(cn, g)}금/개 · 되팔기 ${trPrice(cn, g)}금/개</small><div class="grid4">${qb('buyCN', g, [10, 50])}${qb('sellCN', g, [10, 'all'])}</div></div>`));
      const have = Object.keys(cg).filter(g => !TR_CN[g] && cg[g] > 0);
      rows.push(`<div class="kv">창고의 특산품 · ${cn} 저자에 판다 (팔수록 포화로 값이 내려가고 매달 회복)</div>${have.length ? have.map(g => { const p = trPriceParts(cn, g); return `<div class="pn"><b>${g}</b> 창고 ${cg[g]} <small class="dim">${TR_CAT_N[TR_CAT[g]]}</small><small>저자 ${trPrice(cn, g)}금/개 · 거리 ×${p.dist.toFixed(2)}(${p.hops}칸) 수요 ×${p.demand.toFixed(2)} 포화 ×${p.sat.toFixed(2)}</small><div class="grid2">${qb('sellCN', g, [10, 'all'])}</div></div>`; }).join('') : '<div class="dim sm">특산품이 없습니다.</div>'}`);
      return `<div class="kv">${UI.f.g} · 금 ${fmt(c.gold)} · 창고 ${trCityN(cn)}/${trCityCap(cn)}</div>${rows.join('')}`;
    }
    rows.push(`<div class="kv">중국 상품 · ${cn}에서 사서 ${N.n}에 판다</div>`);
    Object.keys(TR_CN).forEach(g => rows.push(`<div class="pn"><b>${g}</b> 창고 ${cg[g] || 0}${N.want === g ? ' · <span class="fcs">원함</span>' : ''}<small>매입 ${trPBuyCN(cn, g)}금/개 · ${N.n} 매도 ${trPSellTo(nat, g)}금/개</small><div class="grid4">${qb('buyCN', g, [10, 50])}${qb('sellTo', g, [10, 'all'])}</div></div>`));
    rows.push(`<div class="kv">${N.n} 특산품 · ${N.n}에서 사서 중국 도시 저자에 판다 (멀리 큰 도시로 옮기면 비싸다 — 시세표)</div>`);
    Object.keys(N.goods).forEach(g => rows.push(`<div class="pn"><b>${g}</b> 창고 ${cg[g] || 0} <small class="dim">${TR_CAT_N[TR_CAT[g]]}</small><small>${N.n} 매입 ${trPBuyFor(nat, g)}금/개 · ${cn} 저자 ${trPrice(cn, g)}금/개</small><div class="grid4">${qb('buyFor', g, [10, 50])}${qb('sellCN', g, [10, 'all'])}</div></div>`));
    const other = Object.keys(cg).filter(g => !TR_CN[g] && !N.goods[g] && cg[g] > 0); if (other.length) rows.push(`<div class="kv">다른 나라 특산품 · 중계무역: ${N.n} 상인이 비싸게 사 준다</div>${other.map(g => `<div class="pn"><b>${g}</b> 창고 ${cg[g]}<small>${N.n} 매도 ${trPSellTo(nat, g)}금/개 · ${cn} 저자 ${trPrice(cn, g)}금/개</small><div class="grid4">${qb('sellTo', g, [10, 'all'])}${qb('sellCN', g, [10, 'all'])}</div></div>`).join('')}`);
    if (N.food) rows.push(`<div class="kv">군량 · ${N.n}이(가) 사 간다 (100당 금 ${trPFood(nat)}, 1,000은 남김)</div><div class="grid3">${qb('food', '군량', [1000, 3000, 10000])}</div>`);
    const idle = trIdle(cn); const shipKind = trLandGate(cn) ? '대상' : '배';
    return `<div class="kv">${UI.f.g} · 금 ${fmt(c.gold)} · 군량 ${fmt(c.food)} · 창고 ${trCityN(cn)}/${trCityCap(cn)} · 교역도 ${trRel(fid, nat)} (이번 거래 +${UI.f.gain.v}/10)</div><div class="pn sm${idle.length ? '' : ' warn'}">이번 교역 적재 한도: <b>${trIdleCap(cn)}</b> (${shipKind} ${idle.length}척${trFleet(cn).length > idle.length ? ` · 운항 중 ${trFleet(cn).length - idle.length}척` : ''}) — ${N.n}에 팔거나 특산품·군량(100 = 1)을 들여오는 양은 쉬는 ${shipKind}의 적재량까지. ${idle.length ? '' : `${shipKind}이(가) 없으면 [조선소]에서 만드세요.`}</div><div class="dim sm">시세는 매달 ±10% 움직이고, 많이 팔면 값이 떨어집니다. 왼쪽 두 칸은 사기, 오른쪽 두 칸은 팔기.</div>${rows.join('')}`;
  }, () => UI.f.ses ? btn('거래 마침', 'trEnd', '', { p: 1 }) : btn(UI.f.g ? `${UI.f.g}에게 거래를 맡긴다` : '장수를 고르세요', 'trSes', '', { p: 1, dis: !UI.f.g }));
}
ACT.trSes = () => { const r = trStart(UI.f.g); if (!r.ok) return toast(r.msg, false); UI.f.ses = true; renderSheet(); };
ACT.trDeal = v => { const [kind, g, q] = v.split('|'); const r = trDeal(S.player, UI.f.nat, UI.city, kind, g, q === 'all' ? 1e9 : +q, UI.f.gain); toast(r.msg, r.ok); renderSheet(); };
ACT.trEnd = () => { closeAll(); render(); };
// ----- 시세표: 품목을 고르면 내 도시가 판매가 순으로 -----
function trAllGoods() { const s = []; Object.keys(TR_NAT).forEach(k => Object.keys(TR_NAT[k].goods).forEach(g => s.push(g))); return s; }
function openTrPrices() {
  const nat = UI.f.nat; const cg = trCityCargo(UI.city); const have = trAllGoods().filter(g => cg[g] > 0); UI.f = { nat, good: have[0] || (nat ? Object.keys(TR_NAT[nat].goods)[0] : trAllGoods()[0]) };
  openSheet('시세표 · 도시별 판매가', () => {
    const g = UI.f.good; const goods = trAllGoods(); const tabs = `<div class="grid4">${goods.map(x => btn(`${x}${cg[x] ? `<small>창고 ${cg[x]}</small>` : ''}`, 'trGood', x, { p: x === g, s: 1 })).join('')}</div>`;
    const buy = trPBuyFor(trOrigin(g), g); const cs = citiesOf(S.player).filter(c => kindOf(c.n) === '도시').map(c => ({ c, p: trPrice(c.n, g), r: trRoute(S.player, UI.city, c.n) })).sort((a, b) => b.p - a.p);
    const rows = cs.map(({ c, p, r }) => { const st = (c.cargo && c.cargo[g]) || 0; const pt = trPriceParts(c.n, g); return `<div class="pn${c.n === UI.city ? ' fcs' : ''}"><b>${c.n}</b> ${p}금/개 <small class="dim">${TR_NAT[trOrigin(g)].n} 매입 ${buy} → ${p >= buy ? '+' : ''}${p - buy}</small><small>${c.n === UI.city ? '이 도시' : r.ok ? `${r.mode === 'sea' ? '항로' : '육로'} ${r.mo}개월${r.risk ? ` · 약탈 ${Math.round(r.risk * 100)}%` : ''}` : r.why} · 거리 ×${pt.dist.toFixed(2)} 수요 ×${pt.demand.toFixed(2)}${pt.sat < 1 ? ` 포화 ×${pt.sat.toFixed(2)}` : ''} · 창고 ${trCityN(c.n)}/${trCityCap(c.n)}${st ? ` (${g} ${st})` : ''}</small></div>`; }).join('');
    return `${tabs}<div class="dim sm">${g} (${TR_NAT[trOrigin(g)].n} 특산 · ${TR_CAT_N[TR_CAT[g]]}) — 원산지 관문에서 멀수록, ${TR_CAT[g] === 'lux' ? '큰 도시(등급 높음)' : '변경·산악 도시'}일수록, 상업이 높을수록 비싸다. 팔수록 포화로 내려가고 매달 회복.</div>${rows}`;
  });
}
ACT.trGood = v => { UI.f.good = v; renderSheet(); };
// ----- 수송: 목적지 → 싣는 양 → 호송 장수 -----
function openTrShip() {
  const nat = UI.f.nat; UI.f = { nat, to: null, mode: null, load: {}, g: null };
  openSheet(`${UI.city} · 수송`, () => {
    const fid = S.player, cn = UI.city, cg = trCityCargo(cn);
    if (!UI.f.to) { const cs = citiesOf(fid).filter(c => kindOf(c.n) === '도시' && c.n !== cn).map(c => ({ c, r: trRoute(fid, cn, c.n) })).sort((a, b) => (a.r.ok ? a.r.mo : 99) - (b.r.ok ? b.r.mo : 99) || hops(cn, a.c.n) - hops(cn, b.c.n));
      return `<div class="kv">목적지 (내 도시 · 빈자리는 오는 중인 화물을 뺀 값)</div>${cs.map(({ c, r }) => { const h = hops(cn, c.n); return btn(`${c.n}${trIsPort(c.n) ? ' ⚓' : ''} <small>${r.ok ? `${r.sea ? '항로 1개월' : ''}${r.sea && h < 99 ? ' / ' : ''}${h < 99 ? `육로 ${Math.max(1, Math.ceil(h / TR_PR.landPer))}개월(${h}칸)` : ''}${!r.sea && r.risk ? ` · 약탈 ${Math.round(r.risk * 100)}%` : ''} · 빈자리 ${trCityFree(c.n)}` : r.why}</small>`, 'trTo', c.n, { dis: !r.ok }); }).join('')}`; }
    const r = trRoute(fid, cn, UI.f.to, UI.f.mode); const n = Object.values(UI.f.load).reduce((s, v) => s + v, 0); const free = trCityFree(UI.f.to); const h = hops(cn, UI.f.to);
    const modes = r.sea && h < 99 ? `<div class="grid2">${btn('연안 항로<small>1개월 · 약탈 없음</small>', 'trModeSel', 'sea', { p: r.mode === 'sea', s: 1 })}${btn(`육로<small>${Math.max(1, Math.ceil(h / TR_PR.landPer))}개월</small>`, 'trModeSel', 'land', { p: r.mode === 'land', s: 1 })}</div>` : '';
    const items = Object.keys(cg).filter(g => cg[g] > 0).map(g => `<div class="pn"><b>${g}</b> 창고 ${cg[g]} · 싣기 ${UI.f.load[g] || 0}<small>${UI.f.to} 저자 ${trPrice(UI.f.to, g)}금/개${!TR_CN[g] ? ` (여기 ${trPrice(cn, g)})` : ''}</small><div class="grid4">${btn('+10', 'trLoad', `${g}|10`, { s: 1 })}${btn('전부', 'trLoad', `${g}|all`, { s: 1 })}${btn('-10', 'trLoad', `${g}|-10`, { s: 1 })}${btn('내림', 'trLoad', `${g}|0`, { s: 1 })}</div></div>`).join('');
    const info = r.ok ? `<div class="pn sm">${r.mode === 'sea' ? '연안 항로' : '육로 ' + r.path.join('→')} · ${r.mo}개월 · 수송비 ${r.feeU}금/개 → ${fmt(r.feeU * n)}${r.risk ? ` · <span class="warn">약탈 위험 ${Math.round(r.risk * 100)}%</span> (${r.danger.join('·')} 접경)` : ''}</div>` : `<div class="warn sm">${r.why}</div>`;
    return `<div class="kv">${cn} → ${UI.f.to} ${btn('바꾸기', 'trTo', '', { s: 1 })}</div>${modes}${info}<div class="kv">싣는 화물 ${n}/${free} (목적지 빈자리)</div>${items}<div class="kv">호송 장수 (행동 1회)</div>${trGenList(UI.f.g)}`;
  }, () => UI.f.to ? btn(UI.f.g ? `${UI.f.g}이(가) 호송한다` : '장수를 고르세요', 'trShipGo', '', { p: 1, dis: !UI.f.g }) : '');
}
ACT.trTo = v => { UI.f.to = v || null; UI.f.load = {}; UI.f.mode = null; renderSheet(); };
ACT.trModeSel = v => { UI.f.mode = v; renderSheet(); };
ACT.trLoad = v => { const [g, q] = v.split('|'); const cg = trCityCargo(UI.city); const cur = UI.f.load[g] || 0; const others = Object.keys(UI.f.load).filter(x => x !== g).reduce((s, x) => s + UI.f.load[x], 0); const room = Math.max(0, trCityFree(UI.f.to) - others); let nv = q === 'all' ? cg[g] || 0 : q === '0' ? 0 : cur + (+q); nv = trClamp(nv, 0, Math.min(cg[g] || 0, room)); if (nv) UI.f.load[g] = nv; else delete UI.f.load[g]; renderSheet(); };
ACT.trShipGo = () => { const r = trShip(S.player, UI.city, UI.f.to, UI.f.load, UI.f.mode, UI.f.g); toast(r.msg, r.ok); if (r.ok) { closeAll(); render(); } else renderSheet(); };
function openTrStudy() {
  const nat = UI.f.nat; UI.f = { nat, g: null, mode: '학습', kind: '개성' };
  openSheet(`${TR_NAT[nat].n} · 학습`, () => {
    const N = TR_NAT[nat], rel = trRel(S.player, nat), have = trUnits(S.player).includes(N.unit.n);
    const tabs = `<div class="grid2">${btn(`개성 ${N.trait}<small>교역도 20 · 금 300 · 2개월</small>`, 'trKind', '개성', { p: UI.f.kind === '개성', s: 1, dis: rel < 20 })}${btn(`병종 ${N.unit.n}<small>교역도 40 · 금 800 · 3개월${have ? ' · 해금됨' : ''}</small>`, 'trKind', '병종', { p: UI.f.kind === '병종', s: 1, dis: rel < 40 || have })}</div>`;
    const d = UI.f.kind === '개성' ? `${TRAITS[N.trait][1]} · 돌아온 장수가 익힙니다.` : `${N.unit.n}(${N.unit.f}) · 세력 전체가 출진 때 정예 부대로 쓸 수 있게 됩니다 (군비 100 이상인 도시).`;
    return `${tabs}<div class="dim sm">${d} 떠날 때 교역도 +4, 돌아올 때 +8.</div><div class="kv">보낼 장수 (군주 제외)</div>${trGenList(UI.f.g)}`;
  }, () => btn(UI.f.g ? `${UI.f.g}을(를) 보낸다` : '장수를 고르세요', 'trStudyGo', '', { p: 1, dis: !UI.f.g }));
}
ACT.trKind = v => { UI.f.kind = v; renderSheet(); };
ACT.trStudyGo = () => done(trStudy(UI.f.g, UI.f.nat, UI.f.kind));
function openTrBanq() {
  const nat = UI.f.nat; UI.f = { nat, g: null, mode: '친교' };
  openSheet(`${TR_NAT[nat].n} · 친교`, () => `<div class="dim sm">금 200으로 술자리를 엽니다. 교역도 +3~5 (매력이 높을수록), 장수 매력 경험치.</div><div class="kv">보낼 장수</div>${trGenList(UI.f.g)}`,
    () => btn(UI.f.g ? `${UI.f.g}이(가) 술자리를 연다` : '장수를 고르세요', 'trBanqGo', '', { p: 1, dis: !UI.f.g }));
}
ACT.trBanqGo = () => done(trBanq(UI.f.g, UI.f.nat));
</script>
