// node test/lab.cjs out.png "query" [W H]  -> screenshot of dev/guns.html?query
const { chromium } = require('/workspace/kimber-horses/test/node_modules/playwright'); const serve = require('./serve.cjs');
(async () => { const s = await serve(); const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const jobs = process.argv.slice(2); const p = await b.newPage({ viewport: { width: 1280, height: 720 } }); const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  for (let i = 0; i < jobs.length; i += 2) { await p.goto(`http://127.0.0.1:${s.address().port}/dev/guns.html?${jobs[i + 1]}`); await p.waitForFunction(() => document.title === 'READY' || document.title.startsWith('ERR'), null, { timeout: 60000 }).catch(() => errs.push('timeout')); await p.screenshot({ path: jobs[i] }); console.log('shot', jobs[i]); }
  console.log('ERRS', JSON.stringify(errs)); await b.close(); s.close(); })();
