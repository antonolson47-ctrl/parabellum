// Automated playthrough of all 9 shifts with the in-game autopilot. Usage: DEVICE="iPhone 13 landscape" node test/fullrun.cjs [startLevel] [endLevel]
const { chromium, devices } = require('/workspace/kimber-horses/test/node_modules/playwright');
const serve = require('./serve.cjs');
(async () => {
  const page = process.env.PAGE || 'dev/game.html'; const a = +(process.argv[2] || 0), bEnd = +(process.argv[3] || 8); const tag = process.env.TAG || 'run';
  const s = await serve(); const br = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const ctxOpts = process.env.DEVICE ? { ...devices[process.env.DEVICE] } : { viewport: { width: 1280, height: 720 } };
  const ctx = await br.newContext(ctxOpts); const p = await ctx.newPage(); const errs = [];
  p.on('pageerror', e => { errs.push('PAGEERR ' + e.message); console.log('PAGEERR', e.message, (e.stack || '').split('\n').slice(0, 5).join(' | ')); });
  p.on('console', x => { if (x.type() === 'error') { errs.push(x.text().slice(0, 300)); console.log('CONSOLE.ERROR', x.text().slice(0, 300)); } });
  await p.goto(`http://127.0.0.1:${s.address().port}/${page}`);
  await p.waitForFunction(() => (window.__PB && window.__PB.G.mode === 'title') || document.title.startsWith('ERR'), null, { timeout: 240000 });
  console.log('booted', await p.title(), JSON.stringify(ctxOpts.viewport || {}));
  await p.evaluate(() => { const P = window.__PB; P.S.data.seenIntro = true; P.S.data.seenCall = true; P.S.data.seenKennedy = true; P.autopilot(true); P.substeps(+(localStorage.subs || 3)); P.S.data.unlocked = 8; });
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const results = [];
  for (let i = a; i <= bEnd; i++) {
    const t0 = Date.now(); let assisted = [];
    await p.evaluate(i => window.__PB.startLevel(i), i);
    await p.waitForFunction(() => window.__PB.G.mode === 'play', null, { timeout: 180000 });
    let shotTaken = false, bossT = 0, lastKills = -1, stall = 0;
    while (true) {
      await sleep(2000);
      const st = await p.evaluate(() => window.__PB.state());
      if (!shotTaken && Date.now() - t0 > 14000) { await p.screenshot({ path: `test/shots/${tag}_L${i}.png` }); shotTaken = true; }
      if (st.mode === 'results' || st.phase === 'done' || st.mode === 'cine' || st.mode === 'shop' || st.mode === 'title') break;
      if (st.mode === 'dead') { assisted.push('died'); await p.evaluate(i => window.__PB.startLevel(i), i); await p.waitForFunction(() => window.__PB.G.mode === 'play', null, { timeout: 180000 }); continue; }
      if (st.phase === 'boss') { bossT += 2; if (bossT === 6) await p.screenshot({ path: `test/shots/${tag}_L${i}_boss.png` }); if (bossT > 150) { assisted.push('hurtBoss'); await p.evaluate(() => window.__PB.hurtBoss(1)); bossT = 0; } }
      if (st.phase === 'fight') { if (st.kills === lastKills) stall += 2; else stall = 0; lastKills = st.kills; if (stall > 90) { assisted.push('toBoss'); await p.evaluate(() => window.__PB.toBoss()); stall = 0; } }
      if (st.phase === 'exit') { stall += 2; if (stall > 120) { assisted.push('tpExit'); await p.evaluate(() => { const e = window.__PB.G.level.anc.exit; if (e) window.__PB.tp(e.x, e.z); }); stall = 0; } }
      if (Date.now() - t0 > 20 * 60000) { assisted.push('TIMEOUT'); break; }
    }
    const st = await p.evaluate(() => window.__PB.state());
    const r = { level: i, secs: Math.round((Date.now() - t0) / 1000), assisted, burgers: st.burgers, cokes: st.cokes, fps: st.fps, errors: errs.length };
    results.push(r); console.log('LEVEL', JSON.stringify(r));
    await sleep(2500); if (i === 8) { await sleep(3000); await p.screenshot({ path: `test/shots/${tag}_ending.png` }); }
  }
  const pe = await p.evaluate(() => window.__PB_ERRORS);
  console.log('PB_ERRORS', JSON.stringify(pe)); console.log('ERRS', errs.length, JSON.stringify(errs.slice(0, 10)));
  console.log('SUMMARY', JSON.stringify(results));
  await br.close(); s.close();
})().catch(e => { console.log('FATAL', e.message); process.exit(1); });
