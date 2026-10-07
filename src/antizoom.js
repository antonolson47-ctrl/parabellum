// Anti-zoom for phones. iOS Safari ignores user-scalable=no, and the game's preventDefault on *pointer* events
// does not stop pinch / double-tap zoom, so two fingers on the screen (move stick + look) could zoom the page and
// leave it stuck zoomed in. Block the gestures at the touch level, watch visualViewport, and offer a reset.
export const ZOOM = { scale: 1, prevented: { gesture: 0, multi: 0, move: 0, dbl: 0 }, resets: 0, auto: 0 };
const VIEWPORT = 'width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover';
// interactive menu controls keep their native click/scroll behaviour
const isMenuCtl = t => !!(t && t.closest && t.closest('.screen button, .screen .lvl, .screen .buybtn, .screen select, .screen input, .screen label, #pberr, #zoomfix'));
const inScroller = t => !!(t && t.closest && t.closest('.screen .grid, .screen .lvlgrid, .screen .panel, .screen .shop'));
let fixEl = null, autoT = 0, touching = 0, opts = {};
export function initAntiZoom(o = {}) {
  opts = o;
  let m = document.querySelector('meta[name=viewport]'); if (!m) { m = document.createElement('meta'); m.name = 'viewport'; document.head.appendChild(m); }
  m.setAttribute('content', VIEWPORT);
  // Safari pinch gestures
  const g = e => { e.preventDefault(); ZOOM.prevented.gesture++; };
  for (const t of ['gesturestart', 'gesturechange', 'gestureend']) document.addEventListener(t, g, { passive: false });
  // two-finger moves never zoom; one-finger moves never pan the page (except inside scrollable menus)
  document.addEventListener('touchmove', e => {
    if (e.touches.length > 1 || (e.scale !== undefined && e.scale !== 1)) { if (e.cancelable) e.preventDefault(); ZOOM.prevented.multi++; return; }
    if (!inScroller(e.target)) { if (e.cancelable) e.preventDefault(); ZOOM.prevented.move++; }
  }, { passive: false });
  document.addEventListener('touchstart', e => { touching = e.touches.length; }, { passive: true, capture: true });
  // double-tap zoom: swallow the second quick touchend unless it's on a menu button (those use touch-action:manipulation)
  let lastEnd = 0;
  const endT = e => {
    touching = e.touches.length; const now = performance.now();
    if (e.type === 'touchend' && now - lastEnd < 380 && !isMenuCtl(e.target)) { if (e.cancelable) e.preventDefault(); ZOOM.prevented.dbl++; }
    lastEnd = now; if (e.touches.length === 0 && opts.onAllUp) opts.onAllUp();
  };
  document.addEventListener('touchend', endT, { passive: false }); document.addEventListener('touchcancel', endT, { passive: false });
  document.addEventListener('dblclick', e => { if (!isMenuCtl(e.target)) e.preventDefault(); }, { passive: false });
  // watch the real page zoom; if it ever happens, show a big un-missable fix button inside the zoomed view and auto-reset
  fixEl = document.createElement('div'); fixEl.id = 'zoomfix';
  fixEl.innerHTML = '<span style="font-size:20px">🔍</span> ZOOMED IN · TAP TO RESET VIEW';
  fixEl.style.cssText = 'position:fixed;left:0;top:0;z-index:99998;display:none;transform-origin:0 0;padding:10px 16px;border-radius:12px;background:#c8231d;border:2px solid #ffd84a;color:#fff;font:700 15px system-ui,-apple-system,sans-serif;white-space:nowrap;box-shadow:0 4px 16px rgba(0,0,0,.6);pointer-events:auto;touch-action:manipulation';
  const tapFix = e => { e.preventDefault(); e.stopPropagation(); opts.onReset ? opts.onReset() : resetPageZoom(); };
  fixEl.addEventListener('pointerdown', tapFix); fixEl.addEventListener('click', tapFix);
  document.body.appendChild(fixEl);
  const vv = window.visualViewport;
  if (vv) { const chk = () => check(); vv.addEventListener('resize', chk); vv.addEventListener('scroll', chk); }
  addEventListener('orientationchange', () => setTimeout(check, 400));
  setInterval(check, 1000);
}
export function pageScale() { const vv = window.visualViewport; return vv ? vv.scale : 1; }
function check() {
  const vv = window.visualViewport; const s = vv ? vv.scale : 1; ZOOM.scale = s; const zoomed = s > 1.02 || (vv && (Math.abs(vv.offsetLeft) > 2 || Math.abs(vv.offsetTop) > 2) && s > 1.001);
  document.documentElement.classList.toggle('pagezoomed', !!zoomed);
  if (!fixEl) return;
  if (!zoomed) { fixEl.style.display = 'none'; clearTimeout(autoT); autoT = 0; return; }
  // keep the button inside what the player can actually see, at normal size
  fixEl.style.display = 'block';
  const k = 1 / s; fixEl.style.transform = `translate(${vv.offsetLeft + vv.width / 2}px,${vv.offsetTop + 14 / s}px) scale(${k}) translateX(-50%)`;
  // auto-reset once fingers are off the glass (the game never wants page zoom)
  if (!autoT && touching === 0 && (!opts.autoOk || opts.autoOk())) autoT = setTimeout(() => { autoT = 0; if (touching === 0 && pageScale() > 1.02) { ZOOM.auto++; resetPageZoom(); } }, 700);
}
// Force the page back to 1x: re-apply the viewport meta (iOS re-evaluates on change) and scroll the layout viewport home.
export function resetPageZoom() {
  ZOOM.resets++;
  const m = document.querySelector('meta[name=viewport]');
  if (m) { m.setAttribute('content', VIEWPORT.replace('initial-scale=1,maximum-scale=1', 'initial-scale=1.0,maximum-scale=1.0,minimum-scale=1.0')); setTimeout(() => m.setAttribute('content', VIEWPORT), 60); }
  try { window.scrollTo(0, 0); document.documentElement.scrollTop = 0; document.body.scrollTop = 0; document.documentElement.scrollLeft = 0; document.body.scrollLeft = 0; } catch (e) { }
  setTimeout(check, 120); setTimeout(check, 500);
}
