// v107 S7: 실시간(가상 시간 없음) 기능 시험·시간 측정. 헤드리스 Chrome 을 원격 디버깅으로 열고 s7_harness.html?test=1 결과를 읽는다.
// 사용: node tools/s7_cdp.js W H "쿼리"   예) node tools/s7_cdp.js 800 360 "m=4"
const { spawn } = require('child_process'), path = require('path'), fs = require('fs'), os = require('os');
const [W = 800, H = 360, q = 'm=4'] = process.argv.slice(2), PORT = 9300 + Math.floor(Math.random() * 500);
const CH = 'C:/Program Files/Google/Chrome/Application/chrome.exe', prof = fs.mkdtempSync(path.join(os.tmpdir(), 's7cdp-'));
const url = 'file:///' + path.resolve(__dirname, 's7_harness.html').replace(/\\/g, '/') + '?' + q + '&test=1';
const ch = spawn(CH, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--allow-file-access-from-files', '--force-device-scale-factor=1', `--window-size=${W},${H}`, `--remote-debugging-port=${PORT}`, `--user-data-dir=${prof}`, 'about:blank'], { stdio: 'ignore' });
const sl = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  let tabs; for (let i = 0; i < 50; i++) { try { tabs = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json(); if (tabs.length) break; } catch (e) { } await sl(200); }
  const t = tabs.find(x => x.type === 'page'), ws = new WebSocket(t.webSocketDebuggerUrl); let id = 0; const pend = {};
  ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && pend[m.id]) { pend[m.id](m); delete pend[m.id]; } };
  await new Promise(r => ws.onopen = r);
  const cmd = (method, params = {}) => new Promise(r => { const i = ++id; pend[i] = r; ws.send(JSON.stringify({ id: i, method, params })); });
  await cmd('Emulation.setDeviceMetricsOverride', { width: +W, height: +H, deviceScaleFactor: 1, mobile: false });
  await cmd('Page.navigate', { url });
  let out = ''; for (let i = 0; i < 120 && !out; i++) { await sl(500); const r = await cmd('Runtime.evaluate', { expression: "(document.getElementById('out')||{}).textContent||''", returnByValue: true }); out = (r.result && r.result.result && r.result.result.value) || ''; }
  console.log(out || 'TIMEOUT'); ws.close(); ch.kill(); setTimeout(() => { try { fs.rmSync(prof, { recursive: true, force: true }); } catch (e) { } process.exit(0); }, 500);
})().catch(e => { console.log('ERR', e.message); ch.kill(); process.exit(1); });
