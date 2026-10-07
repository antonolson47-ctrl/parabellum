// node test/play.cjs <script.json-ish via env> : drives dev/game.html (or index.html) with a step list
const { chromium, webkit, devices } = require('/workspace/kimber-horses/test/node_modules/playwright');
const serve = require('./serve.cjs');
const fs = require('fs');
(async () => {
  const page = process.env.PAGE || 'dev/game.html'; const W = +(process.env.W || 1280), Hh = +(process.env.H || 720), D = +(process.env.DPR || 1);
  const steps = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
  const s = await serve(); const b = process.env.BROWSER==='webkit' ? await webkit.launch() : await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
  const ctxOpts = process.env.DEVICE ? { ...devices[process.env.DEVICE] } : { viewport: { width: W, height: Hh }, deviceScaleFactor: D };
  const ctx = await b.newContext(ctxOpts); const p = await ctx.newPage();
  const errs = [];
  p.on('console', x => { const t = x.text(); if (x.type() === 'error' || x.type() === 'warning') errs.push(x.type() + ': ' + t.slice(0, 400)); if (process.env.V) console.log(x.type(), t.slice(0, 400)); });
  p.on('pageerror', e => { errs.push('PAGEERR ' + e.message); console.log('PAGEERR', e.message, (e.stack || '').split('\n').slice(0, 4).join(' | ')); });
  await p.goto(`http://127.0.0.1:${s.address().port}/${page}`);
  await p.waitForFunction(() => (window.__PB && window.__PB.G.mode === 'title') || document.title.startsWith('ERR'), null, { timeout: 240000 }).catch(e => console.log('boot timeout'));
  console.log('booted', await p.title());
  for (const st of steps) {
    const t0 = Date.now();
    if (st.eval) { const r = await p.evaluate(st.eval).catch(e => 'EVALERR ' + e.message); if (r !== undefined) console.log('eval>', JSON.stringify(r).slice(0, 600)); }
    if (st.wait) await p.waitForTimeout(st.wait);
    if (st.until) { await p.waitForFunction(st.until, null, { timeout: st.timeout || 120000, polling: 500 }).catch(e => console.log('until timeout:', st.until)); }
    if (st.shot) { await p.screenshot({ path: st.shot }); console.log('shot', st.shot); }
    if (st.state) console.log('state>', JSON.stringify(await p.evaluate(() => window.__PB && window.__PB.state())));
    if (st.tap) await p.mouse.click(st.tap[0], st.tap[1]);
    if (process.env.V) console.log('step', Date.now() - t0, 'ms');
  }
  const pe = await p.evaluate(() => window.__PB_ERRORS || []);
  console.log('PB_ERRORS', JSON.stringify(pe)); console.log('CONSOLE_ERRS', errs.length, JSON.stringify(errs.slice(0, 20)));
  await b.close(); s.close();
})();
