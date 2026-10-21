// v108 소리 측정: 헤드리스 Chrome 의 OfflineAudioContext 로 새 효과음·징글·곡 층을 실제 믹스(압축기 포함)로 렌더해 길이·피크·클리핑·노드 수를 잰다.
// 사용: node tools/ui_cdp.js 800 500 0 tools/snd_measure.js > out.txt   (스크립트는 async 함수 본문; 마지막에 return)
// 소리 자체의 좋고 나쁨은 못 듣는다(실기기 청취는 미확인) — 수치만.
const SR = 44100;
const db = x => x > 0 ? +(20 * Math.log10(x)).toFixed(1) : -999;
function fresh(sec) {
  const off = new OfflineAudioContext(2, Math.ceil(SR * sec), SR);
  // 노드 수·동시 소스 수 집계
  const st = { nodes: 0, src: [] };
  ['createOscillator', 'createBufferSource'].forEach(m => { const f = off[m].bind(off); off[m] = () => { const n = f(); st.nodes++; let t0 = null; const s = n.start.bind(n), p = n.stop.bind(n); n.start = (w, ...a) => { t0 = w || 0; return s(w, ...a); }; n.stop = w => { st.src.push([t0 == null ? 0 : t0, w]); return p(w); }; return n; }; });
  ['createGain', 'createBiquadFilter', 'createStereoPanner', 'createConvolver', 'createDynamicsCompressor'].forEach(m => { const f = off[m].bind(off); off[m] = () => { st.nodes++; return f(); }; });
  SND.ctx = null; SND.b108 = false; SND.rev2 = null; SND.curBus = null; SND.scene = null; SND.sfxOn = true; SND.last = {};
  SFXUI.last = {}; SFXUI.act = []; SFXUI.lastJg = -9; BGM.ctx = off; BGM.on = true; sndInit2();
  SND.sfxGain.gain.value = 1; // 최대 효과음 크기 기준
  return { off, st };
}
function stat(buf, from, to) {
  let pk = 0, last = 0, clip = 0, sum = 0, n = 0; const a = buf.getChannelData(0), b = buf.getChannelData(1);
  const i0 = Math.floor((from || 0) * SR), i1 = Math.min(a.length, Math.floor((to || buf.duration) * SR));
  for (let i = i0; i < i1; i++) { const v = Math.max(Math.abs(a[i]), Math.abs(b[i])); if (v > pk) pk = v; if (v >= 1) clip++; if (v > 0.001) last = i / SR; sum += a[i] * a[i] + b[i] * b[i]; n += 2; }
  return { len: +last.toFixed(3), peak: pk, peakDb: db(pk), clip, rms: db(Math.sqrt(sum / Math.max(1, n))) };
}
const conc = src => { const ev = []; src.forEach(([a, b]) => { ev.push([a, 1]); ev.push([b, -1]); }); ev.sort((x, y) => x[0] - y[0] || x[1] - y[1]); let c = 0, m = 0; ev.forEach(e => { c += e[1]; if (c > m) m = c; }); return m; };
const out = { sfx: {}, jingle: {}, burst: {}, songs: {}, endJingle: {} };

// 1) 클릭음: 단일음 길이(-60dB)·피크
for (const k of Object.keys(SFXUI.spec)) {
  const { off } = fresh(0.6); SFXUI.click(k); const buf = await off.startRendering();
  const sp = SFXUI.spec[k], envEnd = Math.max(...sp.map(v => (v.t || 0) + v.a + v.d));
  out.sfx[k] = { envEnd: +envEnd.toFixed(3), ...stat(buf) };
}
// 2) 연타: 같은 종류 10회 / 서로 다른 종류 섞어 20회(10ms 간격) → 피크가 단일음 +6dB 이내인가
for (const k of ['mil', 'per']) {
  const { off } = fresh(1.2); const ts = Array.from({ length: 10 }, (_, i) => i * 0.012); let got = 0;
  ts.forEach((t, i) => { if (t === 0) { got += SFXUI.click(k) ? 1 : 0; return; } off.suspend(t).then(() => { got += SFXUI.click(k) ? 1 : 0; off.resume(); }); });
  const buf = await off.startRendering(); out.burst[k] = { fired: got, ...stat(buf), single: out.sfx[k].peakDb };
}
{
  const { off } = fresh(1.2); const ks = Object.keys(SFXUI.spec); let got = 0, mx = 0;
  for (let i = 0; i < 20; i++) { const t = i * 0.01, k = ks[i % ks.length]; if (t === 0) { SFXUI.click(k); got++; continue; } off.suspend(t).then(() => { if (SFXUI.click(k)) got++; mx = Math.max(mx, SFXUI.act.length); off.resume(); }); }
  const buf = await off.startRendering(); out.burst.mixed20 = { fired: got, maxActive: mx, ...stat(buf) };
}
// 3) 새 달 징글: 기본 + 계절 변주 5종 (sfxGain 최대, 0.8배 포함)
for (const k of Object.keys(SFXUI.jg)) {
  const { off } = fresh(2.6); const m = { base: 4, spring: 3, summer: 6, autumn: 9, winter: 11, newyear: 1 }[k]; SFXUI.jingle(m); const buf = await off.startRendering();
  out.jingle[k] = { month: m, envEnd: +Math.max(...SFXUI.jg[k].map(v => (v.t || 0) + v.a + v.d)).toFixed(3), ...stat(buf) };
}
// 4) 승패 징글
for (const k of ['win', 'lose']) {
  const { off } = fresh(11); SND.buses[0].gain.value = 1; SND.curBus = SND.buses[0]; SND.busIdx = 0; BGM.vol = 0.9; SND.mOut.gain.value = 0.9 * 0.55;
  SND.jgLast = 0; endJingle_(k); const buf = await off.startRendering(); out.endJingle[k] = stat(buf);
}
function endJingle_(k) { window.__snd108.endJingle(k); }
return out;
