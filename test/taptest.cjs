// Real-touch smoke test of the title buttons: node test/taptest.cjs <url> <device> [browser]
const { chromium, webkit, devices } = require('/workspace/kimber-horses/test/node_modules/playwright');
(async () => {
  const url = process.argv[2], dev = process.argv[3] || 'iPhone 13', br = process.argv[4] || 'webkit', out = process.argv[5] || '/tmp/lab/tap';
  const b = br === 'webkit' ? await webkit.launch() : await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const ctx = await b.newContext({ ...devices[dev] }); const p = await ctx.newPage();
  const logs = []; p.on('console', m => logs.push(m.type() + ': ' + m.text().slice(0, 300))); p.on('pageerror', e => logs.push('PAGEERR ' + e.message));
  const t0 = Date.now(); await p.goto(url, { waitUntil: 'load', timeout: 120000 });
  const info = async () => p.evaluate(() => ({ mode: window.__PB && window.__PB.G.mode, title: document.title, btns: [...document.querySelectorAll('button')].map(b => b.id || b.textContent.trim()).slice(0, 8) }));
  // wait for title buttons to exist and be enabled
  await p.waitForFunction(() => { const b = document.getElementById('tplay'); return b && !b.disabled; }, null, { timeout: 180000 }).catch(() => logs.push('NO ENABLED #tplay'));
  console.log(dev, br, 'title ready after', Date.now() - t0, 'ms', JSON.stringify(await info()));
  const hit = await p.evaluate(() => ['tplay', 'tshifts', 'tshop', 'tset'].map(id => { const e = document.getElementById(id); if (!e) return id + ':missing'; const r = e.getBoundingClientRect(); const x = r.left + r.width / 2, y = r.top + r.height / 2; const t = document.elementFromPoint(x, y); return `${id}@${x | 0},${y | 0} -> ${t ? (t.id || t.tagName + '.' + t.className) : 'null'}${t && (t === e || e.contains(t)) ? ' OK' : ' BLOCKED'}`; }));
  console.log('hit-test', hit.join(' | '));
  const tapId = async id => { const e = await p.$('#' + id); if (!e) return 'missing'; const bb = await e.boundingBox(); await p.touchscreen.tap(bb.x + bb.width / 2, bb.y + bb.height / 2); await p.waitForTimeout(900); return (await info()).mode + ' / screen=' + await p.evaluate(() => (document.querySelector('#screens > div, .screens > div') || {}).className || ''); };
  for (const id of ['tshifts', 'tshop', 'tset']) {
    const r = await tapId(id); console.log('tap', id, '->', r); await p.screenshot({ path: `${out}_${id}.png` });
    // go back with a tap on the back button if any
    const back = await p.$('#shopgo, #sback, #setback, #back, button.back'); if (back) { const bb = await back.boundingBox(); if (bb) await p.touchscreen.tap(bb.x + bb.width / 2, bb.y + bb.height / 2); } else await p.evaluate(() => window.__PB && window.__PB.titleScreen && window.__PB.titleScreen());
    await p.waitForTimeout(700); console.log('  back ->', (await info()).mode);
  }
  const r = await tapId('tplay'); console.log('tap tplay ->', r);
  // story/intro may need taps to advance; tap screen centre a few times then wait for play
  for (let i = 0; i < 25; i++) { const m = (await info()).mode; if (m === 'play') break; const vp = p.viewportSize(); await p.touchscreen.tap(vp.width / 2, vp.height / 2); await p.waitForTimeout(1200); }
  const fin = await info(); console.log('FINAL mode', fin.mode); await p.screenshot({ path: `${out}_final.png` });
  console.log('LOGS', JSON.stringify(logs.filter(l => !/GPU stall/.test(l)).slice(0, 15)));
  await b.close();
})();
