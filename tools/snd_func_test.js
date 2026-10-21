// v108 기능 시험(헤드리스, 소리는 못 들음): 클릭 분류·징글 호출·설정 저장·클라이맥스 판정·장면 교차·승패 징글 연결.
// 사용: node tools/ui_cdp.js 800 500 0 tools/snd_func_test.js
const R = { errs: [] };
window.addEventListener('error', e => R.errs.push(String(e.message)));
ACT.start('조조');
const off = new OfflineAudioContext(2, 44100 * 2, 44100); BGM.ctx = off; BGM.on = true; sndInit2();
const log = []; { const f = SFXUI.click.bind(SFXUI); SFXUI.click = function (k) { log.push(k); return f(k); }; }
const press = b => b.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true }));
const kinds = () => [...document.querySelectorAll('[data-a]')].map(b => b.dataset.a + '>' + SFXUI.kindOf(b)).filter(s => !/>null$/.test(s)).slice(0, 14);
// 1) 메인 화면 단추 분류 (v1.6 탭 + sub 단추) — 시트 닫고 눌러 본다
closeAll(); UI.sheets = []; render();
const tabs = {}; for (const t of ['군사', '내정', '인사', '외교', '계략', '교역', '정보']) { ACT.s7tab(t); log.length = 0; const tb = document.querySelector('[data-a="s7tab"][data-v="' + t + '"]'); if (tb) press(tb); tabs[t] = log.slice(); }
R.tabs = tabs;
ACT.s7tab('군사'); const subs = {}; for (const t of ['군사', '인사', '계략']) { ACT.s7tab(t); [...document.querySelectorAll('[data-a="sub"]')].forEach(b => { log.length = 0; press(b); subs[b.dataset.v] = log[0] || '-'; }); }
R.subs = subs;
// 2) 시트 안 단추: 징병 시트의 실행 단추, 닫기
ACT.sub('징병'); R.sheetDraft = kinds(); log.length = 0; const cl = document.querySelector('[data-a="close"]'); if (cl) press(cl); R.closeFired = log.slice(); closeAll();
ACT.sub('훈련'); R.sheetTrain = kinds(); closeAll(); ACT.sub('등용'); R.sheetRec = kinds(); closeAll();
// 3) 징글 호출: monthlyUpdate 래퍼
let jg = []; { const f = SFXUI.jingle.bind(SFXUI); SFXUI.jingle = function (m) { jg.push(m); return f(m); }; }
CMD_AUTO = 0; for (let i = 0; i < 3; i++) monthlyUpdate();
await new Promise(r => setTimeout(r, 600)); R.jingleMonths = jg.slice(); R.jingleMonthNow = S.m;
CMD_AUTO = 1; jg.length = 0; monthlyUpdate(); await new Promise(r => setTimeout(r, 400)); R.jingleAuto = jg.slice(); CMD_AUTO = 0;
// 4) 설정 저장·복원
ACT.sqV(2); ACT.sfxV(1); ACT.clickT(); R.saved = [localStorage.getItem('sg_sq'), localStorage.getItem('sg_sfxvol'), localStorage.getItem('sg_click'), SQ108.lvl, SQ108.sfxVol, SQ108.click];
ACT.clickT(); ACT.sqV(1); ACT.sfxV(0.75);
R.setHtml = bgmCtl().replace(/<[^>]+>/g, '|').replace(/\|+/g, '|').slice(0, 220);
// 5) 클라이맥스 판정 (가짜 V4.W)
const mk = (a, b, extra) => ({ playerSide: 'A', limit: 20, turn: 5, units: [{ alive: 1, side: 'A', troops: a }, { alive: 1, side: 'D', troops: b }], ...extra });
const ev = (w) => { V4.W = w; SND.climax = 'x'; window.__snd108.climaxEval(); return [SND.climax, SND.tempoWant, JSON.stringify(SND.climaxLog)]; };
R.cl = { even: ev(mk(1000, 1000)), inferior: ev(mk(400, 1000)), dominant: ev(mk(2500, 1000)), last: ev(mk(1000, 1000, { turn: 18 })) };
SND.breach = 3; R.cl.breach = ev(mk(1000, 1000)); V4.W = null;
// 6) 장면 교차 + 전투 진입 층
sndPlay('summer'); const b1 = SND.busIdx, s1 = SND.scene; sndPlay('field'); const b2 = SND.busIdx;
R.xfade = { s1, b1, now: SND.scene, b2, inBattle: SND.inBattle, entry: SND.entry, timer: !!SND.timer };
await new Promise(r => setTimeout(r, 500)); R.stepAdv = SND.step;
sndPlay('siege'); R.siege = [SND.scene, SND.entry]; sndPlay('summer'); R.back = [SND.scene, SND.inBattle];
// 7) 승패 징글
SND.jgLast = 0; sndJingle('win'); R.jg = [SND.scene, SND.jgUntil > performance.now()]; sndPlay('autumn'); R.def = SND.deferred;
// 8) 곡 이름 매핑
UI.scr = 'v4'; V4.W = { siege: true, units: [] }; R.track = [trackFor('v4')]; V4.W = { siege: false, units: [] }; R.track.push(trackFor('v4')); V4.W = null;
R.songsOk = ['field', 'siege', 'march'].every(k => !!SONGS[k] && SONGS[k].beats === SONGS[k].C.length * 4);
return R;
