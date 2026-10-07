// Twin-stick touch controls + keyboard/mouse. Produces I.move{x,y}, I.lookDX/DY (radians), I.fire, and edge-triggered I.pressed.*
import { clamp } from './util.js';
export const I = { move: { x: 0, y: 0 }, lookDX: 0, lookDY: 0, fire: false, sprint: false, pressed: {}, enabled: false, sens: 1, invertY: false, touchMode: false, keys: {} };
let stickEl, knobEl, ui;
const ptrs = new Map(); // pointerId -> {kind, x0,y0,x,y}
export function initInput(uiRoot) {
  ui = uiRoot;
  const layer = document.getElementById('touch');
  stickEl = document.querySelector('.stick'); knobEl = stickEl && stickEl.querySelector('.knob');
  layer.addEventListener('pointerdown', e => {
    if (!I.enabled) return; e.preventDefault(); I.touchMode = e.pointerType !== 'mouse';
    if (e.pointerType === 'mouse') { if (!document.pointerLockElement && layer.requestPointerLock) { try { const p = layer.requestPointerLock(); p && p.catch && p.catch(() => { }); } catch (er) { } } if (e.button === 0) I.fire = true; return; }
    const left = e.clientX < innerWidth * (innerWidth > innerHeight ? 0.42 : 0.5) && e.clientY > innerHeight * 0.25;
    let kind = left ? 'stick' : 'look'; for (const p of ptrs.values()) if (p.kind === 'stick' && kind === 'stick') kind = 'look';
    ptrs.set(e.pointerId, { kind, x0: e.clientX, y0: e.clientY, x: e.clientX, y: e.clientY, t: performance.now() });
    try { layer.setPointerCapture(e.pointerId); } catch (er) { }
    if (kind === 'stick' && stickEl) { stickEl.style.left = e.clientX + 'px'; stickEl.style.top = e.clientY + 'px'; stickEl.classList.add('on'); }
  });
  layer.addEventListener('pointermove', e => {
    if (!I.enabled) return;
    if (e.pointerType === 'mouse') { if (document.pointerLockElement) { I.lookDX += e.movementX * 0.0022 * I.sens; I.lookDY += e.movementY * 0.0022 * I.sens * (I.invertY ? -1 : 1); } return; }
    const p = ptrs.get(e.pointerId); if (!p) return; e.preventDefault();
    const evs = e.getCoalescedEvents ? e.getCoalescedEvents() : [e]; const last = evs[evs.length - 1] || e;
    if (p.kind === 'look') {
      const dx = last.clientX - p.x, dy = last.clientY - p.y; const sp = Math.hypot(dx, dy);
      const acc = 1 + Math.min(1.2, sp / 40) * 0.6; // acceleration curve
      const k = 0.0058 * I.sens * acc * (680 / Math.max(480, Math.min(innerWidth, innerHeight * 2)));
      I.lookDX += dx * k; I.lookDY += dy * k * 0.85 * (I.invertY ? -1 : 1);
    }
    p.x = last.clientX; p.y = last.clientY;
    if (p.kind === 'stick') updateStick(p);
  });
  const end = e => {
    if (e.pointerType === 'mouse') { if (e.button === 0) I.fire = false; return; }
    const p = ptrs.get(e.pointerId); if (!p) return; ptrs.delete(e.pointerId);
    if (p.kind === 'stick') { I.move.x = I.move.y = 0; I.sprint = false; if (stickEl) { stickEl.classList.remove('on'); knobEl.style.transform = ''; placeStickHome(); } }
  };
  layer.addEventListener('pointerup', end); layer.addEventListener('pointercancel', end); layer.addEventListener('lostpointercapture', end);
  addEventListener('keydown', e => {
    I.keys[e.code] = true; if (!I.enabled) return;
    const m = { KeyR: 'reload', KeyQ: 'swap', Digit1: 'w0', Digit2: 'w1', Digit3: 'w2', Digit4: 'w3', KeyF: 'melee', KeyE: 'call', Escape: 'pause', KeyP: 'pause', KeyT: 'autofire' }[e.code];
    if (m) I.pressed[m] = true; if (e.code === 'Space') I.fire = true;
  });
  addEventListener('keyup', e => { I.keys[e.code] = false; if (e.code === 'Space') I.fire = false; });
  addEventListener('wheel', e => { if (I.enabled) I.pressed.swap = true; }, { passive: true });
  addEventListener('blur', () => { I.fire = false; I.move.x = I.move.y = 0; for (const k in I.keys) I.keys[k] = false; clearTouches(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) { I.fire = false; for (const k in I.keys) I.keys[k] = false; clearTouches(); } });
  placeStickHome();
  addEventListener('resize', placeStickHome);
}
function placeStickHome() { if (!stickEl) return; stickEl.style.left = (Math.max(90, innerWidth * 0.11)) + 'px'; stickEl.style.top = (innerHeight - Math.max(100, innerHeight * 0.2)) + 'px'; }
function updateStick(p) {
  const R = 56; let dx = p.x - p.x0, dy = p.y - p.y0; const d = Math.hypot(dx, dy);
  if (d > R * 1.6) { const k = (d - R * 1.6) / d; p.x0 += dx * k; p.y0 += dy * k; dx = p.x - p.x0; dy = p.y - p.y0; if (stickEl) { stickEl.style.left = p.x0 + 'px'; stickEl.style.top = p.y0 + 'px'; } }
  const dd = Math.min(R, Math.hypot(dx, dy)); const a = Math.atan2(dy, dx);
  const kx = Math.cos(a) * dd, ky = Math.sin(a) * dd;
  if (knobEl) knobEl.style.transform = `translate(${kx}px,${ky}px)`;
  const mag = dd / R; const dz = 0.12; const m2 = mag < dz ? 0 : (mag - dz) / (1 - dz);
  I.move.x = Math.cos(a) * m2; I.move.y = -Math.sin(a) * m2; I.sprint = Math.hypot(dx, dy) > R * 1.25;
}
export function bindButton(el, onDown, onUp) {
  el.classList.add('pe');
  el.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); el.classList.add('down'); try { el.setPointerCapture(e.pointerId); } catch (er) { } onDown && onDown(e); });
  const up = e => { el.classList.remove('down'); onUp && onUp(e); };
  el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up); el.addEventListener('lostpointercapture', up);
}
export function pollKeyboard() {
  if (I.touchMode && ptrs.size) return; const k = I.keys; let x = 0, y = 0;
  if (k.KeyW || k.ArrowUp) y += 1; if (k.KeyS || k.ArrowDown) y -= 1; if (k.KeyA || k.ArrowLeft) x -= 1; if (k.KeyD || k.ArrowRight) x += 1;
  if (x || y) { const l = Math.hypot(x, y); I.move.x = x / l; I.move.y = y / l; I.sprint = !!(k.ShiftLeft || k.ShiftRight); I.kbMove = true; }
  else if (I.kbMove) { I.move.x = I.move.y = 0; I.kbMove = false; I.sprint = false; }
}
export function consumeLook() { const r = [I.lookDX, I.lookDY]; I.lookDX = I.lookDY = 0; return r; }
export function consumePressed() { const p = I.pressed; I.pressed = {}; return p; }
export function clearTouches() { // no finger on the glass -> nothing can still be held (fixes stuck stick/look/fire)
  ptrs.clear(); I.move.x = I.move.y = 0; I.sprint = false; if (stickEl) { stickEl.classList.remove('on'); if (knobEl) knobEl.style.transform = ''; placeStickHome(); }
  if (I.touchMode) I.fire = false; document.querySelectorAll('#ui .btn.down').forEach(b => b.classList.remove('down'));
}
export function resetInput() { I.fire = false; I.move.x = I.move.y = 0; I.lookDX = I.lookDY = 0; I.pressed = {}; ptrs.clear(); if (stickEl) { stickEl.classList.remove('on'); if (knobEl) knobEl.style.transform = ''; } }
