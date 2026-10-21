// v1.6: 헤드리스 Chrome 으로 samguk_v107.html 을 열고 JS 본문을 실행, 결과·스크린샷 출력.
// 사용: node tools/ui_cdp.js W H mobile(0|1) 스크립트파일 [png]   스크립트는 async 함수 본문(return 값 출력)
// 스크립트에서 window.__tap(x,y) 같은 CDP 입력이 필요하면 코드 안에서 'TAP x y' 문자열을 반환하지 말고 아래 __input 사용 불가 — 대신 dispatch 는 CDP 로 따로: 스크립트 파일 첫 줄 주석 //TAP x,y 이면 실행 뒤 그 좌표를 터치한다.
const { spawn } = require('child_process'), path = require('path'), fs = require('fs'), os = require('os');
const [W, H, MOB, SCRIPT, PNG] = process.argv.slice(2), PORT = 9300 + Math.floor(Math.random() * 500);
const CH = 'C:/Program Files/Google/Chrome/Application/chrome.exe', prof = fs.mkdtempSync(path.join(os.tmpdir(), 'uicdp-'));
const url = 'file:///' + path.resolve(__dirname, '..', 'samguk_v107.html').replace(/\\/g, '/');
const ch = spawn(CH, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--allow-file-access-from-files', '--force-device-scale-factor=1', `--window-size=${W},${H}`, `--remote-debugging-port=${PORT}`, `--user-data-dir=${prof}`, 'about:blank'], { stdio: 'ignore' });
const sl = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  let tabs; for (let i = 0; i < 50; i++) { try { tabs = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json(); if (tabs.length) break; } catch (e) { } await sl(200); }
  const t = tabs.find(x => x.type === 'page'), ws = new WebSocket(t.webSocketDebuggerUrl); let id = 0; const pend = {};
  ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && pend[m.id]) { pend[m.id](m); delete pend[m.id]; } };
  await new Promise(r => ws.onopen = r);
  const cmd = (method, params = {}) => new Promise(r => { const i = ++id; pend[i] = r; ws.send(JSON.stringify({ id: i, method, params })); });
  await cmd('Emulation.setDeviceMetricsOverride', { width: +W, height: +H, deviceScaleFactor: 1, mobile: MOB === '1' });
  if (MOB === '1') await cmd('Emulation.setTouchEmulationEnabled', { enabled: true });
  await cmd('Page.navigate', { url }); await sl(2500);
  const ev = async code => { const r = await cmd('Runtime.evaluate', { expression: `(async()=>{${code}})()`, awaitPromise: true, returnByValue: true }); return r.result.exceptionDetails ? 'EXC ' + JSON.stringify(r.result.exceptionDetails.exception) : r.result.result.value; };
  const code = fs.readFileSync(SCRIPT, 'utf8');
  // 여러 단계: '//STEP' 줄로 나눈 조각을 차례로 실행, 단계 사이에 '//TAP x,y' 가 있으면 실제 터치 입력
  for (const part of code.split(/^\/\/STEP.*$/m)) {
    const m = part.match(/^\s*\/\/TAP (-?[\d.]+),(-?[\d.]+)/);
    if (m) { const x = +m[1], y = +m[2]; for (const type of ['touchStart', 'touchEnd']) await cmd('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchStart' ? [{ x, y }] : [] }); await sl(500); }
    const o = await ev(part); if (o !== undefined) console.log(JSON.stringify(o));
  }
  if (PNG) { await sl(300); const s = await cmd('Page.captureScreenshot', { format: 'png' }); fs.writeFileSync(PNG, Buffer.from(s.result.data, 'base64')); }
  ws.close(); ch.kill(); setTimeout(() => { try { fs.rmSync(prof, { recursive: true, force: true }); } catch (e) { } process.exit(0); }, 500);
})().catch(e => { console.log('ERR', e.message); ch.kill(); process.exit(1); });
