window.NOLAYERS = true; // 기준선: 층 보강 없이 원래 곡 데이터만 (높음 단계 = 예전 소리와 같은 보이스 수)
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
const out = { songs: {} };
// 5) 곡 층: 곡×품질×회차 노드 수(박자당), 동시 소스; 렌더 피크(풀 볼륨 BGM 0.9)
const songs = ['title', 'tension', 'battle', 'field', 'siege', 'march', 'spring', 'summer', 'autumn', 'winter', 'newyear'];
const S0s = n => SONGS[n];
async function schedule(name, lv, steps, from, climax, entry) {
  SQ108.lvl = lv; SQ108.auto = 0; const sec = steps * 60 / SONGS[name].bpm / 4 + 4; const { off, st } = fresh(sec); BGM.vol = 0.9; SND.mOut.gain.value = 0.9 * 0.55;
  SND.scene = name; SND.climax = climax || null; SND.entry = !!entry; const S0 = SONGS[name], s16 = 60 / S0.bpm / 4, perBeat = []; let prev = 0, b0 = 0;
  SND.stepAbs = 0; SND.curBus = SND.buses[0]; SND.busIdx = 0; SND.buses[0].gain.value = 1;
  const loop = S0.C.length * 16;
  for (let i = 0; i < steps; i++) { const step = from + i; const t = 0.1 + i * s16; SND.stepAbs = entry ? i : 999; const n0 = st.nodes; try { songStep(name, t, step); if (!window.NOLAYERS) layers_(name, S0, t, step); } catch (e) { out.err = String(e.stack || e).slice(0, 300); } perBeat[Math.floor(i / 4)] = (perBeat[Math.floor(i / 4)] || 0) + st.nodes - n0; }
  return { off, st, perBeat, sec };
}
function layers_(n, S0, t, s) { window.__snd108.layers(n, S0, t, s); }
const SQ108 = window.SQ108;
for (const name of songs) {
  out.songs[name] = {};
  for (const lv of (window.NOLAYERS ? [2] : [0, 1, 2])) {
    const S0 = SONGS[name], loop = S0.C.length * 16; let maxBeat = 0, maxConc = 0, tot = 0;
    for (let pass = 0; pass < 4; pass++) {
      const r = await schedule(name, lv, 64, pass * loop + 2 * 16, null, false); // 각 회차 3~6마디만 (대표 구간)
      maxBeat = Math.max(maxBeat, ...r.perBeat); maxConc = Math.max(maxConc, conc(r.st.src)); tot += r.st.nodes;
    }
    out.songs[name][lv] = { maxNodesPerBeat: maxBeat, maxConcSrc: maxConc };
  }
}
// 6) 렌더 피크: 가장 빽빽한 구간(회차2, 높음) 12초, 전투곡 클라이맥스 포함 (BGM 크기 크게)
out.peak = {};
for (const [name, cl] of (window.NOLAYERS ? [] : [['title', null], ['spring', null], ['summer', null], ['field', null], ['field', 'inferior'], ['siege', 'breach'], ['march', null]])) {
  const S0 = SONGS[name], loop = S0.C.length * 16; const r = await schedule(name, 2, 90, 2 * loop + 16, cl, name === 'march'); const buf = await r.off.startRendering();
  out.peak[name + (cl ? ':' + cl : '')] = stat(buf, 0.5, r.sec - 3);
}
return out;
