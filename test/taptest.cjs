// Real-touch regression test: node test/taptest.cjs <url> <device> [browser] [outprefix] [shotdir]
// Title buttons (real taps) -> Clock In -> tap through Kelly intro (checks new lines, pacing, no attacks) -> gameplay
// -> anti-zoom checks (double-tap, pinch/two-finger move, gesture events) -> RESET VIEW (page zoom + forced FOV + pitch)
// -> Oct 8: 360° look drags, stick+look multi-touch, FIRE-drag, 180 button, threat arrows, hit flash, RESET keeps heading, Kennedy cutscene.
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
  // ───────── Oct 8: 360° turning, multi-touch, FIRE-drag, 180 button, threat arrows, Kennedy after turning ─────────
  const cdpT = br !== 'webkit' ? await ctx.newCDPSession(p) : null;
  // T(type, pts): pts = ALL touches currently on the glass [[x,y,id]] (CDP semantics). WebKit's emulator has no
  // multi-touch input API, so there we dispatch duck-typed TouchEvents (same handler path; no pointer events involved).
  const T = async (type, pts) => {
    if (cdpT) return cdpT.send('Input.dispatchTouchEvent', { type, touchPoints: pts.map(([x, y, id]) => ({ x, y, id })) });
    await p.evaluate(([type, pts]) => {
      const S = window.__synT || (window.__synT = new Map()); const mk = (id, x, y, target) => ({ identifier: id, clientX: x, clientY: y, pageX: x, pageY: y, screenX: x, screenY: y, target, force: 1, radiusX: 10, radiusY: 10 });
      const now = new Map(pts.map(([x, y, id]) => [id, [x, y]])); let changed = [], tgt = null;
      if (type === 'touchStart') for (const [id, [x, y]] of now) { if (!S.has(id)) { const el = document.elementFromPoint(x, y); S.set(id, mk(id, x, y, el)); changed.push(S.get(id)); tgt = tgt || el; } }
      if (type === 'touchMove') for (const [id, [x, y]] of now) { const t = S.get(id); if (t && (t.clientX !== x || t.clientY !== y)) { const n = mk(id, x, y, t.target); S.set(id, n); changed.push(n); tgt = tgt || t.target; } }
      if (type === 'touchEnd' || type === 'touchCancel') for (const [id, t] of [...S]) if (!now.has(id)) { changed.push(t); S.delete(id); tgt = tgt || t.target; }
      if (!changed.length) return; const ev = new Event(type.replace('touchStart', 'touchstart').replace('touchMove', 'touchmove').replace('touchEnd', 'touchend').replace('touchCancel', 'touchcancel'), { bubbles: true, cancelable: true });
      const all = [...S.values()]; Object.defineProperty(ev, 'touches', { value: all }); Object.defineProperty(ev, 'targetTouches', { value: all }); Object.defineProperty(ev, 'changedTouches', { value: changed });
      (tgt || document.body).dispatchEvent(ev);
    }, [type, pts]);
  };
  const pl = () => p.evaluate(() => { const P = window.__PB.G.player; return { vx: P.vel.x, vz: P.vel.z, yaw: P.yaw, look: P.lookYaw, pitch: P.pitch, x: P.pos.x, z: P.pos.z, fire: window.__PB.I.fire, scale: window.visualViewport ? +window.visualViewport.scale.toFixed(3) : 1, touches: window.__PB.touches(), turns: P.turns }; });
  const deg = r => (r * 180 / Math.PI).toFixed(0) + '°';
  await p.evaluate(() => { const P = window.__PB.G.player; P.invuln = 9999; window.__PB.noDirector(true); window.__PB.killAll(); window.__PB.look(P.yaw, 0); });
  const W = vp.width, Hh = vp.height; const lookPt = [Math.round(W * (W > Hh ? 0.66 : 0.72)), Math.round(Hh * (W > Hh ? 0.42 : 0.38))];
  const onTouchLayer = await p.evaluate(([x, y]) => { const t = document.elementFromPoint(x, y); return t && t.id; }, lookPt); ok(onTouchLayer === 'touch', `look pad at ${lookPt} is the game layer (${onTouchLayer})`);
  // 1) single-finger swipes on the right half: big yaw change, wraps past 360° cumulative
  const s0 = await pl(); let maxPerSwipe = 0;
  for (let sw = 0; sw < 4; sw++) {
    const a = await pl(); const x0 = W * 0.95, x1 = W * 0.05, y = lookPt[1]; await T('touchStart', [[x0, y, 1]]);
    for (let k = 1; k <= 24; k++) { await T('touchMove', [[x0 + (x1 - x0) * k / 24, y + Math.sin(k / 4) * 3, 1]]); await p.waitForTimeout(16); }
    await T('touchEnd', []); await p.waitForTimeout(120); const b2 = await pl(); maxPerSwipe = Math.max(maxPerSwipe, Math.abs(b2.look - a.look));
  }
  const s1 = await pl();
  ok(maxPerSwipe > 2.2 && maxPerSwipe < 5.0, `one near-full-width swipe turns ${deg(maxPerSwipe)} (target ~180°)`);
  ok(Math.abs(s1.look - s0.look) > 2 * Math.PI, `4 swipes = ${deg(Math.abs(s1.look - s0.look))} cumulative (> 360°), yaw wrapped to ${s1.yaw.toFixed(2)} rad`);
  ok(Math.abs(s1.yaw) <= Math.PI + 1e-6, 'yaw stays wrapped in -180..180');
  // vertical: pitch clamps at ~60°
  await T('touchStart', [[lookPt[0], Hh * 0.2, 1]]); for (let k = 1; k <= 16; k++) { await T('touchMove', [[lookPt[0], Hh * 0.2 + k * Hh * 0.05, 1]]); await p.waitForTimeout(16); } await T('touchEnd', []); await p.waitForTimeout(100);
  const pc = await pl(); ok(Math.abs(pc.pitch) <= 1.051 && Math.abs(pc.pitch) > 0.8, `pitch clamped at ${deg(pc.pitch)} (max ±60°)`);
  await p.evaluate(() => window.__PB.look(window.__PB.G.player.yaw, 0));
  // 2) move stick + look at the same time (two fingers, tracked by id), and movement follows the CURRENT facing
  { const a = await pl(); const sx = W * 0.14, sy = Hh * 0.82; await T('touchStart', [[sx, sy, 3]]); await T('touchMove', [[sx, sy - 50, 3]]);
    await T('touchStart', [[sx, sy - 50, 3], [lookPt[0], lookPt[1], 4]]); let mid = null;
    for (let k = 1; k <= 30; k++) { await T('touchMove', [[sx, sy - 52, 3], [lookPt[0] - k * 4, lookPt[1], 4]]); await p.waitForTimeout(25); if (k === 15) mid = await pl(); }
    const b2 = await pl(); await T('touchEnd', [[sx, sy - 52, 3]]); await T('touchEnd', []); await p.waitForTimeout(200);
    const moved = Math.hypot(b2.x - a.x, b2.z - a.z);
    ok(mid && mid.touches.stick === 1 && mid.touches.look === 1, `two fingers tracked at once: ${JSON.stringify(mid && mid.touches)}`);
    ok(moved > 0.8 && Math.abs(b2.look - a.look) > 0.3, `stick + look simultaneously: moved ${moved.toFixed(2)} m while turning ${deg(Math.abs(b2.look - a.look))}`);
    const c = await pl(); const st0 = await pl(); await T('touchStart', [[sx, sy, 5]]); for (let k = 1; k <= 6; k++) { await T('touchMove', [[sx, sy - k * 10, 5]]); await p.waitForTimeout(16); }
    await p.waitForTimeout(350); const st1 = await pl(); await T('touchEnd', []); await p.waitForTimeout(150);
    const dx = st1.vx, dz = st1.vz, dl = Math.hypot(dx, dz) || 1; const dot = (dx * -Math.sin(st1.yaw) + dz * -Math.cos(st1.yaw)) / dl;
    ok(dl > 1 && dot > 0.95, `stick "forward" walks the way you're facing after turning (velocity·facing ${dot.toFixed(2)}, ${dl.toFixed(1)} m/s, heading ${deg(st1.yaw)})`); }
  // 3) hold FIRE and drag on it: keeps firing and turns
  { const fb = await p.evaluate(() => { const r = document.getElementById('bfire').getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; });
    const a = await pl(); await T('touchStart', [[fb[0], fb[1], 6]]); await p.waitForTimeout(80); const f1 = await pl();
    for (let k = 1; k <= 20; k++) { await T('touchMove', [[fb[0] - k * 7, fb[1] - k, 6]]); await p.waitForTimeout(20); } const f2 = await pl(); await T('touchEnd', []); await p.waitForTimeout(150); const f3 = await pl();
    ok(f1.fire && f2.fire && !f3.fire, `FIRE held during drag (${f1.fire}/${f2.fire}) and released after (${f3.fire})`);
    ok(Math.abs(f2.look - a.look) > 0.25, `dragging on FIRE turns too (${deg(Math.abs(f2.look - a.look))})`); }
  // 4) 180 button: visible, not overlapping, real tap turns ~180° smoothly
  const tb = await p.evaluate(() => { const e = document.getElementById('bturn'); const r = e.getBoundingClientRect(); const t = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    const ov = ['pausebtn', 'resetv', 'bfire', 'breload', 'bswap', 'bmelee', 'autofire', 'ammo', 'chipf', 'chipb', 'chipc', 'objt', 'kbar'].filter(id => { const o = document.getElementById(id); if (!o || getComputedStyle(o).display === 'none') return false; const q = o.getBoundingClientRect(); if (!q.width) return false; return !(q.right <= r.left || q.left >= r.right || q.bottom <= r.top || q.top >= r.bottom); });
    const s = document.querySelector('.stick').getBoundingClientRect(); const ovs = !(s.right <= r.left || s.left >= r.right || s.bottom <= r.top || s.top >= r.bottom);
    return { r: [r.left | 0, r.top | 0, r.width | 0, r.height | 0], top: !!(t && (t === e || e.contains(t))), ov, ovs, inView: r.left >= 0 && r.right <= innerWidth && r.top >= 0 && r.bottom <= innerHeight }; });
  ok(tb.top && tb.inView, `180 button visible & tappable at ${tb.r}`); ok(tb.ov.length === 0 && !tb.ovs, `180 button overlaps nothing (${tb.ov.join(',') || 'none'}${tb.ovs ? ', stick' : ''})`);
  { const a = await pl(); await tapEl('#bturn'); await p.waitForTimeout(120); const m = await pl(); await p.waitForTimeout(500); const b2 = await pl();
    const turned = Math.abs(b2.look - a.look); ok(Math.abs(turned - Math.PI) < 0.12 && b2.turns === a.turns + 1, `180 button turned ${deg(turned)} (mid-way ${deg(Math.abs(m.look - a.look))} after 0.12 s)`); }
  // 5) zombie behind you -> red edge arrow; then 180 and it's in front of you
  const placed = await p.evaluate(() => { const PB = window.__PB, P = PB.G.player; PB.S.data.settings.autofire = false; /* keep the zombie alive for the shots */ const st = PB.G.level.anc.start; PB.tp(st.x, st.z); PB.look(st.yaw + Math.PI, 0); /* face back down the way the level starts -> open corridor behind you */ const fx = -Math.sin(P.yaw), fz = -Math.cos(P.yaw);
    for (const d of [5, 4.2, 6, 3.5, 7]) { const x = P.pos.x - fx * d, z = P.pos.z - fz * d; if (PB.G.world.isOpen(x, z)) { PB.spawn('walker', x, z); return { d, x, z }; } } return null; });
  await p.waitForTimeout(400);
  if (placed) {
    const th = await p.evaluate(() => ({ list: window.__PB.threats(), dom: [...document.querySelectorAll('#threats .thr')].filter(e => e.style.display === 'block').map(e => { const r = e.getBoundingClientRect(); return [Math.round(r.left + r.width / 2), Math.round(r.top + r.height / 2)]; }) }));
    ok(th.list.length >= 1 && Math.abs(Math.abs(th.list[0].a) - Math.PI) < 0.6 && th.dom.length >= 1, `zombie ${placed.d} m behind -> edge arrow at ${JSON.stringify(th.dom[0])} (bearing ${th.list[0] ? deg(th.list[0].a) : '-'})`);
    ok(th.dom[0] && th.dom[0][1] > Hh * 0.6, 'arrow for a zombie behind you sits at the bottom edge');
    const hideTxt = () => p.evaluate(() => { for (const id of ['sub', 'rule', 'toast']) { const e = document.getElementById(id); e && e.classList.remove('show'); } });
    if (shotDir) { await hideTxt(); await p.waitForTimeout(250); } if (shotDir) await p.screenshot({ path: shotDir + `/b_threat_arrow_${vp.width > vp.height ? 'landscape' : 'portrait'}.png` });
    await p.evaluate(() => { const P = window.__PB.G.player; P.invuln = 0; P.hurt(1, { pos: { x: P.pos.x + Math.sin(P.yaw) * 2, z: P.pos.z + Math.cos(P.yaw) * 2 } }); P.invuln = 9999; });
    await p.waitForTimeout(60); const hd = await p.evaluate(() => window.__PB.hitDir()); ok(hd.b > 0.3 && hd.l < 0.2 && hd.r < 0.2, `hit from behind flashes the bottom edge (b ${hd.b.toFixed(2)}, l ${hd.l.toFixed(2)}, r ${hd.r.toFixed(2)})`);
    await tapEl('#bturn'); await p.waitForTimeout(700); console.log('  fps', await p.evaluate(() => window.__PB.state().fps));
    const after = await p.evaluate(() => ({ list: window.__PB.threats(), inFront: window.__PB.Z.list.filter(z => z.alive && !z.dead).map(z => { const v = new window.__PB.THREE.Vector3(z.pos.x, 1.2, z.pos.z).project(window.__PB.E.camera); return v.z < 1 && Math.abs(v.x) < 1 && Math.abs(v.y) < 1; }), ndc: window.__PB.Z.list.filter(z => z.alive && !z.dead).map(z => { const v = new window.__PB.THREE.Vector3(z.pos.x, 1.2, z.pos.z).project(window.__PB.E.camera); return [+v.x.toFixed(2), +v.y.toFixed(2), +v.z.toFixed(3), z.beh, +z.pos.distanceTo(window.__PB.G.player.pos).toFixed(1)]; }) }));
    ok(after.inFront.some(Boolean) && after.list.length === 0, `after 180 the zombie is on screen (${after.inFront}) and its arrow is gone (${JSON.stringify(after.list)} ${JSON.stringify(after.ndc)})`);
    if (shotDir) { await p.evaluate(() => window.__PB.look(window.__PB.G.player.yaw, -0.05)); await hideTxt(); await p.waitForTimeout(250); await p.screenshot({ path: shotDir + `/a_turned_around_${vp.width > vp.height ? 'landscape' : 'portrait'}.png` }); }
    await p.evaluate(() => { window.__PB.killAll(); window.__PB.S.data.settings.autofire = true; }); await p.waitForTimeout(300);
  } else ok(false, 'could not place a zombie behind the player');
  // 6) RESET levels pitch but keeps the heading
  { await p.evaluate(() => window.__PB.look(window.__PB.G.player.yaw, -0.9)); const a = await pl(); await tapEl('#resetv'); await p.waitForTimeout(300); const b2 = await pl();
    ok(Math.abs(b2.pitch) < 0.01 && Math.abs(b2.yaw - a.yaw) < 0.02, `RESET levels pitch (${a.pitch.toFixed(2)} -> ${b2.pitch.toFixed(2)}) and keeps heading (${a.yaw.toFixed(2)} -> ${b2.yaw.toFixed(2)})`); }
  // 7) Kennedy's call-in cutscene after turning: control comes back facing the same way, Kennedy follows, look still works
  { const a = await pl(); await p.evaluate(() => { const L = window.__PB.G.level; L.kills = Math.ceil(L.quota * 0.5); });
    await p.evaluate(() => { window.__PB.callKennedy(); }); await p.waitForTimeout(400); const cm = await info(); ok(cm.mode === 'cine' || cm.mode === 'play', `Kennedy call -> ${cm.mode}`);
    for (let i = 0; i < 40; i++) { const c = await p.evaluate(() => window.__PB.cineInfo()); if (!c) break; if (shotDir && c.shot === 1 && !p.__kshot) { await p.waitForTimeout(900); await p.screenshot({ path: shotDir + `/c_kennedy_closeup_${vp.width > vp.height ? 'landscape' : 'portrait'}.png` }); p.__kshot = 1; } await p.touchscreen.tap(W / 2, Hh * 0.45); await p.waitForTimeout(650); }
    await p.waitForFunction(() => window.__PB.G.mode === 'play', null, { timeout: 15000 }).catch(() => { });
    const b2 = await pl(); const kn = await p.evaluate(() => ({ on: window.__PB.G.kennedy.active, mustache: !!(window.__PB.G.kennedy.ch.mustache && window.__PB.G.kennedy.ch.mustache.isSkinnedMesh) }));
    ok((await info()).mode === 'play' && kn.on, `back in play with Kennedy active after the cutscene (skinned mustache: ${kn.mustache})`);
    ok(Math.abs(Math.atan2(Math.sin(b2.yaw - a.yaw), Math.cos(b2.yaw - a.yaw))) < 0.05, `heading kept through the cutscene (${a.yaw.toFixed(2)} -> ${b2.yaw.toFixed(2)})`);
    const c0 = await pl(); await T('touchStart', [[lookPt[0], lookPt[1], 9]]); for (let k = 1; k <= 12; k++) { await T('touchMove', [[lookPt[0] - k * 8, lookPt[1], 9]]); await p.waitForTimeout(16); } await T('touchEnd', []); await p.waitForTimeout(100); const c1 = await pl();
    ok(Math.abs(c1.look - c0.look) > 0.2, `look-drag still works after the cutscene (${deg(Math.abs(c1.look - c0.look))})`);
    await p.waitForTimeout(2500); const kd = await p.evaluate(() => { const k = window.__PB.G.kennedy, P = window.__PB.G.player; return Math.hypot(k.pos.x - P.pos.x, k.pos.z - P.pos.z); });
    ok(kd < 9, `Kennedy follows Shayla (${kd.toFixed(1)} m away)`); }
  { const z = await pl(); ok(z.scale === 1, `page zoom stays 1 after all the turning (scale ${z.scale})`); }
  // stuck-touch: start a stick drag, drop the pointerup, confirm all-fingers-up clears movement
  const stuck = await p.evaluate(() => window.__PB.ZOOM.prevented); console.log('  prevented counters', JSON.stringify(stuck));
  await p.screenshot({ path: `${out}_final.png` });
  const errs = logs.filter(l => !/GPU stall|ReadPixels|swiftshader|WebGL/i.test(l)); ok(errs.length === 0, `console/page errors: ${errs.length}`); if (errs.length) console.log('  ' + errs.slice(0, 10).join('\n  '));
  console.log(`RESULT ${dev} ${br}: ${R.pass.length} pass, ${R.fail.length} fail`); if (R.fail.length) console.log('FAILS: ' + R.fail.join(' | '));
  await b.close(); process.exitCode = R.fail.length ? 1 : 0;
})();
