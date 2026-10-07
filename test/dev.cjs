// node test/dev.cjs dev/page.html [out.png] [w h dpr] -> load a dev page, print console, screenshot
const { chromium } = require('/workspace/kimber-horses/test/node_modules/playwright');
const serve = require('./serve.cjs');
(async () => {
  const [page, out, w = 1280, h = 720, d = 1] = process.argv.slice(2);
  const s = await serve(); const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: +w, height: +h }, deviceScaleFactor: +d });
  p.on('console', x => console.log(x.type(), x.text().slice(0, 6000))); p.on('pageerror', e => console.log('PAGEERR', e.message));
  await p.goto(`http://127.0.0.1:${s.address().port}/${page}`);
  await p.waitForFunction(() => document.title === 'DONE' || document.title.startsWith('ERR'), null, { timeout: 180000 }).catch(e => console.log('timeout'));
  if (out) await p.screenshot({ path: out });
  await b.close(); s.close();
})();
