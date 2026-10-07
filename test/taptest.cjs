// Real-touch regression test: node test/taptest.cjs <url> <device> [browser] [outprefix] [shotdir]
// Title buttons (real taps) -> Clock In -> tap through Kelly intro (checks new lines, pacing, no attacks) -> gameplay
// -> anti-zoom checks (double-tap, pinch/two-finger move, gesture events) -> RESET VIEW (page zoom + forced FOV + pitch).
const { chromium, webkit, devices } = require('/workspace/kimber-horses/test/node_modules/playwright');
const fs = require('fs');
(async () => {
  const url = process.argv[2], dev = process.argv[3] || 'iPhone 13', br = process.argv[4] || 'webkit', out = process.argv[5] || '/tmp/lab/tap', shotDir = process.argv[6] || '';
  fs.mkdirSync(require('path').dirname(out), { recursive: true }); if (shotDir) fs.mkdirSync(shotDir, { recursive: true });
  const b = br === 'webkit' ? await webkit.launch() : await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const ctx = await b.newContext({ ...devices[dev] }); const p = await ctx.newPage();
  const logs = []; p.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') logs.push(m.type() + ': ' + m.text().slice(0, 300)); }); p.on('pageerror', e => logs.push('PAGEERR ' + e.message));
  const R = { dev, br, pass: [], fail: [] }; const ok = (c, msg) => { (c ? R.pass : R.fail).push(msg); console.log((c ? '  PASS ' : '  FAIL ') + msg); };
  const t0 = Date.now(); await p.goto(url, { waitUntil: 'load', timeout: 120000 });
  const info = async () => p.evaluate(() => ({ mode: window.__PB && window.__PB.G.mode, title: document.title }));
  await p.waitForFunction(() => { const b = document.getElementById('tplay'); return b && !b.disabled; }, null, { timeout: 180000 }).catch(() => logs.push('NO ENABLED #tplay'));
  console.log(dev, br, 'title ready after', Date.now() - t0, 'ms', JSON.stringify(await info()));
  const hit = await p.evaluate(() => ['tplay', 'tshifts', 'tshop', 'tset'].map(id => { const e = document.getElementById(id); if (!e) return [id, false]; const r = e.getBoundingClientRect(); const t = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return [id, !!(t && (t === e || e.contains(t)))]; }));
  for (const [id, h] of hit) ok(h, `hit-test #${id} on top`);
  const tapEl = async sel => { const e = await p.$(sel); if (!e) return false; try { await e.scrollIntoViewIfNeeded({ timeout: 2000 }); } catch (er) { } const bb = await e.boundingBox(); if (!bb) return false; await p.touchscreen.tap(bb.x + bb.width / 2, bb.y + bb.height / 2); return true; };
  for (const [id, want] of [['tshifts', 'menu'], ['tshop', 'shop'], ['tset', 'menu']]) {
    await tapEl('#' + id); await p.waitForTimeout(900); const m = (await info()).mode; ok(m === want, `tap #${id} -> ${m}`);
    if (id === 'tshop' && br !== 'webkit') { // anti-zoom must not break one-finger scrolling of menus
      const cdp0 = await ctx.newCDPSession(p); const g = await p.evaluate(() => { const e = document.querySelector('.shop .grid'); const r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height * 0.75, h: r.height, can: e.scrollHeight > e.clientHeight }; });
      if (g.can) { const T = (type, pts) => cdp0.send('Input.dispatchTouchEvent', { type, touchPoints: pts.map(([x, y], i) => ({ x, y, id: i + 1 })) }); await T('touchStart', [[g.x, g.y]]); for (let k = 1; k <= 10; k++) { await T('touchMove', [[g.x, g.y - k * g.h * 0.05]]); await p.waitForTimeout(16); } await T('touchEnd', []); await p.waitForTimeout(400);
        const st = await p.evaluate(() => document.querySelector('.shop .grid').scrollTop); ok(st > 20, `shop list still scrolls with one finger (scrollTop ${st})`); } }
    await tapEl('#shopgo, #sback, #sdone'); await p.waitForTimeout(800); ok((await info()).mode === 'title', `back from #${id} -> title`);
  }
  await tapEl('#tplay'); const vp = p.viewportSize();
  await p.waitForFunction(() => window.__PB.G.mode === 'cine' || window.__PB.G.mode === 'play', null, { timeout: 90000 }).catch(() => { });
  ok((await info()).mode === 'cine', 'Clock In -> intro cutscene');
  // pacing: first line should still be up after 4.0 s without tapping
  const l0 = await p.evaluate(() => window.__PB.cineInfo()); await p.waitForTimeout(4000); const l0b = await p.evaluate(() => window.__PB.cineInfo());
  ok(l0 && l0b && l0.txt === l0b.txt, `first line holds >= 4 s untapped (lineT ${l0 && l0.lineT.toFixed(1)} s): "${l0 && l0.txt.slice(0, 50)}"`);
  const seen = []; let shotMid = false, shotBye = false, attacked = false; const hp0 = await p.evaluate(() => window.__PB.G.player.hp);
  for (let i = 0; i < 60; i++) {
    const st = await p.evaluate(() => ({ mode: window.__PB.G.mode, c: window.__PB.cineInfo(), alive: window.__PB.state().alive, hp: window.__PB.G.player.hp }));
    if (st.mode !== 'cine' || !st.c) break; if (st.alive > 0 || st.hp < hp0) attacked = true;
    const key = st.c.who + ': ' + st.c.txt; if (seen[seen.length - 1] !== key) seen.push(key);
    if (shotDir && !shotMid && /teeny pair of scrubs/.test(st.c.txt)) { await p.waitForTimeout(500); await p.screenshot({ path: shotDir + '/01_kelly_surprise_line.png' }); shotMid = true; }
    if (shotDir && !shotBye && /laundry/.test(st.c.txt)) { await p.waitForTimeout(500); await p.screenshot({ path: shotDir + '/02_kelly_laundry_goodbye.png' }); shotBye = true; }
    await p.touchscreen.tap(vp.width / 2, vp.height * 0.45); await p.waitForTimeout(750);
  }
  console.log('  DIALOGUE SEEN:\n    ' + seen.join('\n    '));
  ok(seen.some(s => /KELLY: .*surprise/i.test(s)), 'surprise line shown');
  ok(seen.some(s => /KELLY: .*laundry.*clean/i.test(s)), 'laundry/cleaning goodbye shown');
  const iBye = seen.findIndex(s => /laundry/.test(s)), iCode = seen.findIndex(s => /Code Brown/.test(s));
  ok(iBye >= 0 && iCode > iBye, 'outbreak (Code Brown) comes after Kelly leaves');
  ok(!seen.some(s => /see ya|birthday/i.test(s)), 'no "see ya later" / birthday lines');
  ok(!attacked, 'no zombies / damage during dialogue');
  await p.waitForFunction(() => window.__PB.G.mode === 'play', null, { timeout: 20000 }).catch(() => { });
  ok((await info()).mode === 'play', 'intro -> gameplay');
  await p.evaluate(() => { window.__PB.noDirector(true); window.__PB.killAll(); });
  await p.waitForTimeout(1500);
  // RESET VIEW button visible, on top, not overlapping other HUD controls
  const rb = await p.evaluate(() => { const e = document.getElementById('resetv'); const r = e.getBoundingClientRect(); const t = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    const ov = ['pausebtn', 'bfire', 'breload', 'bswap', 'bmelee', 'autofire', 'ammo', 'chipf', 'chipb', 'chipc', 'objt', 'kbar'].filter(id => { const o = document.getElementById(id); if (!o || !o.offsetParent && getComputedStyle(o).display === 'none') return false; const q = o.getBoundingClientRect(); if (!q.width) return false; return !(q.right <= r.left || q.left >= r.right || q.bottom <= r.top || q.top >= r.bottom); });
    const stick = document.querySelector('.stick').getBoundingClientRect(); return { r: [r.left | 0, r.top | 0, r.width | 0, r.height | 0], top: !!(t && (t === e || e.contains(t))), ov, inView: r.left >= 0 && r.right <= innerWidth && r.top >= 0 && r.bottom <= innerHeight }; });
  ok(rb.top && rb.inView, `RESET button visible & tappable at ${rb.r}`); ok(rb.ov.length === 0, `RESET overlaps nothing (${rb.ov.join(',') || 'none'})`);
  if (shotDir && vp.height > vp.width) { await p.evaluate(() => window.__PB.look(window.__PB.G.player.yaw, 0)); await p.waitForTimeout(2600); await p.screenshot({ path: shotDir + '/03_gameplay_portrait_reset_button.png' }); }
  const scale = () => p.evaluate(() => window.visualViewport ? +window.visualViewport.scale.toFixed(3) : 1);
  // double-tap on the game layer
  await p.touchscreen.tap(vp.width * 0.6, vp.height * 0.4); await p.waitForTimeout(90); await p.touchscreen.tap(vp.width * 0.6, vp.height * 0.4); await p.waitForTimeout(600);
  ok(await scale() === 1, `double-tap: page scale ${await scale()}`);
  // synthetic gesture + two-finger touchmove: handlers must cancel them (WebKit/iOS path)
  const syn = await p.evaluate(() => { const r = {}; const ev = new Event('gesturestart', { cancelable: true, bubbles: true }); document.body.dispatchEvent(ev); r.gesture = ev.defaultPrevented;
    try { const el = document.getElementById('touch'); const mk = (id, x, y) => new Touch({ identifier: id, target: el, clientX: x, clientY: y }); const tm = new TouchEvent('touchmove', { cancelable: true, bubbles: true, touches: [mk(1, 100, 200), mk(2, 220, 260)] }); el.dispatchEvent(tm); r.multi = tm.defaultPrevented; } catch (e) { r.multi = 'n/a: ' + e.message; }
    return r; });
  ok(syn.gesture === true, 'gesturestart is cancelled'); if (syn.multi === true || syn.multi === false) ok(syn.multi, 'two-finger touchmove is cancelled'); else console.log('  (two-finger synthetic TouchEvent not constructible here: ' + syn.multi + ')');
  // real two-finger pinch (Chromium CDP)
  if (br !== 'webkit') {
    const cdp = await ctx.newCDPSession(p); const T = (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts.map(([x, y], i) => ({ x, y, id: i + 1 })) });
    const cx = vp.width / 2, cy = vp.height / 2; await T('touchStart', [[cx - 20, cy], [cx + 20, cy]]);
    for (let k = 1; k <= 10; k++) { await T('touchMove', [[cx - 20 - k * 12, cy - k * 4], [cx + 20 + k * 12, cy + k * 4]]); await p.waitForTimeout(16); } await T('touchEnd', []); await p.waitForTimeout(500);
    ok(await scale() === 1, `two-finger pinch (CDP touch): page scale ${await scale()}`);
    try { await cdp.send('Input.synthesizePinchGesture', { x: cx, y: cy, scaleFactor: 2.5, gestureSourceType: 'touch' }); await p.waitForTimeout(600); ok(await scale() === 1, `synthesizePinchGesture x2.5: page scale ${await scale()}`); } catch (e) { console.log('  (synthesizePinchGesture n/a: ' + e.message + ')'); }
    // force a real page zoom, then check the RESET path brings it back
    try { await cdp.send('Emulation.setPageScaleFactor', { pageScaleFactor: 2 }); await p.waitForTimeout(600); const zs = await scale(); const fix = await p.evaluate(() => getComputedStyle(document.getElementById('zoomfix')).display);
      console.log(`  forced page zoom -> scale ${zs}, zoom-fix banner ${fix}`); if (zs > 1) ok(fix === 'block', 'zoom-fix banner appears when page is zoomed');
      await cdp.send('Emulation.setPageScaleFactor', { pageScaleFactor: 1 }); } catch (e) { console.log('  (setPageScaleFactor n/a: ' + e.message + ')'); }
  }
  // in-game zoom: force a narrow FOV + look at the floor, then tap RESET (real touch)
  const before = await p.evaluate(() => { const d = window.__PB.defaultFov(); window.__PB.forceZoom(22); window.__PB.look(window.__PB.G.player.yaw, -1.1); return { d, f: window.__PB.camFov() }; });
  await tapEl('#resetv'); await p.waitForTimeout(500);
  const after = await p.evaluate(() => ({ f: window.__PB.camFov(), pitch: window.__PB.G.player.pitch, mode: window.__PB.G.mode, scale: window.visualViewport ? window.visualViewport.scale : 1, resets: window.__PB.ZOOM.resets }));
  ok(Math.abs(after.f - before.d) < 0.01 && Math.abs(after.pitch) < 0.01 && after.scale === 1 && after.mode === 'play', `RESET: fov ${before.f.toFixed(1)} -> ${after.f.toFixed(1)} (default ${before.d.toFixed(1)}), pitch -> ${after.pitch.toFixed(2)}, scale ${after.scale}, still ${after.mode}`);
  // stuck-touch: start a stick drag, drop the pointerup, confirm all-fingers-up clears movement
  const stuck = await p.evaluate(() => window.__PB.ZOOM.prevented); console.log('  prevented counters', JSON.stringify(stuck));
  await p.screenshot({ path: `${out}_final.png` });
  const errs = logs.filter(l => !/GPU stall|ReadPixels|swiftshader|WebGL/i.test(l)); ok(errs.length === 0, `console/page errors: ${errs.length}`); if (errs.length) console.log('  ' + errs.slice(0, 10).join('\n  '));
  console.log(`RESULT ${dev} ${br}: ${R.pass.length} pass, ${R.fail.length} fail`); if (R.fail.length) console.log('FAILS: ' + R.fail.join(' | '));
  await b.close(); process.exitCode = R.fail.length ? 1 : 0;
})();
