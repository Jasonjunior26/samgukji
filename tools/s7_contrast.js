// v107 S7 대비 측정 (s7_harness.html?contrast=1 이 불러 쓴다). 게임 창 w 의 MAP_BASE·S7COL·세력색으로 계절별 최소값을 낸다.
// 목표(목업 4차): 글자 ≥ 7.10, 지도 이름표 ≥ 8.86, 선·아이콘 ≥ 3.49, 영토 대 빈 땅 ΔE ≥ 24.8
function s7Contrast(w) {
  const M = w.eval('MAP_BASE'), K = w.eval('S7COL'), S = w.eval('S');
  const rgb = h => K.hex(h), lin = v => { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
  const Lum = c => 0.2126 * lin(c[0]) + 0.7152 * lin(c[1]) + 0.0722 * lin(c[2]);
  const cr = (a, b) => { const x = Lum(a), y = Lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  const mix = (top, a, bot) => top.map((v, i) => v * a + bot[i] * (1 - a));
  const lab = c => { const [r, g, b] = c.map(lin); const X = (0.4124 * r + 0.3576 * g + 0.1805 * b) / 0.95047, Y = 0.2126 * r + 0.7152 * g + 0.0722 * b, Z = (0.0193 * r + 0.1192 * g + 0.9505 * b) / 1.08883; const f = t => t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116; return [116 * f(Y) - 16, 500 * (f(X) - f(Y)), 200 * (f(Y) - f(Z))]; };
  const dE = (a, b) => { const p = lab(a), q = lab(b); return Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]); };
  // UI 글자 (계절 무관 고정 판)
  const T = ['#ece8dc', '#aab2cf', '#ffd75e'], BG = ['#0b1022', '#151c38', '#1c2547', '#0f1428'];
  let text = 99, textW = ''; for (const t of T) for (const b of BG) { const v = cr(rgb(t), rgb(b)); if (v < text) { text = v; textW = t + '/' + b; } }
  const facs = Object.keys(S.fac).filter(f => S.fac[f].alive !== false && Object.values(S.city).some(c => c.owner === f)), out = { text: +text.toFixed(2), textWorst: textW, seasons: {} };
  for (const sk of Object.keys(M.seasons)) { const Z = M.seasons[sk], lands = [Z.plain, Z.mount, Z.river_land, Z.south].filter(Boolean).map(rgb);
    // 이름표: 흰 글자 / (rgba(12,16,32,.84) 를 가장 밝은 바탕 위에 얹은 색)
    let lbl = 99; const under = [...lands, ...facs.map(f => mix(rgb(K.mapCol(S.fac[f].col)), .64, rgb(Z.terr_base)))];
    for (const u of under) lbl = Math.min(lbl, cr([255, 255, 255], mix([12, 16, 32], .84, u)));
    // 선·아이콘 테두리 (#0b0f1e 아이콘 외곽, #1c1a2a 국경, #2e2a24 길) 대 땅·영토
    let line = 99; for (const l of ['#0b0f1e', '#1c1a2a', '#2e2a24']) for (const u of under) line = Math.min(line, cr(rgb(l), u));
    // 영토(진한 세력색 .64 + terr_base) 대 빈 땅(지형 칠)
    let de = 99, deW = ''; for (const f of facs) { const t = mix(rgb(K.mapCol(S.fac[f].col)), .64, rgb(Z.terr_base)); for (const l of lands) { const v = dE(t, l); if (v < de) { de = v; deW = S.fac[f].n || f; } } }
    out.seasons[sk] = { label: +lbl.toFixed(2), line: +line.toFixed(2), terrDE: +de.toFixed(1), terrWorst: deW }; }
  out.min = { label: Math.min(...Object.values(out.seasons).map(s => s.label)), line: Math.min(...Object.values(out.seasons).map(s => s.line)), terrDE: Math.min(...Object.values(out.seasons).map(s => s.terrDE)) };
  return out; }
